/* Developer-only builder of the distribution ZIP. It is not part of the package and never publishes anything.
   Contents: index.html, every file it loads (scripts, styles and their @imports), upstream vendor originals and
   licenses, LICENSE.txt, THIRD_PARTY_NOTICES.txt and the bilingual quick-start READMEs. Deterministic: sorted
   paths, fixed timestamps and raw DEFLATE, so the same sources give the same bytes. */
'use strict';
const fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const extra = ['LICENSE.txt', 'THIRD_PARTY_NOTICES.txt', 'README.en.md', 'README.es.md'];
const table = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = bytes => { let c = 0xffffffff; for (const byte of bytes) c = table[(c ^ byte) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function files() {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8'), found = new Set(['index.html', ...extra]);
  for (const match of html.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"]+)"/g)) found.add(match[1]);
  for (const file of [...found]) if (file.endsWith('.css')) for (const match of fs.readFileSync(path.join(root, file), 'utf8').matchAll(/@import\s+(?:url\()?['"]([^'"]+)['"]/g)) found.add(path.posix.join(path.posix.dirname(file), match[1]));
  for (const directory of fs.readdirSync(path.join(root, 'vendor'))) for (const name of fs.readdirSync(path.join(root, 'vendor', directory))) found.add('vendor/' + directory + '/' + name);
  for (const file of found) if (!/^[a-zA-Z0-9._/-]+$/.test(file) || file.includes('..') || !fs.statSync(path.join(root, file)).isFile()) throw new Error('Unsafe or missing package path: ' + file);
  return [...found].sort();
}
function build(target, prefix = 'rescue-manager') {
  const list = files(), locals = [], central = [], manifest = [];let offset = 0;
  const dosTime = 0, dosDate = ((2026 - 1980) << 9) | (1 << 5) | 1; // fixed 2026-01-01 00:00 for reproducible bytes
  for (const file of list) {
    const data = fs.readFileSync(path.join(root, file)), packed = zlib.deflateRawSync(data, { level: 9 }), name = Buffer.from(prefix + '/' + file, 'utf8'), crc = crc32(data);
    const header = Buffer.alloc(30); header.writeUInt32LE(0x04034b50, 0); header.writeUInt16LE(20, 4); header.writeUInt16LE(0x0800, 6); header.writeUInt16LE(8, 8); header.writeUInt16LE(dosTime, 10); header.writeUInt16LE(dosDate, 12);
    header.writeUInt32LE(crc, 14); header.writeUInt32LE(packed.length, 18); header.writeUInt32LE(data.length, 22); header.writeUInt16LE(name.length, 26); header.writeUInt16LE(0, 28);
    const entry = Buffer.alloc(46); entry.writeUInt32LE(0x02014b50, 0); entry.writeUInt16LE(20, 4); entry.writeUInt16LE(20, 6); entry.writeUInt16LE(0x0800, 8); entry.writeUInt16LE(8, 10); entry.writeUInt16LE(dosTime, 12); entry.writeUInt16LE(dosDate, 14);
    entry.writeUInt32LE(crc, 16); entry.writeUInt32LE(packed.length, 20); entry.writeUInt32LE(data.length, 24); entry.writeUInt16LE(name.length, 28); entry.writeUInt32LE(offset, 42);
    locals.push(header, name, packed); central.push(entry, name); offset += header.length + name.length + packed.length;
    manifest.push({ file, bytes: data.length, sha256: crypto.createHash('sha256').update(data).digest('hex') });
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(list.length, 8); end.writeUInt16LE(list.length, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  const zip = Buffer.concat([...locals, directory, end]);
  fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, zip);
  return { target, prefix, bytes: zip.length, sha256: crypto.createHash('sha256').update(zip).digest('hex'), files: manifest };
}
module.exports = { build, files };
if (require.main === module) {
  const target = process.argv[2] || path.join(root, '.tmp', 'dist', 'rescue-manager.zip'), value = build(path.resolve(target));
  console.log(JSON.stringify({ target: value.target, bytes: value.bytes, sha256: value.sha256, files: value.files.length }, null, 2));
}
