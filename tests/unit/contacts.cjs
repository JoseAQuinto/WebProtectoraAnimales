'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const datasetId = '20000000-0000-4000-8000-000000000001', today = '2026-10-15', now = today + 'T12:00:00.000Z';
function harness() {
  const sandbox = vm.createContext({ window: { crypto: webcrypto }, Intl, Date, Blob, Uint8Array });
  function load(file) { const name = path.resolve(__dirname, '../../js/' + file + '.js'); vm.runInContext(fs.readFileSync(name, 'utf8'), sandbox, { filename: name }); }
  for (const file of ['namespace', 'utils/ids', 'utils/dates', 'utils/strings', 'utils/canonical-json', 'domain/enums',
    'domain/schemas', 'domain/validators', 'domain/dataset-validator']) load(file);
  const root = sandbox.window.RescueManager, d = root.domain, id = () => root.utils.ids.uuidV4();
  let tables = Object.fromEntries(d.tableNames.map(table => [table, []])), revision = 0;
  const replay = new Map(), create = (table, input) => d.createRecord(table, input, { datasetId, now, today });
  const seed = (table, input) => { const row = create(table, input); tables[table].push(row); return row; };
  seed('organizationSettings', { name: 'Refugio ficticio', language: 'es', currencyCode: 'EUR', dateFormat: 'day_first', timeZone: 'Europe/Madrid' });
  const catalog = {};
  for (const kind of ['species', 'size', 'finance_income', 'task_type', 'document_type']) catalog[kind] = seed('catalogOptions', { kind, code: kind + '_example', customLabel: kind });
  const location = seed('locations', { name: 'Refugio' });
  const fail = (name, message) => { const error = new Error(message); error.name = name; throw error; };
  root.services.context = { async execute(type, intent, build, command = {}) {
    const operationId = command.operationId || id(), fingerprint = root.utils.canonicalJson.stringify({ type, intent });
    if (replay.has(operationId)) {
      const previous = replay.get(operationId); if (previous.fingerprint !== fingerprint) fail('IdempotencyConflictError', 'Intent changed');
      return { ...previous.result, duplicate: true };
    }
    if (command.expectedRevision !== undefined && command.expectedRevision !== revision) fail('RevisionConflictError', 'Stale form');
    const data = structuredClone(tables), sequence = { value: data.animals.length };
    const h = { now, today, operationId, datasetId, fail,
      find(table, recordId) { const row = data[table].find(value => value.id === recordId); if (!row) fail('RecordNotFoundError', 'Missing'); return row; },
      create, edit(table, previous, patch) { return create(table, { ...previous, ...patch, revision: previous.revision + 1, updatedAt: now }); },
      insert(table, record) { return { table, record, expectedRevision: null }; },
      replace(table, record) { return { table, record, expectedRevision: record.revision - 1 }; },
      allocateAnimalCode() { return 'A-' + String(++sequence.value).padStart(6, '0'); }
    };
    const prepared = await build(data, h), candidate = structuredClone(tables), changed = new Set();
    for (const change of prepared.changes) {
      const key = change.table + '/' + change.record.id;
      if (changed.has(key)) fail('DuplicateChangeError', 'Duplicate change'); changed.add(key);
      const index = candidate[change.table].findIndex(row => row.id === change.record.id), previous = candidate[change.table][index];
      if (change.expectedRevision === null) { if (previous) fail('RevisionConflictError', 'Duplicate id'); candidate[change.table].push(change.record); }
      else { if (!previous || previous.revision !== change.expectedRevision) fail('RevisionConflictError', 'Stale record'); candidate[change.table][index] = change.record; }
    }
    d.validateDataset(candidate, { datasetId, today, throwOnError: true });
    tables = candidate; revision++;
    const result = { operationId, activeRevision: revision, duplicate: false, result: prepared.result }; replay.set(operationId, { fingerprint, result }); return result;
  } };
  for (const file of ['services/finance', 'services/donations', 'services/tasks', 'services/animals', 'services/adoptions', 'services/contacts']) load(file);
  return { root, id, seed, catalog, location, get tables() { return tables; }, get revision() { return revision; },
    row(table, rowId) { return tables[table].find(value => value.id === rowId); }, state() { return JSON.stringify(tables); } };
}
// Values built inside the vm sandbox carry its prototypes; compare their plain JSON shape.
const same = (actual, expected) => assert.deepEqual(JSON.parse(JSON.stringify(actual)), expected);
const person = (name, extra = {}) => ({ name, roles: ['adopter'], ...extra });
test('contacts normalize identity data, block silent email/phone duplicates and only warn on equal names', async () => {
  const h = harness(), c = h.root.services.contacts;
  const first = (await c.create(person('Ana Pérez', { email: 'Ana@Example.invalid', phones: [{ label: 'Móvil', original: '0034 600-111-222' }] }))).result.id;
  assert.equal(h.row('contacts', first).emailNormalized, 'ana@example.invalid');
  assert.equal(h.row('contacts', first).phones[0].normalized, '+34600111222');
  assert.equal(h.tables.activityLog.at(-1).target.id, first);
  let before = h.state();
  await assert.rejects(c.create(person('Otra', { email: 'ana@example.INVALID' })), { name: 'PossibleDuplicateError' });
  await assert.rejects(c.create(person('Otra', { phones: [{ original: '+34 600 111 222' }] })), { name: 'PossibleDuplicateError' });
  await assert.rejects(c.create(person('Otra', { phones: [{ original: 'call me' }] })), { name: 'InvalidInputError' });
  await assert.rejects(c.create(person('Otra', { phones: '600111222' })), { name: 'InvalidInputError' });
  await assert.rejects(c.create(person('Otra', { password: 'x' })), { name: 'InvalidInputError' });
  assert.equal(h.state(), before);
  const matches = c.findDuplicates(h.tables, { name: 'ana  perez' });
  same(matches.map(match => [match.contactId, match.strength, match.reasons]), [[first, 'name_only', ['name']]]);
  const sameName = (await c.create(person('ANA PEREZ'))).result.id;
  const confirmed = (await c.create(person('Ana P.', { email: 'ana@example.invalid' }), { confirmDuplicates: true })).result.id;
  assert.equal(h.tables.contacts.length, 3); assert.notEqual(sameName, confirmed);
  before = h.state();
  await assert.rejects(c.update(sameName, { email: 'ANA@example.invalid' }), { name: 'PossibleDuplicateError' });
  assert.equal(h.state(), before);
  const command = { operationId: h.id() };
  await c.update(sameName, { notes: 'Prefiere llamadas por la tarde' }, {}, command);
  assert.equal((await c.update(sameName, { notes: 'Prefiere llamadas por la tarde' }, {}, command)).duplicate, true);
  assert.equal(h.row('contacts', sameName).revision, 2);
});
test('archive keeps history, trash requires no relations and list search ignores case and accents', async () => {
  const h = harness(), c = h.root.services.contacts;
  const linked = (await c.create(person('José Núñez', { phones: [{ original: '+44 20 7946 0000' }] }))).result.id;
  const free = (await c.create(person('Lucía Gómez', { email: 'lucia@example.invalid' }))).result.id;
  await h.root.services.tasks.create({ title: 'Llamar para seguimiento', dueDate: today, typeId: h.catalog.task_type.id, contactId: linked });
  const before = h.state();
  await assert.rejects(c.trash(linked), /archive it instead/); assert.equal(h.state(), before);
  same(c.references(h.tables, linked).map(ref => ref.table), ['tasks']);
  await c.archive(linked); await c.trash(free);
  same(c.list(h.tables).map(row => row.id), []);
  same(c.list(h.tables, { includeArchived: true, search: 'jose nunez' }).map(row => row.id), [linked]);
  same(c.list(h.tables, { includeArchived: true, search: '7946' }).map(row => row.id), [linked]);
  same(c.list(h.tables, { trash: true, search: 'LUCIA@' }).map(row => row.id), [free]);
  await assert.rejects(c.update(free, { name: 'Edición en papelera' }), { name: 'InvalidStateError' });
  await c.restore(free); await c.unarchive(linked);
  same(c.list(h.tables, { role: 'adopter' }).map(row => row.name), ['José Núñez', 'Lucía Gómez']);
});
test('merge compares, resolves fields, unites roles, reassigns relations atomically and keeps money history', async () => {
  const h = harness(), c = h.root.services.contacts, s = h.root.services;
  const keep = (await c.create(person('María López', { email: 'maria@example.invalid', phones: [{ original: '600 000 001' }], notes: 'Vive cerca' }))).result.id;
  const other = (await c.create({ name: 'M. López', type: 'person', roles: ['foster', 'donor', 'adopter'], email: 'mlopez@example.invalid',
    phones: [{ original: '600000001' }, { label: 'Trabajo', original: '911 222 333' }], notes: 'Tiene jardín' }, { confirmDuplicates: true })).result.id;
  const profile = h.seed('fosterProfiles', { contactId: other, totalCapacity: 2, acceptedSpeciesIds: [h.catalog.species.id], acceptedSizeIds: [h.catalog.size.id], availability: 'available' });
  const animalId = (await s.animals.registerEntry({ animal: { name: 'Luna', speciesId: h.catalog.species.id }, date: '2026-10-01', entryReason: 'Rescate',
    location: { kind: 'shelter', id: h.location.id }, availability: 'available' })).result.animalId;
  const applicationId = (await s.adoptions.createApplication({ animalId, contactId: other, applicationDate: '2026-10-02' })).result.applicationId;
  await s.adoptions.approve({ applicationId, approvalDate: '2026-10-03' });
  const adoptionId = (await s.adoptions.complete({ applicationId, adoptionDate: '2026-10-04' })).result.adoptionId;
  const donation = (await s.donations.createMonetary({ date: today, donorContactId: other, categoryId: h.catalog.finance_income.id, concept: 'Donación', amountMinor: 2500 })).result;
  const taskId = (await s.tasks.create({ title: 'Seguimiento postadopción', dueDate: today, typeId: h.catalog.task_type.id, contactId: other })).result.id;
  const document = h.seed('documents', { title: 'Contrato', typeId: h.catalog.document_type.id, date: today, mode: 'external_reference', externalFileName: 'contrato.pdf', externalLocation: 'Carpeta física 3' });
  const sharedLink = h.seed('documentLinks', { documentId: document.id, entityType: 'contact', entityId: other });
  h.seed('documentLinks', { documentId: document.id, entityType: 'contact', entityId: keep });
  const identity = h.seed('importIdentityMap', { source: 'hoja-2025', entityType: 'contact', externalId: 'C-77', entityId: other });
  const before = h.state(), input = { keepId: keep, mergeId: other, confirmed: true };
  await assert.rejects(c.merge({ ...input, confirmed: false, resolution: {} }), { name: 'ConfirmationRequiredError' });
  await assert.rejects(c.merge({ ...input, resolution: { name: 'keep' } }), /every different field/);
  await assert.rejects(c.merge({ ...input, mergeId: keep, resolution: {} }), /two different/);
  assert.equal(h.state(), before);
  const resolution = { name: 'keep', email: 'merge', notes: 'combine' }, command = { operationId: h.id() };
  const result = await c.merge({ ...input, resolution }, command);
  const kept = h.row('contacts', keep), merged = h.row('contacts', other);
  assert.equal(merged.mergedIntoContactId, keep); assert.equal(kept.name, 'María López'); assert.equal(kept.email, 'mlopez@example.invalid');
  assert.equal(kept.notes, 'Vive cerca\n\nTiene jardín'); same(kept.roles, ['adopter', 'foster', 'donor']);
  same(kept.phones.map(phone => phone.normalized), ['600000001', '911222333']);
  assert.equal(h.row('fosterProfiles', profile.id).contactId, keep);
  assert.equal(h.row('adoptionApplications', applicationId).contactId, keep); assert.equal(h.row('adoptions', adoptionId).adopterContactId, keep);
  assert.equal(h.row('tasks', taskId).contactId, keep); assert.equal(h.row('importIdentityMap', identity.id).entityId, keep);
  assert.equal(h.row('documentLinks', sharedLink.id).entityId, other, 'an equal link is not duplicated');
  assert.equal(h.row('donations', donation.id).donorContactId, other); assert.equal(h.row('financialMovements', donation.financialMovementId).contactId, other);
  assert.equal(c.resolve(h.tables, other).id, keep);
  same(c.references(h.tables, other).map(ref => ref.table).sort(), ['documentLinks', 'donations', 'financialMovements']);
  assert.equal(result.result.reassigned, 5); assert.equal(h.tables.activityLog.at(-1).operation, 'merge');
  assert.equal(h.root.domain.validateDataset(h.tables, { datasetId, today }).length, 0);
  same(c.list(h.tables).map(row => row.id), [keep]);
  const after = h.state();
  assert.equal((await c.merge({ ...input, resolution }, command)).duplicate, true); assert.equal(h.state(), after);
  await assert.rejects(c.merge({ keepId: other, mergeId: keep, resolution, confirmed: true }), { name: 'InvalidStateError' });
  await assert.rejects(c.trash(other), { name: 'InvalidStateError' });
});
test('merge refuses two profiles of the same kind and leaves every record intact', async () => {
  const h = harness(), c = h.root.services.contacts;
  const first = (await c.create(person('Familia Uno', { roles: ['foster'] }))).result.id, second = (await c.create(person('Familia Dos', { roles: ['foster'] }))).result.id;
  for (const contactId of [first, second]) h.seed('fosterProfiles', { contactId, totalCapacity: 1, acceptedSpeciesIds: [], acceptedSizeIds: [] });
  const before = h.state();
  await assert.rejects(c.merge({ keepId: first, mergeId: second, resolution: { name: 'keep' }, confirmed: true }), { name: 'MergeConflictError' });
  assert.equal(h.state(), before);
});
