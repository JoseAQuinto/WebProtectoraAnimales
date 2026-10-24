/* Developer-only real offline file:// health/task UI acceptance. Setup service writes are labelled explicitly. */
'use strict';
const fs = require('node:fs/promises'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto');
const { pathToFileURL } = require('node:url'), { launch } = require('./chromium.cjs');
const root = path.resolve(__dirname, '../..'), options = { browser: 'chrome', output: 'health-ui-chrome.json', machine: 'unspecified' };
const args = process.argv.slice(2);
for (let index = 0; index < args.length; index += 2) {
  const key = args[index].replace(/^--/, '');
  if (!['browser', 'output', 'machine', 'executable'].includes(key) || !args[index + 1]) throw new Error('Use --browser --output --machine --executable');
  options[key] = args[index + 1];
}
if (!['chrome', 'edge', 'firefox'].includes(options.browser) || !/^[a-zA-Z0-9._-]+\.json$/.test(options.output)) throw new Error('Invalid browser or output');
const output = path.join(root, 'tests/results', options.output), hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const result = { format: 'rescue-manager-health-ui-test', version: 1, browser: options.browser, machine: options.machine,
  operatingSystem: { type: os.type(), release: os.release(), version: os.version() }, startedAt: new Date().toISOString(), checks: [], launches: [], closures: [],
  screenshots: [], pageErrors: [], consoleErrors: [], externalRequests: [], limitations: ['Synthetic organization in an isolated desktop browser profile.',
    'Organization is created through UI; animal/contact/volunteer setup and changing the volunteer status use real services explicitly as test preparation.',
    'Task/plan/health operations are exercised through actual forms, without service mocks.', 'Viewport emulation does not verify physical devices.',
    'Page request observation does not cover browser-internal traffic.', 'No clinical advice is provided: instructions are deliberately fictitious user text.'] };
const assert = (condition, message) => { if (!condition) throw new Error(message); };
async function sources() {
  const html = path.join(root, 'index.html'), text = await fs.readFile(html, 'utf8');
  const files = new Set([html, ...Array.from(text.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"]+)"/g), match => path.resolve(root, match[1]))]);
  for (const file of files) if (file.endsWith('.css')) for (const match of (await fs.readFile(file, 'utf8')).matchAll(/@import\s+(?:url\()?['"]([^'"]+)['"]/g)) files.add(path.resolve(path.dirname(file), match[1]));
  return Promise.all([...files].map(async file => ({ file: path.relative(root, file).replaceAll('\\', '/'), sha256: hash(await fs.readFile(file)) })));
}
const persist = () => fs.writeFile(output, JSON.stringify(result, null, 2) + '\n');
async function check(id, work) {
  try { result.checks.push({ id, passed: true, evidence: await work() }); console.log('PASS ' + id); }
  catch (error) { result.checks.push({ id, passed: false, error: { name: error.name, message: error.message, stack: error.stack } }); console.log('FAIL ' + id + ': ' + error.message); throw error; }
  finally { await persist(); }
}
(async () => {
  try { await fs.access(output); throw new Error('Evidence exists; use a new output filename'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const sessions = [], folder = path.join(root, '.tmp', 'health-ui-' + options.browser + '-' + Date.now()), profile = path.join(folder, 'profile');
  let page, animalId, volunteerId, contactId, catalog, today, clinicalTaskId, planId;
  async function open() {
    const session = await launch(options.browser, profile, result, false, { executable: options.executable }); sessions.push(session);
    const tab = await session.context.newPage(); tab.setDefaultTimeout(10000); await tab.setViewportSize({ width: 1440, height: 1100 });
    tab.on('pageerror', error => result.pageErrors.push(String(error)));
    tab.on('console', message => { if (message.type() === 'error') result.consoleErrors.push(message.text()); });
    tab.on('request', request => { if (/^https?:/i.test(request.url())) result.externalRequests.push(request.url()); });
    await tab.goto(pathToFileURL(path.join(root, 'index.html')).href, { waitUntil: 'load' }); await tab.evaluate(() => window.RescueManager.core.app.ready); return { session, tab };
  }
  const t = key => page.evaluate(key => window.RescueManager.core.i18n.t(key), key), modal = () => page.locator('dialog[open]').last();
  const tables = () => page.evaluate(async () => (await window.RescueManager.services.context.snapshot({fresh:true})).tables);
  const click = async (key, scope = page, role = 'button') => scope.getByRole(role, { name: await t(key), exact: true }).click();
  async function closeDialogs() { for (let index = 0; index < 5 && await page.locator('dialog[open]').count(); index++) await click('common.close', modal()); }
  async function nav(key) { await closeDialogs(); await click('nav.' + key, page, 'link'); await page.waitForFunction(key => location.hash.split('/')[0] === '#' + key, key); }
  async function health() { await closeDialogs(); await page.evaluate(id => { location.hash = '#animals/' + id + '/health'; }, animalId); await page.getByRole('heading', { name: 'Salud ficticia', level: 1, exact: true }).waitFor(); await page.getByRole('button', { name: await t('hw.record'), exact: true }).waitFor(); }
  async function more() { const summary = modal().locator('details > summary').first(); if (!await summary.locator('..').evaluate(node => node.open)) await summary.click(); }
  async function save(double = false) {
    const handle = await modal().elementHandle();
    if (double) await modal().getByRole('button', { name: await t('common.save'), exact: true }).evaluate(button => { button.click(); button.click(); }); else await click('common.save', modal());
    try { await handle.waitForElementState('hidden', { timeout: 10000 }); }
    catch (error) { error.message += '\nForm: ' + await modal().innerText(); throw error; } finally { await handle.dispose(); }
  }
  async function observe() {
    return page.evaluate(async () => {
      const r = window.RescueManager, snapshot = await r.services.context.snapshot({fresh:true}); if (!snapshot) return null;
      const rows = {};
      for (const [name, records] of Object.entries(snapshot.tables)) rows[name] = [...records].sort((a, b) => a.id.localeCompare(b.id)).map(row => { const value = { ...row }; delete value.datasetId; return value; });
      return { datasetId: snapshot.datasetId, globalRevision: snapshot.globalRevision, counts: Object.fromEntries(Object.entries(rows).map(([name, values]) => [name, values.length])), businessHash: await r.utils.integrity.sha256(r.utils.canonicalJson.stringify(rows)) };
    });
  }
  async function screenshot(name) { const file = path.join(folder, name + '.png'); await page.screenshot({ path: file, fullPage: true }); result.screenshots.push({ file: path.relative(root, file), sha256: hash(await fs.readFile(file)) }); }
  async function task(title, extra = {}) {
    await nav('tasks'); await click('q.new'); await modal().locator('[name=title]').fill(title); await modal().locator('[name=typeId]').selectOption(catalog.otherTask); await modal().locator('[name=animalId]').selectOption(animalId);
    if (extra.time || extra.volunteer) { await more(); if (extra.time) { await modal().locator('[name=dueLocalTime]').fill(extra.time); await modal().locator('[name=timeZone]').fill('Europe/Madrid'); } if (extra.volunteer) await modal().locator('[name=responsibleVolunteerId]').selectOption(volunteerId); }
    await save(); return (await tables()).tasks.find(row => row.title === title);
  }
  async function openTask(title) { await page.getByRole('button', { name: title, exact: true }).click(); }
  try {
    result.sourceFiles = await sources(); const first = await open(); page = first.tab;
    await check('offline-organization-ui-and-labelled-synthetic-service-setup', async () => {
      const environment = await page.evaluate(() => ({ protocol: location.protocol, online: navigator.onLine })); assert(environment.protocol === 'file:' && !environment.online && await observe() === null, 'Expected empty isolated offline profile');
      await page.locator('#language').selectOption('es'); await click('ui.createOrganization'); await modal().locator('[name=name]').fill('Refugio salud ficticio'); await modal().locator('[name=language]').selectOption('es'); await modal().locator('[name=timeZone]').fill('UTC'); await save();
      const setup = await page.evaluate(async () => {
        const r = window.RescueManager, data = (await r.services.context.snapshot({fresh:true})).tables, today = r.utils.dates.today('UTC');
        const option = (kind, code) => data.catalogOptions.find(row => row.kind === kind && row.code === code).id;
        const contactId = (await r.services.contacts.create({ type: 'person', name: 'Responsable salud ficticio', phones: [], roles: [], notes: '' })).result.id;
        const volunteerId = (await r.services.volunteers.createProfile({ contactId, status: 'active', functionIds: [], availability: '', specialties: '', notes: '' })).result.id;
        const animalId = (await r.services.animals.registerEntry({ animal: { name: 'Salud ficticia', speciesId: option('species', 'dog') }, date: today, entryReason: 'Preparación ficticia explícita de prueba', location: { kind: 'shelter', id: data.locations[0].id }, availability: 'available' })).result.animalId;
        await r.core.app.render(); return { contactId, volunteerId, animalId, today, catalog: { otherTask: option('task_type', 'other'), vaccinationTask: option('task_type', 'vaccination'), plan: option('care_plan_type', 'vaccination'), expense: option('finance_expense', 'veterinary') } };
      });
      ({ contactId, volunteerId, animalId, today, catalog } = setup); return { environment, setup, setupUsesServices: true, snapshot: await observe() };
    });
    await check('general-task-ui-time-zone-edit-and-removing-time-clears-both-fields', async () => {
      const initial = await task('Tarea general finalizar ficticia', { time: '10:30' }); assert(initial.dueLocalTime === '10:30' && initial.timeZone === 'Europe/Madrid', 'Time/zone not committed');
      await openTask(initial.title); await click('q.edit', modal()); await more(); await modal().locator('[name=dueLocalTime]').fill(''); await modal().locator('[name=description]').fill('Edición sin hora conservada'); await save();
      const row = (await tables()).tasks.find(item => item.id === initial.id); assert(row.dueLocalTime === null && row.timeZone === null && row.description === 'Edición sin hora conservada', 'Removing time did not normalize pair'); return { initial, updated: row };
    });
    await check('general-completion-and-cancellation-are-explicit-and-preserve-closure-fields', async () => {
      await openTask('Tarea general finalizar ficticia'); await click('q.complete', modal()); await modal().locator('[name=confirmed]').check(); await save();
      const second = await task('Tarea general cancelar ficticia'); await openTask(second.title); await click('q.cancelTask', modal()); await modal().locator('[name=reason]').fill('Cancelación ficticia decidida expresamente'); await modal().locator('[name=confirmed]').check(); await save();
      const rows = (await tables()).tasks, completed = rows.find(row => row.title === 'Tarea general finalizar ficticia'), cancelled = rows.find(row => row.id === second.id);
      assert(completed.status === 'completed' && completed.completedOn === today && cancelled.status === 'cancelled' && cancelled.cancelledOn === today && cancelled.cancellationReason === 'Cancelación ficticia decidida expresamente', 'Explicit closure fields missing'); return { tasks: rows };
    });
    await check('calendar-and-list-share-task-rows-and-invalid-month-has-no-effects-or-exception', async () => {
      await task('Calendario pendiente ficticio'); const before = await observe(); await page.getByLabel(await t('q.mode'), { exact: true }).selectOption('calendar'); await page.getByRole('button', { name: 'Calendario pendiente ficticio', exact: true }).waitFor();
      const month = page.getByLabel(await t('q.month'), { exact: true }); const errors = result.pageErrors.length;
      await month.evaluate(input => { input.value = '10000-01'; input.dispatchEvent(new Event('change', { bubbles: true })); });
      assert(!await month.evaluate(input => input.checkValidity()) && result.pageErrors.length === errors, 'Invalid month caused runtime exception or was accepted');
      await month.fill(today.slice(0, 7)); await month.dispatchEvent('change'); await page.getByLabel(await t('q.mode'), { exact: true }).selectOption('list');
      assert(JSON.stringify(before) === JSON.stringify(await observe()), 'View switch changed task data'); return { before, invalidMonthRejected: true, runtimeErrors: result.pageErrors.length };
    });
    await check('inactive-assignee-is-retained-and-edit-rejects-until-explicit-unassignment', async () => {
      const initial = await task('Responsable inactivo ficticio', { volunteer: true });
      await page.evaluate(async id => { const r = window.RescueManager; await r.services.volunteers.updateProfile(id, { status: 'inactive' }); await r.core.app.render(); }, volunteerId);
      await openTask(initial.title); await click('q.edit', modal()); await more(); assert(await modal().locator('[name=responsibleVolunteerId]').inputValue() === volunteerId, 'Inactive assignee silently removed on opening editor');
      await modal().locator('[name=title]').fill('Responsable inactivo revisado ficticio'); const before = await observe(); await click('common.save', modal()); await modal().locator('.form-errors p').waitFor();
      assert(JSON.stringify(before) === JSON.stringify(await observe()) && await modal().locator('[name=responsibleVolunteerId]').inputValue() === volunteerId, 'Rejected edit changed data/assignment');
      await modal().locator('[name=responsibleVolunteerId]').selectOption(''); await save(); const updated = (await tables()).tasks.find(row => row.id === initial.id);
      assert(updated.responsibleVolunteerId === null && updated.title === 'Responsable inactivo revisado ficticio', 'Explicit unassignment not applied'); return { initial, before, updated, serviceSetupInactive: true };
    });
    await check('care-plan-create-and-edit-through-ui-preserves-human-instructions', async () => {
      await health(); await click('hw.newPlan'); await modal().locator('[name=name]').fill('Plan sanitario ficticio'); await modal().locator('[name=typeId]').selectOption(catalog.plan); await modal().locator('[name=status]').selectOption('active'); await more();
      await modal().locator('[name=medication]').fill('Texto ficticio sin medicamento real'); await modal().locator('[name=doseInstructions]').fill('Dosis escrita por usuario ficticio; no instrucción clínica'); await modal().locator('[name=routeInstructions]').fill('Vía ficticia introducida por usuario'); await modal().locator('[name=frequencyInstructions]').fill('Un acto ficticio programado manualmente'); await save();
      await click('hw.editPlan'); await more(); await modal().locator('[name=doseInstructions]').fill('Instrucciones ficticias revisadas por usuario'); await save(); const plan = (await tables()).carePlans[0]; planId = plan.id;
      assert(plan.status === 'active' && plan.doseInstructions === 'Instrucciones ficticias revisadas por usuario' && plan.routeInstructions === 'Vía ficticia introducida por usuario' && plan.frequencyInstructions === 'Un acto ficticio programado manualmente', 'Plan instructions lost or recalculated'); return { plan };
    });
    await check('finite-clinical-plan-task-is-scheduled-through-ui-with-fixed-origin-and-animal', async () => {
      await click('hw.scheduleTask'); assert(await modal().locator('[name=animalId]').count() === 0, 'Plan task lets animal drift'); await modal().locator('[name=title]').fill('Vacuna ficticia realizada'); await modal().locator('[name=typeId]').selectOption(catalog.vaccinationTask); await save(true);
      const data = await tables(), row = data.tasks.find(item => item.title === 'Vacuna ficticia realizada'); clinicalTaskId = row.id;
      assert(row.status === 'pending' && row.source.type === 'care_plan' && row.source.id === planId && row.animalId === animalId && !data.veterinaryRecords.length, 'Scheduling performed act or lost source'); return { task: row, plannedOnly: true };
    });
    await check('clinical-task-requires-confirmation-then-commits-single-act-expense-event-and-explicit-plan-close', async () => {
      await openTask('Vacuna ficticia realizada'); await click('q.clinical', modal()); assert(await modal().locator('[name=type]').inputValue() === 'vaccination', 'Wrong clinical type');
      await modal().locator('[name=expenseMode]').selectOption('new'); await modal().locator('[name=expenseCategoryId]').selectOption(catalog.expense); await modal().locator('[name=expenseConcept]').fill('Factura sanitaria ficticia compartida'); await modal().locator('[name=expenseAmount]').fill('12,50'); await modal().locator('[name=decimalSeparator]').selectOption(','); await modal().locator('[name=completePlan]').check();
      const before = await observe(); await click('common.save', modal()); assert(await modal().locator('[name=performedConfirmed]').evaluate(input => !input.checkValidity()) && JSON.stringify(before) === JSON.stringify(await observe()), 'Unconfirmed act committed');
      await modal().locator('[name=performedConfirmed]').check(); await save(true); const data = await tables(), row = data.veterinaryRecords[0], movement = data.financialMovements[0], task = data.tasks.find(item => item.id === clinicalTaskId), plan = data.carePlans[0];
      assert(data.veterinaryRecords.length === 1 && data.financialMovements.length === 1 && movement.amountMinor === 1250 && movement.animalId === animalId && row.expenseMovementId === movement.id, 'Clinical expense duplicated or amount drifted');
      assert(row.sourceTaskId === clinicalTaskId && row.carePlanId === planId && task.status === 'completed' && task.completedOn === today && row.date === today && plan.status === 'completed' && data.animalEvents.filter(item => item.source.type === 'veterinary_record' && item.source.id === row.id).length === 1, 'Act/task/plan/event not coherent'); await screenshot('clinical-complete'); return { record: row, movement, task, plan };
    });
    await check('second-performed-record-selects-existing-expense-without-duplicating-finances', async () => {
      await click('hw.record'); await modal().locator('[name=title]').fill('Revisión ficticia con factura compartida'); await modal().locator('[name=expenseMode]').selectOption('existing'); const movementId = (await tables()).financialMovements[0].id; await modal().locator('[name=expenseMovementId]').selectOption(movementId); await save(true);
      const data = await tables(); assert(data.veterinaryRecords.length === 2 && data.veterinaryRecords.every(row => row.expenseMovementId === movementId) && data.financialMovements.length === 1 && data.financialMovements[0].amountMinor === 1250, 'Shared invoice duplicated'); return { records: data.veterinaryRecords, movements: data.financialMovements };
    });
    await check('health-layout-at-desktop-and-narrow-width-preserves-state', async () => {
      const before = await observe(); await screenshot('health-desktop'); await page.setViewportSize({ width: 360, height: 1000 }); await screenshot('health-narrow');
      const size = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth })); assert(size.scroll <= size.width + 1, 'Whole page overflows narrow viewport'); assert(JSON.stringify(before) === JSON.stringify(await observe()), 'Layout mutated records'); await page.setViewportSize({ width: 1440, height: 1100 }); return { size, snapshot: before, viewportOnly: true };
    });
    const beforeClose = await observe(); await check('complete-owned-browser-close', () => first.session.close()); const reopened = await open(); page = reopened.tab;
    await check('health-task-plan-money-state-persists-after-complete-reopen-with-no-runtime-or-network-errors', async () => {
      const after = await observe(); assert(JSON.stringify(beforeClose) === JSON.stringify(after), 'Health state changed after reopen');
      result.sourceFilesAfter = await sources(); assert(JSON.stringify(result.sourceFiles) === JSON.stringify(result.sourceFilesAfter), 'Runtime sources changed during acceptance');
      assert(!result.pageErrors.length && !result.consoleErrors.length && !result.externalRequests.length, 'Runtime/console/external requests observed'); return { before: beforeClose, after, errors: result.pageErrors, consoleErrors: result.consoleErrors, externalRequests: result.externalRequests, sourcesUnchanged: true };
    });
    result.completed = true;
  } catch (error) { result.fatalError = { name: error.name, message: error.message, stack: error.stack }; }
  finally {
    for (const session of sessions) try { await session.close(); } catch (error) { result.cleanupErrors = [...(result.cleanupErrors || []), String(error)]; }
    result.completedAt = new Date().toISOString(); result.status = result.fatalError || result.cleanupErrors || !result.completed || result.checks.some(row => !row.passed) ? 'failed' : 'passed';
    await persist(); console.log(result.status.toUpperCase()); if (result.status !== 'passed') process.exitCode = 1;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
