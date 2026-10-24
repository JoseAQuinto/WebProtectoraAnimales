'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), { harness } = require('./support/service-harness.cjs');
const datasetId = '70000000-0000-4000-8000-000000000001', today = '2026-10-24';
// Pure validator contract; the repository decides when rows are trusted (tests/e2e/write-through-ui.cjs).
function setup() {
  const h = harness({ datasetId, today, services: ['contacts'], catalogKinds: ['species'] });
  const freeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value) && !(value instanceof Blob)) { Object.freeze(value); Object.values(value).forEach(freeze); } return value; };
  return { h, d: h.root.domain, freeze };
}
const tablesOf = (h, extra = {}) => ({ ...structuredClone(h.tables), ...extra });

test('trusted frozen rows skip only their own checks; relations and global rules still run over every row', async () => {
  const { h, d, freeze } = setup();
  await h.root.services.contacts.create({ type: 'person', name: 'Válido', roles: [], phones: [], notes: '' });
  const tables = tablesOf(h), contact = tables.contacts[0];
  // A row whose own field rule fails (name too long) but that the caller asserts it validated before.
  const altered = freeze({ ...contact, id: h.id(), name: 'x'.repeat(121) });
  tables.contacts.push(altered); freeze(tables);
  assert.throws(() => d.validateDataset(tables, { datasetId, today, throwOnError: true }), { name: 'ValidationError' });
  assert.doesNotThrow(() => d.validateDataset(tables, { datasetId, today, throwOnError: true, trusted: new WeakSet([altered]) }));
  // Relations are not skipped: a trusted row pointing to a missing record is still rejected.
  const broken = freeze({ ...contact, id: h.id(), mergedIntoContactId: h.id() });
  const next = { ...tables, contacts: [...tables.contacts, broken] };
  assert.throws(() => d.validateDataset(next, { datasetId, today, throwOnError: true, trusted: new WeakSet([altered, broken]) }), error => error.name === 'ValidationError' && JSON.stringify(error.details).includes('reference.missing'));
});

test('trust needs the same frozen object: copies, unfrozen rows and other WeakSet-like values are validated', async () => {
  const { h, d, freeze } = setup();
  await h.root.services.contacts.create({ type: 'person', name: 'Base', roles: [], phones: [], notes: '' });
  const tables = tablesOf(h), bad = { ...tables.contacts[0], id: h.id(), name: '' };
  tables.contacts.push(bad);
  assert.throws(() => d.validateDataset(tables, { datasetId, today, throwOnError: true, trusted: new WeakSet([bad]) }), { name: 'ValidationError' }, 'unfrozen row trusted');
  freeze(bad);
  assert.throws(() => d.validateDataset(tables, { datasetId, today, throwOnError: true, trusted: new Set([bad]) }), { name: 'ValidationError' }, 'non-WeakSet trusted');
  const copy = freeze({ ...bad }); tables.contacts[tables.contacts.length - 1] = copy;
  assert.throws(() => d.validateDataset(tables, { datasetId, today, throwOnError: true, trusted: new WeakSet([bad]) }), { name: 'ValidationError' }, 'copy trusted');
});

test('duplicate identifiers and unique indexes are still detected among trusted rows', async () => {
  const { h, d, freeze } = setup();
  await h.root.services.contacts.create({ type: 'person', name: 'Uno', roles: [], phones: [], notes: '' });
  const tables = tablesOf(h), row = freeze(tables.contacts[0]), twin = freeze({ ...row });
  tables.contacts.push(twin); freeze(tables);
  assert.throws(() => d.validateDataset(tables, { datasetId, today, throwOnError: true, trusted: new WeakSet([row, twin]) }), error => JSON.stringify(error.details).includes('record.duplicateId'));
});
