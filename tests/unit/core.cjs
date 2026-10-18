'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const warnings = [];
const sandbox = vm.createContext({ window: {}, Intl, console: { warn: (...args) => warnings.push(args) } });
for (const file of ['js/namespace.js', 'js/config.js', 'locales/en.js', 'locales/es.js', 'js/core/i18n.js', 'js/core/errors.js', 'js/utils/canonical-json.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../..', file), 'utf8'), sandbox, { filename: file });
}
const root = sandbox.window.RescueManager;
assert.deepEqual(Object.keys(root.locales.en).sort(), Object.keys(root.locales.es).sort());
const i18n = root.core.i18n;
assert.equal(i18n.language, 'en');
assert.equal(i18n.t('records.count', { count: 1 }), '1 record');
assert.equal(i18n.t('records.count', { count: 2 }), '2 records');
let changed = 0;
const unsubscribe = i18n.subscribe(() => { changed++; });
i18n.setLanguage('es');
assert.equal(i18n.t('records.count', { count: 1 }), '1 registro');
assert.equal(i18n.t('records.count', { count: 0 }), '0 registros');
assert.equal(i18n.t('missing.key'), root.locales.es['errors.missingTranslation']);
assert.equal(i18n.t('toString'), root.locales.es['errors.missingTranslation']);
assert.equal(warnings.length, 2);
// Dynamic section/enum labels once escaped literal-string checks and broke all animal tabs.
const dynamicGroups = { 'a.tab.':['info','health','foster','adoption','expenses','documents','history'],
  'q.priority.':['low','medium','high','urgent'], 'q.urgency.':['overdue','today','next_week','later','closed'],
  'q.day.':['mon','tue','wed','thu','fri','sat','sun'] };
for (const locale of ['en','es']) {
  for (const [prefix, values] of Object.entries(dynamicGroups)) for (const value of values) {
    assert.equal(typeof root.locales[locale][prefix+value], 'string', locale+': missing '+prefix+value);
  }
  for (const name of fs.readdirSync(path.join(__dirname, '../../js/modules')).filter(name=>name.endsWith('.js'))) {
    const source = fs.readFileSync(path.join(__dirname, '../../js/modules', name),'utf8');
    for (const match of source.matchAll(/['"]((?:a|af|aw|fw|hw|q|p|d|f|dn|iv|rp|gs|hi|ag|st|ex|im|ia|imv|imp|imf|imd|mj|aq|wt|db|ui|nav|common)\.[a-zA-Z][a-zA-Z0-9._-]*)['"]/g)) {
      if (!match[1].endsWith('.')) assert.equal(typeof root.locales[locale][match[1]],'string',locale+' '+name+': missing '+match[1]);
    }
  }
}
assert.throws(() => i18n.setLanguage('__proto__'));
assert.throws(() => i18n.t('records.count', { count: NaN }));
unsubscribe(); i18n.setLanguage('en'); assert.equal(changed, 1);
const canonical = root.utils.canonicalJson.stringify;
assert.equal(canonical({ z: [3, { b: 'ñ🐾', a: false }], a: -0 }), '{"a":0,"z":[3,{"a":false,"b":"ñ🐾"}]}');
assert.equal(canonical({ b: 1, a: 2 }), canonical({ a: 2, b: 1 }));
for (const value of [undefined, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, () => 1, new Date(), '\ud800', '\udc00', { a: undefined }, [undefined], new Array(2), JSON.parse('{"__proto__":{}}')]) {
  assert.throws(() => canonical(value));
}
const cycle = {}; cycle.self = cycle; assert.throws(() => canonical(cycle));
const getter = Object.defineProperty({}, 'secret', { enumerable: true, get() { throw new Error('must not execute'); } });
assert.throws(() => canonical(getter), /accessors/);
const arrayGetter = Object.defineProperty([1], '0', { get() { throw new Error('must not execute'); } });
assert.throws(() => canonical(arrayGetter), /accessors/);
const symbolArray = [1]; symbolArray[Symbol('hidden')] = 2;
assert.throws(() => canonical(symbolArray), /Symbol/);
let nested = null; for (let index = 0; index < 42; index++) nested = [nested];
assert.throws(() => canonical(nested), /nesting/);
assert.equal(root.core.errors.messageKey({ name: 'QuotaExceededError' }), 'errors.quota');
assert.equal(root.core.errors.messageKey({ name: 'VersionError' }), 'errors.futureVersion');
assert.equal(root.core.errors.messageKey({ name: 'LeaseLostError' }), 'errors.leaseLost');
assert.equal(root.core.errors.messageKey({ name: 'RevisionConflictError' }), 'errors.revisionConflict');
assert.equal(root.core.errors.messageKey({ name: 'DatasetChangedError' }), 'errors.datasetChanged');
process.stdout.write('PASS: core dictionaries, pluralization, locale changes, error mapping and canonical JSON corruption guards.\n');
