/* Test-only faults and scheduling hooks. Production scripts are loaded unchanged. */
(function () {
  'use strict';
  const root = window.RescueManager, s = root.storage, v = root.services, manager = s.datasetManager;
  const integration = root.integration = Object.assign({}, root.testObservations);
  const report = integration.report = { startedAt: new Date().toISOString(), checks: [], passed: false };
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const id = () => root.utils.ids.uuidV4();
  let source;
  function draw() {
    document.getElementById('summary').textContent = report.passed ? 'Pruebas correctas' : 'Comprobaciones en curso o con errores';
    document.getElementById('checks').replaceChildren(...report.checks.map(check => {
      const row = document.createElement('li'); row.className = check.passed ? 'pass' : 'fail'; row.textContent = (check.passed ? '✓ ' : '✕ ') + check.id; return row;
    }));
    document.getElementById('details').textContent = JSON.stringify(report, null, 2);
  }
  async function test(name, work) {
    try { report.checks.push({ id: name, passed: true, evidence: await work() }); }
    catch (error) { report.checks.push({ id: name, passed: false, error: { name: error.name, message: error.message, details: error.details, stack: error.stack } }); }
    draw();
  }
  async function rejects(work, expected) {
    try { await work(); } catch (error) { assert(error.name === expected, 'Expected ' + expected + ', got ' + error.name + ': ' + error.message); return error.name; }
    throw new Error('Invalid operation succeeded: ' + expected);
  }
  async function snapshot(datasetId) {
    const capture = await s.repositories.snapshot(datasetId);
    return capture ? { datasetId: capture.datasetId, dataRevision: capture.dataRevision, globalRevision: capture.globalRevision,
      digest: await manager.digest(capture), counts: Object.fromEntries(s.schema.tables.map(name => [name, capture.tables[name].length])) } : null;
  }
  integration.snapshot = () => snapshot();
  integration.inspect = async () => ({ active: await snapshot(), datasets: await Promise.all((await manager.list()).map(async row => ({ ...row, snapshot: await snapshot(row.id) }))) });
  async function fixture() {
    await s.database.open(); assert((await s.writeCoordinator.readActive()) === null, 'Fixture profile was not empty');
    await v.settings.create({ name: 'Recuperación sintética ñ 🐾', currencyCode: 'EUR', dateFormat: 'iso', timeZone: 'UTC', language: 'es' });
    const blob = new Blob(['Bytes de recuperación\nñ 🐾'], { type: 'text/plain' }), sha256 = await root.utils.integrity.sha256(blob);
    await v.context.execute('test.recoveryFixture', { count: 3, sha256 }, (data, h) => {
      const type = data.catalogOptions.find(row => row.kind === 'document_type');
      const asset = h.create('assets', { type: 'embedded_document', originalName: 'recovery.txt', mime: 'text/plain', byteLength: blob.size, sha256, blob });
      const document = h.create('documents', { title: 'Prueba de recuperación', typeId: type.id, date: root.utils.dates.today('UTC'), mode: 'embedded', assetId: asset.id });
      return { changes: [h.insert('assets', asset), h.insert('documents', document), ...Array.from({ length: 3 }, (_, index) => h.insert('contacts', h.create('contacts', { name: 'Contacto sintético ' + index, roles: [] })))], result: { assetId: asset.id } };
    });
    source = await v.context.snapshot();
    return { datasetId: source.datasetId, digest: await manager.digest(source), byteLength: blob.size };
  }
  async function options() { const capture = await v.context.snapshot(); return v.context.options(capture); }
  async function unchanged(before) {
    const after = await snapshot();
    assert(before.datasetId === after.datasetId && before.digest === after.digest && before.dataRevision === after.dataRevision && before.globalRevision === after.globalRevision, 'Failure modified the active dataset');
    return after;
  }
  async function withStoreFault(method, predicate, work) {
    const original = IDBObjectStore.prototype[method]; let injected = 0;
    IDBObjectStore.prototype[method] = function (record, ...rest) {
      if (predicate.call(this, record)) { injected++; throw new DOMException('Injected fault: ' + method + ' on ' + this.name, method === 'add' ? 'QuotaExceededError' : 'AbortError'); }
      return original.call(this, record, ...rest);
    };
    try { return { value: await work(), injected }; }
    finally { IDBObjectStore.prototype[method] = original; }
  }
  async function run() {
    await test('recovery-fixture-commits-real-indexeddb-records-and-blob', fixture);
    await test('injected-quota-error-aborts-entire-staging-batch-with-active-intact', async () => {
      const before = await snapshot(), known = new Set((await manager.list()).map(row => row.id)), config = await options(); let queued = 0;
      const evidence = await withStoreFault('add', function (record) { return this.name === 'contacts' && record.datasetId !== before.datasetId && ++queued === 2; },
        () => rejects(() => manager.prepare(source, config), 'QuotaExceededError'));
      const target = (await manager.list()).find(row => !known.has(row.id)), staged = await s.repositories.snapshot(target.id);
      assert(evidence.injected === 1 && target.state === 'staging' && !target.validation && staged.tables.contacts.length === 0, 'Partial failed contact batch was committed');
      await unchanged(before);
      return { simulation: 'DOMException QuotaExceededError injected before second contacts.add in a real IndexedDB transaction; actual disk quota not exhausted', queuedBeforeFault: queued - 1, injected: evidence.injected, error: evidence.value, targetId: target.id, stagedContacts: staged.tables.contacts.length, stagedOrganization: staged.tables.organizationSettings.length, activeUnchanged: true };
    });
    await test('cancellation-after-all-batches-never-validates-or-activates-staging', async () => {
      const before = await snapshot(), known = new Set((await manager.list()).map(row => row.id)), controller = new AbortController(), config = await options(); let progress;
      const error = await rejects(() => manager.prepare(source, { ...config, signal: controller.signal, onProgress(value) { progress = value; if (value.completed === value.total) controller.abort(); } }), 'AbortError');
      const target = (await manager.list()).find(row => !known.has(row.id));
      assert(progress.completed === progress.total && target.state === 'staging' && !target.validation, 'Cancelled staging was validated or activated');
      await unchanged(before); return { error, completed: progress.completed, total: progress.total, targetId: target.id, state: target.state, activeUnchanged: true };
    });
    await test('injected-activation-write-failure-rolls-back-retirement-and-active-pointer', async () => {
      const before = await snapshot(), config = await options(), prepared = await manager.prepare(source, config);
      const evidence = await withStoreFault('put', function (record) { return this.name === 'meta' && record.key === 'active'; },
        () => rejects(() => manager.activate(prepared, config), 'AbortError'));
      const rows = await manager.list();
      assert(evidence.injected === 1 && rows.find(row => row.id === before.datasetId).state === 'active' && rows.find(row => row.id === prepared.targetId).state === 'staging', 'Activation partially retired or activated a dataset');
      await unchanged(before); return { simulation: 'AbortError injected on active-pointer put after both dataset state writes were queued; real IndexedDB transaction abort', injected: evidence.injected, error: evidence.value, targetId: prepared.targetId, activeUnchanged: true };
    });
    await test('changed-revision-rejects-prepared-target-and-requires-current-verified-backup', async () => {
      const capture = await v.context.snapshot(), config = await options(), backup = await v.backup.create(); await v.backup.verify(backup.blob);
      const prepared = await manager.prepare(source, config);
      await v.settings.update({ name: 'Organización modificada durante vista previa' });
      const afterEdit = await snapshot();
      const stalePrepared = await rejects(() => manager.activate(prepared, config), 'RevisionConflictError');
      const staleSummary = await rejects(() => v.backup.restore(source, { confirmed: true, expectedRevision: capture.globalRevision }), 'RevisionConflictError');
      const staleReceipt = await rejects(() => v.backup.restore(source, { confirmed: true, expectedRevision: afterEdit.globalRevision }), 'VerifiedBackupRequiredError');
      await unchanged(afterEdit);
      const current = await v.backup.create(); await v.backup.verify(current.blob);
      await v.backup.restore(source, { confirmed: true, expectedRevision: afterEdit.globalRevision });
      const afterRestore = await snapshot(), retired = await s.repositories.snapshot(afterEdit.datasetId);
      assert(afterRestore.datasetId !== afterEdit.datasetId && await manager.digest(retired) === afterEdit.digest && retired.dataset.state === 'retired', 'Revalidation lost the edited previous dataset');
      return { stalePrepared, staleSummary, staleReceipt, editedRevision: afterEdit.globalRevision, activatedRevision: afterRestore.globalRevision, editedPreviousDatasetRetained: true };
    });
    await test('unconfirmed-restore-and-recovery-selection-do-not-write', async () => {
      const before = await snapshot();
      const unconfirmed = await rejects(() => v.backup.restore(source, { confirmed: false, expectedRevision: before.globalRevision }), 'ConfirmationRequiredError');
      const wrongRecovery = await rejects(() => v.backup.recover(before.datasetId, { confirmed: true, expectedRevision: before.globalRevision }), 'InvalidInputError');
      await unchanged(before); return { unconfirmed, wrongRecovery, activeUnchanged: true };
    });
    await test('recover-retired-dataset-creates-a-new-validated-copy-and-retains-current-data', async () => {
      const before = await v.context.snapshot(), previous = (await manager.list()).find(row => row.state === 'retired');
      assert(previous, 'No retired dataset was retained by the fixture');
      const recoverySource = await s.repositories.snapshot(previous.id), protectedDigest = await manager.digest(before);
      const currentCopy = await v.backup.create(); await v.backup.verify(currentCopy.blob);
      await v.backup.recover(previous.id, { confirmed: true, expectedRevision: before.globalRevision });
      const recovered = await s.repositories.snapshot(), preservedCurrent = await s.repositories.snapshot(before.datasetId), retainedSource = await s.repositories.snapshot(previous.id);
      const expected = { ...recoverySource, datasetId: recovered.datasetId, tables: Object.fromEntries(Object.entries(recoverySource.tables).map(([name, rows]) => [name, rows.map(row => ({ ...row, datasetId: recovered.datasetId }))])) };
      assert(recovered.datasetId !== previous.id && recovered.datasetId !== before.datasetId, 'Recovery activated an old dataset directly instead of preparing a copy');
      assert(await manager.digest(recovered) === await manager.digest(expected) && recovered.dataset.state === 'active' && recovered.dataset.validation, 'Recovery copy is not complete and validated');
      assert(preservedCurrent.dataset.state === 'retired' && await manager.digest(preservedCurrent) === protectedDigest && retainedSource.dataset.state === 'retired', 'Recovery lost the current or source dataset');
      return { sourceDatasetId: previous.id, protectedPreviousActiveId: before.datasetId, recoveredDatasetId: recovered.datasetId, recoveredDigest: await manager.digest(recovered), previousActiveDigest: protectedDigest, currentAndSourceRetained: true };
    });
    report.passed = report.checks.length > 0 && report.checks.every(row => row.passed); report.completedAt = new Date().toISOString(); draw(); return report;
  }
  // Deterministic checkpoints around real commits. The runner kills only this profile's verified process tree.
  integration.startCrash = async phase => {
    assert(['preparing', 'prepared', 'activated'].includes(phase), 'Unknown crash phase');
    await fixture();
    const baseline = await snapshot(), sourceCopy = structuredClone(source), config = await options();
    sourceCopy.tables.contacts[0].name = 'Contacto cambiado por restauración';
    sourceCopy.tables.contacts[0].revision++;
    const known = new Set((await manager.list()).map(row => row.id));
    const prepared = await manager.prepare(sourceCopy, { ...config, onProgress(value) {
      if (phase !== 'preparing' || integration.crashCheckpoint) return;
      const original = window.setTimeout;
      window.setTimeout = function (callback, delay, ...args) {
        if (delay === 0) { window.setTimeout = original; integration.resumePreparation = callback; return 0; }
        return original.call(window, callback, delay, ...args);
      };
      integration.crashCheckpoint = { phase, baseline, progress: value, schedulingHook: 'Pause the next zero-delay yield after a completed IndexedDB batch; no production change' };
    } });
    const target = await snapshot(prepared.targetId);
    if (phase === 'prepared') { integration.crashCheckpoint = { phase, baseline, target, prepared, schedulingHook: 'Pause before calling activation' }; return; }
    if (phase === 'activated') {
      await manager.activate(prepared, config);
      integration.crashCheckpoint = { phase, baseline, target, prepared, activeAfterComplete: await snapshot(), schedulingHook: 'Checkpoint only after activation transaction.complete resolved' };
    }
    assert(phase !== 'preparing' || known.size > 0, 'Preparation checkpoint did not pause');
  };
  const mode = new URLSearchParams(location.search);
  integration.ready = mode.has('peer') || mode.has('crash') ? s.database.open() : run();
}());
