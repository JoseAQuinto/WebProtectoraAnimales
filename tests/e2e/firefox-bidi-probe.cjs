/* Developer-only diagnostic: finds which way of starting the extracted official Firefox works with WebDriver BiDi
   on this machine. Each variant uses its own empty profile under .tmp and opens index.html offline. Writes a JSON
   summary to tests/results; never changes application files. */
'use strict';
const fs = require('node:fs/promises'), path = require('node:path'), os = require('node:os');
const { spawn, execFileSync } = require('node:child_process'), { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '../..');
const runtime = process.env.PLAYWRIGHT_PATH || path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { firefox } = require(runtime);
const executable = process.env.RM_FIREFOX_BINARY || path.join(root, '.tools', 'firefox-158.0.1', 'core', 'firefox.exe');
const output = path.join(root, 'tests', 'results', 'firefox-bidi-probe-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const report = { format: 'rescue-manager-firefox-bidi-probe', version: 1, startedAt: new Date().toISOString(), executable, node: process.version, variants: [] };
// Stops only processes whose command line contains this probe's own profile directory.
function stopOwned(dir) { const source = "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like ('*' + $env:RM_PROBE_PROFILE + '*') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; $_.ProcessId }"; try { return String(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', source], { env: { ...process.env, RM_PROBE_PROFILE: dir }, windowsHide: true, timeout: 20000 })).trim().split(/s+/).filter(Boolean); } catch (error) { return ['inspection-error: ' + error.message]; } }
async function profile(label) { const dir = path.join(root, '.tmp', 'firefox-probe-' + label + '-' + Date.now()); await fs.mkdir(dir, { recursive: true }); return dir; }
async function smoke(context) {
  await context.setOffline(true);
  const page = context.pages()[0] || await context.newPage();
  await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
  return page.evaluate(async () => { await window.RescueManager.core.app.ready; return { userAgent: navigator.userAgent, indexedDB: typeof indexedDB, title: document.title }; });
}
async function viaPlaywright(label, extra) {
  const entry = { label, method: 'playwright moz-firefox', options: { ...extra, env: extra.env ? 'process.env + MOZ_CRASHREPORTER_DISABLE' : undefined } }, dir = await profile(label);
  const started = Date.now();
  try {
    const context = await firefox.launchPersistentContext(dir, { channel: 'moz-firefox', executablePath: executable, headless: true, timeout: 60000, ...extra });
    try { entry.version = context.browser()?.version(); entry.page = await smoke(context); entry.ok = true; }
    finally { await context.close().catch(() => {}); }
  } catch (error) { entry.ok = false; entry.error = String(error.message || error).slice(0, 3000); }
  entry.ms = Date.now() - started; await pause(500); entry.stoppedLeftovers = stopOwned(dir); report.variants.push(entry); console.log((entry.ok ? 'OK   ' : 'FAIL ') + label);
}
// Plain process: does the remote agent ever announce itself, and does the first process exit early?
async function manual(label, args) {
  const entry = { label, method: 'manual spawn', args }, dir = await profile(label), lines = [];
  const child = spawn(executable, [...args, '--profile', dir], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', d => lines.push('out: ' + String(d).trim())); child.stderr.on('data', d => lines.push('err: ' + String(d).trim()));
  let exit = null; child.on('exit', (code, signal) => { exit = { code, signal, afterMs: Date.now() - started }; });
  const started = Date.now();
  while (Date.now() - started < 25000 && !lines.some(line => /listening on ws:/i.test(line))) await pause(250);
  entry.announced = lines.some(line => /listening on ws:/i.test(line)); entry.firstProcessExit = exit; entry.output = lines.slice(0, 20);
  try { child.kill(); } catch (_) { /* already gone */ }
  await pause(500); entry.stoppedLeftovers = stopOwned(dir);
  report.variants.push(entry); console.log((entry.announced ? 'OK   ' : 'FAIL ') + label + (exit ? ' (first process exited ' + exit.code + ' after ' + exit.afterMs + ' ms)' : ''));
}
(async () => {
  await fs.access(executable);
  await manual('manual-default', ['--headless', '--no-remote', '--remote-debugging-port=0']);
  await manual('manual-wait-for-browser', ['--headless', '--no-remote', '--wait-for-browser', '--remote-debugging-port=0']);
  await viaPlaywright('playwright-no-remote', { args: ['--no-remote'] });
  await viaPlaywright('playwright-wait-for-browser', { args: ['--no-remote', '--wait-for-browser'] });
  await viaPlaywright('playwright-wait-for-browser-env', { args: ['--no-remote', '--wait-for-browser'], env: { ...process.env, MOZ_CRASHREPORTER_DISABLE: '1' } });
  report.completedAt = new Date().toISOString();
  await fs.writeFile(output, JSON.stringify(report, null, 2) + '\n');
  console.log('Report: ' + path.relative(root, output));
})().catch(async error => { report.fatalError = String(error.stack || error); await fs.writeFile(output, JSON.stringify(report, null, 2) + '\n').catch(() => {}); console.error(error); process.exitCode = 1; });
