/* Developer-only orchestrator of the existing real file:// module suites.
   Each child owns and closes its isolated profiles; this runner never terminates browsers. */
'use strict';
const fs = require('node:fs/promises'), path = require('node:path'), { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const suites = Object.freeze([
  'a11y-ui', 'adoption-register-ui', 'animal-filters-ui', 'animal-import-ui', 'animal-print-ui',
  'asset-retention-ui', 'contact-import-ui', 'dashboard-ui', 'demo-ui', 'document-dates-ui',
  'donation-import-ui', 'finance-import-ui', 'finance-ui', 'health-ui', 'history-adoption-ui',
  'history-corrections-ui', 'history-departure-ui', 'history-linked-facts-ui', 'history-workflow-ui',
  'integral-ui', 'module-exports-ui', 'module-import-ui', 'nav-diagnostics-ui', 'package-ui',
  'related-import-ui', 'read-cache-ui', 'resources-reports-ui', 'retention-ui', 'search-history-ui',
  'settings-configuration-ui', 'trash-purge-ui', 'weights-history-ui', 'workflows-ui', 'workspace-ui', 'write-through-ui'
]);
async function exists(file) { try { await fs.access(file); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } }
async function main() {
  if (process.argv.length === 3 && process.argv[2] === '--list') { console.log(suites.join('\n')); return; }
  const options = { machine: 'unspecified' };
  for (let i = 2; i < process.argv.length; i += 2) {
    const key = process.argv[i].replace(/^--/, '');
    if (!['browser', 'label', 'machine', 'executable', 'suites', 'volume-steps'].includes(key) || !process.argv[i + 1]) throw Error('Use --browser --label --machine --executable --suites --volume-steps, or --list');
    if (Object.prototype.hasOwnProperty.call(options, key) && key !== 'machine') throw Error('Duplicate option: ' + key);
    options[key] = process.argv[i + 1];
  }
  if (!['chrome', 'edge'].includes(options.browser) || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,100}$/.test(options.label || '')) throw Error('Choose a browser and a safe unique label');
  const selected = options.suites ? options.suites.split(',') : [...suites];
  if (!selected.length || new Set(selected).size !== selected.length || selected.some(name => !suites.includes(name))) throw Error('Choose known, distinct suite names from --list');
  if (options['volume-steps']) {
    const steps = options['volume-steps'].split(',').map(Number);
    if (!steps.every((v, i) => Number.isSafeInteger(v) && v >= 0 && (!i || v > steps[i - 1]))) throw Error('Volume steps must be nonnegative increasing integers');
    selected.push('volume-ui');
  }
  const summaryFile = path.join(root, 'tests/results', 'regression-' + options.label + '-' + options.browser + '.json');
  const jobs = selected.map(name => ({ name, output: name + '-' + options.label + '-' + options.browser + '.json' }));
  // Check the complete output set before starting. Evidence is never overwritten.
  for (const file of [summaryFile, ...jobs.map(job => path.join(root, 'tests/results', job.output))]) if (await exists(file)) throw Error('Evidence already exists: ' + path.basename(file));
  for (const job of jobs) await fs.access(path.join(__dirname, job.name + '.cjs'));
  const result = { format: 'rescue-manager-regression-run', version: 1, browser: options.browser, label: options.label,
    machine: options.machine, startedAt: new Date().toISOString(), status: 'running', runs: [],
    limitations: ['Only the selected existing suites are executed. Each report retains its scope, hashes and limitations.',
      'No physical device, screen reader, Firefox or commercial acceptance is inferred from this summary.',
      'Performance timings depend on machine load; run volume separately when comparing latency.'] };
  await fs.mkdir(path.dirname(summaryFile), { recursive: true });
  const persist = () => fs.writeFile(summaryFile, JSON.stringify(result, null, 2) + '\n');
  await fs.writeFile(summaryFile, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  for (const job of jobs) {
    const args = [path.join(__dirname, job.name + '.cjs'), '--browser', options.browser, '--machine', options.machine, '--output', job.output];
    if (options.executable) args.push('--executable', options.executable);
    if (job.name === 'volume-ui') args.push('--steps', options['volume-steps']);
    let code = null, launchError = null, report = null;
    try {
      code = await new Promise((resolve, reject) => {
        const child = spawn(process.execPath, args, { cwd: root, windowsHide: true, stdio: 'inherit' });
        child.once('error', reject); child.once('exit', resolve);
      });
    } catch (error) { launchError = error.message; }
    try { report = JSON.parse(await fs.readFile(path.join(root, 'tests/results', job.output), 'utf8')); }
    catch (error) { launchError = launchError || error.message; }
    const failed = report?.checks?.filter(check => check.passed === false || check.status === 'failed').length || 0;
    const passed = code === 0 && !launchError && report?.status === 'passed' && report.browser === options.browser && !failed;
    result.runs.push({ suite: job.name, report: job.output, exitCode: code, status: passed ? 'passed' : 'failed',
      checks: report?.checks?.length || 0, failedChecks: failed, ...(launchError ? { error: launchError } : {}) });
    await persist();
  }
  result.completedAt = new Date().toISOString();
  result.status = result.runs.every(run => run.status === 'passed') ? 'passed' : 'failed';
  result.checks = result.runs.reduce((sum, run) => sum + run.checks, 0);
  await persist();
  console.log(result.status.toUpperCase() + ': ' + result.runs.length + ' suites, ' + result.checks + ' checks. ' + path.basename(summaryFile));
  if (result.status !== 'passed') process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
