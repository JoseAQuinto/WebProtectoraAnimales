(function () {
  'use strict';
  const root = window.RescueManager;
  const format = 'animal-rescue-manager-backup', canonicalization = 'arsm-canonical-json-v1';
  const tableNames = Object.freeze(['organizationSettings', 'catalogOptions', 'locations', 'animals',
    'stayEpisodes', 'weightMeasurements', 'contacts', 'fosterProfiles', 'fosterStays',
    'adoptionApplications', 'reservations', 'adoptions', 'volunteerProfiles', 'volunteerHours',
    'veterinaryRecords', 'carePlans', 'tasks', 'financialMovements', 'donations', 'donationLines',
    'inventoryItems', 'inventoryMovements', 'assets', 'documents', 'documentLinks', 'animalEvents',
    'activityLog', 'importIdentityMap']);
  const maximumRecords = 200000, maximumTableRecords = 100000;
  const dangerous = new Set(['__proto__', 'prototype', 'constructor']);
  function fail(code, path, message) {
    const error = new Error(message || code);
    error.name = code === 'unsupportedVersion' ? 'VersionError' : 'BackupValidationError';
    error.code = code; error.path = path; throw error;
  }
  function integer(value, path) {
    if (!Number.isSafeInteger(value) || value < 0) fail('invalidInteger', path);
  }
  function exactKeys(value, keys, path) {
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
        Object.keys(value).length !== keys.length || !keys.every(key => Object.prototype.hasOwnProperty.call(value, key))) fail('invalidShape', path);
  }
  function cloneRecord(value, omitted) {
    const copy = Object.create(null);
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail('invalidRecord', 'tables');
    if (Object.getOwnPropertySymbols(value).length) fail('invalidRecord', 'tables');
    for (const key of Object.keys(value)) {
      if (dangerous.has(key)) fail('dangerousKey', key);
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) fail('accessor', key);
      if (key !== omitted) copy[key] = descriptor.value;
    }
    return JSON.parse(root.utils.canonicalJson.stringify(copy));
  }
  function sorted(records, table) {
    if (!Array.isArray(records) || records.length > maximumTableRecords) fail('recordLimit', table);
    const ids = new Set();
    for (const record of records) {
      if (!record || !root.utils.ids.isUuidV4(record.id) || ids.has(record.id.toLowerCase())) fail('duplicateOrInvalidId', table);
      ids.add(record.id.toLowerCase());
    }
    return records.slice().sort((first, second) => first.id < second.id ? -1 : first.id > second.id ? 1 : 0);
  }
  function validateDomain(tables, datasetId) {
    if (typeof root.domain.validateDataset !== 'function') throw new Error('Dataset validator unavailable');
    root.domain.validateDataset(tables, { datasetId, allowEmpty: true, throwOnError: true });
  }
  function manifestFor(tables) {
    const recordCounts = {}, assets = tables.assets;
    let total = 0;
    for (const name of tableNames) { recordCounts[name] = tables[name].length; total += tables[name].length; }
    if (total > maximumRecords) fail('recordLimit', 'tables');
    const embeddedAssetBytes = assets.reduce((sum, asset) => sum + asset.byteLength, 0);
    integer(embeddedAssetBytes, 'assets');
    if (embeddedAssetBytes > root.config.limits.embeddedAssetBytes) fail('binaryLimit', 'assets');
    return { recordCounts, embeddedAssetCount: assets.length, embeddedAssetBytes,
      externalReferenceCount: tables.documents.filter(document => document.mode === 'external_reference').length };
  }
  function summaryFor(content) {
    return Object.freeze({ organizationName: content.tables.organizationSettings[0]?.name || '',
      backupId: content.backupId, createdAt: content.createdAt, appVersion: content.appVersion,
      schemaVersion: content.schemaVersion, dataRevision: content.dataRevision,
      recordCounts: Object.freeze({ ...content.manifest.recordCounts }),
      embeddedAssetCount: content.manifest.embeddedAssetCount,
      embeddedAssetBytes: content.manifest.embeddedAssetBytes,
      externalReferenceCount: content.manifest.externalReferenceCount });
  }
  async function checkAsset(asset) {
    if (!(asset.blob instanceof Blob) || !Number.isSafeInteger(asset.byteLength) || asset.byteLength <= 0 || asset.blob.size !== asset.byteLength) fail('assetSize', asset.id);
    const maximum = asset.type === 'embedded_document' ? root.config.limits.documentBytes : 1024 * 1024;
    if (asset.byteLength > maximum) fail('assetSize', asset.id);
    if (!root.utils.integrity.isHash(asset.sha256)) fail('assetHash', asset.id);
    const bytes = new Uint8Array(await asset.blob.arrayBuffer());
    const info = root.utils.files.inspect(bytes, asset.mime);
    root.utils.files.validateName(asset.originalName, asset.mime);
    if (asset.blob.type && asset.blob.type !== asset.mime) fail('assetMime', asset.id);
    if (info.width !== asset.width || info.height !== asset.height) fail('assetDimensions', asset.id);
    if (asset.type !== 'embedded_document' && !info.mime.startsWith('image/')) fail('assetMime', asset.id);
    if (asset.type !== 'embedded_document' && Math.max(info.width, info.height) > (asset.type === 'thumbnail' ? 320 : 1600)) fail('assetDimensions', asset.id);
    if (info.mime.startsWith('image/')) {
      if (root.utils.images) await root.utils.images.verify(asset.blob, info);
      else if (typeof document !== 'undefined') throw new Error('Image decoder validation unavailable');
    }
    if (await root.utils.integrity.sha256(bytes) !== asset.sha256) fail('assetHash', asset.id);
    return bytes;
  }
  async function encode(snapshot) {
    if (!snapshot || !root.utils.ids.isUuidV4(snapshot.datasetId)) fail('invalidDataset', 'datasetId');
    integer(snapshot.dataRevision, 'dataRevision');
    if (!snapshot.tables || Object.keys(snapshot.tables).some(name => !tableNames.includes(name))) fail('unknownTable', 'tables');
    const tables = {}, serializedTables = {}, assets = [];
    for (const name of tableNames) tables[name] = sorted(snapshot.tables[name] || [], name);
    validateDomain(tables, snapshot.datasetId);
    const manifest = manifestFor(tables);
    for (const name of tableNames) {
      if (name === 'assets') continue;
      serializedTables[name] = tables[name].map(record => cloneRecord(record));
    }
    for (const asset of tables.assets) {
      const bytes = await checkAsset(asset), record = cloneRecord(asset, 'blob');
      record.base64 = root.utils.files.encodeBase64(bytes); assets.push(record);
    }
    const content = { appVersion: root.config.appVersion, schemaVersion: root.config.schemaVersion,
      backupId: root.utils.ids.uuidV4(), createdAt: new Date().toISOString(), sourceDatasetId: snapshot.datasetId,
      dataRevision: snapshot.dataRevision, manifest, tables: serializedTables, assets };
    const canonical = root.utils.canonicalJson.stringify(content);
    if (new TextEncoder().encode(canonical).length > root.config.limits.backupBytes) fail('fileLimit', 'content');
    const container = { format, backupFormatVersion: root.config.backupFormatVersion, content,
      integrity: { algorithm: 'SHA-256', canonicalization, contentHash: await root.utils.integrity.sha256(canonical) } };
    const text = root.utils.canonicalJson.stringify(container), blob = new Blob([text], { type: 'application/json' });
    if (blob.size > root.config.limits.backupBytes) fail('fileLimit', 'container');
    // The exact reader used for user-selected files verifies generated backups too.
    const verified = await decode(text);
    return { container, text, blob, summary: verified.summary };
  }
  function parseStrict(text) {
    let cursor = 0;
    function space() { while (/\s/.test(text[cursor] || '') && cursor < text.length) cursor++; }
    function string() {
      const start = cursor++;
      while (cursor < text.length) {
        const character = text[cursor++];
        if (character === '"') return JSON.parse(text.slice(start, cursor));
        if (character === '\\') cursor++;
      }
      fail('invalidJson', 'file');
    }
    function visit(depth) {
      if (depth > 40) fail('depthLimit', 'file');
      space();
      const character = text[cursor];
      if (character === '{') {
        cursor++; space(); const keys = new Set();
        if (text[cursor] === '}') { cursor++; return; }
        while (cursor < text.length) {
          space(); if (text[cursor] !== '"') fail('invalidJson', 'file');
          const key = string();
          if (dangerous.has(key)) fail('dangerousKey', key);
          if (keys.has(key)) fail('duplicateKey', key);
          keys.add(key); space(); if (text[cursor++] !== ':') fail('invalidJson', 'file');
          visit(depth + 1); space();
          const separator = text[cursor++]; if (separator === '}') return;
          if (separator !== ',') fail('invalidJson', 'file');
        }
      } else if (character === '[') {
        cursor++; space(); if (text[cursor] === ']') { cursor++; return; }
        while (cursor < text.length) {
          visit(depth + 1); space(); const separator = text[cursor++];
          if (separator === ']') return; if (separator !== ',') fail('invalidJson', 'file');
        }
      } else if (character === '"') { string(); return; }
      else {
        const start = cursor;
        while (cursor < text.length && !/[\s,\]}]/.test(text[cursor])) cursor++;
        if (cursor > start) { JSON.parse(text.slice(start, cursor)); return; }
      }
      fail('invalidJson', 'file');
    }
    visit(0); space(); if (cursor !== text.length) fail('invalidJson', 'file');
    const parsed = JSON.parse(text);
    root.utils.canonicalJson.stringify(parsed);
    return parsed;
  }
  async function decode(input) {
    let text;
    if (input instanceof Blob) text = await root.utils.files.readText(input, root.config.limits.backupBytes);
    else if (typeof input === 'string') {
      if (input.length > root.config.limits.backupBytes || new TextEncoder().encode(input).length > root.config.limits.backupBytes) fail('fileLimit', 'file');
      text = input;
    } else fail('invalidInput', 'file');
    let container;
    try { container = parseStrict(text); } catch (error) {
      if (error.name === 'BackupValidationError') throw error;
      fail('invalidJson', 'file', error.message);
    }
    exactKeys(container, ['format', 'backupFormatVersion', 'content', 'integrity'], 'container');
    if (container.format !== format) fail('invalidFormat', 'format');
    if (container.backupFormatVersion !== root.config.backupFormatVersion) fail('unsupportedVersion', 'backupFormatVersion');
    const content = container.content;
    exactKeys(content, ['appVersion', 'schemaVersion', 'backupId', 'createdAt', 'sourceDatasetId', 'dataRevision', 'manifest', 'tables', 'assets'], 'content');
    if (content.schemaVersion !== root.config.schemaVersion) fail('unsupportedVersion', 'schemaVersion');
    if (typeof content.appVersion !== 'string' || !/^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/.test(content.appVersion) || content.appVersion.length > 80) fail('invalidVersion', 'appVersion');
    if (!root.utils.ids.isUuidV4(content.backupId) || !root.utils.ids.isUuidV4(content.sourceDatasetId)) fail('invalidId', 'content');
    if (typeof content.createdAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(content.createdAt) ||
        !Number.isFinite(Date.parse(content.createdAt)) || new Date(content.createdAt).toISOString() !== content.createdAt) fail('invalidDate', 'createdAt');
    integer(content.dataRevision, 'dataRevision');
    exactKeys(container.integrity, ['algorithm', 'canonicalization', 'contentHash'], 'integrity');
    if (container.integrity.algorithm !== 'SHA-256' || container.integrity.canonicalization !== canonicalization || !root.utils.integrity.isHash(container.integrity.contentHash)) fail('invalidIntegrity', 'integrity');
    if (await root.utils.integrity.sha256(root.utils.canonicalJson.stringify(content)) !== container.integrity.contentHash) fail('contentHash', 'integrity');
    exactKeys(content.tables, tableNames.filter(name => name !== 'assets'), 'tables');
    const tables = {};
    for (const name of tableNames) if (name !== 'assets') tables[name] = sorted(content.tables[name], name);
    const encodedAssets = sorted(content.assets, 'assets'); tables.assets = [];
    let actualBytes = 0;
    for (const entry of encodedAssets) {
      if (!Object.prototype.hasOwnProperty.call(entry, 'base64') || Object.prototype.hasOwnProperty.call(entry, 'blob')) fail('assetShape', entry.id);
      const length = root.utils.files.decodedLength(entry.base64);
      actualBytes += length;
      if (!length || length !== entry.byteLength || actualBytes > root.config.limits.embeddedAssetBytes) fail('assetSize', entry.id);
      const maximum = entry.type === 'embedded_document' ? root.config.limits.documentBytes : 1024 * 1024;
      const bytes = root.utils.files.decodeBase64(entry.base64, maximum), record = cloneRecord(entry, 'base64');
      record.blob = new Blob([bytes], { type: record.mime });
      await checkAsset(record); tables.assets.push(record);
    }
    const expectedManifest = manifestFor(tables);
    exactKeys(content.manifest, ['recordCounts', 'embeddedAssetCount', 'embeddedAssetBytes', 'externalReferenceCount'], 'manifest');
    exactKeys(content.manifest.recordCounts, tableNames, 'manifest.recordCounts');
    if (root.utils.canonicalJson.stringify(content.manifest) !== root.utils.canonicalJson.stringify(expectedManifest)) fail('manifestMismatch', 'manifest');
    validateDomain(tables, content.sourceDatasetId);
    return { datasetId: content.sourceDatasetId, dataRevision: content.dataRevision, tables,
      backup: { backupId: content.backupId, createdAt: content.createdAt, appVersion: content.appVersion, schemaVersion: content.schemaVersion },
      summary: summaryFor(content) };
  }
  root.services.backupCodec = Object.freeze({ encode, decode, tableNames, maximumRecords, maximumTableRecords, parseStrict });
}());
