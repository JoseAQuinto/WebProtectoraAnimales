'use strict';
// Simulated context.execute over the real domain validator: idempotency, stale revisions and atomic apply.
// It does not exercise IndexedDB; the browser suites in tests/integration cover persistence.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const base = ['namespace', 'utils/ids', 'utils/dates', 'utils/strings', 'utils/canonical-json', 'domain/enums',
  'domain/schemas', 'domain/validators', 'domain/dataset-validator'];
function harness({ datasetId, today, services, catalogKinds }) {
  const now = today + 'T12:00:00.000Z';
  const sandbox = vm.createContext({ window: { crypto: webcrypto }, Intl, Date, Blob, Uint8Array,
    TextDecoder, TextEncoder, ArrayBuffer, DataView });
  function load(file) { const name = path.resolve(__dirname, '../../../js/' + file + '.js'); vm.runInContext(fs.readFileSync(name, 'utf8'), sandbox, { filename: name }); }
  base.forEach(load);
  const root = sandbox.window.RescueManager, d = root.domain, id = () => root.utils.ids.uuidV4();
  let tables = Object.fromEntries(d.tableNames.map(table => [table, []])), revision = 0;
  const replay = new Map(), create = (table, input) => d.createRecord(table, input, { datasetId, now, today });
  const seed = (table, input) => { const row = create(table, input); tables[table].push(row); return row; };
  seed('organizationSettings', { name: 'Refugio ficticio', language: 'es', currencyCode: 'EUR', dateFormat: 'day_first', timeZone: 'Europe/Madrid' });
  const catalog = {};
  for (const kind of catalogKinds) catalog[kind] = seed('catalogOptions', { kind, code: kind + '_example', customLabel: kind });
  const location = seed('locations', { name: 'Refugio' });
  const fail = (name, message) => { const error = new Error(message); error.name = name; throw error; };
  root.services.context = {
    async snapshot() { return { datasetId, globalRevision: revision, tables: structuredClone(tables) }; },
    async execute(type, intent, build, command = {}) {
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
  services.forEach(file => load('services/' + file));
  return { root, id, seed, load, catalog, location, get tables() { return tables; }, get revision() { return revision; },
    row(table, rowId) { return tables[table].find(value => value.id === rowId); }, state() { return JSON.stringify(tables); } };
}
module.exports = { harness };
