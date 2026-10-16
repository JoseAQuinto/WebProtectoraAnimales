(function (root) {
  'use strict';
  const c = root.services.context, files = root.utils.files;
  const metadata = ['title', 'typeId', 'date', 'notes'];
  const external = ['externalFileName', 'externalLocation', 'externalFileType', 'originalSha256'];
  function fail(name, message) { const error = new Error(message); error.name = name; throw error; }
  function only(input, allowed, h) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !allowed.includes(key))) h.fail('InvalidInputError', 'Unexpected document input');
  }
  function editable(h, row) {
    if (row.deletedAt || row.archivedAt) h.fail('InvalidStateError', 'Restore the record before editing it');
    return row;
  }
  function log(h, operation, id, parameters = {}) {
    return h.insert('activityLog', h.create('activityLog', { operation, occurredAt: h.now, operationId: h.operationId,
      target: { type: 'document', id }, summaryParameters: parameters }));
  }
  function category(h, id) {
    const option = editable(h, h.find('catalogOptions', id));
    if (!option.active || option.kind !== 'document_type') h.fail('InvalidInputError', 'Select an active document type');
  }
  // Binary processing and hashing happen before context.execute starts preparing its write.
  // Fingerprints contain bytes' identity and metadata, never Blob or a temporary URL.
  function identity(prepared) {
    return { originalName: prepared.originalName, mime: prepared.mime, byteLength: prepared.byteLength,
      sha256: prepared.sha256, width: prepared.width, height: prepared.height };
  }
  function budget(data, additional) {
    const used = data.assets.reduce((sum, row) => sum + row.byteLength, 0);
    if (!Number.isSafeInteger(additional) || additional < 0 || used + additional > root.config.limits.embeddedAssetBytes) fail('AssetBudgetError', 'The dataset would exceed its 64 MiB embedded file limit');
    return { used, additional, remaining: root.config.limits.embeddedAssetBytes - used - additional };
  }
  function asset(h, prepared, type, derivedFromAssetId = null) {
    return h.create('assets', { ...identity(prepared), blob: prepared.blob, type, derivedFromAssetId });
  }
  async function validateAsset(row) {
    root.domain.validateRecord('assets', row, { datasetId: row.datasetId, throwOnError: true });
    const bytes = new Uint8Array(await row.blob.arrayBuffer()), info = files.inspect(bytes, row.mime);
    files.validateName(row.originalName, row.mime);
    if (bytes.length !== row.byteLength || info.width !== row.width || info.height !== row.height ||
        await root.utils.integrity.sha256(bytes) !== row.sha256) fail('AssetIntegrityError', 'The stored file does not match its size, dimensions or hash');
    if (info.mime.startsWith('image/')) await root.utils.images.verify(row.blob, info);
    return { blob: row.blob, fileName: row.originalName, mime: row.mime, byteLength: row.byteLength,
      sha256: row.sha256, width: row.width, height: row.height, type: row.type, id: row.id };
  }
  async function readAsset(id) {
    const snapshot = await c.snapshot(), row = snapshot?.tables.assets.find(value => value.id === id);
    if (!row) fail('RecordNotFoundError', 'The file no longer exists in the active dataset');
    return validateAsset(row);
  }
  // Shared with photos.js; these helpers cannot save without the context's transaction guards.
  root.services.assetFiles = Object.freeze({ identity, budget, asset, validateAsset, readAsset });
  function target(h, link) {
    only(link, ['entityType', 'entityId'], h);
    if (!root.domain.enums.documentEntityType.includes(link.entityType)) h.fail('InvalidInputError', 'Select a supported document relation');
    const row = editable(h, h.find(root.domain.entityTables[link.entityType], link.entityId));
    if (row.datasetId !== h.datasetId || row.mergedIntoContactId) h.fail('InvalidInputError', 'Select a record in the active dataset');
    return row;
  }
  function events(h, changes, document, links) {
    const animals = new Set();
    links.forEach(link => {
      const row = h.find(root.domain.entityTables[link.entityType], link.entityId);
      if (link.entityType === 'animal') animals.add(row.id);
      else if (['adoption', 'veterinary_record'].includes(link.entityType)) animals.add(row.animalId);
    });
    animals.forEach(animalId => changes.push(h.insert('animalEvents', h.create('animalEvents', {
      animalId, type: 'document', eventDate: document.date, recordedAt: h.now,
      source: { type: 'document', id: document.id }, originKey: h.operationId + '/document/' + animalId, parameters: {}
    }))));
  }
  function addLinks(data, h, changes, document, links = []) {
    if (!Array.isArray(links) || links.length > 1000) h.fail('InvalidInputError', 'Document relations must be a bounded list');
    const seen = new Set();
    links.forEach(link => {
      target(h, link);
      const key = link.entityType + '/' + link.entityId;
      if (seen.has(key)) h.fail('InvalidInputError', 'A document relation was selected twice');
      seen.add(key);
      const previous = data.documentLinks.find(row => row.documentId === document.id && row.entityType === link.entityType && row.entityId === link.entityId);
      if (previous && !previous.deletedAt) h.fail('InvalidStateError', 'The document is already linked to this record');
      changes.push(previous ? h.replace('documentLinks', h.edit('documentLinks', previous, { deletedAt: null, archivedAt: null })) :
        h.insert('documentLinks', h.create('documentLinks', { documentId: document.id, ...link })));
    });
    events(h, changes, document, links);
  }
  async function createEmbedded(input, file, command) {
    const prepared = await files.prepareDocument(file);
    return c.execute('documents.createEmbedded', { input, file: identity(prepared) }, (data, h) => {
      only(input, [...metadata, 'links'], h); category(h, input.typeId); budget(data, prepared.byteLength);
      const resource = asset(h, prepared, 'embedded_document'), { links, ...values } = input;
      const document = h.create('documents', { ...values, mode: 'embedded', assetId: resource.id });
      const changes = [h.insert('assets', resource), h.insert('documents', document), log(h, 'create', document.id)];
      addLinks(data, h, changes, document, links);
      return { changes, result: { id: document.id, assetId: resource.id } };
    }, command);
  }
  function createExternal(input, command) {
    return c.execute('documents.createExternal', input, (data, h) => {
      only(input, [...metadata, ...external, 'links'], h); category(h, input.typeId);
      const { links, ...values } = input, document = h.create('documents', { ...values, mode: 'external_reference' });
      const changes = [h.insert('documents', document), log(h, 'create', document.id)];
      addLinks(data, h, changes, document, links);
      return { changes, result: { id: document.id } };
    }, command);
  }
  function update(id, patch, command) {
    return c.execute('documents.update', { id, patch }, (data, h) => {
      const previous = editable(h, h.find('documents', id));
      only(patch, previous.mode === 'embedded' ? metadata : [...metadata, ...external], h);
      if (patch.typeId !== undefined && patch.typeId !== previous.typeId) category(h, patch.typeId);
      return { changes: [h.replace('documents', h.edit('documents', previous, patch)), log(h, 'update', id)], result: { id } };
    }, command);
  }
  function link(documentId, relation, command) {
    return c.execute('documents.link', { documentId, relation }, (data, h) => {
      const document = editable(h, h.find('documents', documentId)), changes = [];
      addLinks(data, h, changes, document, [relation]);
      changes.push(log(h, 'update', documentId, { field: 'links' }));
      return { changes, result: { id: documentId } };
    }, command);
  }
  function unlink(id, command) {
    return c.execute('documents.unlink', { id }, (data, h) => {
      const row = editable(h, h.find('documentLinks', id)); editable(h, h.find('documents', row.documentId));
      return { changes: [h.replace('documentLinks', h.edit('documentLinks', row, { deletedAt: h.now })),
        log(h, 'update', row.documentId, { field: 'links' })], result: { id: row.documentId, linkId: id } };
    }, command);
  }
  function state(method, operation, field, enabled) {
    return (id, command) => c.execute('documents.' + method, { id }, (data, h) => {
      const previous = h.find('documents', id);
      if (!!previous[field] === enabled || (field === 'archivedAt' && previous.deletedAt)) h.fail('InvalidStateError', 'The document is not in the required state');
      return { changes: [h.replace('documents', h.edit('documents', previous, { [field]: enabled ? h.now : null })),
        log(h, operation, id)], result: { id } };
    }, command);
  }
  function list(tables, filters = {}) {
    const query = typeof filters.search === 'string' && filters.search.trim() ? root.utils.strings.normalizeSearch(filters.search) : null;
    const linked = filters.entityType && filters.entityId ? new Set(tables.documentLinks.filter(row => !row.deletedAt && !row.archivedAt &&
      row.entityType === filters.entityType && row.entityId === filters.entityId).map(row => row.documentId)) : null;
    return tables.documents.filter(row => (filters.trash ? !!row.deletedAt : !row.deletedAt) &&
      (filters.includeArchived || filters.trash || !row.archivedAt) && (!filters.mode || row.mode === filters.mode) &&
      (!filters.typeId || row.typeId === filters.typeId) && (!linked || linked.has(row.id)) &&
      (!query || root.utils.strings.normalizeSearch(row.title + ' ' + row.notes + ' ' + (row.externalFileName || '')).includes(query)))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
  }
  async function download(id) {
    const snapshot = await c.snapshot(), document = snapshot?.tables.documents.find(row => row.id === id);
    if (!document) fail('RecordNotFoundError', 'The document no longer exists in the active dataset');
    if (document.mode !== 'embedded') fail('ExternalReferenceError', 'This file is outside the application and is not included in backups');
    const row = snapshot.tables.assets.find(value => value.id === document.assetId);
    if (!row || row.type !== 'embedded_document') fail('AssetIntegrityError', 'The document has no valid embedded file');
    return validateAsset(row);
  }
  async function compareExternal(id, file) {
    const snapshot = await c.snapshot(), document = snapshot?.tables.documents.find(row => row.id === id);
    if (!document || document.mode !== 'external_reference') fail('InvalidInputError', 'Select an external file reference');
    if (!(file instanceof Blob) || !file.size || file.size > root.config.limits.backupBytes) throw new RangeError('External hash comparison is limited to 128 MiB');
    const sha256 = await root.utils.integrity.sha256(new Uint8Array(await file.arrayBuffer()));
    return { sha256, expectedSha256: document.originalSha256, matches: document.originalSha256 ? sha256 === document.originalSha256 : null };
  }
  root.services.documents = Object.freeze({ createEmbedded, createExternal, update, link, unlink, list, download, compareExternal,
    archive: state('archive', 'archive', 'archivedAt', true), unarchive: state('unarchive', 'restore', 'archivedAt', false),
    trash: state('trash', 'trash', 'deletedAt', true), restore: state('restore', 'restore', 'deletedAt', false) });
}(window.RescueManager));
