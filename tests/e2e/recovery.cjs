/* Developer-only file:// fault suite and real forced-close checkpoints. */
'use strict';
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { launch } = require('./chromium.cjs');
const execFileAsync = promisify(execFile);
const root = path.resolve(__dirname, '../..'), html = path.join(root, 'tests/integration/recovery.html');
const options = { browser: 'chrome', machine: 'unspecified', output: 'recovery-chrome.json', mode: 'all' };
for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index].replace(/^--/, ''), value = process.argv[index + 1];
  if (!['browser', 'machine', 'output', 'executable', 'mode'].includes(key) || !value) throw new Error('Use --browser, --machine, --output, --executable, --mode all|crashes');
  options[key] = value;
}
if (!['chrome', 'edge'].includes(options.browser) || !['all', 'crashes'].includes(options.mode) || !/^[a-zA-Z0-9._-]+\.json$/.test(options.output)) throw new Error('Invalid browser, mode or output filename');
const result = { format: 'rescue-manager-recovery-test', version: 1, browser: options.browser, machine: options.machine,
  startedAt: new Date().toISOString(), operatingSystem: { type: os.type(), release: os.release(), version: os.version() },
  mode: options.mode, launches: [], closures: [], forcedClosures: [], checks: [], pageErrors: [], consoleErrors: [], externalRequests: [],
  limitations: ['Quota and activation failures are explicitly injected into real IndexedDB transactions; this does not exhaust physical disk quota.',
    'Forced browser termination is real; deterministic test-only scheduling pauses after a committed preparation batch, before activation, or after activation complete.',
    'No kill while an IndexedDB transaction is mid-commit or physical power-loss durability is claimed.',
    'Desktop headless Chrome/Edge only; Firefox deferred by user instruction; no real mobile/tablet coverage.',
    'Only page-originated HTTP requests are observed; browser-internal traffic is outside this trace.'] };
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const evidencePath = path.join(root, 'tests/results', options.output);
// Save diagnostics after each meaningful step, including an unexpected unfinished promise.
function checkpoint() { fsSync.writeFileSync(evidencePath, JSON.stringify({ ...result, status: 'in-progress' }, null, 2) + '\n'); }
process.on('beforeExit', () => {
  if (!result.completedAt && result.sourceFiles) {
    result.fatalError = { name: 'RunnerIncompleteError', message: 'The runner event loop ended before all asynchronous checks completed' };
    result.status = 'failed'; result.completedAt = new Date().toISOString();
    fsSync.writeFileSync(evidencePath, JSON.stringify(result, null, 2) + '\n'); process.exitCode = 1;
  }
});
async function sources() {
  const files = [html, __filename, path.join(__dirname, 'chromium.cjs'), ...Array.from((await fs.readFile(html, 'utf8')).matchAll(/<script[^>]+src="([^"]+)"/g), match => path.resolve(path.dirname(html), match[1]))];
  return Promise.all(files.map(async file => ({ file: path.relative(root, file).replaceAll('\\', '/'), sha256: hash(await fs.readFile(file)) })));
}
async function processes() {
  assert(process.platform === 'win32', 'Forced-close process identity checks currently support Windows only; use the portable suite.cjs for non-crash cases');
  const source = "@((Get-CimInstance Win32_Process -ErrorAction Stop) | Select-Object ProcessId,ParentProcessId,CommandLine,@{Name='CreatedAt';Expression={$_.CreationDate.ToUniversalTime().ToString('o')}}) | ConvertTo-Json -Compress";
  const response = await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(source, 'utf16le').toString('base64')], { windowsHide: true, timeout: 20000 });
  const rows = JSON.parse(response.stdout.trim() || '[]'); return Array.isArray(rows) ? rows : [rows];
}
function descendants(rows, pid) {
  const ids = new Set([pid]); let previous;
  do { previous = ids.size; rows.forEach(row => { if (ids.has(row.ParentProcessId)) ids.add(row.ProcessId); }); } while (previous !== ids.size);
  return rows.filter(row => ids.has(row.ProcessId));
}
async function forceOwnProfile(session, profile, phase) {
  const rows = await processes(), parent = rows.find(row => row.ProcessId === session.child.pid);
  const profileArgument = '--user-data-dir=' + profile;
  assert(parent && parent.CommandLine.includes(profileArgument), 'Refusing to terminate: root process does not own the exact isolated profile');
  const tracked = descendants(rows, parent.ProcessId), identities = new Set(tracked.map(row => row.ProcessId + ':' + row.CreatedAt));
  const current = await processes(), attempts = [];
  const owned = current.filter(row => identities.has(row.ProcessId + ':' + row.CreatedAt));
  // Stop the root first so the browser cannot replace killed utility/renderer children.
  const order = [...owned.filter(row => row.ProcessId === parent.ProcessId), ...owned.filter(row => row.ProcessId !== parent.ProcessId).reverse()];
  for (const row of order) {
    try { process.kill(row.ProcessId); attempts.push({ pid: row.ProcessId, createdAt: row.CreatedAt, signalled: true }); }
    catch (error) { attempts.push({ pid: row.ProcessId, createdAt: row.CreatedAt, signalled: false, error: error.code }); }
  }
  const exitDeadline = Date.now() + 15000;
  while (session.child.exitCode === null && session.child.signalCode === null && Date.now() < exitDeadline) await pause(100);
  const exitCodeBeforeDisconnect = session.child.exitCode, signalCodeBeforeDisconnect = session.child.signalCode;
  assert(exitCodeBeforeDisconnect !== null || signalCodeBeforeDisconnect !== null, 'The signalled root has not emitted a process exit; refusing a graceful close as crash evidence');
  // Release automation handles only AFTER the actual root exit was observed. No live browser receives Browser.close here.
  session.child.stderr?.destroy();
  await Promise.race([session.browser.close().catch(() => {}), pause(3000)]);
  let remaining = [], deadline = Date.now() + 10000;
  do { await pause(200); remaining = (await processes()).filter(row => identities.has(row.ProcessId + ':' + row.CreatedAt)); } while (remaining.length && Date.now() < deadline);
  const closure = { phase, method: 'Real process.kill/TerminateProcess before any connection cleanup, restricted to verified PID and creation-time identities of the isolated profile tree', rootPid: parent.ProcessId,
    exitCodeBeforeDisconnect, signalCodeBeforeDisconnect, disconnectedAfterProcessExit: true, profile: path.relative(root, profile), trackedProcesses: tracked, terminationAttempts: attempts, remainingProcesses: remaining, checkedAt: new Date().toISOString() };
  result.forcedClosures.push(closure);
  checkpoint();
  assert(attempts.some(row => row.pid === parent.ProcessId && row.signalled) && remaining.length === 0, 'Forced-close verification failed: ' + JSON.stringify({ rootPid: parent.ProcessId, attempts, remaining }));
  return { rootPid: parent.ProcessId, terminated: attempts.filter(row => row.signalled).length, remaining: remaining.length, profileVerified: true };
}
async function check(id, work) {
  try { const evidence = await work(); result.checks.push({ id, passed: true, evidence }); checkpoint(); console.log('PASS ' + id); return evidence; }
  catch (error) { result.checks.push({ id, passed: false, error: { name: error.name, message: error.message, stack: error.stack } }); checkpoint(); console.log('FAIL ' + id + ': ' + error.message); return null; }
}
(async () => {
  const sessions = [], forcedSessions = new Set(), runDirectory = path.join(root, '.tmp', 'recovery-' + options.browser + '-' + Date.now());
  let ownsEvidenceFile = false;
  try {
    const output = path.join(root, 'tests/results', options.output);
    await fs.access(output).then(() => { throw new Error('Evidence output already exists; choose a new filename'); }, error => { if (error.code !== 'ENOENT') throw error; });
    await fs.writeFile(output, JSON.stringify({ ...result, status: 'in-progress' }, null, 2) + '\n', { flag: 'wx' }); ownsEvidenceFile = true;
    result.sourceFiles = await sources();
    async function open(profile, mode) {
      const session = await launch(options.browser, profile, result, false, { executable: options.executable }); sessions.push(session);
      const page = await session.context.newPage();
      page.on('pageerror', error => result.pageErrors.push(String(error)));
      page.on('console', message => { if (message.type() === 'error') result.consoleErrors.push(message.text()); });
      page.on('request', request => { if (/^https?:/i.test(request.url())) result.externalRequests.push(request.url()); });
      await page.goto(pathToFileURL(html).href + (mode ? '?' + mode + '=1' : ''), { waitUntil: 'load', timeout: 30000 });
      await page.waitForFunction(() => window.RescueManager?.integration?.ready, null, { timeout: 30000 });
      await page.evaluate(() => window.RescueManager.integration.ready);
      const context = await page.evaluate(() => ({ protocol: location.protocol, online: navigator.onLine, dbName: window.RescueManager.config.dbName }));
      assert(context.protocol === 'file:' && context.online === false && context.dbName.startsWith('animal-rescue-manager-test-'), 'Not offline file:// with a dedicated test database');
      return { session, page };
    }
    if (options.mode === 'all') {
    const profile = path.join(runDirectory, 'faults-profile'), first = await open(profile, '');
    await check('injected-failures-cancellation-and-revalidation-suite', async () => {
      result.suiteReport = await first.page.evaluate(() => window.RescueManager.integration.report);
      assert(result.suiteReport.passed && result.suiteReport.checks.length > 0, 'Internal recovery suite failed'); return result.suiteReport;
    });
    const before = await first.page.evaluate(() => window.RescueManager.integration.inspect());
    await check('complete-close-after-injected-failure-suite', () => first.session.close());
    const second = await open(profile, 'peer');
    await check('all-active-and-staging-data-persist-after-normal-reopen', async () => {
      const after = await second.page.evaluate(() => window.RescueManager.integration.inspect());
      assert(JSON.stringify(before) === JSON.stringify(after), 'Active, retired or staged datasets changed after reopen'); return { datasetCount: after.datasets.length, activeDigest: after.active.digest, allDatasetsIdentical: true };
    });
    await check('complete-close-after-normal-reopen', () => second.session.close());
    }
    for (const phase of ['preparing', 'prepared', 'activated']) {
      const crashProfile = path.join(runDirectory, phase + '-profile'), started = await open(crashProfile, 'crash');
      await started.page.evaluate(phaseValue => { window.RescueManager.integration.startCrash(phaseValue).catch(error => { window.RescueManager.integration.crashError = { name: error.name, message: error.message, stack: error.stack }; }); }, phase);
      await started.page.waitForFunction(() => window.RescueManager.integration.crashCheckpoint || window.RescueManager.integration.crashError, null, { timeout: 30000 });
      const setup = await started.page.evaluate(async () => ({ checkpoint: window.RescueManager.integration.crashCheckpoint, error: window.RescueManager.integration.crashError, inspect: await window.RescueManager.integration.inspect() }));
      assert(!setup.error, 'Crash fixture failed: ' + JSON.stringify(setup.error));
      const killed = await check('real-forced-close-' + phase, () => forceOwnProfile(started.session, crashProfile, phase));
      assert(killed, 'Forced close failed; refusing to reopen a profile whose closure is unverified');
      forcedSessions.add(started.session);
      const reopened = await open(crashProfile, 'peer');
      await check('durable-dataset-state-after-real-forced-close-' + phase, async () => {
        const after = await reopened.page.evaluate(() => window.RescueManager.integration.inspect()), checkpoint = setup.checkpoint;
        const target = after.datasets.find(row => row.id !== checkpoint.baseline.datasetId), previous = after.datasets.find(row => row.id === checkpoint.baseline.datasetId);
        assert(target && previous && previous.snapshot.digest === checkpoint.baseline.digest, 'Previous data was lost or corrupted after forced close');
        if (phase === 'activated') {
          assert(previous.state === 'retired' && target.state === 'active' && after.active.datasetId === checkpoint.activeAfterComplete.datasetId && after.active.digest === checkpoint.target.digest, 'Complete activation did not survive forced close');
          assert(after.active.digest !== checkpoint.baseline.digest, 'Fixture did not distinguish old and restored content');
        } else {
          assert(after.active.datasetId === checkpoint.baseline.datasetId && after.active.digest === checkpoint.baseline.digest && target.state === 'staging', 'Unactivated staging became active or replaced previous data after crash');
          if (phase === 'preparing') assert(!target.validation && target.snapshot.counts.contacts === 0 && target.snapshot.counts.organizationSettings === 1, 'Preparation checkpoint was not partial');
          else assert(target.validation && target.snapshot.digest === checkpoint.target.digest, 'Validated preparation did not survive before activation');
        }
        assert(JSON.stringify(setup.inspect) === JSON.stringify(after), 'Persisted dataset metadata or bytes changed after forced close');
        return { phase, checkpoint, before: setup.inspect, after, previousDigestIntact: true, stagedBecameActiveOnReopen: false };
      });
      await check('complete-close-after-crash-reopen-' + phase, () => reopened.session.close());
    }
    await check('no-runtime-errors-or-external-page-requests', async () => {
      assert(!result.pageErrors.length && !result.consoleErrors.length && !result.externalRequests.length, 'Runtime errors or external requests were observed');
      return { pageErrors: result.pageErrors, consoleErrors: result.consoleErrors, externalRequests: result.externalRequests };
    });
    await check('tested-source-files-remained-unchanged', async () => {
      const after = await sources(); assert(JSON.stringify(after) === JSON.stringify(result.sourceFiles), 'Source files changed during the browser run'); return { count: after.length, hashesMatch: true };
    });
  } catch (error) { result.fatalError = { name: error.name, message: error.message, stack: error.stack }; }
  finally {
    for (const session of sessions) {
      if (forcedSessions.has(session)) continue;
      let cleanupTimer;
      try { await Promise.race([session.close(), new Promise((_, reject) => { cleanupTimer = setTimeout(() => reject(new Error('Owned browser cleanup exceeded 45 seconds')), 45000); })]); }
      catch (error) { result.cleanupErrors = [...(result.cleanupErrors || []), String(error)]; }
      finally { clearTimeout(cleanupTimer); }
    }
    result.completedAt = new Date().toISOString();
    result.status = result.fatalError || result.cleanupErrors || !result.checks.length || result.checks.some(row => !row.passed) ? 'failed' : 'passed';
    const output = path.join(root, 'tests/results', options.output);
    try { if (ownsEvidenceFile) await fs.writeFile(output, JSON.stringify(result, null, 2) + '\n'); }
    catch (error) { console.error('Evidence was not overwritten: ' + error.message); process.exitCode = 1; }
    console.log(result.status.toUpperCase()); if (result.status !== 'passed') process.exitCode = 1;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
