(function () {
  'use strict';
  const root = window.RescueManager, storage = root.storage;
  const tables = storage.schema.tables;
  const fail = (name, message) => { throw storage.error(name, message); };
  const table = name => { if (!tables.includes(name)) fail('InvalidInputError', 'Unknown business table'); return name; };
  const uuid = value => root.utils.ids.isUuidV4(value);
  const run = (...args) => storage.transactions.run(...args);
  let readCache = null;
  function freeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value) && !(value instanceof Blob)) {
      Object.freeze(value); Object.values(value).forEach(freeze);
    }
    return value;
  }
  function today(data) {
    return root.utils.dates.today(data.organizationSettings?.[0]?.timeZone || 'UTC');
  }
  // Rows and Blob references are captured in ONE transaction; binary encoding is outside it.
  function snapshot(datasetId, options = {}) {
    if (!options || typeof options !== 'object' || Array.isArray(options) || Object.keys(options).some(key => key !== 'fresh') ||
        (options.fresh !== undefined && typeof options.fresh !== 'boolean')) return Promise.reject(storage.error('InvalidInputError', 'Invalid snapshot options'));
    const reusable = datasetId === undefined;
    let replacement = null, clear = false;
    const reading = run(['meta', 'datasets', ...tables], 'readonly', (tx, api) => {
      api.request(tx.objectStore('meta').get('active'), active => {
        const id = datasetId || active?.datasetId;
        if (!id) { clear = reusable; api.setResult(null); return; }
        if (!uuid(id)) fail('InvalidInputError', 'Invalid dataset');
        api.request(tx.objectStore('datasets').get(id), dataset => {
          if (!dataset) fail('DatasetChangedError', 'Dataset does not exist');
          api.request(tx.objectStore('meta').get('animalSequence:' + id), sequence => {
            const animalSequence = sequence?.value || 0;
            const canCache = reusable && active?.datasetId === id && dataset.state === 'active';
            const stamp = canCache ? root.utils.canonicalJson.stringify({ active, dataset, animalSequence }) : null;
            // Every hit reads its anchors from IndexedDB in this transaction. Never use memory after a storage error.
            if (canCache && !options.fresh && readCache?.connection === tx.db && readCache.stamp === stamp) { api.setResult(readCache.value); return; }
            const value = { datasetId: id, dataRevision: dataset.dataRevision,
              globalRevision: active?.revision ?? 0, dataset, animalSequence, tables: {} };
            let remaining = tables.length;
            for (const name of tables) {
              api.request(tx.objectStore(name).index('byDataset').getAll(id), records => {
                value.tables[name] = records;
                if (--remaining === 0) {
                  if (canCache) replacement = { connection: tx.db, stamp, value };
                  api.setResult(value);
                }
              });
            }
          });
        });
      });
    });
    // A failed/aborted read cannot publish a cache entry before transaction.complete.
    return reading.then(value => {
      if (clear) readCache = null;
      else if (replacement) { freeze(value); readCache = replacement; }
      return value;
    });
  }
  function get(name, id, datasetId) {
    table(name);
    if (!uuid(id) || !uuid(datasetId)) return Promise.reject(storage.error('InvalidInputError', 'Invalid record key'));
    return run([name], 'readonly', (tx, api) => api.request(tx.objectStore(name).get([datasetId, id]), value => api.setResult(value || null)));
  }
  // Bounded cursor: no photos/documents are read by ordinary list screens.
  function list(name, options = {}) {
    table(name);
    const { datasetId, index = 'byDataset', prefix = [], offset = 0, limit = 25, direction = 'next' } = options;
    if (!uuid(datasetId) || !Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 1000 || !['next','prev'].includes(direction)) {
      return Promise.reject(storage.error('InvalidInputError', 'Invalid page query'));
    }
    return run([name], 'readonly', (tx, api) => {
      const store = tx.objectStore(name), rows = [];
      const source = store.index(index);
      const key = index === 'byDataset' ? datasetId : [datasetId, ...prefix];
      const range = index === 'byDataset' ? IDBKeyRange.only(key) : IDBKeyRange.bound(key, [...key, []]);
      let skipped = 0;
      api.request(source.openCursor(range, direction), cursor => {
        if (!cursor || rows.length >= limit) { api.setResult(rows); return; }
        if (skipped < offset) { skipped++; cursor.continue(); return; }
        rows.push(cursor.value); cursor.continue();
      });
    });
  }
  // capture: optional frozen snapshot read by the caller at options.expectedRevision. Reusing it is safe because
  // writeCoordinator.mutate re-checks the global revision inside the write transaction.
  async function commit(options, changes, result = null, reuse = null) {
    if (!options || !Array.isArray(changes) || !changes.length || !uuid(options.datasetId)) fail('InvalidInputError', 'A prepared change set is required');
    changes.forEach(change => table(change.table));
    const capture = reuse && reuse.datasetId === options.datasetId && reuse.globalRevision === options.expectedRevision && Object.isFrozen(reuse.tables) ? reuse : await snapshot(options.datasetId);
    if (!capture || capture.dataset.state !== 'active') fail('DatasetChangedError', 'Dataset is not active');
    const stores = [...new Set(changes.map(change => change.table))];
    const command = { ...options, stores };
    if (capture.globalRevision !== options.expectedRevision) {
      // The coordinator checks the operation log before revision: committed retries still succeed.
      return storage.writeCoordinator.mutate(command, () => fail('RevisionConflictError', 'Data changed since it was read'));
    }
    // Copy only the arrays this change set touches; rows are replaced, never edited in place.
    const data = { ...capture.tables };
    for (const name of stores) data[name] = capture.tables[name].slice();
    const positions = Object.fromEntries(stores.map(name => [name, new Map(data[name].map((row, index) => [row.id, index]))]));
    const changedDocumentDates=new Set();
    const seen = new Set();
    for (const change of changes) {
      const record = change.record;
      if (!record || record.datasetId !== options.datasetId || !uuid(record.id)) fail('InvalidInputError', 'Record belongs to another dataset');
      const key = change.table + ':' + record.id;
      if (seen.has(key)) fail('InvalidInputError', 'Duplicate record in change set');
      seen.add(key);
      const index = positions[change.table].get(record.id) ?? -1;
      const previous = data[change.table][index];
      if (change.expectedRevision === null) {
        if (previous) fail('RevisionConflictError', 'A record with this identifier already exists');
        if (record.revision !== 1) fail('InvalidInputError', 'New records start at revision one');
        positions[change.table].set(record.id, data[change.table].length); data[change.table].push(record);
      } else {
        if (!previous || previous.revision !== change.expectedRevision) fail('RevisionConflictError', 'Record changed since it was read');
        if(change.table==='documents'&&record.date!==previous.date)changedDocumentDates.add(previous.id);
        if (record.revision !== previous.revision + 1 || record.createdAt !== previous.createdAt || record.updatedAt < previous.updatedAt) fail('InvalidInputError', 'Invalid revision or immutable creation timestamp');
        if (change.table === 'inventoryItems' && (record.unitId !== previous.unitId || record.quantityPrecision !== previous.quantityPrecision) &&
            data.inventoryMovements.some(row => row.itemId === previous.id)) fail('ImmutableMovementError', 'Cannot reinterpret the unit or precision of existing stock');
        if (change.table === 'animalEvents') {
          for (const field of ['animalId','type','eventDate','recordedAt','source','originKey','parameters','correctsEventId']) {
            if (root.utils.canonicalJson.stringify(record[field] ?? null) !== root.utils.canonicalJson.stringify(previous[field] ?? null)) fail('ImmutableHistoryError', 'Correct historical facts through a linked replacement event');
          }
          for (const field of ['supersededByEventId','voidReason']) if (previous[field] && record[field] !== previous[field]) fail('ImmutableHistoryError', 'A historical correction cannot be removed or redirected');
        }
        if (['financialMovements','inventoryMovements'].includes(change.table)) {
          const fixed = change.table === 'financialMovements' ? ['amountMinor','currencyCode','date','direction','animalId','contactId','source','originKey'] : ['itemId','date','deltaScaled','type','donationLineId','originKey'];
          for (const field of fixed) if (root.utils.canonicalJson.stringify(record[field] ?? null) !== root.utils.canonicalJson.stringify(previous[field] ?? null)) fail('ImmutableMovementError', 'Correct movements through a linked replacement or compensation');
        }
        data[change.table][index] = record;
      }
    }
    const documentFacts=changedDocumentDates.size?capture.tables.animalEvents.filter(row=>row.type==='document'&&row.source.type==='document'&&changedDocumentDates.has(row.source.id)&&!row.supersededByEventId&&!row.voidReason).map(row=>({id:row.id,documentId:row.source.id})):[];
    for(const fact of documentFacts){
      const document=data.documents.find(row=>row.id===fact.documentId),old=data.animalEvents.find(row=>row.id===fact.id),next=data.animalEvents.find(row=>row.id===old?.supersededByEventId);
      if(old.eventDate===document.date&&!old.supersededByEventId&&!old.voidReason)continue;
      if(!next||next.correctsEventId!==old.id||next.type!=='document'||next.source.type!=='document'||next.source.id!==document.id||next.eventDate!==document.date||next.supersededByEventId||next.voidReason)fail('ImmutableHistoryError','Document date changes must replace all current document events coherently');
    }
    // Rows of a capture this tab validated itself, on the same civil day and organization settings, keep their
    // per-record result; a cold capture, a new day or a settings change validates every row again.
    const civil = today(data), proven = readCache?.value === capture && readCache.validated?.today === civil && !stores.includes('organizationSettings') ? readCache.validated.rows : null;
    root.domain.validateDataset(data, { datasetId: options.datasetId, today: civil, throwOnError: true, trusted: proven || undefined });
    const saved = await storage.writeCoordinator.mutate(command, access => {
      if (options.animalSequence) access.advanceAnimalSequence(options.animalSequence.expected, options.animalSequence.next);
      let remaining = changes.length;
      for (const change of changes) access.get(change.table, change.record.id, previous => {
        if (change.expectedRevision === null ? !!previous : !previous || previous.revision !== change.expectedRevision) fail('RevisionConflictError', 'Record changed during save');
        if (change.expectedRevision === null) access.add(change.table, change.record);
        else access.put(change.table, change.record);
        if (--remaining === 0) access.setResult(result);
      });
    });
    publish(saved, capture, data, options, civil);
    return saved;
  }
  // Write-through: after transaction.complete the validated state equals storage at the written anchors, so the next
  // reusable snapshot can skip re-reading every table. Its anchors are still re-read from IndexedDB on every hit;
  // any difference (another tab, other metadata, another connection) falls back to a full read.
  function publish(saved, capture, data, options, civil) {
    const written = saved?.written;
    if (saved?.duplicate || !written || written.active.datasetId !== options.datasetId) return;
    const animalSequence = options.animalSequence ? options.animalSequence.next : capture.animalSequence;
    const value = { datasetId: options.datasetId, dataRevision: written.dataset.dataRevision, globalRevision: written.active.revision,
      dataset: written.dataset, animalSequence, tables: data };
    const stamp = root.utils.canonicalJson.stringify({ active: written.active, dataset: written.dataset, animalSequence });
    freeze(value);
    const rows = new WeakSet(); for (const name of tables) for (const row of data[name]) rows.add(row);
    readCache = { connection: written.connection, stamp, value, validated: { today: civil, rows } };
  }
  storage.repositories = Object.freeze({ snapshot, get, list, commit, clearReadCache() { readCache = null; } });
}());
