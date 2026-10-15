/* Developer-only reusable file:// suite and persistence runner for Chrome/Edge. */
'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { launch } = require('./chromium.cjs');
const root = path.resolve(__dirname, '../..');
const options = { browser: 'chrome', page: 'tests/integration/business.html', output: 'business-chrome.json', machine: 'unspecified' };
const args = process.argv.slice(2);
for (let index = 0; index < args.length; index += 2) {
  const key = args[index].replace(/^--/, '');
  if (!['browser', 'page', 'output', 'machine', 'executable'].includes(key) || !args[index + 1]) throw new Error('Use --browser, --page, --output, --machine, --executable');
  options[key] = args[index + 1];
}
if (!['chrome', 'edge'].includes(options.browser) || !/^[a-zA-Z0-9._-]+\.json$/.test(options.output)) throw new Error('Invalid browser or output filename');
const html = path.resolve(root, options.page);
if (!html.startsWith(root + path.sep)) throw new Error('Page must be inside the test checkout');
const result = {
  format: 'rescue-manager-browser-suite-test', version: 1, browser: options.browser, machine: options.machine,
  startedAt: new Date().toISOString(), operatingSystem: { type: os.type(), release: os.release(), version: os.version() },
  applicationPage: path.relative(root, html).replaceAll('\\', '/'), launches: [], closures: [], checks: [],
  pageErrors: [], consoleErrors: [], externalRequests: [],
  limitations: ['Native headless desktop automation; no real mobile/tablet coverage.', 'Only page-originated HTTP requests are observed; browser-internal traffic is outside this trace.']
};
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
}
function snapshotEvidence(snapshot) {
  assert(snapshot && (/^[0-9a-f]{64}$/i.test(snapshot.digest || '') || snapshot.tables), 'Snapshot must include tables or a digest of all records and actual binary bytes');
  const json = JSON.stringify(stable(snapshot));
  return { sha256: hash(json), serializedBytes: Buffer.byteLength(json), datasetDigest: snapshot.digest || null,
    recordCounts: snapshot.tables ? Object.fromEntries(Object.entries(snapshot.tables).map(([name, rows]) => [name, rows.length])) : null };
}
async function sources() {
  const files = [html, ...Array.from((await fs.readFile(html, 'utf8')).matchAll(/<script[^>]+src="([^"]+)"/g), match => path.resolve(path.dirname(html), match[1]))];
  return Promise.all(files.map(async file => ({ file: path.relative(root, file).replaceAll('\\', '/'), sha256: hash(await fs.readFile(file)) })));
}
async function check(id, work) {
  try { const evidence = await work(); result.checks.push({ id, passed: true, evidence }); console.log('PASS ' + id); }
  catch (error) { result.checks.push({ id, passed: false, error: { name: error.name, message: error.message, stack: error.stack } }); console.log('FAIL ' + id + ': ' + error.message); }
}
(async () => {
  const sessions = [];
  try {
    result.sourceFiles = await sources();
    const profile = path.join(root, '.tmp', 'suite-' + options.browser + '-' + Date.now(), 'profile');
    async function open(peer) {
      const session = await launch(options.browser, profile, result, false, { executable: options.executable });
      sessions.push(session);
      const page = await session.context.newPage();
      page.on('pageerror', error => result.pageErrors.push(String(error)));
      page.on('console', message => { if (message.type() === 'error') result.consoleErrors.push(message.text()); });
      page.on('request', request => { if (/^https?:/i.test(request.url())) result.externalRequests.push(request.url()); });
      await page.goto(pathToFileURL(html).href + (peer ? '?peer=1' : ''), { waitUntil: 'load', timeout: 30000 });
      await page.waitForFunction(() => window.RescueManager?.integration?.ready, null, { timeout: 30000 });
      await page.evaluate(() => window.RescueManager.integration.ready);
      return { session, page };
    }
    const first = await open(false);
    await check('suite-passes-offline-from-local-file', async () => {
      const evidence = await first.page.evaluate(() => ({ protocol: location.protocol, online: navigator.onLine,
        config: window.RescueManager.config, report: window.RescueManager.integration.report }));
      assert(evidence.protocol === 'file:' && evidence.online === false, 'Not offline file://');
      assert(evidence.config.dbName.startsWith('animal-rescue-manager-test-'), 'Suite is not using a dedicated test database');
      assert(evidence.report?.passed && evidence.report.checks?.length > 0 && evidence.report.checks.every(check => check.passed), 'Integration suite reported a failure');
      result.suiteReport = evidence.report;
      return evidence;
    });
    const before = snapshotEvidence(await first.page.evaluate(() => window.RescueManager.integration.snapshot()));
    await check('complete-first-owned-browser-close', () => first.session.close());
    const second = await open(true);
    await check('all-snapshot-data-persists-after-complete-close', async () => {
      const after = snapshotEvidence(await second.page.evaluate(() => window.RescueManager.integration.snapshot()));
      const context = await second.page.evaluate(() => ({ protocol: location.protocol, online: navigator.onLine }));
      assert(before.sha256 === after.sha256 && before.serializedBytes === after.serializedBytes, 'Snapshot changed after browser close/reopen');
      assert(context.protocol === 'file:' && context.online === false, 'Reopen was not offline file://');
      return { before, after, context, profileReused: true };
    });
    await check('no-runtime-errors-or-external-page-requests', async () => {
      const diagnostics = await second.page.evaluate(() => ({ runtimeErrors: window.RescueManager.integration.runtimeErrors || [],
        connectionViolations: window.RescueManager.integration.connectionViolations || [] }));
      assert(!result.pageErrors.length && !result.consoleErrors.length && !result.externalRequests.length && !diagnostics.runtimeErrors.length && !diagnostics.connectionViolations.length, 'Runtime errors or external requests were observed');
      return { pageErrors: result.pageErrors, consoleErrors: result.consoleErrors, externalRequests: result.externalRequests, diagnostics };
    });
    await check('complete-reopened-owned-browser-close', () => second.session.close());
    await check('tested-source-files-remained-unchanged', async () => {
      const after = await sources();
      assert(JSON.stringify(after) === JSON.stringify(result.sourceFiles), 'Source files changed during the browser run');
      return { count: after.length, hashesMatch: true };
    });
  } catch (error) { result.fatalError = { name: error.name, message: error.message, stack: error.stack }; }
  finally {
    for (const session of sessions) { try { await session.close(); } catch (error) { result.cleanupErrors = [...(result.cleanupErrors || []), String(error)]; } }
    result.completedAt = new Date().toISOString();
    result.status = result.fatalError || result.cleanupErrors || !result.checks.length || result.checks.some(check => !check.passed) ? 'failed' : 'passed';
    await fs.writeFile(path.join(root, 'tests/results', options.output), JSON.stringify(result, null, 2) + '\n');
    console.log(result.status.toUpperCase());
    if (result.status !== 'passed') process.exitCode = 1;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
