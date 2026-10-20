'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), { harness: build } = require('./support/service-harness.cjs');
// Values cross the vm realm; compare plain JSON shapes.
const same = (actual, expected) => assert.deepEqual(JSON.parse(JSON.stringify(actual)), JSON.parse(JSON.stringify(expected)));
const datasetId = '60000000-0000-4000-8000-000000000001', today = '2026-10-20';
// Service-harness only: IndexedDB guards, cancellation and rollback are exercised by tests/e2e/trash-purge-ui.cjs.
function harness() {
  const h = build({ datasetId, today, catalogKinds: ['species', 'document_type', 'finance_expense'], services: ['animals', 'contacts', 'weights', 'finance'] });
  ['config', 'utils/integrity', 'utils/files', 'services/documents', 'domain/asset-references', 'domain/trash-closure', 'services/trash-purge'].forEach(h.load);
  return h;
}
async function closedAnimal(h, name = 'Animal ficticio') {
  const s = h.root.services, id = (await s.animals.registerEntry({ animal: { name, speciesId: h.catalog.species.id }, date: '2026-10-10', entryReason: 'Prueba', location: { kind: 'shelter', id: h.location.id }, availability: 'available' })).result.animalId;
  await s.weights.record({ animalId: id, date: '2026-10-11', grams: 4200 });
  await s.animals.recordExit({ animalId: id, date: '2026-10-12', exitReason: 'other', reason: 'Salida documentada' });
  return id;
}
const analyze = (h, table, id) => h.root.domain.trashClosure.analyze(h.tables, table, id, { today });
const without = (h, value) => Object.fromEntries(Object.entries(h.tables).map(([name, rows]) => [name, rows.filter(row => !value.records.some(record => record.id === row.id))]));

test('a trashed closed animal removes its owned history, measurements and logs and leaves a valid dataset', async () => {
  const h = harness(), id = await closedAnimal(h), other = await closedAnimal(h, 'Otro animal');
  await h.root.services.animals.trash(id);
  const value = analyze(h, 'animals', id);
  assert.equal(value.blocked, false, JSON.stringify(value.blockers));
  for (const table of ['animals', 'stayEpisodes', 'weightMeasurements', 'animalEvents', 'activityLog']) assert.ok(value.counts[table] > 0, table + ' not removed');
  assert.ok(value.records.every(record => record.table !== 'animals' || record.id === id), 'Another animal joined the closure');
  const next = without(h, value);
  assert.equal(next.animals.length, 1); assert.equal(next.animals[0].id, other); assert.ok(next.animalEvents.every(row => row.animalId === other));
  assert.doesNotThrow(() => h.root.domain.validateDataset(next, { datasetId, today, throwOnError: true }));
  same(h.root.domain.trashClosure.roots(h.tables).map(row => [row.table, row.id]), [['animals', id]]);
});

test('economic history, open care and records outside the trash block permanent deletion', async () => {
  const h = harness(), s = h.root.services, id = await closedAnimal(h);
  await s.finance.create({ direction: 'expense', date: '2026-10-11', categoryId: h.catalog.finance_expense.id, concept: 'Gasto ficticio', amountMinor: 1500, animalId: id });
  await s.animals.trash(id);
  const value = analyze(h, 'animals', id);
  assert.equal(value.blocked, true); same(value.blockers.map(row => [row.reason, row.table]), [['referenced', 'financialMovements']]);
  const caring = (await s.animals.registerEntry({ animal: { name: 'Bajo cuidado', speciesId: h.catalog.species.id }, date: '2026-10-10', entryReason: 'Prueba', location: { kind: 'shelter', id: h.location.id }, availability: 'available' })).result.animalId;
  same(analyze(h, 'animals', caring).blockers.map(row => row.reason), ['notInTrash', 'underCare']);
  same(analyze(h, 'animals', h.id()).blockers.map(row => row.reason), ['missing']);
});

test('a trashed document takes its links, document events and unused file; the linked animal is kept', async () => {
  const h = harness(), id = await closedAnimal(h);
  const created = (await h.root.services.documents.createEmbedded({ title: 'Informe ficticio', typeId: h.catalog.document_type.id, date: '2026-10-11', links: [{ entityType: 'animal', entityId: id }] }, new File(['Informe ñ'], 'informe.txt', { type: 'text/plain' }))).result;
  await h.root.services.documents.trash(created.id);
  const value = analyze(h, 'documents', created.id);
  assert.equal(value.blocked, false, JSON.stringify(value.blockers));
  assert.equal(value.counts.documentLinks, 1); assert.equal(value.counts.assets, 1); assert.equal(value.assets[0].id, created.assetId); assert.equal(value.affected.animals, 1);
  assert.ok(!value.counts.animals, 'Linked animal removed');
  assert.doesNotThrow(() => h.root.domain.validateDataset(without(h, value), { datasetId, today, throwOnError: true }));
});

test('trashed contacts and measurements take only themselves and their bookkeeping rows', async () => {
  const h = harness(), s = h.root.services, contact = (await s.contacts.create({ type: 'person', name: 'Contacto ficticio', roles: [], phones: [], notes: '' })).result.id;
  await s.contacts.trash(contact);
  const value = analyze(h, 'contacts', contact);
  same(Object.keys(value.counts).sort(), ['activityLog', 'contacts']); assert.equal(value.blocked, false);
  const animal = await closedAnimal(h), weight = h.tables.weightMeasurements.find(row => row.animalId === animal).id;
  await s.weights.trash(weight);
  const measured = analyze(h, 'weightMeasurements', weight);
  same(Object.keys(measured.counts).sort(), ['activityLog', 'weightMeasurements']); assert.equal(measured.affected.animals, 1);
});

function service() {
  const h = harness(), calls = [];
  const original = h.root.services.context.snapshot;
  h.root.services.context.snapshot = async () => ({ ...await original(), dataRevision: 4 });
  h.root.services.context.options = value => ({ datasetId: value.datasetId, expectedRevision: value.globalRevision, owner: 'owner', leaseToken: 'lease' });
  h.root.storage = { ...h.root.storage, error: (name, message) => Object.assign(new Error(message), { name }),
    trashPurge: { remove: async (plan, options) => { calls.push({ plan, options }); return { duplicate: false, revision: 9, result: { records: plan.records.length } }; } } };
  return { h, s: h.root.services.trashPurge, calls };
}

test('trash review is read-only, frozen and labelled; only confirmed unblocked private reports reach storage once', async () => {
  const { h, s, calls } = service(), id = await closedAnimal(h);
  await h.root.services.animals.trash(id);
  const listed = await s.list(); assert.equal(listed.total, 1); assert.equal(listed.rows[0].title, 'Animal ficticio');
  const before = h.state(), report = await s.preview('animals', id);
  assert.equal(h.state(), before); assert.equal(Object.isFrozen(report.records[0]), true); assert.equal(report.dataRevision, 4);
  await assert.rejects(s.apply({ ...report }, { confirmed: true, copyConfirmed: true }), { name: 'InvalidInputError' });
  for (const decision of [{}, { confirmed: true }, { copyConfirmed: true }]) await assert.rejects(s.apply(report, decision), { name: 'ConfirmationRequiredError' });
  assert.equal(calls.length, 0);
  await s.apply(report, { confirmed: true, copyConfirmed: true }); assert.equal((await s.apply(report, { confirmed: true, copyConfirmed: true })).duplicate, true);
  assert.equal(calls.length, 1); same(calls[0].plan.records, report.records); assert.equal(calls[0].options.expectedRevision, report.revision);
});

test('a blocked review never reaches storage', async () => {
  const { h, s, calls } = service(), id = await closedAnimal(h);
  await h.root.services.finance.create({ direction: 'expense', date: '2026-10-11', categoryId: h.catalog.finance_expense.id, concept: 'Gasto ficticio', amountMinor: 900, animalId: id });
  await h.root.services.animals.trash(id);
  const report = await s.preview('animals', id); assert.equal(report.blocked, true);
  await assert.rejects(s.apply(report, { confirmed: true, copyConfirmed: true }), { name: 'InvalidStateError' }); assert.equal(calls.length, 0);
});
