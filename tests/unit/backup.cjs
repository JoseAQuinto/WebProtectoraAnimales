'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const rootPath = path.resolve(__dirname, '../..');
const sandbox = vm.createContext({ window: { crypto: crypto.webcrypto }, Blob, TextEncoder, TextDecoder,
  ArrayBuffer, Uint8Array, DataView, Intl, console });
for (const file of ['js/namespace.js', 'vendor/papaparse/papaparse.min.js', 'vendor/js-sha256/sha256.min.js',
  'js/config.js', 'js/utils/ids.js', 'js/utils/dates.js', 'js/utils/strings.js', 'js/utils/canonical-json.js',
  'js/utils/integrity.js', 'js/utils/files.js', 'js/domain/enums.js', 'js/domain/schemas.js',
  'js/domain/validators.js', 'js/domain/dataset-validator.js', 'js/services/backup-codec.js']) {
  vm.runInContext(fs.readFileSync(path.join(rootPath, file), 'utf8'), sandbox, { filename: file });
}
const root = sandbox.window.RescueManager;
const codec = root.services.backupCodec, files = root.utils.files;
const canonical = root.utils.canonicalJson.stringify;
const counters = { checks: 0 };
function equal(actual, expected) { assert.equal(actual, expected); counters.checks++; }
async function rejects(action, reason) { await assert.rejects(action, reason); counters.checks++; }
function throws(action, reason) { assert.throws(action, reason); counters.checks++; }
const datasetId = '11111111-1111-4111-8111-111111111111', now = '2026-10-15T12:00:00.000Z';
const tables = Object.fromEntries(codec.tableNames.map(name => [name, []]));
function make(table, input, id) {
  const record = root.domain.createRecord(table, input, { datasetId, now, id }); tables[table].push(record); return record;
}
function selected(name, mime, bytes) { const file = new Blob([bytes], { type: mime }); Object.defineProperty(file, 'name', { value: name }); return file; }
async function resign(container) {
  container.integrity.contentHash = await root.utils.integrity.sha256(canonical(container.content));
  return canonical(container);
}
async function main() {
  equal(Object.keys(sandbox.window).sort().join(','), 'RescueManager,crypto');
  equal(sandbox.Papa, undefined); equal(sandbox.sha256, undefined); equal(sandbox.sha224, undefined);
  equal(root.vendor.Papa.parse('name,note\nA,"ñ,🐾\nline"', { header: true, dynamicTyping: false }).data[0].note, 'ñ,🐾\nline');
  for (const input of ['', 'abc', 'Español 🐾\n', 'a'.repeat(1000000), new Uint8Array([0, 255, 128, 1])]) {
    const bytes = typeof input === 'string' ? Buffer.from(input) : input;
    const expected = crypto.createHash('sha256').update(bytes).digest('hex');
    equal(await root.utils.integrity.sha256(input), expected);
    equal(await root.utils.integrity.sha256(input, { forceFallback: true }), expected);
  }
  equal(await root.utils.integrity.sha256(new Blob(['abc'])), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  sandbox.window.crypto = { subtle: { digest: async () => { throw new Error('file origin denies subtle'); } } };
  equal(await root.utils.integrity.sha256('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  sandbox.window.crypto = crypto.webcrypto;
  for (const length of [0, 1, 2, 3, 255, 12287, 12288, 12289, 90000]) {
    const bytes = crypto.randomBytes(length), encoded = files.encodeBase64(bytes);
    equal(encoded, bytes.toString('base64'));
    equal(Buffer.from(files.decodeBase64(encoded)).toString('hex'), bytes.toString('hex'));
    equal(files.decodedLength(encoded), length);
  }
  for (const invalid of ['A', 'AAA', 'AA=A', 'AA===', 'Zh==', 'Zm9=', 'Z g==', 'Zg==\n', '====', '____', '----', '\u0000AAA']) throws(() => files.decodeBase64(invalid));
  throws(() => files.decodeBase64('YWJj', 2), /limit/);
  // Large Base64 scanning is linear and does not overflow the regexp stack.
  equal(files.decodedLength('A'.repeat(4 * 1024 * 1024)), 3 * 1024 * 1024);
  const pngBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
  equal(files.inspect(pngBytes, 'image/png').width, 1);
  equal(files.inspect(Buffer.from('%PDF-1.7\nminimal test\n%%EOF\n'), 'application/pdf').mime, 'application/pdf');
  equal(files.inspect(Buffer.from('Línea\n🐾'), 'text/plain').mime, 'text/plain');
  for (const bytes of [Buffer.from('<svg xmlns="x"></svg>'), Buffer.from('<!DOCTYPE html><html></html>'),
    Buffer.from([0xff, 0xfe]), Buffer.from([0, 1, 2]), pngBytes.subarray(0, 40)]) throws(() => files.inspect(bytes));
  throws(() => files.inspect(pngBytes, 'image/jpeg'), /MIME/);
  throws(() => files.validateName('image.svg', 'image/png'), /extension/);
  throws(() => files.inspect(Buffer.from('%PDF-1.7\ntruncated'), 'application/pdf'), /Incomplete/);
  const empty = await codec.encode({ datasetId, dataRevision: 0, tables: {} });
  equal((await codec.decode(empty.blob)).summary.embeddedAssetCount, 0);
  equal((await codec.decode(empty.text)).dataRevision, 0);
  equal(Object.keys(empty.container.content.tables).length, 27);
  const organization = make('organizationSettings', { name: 'Refugio Ñandú 🐾', language: 'es', currencyCode: 'EUR', dateFormat: 'day_first', timeZone: 'Europe/Madrid' });
  const archived = make('contacts', { name: 'José\u0301', phones: [{ label: 'Casa', original: '+34 000 123 456' }], email: 'JOSE@example.org', roles: ['donor'], notes: 'Primera línea\nSegunda 🐾', archivedAt: now, deletedAt: now });
  const docType = make('catalogOptions', { kind: 'document_type', code: 'user_document', customLabel: 'Documentos', isSystem: false });
  const textFile = await files.prepareDocument(selected('nota.txt', 'text/plain', 'Línea\n🐾\n'));
  const textAsset = make('assets', { type: 'embedded_document', ...textFile });
  const pngAsset = make('assets', { type: 'logo', originalName: 'logo.png', mime: 'image/png', byteLength: pngBytes.length,
    sha256: await root.utils.integrity.sha256(pngBytes), blob: new Blob([pngBytes], { type: 'image/png' }), width: 1, height: 1 });
  organization.logoAssetId = pngAsset.id;
  make('documents', { title: 'Nota incorporada', typeId: docType.id, date: '2026-10-15', mode: 'embedded', assetId: textAsset.id });
  make('documents', { title: 'Contrato externo', typeId: docType.id, date: '2026-10-15', mode: 'external_reference', externalFileName: 'contrato.docx', externalLocation: 'Archivador, carpeta 3' });
  const result = await codec.encode({ datasetId, dataRevision: 7, tables });
  const decoded = await codec.decode(result.blob);
  equal(decoded.summary.organizationName, organization.name); equal(decoded.summary.externalReferenceCount, 1);
  equal(decoded.summary.embeddedAssetCount, 2); equal(decoded.summary.embeddedAssetBytes, textFile.byteLength + pngBytes.length);
  equal(decoded.tables.contacts[0].notes, archived.notes); equal(decoded.tables.contacts[0].deletedAt, now);
  equal(decoded.tables.contacts[0].phones[0].original, '+34 000 123 456');
  equal(decoded.tables.contacts[0].name, 'José\u0301'); equal(decoded.dataRevision, 7);
  equal(decoded.tables.assets.find(asset => asset.id === textAsset.id).blob instanceof Blob, true);
  for (const name of codec.tableNames) {
    const withoutBlobs = records => records.map(record => { const copy = { ...record }; delete copy.blob; return copy; }).sort((a, b) => a.id.localeCompare(b.id));
    equal(canonical(withoutBlobs(decoded.tables[name])), canonical(withoutBlobs(tables[name])));
  }
  equal(await decoded.tables.assets.find(asset => asset.id === textAsset.id).blob.text(), 'Línea\n🐾\n');
  equal(canonical(result.container.content.assets).includes('"blob"'), false);
  const before = canonical(result.container);
  const mutations = [
    object => { object.content.manifest.embeddedAssetCount++; },
    object => { object.content.manifest.recordCounts.contacts++; },
    object => { object.content.manifest.externalReferenceCount = 0; },
    object => { object.content.assets[0].byteLength++; },
    object => { object.content.assets[0].sha256 = '0'.repeat(64); },
    object => { object.content.assets[0].base64 = 'Zg==\n'; },
    object => { object.content.assets[0].base64 = 'AAAA'; },
    object => { object.content.assets[0].mime = 'image/svg+xml'; },
    object => { object.content.tables.contacts[0].unexpected = true; },
    object => { object.content.tables.contacts.push(object.content.tables.contacts[0]); },
    object => { object.content.tables.organizationSettings[0].logoAssetId = crypto.randomUUID(); },
    object => { object.content.tables.contacts[0].datasetId = crypto.randomUUID(); },
    object => { object.content.tables.wrong = []; },
    object => { object.content.tables.assets = []; },
    object => { delete object.content.tables.tasks; },
    object => { object.content.dataRevision = -1; },
    object => { object.content.createdAt = '2026-02-30T00:00:00.000Z'; },
    object => { object.extra = 'unexpected'; }
  ];
  for (const mutate of mutations) {
    const broken = JSON.parse(before); mutate(broken);
    await rejects(() => resign(broken).then(text => codec.decode(text)));
  }
  const altered = JSON.parse(before); altered.content.tables.contacts[0].name = 'Altered';
  await rejects(() => codec.decode(JSON.stringify(altered)), /contentHash/);
  const future = JSON.parse(before); future.backupFormatVersion++;
  await rejects(() => codec.decode(JSON.stringify(future)), { name: 'VersionError' });
  const futureSchema = JSON.parse(before); futureSchema.content.schemaVersion++;
  await rejects(() => resign(futureSchema).then(text => codec.decode(text)), { name: 'VersionError' });
  const old = JSON.parse(before); old.backupFormatVersion = 0;
  await rejects(() => codec.decode(JSON.stringify(old)), { name: 'VersionError' });
  await rejects(() => codec.decode(before.slice(0, -1)), /invalidJson/);
  await rejects(() => codec.decode(before.replace('{', '{"__proto__":{},')), /dangerousKey/);
  await rejects(() => codec.decode(before.replace('{', '{"constructor":{},')), /dangerousKey/);
  await rejects(() => codec.decode(before.replace('{', '{"format":"duplicate",')), /duplicateKey/);
  await rejects(() => codec.decode('['.repeat(42) + '0' + ']'.repeat(42)), /depthLimit/);
  await rejects(() => codec.decode(new Blob([new Uint8Array([0xff, 0xfe])])), /encoded|encoding/i);
  await rejects(() => files.prepareDocument(selected('bad.html', 'text/html', '<html>Active</html>')));
  const limited = { ...root.config, limits: { ...root.config.limits, backupBytes: 10 } };
  root.config = limited;
  await rejects(() => codec.decode(result.blob), /size limit/);
  await rejects(() => codec.decode(result.text), /fileLimit/);
  // Merely decoding never calls storage or creates business effects.
  equal(Object.keys(root.storage).length, 0);
  process.stdout.write(`PASS: ${counters.checks} backup, SHA-256, Base64, binary and corruption checks.\n`);
}
main().catch(error => { console.error(error, error.details || ''); process.exitCode = 1; });
