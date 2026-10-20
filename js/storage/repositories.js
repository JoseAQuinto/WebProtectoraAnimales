(function () {
  'use strict';
  const root = window.RescueManager, storage = root.storage;
  const tables = storage.schema.tables;
  const fail = (name, message) => { throw storage.error(name, message); };
  const table = name => { if (!tables.includes(name)) fail('InvalidInputError', 'Unknown business table'); return name; };
  const uuid = value => root.utils.ids.isUuidV4(value);
  const run = (...args) => storage.transactions.run(...args);
  function today(data) {
    return root.utils.dates.today(data.organizationSettings?.[0]?.timeZone || 'UTC');
  }
  // Rows and Blob references are captured in ONE transaction; binary encoding is outside it.
  function snapshot(datasetId) {
    return run(['meta', 'datasets', ...tables], 'readonly', (tx, api) => {
      api.request(tx.objectStore('meta').get('active'), active => {
        const id = datasetId || active?.datasetId;
        if (!id) { api.setResult(null); return; }
        if (!uuid(id)) fail('InvalidInputError', 'Invalid dataset');
        api.request(tx.objectStore('datasets').get(id), dataset => {
          if (!dataset) fail('DatasetChangedError', 'Dataset does not exist');
          const value = { datasetId: id, dataRevision: dataset.dataRevision,
            globalRevision: active?.revision ?? 0, dataset, tables: {} };
          let remaining = tables.length + 1;
          api.request(tx.objectStore('meta').get('animalSequence:' + id), sequence => {
            value.animalSequence = sequence?.value || 0;
            if (--remaining === 0) api.setResult(value);
          });
          for (const name of tables) {
            api.request(tx.objectStore(name).index('byDataset').getAll(id), records => {
              value.tables[name] = records;
              if (--remaining === 0) api.setResult(value);
            });
          }
        });
      });
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
    const documentFacts=data.animalEvents.filter(row=>row.type==='document'&&row.source.type==='document'&&!row.supersededByEventId&&!row.voidReason).map(row=>({id:row.id,documentId:row.source.id})),changedDocumentDates=new Set();
    const seen = new Set();
    for (const change of changes) {
      const record = change.record;
      if (!record || record.datasetId !== options.datasetId || !uuid(record.id)) fail('InvalidInputError', 'Record belongs to another dataset');
      const key = change.table + ':' + record.id;
      if (seen.has(key)) fail('InvalidInputError', 'Duplicate record in change set');
      seen.add(key);
      const index = data[change.table].findIndex(row => row.id === record.id);
      const previous = data[change.table][index];
      if (change.expectedRevision === null) {
        if (previous) fail('RevisionConflictError', 'A record with this identifier already exists');
        if (record.revision !== 1) fail('InvalidInputError', 'New records start at revision one');
        data[change.table].push(record);
      } else {
        if (!previous || previous.revision !== change.expectedRevision) fail('RevisionConflictError', 'Record changed since it was read');
        if(change.table==='documents'&&record.date!==previous.date)changedDocumentDates.add(previous.id);
        if (record.revision !== previous.revision + 1 || record.createdAt !== previous.createdAt || record.updatedAt < previous.updatedAt) fail('InvalidInputError', 'Invalid revision or immutable creation timestamp');
        if (change.table === 'inventoryItems' && data.inventoryMovements.some(row => row.itemId === previous.id) &&
            (record.unitId !== previous.unitId || record.quantityPrecision !== previous.quantityPrecision)) fail('ImmutableMovementError', 'Cannot reinterpret the unit or precision of existing stock');
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
    for(const fact of documentFacts.filter(row=>changedDocumentDates.has(row.documentId))){
      const document=data.documents.find(row=>row.id===fact.documentId),old=data.animalEvents.find(row=>row.id===fact.id),next=data.animalEvents.find(row=>row.id===old?.supersededByEventId);
      if(old.eventDate===document.date&&!old.supersededByEventId&&!old.voidReason)continue;
      if(!next||next.correctsEventId!==old.id||next.type!=='document'||next.source.type!=='document'||next.source.id!==document.id||next.eventDate!==document.date||next.supersededByEventId||next.voidReason)fail('ImmutableHistoryError','Document date changes must replace all current document events coherently');
    }
    root.domain.validateDataset(data, { datasetId: options.datasetId, today: today(data), throwOnError: true });
    return storage.writeCoordinator.mutate(command, access => {
      if (options.animalSequence) access.advanceAnimalSequence(options.animalSequence.expected, options.animalSequence.next);
      let remaining = changes.length;
      for (const change of changes) access.get(change.table, change.record.id, previous => {
        if (change.expectedRevision === null ? !!previous : !previous || previous.revision !== change.expectedRevision) fail('RevisionConflictError', 'Record changed during save');
        if (change.expectedRevision === null) access.add(change.table, change.record);
        else access.put(change.table, change.record);
        if (--remaining === 0) access.setResult(result);
      });
    });
  }
  storage.repositories = Object.freeze({ snapshot, get, list, commit });
}());
