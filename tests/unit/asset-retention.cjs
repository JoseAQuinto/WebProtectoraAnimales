'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), { harness: build } = require('./support/service-harness.cjs');
// Values cross the vm realm; compare plain JSON shapes.
const same = (actual, expected) => assert.deepEqual(JSON.parse(JSON.stringify(actual)), JSON.parse(JSON.stringify(expected)));
const datasetId = '50000000-0000-4000-8000-000000000001', today = '2026-10-20';
// Service-harness only: IndexedDB guards, cancellation and rollback are exercised by tests/e2e/asset-retention-ui.cjs.
function harness() {
  const h = build({ datasetId, today, catalogKinds: ['species', 'document_type'], services: ['animals', 'contacts'] });
  ['config', 'utils/integrity', 'utils/files', 'services/documents', 'services/photos', 'domain/asset-references', 'services/asset-retention'].forEach(h.load);
  return h;
}
async function prepared(h, name, text) {
  const bytes = Buffer.from(text);
  return { originalName: name + '.png', mime: 'image/png', byteLength: bytes.length, sha256: await h.root.utils.integrity.sha256(bytes), blob: new Blob([bytes], { type: 'image/png' }), width: 1, height: 1 };
}
async function images(h, label) {
  const photo = await prepared(h, label + '-photo', label + ' photo bytes'), thumbnail = await prepared(h, label + '-thumb', label + ' thumbnail bytes');
  h.root.utils.images = { prepare: async () => ({ photo, thumbnail }), verify: async () => ({ width: 1, height: 1 }) };
}
async function animal(h, name) {
  return (await h.root.services.animals.registerEntry({ animal: { name, speciesId: h.catalog.species.id }, date: '2026-10-01',
    entryReason: 'Rescate', location: { kind: 'shelter', id: h.location.id }, availability: 'available' })).result.animalId;
}
const text = (h, value) => new File([value], 'informe.txt', { type: 'text/plain' });
const metadata = h => ({ title: 'Informe ficticio', typeId: h.catalog.document_type.id, date: '2026-10-02' });
const asset = (h, extra = {}) => h.seed('assets', { type: 'embedded_document', originalName: 'suelto.txt', mime: 'text/plain', byteLength: 5, sha256: 'b'.repeat(64), ...extra, blob: new Blob(['suelt'], { type: extra.mime || 'text/plain' }) });

test('replaced photographs and a removed logo become closed groups while current and inactive references are kept', async () => {
  const h = harness(), photos = h.root.services.photos, luna = await animal(h, 'Luna'), sol = await animal(h, 'Sol');
  await images(h, 'old'); const old = (await photos.set(luna, text(h, 'x'))).result;
  await images(h, 'new'); const current = (await photos.set(luna, text(h, 'x'))).result;
  await images(h, 'archived'); const archived = (await photos.set(sol, text(h, 'x'))).result;
  const solRow = h.row('animals', sol); h.tables.animals[h.tables.animals.indexOf(solRow)] = { ...solRow, archivedAt: today + 'T12:00:00.000Z' };
  await images(h, 'logo'); const logo = (await photos.setOrganizationLogo(text(h, 'x'))).result; await photos.removeOrganizationLogo();
  const trashed = (await h.root.services.documents.createEmbedded(metadata(h), text(h, 'Papelera ficticia'))).result;
  const documentRow = h.row('documents', trashed.id); h.tables.documents[h.tables.documents.indexOf(documentRow)] = { ...documentRow, deletedAt: today + 'T12:00:00.000Z' };
  const value = h.root.domain.assetReferences.analyze(h.tables);
  same(value.groups.map(group => group.assetIds).sort((a, b) => b.length - a.length), [[old.photoAssetId, old.thumbnailAssetId], [logo.logoAssetId]]);
  assert.equal(value.kept.current.count, 2); assert.equal(value.kept.inactive.count, 3); assert.equal(value.unusedCount, 3);
  assert.equal(value.unusedBytes, value.groups.reduce((sum, group) => sum + group.files.reduce((total, file) => total + file.byteLength, 0), 0));
  same(value.references(current.photoAssetId).map(row => [row.table, row.path, row.kind]), [['animals', 'photoAssetId', 'current']]);
  same(value.references(archived.thumbnailAssetId).map(row => row.kind), ['inactive']);
});

test('history, import links and event parameters protect files without a declared reference', async () => {
  const h = harness(), logged = asset(h), mapped = asset(h), parameter = asset(h), parent = asset(h, { type: 'photo', mime: 'image/png', originalName: 'padre.png', width: 1, height: 1 });
  const child = asset(h, { type: 'thumbnail', mime: 'image/png', originalName: 'hijo.png', width: 1, height: 1, derivedFromAssetId: parent.id }), loose = asset(h);
  h.seed('activityLog', { operation: 'update', occurredAt: today + 'T12:00:00.000Z', operationId: h.id(), target: { type: 'asset', id: logged.id } });
  h.seed('importIdentityMap', { source: 'archivo', entityType: 'asset', externalId: 'externo-1', entityId: mapped.id });
  h.seed('importIdentityMap', { source: 'archivo', entityType: 'asset', externalId: 'externo-2', entityId: child.id });
  const id = await animal(h, 'Historia');
  h.seed('animalEvents', { animalId: id, type: 'document', eventDate: '2026-10-02', recordedAt: today + 'T12:00:00.000Z', source: { type: 'animal', id }, originKey: 'test:event', parameters: { previousId: parameter.id } });
  const value = h.root.domain.assetReferences.analyze(h.tables);
  same(value.groups.map(group => group.assetIds), [[loose.id]]);
  assert.equal(value.kept.history.count, 4); assert.equal(value.kept.dependent.count, 1);
  same(value.references(parameter.id).map(row => row.path), ['parameters.previousId']);
  h.root.domain.validateDataset(h.tables, { datasetId, today, throwOnError: true });
});

test('removing whole groups keeps the dataset valid; removing only a parent with its derived file would not', async () => {
  const h = harness(), photos = h.root.services.photos, id = await animal(h, 'Valida');
  await images(h, 'first'); const old = (await photos.set(id, text(h, 'x'))).result; await images(h, 'second'); await photos.set(id, text(h, 'x'));
  const [group] = h.root.domain.assetReferences.analyze(h.tables).groups, without = ids => ({ ...h.tables, assets: h.tables.assets.filter(row => !ids.includes(row.id)) });
  assert.doesNotThrow(() => h.root.domain.validateDataset(without(group.assetIds), { datasetId, today, throwOnError: true }));
  assert.throws(() => h.root.domain.validateDataset(without([old.photoAssetId]), { datasetId, today, throwOnError: true }), { name: 'ValidationError' });
});

function service() {
  const h = harness(), calls = [];
  asset(h, { originalName: 'a.txt' }); asset(h, { originalName: 'b.txt', createdAt: '2026-10-20T11:00:00.000Z', updatedAt: '2026-10-20T11:00:00.000Z' });
  const original = h.root.services.context.snapshot;
  h.root.services.context.snapshot = async () => ({ ...await original(), dataRevision: 7 });
  h.root.services.context.options = value => ({ datasetId: value.datasetId, expectedRevision: value.globalRevision, owner: 'owner', leaseToken: 'lease' });
  h.root.storage = { ...h.root.storage, error: (name, message) => Object.assign(new Error(message), { name }),
    assetRetention: { remove: async (plan, options) => { calls.push({ plan, options }); return { duplicate: false, revision: 9, result: { count: plan.assetIds.length, bytes: 5 * plan.assetIds.length, assetIds: plan.assetIds } }; } } };
  return { h, s: h.root.services.assetRetention, calls };
}

test('asset review is read-only and deeply frozen, and only its private report and complete groups reach storage', async () => {
  const { h, s, calls } = service(), before = h.state(), report = await s.preview();
  assert.equal(h.state(), before); assert.equal(Object.isFrozen(report.groups[0].files[0]), true); assert.equal(report.groups.length, 2); assert.equal(report.dataRevision, 7);
  await assert.rejects(s.apply({ ...report }, { groups: [report.groups[0].key], confirmed: true, copyConfirmed: true }), { name: 'InvalidInputError' });
  for (const groups of [[], ['unknown'], [report.groups[0].key, report.groups[0].key]]) await assert.rejects(s.apply(report, { groups, confirmed: true, copyConfirmed: true }), { name: 'InvalidInputError' });
  for (const decision of [{}, { confirmed: true }, { copyConfirmed: true }]) await assert.rejects(s.apply(report, { groups: [report.groups[0].key], ...decision }), { name: 'ConfirmationRequiredError' });
  assert.equal(calls.length, 0);
  await s.apply(report, { groups: [report.groups[1].key], confirmed: true, copyConfirmed: true });
  assert.equal(calls.length, 1); same(calls[0].plan.assetIds, report.groups[1].assetIds); assert.equal(calls[0].plan.dataRevision, 7);
  assert.equal(calls[0].options.expectedRevision, report.revision); assert.equal(calls[0].plan.signatures[report.groups[1].assetIds[0]], report.groups[1].files[0].signature);
});

test('repeating an applied asset review returns its receipt; another selection is refused without a second call', async () => {
  const { s, calls } = service(), report = await s.preview(), decision = { groups: [report.groups[0].key], confirmed: true, copyConfirmed: true };
  const first = await s.apply(report, decision); assert.equal(first.duplicate, false);
  assert.equal((await s.apply(report, decision)).duplicate, true);
  await assert.rejects(s.apply(report, { ...decision, groups: [report.groups[1].key] }), { name: 'IdempotencyConflictError' });
  assert.equal(calls.length, 1);
});

test('inspection is limited to reviewed unused files and refuses a changed file', async () => {
  const { h, s } = service(), report = await s.preview(), [file] = report.groups[0].files;
  h.root.services.assetFiles = { readAsset: async id => ({ id, sha256: id === file.id ? file.sha256 : 'c'.repeat(64), byteLength: file.byteLength, blob: new Blob(['suelt']), fileName: file.originalName }) };
  assert.equal((await s.read(report, file.id)).id, file.id);
  await assert.rejects(s.read(report, h.id()), { name: 'InvalidInputError' });
  h.root.services.assetFiles = { readAsset: async id => ({ id, sha256: 'c'.repeat(64), byteLength: file.byteLength }) };
  await assert.rejects(s.read(report, file.id), { name: 'RevisionConflictError' });
});
