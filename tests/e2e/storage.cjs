'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { launch } = require('./chromium.cjs');
const root = path.resolve(__dirname, '../..');
const argumentsList = process.argv.slice(2);
const options = { browser: 'chrome', output: 'storage-core.json', machine: 'unspecified' };
for (let index = 0; index < argumentsList.length; index += 2) {
  const key = argumentsList[index].replace(/^--/, '');
  if (!['browser', 'executable', 'output', 'machine'].includes(key) || !argumentsList[index + 1]) throw new Error('Use --browser chrome|edge, --executable PATH, --output NAME.json, --machine LABEL');
  options[key] = argumentsList[index + 1];
}
if (!['chrome', 'edge', 'firefox'].includes(options.browser) || !/^[a-zA-Z0-9._-]+\.json$/.test(options.output)) throw new Error('Invalid browser or output filename');
const result = { format: 'rescue-manager-storage-core-test', version: 1, browser: options.browser, machine: options.machine,
  startedAt: new Date().toISOString(), operatingSystem: { type: os.type(), release: os.release(), version: os.version() },
  launches: [], closures: [], checks: [], pageErrors: [], externalRequests: [],
  limitations: ['Core infrastructure only; business schemas, recovery and backup restoration are not implemented.', 'Desktop installed browser in headless mode; no real mobile/tablet coverage.'] };
const assert = (condition, message) => { if (!condition) throw new Error(message); };
async function check(id, work) {
  try { const evidence = await work(); result.checks.push({ id, passed: true, evidence }); console.log('PASS ' + id); }
  catch (error) { result.checks.push({ id, passed: false, error: { name: error.name, message: error.message, stack: error.stack } }); console.log('FAIL ' + id + ': ' + error.message); }
}
async function sources() {
  const html = path.join(root, 'tests/integration/index.html');
  const files = [html, ...Array.from((await fs.readFile(html, 'utf8')).matchAll(/<script[^>]+src="([^"]+)"/g), match => path.resolve(path.dirname(html), match[1]))];
  return Promise.all(files.map(async file => ({ file: path.relative(root, file).replaceAll('\\', '/'), sha256: crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex') })));
}
(async () => {
  let session;
  try {
    result.sourceFiles = await sources();
    session = await launch(options.browser, path.join(root, '.tmp', 'storage-core-' + options.browser + '-' + Date.now(), 'profile'), result, false, { executable: options.executable });
    async function open(peer) {
      const page = await session.context.newPage();
      page.on('pageerror', error => result.pageErrors.push(String(error)));
      page.on('request', request => { if (/^https?:/i.test(request.url())) result.externalRequests.push(request.url()); });
      const url = pathToFileURL(path.join(root, 'tests/integration/index.html')).href + (peer ? '?peer=1' : '');
      await page.goto(url, { waitUntil: 'load' });
      await page.waitForFunction(() => window.RescueManager?.integration?.ready);
      await page.evaluate(() => window.RescueManager.integration.ready);
      return page;
    }
    const page = await open(false);
    await check('file-offline-and-integration-suite', async () => {
      const evidence = await page.evaluate(() => ({ url: location.href, online: navigator.onLine, report: window.RescueManager.integration.report }));
      assert(evidence.url.startsWith('file:///') && !evidence.online, 'Not file:// offline');
      result.integrationReport = evidence.report;
      assert(evidence.report.passed && evidence.report.checks.length === 9, 'Initial integration checks failed');
      return evidence;
    });
    const peer = await open(true);
    const state = await page.evaluate(() => window.RescueManager.integration.state);
    await check('second-tab-exclusion-expiry-and-stale-owner-rejection', async () => {
      const evidence = await peer.evaluate(async state => {
        const root = window.RescueManager, w = root.storage.writeCoordinator;
        const owner = crypto.randomUUID();
        root.integration.peerOwner = owner;
        return { owner, initiallyAllowed: await w.acquire(owner, state.datasetId) };
      }, state);
      await page.evaluate(async state => {
        const w = window.RescueManager.storage.writeCoordinator;
        await w.release(state.owner, state.datasetId);
        await w.acquire(state.owner, state.datasetId, 1);
      }, state);
      await new Promise(resolve => setTimeout(resolve, 20));
      evidence.afterExpiry = await peer.evaluate(state => window.RescueManager.storage.writeCoordinator.acquire(window.RescueManager.integration.peerOwner, state.datasetId), state);
      evidence.staleWrite = await page.evaluate(async state => {
        const w = window.RescueManager.storage.writeCoordinator;
        const active = await w.readActive();
        try {
          await w.mutate({ owner: state.owner, datasetId: state.datasetId, expectedRevision: active.revision, operationId: crypto.randomUUID(), fingerprint: 'stale-owner', stores: ['testRecords'] }, access => access.add('testRecords', { datasetId: state.datasetId, id: crypto.randomUUID() }));
          return 'unexpected-success';
        } catch (error) { return error.name; }
      }, state);
      assert(!evidence.initiallyAllowed && evidence.afterExpiry && evidence.staleWrite === 'LeaseLostError', 'Lease exclusion failed');
      return evidence;
    });
    await check('atomic-dataset-activation-invalidates-previous-writer', async () => {
      const activated = await peer.evaluate(async state => {
        const root = window.RescueManager, w = root.storage.writeCoordinator;
        const before = await w.readActive();
        const active = await w.activateDataset({ owner: root.integration.peerOwner, datasetId: state.datasetId, expectedRevision: before.revision }, state.targetId);
        const writer = await root.integration.read('meta', 'writer');
        return { before, active, writer, previous: await root.integration.read('datasets', state.datasetId), target: await root.integration.read('datasets', state.targetId) };
      }, state);
      const staleWrite = await page.evaluate(async state => {
        const w = window.RescueManager.storage.writeCoordinator;
        try {
          await w.mutate({ owner: state.owner, datasetId: state.datasetId, expectedRevision: 0, operationId: crypto.randomUUID(), fingerprint: 'old-dataset', stores: ['testRecords'] }, () => {});
          return 'unexpected-success';
        } catch (error) { return error.name; }
      }, state);
      assert(activated.active.datasetId === state.targetId && activated.active.revision === activated.before.revision + 1 && activated.writer === null && activated.previous.state === 'retired' && activated.target.state === 'active' && staleWrite === 'DatasetChangedError', 'Activation was not coherent');
      return { ...activated, staleWrite, restoreImplemented: false };
    });
    await peer.evaluate(() => window.RescueManager.storage.database.close());
    await peer.close();
    await check('future-database-version-rejected-without-data-loss', () => page.evaluate(() => window.RescueManager.integration.futureVersion()));
    await check('dedicated-test-database-and-no-page-network-errors', async () => {
      const databases = await page.evaluate(() => indexedDB.databases());
      assert(databases.length > 0 && databases.every(db => db.name.startsWith('animal-rescue-manager-test-')), 'Unexpected non-test database');
      assert(!result.pageErrors.length && !result.externalRequests.length, 'Runtime errors or external requests');
      return { databases, pageErrors: result.pageErrors, externalRequests: result.externalRequests };
    });
    await check('complete-owned-browser-process-close', () => session.close());
    await check('tested-source-files-remained-unchanged', async () => {
      assert(JSON.stringify(result.sourceFiles) === JSON.stringify(await sources()), 'Source files changed during the run');
      return { count: result.sourceFiles.length, hashesMatch: true };
    });
  } catch (error) { result.fatalError = { message: error.message, stack: error.stack }; }
  finally {
    if (session) { try { await session.close(); } catch (error) { result.cleanupError = String(error); } }
    result.completedAt = new Date().toISOString();
    result.status = result.fatalError || result.cleanupError || result.checks.some(check => !check.passed) ? 'failed' : 'passed';
    await fs.writeFile(path.join(root, 'tests/results', options.output), JSON.stringify(result, null, 2) + '\n');
    console.log(result.status.toUpperCase());
    if (result.status !== 'passed') process.exitCode = 1;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
