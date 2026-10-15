(function (root) {
  'use strict';
  const d = root.domain;
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const present = value => value !== null && value !== undefined;
  const forbidden = new Set(['__proto__', 'constructor', 'prototype']);
  class ValidationError extends Error {
    constructor(details) { super('Domain validation failed'); this.name = 'ValidationError'; this.details = details; }
  }
  function issue(table, record, path, code, message) {
    const descriptor = record && typeof record === 'object' ? Object.getOwnPropertyDescriptor(record, 'id') : null;
    return { table, id: descriptor && typeof descriptor.value === 'string' ? descriptor.value : null, path, code, message };
  }
  function finish(issues, options) {
    if (issues.length && options.throwOnError) throw new ValidationError(issues);
    return issues;
  }
  function appendIssue(issues, error) {
    if (issues.length >= 1000) return;
    issues.push(issues.length === 999 ? issue(error.table, null, '', 'validation.moreErrors', 'validation.moreErrors') : error);
  }
  function unicode(value) {
    for (let index = 0; index < value.length; index++) {
      const code = value.charCodeAt(index);
      if (code >= 0xd800 && code <= 0xdbff) {
        const next = value.charCodeAt(++index);
        if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      } else if (code >= 0xdc00 && code <= 0xdfff) return false;
    }
    return true;
  }
  // Inspect descriptors before reading a value: imported accessors must never execute.
  function inspect(value, table, errors, path = '', options = {}) {
    const ancestors = new Set(); let nodes = 0;
    function fail(at, code) { appendIssue(errors, issue(table, null, at, code, code)); }
    function visit(item, at, depth) {
      if (errors.length >= 1000) return;
      if (++nodes > (options.maxNodes || 500000)) { if (nodes === (options.maxNodes || 500000) + 1) fail(at, 'structure.limit'); return; }
      if (depth > 20) { fail(at, 'structure.depth'); return; }
      if (item === null || typeof item === 'boolean') return;
      if (typeof item === 'string') { if (!unicode(item)) fail(at, 'text.unicode'); if (item.length > 20000) fail(at, 'text.length'); return; }
      if (typeof item === 'number') { if (!Number.isFinite(item) || !Number.isSafeInteger(item)) fail(at, 'number.unsafe'); return; }
      if (typeof item !== 'object') { fail(at, 'structure.type'); return; }
      if (typeof Blob !== 'undefined' && item instanceof Blob) return;
      if (ancestors.has(item)) { fail(at, 'structure.cycle'); return; }
      const prototype = Object.getPrototypeOf(item);
      if (!Array.isArray(item) && prototype !== null && Object.getPrototypeOf(prototype) !== null) { fail(at, 'structure.prototype'); return; }
      if (Object.getOwnPropertySymbols(item).length) fail(at, 'structure.symbol');
      const keys = Object.getOwnPropertyNames(item);
      if (Array.isArray(item) && (item.length > (options.maxArrayItems || 100000) || keys.length !== item.length + 1)) { fail(at, 'array.shape'); return; }
      ancestors.add(item);
      for (const key of keys) {
        if (Array.isArray(item) && key === 'length') continue;
        const next = at ? at + '.' + key : key;
        if (forbidden.has(key) || !unicode(key)) { fail(next, 'structure.key'); continue; }
        const descriptor = Object.getOwnPropertyDescriptor(item, key);
        if (!own(descriptor, 'value') || !descriptor.enumerable) { fail(next, 'structure.accessor'); continue; }
        visit(descriptor.value, next, depth + 1);
      }
      ancestors.delete(item);
    }
    visit(value, path, 0);
  }
  function today(options) {
    if (present(options.today)) {
      if (!root.utils.dates.isValid(options.today)) throw new TypeError('options.today must be a calendar date');
      return options.today;
    }
    return root.utils.dates.today(options.timeZone || 'UTC', options.now === undefined ? Date.now() : options.now);
  }
  function validateFields(fields, record, table, errors, options, prefix = '', owner = record) {
    const add = (path, code) => appendIssue(errors, issue(table, owner, path, code, code));
    Object.keys(record).forEach(key => { if (!own(fields, key)) add(prefix + key, 'field.unknown'); });
    for (const [key, field] of Object.entries(fields)) {
      const path = prefix + key;
      if (!own(record, key)) { if (field.required) add(path, 'field.required'); continue; }
      validateValue(field, record[key], path);
    }
    function validateValue(field, value, path) {
      if (value === null) { if (!field.nullable) add(path, 'field.null'); return; }
      let valid = true;
      switch (field.type) {
        case 'string': valid = typeof value === 'string'; break;
        case 'uuid': valid = root.utils.ids.isUuidV4(value); break;
        case 'sha256': valid = typeof value === 'string' && /^[a-f0-9]{64}$/.test(value); break;
        case 'integer': valid = Number.isSafeInteger(value) && value >= field.min && value <= field.max && (!field.nonzero || value !== 0); break;
        case 'boolean': valid = typeof value === 'boolean'; break;
        case 'enum': valid = field.values.includes(value); break;
        case 'date': valid = root.utils.dates.isValid(value); break;
        case 'instant': valid = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?Z$/.test(value) &&
          root.utils.dates.isValid(value.slice(0, 10)) && Number.isFinite(Date.parse(value)); break;
        case 'localTime': valid = typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value); break;
        case 'timeZone':
          valid = typeof value === 'string' && value.length > 0 && value.length <= 100 && !/^[+-]/.test(value);
          if (valid) { try { new Intl.DateTimeFormat('en', { timeZone: value }); } catch (_) { valid = false; } } break;
        case 'email': valid = typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); break;
        case 'phone':
          valid = typeof value === 'string' && value.length > 0 && value.length <= 50;
          if (valid) { try { valid = Boolean(root.utils.strings.normalizePhone(value)); } catch (_) { valid = false; } } break;
        case 'blob': valid = typeof Blob !== 'undefined' && value instanceof Blob; break;
        case 'object': valid = value !== null && typeof value === 'object' && !Array.isArray(value); break;
        case 'array': valid = Array.isArray(value); break;
        default: throw new Error('Unknown schema type: ' + field.type);
      }
      if (!valid) { add(path, 'value.' + field.type); return; }
      if (typeof value === 'string' && ((field.minLength !== undefined && value.length < field.minLength) ||
        (field.maxLength !== undefined && value.length > field.maxLength) || (field.trimmed && value !== value.trim()))) add(path, 'text.lengthOrWhitespace');
      if (field.type === 'date' && field.nonFuture && value > options.today) add(path, 'date.future');
      if (field.type === 'object') {
        validateFields(field.fields, value, table, errors, options, path + '.', owner);
        if (field.maxSerializedLength && JSON.stringify(value).length > field.maxSerializedLength) add(path, 'text.length');
      }
      if (field.type === 'array') {
        if (value.length > field.maxItems) add(path, 'array.limit');
        const seen = new Set();
        value.forEach((item, index) => {
          validateValue(field.items, item, path + '.' + index);
          const signature = root.utils.canonicalJson.stringify(item);
          if (field.unique && seen.has(signature)) add(path + '.' + index, 'array.duplicate');
          seen.add(signature);
        });
      }
    }
  }
  function localRules(table, record, errors) {
    const r = record;
    const add = (path, code) => appendIssue(errors, issue(table, r, path, code, code));
    const requireIf = (condition, field) => { if (condition && !present(r[field])) add(field, 'field.requiredForState'); };
    const absentIf = (condition, fields) => fields.forEach(field => { if (condition && present(r[field])) add(field, 'field.forbiddenForState'); });
    const order = (start, end) => { if (present(r[start]) && present(r[end]) && r[end] < r[start]) add(end, 'date.order'); };
    if (r.origin !== 'real') requireIf(true, 'originBatchId');
    if (Date.parse(r.updatedAt) < Date.parse(r.createdAt)) add('updatedAt', 'instant.order');
    for (const field of ['archivedAt', 'deletedAt']) if (present(r[field]) && Date.parse(r[field]) < Date.parse(r.createdAt)) add(field, 'instant.order');
    const schema = d.schemas[table];
    if (!schema.allowArchive && present(r.archivedAt)) add('archivedAt', 'state.archiveForbidden');
    if (!schema.allowTrash && present(r.deletedAt)) add('deletedAt', 'state.trashForbidden');
    if (table === 'catalogOptions') {
      if (present(r.labelKey) === present(r.customLabel)) add('customLabel', 'catalog.oneLabel');
      if (r.isSystem !== present(r.labelKey)) add('isSystem', 'catalog.labelSource');
    }
    if (table === 'animals') {
      if (r.birthPrecision === 'exact') { requireIf(true, 'birthDate'); absentIf(true, ['estimatedAgeMonths', 'estimatedAgeReferenceDate']); }
      if (r.birthPrecision === 'unknown') absentIf(true, ['birthDate', 'estimatedAgeMonths', 'estimatedAgeReferenceDate']);
      if (r.birthPrecision === 'estimated' && !((present(r.birthDate) && !present(r.estimatedAgeMonths) && !present(r.estimatedAgeReferenceDate)) ||
        (!present(r.birthDate) && present(r.estimatedAgeMonths) && present(r.estimatedAgeReferenceDate)))) add('birthDate', 'animal.birthEstimate');
      absentIf(r.sterilizationStatus !== 'yes', ['sterilizationDate']); order('birthDate', 'sterilizationDate'); order('birthDate', 'deceasedOn');
      requireIf(r.managementStatus === 'deceased', 'deceasedOn'); absentIf(r.managementStatus !== 'deceased', ['deceasedOn']);
      if (r.managementStatus !== 'under_care') { absentIf(true, ['locationKind', 'locationId', 'externalLocationDescription']); if (r.adoptionAvailability !== 'unavailable') add('adoptionAvailability', 'animal.notUnderCare'); }
      else { requireIf(true, 'locationKind'); requireIf(r.locationKind === 'shelter', 'locationId'); requireIf(r.locationKind === 'temporary_external', 'externalLocationDescription'); }
      absentIf(r.locationKind !== 'shelter', ['locationId']); absentIf(r.locationKind !== 'temporary_external', ['externalLocationDescription']);
      const normalized = present(r.microchipOriginal) ? root.utils.strings.normalizeMicrochip(r.microchipOriginal) : null;
      if ((r.microchipNormalized || null) !== normalized || normalized === '') add('microchipNormalized', 'normalization.mismatch');
    }
    if (table === 'contacts') {
      if ((r.emailNormalized || null) !== (r.email ? root.utils.strings.normalizeEmail(r.email) : null)) add('emailNormalized', 'normalization.mismatch');
      r.phones.forEach((phone, index) => { if (phone.normalized !== root.utils.strings.normalizePhone(phone.original)) add('phones.' + index + '.normalized', 'normalization.mismatch'); });
      if (new Set(r.phones.map(phone => phone.normalized)).size !== r.phones.length) add('phones', 'array.duplicate');
    }
    if (table === 'stayEpisodes') {
      order('entryDate', 'exitDate');
      if (present(r.exitDate) !== present(r.exitReason)) add('exitReason', 'episode.exitPair');
      requireIf(r.exitReason === 'adoption', 'adoptionId'); absentIf(r.exitReason !== 'adoption', ['adoptionId']);
      requireIf(r.entryType === 'return', 'returnedFromAdoptionId'); absentIf(r.entryType !== 'return', ['returnedFromAdoptionId']);
    }
    if (table === 'fosterStays') { order('startDate', 'endDate'); requireIf(present(r.endDate), 'endReason'); absentIf(!present(r.endDate), ['endReason']); }
    if (table === 'adoptionApplications') {
      order('applicationDate', 'approvalDate'); requireIf(['approved', 'completed'].includes(r.status), 'approvalDate');
      requireIf(['rejected', 'cancelled'].includes(r.status), 'closureReason');
      absentIf(['pending', 'under_review'].includes(r.status), ['approvalDate']); absentIf(!['rejected', 'cancelled'].includes(r.status), ['closureReason']);
    }
    if (table === 'reservations') {
      order('reservationDate', 'expiresOn'); order('reservationDate', 'closedOn');
      ['closedOn', 'closureReason'].forEach(field => requireIf(r.status !== 'active', field));
      absentIf(r.status === 'active', ['closedOn', 'closureReason']);
      if (r.status === 'expired' && (!r.expiresOn || r.closedOn <= r.expiresOn)) add('closedOn', 'reservation.expiryInclusive');
    }
    if (table === 'adoptions') { order('adoptionDate', 'returnDate'); requireIf(present(r.returnDate), 'returnReason'); absentIf(!present(r.returnDate), ['returnReason']); }
    if (table === 'veterinaryRecords') {
      absentIf(!['disease', 'allergy'].includes(r.type), ['conditionActive', 'resolvedOn']);
      if (present(r.resolvedOn) && r.conditionActive !== false) add('resolvedOn', 'health.notResolved'); order('date', 'resolvedOn');
    }
    if (table === 'carePlans') order('startDate', 'plannedEndDate');
    if (table === 'tasks') {
      if (present(r.dueLocalTime) !== present(r.timeZone)) add('timeZone', 'task.timeZonePair');
      requireIf(r.status === 'completed', 'completedOn'); absentIf(r.status !== 'completed', ['completedOn']);
      ['cancelledOn', 'cancellationReason'].forEach(field => requireIf(r.status === 'cancelled', field));
      absentIf(r.status !== 'cancelled', ['cancelledOn', 'cancellationReason']); requireIf(present(r.source), 'originKey');
    }
    if (table === 'financialMovements') {
      ['voidReason', 'voidedOn'].forEach(field => requireIf(r.status === 'voided', field));
      absentIf(r.status === 'posted', ['voidReason', 'voidedOn', 'replacementMovementId']); requireIf(present(r.source), 'originKey'); order('date', 'voidedOn');
    }
    if (table === 'donations') { requireIf(r.type === 'monetary', 'financialMovementId'); absentIf(r.type === 'material', ['financialMovementId']); requireIf(r.status === 'voided', 'voidReason'); absentIf(r.status === 'recorded', ['voidReason']); }
    if (table === 'inventoryItems' && ((r.status === 'archived') !== present(r.archivedAt))) add('archivedAt', 'inventory.archiveState');
    if (table === 'inventoryMovements') {
      if (['opening_balance', 'purchase', 'donation'].includes(r.type) && r.deltaScaled < 0) add('deltaScaled', 'inventory.direction');
      if (r.type === 'consumption' && r.deltaScaled > 0) add('deltaScaled', 'inventory.direction');
      requireIf(r.type === 'donation', 'donationLineId'); requireIf(present(r.donationLineId), 'originKey');
      absentIf(r.type !== 'donation', ['donationLineId']);
    }
    if (table === 'assets') {
      if (r.blob.size !== r.byteLength || r.blob.type !== r.mime) add('blob', 'asset.metadataMismatch');
      const image = r.mime.startsWith('image/');
      requireIf(image, 'width'); requireIf(image, 'height'); absentIf(!image, ['width', 'height']);
      if (r.type !== 'embedded_document' && !image) add('mime', 'asset.imageRequired');
      if (image && r.width * r.height > 40000000) add('width', 'asset.pixelLimit');
      const limit = r.type === 'thumbnail' ? 320 : 1600;
      if (r.type !== 'embedded_document' && (r.width > limit || r.height > limit)) add('width', 'asset.dimensionLimit');
      requireIf(r.type === 'thumbnail', 'derivedFromAssetId');
      if (!/\.(?:jpe?g|png|webp|pdf|txt)$/i.test(r.originalName)) add('originalName', 'asset.extension');
      const extensionMimes = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf', txt: 'text/plain' };
      if (extensionMimes[r.originalName.split('.').pop().toLowerCase()] !== r.mime) add('originalName', 'asset.extensionMismatch');
    }
    if (table === 'documents') {
      requireIf(r.mode === 'embedded', 'assetId'); absentIf(r.mode === 'embedded', ['externalFileName', 'externalLocation', 'externalFileType', 'originalSha256']);
      ['externalFileName', 'externalLocation'].forEach(field => requireIf(r.mode === 'external_reference', field)); absentIf(r.mode === 'external_reference', ['assetId']);
    }
  }
  function validateRecord(table, record, options = {}) {
    const errors = [];
    if (!own(d.schemas, table)) return finish([issue(table, record, '', 'table.unknown', 'table.unknown')], options);
    inspect(record, table, errors);
    if (!record || typeof record !== 'object' || Array.isArray(record) || (typeof Blob !== 'undefined' && record instanceof Blob)) appendIssue(errors, issue(table, record, '', 'record.object', 'record.object'));
    if (errors.length) return finish(errors, options);
    const context = Object.assign({}, options, { today: today(options) });
    validateFields(d.schemas[table].fields, record, table, errors, context);
    if (options.datasetId && record.datasetId !== options.datasetId) appendIssue(errors, issue(table, record, 'datasetId', 'dataset.mismatch', 'dataset.mismatch'));
    if (!errors.length) localRules(table, record, errors);
    return finish(errors, options);
  }
  function createRecord(table, input, options = {}) {
    const errors = []; inspect(input, table, errors);
    if (errors.length) throw new ValidationError(errors);
    if (!own(d.schemas, table) || !input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Expected a known table and an input object');
    function copy(value) { if (value === null || typeof value !== 'object' || (typeof Blob !== 'undefined' && value instanceof Blob)) return value;
      if (Array.isArray(value)) return value.map(copy); return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, copy(item)])); }
    const record = {};
    for (const [key, field] of Object.entries(d.schemas[table].fields)) {
      if (own(input, key)) record[key] = copy(input[key]);
      else if (own(field, 'default')) record[key] = copy(field.default);
      else if (field.nullable) record[key] = null;
    }
    for (const key of Object.keys(input)) if (!own(d.schemas[table].fields, key)) appendIssue(errors, issue(table, input, key, 'field.unknown', 'field.unknown'));
    if (errors.length) throw new ValidationError(errors);
    const now = options.now || new Date().toISOString();
    record.id = options.id || record.id || root.utils.ids.uuidV4(); record.datasetId = options.datasetId || record.datasetId;
    record.createdAt = record.createdAt || now; record.updatedAt = record.updatedAt || now;
    if (options.origin) record.origin = options.origin;
    if (options.originBatchId) record.originBatchId = options.originBatchId;
    if (table === 'animals') record.microchipNormalized = record.microchipOriginal ? root.utils.strings.normalizeMicrochip(record.microchipOriginal) : null;
    if (table === 'contacts') {
      record.emailNormalized = record.email ? root.utils.strings.normalizeEmail(record.email) : null;
      record.phones = record.phones.map(phone => Object.assign({}, phone, { normalized: root.utils.strings.normalizePhone(phone.original) }));
    }
    validateRecord(table, record, Object.assign({}, options, { now: undefined, throwOnError: true }));
    return record;
  }
  d.ValidationError = ValidationError; d.validateRecord = validateRecord; d.createRecord = createRecord;
  d.validationInternals = Object.freeze({ inspect, issue, finish, today, present, own, appendIssue });
}(window.RescueManager));
