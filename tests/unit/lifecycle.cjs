'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const datasetId = '10000000-0000-4000-8000-000000000001', today = '2026-10-15', now = today + 'T12:00:00.000Z';
function harness() {
  const sandbox = vm.createContext({ window: { crypto: webcrypto }, Intl, Date, Blob, Uint8Array });
  function load(file) { const name = path.resolve(__dirname, '../../js/' + file + '.js'); vm.runInContext(fs.readFileSync(name, 'utf8'), sandbox, { filename: name }); }
  for (const file of ['namespace', 'utils/ids', 'utils/dates', 'utils/strings', 'utils/canonical-json', 'domain/enums',
    'domain/schemas', 'domain/validators', 'domain/dataset-validator']) load(file);
  const root = sandbox.window.RescueManager, d = root.domain, id = () => root.utils.ids.uuidV4();
  let tables = Object.fromEntries(d.tableNames.map(table => [table, []])), revision = 0, sequence = 0, failureAfter = null;
  const replay = new Map(), create = (table, input) => d.createRecord(table, input, { datasetId, now, today });
  const seed = (table, input) => { const row = create(table, input); tables[table].push(row); return row; };
  const org = seed('organizationSettings', { name: 'Refugio ficticio', language: 'es', currencyCode: 'EUR', dateFormat: 'day_first', timeZone: 'Europe/Madrid' });
  const catalog = {};
  for (const kind of ['species', 'size', 'finance_income', 'task_type']) catalog[kind] = seed('catalogOptions', { kind, code: kind + '_example', customLabel: kind });
  const location = seed('locations', { name: 'Refugio' });
  const contact = seed('contacts', { name: 'Persona ficticia', roles: ['adopter', 'foster'] });
  const foster = seed('fosterProfiles', { contactId: contact.id, totalCapacity: 1, acceptedSpeciesIds: [catalog.species.id], acceptedSizeIds: [catalog.size.id], availability: 'available' });
  const fail = (name, message) => { const error = new Error(message); error.name = name; throw error; };
  root.services.context = { async execute(type, intent, build, command = {}) {
    const operationId = command.operationId || id(), fingerprint = root.utils.canonicalJson.stringify({ type, intent });
    if (replay.has(operationId)) {
      const previous = replay.get(operationId); if (previous.fingerprint !== fingerprint) fail('IdempotencyConflictError', 'Intent changed');
      return { ...previous.result, duplicate: true };
    }
    if (command.expectedRevision !== undefined && command.expectedRevision !== revision) fail('RevisionConflictError', 'Stale form');
    const data = structuredClone(tables); let proposedSequence = sequence;
    const h = { now, today, operationId, fail,
      find(table, recordId) { const row = data[table].find(value => value.id === recordId); if (!row) fail('RecordNotFoundError', 'Missing'); return row; },
      create,
      edit(table, previous, patch) { return create(table, { ...previous, ...patch, revision: previous.revision + 1, updatedAt: now }); },
      insert(table, record) { return { table, record, expectedRevision: null }; },
      replace(table, record) { return { table, record, expectedRevision: record.revision - 1 }; },
      allocateAnimalCode() {
        const codes = [...data.animals.map(row => row.code), ...data.activityLog.map(row => row.summaryParameters.code)];
        for (const code of codes) if (/^A-\d+$/.test(code || '')) proposedSequence = Math.max(proposedSequence, Number(code.slice(2)));
        return 'A-' + String(++proposedSequence).padStart(6, '0');
      }
    };
    const prepared = await build(data, h), candidate = structuredClone(tables), changed = new Set();
    for (const [index, change] of prepared.changes.entries()) {
      const key = change.table + '/' + change.record.id;
      if (changed.has(key)) fail('DuplicateChangeError', 'Duplicate change'); changed.add(key);
      const rowIndex = candidate[change.table].findIndex(row => row.id === change.record.id), previous = candidate[change.table][rowIndex];
      if (change.expectedRevision === null) { if (previous) fail('RevisionConflictError', 'Duplicate id'); candidate[change.table].push(change.record); }
      else { if (!previous || previous.revision !== change.expectedRevision) fail('RevisionConflictError', 'Stale record'); candidate[change.table][rowIndex] = change.record; }
      if (failureAfter === index + 1) { failureAfter = null; fail('AbortError', 'Simulated write failure'); }
    }
    d.validateDataset(candidate, { datasetId, today, throwOnError: true });
    tables = candidate; sequence = proposedSequence; revision++;
    const result = { operationId, activeRevision: revision, duplicate: false, result: prepared.result }; replay.set(operationId, { fingerprint, result }); return result;
  } };
  for (const file of ['services/animals', 'services/fosters', 'services/adoptions']) load(file);
  return { root, id, seed, org, catalog, location, contact, foster, create,
    get tables() { return tables; }, get revision() { return revision; },
    failureAfter(writes) { failureAfter = writes; },
    entryInput(overrides = {}) { return { animal: { name: 'Luna', speciesId: catalog.species.id, sizeId: catalog.size.id }, date: '2026-10-01',
      entryReason: 'Rescate', location: { kind: 'shelter', id: location.id }, availability: 'available', ...overrides }; }
  };
}
async function createAnimal(h) { return (await h.root.services.animals.registerEntry(h.entryInput())).result.animalId; }
async function application(h, animalId, date = '2026-10-02') {
  const appId = (await h.root.services.adoptions.createApplication({ animalId, contactId: h.contact.id, applicationDate: date })).result.applicationId;
  await h.root.services.adoptions.approve({ applicationId: appId, approvalDate: '2026-10-03' }); return appId;
}
function pending(h, animalId, title = 'Seguimiento') { return h.seed('tasks', { title, animalId, typeId: h.catalog.task_type.id, dueDate: '2026-11-01' }); }
test('entry→foster→approval→reservation→adoption with one fee→return preserves complete history and explicit task decisions', async () => {
  const h = harness(), s = h.root.services, animalId = await createAnimal(h);
  assert.equal(h.tables.animals[0].code, 'A-000001');
  const stayId = (await s.fosters.assign({ animalId, fosterProfileId: h.foster.id, startDate: '2026-10-02' })).result.fosterStayId;
  assert.equal(h.tables.animals[0].adoptionAvailability, 'available');
  const appId = await application(h, animalId);
  assert.equal(h.tables.reservations.length, 0, 'approval never creates reservation or adoption'); assert.equal(h.tables.adoptions.length, 0);
  await s.adoptions.reserve({ applicationId: appId, reservationDate: '2026-10-04', expiresOn: '2026-10-14' });
  const secondApp = (await s.adoptions.createApplication({ animalId, contactId: h.contact.id, applicationDate: '2026-10-05' })).result.applicationId;
  const keep = pending(h, animalId), cancel = pending(h, animalId, 'Traslado al refugio');
  const input = { applicationId: appId, adoptionDate: '2026-10-10', fosterEndReason: 'Adopción formalizada', reservationClosureReason: 'Adopción formalizada',
    otherApplicationsReason: 'El animal ha sido adoptado', taskDecisions: { keep: [keep.id], cancel: [{ id: cancel.id, reason: 'Ya no procede el traslado' }] },
    fee: { categoryId: h.catalog.finance_income.id, concept: 'Aportación de adopción', amountMinor: 12500 } };
  const command = { operationId: h.id(), expectedRevision: h.revision }, first = await s.adoptions.complete(input, command);
  const adoptionId = first.result.adoptionId;
  assert.equal(h.tables.animals[0].managementStatus, 'adopted'); assert.equal(h.tables.animals[0].locationKind, null);
  assert.equal(h.tables.fosterStays.find(row => row.id === stayId).endDate, '2026-10-10');
  assert.equal(h.tables.stayEpisodes[0].exitDate, '2026-10-10'); assert.equal(h.tables.reservations[0].status, 'fulfilled');
  assert.equal(h.tables.adoptionApplications.find(row => row.id === secondApp).status, 'cancelled');
  assert.equal(h.tables.tasks.find(row => row.id === keep.id).status, 'pending'); assert.equal(h.tables.tasks.find(row => row.id === cancel.id).status, 'cancelled');
  assert.equal(h.tables.financialMovements.length, 1); const events = h.tables.animalEvents.length;
  assert.equal((await s.adoptions.complete(input, command)).duplicate, true);
  assert.equal(h.tables.adoptions.length, 1); assert.equal(h.tables.financialMovements.length, 1); assert.equal(h.tables.animalEvents.length, events);
  await assert.rejects(s.adoptions.complete({ ...input, adoptionDate: '2026-10-11' }, command), { name: 'IdempotencyConflictError' });
  await s.adoptions.returnAdoption({ adoptionId, returnDate: '2026-10-12', reason: 'Cambio de circunstancias',
    location: { kind: 'shelter', id: h.location.id }, availability: 'unavailable' });
  assert.equal(h.tables.adoptions[0].returnDate, '2026-10-12'); assert.equal(h.tables.adoptions.length, 1);
  assert.equal(h.tables.stayEpisodes.length, 2); assert.equal(h.tables.stayEpisodes[0].exitDate, '2026-10-10');
  assert.equal(h.tables.stayEpisodes[1].entryType, 'return'); assert.equal(h.tables.stayEpisodes[1].returnedFromAdoptionId, adoptionId);
  assert.equal(h.tables.animals[0].managementStatus, 'under_care');
  assert.equal(h.root.domain.validateDataset(h.tables, { datasetId, today }).length, 0);
});
test('entry replay is idempotent and sequence survives removed animal through retained creation activity', async () => {
  const h = harness(), command = { operationId: h.id() }, input = h.entryInput();
  const original = await h.root.services.animals.registerEntry(input, command);
  assert.equal((await h.root.services.animals.registerEntry(input, command)).result.animalId, original.result.animalId);
  assert.equal(h.tables.animals.length, 1); assert.equal(h.tables.stayEpisodes.length, 1);
  // Simulated prior permanent deletion with its required dependency removal; retain activity code.
  h.tables.animals.length = 0; h.tables.stayEpisodes.length = 0; h.tables.animalEvents.length = 0; h.tables.activityLog[0].target = null;
  await assert.rejects(h.root.services.animals.registerEntry(h.entryInput({ animal: { code: 'A-000001', name: 'Otro', speciesId: h.catalog.species.id } })), /cannot be reused/);
  await h.root.services.animals.registerEntry(h.entryInput({ animal: { name: 'Sol', speciesId: h.catalog.species.id } }));
  assert.equal(h.tables.animals[0].code, 'A-000002');
});
test('builder rejects omitted task decisions and simulated mid-write failure leaves every source record intact', async () => {
  const h = harness(), animalId = await createAnimal(h), applicationId = await application(h, animalId);
  pending(h, animalId); const before = JSON.stringify(h.tables);
  await assert.rejects(h.root.services.adoptions.complete({ applicationId, adoptionDate: '2026-10-10' }), /every pending task/);
  assert.equal(JSON.stringify(h.tables), before);
  h.failureAfter(2);
  await assert.rejects(h.root.services.adoptions.complete({ applicationId, adoptionDate: '2026-10-10', taskDecisions: { keep: [h.tables.tasks[0].id], cancel: [] } }), { name: 'AbortError' });
  assert.equal(JSON.stringify(h.tables), before); assert.equal(h.tables.adoptions.length, 0);
});
test('duplicate open fosters are prohibited and explicit capacity/species exceptions require a persistent reason', async () => {
  const h = harness(), animalId = await createAnimal(h); h.tables.fosterProfiles[0].totalCapacity = 0;
  const input = { animalId, fosterProfileId: h.foster.id, startDate: '2026-10-02' };
  await assert.rejects(h.root.services.fosters.assign(input), /Confirm/);
  await assert.rejects(h.root.services.fosters.assign({ ...input, confirmException: true }), /reason/);
  await h.root.services.fosters.assign({ ...input, confirmException: true, exceptionReason: 'Acogida de urgencia revisada' });
  assert.equal(h.tables.fosterStays[0].exceptionReason, 'Acogida de urgencia revisada');
  await assert.rejects(h.root.services.fosters.assign({ ...input, confirmException: true, exceptionReason: 'Otra' }), /already has/);
});
test('ending foster and transfer keep reservation availability and reject inactive destinations', async () => {
  const h = harness(), animalId = await createAnimal(h), appId = await application(h, animalId);
  const stayId = (await h.root.services.fosters.assign({ animalId, fosterProfileId: h.foster.id, startDate: '2026-10-03' })).result.fosterStayId;
  await h.root.services.adoptions.reserve({ applicationId: appId, reservationDate: '2026-10-04' });
  await assert.rejects(h.root.services.animals.setAvailability({ animalId, availability: 'available' }), /active reservation/);
  h.tables.locations[0].active = false;
  await assert.rejects(h.root.services.fosters.end({ fosterStayId: stayId, endDate: '2026-10-05', endReason: 'Fin', location: { kind: 'shelter', id: h.location.id } }), /inactive/);
  h.tables.locations[0].active = true;
  await h.root.services.fosters.end({ fosterStayId: stayId, endDate: '2026-10-05', endReason: 'Vuelve al refugio', location: { kind: 'shelter', id: h.location.id } });
  assert.equal(h.tables.animals[0].locationKind, 'shelter'); assert.equal(h.tables.animals[0].adoptionAvailability, 'reserved');
  await h.root.services.animals.changeLocation({ animalId, date: '2026-10-06', reason: 'Visita temporal', location: { kind: 'temporary_external', description: 'Centro veterinario' } });
  assert.equal(h.tables.animals[0].externalLocationDescription, 'Centro veterinario');
});
test('reservation expires only after inclusive expiresOn and cancellation never completes the application', async () => {
  const h = harness(), animalId = await createAnimal(h), appId = await application(h, animalId);
  const reservationId = (await h.root.services.adoptions.reserve({ applicationId: appId, reservationDate: '2026-10-04', expiresOn: '2026-10-06' })).result.reservationId;
  const input = { reservationId, status: 'expired', date: '2026-10-06', reason: 'Reserva vencida', availability: 'available' };
  await assert.rejects(h.root.services.adoptions.closeReservation(input), /through its expiry/);
  await h.root.services.adoptions.closeReservation({ ...input, date: '2026-10-07' });
  assert.equal(h.tables.reservations[0].status, 'expired'); assert.equal(h.tables.adoptionApplications[0].status, 'approved'); assert.equal(h.tables.adoptions.length, 0);
  await h.root.services.adoptions.cancel({ applicationId: appId, date: '2026-10-08', reason: 'Interesado retira solicitud' });
  assert.equal(h.tables.adoptionApplications[0].status, 'cancelled');
});
test('death atomically closes episode, foster, reservation, applications and explicit task policy', async () => {
  const h = harness(), animalId = await createAnimal(h), appId = await application(h, animalId);
  await h.root.services.fosters.assign({ animalId, fosterProfileId: h.foster.id, startDate: '2026-10-02' });
  await h.root.services.adoptions.reserve({ applicationId: appId, reservationDate: '2026-10-04' });
  const task = pending(h, animalId);
  await h.root.services.animals.recordDeath({ animalId, date: '2026-10-10', reason: 'Fallecimiento comunicado',
    applicationClosureReason: 'Animal fallecido', reservationClosureReason: 'Animal fallecido',
    taskDecisions: { keep: [], cancel: [{ id: task.id, reason: 'Animal fallecido' }] } });
  assert.equal(h.tables.animals[0].managementStatus, 'deceased'); assert.equal(h.tables.animals[0].deceasedOn, '2026-10-10');
  assert.equal(h.tables.stayEpisodes[0].exitReason, 'deceased'); assert.equal(h.tables.fosterStays[0].endDate, '2026-10-10');
  assert.equal(h.tables.reservations[0].status, 'cancelled'); assert.equal(h.tables.adoptionApplications[0].status, 'cancelled');
  assert.equal(h.tables.tasks[0].status, 'cancelled'); assert.equal(h.tables.animals[0].locationKind, null);
  await assert.rejects(h.root.services.animals.recordDeath({ animalId, date: today, reason: 'Duplicado' }), /already recorded/);
});
test('a death after adoption conserves the adoption without inventing an operational episode', async () => {
  const h = harness(), animalId = await createAnimal(h), applicationId = await application(h, animalId);
  await h.root.services.adoptions.complete({ applicationId, adoptionDate: '2026-10-04' });
  await h.root.services.animals.recordDeath({ animalId, date: '2026-10-10', reason: 'Aviso del adoptante' });
  assert.equal(h.tables.adoptions.length, 1); assert.equal(h.tables.adoptions[0].returnDate, null);
  assert.equal(h.tables.stayEpisodes.length, 1); assert.equal(h.tables.stayEpisodes[0].exitReason, 'adoption');
  assert.equal(h.tables.animals[0].managementStatus, 'deceased');
});
test('other exit and later entry create separate episodes, maintain code and honor stale revisions', async () => {
  const h = harness(), animalId = await createAnimal(h);
  await h.root.services.animals.recordExit({ animalId, date: '2026-10-04', exitReason: 'transfer', reason: 'Traslado definitivo' });
  const oldRevision = h.revision;
  await h.root.services.animals.registerEntry({ animalId, date: '2026-10-06', entryReason: 'Nuevo rescate', location: { kind: 'shelter', id: h.location.id }, availability: 'available' });
  assert.equal(h.tables.stayEpisodes.length, 2); assert.equal(h.tables.stayEpisodes[0].exitDate, '2026-10-04'); assert.equal(h.tables.animals[0].code, 'A-000001');
  await assert.rejects(h.root.services.animals.update({ animalId, patch: { name: 'Edición antigua' } }, { expectedRevision: oldRevision }), { name: 'RevisionConflictError' });
  await assert.rejects(h.root.services.animals.update({ animalId, patch: { managementStatus: 'adopted' } }), /cannot be edited/);
});
test('normal workflows reject future facts, dates before entry, inactive catalogs and bypassed return', async () => {
  const h = harness(); h.tables.catalogOptions[0].active = false;
  await assert.rejects(h.root.services.animals.registerEntry(h.entryInput()), /active option/); h.tables.catalogOptions[0].active = true;
  await assert.rejects(h.root.services.animals.registerEntry(h.entryInput({ date: '2027-01-01' })), /date/);
  const animalId = await createAnimal(h);
  await assert.rejects(h.root.services.fosters.assign({ animalId, fosterProfileId: h.foster.id, startDate: '2026-09-30' }), /date/);
  const applicationId = await application(h, animalId); await h.root.services.adoptions.complete({ applicationId, adoptionDate: '2026-10-04' });
  await assert.rejects(h.root.services.animals.registerEntry({ animalId, date: '2026-10-05', entryReason: 'Incorrecta', location: { kind: 'shelter', id: h.location.id }, availability: 'available' }), /appropriate return/);
});
