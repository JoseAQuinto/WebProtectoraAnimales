'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const sandbox = vm.createContext({ window: { crypto: webcrypto }, Intl, Blob, Uint8Array });
for (const name of ['namespace', 'utils/ids', 'utils/dates', 'utils/strings', 'utils/canonical-json',
  'domain/enums', 'domain/schemas', 'domain/validators', 'domain/dataset-validator',
  'services/finance', 'services/inventory', 'services/donations']) {
  const filename = path.resolve(__dirname, '../../js/' + name + '.js');
  vm.runInContext(fs.readFileSync(filename, 'utf8'), sandbox, { filename });
}
const root = sandbox.window.RescueManager, d = root.domain;
const datasetId = '00000000-0000-4000-8000-000000000001';
const today = '2026-10-15';
function fail(name, message) { const error = new Error(message); error.name = name; throw error; }
function fixture() {
  let tables = Object.fromEntries(d.tableNames.map(name => [name, []])), revision = 0, clock = 0;
  const committed = new Map();
  function now() { return new Date(Date.UTC(2026, 9, 15, 12, 0, 0, clock++)).toISOString(); }
  function make(table, input) { const row = d.createRecord(table, input, { datasetId, today, now: now() }); tables[table].push(row); return row; }
  make('organizationSettings', { name: 'Test shelter', language: 'es', currencyCode: 'EUR', dateFormat: 'day_first', timeZone: 'Europe/Madrid' });
  const catalogs = {};
  for (const kind of d.enums.catalogKind) catalogs[kind] = make('catalogOptions', { kind, code: kind, customLabel: kind });
  const donor = make('contacts', { name: 'Example donor', roles: ['donor', 'supplier'] });
  const location = make('locations', { name: 'Shelter' });
  const animal = make('animals', { name: 'Example animal', code: 'A-000001', speciesId: catalogs.species.id,
    managementStatus: 'under_care', adoptionAvailability: 'available', locationKind: 'shelter', locationId: location.id });
  make('stayEpisodes', { animalId: animal.id, entryDate: today, entryReason: 'Rescue', entryType: 'first_entry' });
  root.services.context = {
    async execute(type, intent, build, command = {}) {
      const fingerprint = root.utils.canonicalJson.stringify({ type, intent });
      if (command.operationId && committed.has(command.operationId)) {
        const previous = committed.get(command.operationId);
        if (previous.fingerprint !== fingerprint) fail('IdempotencyConflictError', 'Operation intent changed');
        return previous.result;
      }
      if (command.expectedRevision !== undefined && command.expectedRevision !== revision) fail('RevisionConflictError', 'Stale dataset revision');
      const draft = structuredClone(tables), timestamp = now(), operationId = command.operationId || webcrypto.randomUUID();
      const h = { now: timestamp, today, operationId, fail,
        find(table, id) { const row = draft[table].find(value => value.id === id); if (!row) fail('RecordNotFoundError', 'Missing record'); return row; },
        create(table, input) { return d.createRecord(table, input, { datasetId, today, now: timestamp }); },
        edit(table, previous, patch) { return d.createRecord(table, { ...previous, ...patch, updatedAt: timestamp, revision: previous.revision + 1 }, { datasetId, today, now: timestamp }); },
        insert(table, record) { return { table, record, expectedRevision: null }; },
        replace(table, record) { return { table, record, expectedRevision: record.revision - 1 }; }
      };
      const result = await build(draft, h);
      for (const change of result.changes) {
        const index = draft[change.table].findIndex(row => row.id === change.record.id);
        if (change.expectedRevision === null) { assert.equal(index, -1); draft[change.table].push(change.record); }
        else { assert.notEqual(index, -1); assert.equal(draft[change.table][index].revision, change.expectedRevision); draft[change.table][index] = change.record; }
      }
      d.validateDataset(draft, { datasetId, today, throwOnError: true });
      tables = draft; revision++;
      const receipt = { result: result.result, activeRevision: revision };
      committed.set(operationId, { fingerprint, result: receipt });
      return receipt;
    }
  };
  return { catalogs, donor, animal, make, tables: () => tables,
    record(table, id) { return tables[table].find(row => row.id === id); },
    state() { return root.utils.canonicalJson.stringify(tables); } };
}
async function item(f, overrides = {}) {
  return (await root.services.inventory.createItem({ name: 'Food', categoryId: f.catalogs.inventory_category.id,
    unitId: f.catalogs.unit.id, quantityPrecision: 3, minimumStockScaled: 5000, ...overrides })).result.id;
}
function monetary(f, overrides = {}) { return { date: today, donorContactId: f.donor.id, categoryId: f.catalogs.finance_income.id,
  concept: 'Example donation', amountMinor: 1234, ...overrides }; }
function line(f, id, overrides = {}) { return { materialTypeId: f.catalogs.material_type.id, description: 'Food bag',
  quantityScaled: 10000, quantityPrecision: 3, unitId: f.catalogs.unit.id, inventoryItemId: id, ...overrides }; }
test('monetary donation creates one linked income and replays without duplicates', async () => {
  const f = fixture(), operationId = webcrypto.randomUUID();
  const first = await root.services.donations.createMonetary(monetary(f), { operationId });
  const again = await root.services.donations.createMonetary(monetary(f), { operationId });
  assert.deepEqual(again, first); assert.equal(f.tables().donations.length, 1); assert.equal(f.tables().financialMovements.length, 1);
  const donation = f.tables().donations[0], movement = f.tables().financialMovements[0];
  assert.equal(donation.financialMovementId, movement.id); assert.equal(movement.source.id, donation.id);
  assert.equal(root.services.finance.totals(f.tables().financialMovements).incomeMinor, 1234);
  const before = f.state();
  await assert.rejects(() => root.services.donations.createMonetary(monetary(f, { amountMinor: 500 }), { operationId }), { name: 'IdempotencyConflictError' });
  assert.equal(f.state(), before);
});
test('finance correction preserves original and atomically reassigns the donation', async () => {
  const f = fixture();
  const created = (await root.services.donations.createMonetary(monetary(f))).result;
  const corrected = (await root.services.finance.correct(created.financialMovementId, { amountMinor: 2222, concept: 'Correct amount' }, { reason: 'Entry typo' })).result;
  const old = f.record('financialMovements', created.financialMovementId), next = f.record('financialMovements', corrected.id);
  assert.equal(old.status, 'voided'); assert.equal(old.replacementMovementId, next.id); assert.equal(next.correctsMovementId, old.id);
  assert.equal(f.record('donations', created.id).financialMovementId, next.id);
  assert.equal(root.services.finance.totals(f.tables().financialMovements).incomeMinor, 2222);
  await root.services.donations.void(created.id, { reason: 'Returned funds' });
  assert.equal(f.record('donations', created.id).status, 'voided'); assert.equal(f.record('financialMovements', next.id).status, 'voided');
  assert.equal(root.services.finance.totals(f.tables().financialMovements).incomeMinor, 0);
  const before = f.state();
  await assert.rejects(() => root.services.finance.correct(old.id, { amountMinor: 1000 }, { reason: 'Again' }), { name: 'InvalidStateError' });
  assert.equal(f.state(), before);
});
test('voiding a linked income from Finance also voids its monetary donation', async () => {
  const f = fixture(); const created = (await root.services.donations.createMonetary(monetary(f))).result;
  await root.services.finance.void(created.financialMovementId, { reason: 'Duplicate paper entry' });
  assert.equal(f.record('donations', created.id).status, 'voided');
  assert.equal(f.tables().financialMovements.length, 1); assert.equal(root.services.finance.totals(f.tables().financialMovements).balanceMinor, 0);
});
test('correcting a veterinary expense updates the existing clinical backlink and counts once', async () => {
  const f = fixture();
  const expense = (await root.services.finance.create({ direction: 'expense', date: today, categoryId: f.catalogs.finance_expense.id,
    concept: 'Examination', amountMinor: 5000, animalId: f.animal.id })).result.id;
  const vet = f.make('veterinaryRecords', { animalId: f.animal.id, type: 'checkup', date: today, title: 'Examination', expenseMovementId: expense });
  const next = (await root.services.finance.correct(expense, { amountMinor: 7500 }, { reason: 'Corrected invoice' })).result.id;
  assert.equal(f.record('veterinaryRecords', vet.id).expenseMovementId, next);
  assert.equal(root.services.finance.totals(f.tables().financialMovements).expenseMinor, 7500);
  await root.services.finance.void(next, { reason: 'Refunded' });
  assert.equal(root.services.finance.totals(f.tables().financialMovements).expenseMinor, 0);
});
test('material lines create stock once and never add monetary income', async () => {
  const f = fixture(), id = await item(f), operationId = webcrypto.randomUUID();
  const input = { date: today, donorContactId: f.donor.id, lines: [line(f, id), line(f, id, { quantityScaled: 2000 })] };
  const first = await root.services.donations.createMaterial(input, { operationId });
  await root.services.donations.createMaterial(input, { operationId });
  assert.equal(f.tables().donations.length, 1); assert.equal(f.tables().donationLines.length, 2); assert.equal(f.tables().inventoryMovements.length, 2);
  assert.equal(root.services.inventory.stock(f.tables(), id).quantityScaled, 12000); assert.equal(f.tables().financialMovements.length, 0);
  assert.equal(new Set(f.tables().inventoryMovements.map(row => row.originKey)).size, 2);
  await root.services.donations.void(first.result.id, { reason: 'Goods returned' });
  assert.equal(root.services.inventory.stock(f.tables(), id).quantityScaled, 0);
  assert.equal(f.tables().inventoryMovements.length, 4); assert.equal(f.tables().donationLines.length, 2);
});
test('material void that would leave negative stock rolls back every line and donation status', async () => {
  const f = fixture(), id = await item(f);
  const donation = (await root.services.donations.createMaterial({ date: today, lines: [line(f, id)] })).result;
  const consumption = (await root.services.inventory.move({ itemId: id, date: today, type: 'consumption', deltaScaled: -5000, reason: 'Feeding' })).result.id;
  const before = f.state();
  await assert.rejects(() => root.services.donations.void(donation.id, { reason: 'Return' }), { name: 'ValidationError' });
  assert.equal(f.state(), before); assert.equal(f.record('donations', donation.id).status, 'recorded');
  assert.equal(root.services.inventory.stock(f.tables(), id).quantityScaled, 5000);
  await root.services.inventory.compensate(consumption, { reason: 'Consumption was entered twice' });
  assert.equal(root.services.inventory.stock(f.tables(), id).quantityScaled, 10000);
  await root.services.donations.void(donation.id, { reason: 'Returned' });
  assert.equal(root.services.inventory.stock(f.tables(), id).quantityScaled, 0);
});
test('stock rejects historical negatives, duplicate compensation and direct compensation of donation lines', async () => {
  const f = fixture(), id = await item(f);
  const opening = (await root.services.inventory.move({ itemId: id, date: today, type: 'opening_balance', deltaScaled: 3000, reason: 'Counted goods' })).result.id;
  const before = f.state();
  await assert.rejects(() => root.services.inventory.move({ itemId: id, date: '2026-10-14', type: 'consumption', deltaScaled: -1000, reason: 'Earlier use' }), { name: 'ValidationError' });
  assert.equal(f.state(), before);
  await root.services.inventory.compensate(opening, { reason: 'Incorrect opening balance' });
  assert.equal(root.services.inventory.stock(f.tables(), id).quantityScaled, 0);
  await assert.rejects(() => root.services.inventory.compensate(opening, { reason: 'Again' }), { name: 'InvalidStateError' });
  const donation = (await root.services.donations.createMaterial({ date: today, lines: [line(f, id)] })).result.id;
  const movementId = f.tables().donationLines.find(row => row.donationId === donation).inventoryMovementId;
  await assert.rejects(() => root.services.inventory.compensate(movementId, { reason: 'Wrong path' }), { name: 'InvalidStateError' });
});
test('incompatible material scale rejects the complete atomic donation', async () => {
  const f = fixture(), id = await item(f), before = f.state();
  await assert.rejects(() => root.services.donations.createMaterial({ date: today, lines: [line(f, id), line(f, id, { quantityPrecision: 0 })] }), { name: 'ValidationError' });
  assert.equal(f.state(), before); assert.equal(f.tables().donations.length, 0); assert.equal(f.tables().inventoryMovements.length, 0);
});
test('inventory minimum indicators, archive and integer quantities are exact', async () => {
  const f = fixture(), id = await item(f);
  assert.equal(root.services.inventory.stock(f.tables(), id).belowMinimum, true);
  await root.services.inventory.move({ itemId: id, date: today, type: 'adjustment', deltaScaled: 5000, reason: 'Initial count correction' });
  assert.equal(root.services.inventory.stock(f.tables(), id).atMinimum, true);
  await root.services.inventory.archive(id);
  assert.equal(f.record('inventoryItems', id).status, 'archived');
  await assert.rejects(() => root.services.inventory.move({ itemId: id, date: today, type: 'purchase', deltaScaled: 1, reason: 'New goods' }), { name: 'InvalidStateError' });
  assert.equal(root.services.inventory.stock(f.tables(), id).quantityScaled, 5000);
});
test('money refuses mixed currency, wrong categories, floats, unsafe totals and injected technical fields', async () => {
  const f = fixture(), valid = { direction: 'expense', date: today, categoryId: f.catalogs.finance_expense.id, concept: 'Expense', amountMinor: 100 };
  const before = f.state();
  for (const patch of [{ currencyCode: 'USD' }, { categoryId: f.catalogs.finance_income.id }, { amountMinor: 1.1 },
    { amountMinor: Number.MAX_SAFE_INTEGER + 1 }, { id: webcrypto.randomUUID() }, { source: { type: 'donation', id: webcrypto.randomUUID() } }]) {
    await assert.rejects(() => root.services.finance.create({ ...valid, ...patch })); assert.equal(f.state(), before);
  }
  assert.throws(() => root.services.finance.totals([{ status: 'posted', direction: 'income', amountMinor: Number.MAX_SAFE_INTEGER },
    { status: 'posted', direction: 'income', amountMinor: 1 }]), /safe integer/);
  assert.equal(root.services.finance.totals([{ status: 'posted', direction: 'expense', amountMinor: 123, date: '2026-10-01' },
    { status: 'voided', direction: 'income', amountMinor: 999, date: today }], { from: today }).balanceMinor, 0);
});
