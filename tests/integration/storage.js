(function () {
  'use strict';
  const root = window.RescueManager;
  const storage = root.storage;
  const coordinator = storage.writeCoordinator;
  const integration = root.integration = {};
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const report = integration.report = { startedAt: new Date().toISOString(), dbName: root.config.dbName,
    userAgent: navigator.userAgent, checks: [], passed: false };
  const state = integration.state = { datasetId: crypto.randomUUID(), targetId: crypto.randomUUID(), owner: crypto.randomUUID() };
  const ids = Object.fromEntries(['committed', 'related', 'rollback', 'obsolete', 'idempotent', 'async', 'foreign'].map(name => [name, crypto.randomUUID()]));
  integration.read = (store, key) => storage.transactions.run([store], 'readonly', (tx, api) => {
    api.request(tx.objectStore(store).get(key), value => api.setResult(value || null));
  });
  async function rejected(action, name) {
    try { await action(); } catch (error) { assert(error.name === name, 'Expected ' + name + ', got ' + error.name); return error.name; }
    throw new Error('Expected rejection: ' + name);
  }
  async function test(id, work) {
    try { report.checks.push({ id, passed: true, evidence: await work() }); }
    catch (error) { report.checks.push({ id, passed: false, error: { name: error.name, message: error.message, stack: error.stack } }); }
  }
  async function options(fingerprint) {
    const active = await coordinator.readActive();
    return { owner: state.owner, datasetId: state.datasetId, expectedRevision: active.revision,
      operationId: crypto.randomUUID(), fingerprint, stores: ['testRecords', 'testRelated'] };
  }
  async function start() {
    assert(root.config.integrationTestStores && root.config.dbName.startsWith('animal-rescue-manager-test-'), 'Refusing to run outside the integration database');
    await test('open-does-not-create-dataset', async () => {
      const db = await storage.database.open();
      const active = await coordinator.readActive();
      assert(active === null, 'Opening created an active dataset');
      return { database: db.name, version: db.version, stores: Array.from(db.objectStoreNames), active };
    });
    await test('explicit-dataset-initialization-and-writer', async () => {
      const active = await coordinator.initializeDataset(state.datasetId);
      const acquired = await coordinator.acquire(state.owner, state.datasetId, 120000);
      await coordinator.createStagingDataset(state.targetId);
      assert(active.revision === 0 && acquired, 'Initialization or lease failed');
      return { active, acquired };
    });
    await test('multi-store-confirmed-commit', async () => {
      const command = await options('commit-record-and-relation');
      const result = await coordinator.mutate(command, access => {
        access.add('testRecords', { datasetId: state.datasetId, id: ids.committed, value: 'ñ 🐾', blob: new Blob(['kernel-blob-ñ']) });
        access.add('testRelated', { datasetId: state.datasetId, id: ids.related, recordId: ids.committed });
        access.setResult({ savedId: ids.committed });
      });
      const [record, related, active] = await Promise.all([integration.read('testRecords', [state.datasetId, ids.committed]), integration.read('testRelated', [state.datasetId, ids.related]), coordinator.readActive()]);
      assert(record.value === 'ñ 🐾' && await record.blob.text() === 'kernel-blob-ñ' && related.recordId === record.id, 'Committed data missing');
      assert(active.revision === command.expectedRevision + 1 && result.result.savedId === record.id, 'Revision/result was not committed');
      return { revision: result.revision, recordId: record.id, blobText: await record.blob.text() };
    });
    await test('intermediate-failure-rolls-back-all-stores-and-log', async () => {
      const command = await options('deliberate-rollback');
      const reason = storage.error('InjectedFailure', 'Failure after two writes');
      await rejected(() => coordinator.mutate(command, access => {
        access.add('testRecords', { datasetId: state.datasetId, id: ids.rollback });
        access.add('testRelated', { datasetId: state.datasetId, id: ids.rollback });
        access.fail(reason);
      }), 'InjectedFailure');
      const values = await Promise.all([integration.read('testRecords', [state.datasetId, ids.rollback]), integration.read('testRelated', [state.datasetId, ids.rollback]), integration.read('operations', [state.datasetId, command.operationId])]);
      assert(values.every(value => value === null), 'Partial data/log survived rollback');
      assert((await coordinator.readActive()).revision === command.expectedRevision, 'Aborted operation changed revision');
      return { survivingValues: values };
    });
    await test('obsolete-revision-is-rejected-without-write', async () => {
      const command = await options(ids.obsolete);
      command.expectedRevision -= 1;
      const name = await rejected(() => coordinator.mutate(command, access => access.add('testRecords', { datasetId: state.datasetId, id: ids.obsolete })), 'RevisionConflictError');
      assert(await integration.read('testRecords', [state.datasetId, ids.obsolete]) === null, 'Obsolete revision wrote data');
      return name;
    });
    await test('concurrent-identical-operation-id-is-applied-once', async () => {
      const command = await options('idempotent-one-record');
      const work = access => { access.add('testRecords', { datasetId: state.datasetId, id: ids.idempotent }); access.setResult('one-result'); };
      const results = await Promise.all([coordinator.mutate(command, work), coordinator.mutate(command, work)]);
      assert(results.filter(value => value.duplicate).length === 1 && results.every(value => value.result === 'one-result'), 'Retry did not return the committed result');
      assert((await coordinator.readActive()).revision === command.expectedRevision + 1, 'Duplicate advanced global revision');
      const conflict = await rejected(() => coordinator.mutate({ ...command, fingerprint: 'different-intent' }, work), 'IdempotencyConflictError');
      return { results, conflictingIntent: conflict };
    });
    await test('synchronous-request-callbacks-can-read-then-write', async () => {
      const command = await options('read-modify-write');
      const result = await coordinator.mutate(command, access => {
        access.get('testRecords', ids.committed, record => {
          access.put('testRecords', { ...record, value: 'updated' });
          access.setResult({ observed: record.value });
        });
      });
      assert(result.result.observed === 'ñ 🐾' && (await integration.read('testRecords', [state.datasetId, ids.committed])).value === 'updated', 'Request callback result was not logged atomically');
      return result;
    });
    await test('async-mutation-callback-is-aborted', async () => {
      const command = await options('async-callback');
      const name = await rejected(() => coordinator.mutate(command, async access => {
        access.add('testRecords', { datasetId: state.datasetId, id: ids.async });
        await Promise.resolve();
      }), 'AsyncTransactionCallbackError');
      assert(await integration.read('testRecords', [state.datasetId, ids.async]) === null, 'Async callback left partial write');
      return name;
    });
    await test('cross-dataset-write-is-rejected', async () => {
      const command = await options('wrong-dataset');
      const name = await rejected(() => coordinator.mutate(command, access => access.add('testRecords', { datasetId: state.targetId, id: ids.foreign })), 'InvalidInputError');
      assert(await integration.read('testRecords', [state.targetId, ids.foreign]) === null, 'Cross-dataset write succeeded');
      return name;
    });
    report.passed = report.checks.every(check => check.passed);
    report.completedAt = new Date().toISOString();
    document.getElementById('summary').textContent = report.passed ? 'Pruebas iniciales del núcleo correctas. La prueba automatizada añade otra pestaña y versiones futuras.' : 'Hay fallos en las pruebas del núcleo.';
    document.getElementById('checks').replaceChildren(...report.checks.map(check => {
      const item = document.createElement('li'); item.className = check.passed ? 'pass' : 'fail'; item.textContent = (check.passed ? '✓ ' : '✕ ') + check.id; return item;
    }));
    document.getElementById('details').textContent = JSON.stringify(report, null, 2);
    return report;
  }
  integration.futureVersion = async function () {
    await storage.database.close();
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(root.config.dbName, root.config.dbVersion + 1);
      request.onupgradeneeded = () => request.result.createObjectStore('futureSentinel');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const before = await new Promise((resolve, reject) => {
      const tx = db.transaction('testRecords', 'readonly');
      let count;
      tx.objectStore('testRecords').count().onsuccess = event => { count = event.target.result; };
      tx.oncomplete = () => resolve(count); tx.onabort = () => reject(tx.error);
    });
    db.close();
    const rejection = await rejected(() => storage.database.open(), 'VersionError');
    const verify = await new Promise((resolve, reject) => {
      const request = indexedDB.open(root.config.dbName);
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    const after = await new Promise((resolve, reject) => {
      const tx = verify.transaction('testRecords', 'readonly'); let count;
      tx.objectStore('testRecords').count().onsuccess = event => { count = event.target.result; };
      tx.oncomplete = () => resolve(count); tx.onabort = () => reject(tx.error);
    });
    const version = verify.version;
    verify.close();
    assert(before > 0 && before === after && version === root.config.dbVersion + 1, 'Future-version rejection removed existing data');
    return { rejection, before, after, version };
  };
  if (new URLSearchParams(location.search).has('peer')) {
    document.getElementById('summary').textContent = 'Pestaña secundaria de la prueba automatizada. No crea conjuntos ni ejecuta la suite principal.';
    integration.ready = Promise.resolve();
  } else integration.ready = start();
}());
