'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const files = ['index.html', 'tests/viability/index.html', 'tests/viability/probe.css',
  'tests/viability/probe-storage.js', 'tests/viability/probe.js'];
let checks = 0;
for (const relative of files) {
  const absolute = path.join(root, relative);
  const source = fs.readFileSync(absolute, 'utf8');
  assert(!/https?:\/\/|@import\s|\beval\s*\(|\bnew\s+Function\s*\(/i.test(source), `${relative}: remote or executable content`);
  checks++;
  if (relative.endsWith('.js')) {
    new vm.Script(source, { filename: relative });
    assert(!/\b(?:fetch|XMLHttpRequest|localStorage|sessionStorage)\b|\bimport\s*\(/.test(source), `${relative}: unsupported runtime dependency`);
    assert(!/\.innerHTML\s*=/.test(source), `${relative}: unsafe HTML sink`);
    checks += 3;
  }
  if (relative.endsWith('.html')) {
    assert(/connect-src 'none'/.test(source), `${relative}: missing connection restriction`);
    assert(/object-src 'none'/.test(source), `${relative}: missing object restriction`);
    assert(!/type=["']module["']|\son\w+\s*=/.test(source), `${relative}: module or inline handler`);
    assert(!/<script(?![^>]*\bsrc=)[^>]*>/i.test(source), `${relative}: inline script`);
    for (const match of source.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"[^>]*>/g)) {
      const target = path.resolve(path.dirname(absolute), match[1]);
      assert(target.startsWith(root + path.sep) && fs.existsSync(target), `${relative}: missing or nonlocal asset ${match[1]}`);
      if (match[0].startsWith('<script')) assert(/\bdefer\b/.test(match[0]), `${relative}: script without defer`);
      checks++;
    }
    checks += 4;
  }
}
process.stdout.write(`PASS: ${checks} static checks; local assets exist, scripts parse, CSP and offline restrictions present.\n`);
