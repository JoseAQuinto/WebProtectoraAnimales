(function () {
  'use strict';
  const root = window.RescueManager, s = root.storage, w = s.writeCoordinator;
  const integration = root.integration = {};
  Object.assign(integration, root.testObservations);
  const report = integration.report = { startedAt: new Date().toISOString(), userAgent: navigator.userAgent, checks: [], passed: false };
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const id = () => root.utils.ids.uuidV4();
  const now = new Date().toISOString(), today = root.utils.dates.today('UTC');
  let options, container, encoded, decoded, contact;
  const make = (name, input, datasetId) => root.domain.createRecord(name, input, { datasetId, now });
  function draw() {
    document.getElementById('summary').textContent = report.passed ? 'Pruebas correctas' : 'Comprobaciones en curso o con errores';
    document.getElementById('checks').replaceChildren(...report.checks.map(check => {
      const li = document.createElement('li'); li.className = check.passed ? 'pass' : 'fail'; li.textContent = (check.passed ? '✓ ' : '✕ ') + check.id; return li;
    }));
    document.getElementById('details').textContent = JSON.stringify(report, null, 2);
  }
  async function test(name, work) {
    try { report.checks.push({ id: name, passed: true, evidence: await work() }); }
    catch (error) { report.checks.push({ id: name, passed: false, error: { name: error.name, message: error.message, details: error.details, stack: error.stack } }); }
    draw();
  }
  async function reject(work) {
    try { await work(); } catch (error) { return error.name; }
    throw new Error('An invalid operation unexpectedly succeeded');
  }
  async function command(fingerprint) {
    const active = await w.readActive();
    return { ...options, expectedRevision: active.revision, operationId: id(), fingerprint };
  }
  integration.snapshot = async () => {
    const snap = await s.repositories.snapshot();
    return snap ? { datasetId: snap.datasetId, dataRevision: snap.dataRevision, digest: await s.datasetManager.digest(snap) } : null;
  };
  async function run() {
    await test('business-schema-and-explicit-atomic-initialization', async () => {
      const db = await s.database.open();
      assert((await w.readActive()) === null, 'Opening created user data');
      const datasetId = id(), tables = Object.fromEntries(s.schema.tables.map(name => [name, []]));
      tables.organizationSettings.push(make('organizationSettings', { name: 'Refugio Sintético ñ 🐾', currencyCode: 'EUR', dateFormat: 'day_first', timeZone: 'UTC', language: 'es' }, datasetId));
      const staged = await s.datasetManager.prepare({ datasetId, dataRevision: 0, tables }, {});
      const active = await s.datasetManager.activate(staged, {});
      const owner = id(); assert(await w.acquire(owner, active.datasetId, 120000), 'Could not acquire writer');
      options = { owner, datasetId: active.datasetId, leaseToken: (await w.readLease()).token };
      return { version: db.version, businessStores: s.schema.tables.length, active };
    });
    await test('repository-confirmed-commit-and-idempotent-replay', async () => {
      contact = make('contacts', { name: 'Contacto de prueba', roles: ['donor'], email: 'test@example.invalid' }, options.datasetId);
      const cmd = await command('create-one-contact');
      const changes = [{ table: 'contacts', record: contact, expectedRevision: null }];
      const first = await s.repositories.commit(cmd, changes, { id: contact.id });
      const second = await s.repositories.commit(cmd, changes, { id: contact.id });
      assert(!first.duplicate && second.duplicate && first.result.id === second.result.id, 'Retry was not idempotent');
      assert((await s.repositories.list('contacts', { datasetId: options.datasetId })).length === 1, 'Duplicate contact');
      return { revision: first.revision, replayed: second.duplicate };
    });
    await test('stale-record-and-invalid-reference-leave-current-data-intact', async () => {
      const before = await integration.snapshot();
      const bad = make('volunteerProfiles', { contactId: id() }, options.datasetId);
      const invalid = await reject(async () => s.repositories.commit(await command('broken-ref'), [{ table: 'volunteerProfiles', record: bad, expectedRevision: null }]));
      const changed = { ...contact, name: 'Old edit', revision: 2 };
      const stale = await reject(async () => s.repositories.commit(await command('stale-record'), [{ table: 'contacts', record: changed, expectedRevision: 2 }]));
      assert(before.digest === (await integration.snapshot()).digest, 'Rejected write changed data');
      return { invalid, stale };
    });
    await test('blob-and-document-are-committed-together', async () => {
      const blob = new Blob(['Documento sintético ñ\nsegunda línea'], { type: 'text/plain' });
      const asset = make('assets', { type: 'embedded_document', originalName: 'test.txt', mime: 'text/plain', byteLength: blob.size, sha256: await root.utils.integrity.sha256(blob), blob }, options.datasetId);
      const type = make('catalogOptions', { kind: 'document_type', code: 'general', customLabel: 'General' }, options.datasetId);
      const document = make('documents', { title: 'Documento de prueba', typeId: type.id, date: today, mode: 'embedded', assetId: asset.id }, options.datasetId);
      await s.repositories.commit(await command('binary-document'), [type, asset, document].map(record => ({ table: record === type ? 'catalogOptions' : record === asset ? 'assets' : 'documents', record, expectedRevision: null })));
      assert((await s.repositories.get('assets', asset.id, options.datasetId)).blob.size === blob.size, 'Missing bytes');
      return { byteLength: blob.size, sha256: asset.sha256 };
    });
    await test('full-backup-self-validation-and-binary-roundtrip', async () => {
      const snapshot = await s.repositories.snapshot();
      encoded = await root.services.backupCodec.encode(snapshot); container = encoded.container;
      decoded = await root.services.backupCodec.decode(encoded.text);
      assert(await s.datasetManager.digest(snapshot) === await s.datasetManager.digest(decoded), 'Backup changed business data');
      return encoded.summary;
    });
    await test('corrupt-truncated-and-future-backups-never-touch-active-data', async () => {
      const before = await integration.snapshot();
      const corrupt = JSON.parse(encoded.text); corrupt.integrity.contentHash = '0'.repeat(64);
      const future = JSON.parse(encoded.text); future.backupFormatVersion = 999;
      const errors = [];
      for (const input of [encoded.text.slice(0, -9), JSON.stringify(corrupt), JSON.stringify(future)]) errors.push(await reject(() => root.services.backupCodec.decode(input)));
      assert(before.digest === (await integration.snapshot()).digest, 'Invalid file changed active data');
      return errors;
    });
    await test('cancelled-preparation-retains-active-dataset', async () => {
      const before = await integration.snapshot(), controller = new AbortController();
      const cmd = await command('cancelled-restore');
      const failure = await reject(() => s.datasetManager.prepare(decoded, { ...cmd, signal: controller.signal, onProgress() { controller.abort(); } }));
      assert(failure === 'AbortError' && before.digest === (await integration.snapshot()).digest, 'Cancellation damaged current data');
      return { failure, preparations: (await s.datasetManager.list()).filter(row => row.state === 'staging').length };
    });
    await test('validated-restoration-switches-atomically-and-invalidates-old-writer', async () => {
      const cmd = await command('restore'), before = await integration.snapshot();
      const prepared = await s.datasetManager.prepare(decoded, cmd);
      const active = await s.datasetManager.activate(prepared, cmd);
      const after = await s.repositories.snapshot();
      const expected = { ...decoded, datasetId: active.datasetId, tables: Object.fromEntries(s.schema.tables.map(name => [name, decoded.tables[name].map(row => ({ ...row, datasetId: active.datasetId }))])) };
      assert(await s.datasetManager.digest(after) === await s.datasetManager.digest(expected), 'Restored data differs');
      const rejected = await reject(() => s.repositories.commit({ ...cmd, operationId: id() }, [{ table: 'contacts', record: { ...contact, revision: 2 }, expectedRevision: 1 }]));
      assert(rejected === 'DatasetChangedError' && (await w.readLease()) === null, 'Old writer survived activation');
      assert((await s.datasetManager.list()).some(row => row.id === before.datasetId && row.state === 'retired'), 'Recovery data was deleted');
      return { before: before.datasetId, after: after.datasetId, rejected };
    });
    await test('unvalidated-target-and-active-cleanup-are-rejected', async () => {
      const active = await w.readActive(), owner = id();
      await w.acquire(owner, active.datasetId, 120000);
      const cmd = { owner, datasetId: active.datasetId, expectedRevision: active.revision, leaseToken: (await w.readLease()).token };
      const target = id(); await w.createStagingDataset(target);
      const invalidActivation = await reject(() => w.activateDataset(cmd, target));
      const invalidCleanup = await reject(() => s.datasetManager.discardStaging(active.datasetId));
      assert(invalidActivation === 'DatasetNotValidatedError' && invalidCleanup === 'DatasetChangedError', 'Unsafe lifecycle action accepted');
      return { invalidActivation, invalidCleanup };
    });
    await test('backup-receipts-and-verified-current-copy-before-replacement', async () => {
      await root.services.context.open(); await root.services.context.takeControl();
      const created = await root.services.backup.create(), backupId = created.container.content.backupId;
      assert((await root.services.backup.list()).find(row => row.backupId === backupId).state === 'generated', 'Generated state missing');
      await root.services.backup.requested(backupId);
      assert((await root.services.backup.list()).find(row => row.backupId === backupId).state === 'requested', 'Requested state missing');
      const capture = await s.repositories.snapshot();
      const beforeVerification = await reject(() => root.services.backup.restore(decoded, { confirmed: true, expectedRevision: capture.globalRevision }));
      assert(beforeVerification === 'VerifiedBackupRequiredError', 'Replacement did not require current verified backup');
      await root.services.backup.verify(created.blob);
      assert((await root.services.backup.list()).find(row => row.backupId === backupId).state === 'verified', 'Reselected copy not verified');
      const restored = await root.services.backup.restore(decoded, { confirmed: true, expectedRevision: capture.globalRevision });
      assert(restored.datasetId !== capture.datasetId, 'Replacement did not use a new dataset');
      return { generated: true, requested: true, verified: true, beforeVerification, restored: true };
    });
    await test('physical-migration-preserves-core-and-aborts-future-logical-schema', async () => {
      const config = root.config;
      async function scenario(future) {
        await s.database.close();
        const name = 'animal-rescue-manager-test-migration-' + id();
        const db = await new Promise((resolve, rejectPromise) => {
          const request = indexedDB.open(name, 1);
          request.onupgradeneeded = () => {
            const db = request.result, meta = db.createObjectStore('meta', { keyPath: 'key' });
            db.createObjectStore('datasets', { keyPath: 'id' }); db.createObjectStore('operations', { keyPath: ['datasetId','id'] });
            meta.put({ key: 'coreSchema', version: future ? 999 : root.config.schemaVersion });
            meta.put({ key: 'sentinel', value: 'conservar ñ' });
          };
          request.onsuccess = () => resolve(request.result); request.onerror = () => rejectPromise(request.error);
        });
        db.close(); root.config = Object.freeze({ ...config, dbName: name });
        let rejected = null;
        try { await s.database.open(); } catch (error) { rejected = error.name; }
        await s.database.close();
        const verify = await new Promise((resolve, rejectPromise) => {
          const request = indexedDB.open(name); request.onsuccess = () => resolve(request.result); request.onerror = () => rejectPromise(request.error);
        });
        const sentinel = await new Promise((resolve, rejectPromise) => {
          const tx = verify.transaction('meta', 'readonly'); let value;
          tx.objectStore('meta').get('sentinel').onsuccess = event => { value = event.target.result; };
          tx.oncomplete = () => resolve(value); tx.onabort = () => rejectPromise(tx.error);
        });
        const evidence = { rejected, physicalVersion: verify.version, stores: verify.objectStoreNames.length, preserved: sentinel.value };
        verify.close(); return evidence;
      }
      let migrated, future;
      try { migrated = await scenario(false); future = await scenario(true); }
      finally { await s.database.close(); root.config = config; await s.database.open(); }
      assert(migrated.physicalVersion === 2 && migrated.preserved === 'conservar ñ' && migrated.stores === s.schema.tables.length + 4, 'Additive migration lost existing metadata');
      assert(future.rejected === 'VersionError' && future.physicalVersion === 1 && future.preserved === 'conservar ñ', 'Future logical schema was modified during upgrade');
      return { migrated, future };
    });
    await test('empty-restored-dataset-accepts-one-guarded-organization-creation', async () => {
      await root.services.context.open(); await root.services.context.takeControl();
      const current = await s.repositories.snapshot();
      const emptyTables = Object.fromEntries(s.schema.tables.map(name => [name, []]));
      const emptyBackup = await root.services.backupCodec.decode((await root.services.backupCodec.encode({ ...current, tables: emptyTables })).text);
      const copy = await root.services.backup.create(); await root.services.backup.verify(copy.blob);
      await root.services.backup.restore(emptyBackup, { confirmed: true, expectedRevision: current.globalRevision });
      const restored = await s.repositories.snapshot();
      assert(restored.datasetId !== current.datasetId && Object.values(restored.tables).every(rows => !rows.length), 'Empty backup was not activated as an empty dataset');
      const input = { name: 'Refugio tras copia vacía', currencyCode: 'JPY', dateFormat: 'iso', timeZone: 'UTC', language: 'en' };
      const stale = await reject(() => root.services.settings.create(input, { expectedRevision: restored.globalRevision - 1, operationId: id() }));
      const cmd = { expectedRevision: restored.globalRevision, operationId: id() };
      await root.services.settings.create(input, cmd);
      const created = await s.repositories.snapshot();
      const replay = await root.services.context.execute('settings.create', input, () => { throw new Error('Replay rebuilt the change set'); }, cmd);
      const second = await reject(() => root.services.settings.create(input, { operationId: id() }));
      const after = await s.repositories.snapshot();
      assert(created.datasetId === restored.datasetId && created.tables.organizationSettings.length === 1 && created.tables.catalogOptions.length > 0 && created.tables.locations.length === 1, 'Organization was not created inside the active empty dataset');
      assert(stale === 'RevisionConflictError' && replay.duplicate && second === 'DatasetChangedError', 'Creation was not guarded, idempotent and single');
      assert(await s.datasetManager.digest(after) === await s.datasetManager.digest(created), 'Rejected creation changed data');
      assert(root.domain.validateDataset(after.tables, { datasetId: after.datasetId }).length === 0, 'Created organization is invalid');
      return { datasetId: created.datasetId, stale, replayed: replay.duplicate, second, catalogOptions: created.tables.catalogOptions.length };
    });
    report.passed = report.checks.every(row => row.passed); report.completedAt = new Date().toISOString(); draw(); return report;
  }
  integration.ready = new URLSearchParams(location.search).has('peer') ? s.database.open() : run();
}());
