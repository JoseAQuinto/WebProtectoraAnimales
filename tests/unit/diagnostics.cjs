'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
// Loads the real service over an in-memory 'meta' store; the browser suites exercise IndexedDB itself.
function load(meta = new Map(), failing = false) {
  const listeners = {}, window = { addEventListener: (type, handler) => { listeners[type] = handler; }, RescueManager: {
    config: { appVersion: '0.2.0-dev', dbVersion: 2, schemaVersion: 1, backupFormatVersion: 1 }, core: { i18n: { language: 'es' } }, services: {},
    storage: { transactions: { async run(stores, mode, work) { if (failing) throw Object.assign(new Error('Unavailable'), { name: 'SecurityError' }); let result = null;
      const store = { get: key => { const request = {}; queueMicrotask(() => { request.result = structuredClone(meta.get(key)); request.onsuccess(); }); return request; }, put: value => { meta.set(value.key, structuredClone(value)); } };
      const api = { request(request, done) { request.onsuccess = () => done(request.result); }, setResult(value) { result = value; } };
      work({ objectStore: () => store }, api); await new Promise(resolve => setTimeout(resolve, 0)); return result; } } } } };
  const context = vm.createContext({ window, location: { hash: '#animals/10000000-0000-4000-8000-000000000001' }, Blob, setTimeout, queueMicrotask, structuredClone });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../../js/services/diagnostics.js'), 'utf8'), context);
  return { service: window.RescueManager.services.diagnostics, listeners, meta };
}
const settle = () => new Promise(resolve => setTimeout(resolve, 20));

test('events keep only technical fields, replace identifiers and survive a reload through meta', async () => {
  const first = load();
  first.service.record('action', Object.assign(new Error('Record 10000000-0000-4000-8000-000000000002 changed\n since review'), { name: 'RevisionConflictError', code: 'x' }));
  await settle();
  const [event] = await first.service.list();
  assert.equal(event.name, 'RevisionConflictError'); assert.equal(event.route, 'animals'); assert.equal(event.message, 'Record <id> changed since review');
  assert.deepEqual(Object.keys(event).sort(), ['appVersion', 'at', 'code', 'kind', 'message', 'name', 'route']);
  const second = load(first.meta); assert.equal((await second.service.list())[0].message, 'Record <id> changed since review');
});

test('the log is bounded to 200 events, long messages are truncated and uncaught errors are captured', async () => {
  const { service, listeners } = load();
  for (let index = 0; index < 205; index++) service.record('form', { name: 'ValidationError', message: 'x'.repeat(500) + index });
  listeners.unhandledrejection({ reason: { name: 'QuotaExceededError', message: 'Quota' } });
  await settle();
  const rows = await service.list();
  assert.equal(rows.length, 200); assert.equal(rows[0].name, 'QuotaExceededError'); assert.equal(rows[1].message.length, 300);
});

test('export is a reviewable file with versions and events, and clear empties the stored log', async () => {
  const { service, meta } = load();
  service.record('startup', { name: 'VersionError', message: 'Future data' }); await settle();
  const file = JSON.parse(await (await service.export()).text());
  assert.equal(file.format, 'rescue-manager-diagnostics'); assert.equal(file.dbVersion, 2); assert.equal(file.events.length, 1);
  await service.clear(); await settle(); assert.equal((await service.list()).length, 0); assert.deepEqual(meta.get('diagnostics').events, []);
});

test('when storage itself fails, the current session still lists its events', async () => {
  const { service } = load(new Map(), true);
  service.record('startup', { name: 'SecurityError', message: 'IndexedDB unavailable' }); await settle();
  assert.equal((await service.list())[0].name, 'SecurityError');
});
