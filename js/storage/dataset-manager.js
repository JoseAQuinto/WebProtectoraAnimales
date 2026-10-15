(function () {
  'use strict';
  const root = window.RescueManager, s = root.storage, tables = s.schema.tables;
  const run = (...args) => s.transactions.run(...args);
  const fail = (name, message) => { throw s.error(name, message); };
  const revision = n => Number.isSafeInteger(n) && n >= 0;
  function cancel(signal) { if (signal?.aborted) fail('AbortError', 'Preparation was cancelled; current data is intact'); }
  function guard(tx, api, options, callback) {
    api.request(tx.objectStore('meta').get('active'), active => {
      if (!options.datasetId) {
        if (active) fail('DatasetChangedError', 'An organization was created in another tab');
        callback(null); return;
      }
      if (!active || active.datasetId !== options.datasetId) fail('DatasetChangedError', 'The active dataset has changed');
      if (active.revision !== options.expectedRevision) fail('RevisionConflictError', 'Data changed since preparation began');
      api.request(tx.objectStore('meta').get('writer'), lease => {
        if (!lease || lease.datasetId !== options.datasetId || lease.owner !== options.owner || lease.token !== options.leaseToken || lease.expiresAt <= Date.now()) fail('LeaseLostError', 'This tab no longer has write control');
        callback(active);
      });
    });
  }
  function validate(snapshot) {
    const zone = snapshot.tables.organizationSettings?.[0]?.timeZone || 'UTC';
    root.domain.validateDataset(snapshot.tables, { datasetId: snapshot.datasetId, today: root.utils.dates.today(zone), allowEmpty: true, throwOnError: true });
  }
  async function digest(snapshot) {
    const metadata = {};
    for (const name of tables) metadata[name] = [...(snapshot.tables[name] || [])].sort((a,b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0).map(row => {
      if (name !== 'assets') return row;
      const { blob, ...rest } = row; return rest;
    });
    for (const asset of snapshot.tables.assets || []) {
      if (asset.blob.size !== asset.byteLength || await root.utils.integrity.sha256(asset.blob) !== asset.sha256) fail('IntegrityError', 'Prepared binary does not match its hash');
    }
    return root.utils.integrity.sha256(root.utils.canonicalJson.stringify(metadata));
  }
  async function prepare(source, options = {}) {
    cancel(options.signal); validate(source);
    const targetId = root.utils.ids.uuidV4(), rebased = { datasetId: targetId, dataRevision: source.dataRevision, tables: {} };
    if (!revision(source.dataRevision)) fail('InvalidInputError', 'Invalid source revision');
    for (const name of tables) rebased.tables[name] = (source.tables[name] || []).map(row => ({ ...row, datasetId: targetId }));
    validate(rebased);
    const expectedDigest = await digest(rebased);
    cancel(options.signal);
    await run(['meta','datasets'], 'readwrite', (tx, api) => guard(tx, api, options, () => {
      const now = new Date().toISOString();
      tx.objectStore('datasets').add({ id: targetId, state: 'staging', schemaVersion: root.config.schemaVersion,
        dataRevision: source.dataRevision, stagingRevision: 0, createdAt: now, updatedAt: now,
        previousDatasetId: options.datasetId || null, sourceDatasetId: source.datasetId, preparation: options.reason || 'restore' });
    }));
    let stagingRevision = 0, completed = 0;
    const total = tables.reduce((count, name) => count + rebased.tables[name].length, 0);
    for (const name of tables) {
      const rows = rebased.tables[name];
      for (let start = 0; start < rows.length; start += 250) {
        cancel(options.signal);
        const batch = rows.slice(start, start + 250);
        await run(['meta','datasets', name], 'readwrite', (tx, api) => guard(tx, api, options, () => {
          api.request(tx.objectStore('datasets').get(targetId), target => {
            if (!target || target.state !== 'staging' || target.stagingRevision !== stagingRevision) fail('RevisionConflictError', 'Prepared data was changed');
            for (const row of batch) tx.objectStore(name).add(row);
            tx.objectStore('datasets').put({ ...target, stagingRevision: stagingRevision + 1, updatedAt: new Date().toISOString() });
          });
        }));
        stagingRevision++; completed += batch.length;
        options.onProgress?.({ phase: 'preparing', completed, total });
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    cancel(options.signal);
    const stored = await s.repositories.snapshot(targetId);
    validate(stored);
    if (await digest(stored) !== expectedDigest) fail('IntegrityError', 'Prepared records do not match the source');
    cancel(options.signal);
    await run(['meta','datasets'], 'readwrite', (tx, api) => guard(tx, api, options, () => {
      api.request(tx.objectStore('datasets').get(targetId), target => {
        if (!target || target.state !== 'staging' || target.stagingRevision !== stagingRevision) fail('RevisionConflictError', 'Prepared data changed during validation');
        tx.objectStore('datasets').put({ ...target, validation: { stagingRevision, digest: expectedDigest, validatedAt: new Date().toISOString() } });
      });
    }));
    return { targetId, stagingRevision, digest: expectedDigest, total };
  }
  function activate(prepared, options) {
    return run(['meta','datasets'], 'readwrite', (tx, api) => guard(tx, api, options, active => {
      api.request(tx.objectStore('datasets').get(prepared.targetId), target => {
        if (!target || target.state !== 'staging' || target.stagingRevision !== prepared.stagingRevision ||
            target.validation?.stagingRevision !== target.stagingRevision || target.validation?.digest !== prepared.digest) fail('DatasetNotValidatedError', 'Prepared data has not passed validation');
        const now = new Date().toISOString();
        function complete(previous) {
          if (previous) tx.objectStore('datasets').put({ ...previous, state: 'retired', updatedAt: now });
          tx.objectStore('datasets').put({ ...target, state: 'active', updatedAt: now });
          if (active && active.revision === Number.MAX_SAFE_INTEGER) fail('RevisionOverflowError', 'Revision cannot be incremented');
          const value = { key: 'active', datasetId: target.id, revision: active ? active.revision + 1 : 0 };
          tx.objectStore('meta').put(value); tx.objectStore('meta').delete('writer'); api.setResult(value);
        }
        if (active) api.request(tx.objectStore('datasets').get(active.datasetId), previous => {
          if (!previous || previous.state !== 'active') fail('DatasetChangedError', 'Previous data is unavailable');
          complete(previous);
        });
        else complete(null);
      });
    }));
  }
  async function listDatasets() {
    return run(['datasets'], 'readonly', (tx, api) => api.request(tx.objectStore('datasets').getAll(), values => api.setResult(values)));
  }
  // Only incomplete preparations may be removed; active and recovery datasets are never cleaned automatically.
  function discardStaging(targetId) {
    return run(['meta','datasets', ...tables], 'readwrite', (tx, api) => {
      api.request(tx.objectStore('meta').get('active'), active => {
        if (active?.datasetId === targetId) fail('DatasetChangedError', 'Cannot remove active data');
        api.request(tx.objectStore('datasets').get(targetId), target => {
          if (!target || target.state !== 'staging') fail('InvalidInputError', 'Only an incomplete preparation may be discarded');
          for (const name of tables) api.request(tx.objectStore(name).index('byDataset').openKeyCursor(IDBKeyRange.only(targetId)), cursor => {
            if (cursor) { tx.objectStore(name).delete(cursor.primaryKey); cursor.continue(); }
          });
          tx.objectStore('datasets').delete(targetId);
        });
      });
    });
  }
  s.datasetManager = Object.freeze({ prepare, activate, list: listDatasets, discardStaging, digest });
}());
