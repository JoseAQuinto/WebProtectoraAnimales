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
  'services/finance', 'services/tasks', 'services/health']) {
  const filename = path.resolve(__dirname, '../../js/' + name + '.js');
  vm.runInContext(fs.readFileSync(filename, 'utf8'), sandbox, { filename });
}
const root = sandbox.window.RescueManager, d = root.domain;
const datasetId = '00000000-0000-4000-8000-000000000001', today = '2026-10-15';
function fail(name, message) { const error = new Error(message); error.name = name; throw error; }
function fixture() {
  let tables = Object.fromEntries(d.tableNames.map(name => [name, []])), revision = 0, clock = 0;
  const committed = new Map();
  function now() { return new Date(Date.UTC(2026, 9, 15, 12, 0, 0, clock++)).toISOString(); }
  function make(table, input) { const row = d.createRecord(table, input, { datasetId, today, now: now() }); tables[table].push(row); return row; }
  make('organizationSettings', { name: 'Test shelter', language: 'es', currencyCode: 'EUR', dateFormat: 'day_first', timeZone: 'Europe/Madrid' });
  const catalog = (kind, code) => make('catalogOptions', { kind, code, customLabel: code });
  const species = catalog('species', 'dog'), finance = catalog('finance_expense', 'veterinary');
  const vaccineType = catalog('task_type', 'vaccination'), medicationType = catalog('task_type', 'medication');
  const otherType = catalog('task_type', 'other'), planType = catalog('care_plan_type', 'treatment');
  const vet = make('contacts', { name: 'Veterinarian', roles: ['veterinarian'] });
  const location = make('locations', { name: 'Shelter' });
  const animal = make('animals', { name: 'Example animal', code: 'A-000001', speciesId: species.id,
    managementStatus: 'under_care', adoptionAvailability: 'available', locationKind: 'shelter', locationId: location.id });
  make('stayEpisodes', { animalId: animal.id, entryDate: '2026-10-01', entryReason: 'Rescue', entryType: 'first_entry' });
  root.services.context = {
    async execute(type, intent, build, command = {}) {
      const fingerprint = root.utils.canonicalJson.stringify({ type, intent });
      if (command.operationId && committed.has(command.operationId)) {
        const previous = committed.get(command.operationId);
        if (previous.fingerprint !== fingerprint) fail('IdempotencyConflictError', 'Operation intent changed');
        return previous.result;
      }
      if (command.expectedRevision !== undefined && command.expectedRevision !== revision) fail('RevisionConflictError', 'Stale view');
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
      committed.set(operationId, { fingerprint, result: receipt }); return receipt;
    }
  };
  return { finance, vaccineType, medicationType, otherType, planType, vet, animal, make, tables: () => tables,
    record(table, id) { return tables[table].find(row => row.id === id); },
    state() { return root.utils.canonicalJson.stringify(tables); } };
}
function task(f, changes = {}) { return { title: 'Vaccination appointment', dueDate: today, typeId: f.vaccineType.id, animalId: f.animal.id, ...changes }; }
function act(f, changes = {}) { return { animalId: f.animal.id, type: 'vaccination', date: today, title: 'Confirmed vaccination', veterinarianContactId: f.vet.id, ...changes }; }
test('scheduled acts remain pending regardless of due date and require an explicit clinical record', async () => {
  const f = fixture(); const id = (await root.services.tasks.create(task(f, { dueDate: '2026-10-01' }))).result.id;
  assert.equal(root.services.tasks.urgency(f.record('tasks', id), today), 'overdue');
  assert.equal(f.record('tasks', id).status, 'pending'); assert.equal(f.tables().veterinaryRecords.length, 0);
  const before = f.state();
  await assert.rejects(() => root.services.tasks.complete(id), { name: 'ClinicalRecordRequiredError' });
  assert.equal(f.state(), before);
});
test('health act, one expense, one task completion, event and activity commit together and replay once', async () => {
  const f = fixture(), taskId = (await root.services.tasks.create(task(f))).result.id, operationId = webcrypto.randomUUID();
  const options = { completeTaskId: taskId, expense: { categoryId: f.finance.id, concept: 'Vaccination invoice', amountMinor: 1234 } };
  const first = await root.services.health.record(act(f), options, { operationId });
  const replay = await root.services.health.record(act(f), options, { operationId });
  assert.deepEqual(replay, first); assert.equal(f.tables().veterinaryRecords.length, 1); assert.equal(f.tables().financialMovements.length, 1);
  assert.equal(f.tables().animalEvents.length, 1); assert.equal(f.record('tasks', taskId).status, 'completed');
  const clinical = f.tables().veterinaryRecords[0], expense = f.tables().financialMovements[0];
  assert.equal(clinical.sourceTaskId, taskId); assert.equal(clinical.expenseMovementId, expense.id); assert.equal(expense.source.id, clinical.id);
  assert.equal(root.services.finance.totals(f.tables().financialMovements).expenseMinor, 1234);
  assert.equal(f.tables().animalEvents[0].source.id, clinical.id);
  const before = f.state();
  await assert.rejects(() => root.services.health.record(act(f), options), { name: 'InvalidStateError' });
  assert.equal(f.state(), before);
});
test('sterilization updates animal and clinical record on the same confirmed date', async () => {
  const f = fixture(); await root.services.health.record(act(f, { type: 'sterilization', title: 'Sterilization' }));
  assert.equal(f.record('animals', f.animal.id).sterilizationStatus, 'yes'); assert.equal(f.record('animals', f.animal.id).sterilizationDate, today);
  assert.equal(f.tables().animalEvents[0].type, 'sterilization');
  const before = f.state();
  await assert.rejects(() => root.services.health.record(act(f, { type: 'sterilization', date: '2026-10-14' })), { name: 'InvalidStateError' });
  assert.equal(f.state(), before);
});
test('failed cost or relationship validation preserves the pending task and all original records', async () => {
  const f = fixture(), taskId = (await root.services.tasks.create(task(f))).result.id, before = f.state();
  await assert.rejects(() => root.services.health.record(act(f), { completeTaskId: taskId,
    expense: { categoryId: f.finance.id, concept: 'Invoice', amountMinor: 1.5 } }), { name: 'ValidationError' });
  assert.equal(f.state(), before);
  await assert.rejects(() => root.services.health.record(act(f, { veterinarianContactId: webcrypto.randomUUID() }), { completeTaskId: taskId,
    expense: { categoryId: f.finance.id, concept: 'Invoice', amountMinor: 1000 } }), { name: 'ValidationError' });
  assert.equal(f.state(), before); assert.equal(f.record('tasks', taskId).status, 'pending');
});
test('existing veterinary expense can cover explicit multiple acts without another financial movement', async () => {
  const f = fixture(); const expenseId = (await root.services.finance.create({ direction: 'expense', date: today,
    categoryId: f.finance.id, concept: 'Combined invoice', amountMinor: 5000, animalId: f.animal.id })).result.id;
  await root.services.health.record(act(f), { expenseMovementId: expenseId });
  await root.services.health.record(act(f, { type: 'checkup', title: 'Checkup' }), { expenseMovementId: expenseId });
  assert.equal(f.tables().veterinaryRecords.length, 2); assert.equal(f.tables().financialMovements.length, 1);
  assert.equal(root.services.finance.totals(f.tables().financialMovements).expenseMinor, 5000);
  await assert.rejects(() => root.services.health.record(act(f), { expenseMovementId: expenseId, expense: {} }), { name: 'InvalidInputError' });
});
test('future performed dates and a mismatched scheduled clinical type are rejected', async () => {
  const f = fixture(), taskId = (await root.services.tasks.create(task(f))).result.id, before = f.state();
  await assert.rejects(() => root.services.health.record(act(f, { date: '2026-10-16' }), { completeTaskId: taskId }), { name: 'ValidationError' });
  await assert.rejects(() => root.services.health.record(act(f, { type: 'checkup' }), { completeTaskId: taskId }), { name: 'InvalidInputError' });
  assert.equal(f.state(), before);
});
test('ordinary tasks support local time, explicit transitions, cancellation reasons and closed-state protection', async () => {
  const f = fixture(); const id = (await root.services.tasks.create(task(f, { typeId: f.otherType.id, dueLocalTime: '09:30' }))).result.id;
  assert.equal(f.record('tasks', id).timeZone, 'Europe/Madrid');
  await root.services.tasks.edit(id, { status: 'in_progress', notes: '<script>plain text only</script>' });
  assert.equal(f.record('tasks', id).status, 'in_progress');
  await assert.rejects(() => root.services.tasks.edit(id, { status: 'completed' }), { name: 'InvalidStateError' });
  await root.services.tasks.complete(id, { date: today });
  assert.equal(f.record('tasks', id).completedOn, today); assert.equal(f.tables().veterinaryRecords.length, 0);
  await assert.rejects(() => root.services.tasks.edit(id, { title: 'Overwrite closed task' }), { name: 'InvalidStateError' });
  const cancelled = (await root.services.tasks.create(task(f, { typeId: f.otherType.id }))).result.id;
  const before = f.state(); await assert.rejects(() => root.services.tasks.cancel(cancelled, {}), { name: 'ValidationError' }); assert.equal(f.state(), before);
  await root.services.tasks.cancel(cancelled, { reason: 'No longer needed' });
  assert.equal(f.record('tasks', cancelled).cancellationReason, 'No longer needed');
});
test('care plan tasks are finite and closing a plan requires resolving the remaining tasks', async () => {
  const f = fixture(); const planId = (await root.services.health.createPlan({ animalId: f.animal.id, typeId: f.planType.id,
    name: 'Written treatment', startDate: '2026-10-10', status: 'active', doseInstructions: 'Instructions provided by the veterinarian' })).result.id;
  const firstInput = task(f, { typeId: f.medicationType.id }); delete firstInput.animalId;
  const firstTask = (await root.services.health.scheduleTask(planId, firstInput)).result.id;
  const secondInput = task(f, { typeId: f.medicationType.id }); delete secondInput.animalId;
  const secondTask = (await root.services.health.scheduleTask(planId, secondInput)).result.id;
  assert.equal(f.tables().tasks.length, 2);
  assert.equal(f.record('carePlans', planId).doseInstructions, 'Instructions provided by the veterinarian');
  const before = f.state();
  await assert.rejects(() => root.services.health.updatePlan(planId, { status: 'completed' }), { name: 'InvalidStateError' });
  await assert.rejects(() => root.services.health.record(act(f, { type: 'medication_administration' }), { completeTaskId: firstTask, completePlan: true }), { name: 'InvalidStateError' });
  assert.equal(f.state(), before);
  await root.services.tasks.cancel(secondTask, { reason: 'Veterinarian changed the schedule' });
  await root.services.health.record(act(f, { type: 'medication_administration' }), { completeTaskId: firstTask, completePlan: true });
  assert.equal(f.record('carePlans', planId).status, 'completed'); assert.equal(f.tables().tasks.length, 2);
  assert.equal(f.tables().veterinaryRecords[0].carePlanId, planId);
  await assert.rejects(() => root.services.health.updatePlan(planId, { status: 'active' }), { name: 'InvalidStateError' });
});
test('task filters and urgency derive from the same rows without changing their status', async () => {
  const f = fixture();
  await root.services.tasks.create(task(f, { dueDate: today, priority: 'urgent' }));
  await root.services.tasks.create(task(f, { dueDate: '2026-10-22', priority: 'high' }));
  await root.services.tasks.create(task(f, { dueDate: '2026-10-23', priority: 'low' }));
  const rows = root.services.tasks.list(f.tables(), { status: ['pending'], priority: ['urgent', 'high'], from: today, to: '2026-10-22' });
  assert.equal(rows.length, 2); assert.equal(root.services.tasks.urgency(rows[0], today), 'today');
  assert.equal(root.services.tasks.urgency(rows[1], today), 'next_week');
  assert.equal(root.services.tasks.urgency(f.tables().tasks[2], today), 'later');
  assert.equal(f.tables().tasks.every(row => row.status === 'pending'), true);
});
