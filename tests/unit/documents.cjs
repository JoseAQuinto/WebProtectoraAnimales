'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { harness: build } = require('./support/service-harness.cjs');
const datasetId = '40000000-0000-4000-8000-000000000001', today = '2026-10-16';
const same = (actual, expected) => assert.deepEqual(JSON.parse(JSON.stringify(actual)), expected);
function harness() {
  const h = build({ datasetId, today, catalogKinds: ['species', 'document_type'], services: ['animals', 'contacts', 'weights'] });
  ['config', 'utils/integrity', 'utils/files', 'services/documents', 'services/photos'].forEach(h.load);
  return h;
}
function file(text = 'Documento ficticio\ncon ñ y datos de prueba', name = 'prueba.txt', type = 'text/plain') {
  return new File([text], name, { type });
}
function metadata(h, extra = {}) { return { title: 'Documento de prueba', typeId: h.catalog.document_type.id, date: '2026-10-01', ...extra }; }
async function animal(h, name = 'Luna') {
  return (await h.root.services.animals.registerEntry({ animal: { name, speciesId: h.catalog.species.id }, date: '2026-10-01',
    entryReason: 'Rescate', location: { kind: 'shelter', id: h.location.id }, availability: 'available' })).result.animalId;
}
async function preparedImage(h, name) {
  const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
  return { originalName: name + '.png', mime: 'image/png', byteLength: bytes.length,
    sha256: await h.root.utils.integrity.sha256(bytes), blob: new Blob([bytes], { type: 'image/png' }), width: 1, height: 1 };
}
// No canvas/decoder exists in this Node harness. Prepared image injection verifies service atomicity;
// actual browser decoding, resizing, re-encoding and object URLs require the file:// browser suite.
async function fakeImagePreparation(h, invalidThumbnail = false) {
  const photo = await preparedImage(h, 'photo'), thumbnail = await preparedImage(h, 'thumbnail');
  if (invalidThumbnail) thumbnail.width = 321;
  h.root.utils.images = { prepare: async () => ({ photo, thumbnail }), verify: async () => ({ width: 1, height: 1 }) };
}

test('embedded documents store verified Blob and links in one operation, with idempotent retry and source history', async () => {
  const h = harness(), documents = h.root.services.documents, animalId = await animal(h);
  const contactId = (await h.root.services.contacts.create({ name: 'Familia ficticia' })).result.id;
  const input = metadata(h, { links: [{ entityType: 'animal', entityId: animalId }, { entityType: 'contact', entityId: contactId }] });
  const operationId = h.id(), selected = file(), result = await documents.createEmbedded(input, selected, { operationId });
  assert.equal((await documents.createEmbedded(input, selected, { operationId })).duplicate, true);
  assert.equal(h.tables.assets.length, 1); assert.equal(h.tables.documents.length, 1); assert.equal(h.tables.documentLinks.length, 2);
  assert.equal(h.tables.animalEvents.filter(row => row.type === 'document').length, 1);
  assert.equal(h.tables.animalEvents.at(-1).source.id, result.result.id);
  assert.equal(h.row('documents', result.result.id).externalFileName, null);
  const resource = await documents.download(result.result.id);
  assert.equal(resource.fileName, 'prueba.txt'); assert.equal(await resource.blob.text(), await selected.text());
  assert.equal(resource.sha256, await h.root.utils.integrity.sha256(await selected.arrayBuffer()));
  const before = h.state();
  await assert.rejects(documents.createEmbedded(input, file('contenido cambiado'), { operationId }), { name: 'IdempotencyConflictError' });
  assert.equal(h.state(), before);
});

test('invalid files, metadata, catalog or target abort without a document, resource or event', async () => {
  const h = harness(), d = h.root.services.documents, before = h.state();
  await assert.rejects(d.createEmbedded(metadata(h), file('<!DOCTYPE html><html>unsafe</html>', 'unsafe.txt')), /active/);
  await assert.rejects(d.createEmbedded(metadata(h), file('texto', 'mal.pdf')), /extension/);
  await assert.rejects(d.createEmbedded(metadata(h), file('texto', 'mal.txt', 'application/pdf')), /MIME/);
  await assert.rejects(d.createEmbedded(metadata(h), file('', 'empty.txt')), /size/);
  await assert.rejects(d.createEmbedded(metadata(h), file('x'.repeat(8 * 1024 * 1024 + 1))), /size/);
  await assert.rejects(d.createEmbedded(metadata(h, { typeId: h.catalog.species.id }), file()), /active document type/);
  await assert.rejects(d.createEmbedded(metadata(h, { links: [{ entityType: 'animal', entityId: h.id() }] }), file()), { name: 'RecordNotFoundError' });
  await assert.rejects(d.createEmbedded(metadata(h, { links: [{ entityType: 'location', entityId: h.location.id }] }), file()), /supported document relation/);
  await assert.rejects(d.createEmbedded(metadata(h, { id: h.id() }), file()), /Unexpected/);
  await assert.rejects(d.createEmbedded(metadata(h, { date: '2026-10-17' }), file()), { name: 'ValidationError' });
  assert.equal(h.state(), before);
});

test('external references never embed bytes and compare reselections without mutating the stored record', async () => {
  const h = harness(), d = h.root.services.documents, selected = file('contenido original', 'contrato.docx', 'application/octet-stream');
  const hash = await h.root.utils.integrity.sha256(await selected.arrayBuffer());
  const id = (await d.createExternal(metadata(h, { externalFileName: 'contrato.docx', externalLocation: 'Archivador rojo, carpeta 2',
    externalFileType: 'Documento Word', originalSha256: hash }))).result.id;
  assert.equal(h.tables.assets.length, 0); assert.equal(h.row('documents', id).assetId, null);
  const before = h.state();
  assert.equal((await d.compareExternal(id, selected)).matches, true);
  assert.equal((await d.compareExternal(id, file('distinto'))).matches, false);
  await assert.rejects(d.download(id), { name: 'ExternalReferenceError' });
  await assert.rejects(d.update(id, { assetId: h.id() }), /Unexpected/);
  assert.equal(h.state(), before);
  await d.update(id, { externalLocation: 'Carpeta revisada', notes: 'Conservar también el original' });
  assert.equal(h.row('documents', id).externalLocation, 'Carpeta revisada');
  const unhashed = (await d.createExternal(metadata(h, { externalFileName: 'otro.zip', externalLocation: 'Disco externo' }))).result.id;
  assert.equal((await d.compareExternal(unhashed, file())).matches, null);
});

test('links reject stale or duplicate intents and support unlink/relink without violating unique identity', async () => {
  const h = harness(), d = h.root.services.documents, animalId = await animal(h), relation = { entityType: 'animal', entityId: animalId };
  const id = (await d.createEmbedded(metadata(h), file())).result.id, revision = h.revision;
  const result = await d.link(id, relation, { operationId: h.id(), expectedRevision: revision });
  assert.equal(result.result.id, id);
  const link = h.tables.documentLinks[0], before = h.state();
  await assert.rejects(d.link(id, relation), /already linked/);
  await assert.rejects(d.update(id, { title: 'Obsoleto' }, { expectedRevision: revision }), { name: 'RevisionConflictError' });
  assert.equal(h.state(), before);
  await d.unlink(link.id);
  assert.equal(d.list(h.tables, { ...relation, entityType: 'animal', entityId: animalId }).length, 0);
  await d.link(id, relation);
  assert.equal(h.tables.documentLinks.length, 1); assert.equal(h.tables.documentLinks[0].id, link.id);
  assert.equal(h.tables.documentLinks[0].deletedAt, null); assert.equal(h.tables.documentLinks[0].revision, 3);
  await assert.rejects(d.createEmbedded(metadata(h, { links: [relation, relation] }), file()), /selected twice/);
});

test('archive and trash preserve links, bytes and history, and prevent edits until explicitly restored', async () => {
  const h = harness(), d = h.root.services.documents, animalId = await animal(h);
  const id = (await d.createEmbedded(metadata(h, { links: [{ entityType: 'animal', entityId: animalId }] }), file())).result.id;
  const assetId = h.row('documents', id).assetId, linkId = h.tables.documentLinks[0].id;
  await d.archive(id); assert.equal(d.list(h.tables).length, 0); assert.equal(d.list(h.tables, { includeArchived: true }).length, 1);
  await assert.rejects(d.update(id, { title: 'No guardado' }), /Restore/);
  await d.unarchive(id); await d.trash(id);
  assert.equal(d.list(h.tables).length, 0); assert.equal(d.list(h.tables, { trash: true }).length, 1);
  assert.equal(h.tables.assets[0].id, assetId); assert.equal(h.tables.documentLinks[0].id, linkId); assert.equal(h.tables.documentLinks[0].deletedAt, null);
  await assert.rejects(d.link(id, { entityType: 'animal', entityId: animalId }), /Restore/);
  await d.restore(id); await d.update(id, { title: 'Nuevo título', notes: 'Descripción corregida' });
  assert.equal(d.list(h.tables, { search: 'titulo' })[0].id, id);
  await assert.rejects(d.update(id, { mode: 'external_reference' }), /Unexpected/);
  assert.equal(h.tables.animalEvents.filter(row => row.type === 'document').length, 1);
});

test('download revalidates stored size, SHA and signature and rejects tampering', async () => {
  const h = harness(), d = h.root.services.documents;
  const id = (await d.createEmbedded(metadata(h), file('abc'))).result.id, row = h.tables.assets[0];
  row.blob = new Blob(['abd'], { type: 'text/plain' });
  await assert.rejects(d.download(id), { name: 'AssetIntegrityError' });
  row.blob = new Blob(['abcdef'], { type: 'text/plain' });
  await assert.rejects(d.download(id), { name: 'ValidationError' });
  row.blob = new Blob(['abc'], { type: 'text/plain' });
  await assert.rejects(h.root.services.photos.read(row.id), /validated image/);
});

test('64 MiB budget includes retained or trashed bytes and is checked before accepting a new document', async () => {
  const h = harness(), blob = new Blob(['x'.repeat(8 * 1024 * 1024)], { type: 'text/plain' });
  for (let index = 0; index < 8; index++) h.seed('assets', { type: 'embedded_document', originalName: 'presupuesto.txt', mime: 'text/plain',
    byteLength: blob.size, sha256: 'a'.repeat(64), blob, deletedAt: index % 2 ? today + 'T12:00:00.000Z' : null });
  const before = h.state();
  await assert.rejects(h.root.services.documents.createEmbedded(metadata(h), file('x')), { name: 'AssetBudgetError' });
  assert.equal(h.state(), before); assert.equal(h.tables.documents.length, 0);
});

test('photograph and thumbnail update atomically, retries do not duplicate, replacement retains old references', async () => {
  const h = harness(), animalId = await animal(h), photos = h.root.services.photos;
  await fakeImagePreparation(h);
  const operationId = h.id(), result = await photos.set(animalId, file(), { operationId });
  assert.equal((await photos.set(animalId, file(), { operationId })).duplicate, true);
  const first = result.result, photo = h.row('assets', first.photoAssetId), thumbnail = h.row('assets', first.thumbnailAssetId);
  assert.equal(h.tables.assets.length, 2); assert.equal(photo.type, 'photo'); assert.equal(thumbnail.type, 'thumbnail');
  assert.equal(thumbnail.derivedFromAssetId, photo.id); assert.equal(h.row('animals', animalId).thumbnailAssetId, thumbnail.id);
  assert.equal((await photos.read(photo.id)).blob.size, photo.byteLength);
  await photos.set(animalId, file());
  assert.equal(h.tables.assets.length, 4); assert.equal(h.row('assets', first.photoAssetId).deletedAt, null);
  await photos.remove(animalId); assert.equal(h.row('animals', animalId).photoAssetId, null); assert.equal(h.tables.assets.length, 4);
  await assert.rejects(photos.remove(animalId), /no photograph/);
});

test('invalid thumbnail aborts the photograph, animal update and activity together; logo shares the same resource policy', async () => {
  const h = harness(), animalId = await animal(h), photos = h.root.services.photos;
  await fakeImagePreparation(h, true);
  const before = h.state();
  await assert.rejects(photos.set(animalId, file()), { name: 'ValidationError' });
  assert.equal(h.state(), before); assert.equal(h.tables.assets.length, 0);
  await fakeImagePreparation(h);
  const id = (await photos.setOrganizationLogo(file())).result.logoAssetId;
  assert.equal(h.tables.organizationSettings[0].logoAssetId, id); assert.equal(h.row('assets', id).type, 'logo');
});

test('removing a logo retains verified bytes and is idempotent with stale-write protection', async () => {
  const h=harness(),photos=h.root.services.photos;await fakeImagePreparation(h);
  const id=(await photos.setOrganizationLogo(file())).result.logoAssetId,before=h.row('assets',id),oldRevision=h.revision;
  const command={operationId:h.id()};await photos.removeOrganizationLogo(command);
  assert.equal((await photos.removeOrganizationLogo(command)).duplicate,true);
  assert.equal(h.tables.organizationSettings[0].logoAssetId,null);assert.equal(h.tables.assets.length,1);
  assert.equal(await h.row('assets',id).blob.text(),await before.blob.text());assert.equal(h.row('assets',id).sha256,before.sha256);
  await assert.rejects(photos.removeOrganizationLogo({expectedRevision:oldRevision}),{name:'RevisionConflictError'});
});

test('weights accept only positive safe integer grams and real nonfuture dates; latest derives from dated valid measurements', async () => {
  const h = harness(), animalId = await animal(h), weights = h.root.services.weights;
  const first = (await weights.record({ animalId, date: '2026-10-02', grams: 8000 })).result.id;
  const second = (await weights.record({ animalId, date: '2026-10-12', grams: 9500 })).result.id;
  const older = (await weights.record({ animalId, date: '2026-10-01', grams: 7800 })).result.id;
  assert.equal(weights.latest(h.tables, animalId).id, second);
  const before = h.state();
  for (const grams of [0, -1, 2.5, '1000']) await assert.rejects(weights.record({ animalId, date: today, grams }), { name: 'ValidationError' });
  await assert.rejects(weights.record({ animalId, date: today, grams: Number.MAX_SAFE_INTEGER + 1 }), /Unsafe JSON number/);
  for (const date of ['2026-02-29', '2026-10-17']) await assert.rejects(weights.record({ animalId, date, grams: 1000 }), { name: 'ValidationError' });
  await assert.rejects(weights.record({ animalId: h.id(), date: today, grams: 1000 }), { name: 'RecordNotFoundError' });
  await assert.rejects(weights.update(first, { animalId }), /Unexpected/);
  assert.equal(h.state(), before);
  await weights.update(first, { date: '2026-10-14', grams: 9600, notes: 'Fecha corregida' });
  assert.equal(weights.latest(h.tables, animalId).id, first);
  await weights.trash(first); assert.equal(weights.latest(h.tables, animalId).id, second);
  await weights.restore(first); assert.equal(weights.latest(h.tables, animalId).id, first);
  same(weights.list(h.tables, animalId).map(row => row.id), [first, second, older]);
  assert.equal('grams' in h.row('animals', animalId), false);
});

test('equal measurement dates use creation then UUID ordering, and stale/idempotent writes remain guarded', async () => {
  const h = harness(), animalId = await animal(h), weights = h.root.services.weights, operationId = h.id();
  const input = { animalId, date: today, grams: 5000 }, first = await weights.record(input, { operationId });
  assert.equal((await weights.record(input, { operationId })).duplicate, true);
  assert.equal(h.tables.weightMeasurements.length, 1);
  const revision = h.revision;
  const second = (await weights.record({ ...input, grams: 5200 })).result.id;
  const ids = [first.result.id, second].sort().reverse();
  assert.equal(weights.latest(h.tables, animalId).id, ids[0]);
  await assert.rejects(weights.update(first.result.id, { grams: 5300 }, { expectedRevision: revision }), { name: 'RevisionConflictError' });
  await assert.rejects(weights.record({ ...input, grams: 6000 }, { operationId }), { name: 'IdempotencyConflictError' });
});
