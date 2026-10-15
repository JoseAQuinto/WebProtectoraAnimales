(function () {
  'use strict';
  const root = window.RescueManager, s = root.storage;
  const run = (...args) => s.transactions.run(...args);
  async function receipt(backupId) {
    return run(['backupReceipts'], 'readonly', (tx, api) => api.request(tx.objectStore('backupReceipts').get(backupId), value => api.setResult(value || null)));
  }
  function saveReceipt(value) { return run(['backupReceipts'], 'readwrite', tx => tx.objectStore('backupReceipts').put(value)); }
  async function create() {
    const snapshot = await root.services.context.snapshot();
    if (!snapshot) throw s.error('DatasetChangedError', 'There is no active organization to back up');
    const encoded = await root.services.backupCodec.encode(snapshot);
    await saveReceipt({ backupId: encoded.container.content.backupId, datasetId: snapshot.datasetId,
      dataRevision: snapshot.dataRevision, contentHash: encoded.container.integrity.contentHash,
      state: 'generated', generatedAt: new Date().toISOString(), requestedAt: null, verifiedAt: null });
    return encoded;
  }
  async function requested(backupId) {
    const value = await receipt(backupId);
    if (!value) throw s.error('InvalidInputError', 'Unknown generated backup');
    await saveReceipt({ ...value, state: value.verifiedAt ? 'verified' : 'requested', requestedAt: new Date().toISOString() });
  }
  async function verify(file) {
    const decoded = await root.services.backupCodec.decode(file);
    const old = await receipt(decoded.backup.backupId);
    // A reselected, fully validated generated file may prove a receipt; no disk-save claim is made.
    if (old && old.datasetId === decoded.datasetId && old.dataRevision === decoded.dataRevision) {
      const current = await s.repositories.snapshot(old.datasetId);
      const matches = current && current.dataRevision === decoded.dataRevision && await s.datasetManager.digest(current) === await s.datasetManager.digest(decoded);
      if (matches) await saveReceipt({ ...old, state: 'verified', verifiedAt: new Date().toISOString() });
    }
    return decoded;
  }
  async function list() {
    const active = await s.writeCoordinator.readActive();
    if (!active) return [];
    return run(['backupReceipts'], 'readonly', (tx, api) => api.request(tx.objectStore('backupReceipts').index('byDataset').getAll(active.datasetId), values => api.setResult(values.sort((a,b) => b.generatedAt.localeCompare(a.generatedAt)))));
  }
  async function restore(source, command = {}) {
    if (command.confirmed !== true) throw s.error('ConfirmationRequiredError', 'Confirm the replacement after reviewing the summary');
    const current = await root.services.context.snapshot();
    let options = {};
    if (current) {
      options = root.services.context.options(current);
      if (command.expectedRevision !== current.globalRevision) throw s.error('RevisionConflictError', 'Data changed since the restore summary');
      const receipts = await list();
      if (!receipts.some(item => item.state === 'verified' && item.dataRevision === current.dataRevision)) throw s.error('VerifiedBackupRequiredError', 'Create and verify a backup of the current data first');
    }
    const prepared = await s.datasetManager.prepare(source, { ...options, signal: command.signal, onProgress: command.onProgress });
    if (command.signal?.aborted) throw s.error('AbortError', 'Restoration cancelled before activation');
    const result = await s.datasetManager.activate(prepared, options);
    await root.services.context.open();
    return result;
  }
  async function recover(datasetId, command) {
    const source = await s.repositories.snapshot(datasetId);
    if (!source || source.dataset.state !== 'retired') throw s.error('InvalidInputError', 'Choose an available recovery dataset');
    return restore(source, command);
  }
  root.services.backup = Object.freeze({ create, requested, verify, list, restore, recover });
}());
