'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const sandbox = vm.createContext({ window: { crypto: webcrypto }, Intl, Date, Blob, Uint8Array });
for (const file of ['namespace', 'utils/ids', 'utils/dates', 'utils/strings', 'utils/canonical-json',
  'domain/enums', 'domain/schemas', 'domain/validators', 'domain/dataset-validator']) {
  const filename = path.resolve(__dirname, '../../js/' + file + '.js');
  vm.runInContext(fs.readFileSync(filename, 'utf8'), sandbox, { filename });
}
const d = sandbox.window.RescueManager.domain;
const datasetId = '00000000-0000-4000-8000-000000000001';
const today = '2026-10-15', now = today + 'T12:00:00.000Z';
const options = { datasetId, today, now };
let sequence = 10;
const id = () => '00000000-0000-4000-8000-' + String(sequence++).padStart(12, '0');
function make(table, input, recordId = id()) { return d.createRecord(table, input, { ...options, id: recordId }); }
function fixture() {
  const tables = Object.fromEntries(d.tableNames.map(table => [table, []]));
  const add = (table, input, recordId) => { const row = make(table, input, recordId); tables[table].push(row); return row; };
  add('organizationSettings', { name: 'Refugio ficticio', language: 'es', currencyCode: 'EUR', dateFormat: 'day_first', timeZone: 'Europe/Madrid' });
  const catalogs = {};
  for (const kind of d.enums.catalogKind) catalogs[kind] = add('catalogOptions', { kind, code: kind + '_example', customLabel: kind });
  const location = add('locations', { name: 'Refugio' });
  const contact = add('contacts', { name: 'Persona ficticia', phones: [{ label: 'Casa', original: '+34 600 001 002' }],
    email: 'EXAMPLE@example.org', roles: [...d.enums.contactRole] });
  const animalInput = { code: 'A-000001', name: 'Luna', speciesId: catalogs.species.id, sizeId: catalogs.size.id,
    managementStatus: 'under_care', adoptionAvailability: 'reserved', locationKind: 'foster',
    microchipOriginal: '000-abc-123', birthPrecision: 'estimated', estimatedAgeMonths: 12, estimatedAgeReferenceDate: '2026-10-01' };
  const animal = add('animals', animalInput);
  const second = add('animals', { ...animalInput, code: 'A-000002', name: 'Sol', microchipOriginal: '002-xyz',
    locationKind: 'shelter', locationId: location.id, adoptionAvailability: 'available' });
  const episode = add('stayEpisodes', { animalId: animal.id, entryDate: '2026-10-01', entryReason: 'Rescate', entryType: 'first_entry' });
  const adoptionId = id();
  const previousEpisode = add('stayEpisodes', { animalId: second.id, entryDate: '2026-09-01', entryReason: 'Rescate', entryType: 'first_entry',
    exitDate: '2026-09-10', exitReason: 'adoption', adoptionId });
  add('weightMeasurements', { animalId: animal.id, date: '2026-10-02', grams: 12400 });
  const foster = add('fosterProfiles', { contactId: contact.id, totalCapacity: 2, acceptedSpeciesIds: [catalogs.species.id],
    acceptedSizeIds: [catalogs.size.id], availability: 'available' });
  add('fosterStays', { animalId: animal.id, episodeId: episode.id, fosterProfileId: foster.id, startDate: '2026-10-02' });
  const application = add('adoptionApplications', { animalId: animal.id, contactId: contact.id, applicationDate: '2026-10-03',
    status: 'approved', approvalDate: '2026-10-04' });
  add('reservations', { animalId: animal.id, applicationId: application.id, reservationDate: '2026-10-05', expiresOn: '2026-10-20' });
  const previousApplication = add('adoptionApplications', { animalId: second.id, contactId: contact.id, applicationDate: '2026-09-02',
    status: 'completed', approvalDate: '2026-09-03' });
  const adoption = add('adoptions', { animalId: second.id, applicationId: previousApplication.id, adopterContactId: contact.id,
    episodeId: previousEpisode.id, adoptionDate: '2026-09-10', returnDate: '2026-10-01', returnReason: 'Cambio de circunstancias' }, adoptionId);
  add('stayEpisodes', { animalId: second.id, entryDate: '2026-10-01', entryReason: 'Devolución', entryType: 'return', returnedFromAdoptionId: adoption.id });
  const volunteer = add('volunteerProfiles', { contactId: contact.id, functionIds: [catalogs.volunteer_function.id] });
  add('volunteerHours', { volunteerProfileId: volunteer.id, date: '2026-10-03', activity: 'Paseos', durationMinutes: 90 });
  const plan = add('carePlans', { animalId: animal.id, typeId: catalogs.care_plan_type.id, name: 'Cuidados', startDate: '2026-10-02', status: 'active' });
  const task = add('tasks', { title: 'Revisión', dueDate: '2026-10-03', status: 'completed', completedOn: '2026-10-04', animalId: animal.id,
    typeId: catalogs.task_type.id, source: { type: 'care_plan', id: plan.id }, originKey: 'plan/review' });
  const recordId = id();
  const expense = add('financialMovements', { direction: 'expense', date: '2026-10-04', categoryId: catalogs.finance_expense.id,
    concept: 'Revisión', amountMinor: 5000, currencyCode: 'EUR', animalId: animal.id,
    source: { type: 'veterinary_record', id: recordId }, originKey: 'health/expense' });
  add('veterinaryRecords', { animalId: animal.id, type: 'checkup', date: '2026-10-04', title: 'Revisión',
    veterinarianContactId: contact.id, sourceTaskId: task.id, carePlanId: plan.id, expenseMovementId: expense.id }, recordId);
  const monetaryId = id();
  const income = add('financialMovements', { direction: 'income', date: '2026-10-05', categoryId: catalogs.finance_income.id,
    concept: 'Donación', amountMinor: 12000, currencyCode: 'EUR', contactId: contact.id,
    source: { type: 'donation', id: monetaryId }, originKey: 'donation/income' });
  add('donations', { donorContactId: contact.id, date: '2026-10-05', type: 'monetary', financialMovementId: income.id }, monetaryId);
  const material = add('donations', { donorContactId: contact.id, date: '2026-10-05', type: 'material' });
  const item = add('inventoryItems', { name: 'Pienso', categoryId: catalogs.inventory_category.id, unitId: catalogs.unit.id,
    quantityPrecision: 0, minimumStockScaled: 10, supplierContactId: contact.id });
  add('inventoryMovements', { itemId: item.id, date: '2026-10-01', type: 'opening_balance', deltaScaled: 100, reason: 'Inicio' });
  const lineId = id(), stockId = id();
  add('donationLines', { donationId: material.id, materialTypeId: catalogs.material_type.id, description: 'Sacos', quantityScaled: 30,
    quantityPrecision: 0, unitId: catalogs.unit.id, inventoryItemId: item.id, inventoryMovementId: stockId }, lineId);
  add('inventoryMovements', { itemId: item.id, date: '2026-10-05', type: 'donation', deltaScaled: 30, reason: 'Donación',
    donationLineId: lineId, originKey: 'donation/stock' }, stockId);
  add('inventoryMovements', { itemId: item.id, date: '2026-10-06', type: 'consumption', deltaScaled: -50, reason: 'Alimentación' });
  const blob = new Blob(['Documento ficticio'], { type: 'text/plain' });
  const asset = add('assets', { type: 'embedded_document', originalName: 'nota.txt', mime: blob.type, byteLength: blob.size,
    sha256: '0'.repeat(64), blob });
  const document = add('documents', { title: 'Nota ficticia', typeId: catalogs.document_type.id, date: '2026-10-03', mode: 'embedded', assetId: asset.id });
  add('documentLinks', { documentId: document.id, entityType: 'animal', entityId: animal.id });
  add('animalEvents', { animalId: animal.id, type: 'entry', eventDate: episode.entryDate, recordedAt: now,
    source: { type: 'stay_episode', id: episode.id }, originKey: 'episode/entry' });
  add('activityLog', { operation: 'create', occurredAt: now, operationId: id(), target: { type: 'animal', id: animal.id } });
  add('importIdentityMap', { source: 'fixture', entityType: 'animal', externalId: 'external-1', entityId: animal.id });
  return tables;
}
function issues(tables) { return d.validateDataset(tables, { datasetId, today }); }
function expectIssue(tables, code) { const found = issues(tables); assert.ok(found.some(error => error.code === code), JSON.stringify(found)); }
test('all 28 entities form a valid dataset with foster, reservation, returned adoption, health and donations', () => {
  const tables = fixture(); assert.equal(d.tableNames.length, 28);
  for (const table of d.tableNames) assert.ok(tables[table].length > 0, table);
  assert.equal(issues(tables).length, 0, JSON.stringify(issues(tables)));
  assert.ok(Object.isFrozen(d.schemas.animals.fields));
});
test('record factory applies isolated defaults and derives normalization while preserving input', () => {
  const input = { name: 'Ejemplo', roles: ['donor'], email: 'HELLO@example.org', phones: [{ label: 'Teléfono', original: '0034 0600 000 001' }] };
  const before = JSON.stringify(input), record = make('contacts', input), other = make('contacts', { name: 'Otro' });
  assert.equal(JSON.stringify(input), before); assert.equal(record.phones[0].normalized, '+340600000001');
  assert.equal(record.email, input.email); assert.equal(record.emailNormalized, 'hello@example.org');
  record.roles.push('volunteer'); assert.equal(other.roles.length, 0); assert.equal(record.archivedAt, null);
});
test('validation is pure; throwOnError uses identical structured details and empty bootstrap is explicit', () => {
  const tables = fixture(), before = JSON.stringify(tables); assert.equal(issues(tables).length, 0); assert.equal(JSON.stringify(tables), before);
  tables.contacts[0].name = '';
  const errors = issues(tables); assert.ok(errors.length); assert.equal(typeof errors[0].path, 'string');
  assert.throws(() => d.validateDataset(tables, { today, throwOnError: true }), error => error.name === 'ValidationError' && error.details.length === errors.length);
  assert.equal(d.validateDataset({}, { allowEmpty: true }).length, 0); assert.ok(d.validateDataset({}).length > 0);
});
for (const table of d.tableNames) test(table + ': rejects unknown fields and wrong primitive types', () => {
  const record = fixture()[table][0];
  assert.ok(d.validateRecord(table, { ...record, injected: 'x' }, { today }).some(error => error.code === 'field.unknown'));
  assert.ok(d.validateRecord(table, { ...record, revision: 1.2 }, { today }).some(error => error.code === 'number.unsafe'));
  assert.ok(d.validateRecord(table, { ...record, id: 'not-a-uuid' }, { today }).some(error => error.code === 'value.uuid'));
});
test('dangerous keys, accessors, symbols, exotic objects, cycles and excessive depth never execute', () => {
  const record = fixture().contacts[0]; let calls = 0;
  const getter = Object.defineProperty({ ...record }, 'name', { enumerable: true, get() { calls++; return 'executed'; } });
  const nested = JSON.parse('{"parameters":{"__proto__":{"polluted":true}}}');
  const cycle = { ...record }; cycle.self = cycle;
  const symbol = { ...record }; symbol[Symbol('hidden')] = true;
  let deep = 'x'; for (let i = 0; i < 25; i++) deep = [deep];
  for (const item of [getter, nested, cycle, symbol, new Date(), { ...record, test: deep }, { ...record, name: '\ud800' },
    JSON.parse('{"constructor":{}}'), JSON.parse('{"prototype":{}}')]) assert.ok(d.validateRecord('contacts', item, { today }).length > 0);
  assert.equal(calls, 0); assert.equal({}.polluted, undefined);
  assert.throws(() => d.createRecord('contacts', getter, options), /validation/i); assert.equal(calls, 0);
});
test('calendar dates, future facts, UTC instants, local times and IANA zones are strict', () => {
  const tables = fixture(); tables.weightMeasurements[0].date = '2025-02-29'; expectIssue(tables, 'value.date');
  tables.weightMeasurements[0].date = '2026-10-16'; expectIssue(tables, 'date.future');
  tables.weightMeasurements[0].date = '2026-10-01'; tables.contacts[0].createdAt = '2026-02-30T00:00:00Z'; expectIssue(tables, 'value.instant');
  const task = fixture().tasks[0];
  assert.ok(d.validateRecord('tasks', { ...task, dueLocalTime: '25:00', timeZone: 'Europe/Madrid' }, { today }).length);
  assert.ok(d.validateRecord('tasks', { ...task, dueLocalTime: '12:00', timeZone: 'Invented/Zone' }, { today }).length);
  assert.equal(d.validateRecord('tasks', { ...task, dueLocalTime: '12:00', timeZone: 'Europe/Madrid', dueDate: '2030-01-01' }, { today }).length, 0);
});
test('animal unknown/exact/estimated birth combinations and sterilization remain explicit', () => {
  const animal = fixture().animals[0];
  for (const patch of [{ birthPrecision: 'unknown' }, { birthPrecision: 'exact', birthDate: '2025-01-01' },
    { birthDate: '2025-01-01' }, { sterilizationDate: '2026-10-01' }, { managementStatus: 'adopted' }]) {
    assert.ok(d.validateRecord('animals', { ...animal, ...patch }, { today }).length);
  }
  assert.equal(d.validateRecord('animals', { ...animal, birthPrecision: 'exact', birthDate: '2024-02-29', estimatedAgeMonths: null, estimatedAgeReferenceDate: null }, { today }).length, 0);
});
test('foreign keys, catalog types, dynamic origins and cross-dataset references are enforced', () => {
  let tables = fixture(); tables.animals[0].speciesId = id(); expectIssue(tables, 'reference.missing');
  tables = fixture(); tables.animals[0].speciesId = tables.catalogOptions.find(row => row.kind === 'size').id; expectIssue(tables, 'reference.catalogKind');
  tables = fixture(); tables.contacts[0].datasetId = id(); expectIssue(tables, 'dataset.mismatch');
  tables = fixture(); tables.documentLinks[0].entityId = id(); expectIssue(tables, 'reference.missing');
  tables = fixture(); tables.tasks[0].source.id = id(); expectIssue(tables, 'reference.missing');
});
test('uniqueness includes UUIDs, codes, normalized microchips, origin keys, one profile and document links', () => {
  for (const table of ['animals', 'fosterProfiles', 'volunteerProfiles', 'animalEvents', 'documentLinks', 'importIdentityMap']) {
    const tables = fixture(), original = tables[table][0]; tables[table].push({ ...original, id: id() });
    assert.ok(issues(tables).some(error => error.code.startsWith('unique.')), table);
  }
  const tables = fixture(); tables.contacts.push({ ...tables.contacts[0] }); expectIssue(tables, 'record.duplicateId');
  const shared = fixture(); shared.contacts.push(make('contacts', { name: 'Email compartido', email: shared.contacts[0].email }));
  assert.equal(issues(shared).length, 0, 'shared emails intentionally are not unique');
});
test('location, merge, resource and correction cycles are rejected', () => {
  for (const [table, field] of [['locations', 'parentLocationId'], ['contacts', 'mergedIntoContactId'], ['assets', 'derivedFromAssetId'],
    ['financialMovements', 'correctsMovementId'], ['animalEvents', 'correctsEventId']]) {
    const tables = fixture(); tables[table][0][field] = tables[table][0].id; expectIssue(tables, 'reference.cycle');
  }
});
test('half-open historical episodes allow touching dates and reject overlaps, including nested intervals', () => {
  let tables = fixture(); tables.stayEpisodes[2].entryDate = '2026-09-09'; expectIssue(tables, 'interval.overlap');
  tables = fixture(); const original = tables.stayEpisodes[0];
  tables.stayEpisodes.push(make('stayEpisodes', { animalId: original.animalId, entryDate: '2026-10-03', exitDate: '2026-10-04', exitReason: 'other', entryReason: 'Histórico', entryType: 'other' }));
  expectIssue(tables, 'interval.overlap');
  tables = fixture(); const row = tables.stayEpisodes[0];
  tables.stayEpisodes.push(make('stayEpisodes', { animalId: row.animalId, entryDate: row.entryDate, exitDate: row.entryDate, exitReason: 'other', entryReason: 'Cero días', entryType: 'other' }));
  assert.equal(issues(tables).length, 0);
});
test('current animal state, foster intervals, capacity exceptions and reservations stay coherent', () => {
  let tables = fixture(); tables.animals[0].locationKind = 'shelter'; tables.animals[0].locationId = tables.locations[0].id; expectIssue(tables, 'animal.fosterState');
  tables = fixture(); tables.fosterStays[0].startDate = '2026-09-30'; expectIssue(tables, 'foster.episodeBounds');
  tables = fixture(); tables.fosterProfiles[0].totalCapacity = 0; expectIssue(tables, 'foster.exceptionRequired');
  tables.fosterStays[0].exceptionReason = 'Acogida excepcional revisada'; assert.equal(issues(tables).length, 0);
  tables = fixture(); tables.animals[0].adoptionAvailability = 'available'; expectIssue(tables, 'animal.reservationState');
  tables = fixture(); tables.reservations.push({ ...tables.reservations[0], id: id() }); expectIssue(tables, 'reservation.multipleActive');
});
test('adoption, approval, return and episode backlinks cannot silently diverge', () => {
  let tables = fixture(); tables.adoptions[0].adoptionDate = '2026-09-01'; expectIssue(tables, 'adoption.applicationMismatch');
  tables = fixture(); tables.adoptions[0].adopterContactId = id(); expectIssue(tables, 'reference.missing');
  tables = fixture(); tables.stayEpisodes.pop(); expectIssue(tables, 'adoption.returnEpisode');
  tables = fixture(); tables.adoptions[0].returnDate = '2026-09-30'; expectIssue(tables, 'episode.returnMismatch');
  tables = fixture(); tables.adoptionApplications[0].status = 'pending'; tables.adoptionApplications[0].approvalDate = null; expectIssue(tables, 'reservation.applicationMismatch');
});
test('health actions require a completed task, same animal, one expense and consistent sterilization', () => {
  let tables = fixture(); tables.tasks[0].completedOn = '2026-10-03'; expectIssue(tables, 'health.taskNotCompleted');
  tables = fixture(); tables.carePlans[0].animalId = tables.animals[1].id; expectIssue(tables, 'health.animalMismatch');
  tables = fixture(); tables.financialMovements[0].direction = 'income'; expectIssue(tables, 'health.expenseMismatch');
  tables = fixture(); tables.veterinaryRecords[0].type = 'sterilization'; expectIssue(tables, 'health.sterilizationMismatch');
  tables = fixture(); tables.veterinaryRecords.push({ ...tables.veterinaryRecords[0], id: id(), sourceTaskId: null });
  assert.equal(issues(tables).length, 0, 'several records may reference one existing expense');
});
test('monetary donation is linked to exactly one coherent income with coordinated voiding', () => {
  let tables = fixture(); tables.financialMovements[1].contactId = null; expectIssue(tables, 'donation.incomeMismatch');
  tables = fixture(); tables.financialMovements[1].currencyCode = 'USD'; expectIssue(tables, 'finance.currencyMismatch');
  tables = fixture(); tables.donations[0].status = 'voided'; tables.donations[0].voidReason = 'Anulada'; expectIssue(tables, 'donation.incomeMismatch');
  tables.financialMovements[1].status = 'voided'; tables.financialMovements[1].voidReason = 'Anulada'; tables.financialMovements[1].voidedOn = today;
  assert.equal(issues(tables).length, 0);
  tables = fixture(); tables.financialMovements[1].amountMinor = Number.MAX_SAFE_INTEGER; tables.financialMovements.push(make('financialMovements', {
    direction: 'income', date: today, categoryId: tables.catalogOptions.find(row => row.kind === 'finance_income').id, concept: 'Otra', amountMinor: 1, currencyCode: 'EUR' }));
  expectIssue(tables, 'finance.totalUnsafe');
});
test('material lines, units, stock backlinks, historical negative stock and compensation are enforced', () => {
  let tables = fixture(); tables.donationLines[0].quantityPrecision = 1; expectIssue(tables, 'inventory.unitMismatch');
  tables = fixture(); tables.inventoryMovements[1].deltaScaled = 31; expectIssue(tables, 'donation.stockMismatch');
  tables = fixture(); tables.inventoryMovements[2].date = '2026-09-30'; expectIssue(tables, 'inventory.negativeHistoricalStock');
  tables = fixture(); tables.donations[1].status = 'voided'; tables.donations[1].voidReason = 'Error'; expectIssue(tables, 'donation.compensationRequired');
  tables.inventoryMovements.push(make('inventoryMovements', { itemId: tables.inventoryItems[0].id, date: today, type: 'adjustment',
    deltaScaled: -30, reason: 'Compensación de donación anulada', compensatesMovementId: tables.inventoryMovements[1].id }));
  assert.equal(issues(tables).length, 0);
  tables.inventoryMovements.at(-1).deltaScaled = -31; expectIssue(tables, 'inventory.compensationMismatch');
});
test('archive and trash retain history but cannot change economic or stock totals', () => {
  const tables = fixture(); tables.animals[0].archivedAt = now; tables.contacts[0].deletedAt = now; assert.equal(issues(tables).length, 0);
  tables.financialMovements[0].deletedAt = now; expectIssue(tables, 'state.trashForbidden');
  tables.financialMovements[0].deletedAt = null; tables.inventoryMovements[0].deletedAt = now; expectIssue(tables, 'state.trashForbidden');
});
test('resource metadata, extensions, budget, photo parent and embedded/external documents are validated', () => {
  let tables = fixture(); tables.assets[0].byteLength++; expectIssue(tables, 'asset.metadataMismatch');
  tables = fixture(); tables.assets[0].originalName = 'exploit.svg'; expectIssue(tables, 'asset.extension');
  tables = fixture(); tables.documents[0].externalFileName = 'other.txt'; expectIssue(tables, 'field.forbiddenForState');
  const blob = new Blob(['x'], { type: 'image/png' });
  assert.throws(() => make('assets', { type: 'photo', originalName: 'a.png', mime: blob.type, blob, byteLength: 1, sha256: '0'.repeat(64), width: 1601, height: 1 }));
  const big = new Blob([new Uint8Array(8 * 1024 * 1024)], { type: 'application/pdf' });
  tables = fixture(); for (let index = 0; index < 9; index++) tables.assets.push(make('assets', { type: 'embedded_document', originalName: 'a.pdf', mime: big.type, blob: big, byteLength: big.size, sha256: '0'.repeat(64) }));
  expectIssue(tables, 'asset.datasetBudget');
});
test('time-zone today uses organization calendar rather than the host clock date', () => {
  const tables = fixture(); tables.organizationSettings[0].timeZone = 'Pacific/Kiritimati'; tables.weightMeasurements[0].date = '2026-10-16';
  const errors = d.validateDataset(tables, { datasetId, now: Date.parse('2026-10-15T12:30:00Z') });
  assert.equal(errors.length, 0, JSON.stringify(errors));
  assert.throws(() => d.validateDataset(tables, { today: 'not-a-date' }), /calendar date/);
});
test('target volume of 2000 animals, 5000 contacts and 50000 related records fits declared validation limits', () => {
  const tables = fixture(), animal = tables.animals[0], episode = tables.stayEpisodes[0], contact = tables.contacts[0], hours = tables.volunteerHours[0];
  while (tables.animals.length < 2000) {
    const animalId = id();
    tables.animals.push({ ...animal, id: animalId, code: 'V-' + tables.animals.length, microchipOriginal: null, microchipNormalized: null,
      adoptionAvailability: 'available', locationKind: 'shelter', locationId: tables.locations[0].id });
    tables.stayEpisodes.push({ ...episode, id: id(), animalId });
  }
  while (tables.contacts.length < 5000) tables.contacts.push({ ...contact, id: id(), name: 'Contacto ' + tables.contacts.length, email: null, emailNormalized: null, phones: [], roles: [] });
  while (tables.volunteerHours.length < 50000) tables.volunteerHours.push({ ...hours, id: id() });
  const errors = issues(tables); assert.equal(errors.length, 0, JSON.stringify(errors.slice(0, 10)));
});
test('large invalid records yield bounded errors instead of overflowing the JavaScript call stack', () => {
  const tables = fixture(), contact = tables.contacts[0];
  for (let index = 0; index < 150000; index++) contact['unknown_' + index] = index;
  const errors = issues(tables);
  assert.equal(errors.length, 1000); assert.equal(errors.at(-1).code, 'validation.moreErrors');
  assert.throws(() => d.validateDataset(tables, { today, throwOnError: true }), error => error.name === 'ValidationError' && error.details.length === 1000);
  const nested = fixture().contacts[0]; nested.phones[0].original = 'invalid@example.org';
  const nestedError = d.validateRecord('contacts', nested, { today })[0];
  assert.equal(nestedError.id, nested.id); assert.equal(nestedError.path, 'phones.0.original');
});
