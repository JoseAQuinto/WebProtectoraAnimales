/* Developer-only tests. No server or weakened browser security is used. */
'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { spawn, execFile } = require('node:child_process');
const { promisify } = require('node:util');
const execFileAsync = promisify(execFile);
const root = path.resolve(__dirname, '../..');
const runtime = process.env.PLAYWRIGHT_PATH || path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { chromium } = require(runtime);
const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const binaries = {
  chrome: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  edge: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
};

async function powershell(source) {
  const encoded = Buffer.from(source, 'utf16le').toString('base64');
  const result = await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], { windowsHide: true, timeout: 20000 });
  return JSON.parse(result.stdout.trim() || 'null');
}

async function processes() {
  return (await powershell("@((Get-CimInstance Win32_Process -ErrorAction Stop) | Select-Object ProcessId,ParentProcessId,CommandLine,@{Name='CreatedAt';Expression={$_.CreationDate.ToUniversalTime().ToString('o')}}) | ConvertTo-Json -Compress")) || [];
}

async function terminateTree(pid) {
  const original = descendants(await processes(), pid);
  const identities = new Set(original.map(row => row.ProcessId + ':' + row.CreatedAt));
  const current = (await processes()).filter(row => identities.has(row.ProcessId + ':' + row.CreatedAt));
  const attempts = [];
  for (const row of current.reverse()) {
    try { process.kill(row.ProcessId); attempts.push({ pid: row.ProcessId, signalled: true }); }
    catch (error) { attempts.push({ pid: row.ProcessId, signalled: false, error: error.code }); }
  }
  return attempts;
}

function descendants(rows, pid) {
  const ids = new Set([pid]);
  let previous;
  do {
    previous = ids.size;
    for (const row of rows) if (ids.has(row.ParentProcessId)) ids.add(row.ProcessId);
  } while (previous !== ids.size);
  return rows.filter(row => ids.has(row.ProcessId));
}

function requireThat(condition, message) {
  if (!condition) throw new Error(message);
}

async function launch(name, profile, result, denyStorage = false) {
  await fs.mkdir(profile, { recursive: true });
  const activePort = path.join(profile, 'DevToolsActivePort');
  await fs.rm(activePort, { force: true });
  if (denyStorage) {
    await fs.mkdir(path.join(profile, 'Default'), { recursive: true });
    await fs.writeFile(path.join(profile, 'Default', 'Preferences'), JSON.stringify({ profile: { default_content_setting_values: { cookies: 2 } } }));
  }
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + profile, '--no-first-run', '--no-default-browser-check', 'about:blank'];
  const child = spawn(binaries[name], args, { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '';
  child.stderr.on('data', chunk => { stderr = (stderr + String(chunk)).slice(-12000); });
  let launchError;
  child.on('error', error => { launchError = error; });
  const startedAt = Date.now();
  let port;
  while (Date.now() - startedAt < 20000) {
    if (launchError) throw launchError;
    if (child.exitCode !== null) throw new Error('Browser exited before connection: ' + child.exitCode + ': ' + stderr);
    try { port = Number((await fs.readFile(activePort, 'utf8')).split(/\r?\n/)[0]); } catch (_) { /* Browser has not created its endpoint yet. */ }
    if (port) break;
    await pause(100);
  }
  if (!port) { child.kill(); throw new Error('Browser did not expose its development connection: ' + stderr); }
  let browser;
  try { browser = await chromium.connectOverCDP('http://127.0.0.1:' + port); }
  catch (error) { await terminateTree(child.pid); throw error; }
  const context = browser.contexts()[0];
  await context.setOffline(true);
  const session = await browser.newBrowserCDPSession();
  const version = await session.send('Browser.getVersion');
  result.launches.push({ startedAt: new Date(startedAt).toISOString(), profile: path.relative(root, profile), pid: child.pid, args, version, storageDeniedPreference: denyStorage });
  let closed = false;
  return {
    browser, context, child, version,
    async close() {
      if (closed) return;
      closed = true;
      let before = [];
      let inspectionError = null;
      try { before = descendants(await processes(), child.pid); } catch (error) { inspectionError = String(error); }
      await session.send('Browser.close').catch(() => {});
      const deadline = Date.now() + 10000;
      while (child.exitCode === null && Date.now() < deadline) await pause(100);
      let forcedTermination = false;
      let terminationAttempts = [];
      if (child.exitCode === null) {
        forcedTermination = true;
        terminationAttempts = await terminateTree(child.pid);
        const terminationDeadline = Date.now() + 5000;
        while (child.exitCode === null && Date.now() < terminationDeadline) await pause(100);
      }
      let remaining = [];
      try {
        const identities = new Set(before.map(row => row.ProcessId + ':' + row.CreatedAt));
        remaining = (await processes()).filter(row => identities.has(row.ProcessId + ':' + row.CreatedAt));
        if (remaining.length) {
          forcedTermination = true;
          for (const row of remaining) {
            try { process.kill(row.ProcessId); terminationAttempts.push({ pid: row.ProcessId, signalled: true }); }
            catch (error) { terminationAttempts.push({ pid: row.ProcessId, signalled: false, error: error.code }); }
          }
          const remainingDeadline = Date.now() + 5000;
          while (remaining.length && Date.now() < remainingDeadline) {
            await pause(200);
            remaining = (await processes()).filter(row => identities.has(row.ProcessId + ':' + row.CreatedAt));
          }
        }
      } catch (error) { inspectionError = String(error); }
      const closure = { rootPid: child.pid, exitCode: child.exitCode, forcedTermination, terminationAttempts, method: forcedTermination ? 'Browser.close followed by forced termination of individually verified owned process identities' : 'Browser.close', trackedProcesses: before, remainingProcesses: remaining, inspectionError, checkedAt: new Date().toISOString() };
      result.closures.push(closure);
      if (child.exitCode === null) child.kill();
      requireThat(!inspectionError, 'Could not inspect complete owned browser process tree: ' + inspectionError);
      requireThat(child.exitCode !== null && remaining.length === 0, 'Owned browser processes remained after close');
      return closure;
    }
  };
}

async function open(context, url, result) {
  const page = await context.newPage();
  page.on('pageerror', error => result.pageErrors.push({ url: page.url(), message: String(error) }));
  page.on('console', message => {
    if (message.type() === 'error') result.consoleErrors.push({ url: page.url(), message: message.text() });
  });
  page.on('request', request => {
    if (/^https?:/i.test(request.url())) result.externalRequests.push({ url: request.url(), method: request.method() });
  });
  await page.goto(url, { waitUntil: 'load', timeout: 20000 });
  await page.waitForFunction(() => window.RescueManager && window.RescueManager.probe, { timeout: 10000 });
  await page.evaluate(() => window.RescueManager.probe.ready);
  return page;
}

async function marker(page) {
  return page.evaluate(async () => {
    const value = await window.RescueManager.probe.readMarker();
    if (!value) return null;
    return { ...value, blob: undefined, blobIsBlob: value.blob instanceof Blob, blobType: value.blob && value.blob.type, blobText: value.blob instanceof Blob ? await value.blob.text() : null };
  });
}

async function check(result, id, operation) {
  const startedAt = new Date().toISOString();
  try {
    const evidence = await operation();
    result.checks.push({ id, status: 'passed', startedAt, evidence });
    console.log(result.browser + ': PASS ' + id);
    return evidence;
  } catch (error) {
    result.checks.push({ id, status: 'failed', startedAt, error: String(error), stack: error.stack });
    console.log(result.browser + ': FAIL ' + id + ': ' + error.message);
    return null;
  }
}

async function runBrowser(name) {
  const runDirectory = path.join(root, '.tmp', 'chromium-' + name + '-' + Date.now());
  await fs.mkdir(runDirectory, { recursive: true });
  const html = path.join(root, 'tests/viability/index.html');
  const url = pathToFileURL(html).href;
  const result = {
    schema: 1, browser: name, startedAt: new Date().toISOString(),
    executable: binaries[name], applicationUrl: url,
    mode: 'Installed stable desktop binary, native headless, isolated persistent profile, offline before first file navigation',
    limitations: ['Desktop headless automation does not establish real mobile or tablet support.', 'Only page-originated HTTP requests are observed; browser-internal traffic is outside this trace.', 'Move/copy storage behavior is observational and must not be treated as portable data transfer.'],
    operatingSystem: { type: os.type(), release: os.release(), version: os.version(), architecture: os.arch() },
    launches: [], closures: [], checks: [], pageErrors: [], consoleErrors: [], externalRequests: []
  };
  try {
    result.operatingSystemDetails = await powershell('Get-CimInstance Win32_OperatingSystem -ErrorAction Stop | Select-Object Caption,Version,BuildNumber,OSArchitecture | ConvertTo-Json -Compress');
  } catch (error) { result.osInspectionError = String(error); }
  const openLaunches = [];
  let session;
  let page;
  try {
    result.entrypointSha256 = crypto.createHash('sha256').update(await fs.readFile(html)).digest('hex');
    session = await launch(name, path.join(runDirectory, 'profile'), result);
    openLaunches.push(session);
    page = await open(session.context, url, result);
    await check(result, 'offline-first-file-load-local-resources', async () => {
      const evidence = await page.evaluate(() => ({
        url: location.href, online: navigator.onLine, userAgent: navigator.userAgent,
        platform: navigator.platform, secureContext: isSecureContext,
        css: getComputedStyle(document.documentElement).getPropertyValue('--probe-css-ready').trim().replace(/["']/g, ''),
        scripts: Array.from(document.scripts, script => ({ src: script.src, type: script.type })),
        stylesheets: Array.from(document.styleSheets, sheet => sheet.href),
        report: window.RescueManager.probe.report
      }));
      requireThat(evidence.url.startsWith('file:///'), 'Navigation was not file://');
      requireThat(evidence.online === false, 'Browser was not offline at first opening');
      requireThat(evidence.css === 'ready', 'External local CSS did not load');
      requireThat(evidence.scripts.length > 0 && evidence.scripts.every(script => script.src.startsWith('file:///') && script.type !== 'module'), 'Scripts were not external local classic scripts');
      requireThat(result.pageErrors.length === 0, 'Page errors at first load');
      return evidence;
    });
    await check(result, 'indexeddb-blob-commit-and-abort', async () => {
      const evidence = await page.evaluate(() => window.RescueManager.probe.run());
      result.probeReport = evidence;
      requireThat(evidence && Array.isArray(evidence.checks), 'Probe report does not contain checks');
      requireThat(evidence.passed === true && evidence.checks.every(item => item.passed === true), 'Probe reported a failed check: ' + JSON.stringify(evidence.checks));
      return evidence;
    });
    const expectedMarker = name + '-persistent-' + crypto.randomUUID();
    await check(result, 'marker-write-blob-read', async () => {
      await page.evaluate(value => window.RescueManager.probe.writeMarker(value), expectedMarker);
      const evidence = await marker(page);
      requireThat(evidence.value === expectedMarker && evidence.blobIsBlob && evidence.blobText === 'offline-blob-ñ', 'Stored marker/Blob did not round-trip');
      return evidence;
    });
    await check(result, 'second-tab-transactional-writer-lease', async () => {
      await page.locator('#release').click();
      const second = await open(session.context, url, result);
      await second.locator('#release').click();
      const first = await page.evaluate(() => window.RescueManager.probe.acquire('first-owner'));
      const denied = await second.evaluate(() => window.RescueManager.probe.acquire('second-owner'));
      await page.evaluate(() => window.RescueManager.probe.release('first-owner'));
      const afterRelease = await second.evaluate(() => window.RescueManager.probe.acquire('second-owner'));
      await second.evaluate(() => window.RescueManager.probe.release('second-owner'));
      const shortLease = await page.evaluate(() => window.RescueManager.probe.acquire('expired-owner', 1));
      await pause(10);
      const takeover = await second.evaluate(() => window.RescueManager.probe.acquire('replacement-owner'));
      const staleWrite = await page.evaluate(async () => {
        try { await window.RescueManager.probe.guardedWrite('expired-owner', 'must-not-save'); return { saved: true }; }
        catch (error) { return { saved: false, error: error.name }; }
      });
      const afterStaleAttempt = await marker(page);
      await second.evaluate(value => window.RescueManager.probe.guardedWrite('replacement-owner', value), expectedMarker);
      await second.evaluate(() => window.RescueManager.probe.release('replacement-owner'));
      await second.close();
      requireThat(first === true && denied === false && afterRelease === true, 'Second tab was not correctly excluded by lease');
      requireThat(shortLease && takeover && !staleWrite.saved && staleWrite.error === 'AbortError' && afterStaleAttempt.value === expectedMarker, 'Expired/replaced owner wrote data or did not abort cleanly');
      return { first, denied, afterRelease, shortLease, takeover, staleWrite, afterStaleAttempt };
    });
    await check(result, 'json-download-and-file-selection', async () => {
      const downloadPromise = page.waitForEvent('download');
      await page.evaluate(() => window.RescueManager.probe.download());
      const download = await downloadPromise;
      const destination = path.join(runDirectory, 'downloaded-report.json');
      await download.saveAs(destination);
      const text = await fs.readFile(destination, 'utf8');
      const parsed = JSON.parse(text);
      requireThat(parsed && typeof parsed === 'object', 'Downloaded JSON is not an object');
      await page.locator('#json-file').setInputFiles(destination);
      await page.waitForFunction(() => /correct|error|inválido/i.test(document.querySelector('#json-result').textContent));
      const selected = await page.locator('#json-result').textContent();
      requireThat(/válido|valid|correct|acept/i.test(selected) && !/inválido|invalid|error/i.test(selected), 'JSON file selection did not report validation success: ' + selected);
      await page.locator('#json-file').setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{invalid') });
      await page.waitForFunction(previous => document.querySelector('#json-result').textContent !== previous, selected);
      const invalid = await page.locator('#json-result').textContent();
      requireThat(/inválido|invalid|error|no válido/i.test(invalid), 'Malformed JSON did not report an error: ' + invalid);
      return { filename: download.suggestedFilename(), bytes: Buffer.byteLength(text), sha256: crypto.createHash('sha256').update(text).digest('hex'), topLevelKeys: Object.keys(parsed), validSelection: selected, invalidSelection: invalid };
    });
    await check(result, 'responsive-desktop-emulation-only', async () => {
      const evidence = [];
      for (const viewport of [{ width: 768, height: 1024 }, { width: 390, height: 844 }]) {
        await page.setViewportSize(viewport);
        const sizes = await page.evaluate(() => ({ viewport: innerWidth, scroll: document.documentElement.scrollWidth, height: innerHeight }));
        evidence.push(sizes);
        await page.screenshot({ path: path.join(runDirectory, 'viewport-' + viewport.width + '.png'), fullPage: true });
        requireThat(sizes.scroll <= sizes.viewport + 1, 'Horizontal overflow at emulated viewport ' + viewport.width);
      }
      return { evidence, physicalMobileOrTabletTest: false };
    });
    await check(result, 'complete-browser-process-close', () => session.close());
    session = await launch(name, path.join(runDirectory, 'profile'), result);
    openLaunches.push(session);
    page = await open(session.context, url, result);
    await check(result, 'persistent-record-and-blob-after-full-relaunch', async () => {
      const evidence = await marker(page);
      requireThat(evidence && evidence.value === expectedMarker && evidence.blobIsBlob && evidence.blobText === 'offline-blob-ñ', 'Marker/Blob did not survive complete process close and relaunch');
      requireThat(result.closures[0] && result.closures[0].remainingProcesses.length === 0 && !result.closures[0].inspectionError, 'Full process closure was not verified');
      return evidence;
    });
    await check(result, 'copy-and-rename-path-observation', async () => {
      const copied = path.join(runDirectory, 'copied-viability');
      const renamed = path.join(runDirectory, 'renamed-viability');
      await fs.cp(path.dirname(html), copied, { recursive: true });
      const copyPage = await open(session.context, pathToFileURL(path.join(copied, 'index.html')).href, result);
      const copyMarker = await marker(copyPage);
      await copyPage.close();
      await fs.rename(copied, renamed);
      const renamedPage = await open(session.context, pathToFileURL(path.join(renamed, 'index.html')).href, result);
      const renamedMarker = await marker(renamedPage);
      await renamedPage.close();
      return { originalUrl: url, copiedUrl: pathToFileURL(path.join(copied, 'index.html')).href, renamedUrl: pathToFileURL(path.join(renamed, 'index.html')).href, originalMarker: expectedMarker, copiedMarker: copyMarker, renamedMarker, copiedSharesObservedMarker: !!copyMarker && copyMarker.value === expectedMarker, renamedSharesObservedMarker: !!renamedMarker && renamedMarker.value === expectedMarker, portabilityGuarantee: false };
    });
    await session.close();
    session = await launch(name, path.join(runDirectory, 'other-profile'), result);
    openLaunches.push(session);
    page = await open(session.context, url, result);
    await check(result, 'different-profile-has-no-marker', async () => {
      const evidence = await marker(page);
      requireThat(evidence === null, 'Unexpected marker in fresh isolated profile');
      return { marker: evidence };
    });
    await session.close();
    session = await launch(name, path.join(runDirectory, 'storage-denied-profile'), result, true);
    openLaunches.push(session);
    page = await open(session.context, url, result);
    await check(result, 'real-browser-storage-denial', async () => {
      const evidence = await page.evaluate(() => window.RescueManager.probe.report);
      const attempt = await page.evaluate(() => new Promise(resolve => {
        try {
          const request = indexedDB.open('rescue-manager-denial-proof');
          request.onerror = () => resolve({ opened: false, error: request.error && request.error.name });
          request.onsuccess = () => { request.result.close(); resolve({ opened: true }); };
        } catch (error) { resolve({ opened: false, error: error.name }); }
      }));
      requireThat(attempt.opened === false, 'Profile preference did not actually deny IndexedDB; denial test remains unverified');
      return { preference: 'profile.default_content_setting_values.cookies=2', attempt, report: evidence, bodyText: await page.locator('body').innerText() };
    });
    await check(result, 'no-page-http-requests-or-runtime-errors', async () => {
      requireThat(result.externalRequests.length === 0, 'Page attempted external requests');
      requireThat(result.pageErrors.length === 0, 'Uncaught page errors');
      return { requests: result.externalRequests, pageErrors: result.pageErrors, consoleErrors: result.consoleErrors };
    });
  } catch (error) {
    result.fatalError = { message: String(error), stack: error.stack };
  } finally {
    for (const launched of openLaunches) {
      try { await launched.close(); } catch (error) { result.cleanupErrors = [...(result.cleanupErrors || []), String(error)]; }
    }
    result.completedAt = new Date().toISOString();
    result.status = result.fatalError || result.checks.some(item => item.status === 'failed') || result.cleanupErrors ? 'failed' : 'passed';
    await fs.mkdir(path.join(root, 'tests/results'), { recursive: true });
    await fs.writeFile(path.join(root, 'tests/results', name + '.json'), JSON.stringify(result, null, 2) + '\n');
  }
  console.log(name + ': ' + result.status.toUpperCase());
  return result;
}

(async () => {
  const requested = process.argv.slice(2);
  if (requested.length === 1 && requested[0] === '--cleanup-owned') {
    const prefix = path.join(root, '.tmp', 'chromium-').toLowerCase();
    const roots = (await processes()).filter(row => row.CommandLine && row.CommandLine.toLowerCase().includes(prefix) && !row.CommandLine.includes('--type=') && /\\(?:chrome|msedge)\.exe"?\s/i.test(row.CommandLine));
    for (const row of roots) { console.log('Closing abandoned isolated test root ' + row.ProcessId); await terminateTree(row.ProcessId); }
    return;
  }
  const names = requested.length ? requested : Object.keys(binaries);
  for (const name of names) requireThat(binaries[name], 'Supported arguments are chrome and edge');
  const results = [];
  for (const name of names) results.push(await runBrowser(name));
  if (results.some(result => result.status !== 'passed')) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
