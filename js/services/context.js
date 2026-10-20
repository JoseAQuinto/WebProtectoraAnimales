(function () {
  'use strict';
  const root = window.RescueManager, s = root.storage, w = s.writeCoordinator;
  const owner = root.utils.ids.uuidV4();
  let active = null, lease = null, blockedUntil = null;
  function fail(name, message) { throw s.error(name, message); }
  function freeze(value) { if (value && typeof value === 'object' && !Object.isFrozen(value) && !(value instanceof Blob)) { Object.freeze(value); Object.values(value).forEach(freeze); } return value; }
  const ttl = () => root.config.leaseMs;
  async function claim() {
    lease = null; blockedUntil = null;
    if (!active) return;
    if (await w.acquire(owner, active.datasetId, ttl())) { lease = await w.readLease(); return; }
    blockedUntil = (await w.readLease())?.expiresAt ?? null;
  }
  async function open() {
    await s.database.open(); active = await w.readActive(); await claim();
    return status();
  }
  // A reload or crash leaves the old lease until it expires (pagehide writes do not commit in Chrome);
  // a live controlling tab keeps renewing, so its lease is never taken here.
  async function retry() {
    if (lease && lease.expiresAt > Date.now()) return status();
    active = await w.readActive(); await claim();
    return status();
  }
  function status() {
    return { active, canWrite: !!lease && lease.expiresAt > Date.now(), owner, blockedUntil,
      datasetId: active?.datasetId || null, leaseToken: lease?.token || null };
  }
  async function renew() {
    if (!lease || !active) return false;
    try { lease = await w.renew({ owner, datasetId: active.datasetId, leaseToken: lease.token }, ttl()); return true; }
    catch (error) { lease = null; throw error; }
  }
  async function takeControl() {
    active = await w.readActive();
    if (!active) fail('DatasetChangedError', 'No organization is active');
    lease = await w.takeControl({ owner, datasetId: active.datasetId, expectedRevision: active.revision }, ttl());
    return status();
  }
  async function snapshot() {
    const value = await s.repositories.snapshot();
    if (!value) return null;
    if (active && active.datasetId !== value.datasetId) lease = null;
    active = { key: 'active', datasetId: value.datasetId, revision: value.globalRevision };
    return value;
  }
  function options(capture) {
    if (!lease || !active || capture.datasetId !== active.datasetId) fail('LeaseLostError', 'This tab is read only');
    return { owner, datasetId: capture.datasetId, expectedRevision: capture.globalRevision, leaseToken: lease.token };
  }
  async function execute(type, intent, build, command = {}) {
    const capture = await snapshot();
    if (!capture) fail('DatasetChangedError', 'Create or restore an organization first');
    // Builders read the capture without modifying it; freezing turns an accidental mutation into a
    // failed operation, so the repository can safely validate this same capture instead of re-reading it.
    freeze(capture.tables);
    const config = options(capture), operationId = command.operationId || root.utils.ids.uuidV4();
    const fingerprint = await root.utils.integrity.sha256(root.utils.canonicalJson.stringify({ type, intent }));
    const prepared = { ...config, operationId, fingerprint };
    const replay = await w.replay(prepared);
    if (replay) return replay;
    if (command.expectedRevision !== undefined && command.expectedRevision !== capture.globalRevision) fail('RevisionConflictError', 'The form was opened before another change');
    const now = new Date().toISOString();
    const today = root.utils.dates.today(capture.tables.organizationSettings[0]?.timeZone || 'UTC');
    let sequence = null;
    const helpers = {
      now, operationId, today, datasetId: capture.datasetId,
      find(table, id) { const value = capture.tables[table].find(row => row.id === id); if (!value) fail('RecordNotFoundError', 'The record no longer exists'); return value; },
      create(table, input) {
        return root.domain.createRecord(table, input, { datasetId: capture.datasetId, now, today });
      },
      edit(table, previous, patch) {
        if (previous.revision === Number.MAX_SAFE_INTEGER) fail('RevisionOverflowError', 'Record revision cannot be incremented');
        return root.domain.createRecord(table, { ...previous, ...patch, id: previous.id, datasetId: previous.datasetId,
          createdAt: previous.createdAt, updatedAt: now, revision: previous.revision + 1 }, { datasetId: capture.datasetId, now, today });
      },
      insert(table, record) { return { table, record, expectedRevision: null }; },
      replace(table, record) { return { table, record, expectedRevision: record.revision - 1 }; },
      fail
    };
    helpers.allocateAnimalCode = () => {
      let maximum = sequence?.next ?? capture.animalSequence;
      for (const code of [...capture.tables.animals.map(row => row.code), ...capture.tables.activityLog.map(row => row.summaryParameters.code)]) {
        const match = /^A-(\d+)$/.exec(code || '');
        if (match) { const number = Number(match[1]); if (!Number.isSafeInteger(number)) fail('RevisionOverflowError', 'Animal code sequence is too large'); maximum = Math.max(maximum, number); }
      }
      if (maximum === Number.MAX_SAFE_INTEGER) fail('RevisionOverflowError', 'Animal code sequence is exhausted');
      sequence = { expected: capture.animalSequence, next: maximum + 1 };
      return 'A-' + String(sequence.next).padStart(6, '0');
    };
    const changeSet = await build(capture.tables, helpers);
    if (!changeSet || !Array.isArray(changeSet.changes)) fail('InvalidInputError', 'Service did not prepare a change set');
    const result = await s.repositories.commit({ ...prepared, animalSequence: sequence }, changeSet.changes, changeSet.result ?? null, capture);
    active = { key: 'active', datasetId: capture.datasetId, revision: result.activeRevision };
    return result;
  }
  root.services.context = Object.freeze({ open, status, renew, retry, takeControl, snapshot, options, execute });
}());
