/* Developer-only offline file:// acceptance of foster/adoption forms and their shared task/document records. */
'use strict';
const fs = require('node:fs/promises'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto');
const { pathToFileURL } = require('node:url'), { launch } = require('./chromium.cjs');
const root = path.resolve(__dirname, '../..'), options = { browser: 'chrome', output: 'workflows-ui-chrome.json', machine: 'unspecified' };
const args = process.argv.slice(2);
for (let index = 0; index < args.length; index += 2) {
  const key = args[index].replace(/^--/, '');
  if (!['browser', 'output', 'machine', 'executable', 'resume-report'].includes(key) || !args[index + 1]) throw new Error('Use --browser --output --machine --executable --resume-report');
  options[key] = args[index + 1];
}
if (!['chrome', 'edge'].includes(options.browser) || !/^[a-zA-Z0-9._-]+\.json$/.test(options.output)) throw new Error('Invalid browser or output');
const output = path.join(root, 'tests/results', options.output), hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const result = { format: 'rescue-manager-workflows-ui-test', version: 1, browser: options.browser, machine: options.machine,
  operatingSystem: { type: os.type(), release: os.release(), version: os.version() }, startedAt: new Date().toISOString(), checks: [], launches: [], closures: [],
  screenshots: [], pageErrors: [], consoleErrors: [], externalRequests: [], limitations: ['Synthetic organization in an isolated desktop browser profile.',
    'Viewport emulation does not verify physical devices.', 'The revision conflict is deliberately injected through a real settings service write while a UI form is open.',
    'Page HTTP trace does not observe browser-internal traffic.', 'Two immediate form-button activations exercise the actual form handler; no service is mocked.'] };
const assert = (condition, message) => { if (!condition) throw new Error(message); };
async function sources() {
  const html = path.join(root, 'index.html'), text = await fs.readFile(html, 'utf8');
  const files = new Set([html, ...Array.from(text.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"]+)"/g), match => path.resolve(root, match[1]))]);
  for (const file of files) if (file.endsWith('.css')) for (const match of (await fs.readFile(file, 'utf8')).matchAll(/@import\s+(?:url\()?['"]([^'"]+)['"]/g)) files.add(path.resolve(path.dirname(file), match[1]));
  return Promise.all([...files].map(async file => ({ file: path.relative(root, file).replaceAll('\\', '/'), sha256: hash(await fs.readFile(file)) })));
}
async function persist() { await fs.writeFile(output, JSON.stringify(result, null, 2) + '\n'); }
let resumeReport;
async function check(id, work) {
  const previous = resumeReport?.checks.find(row => row.id === id && row.passed);
  if (previous) { result.checks.push({ ...previous, reusedFromReport: options['resume-report'], reexecuted: false }); console.log('REUSE ' + id); await persist(); return previous.evidence; }
  try { result.checks.push({ id, passed: true, evidence: await work() }); console.log('PASS ' + id); }
  catch (error) { result.checks.push({ id, passed: false, error: { name: error.name, message: error.message, stack: error.stack } }); console.log('FAIL ' + id + ': ' + error.message); throw error; }
  finally { await persist(); }
}
(async () => {
  try { await fs.access(output); throw new Error('Evidence output already exists; choose a new filename'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const sessions = [], folder = path.join(root, '.tmp', 'workflows-ui-' + options.browser + '-' + Date.now());
  let profile = path.join(folder, 'profile');
  let page, mainId, secondId, familyId, applicantId, otherId, profileId, catalog, today;
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
  async function click(key, scope = page, role = 'button') { await scope.getByRole(role, { name: await t(key), exact: true }).click(); }
  async function closeDialogs(discard = false) { for (let index = 0; index < 5 && await page.locator('dialog[open]').count(); index++) { if (discard) page.once('dialog', dialog => dialog.accept()); await click(await modal().getByRole('button', { name: await t('common.close'), exact: true }).count() ? 'common.close' : 'common.cancel', modal()); } }
  async function nav(key) { await closeDialogs(); await click('nav.' + key, page, 'link'); await page.waitForFunction(key => location.hash.split('/')[0] === '#' + key, key); }
  async function animal(id, name, tab) { await closeDialogs(); await page.evaluate(id => { location.hash = '#animals/' + id; }, id); await page.getByRole('heading', { name, level: 1, exact: true }).waitFor(); if (tab) await click('a.tab.' + tab); }
  async function save(double = false) {
    const handle = await modal().elementHandle();
    if (double) await modal().getByRole('button', { name: await t('common.save'), exact: true }).evaluate(button => { button.click(); button.click(); });
    else await click('common.save', modal());
    try { await handle.waitForElementState('hidden', { timeout: 10000 }); }
    catch (error) { error.message += '\nForm: ' + await modal().innerText(); throw error; }
    finally { await handle.dispose(); }
  }
  async function observe() {
    return page.evaluate(async () => {
      const r = window.RescueManager, snapshot = await r.services.context.snapshot({fresh:true}); if (!snapshot) return null;
      const tables = {};
      for (const [name, rows] of Object.entries(snapshot.tables)) {
        tables[name] = [];
        for (const row of [...rows].sort((a, b) => a.id.localeCompare(b.id))) {
          const value = { ...row }; delete value.datasetId;
          if (name === 'assets') { delete value.blob; value.actualSha256 = await r.utils.integrity.sha256(row.blob); }
          tables[name].push(value);
        }
      }
      return { datasetId: snapshot.datasetId, dataRevision: snapshot.dataRevision, counts: Object.fromEntries(Object.entries(tables).map(([name, rows]) => [name, rows.length])), businessHash: await r.utils.integrity.sha256(r.utils.canonicalJson.stringify(tables)) };
    });
  }
  async function screenshot(name) { const file = path.join(folder, name + '.png'); await page.screenshot({ path: file, fullPage: true }); result.screenshots.push({ file: path.relative(root, file), sha256: hash(await fs.readFile(file)) }); }
  async function createContact(name) { await nav('contacts'); await click('p.newContact'); await modal().locator('[name=name]').fill(name); await save(); await closeDialogs(); return (await tables()).contacts.find(row => row.name === name).id; }
  async function createAnimal(name, speciesId) {
    await nav('animals'); await click('a.new'); await modal().locator('[name=name]').fill(name); await modal().locator('[name=speciesId]').selectOption(speciesId);
    await modal().locator('[name=entryReason]').fill('Rescate ficticio para recorrido'); await modal().locator('[name=availability]').selectOption('available');
    await modal().locator('details').first().locator('summary').click(); await modal().locator('[name=sizeId]').selectOption(catalog.small); await save();
    await page.getByRole('heading', { name, level: 1, exact: true }).waitFor(); return (await tables()).animals.find(row => row.name === name).id;
  }
  async function createApplication(contactId) { await click('aw.new'); await modal().locator('[name=contactId]').selectOption(contactId); await modal().locator('[name=interviewNotes]').fill('Entrevista ficticia'); await save(); }
  const applicationCard = name => page.locator('.adoption-workflow article').filter({ has: page.getByRole('heading', { level: 3 }).filter({ hasText: name }) }).filter({ has: page.locator('details > summary') }).first();
  try {
    result.sourceFiles = await sources();
    if (options['resume-report']) {
      assert(/^[a-zA-Z0-9._-]+\.json$/.test(options['resume-report']), 'Resume report must be a filename under tests/results');
      resumeReport = JSON.parse(await fs.readFile(path.join(root, 'tests/results', options['resume-report']), 'utf8'));
      const failed = resumeReport.checks.filter(row => !row.passed);
      const passedCount = resumeReport.checks.filter(row => row.passed).length;
      const knownCheckpoint = passedCount === 8 && failed[0]?.id === 'adoption-requires-every-task-choice-and-atomically-closes-all-relations-with-recorded-reasons' || passedCount === 10 && failed[0]?.id === 'return-preserves-adoption-and-old-episode-and-creates-exactly-one-new-linked-entry';
      assert(resumeReport.format === result.format && resumeReport.browser === options.browser && resumeReport.status === 'failed' && failed.length === 1 && knownCheckpoint, 'Only a known pre-adoption or pre-return test checkpoint can be resumed');
      assert(JSON.stringify(resumeReport.sourceFiles) === JSON.stringify(result.sourceFiles), 'Cannot reuse prior checks after runtime sources changed');
      assert(resumeReport.closures.length && resumeReport.closures.every(row => !row.inspectionError && !row.remainingProcesses.length), 'Prior owned browser closure was not verified');
      profile = await fs.realpath(path.resolve(root, resumeReport.launches[0].profile));
      assert(new RegExp('^workflows-ui-' + options.browser + '-[0-9]+[\\\\/]profile$').test(path.relative(path.join(root, '.tmp'), profile)), 'Resume profile must resolve to this runner own isolated profile under this repository .tmp');
      result.resumedFromReport = options['resume-report'];
    }
    await fs.mkdir(folder, { recursive: true }); const first = await open(); page = first.tab;
    if (resumeReport) {
      const initial = resumeReport.checks[0].evidence; ({ familyId, applicantId, otherId, profileId, mainId, secondId, today } = initial);
      const data = await tables(); catalog = Object.fromEntries([['dog', 'species', 'dog'], ['cat', 'species', 'cat'], ['small', 'size', 'small'], ['otherTask', 'task_type', 'other']].map(([key, kind, code]) => [key, data.catalogOptions.find(row => row.kind === kind && row.code === code)?.id]));
      const preAdoption = resumeReport.checks.filter(row => row.passed).length === 8;
      assert(data.reservations.length === 1 && data.tasks.length === 2 && (preAdoption ? data.adoptions.length === 0 && data.financialMovements.length === 0 && data.reservations[0].status === 'active' && data.tasks.every(row => row.status === 'pending') : data.adoptions.length === 1 && !data.adoptions[0].returnDate && data.financialMovements.length === 1 && data.documents.length === 1 && data.reservations[0].status === 'fulfilled'), 'Resumed profile no longer matches expected transition checkpoint');
      assert(today === await page.evaluate(() => window.RescueManager.utils.dates.today('UTC')), 'Resume checkpoint date changed; start a fresh run');
      await page.waitForFunction(() => window.RescueManager.services.context.status().canWrite, null, { timeout: 20000 });
      await animal(mainId, 'Luna ciclo ficticia', 'adoption'); result.resumeSnapshot = await observe();
    }
    await check('minimal-real-ui-organization-central-contacts-foster-profile-and-two-animals', async () => {
      const environment = await page.evaluate(() => ({ protocol: location.protocol, online: navigator.onLine })); assert(environment.protocol === 'file:' && !environment.online && await observe() === null, 'Expected empty isolated offline file profile');
      await page.locator('#language').selectOption('es'); await click('ui.createOrganization'); await modal().locator('[name=name]').fill('Refugio ciclo ficticio'); await modal().locator('[name=language]').selectOption('es'); await modal().locator('[name=timeZone]').fill('UTC'); await save();
      const data = await tables(); catalog = Object.fromEntries([['dog', 'species', 'dog'], ['cat', 'species', 'cat'], ['small', 'size', 'small'], ['otherTask', 'task_type', 'other']].map(([key, kind, code]) => [key, data.catalogOptions.find(row => row.kind === kind && row.code === code)?.id]));
      assert(Object.values(catalog).every(Boolean), 'Required initial catalog entries missing'); today = await page.evaluate(() => window.RescueManager.utils.dates.today('UTC'));
      familyId = await createContact('Familia ciclo ficticia'); applicantId = await createContact('Solicitante principal ficticio'); otherId = await createContact('Solicitante suplente ficticio');
      await nav('contacts'); await page.getByRole('row').filter({ hasText: 'Familia ciclo ficticia' }).getByRole('button', { name: await t('p.open'), exact: true }).click();
      await click('p.newFoster', modal()); await modal().locator('[name=totalCapacity]').fill('1'); await modal().locator('[name=availability]').selectOption('available'); await modal().locator('[name=acceptedSpeciesIds]').selectOption([catalog.dog]); await modal().locator('[name=acceptedSizeIds]').selectOption([catalog.small]); await save(); await closeDialogs();
      profileId = (await tables()).fosterProfiles[0].id; mainId = await createAnimal('Luna ciclo ficticia', catalog.dog); secondId = await createAnimal('Nube ciclo ficticio', catalog.cat);
      return { environment, familyId, applicantId, otherId, profileId, mainId, secondId, today, snapshot: await observe() };
    });
    await check('compatible-existing-foster-profile-assigns-once-with-location-history-and-derived-occupancy', async () => {
      await animal(mainId, 'Luna ciclo ficticia', 'foster'); await click('fw.assign'); await modal().locator('[name=fosterProfileId]').selectOption(profileId); await modal().getByText(await t('fw.compatible'), { exact: true }).waitFor(); await modal().locator('[name=notes]').fill('Estancia compatible ficticia'); await save(true);
      const data = await tables(), stays = data.fosterStays.filter(row => row.animalId === mainId), events = data.animalEvents.filter(row => row.animalId === mainId && row.type === 'foster_start');
      assert(stays.length === 1 && !stays[0].exceptionReason && data.animals.find(row => row.id === mainId).locationKind === 'foster', 'Compatible assignment not coherent');
      const occupancy = await page.evaluate(async id => { const r = window.RescueManager, snapshot = await r.services.context.snapshot({fresh:true}); return r.services.fosters.occupancy(snapshot.tables, id); }, profileId);
      assert(occupancy.occupied === 1 && occupancy.free === 0 && events.length === 1, 'Occupancy not derived from single open stay or event duplicated');
      assert(await page.getByRole('button', { name: await t('fw.assign'), exact: true }).count() === 0, 'Second assignment offered for animal with open stay');
      return { stays, eventCount: events.length, openStays: 1, occupancy };
    });
    await check('capacity-and-species-warning-blocks-unconfirmed-exception-with-fields-and-data-preserved', async () => {
      await animal(secondId, 'Nube ciclo ficticio', 'foster'); await click('fw.assign'); await modal().locator('[name=fosterProfileId]').selectOption(profileId); await modal().locator('[name=notes]').fill('Notas de excepción conservadas');
      await modal().getByText(await t('fw.warningCapacity'), { exact: true }).waitFor(); await modal().getByText(await t('fw.warningSpecies'), { exact: true }).waitFor();
      const before = await observe(); await click('common.save', modal()); assert(await modal().locator(':invalid').count() > 0 && await modal().locator('[name=notes]').inputValue() === 'Notas de excepción conservadas', 'Unconfirmed exception lost fields or was accepted');
      assert(JSON.stringify(before) === JSON.stringify(await observe()), 'Unconfirmed exception wrote data');
      await modal().locator('[name=confirmException]').check(); await click('common.save', modal()); assert(JSON.stringify(before) === JSON.stringify(await observe()), 'Exception without reason wrote data');
      await modal().locator('[name=exceptionReason]').fill('Excepción ficticia revisada por capacidad y especie'); return { before, warnings: ['capacity', 'species'], nativeRequiredValidation: true };
    });
    await check('stale-ui-form-revision-is-rejected-with-no-partial-write-and-input-retained', async () => {
      await page.evaluate(async () => { const r = window.RescueManager, snapshot = await r.services.context.snapshot({fresh:true}); await r.services.settings.update({ name: 'Refugio ciclo ficticio · revisión concurrente' }, { expectedRevision: snapshot.globalRevision }); });
      const before = await observe(); await click('common.save', modal()); await modal().locator('.form-errors p').waitFor();
      assert(JSON.stringify(before) === JSON.stringify(await observe()) && await modal().locator('[name=exceptionReason]').inputValue() === 'Excepción ficticia revisada por capacidad y especie' && await modal().locator('[name=confirmException]').isChecked(), 'Stale form changed data or discarded explicit choice');
      const message = await modal().locator('.form-errors').innerText(); await closeDialogs(true); await page.reload({ waitUntil: 'load' }); await page.evaluate(() => window.RescueManager.core.app.ready); await page.waitForFunction(() => window.RescueManager.services.context.status().canWrite, null, { timeout: 20000 });
      return { before, unchangedAfterRejection: true, fieldsRetained: true, message, deliberateConcurrentServiceWrite: true };
    });
    await check('explicit-exception-with-reason-saves-once-and-ending-preserves-history-and-adoption-availability', async () => {
      await animal(secondId, 'Nube ciclo ficticio', 'foster'); await click('fw.assign'); await modal().locator('[name=fosterProfileId]').selectOption(profileId); await modal().locator('[name=confirmException]').check(); await modal().locator('[name=exceptionReason]').fill('Excepción ficticia revisada por capacidad y especie'); await save(true);
      let data = await tables(); const stay = data.fosterStays.find(row => row.animalId === secondId); assert(stay.exceptionReason && data.fosterStays.filter(row => !row.endDate && row.fosterProfileId === profileId).length === 2, 'Explicit capacity exception missing');
      await click('fw.endStay'); await modal().locator('[name=endReason]').fill('Fin de apoyo temporal ficticio'); await modal().locator('[name=kind]').selectOption('temporary_external'); await modal().locator('[name=description]').fill('Centro externo ficticio'); await save(true);
      data = await tables(); const updated = data.animals.find(row => row.id === secondId), closed = data.fosterStays.find(row => row.id === stay.id);
      assert(closed.endDate === today && closed.endReason === 'Fin de apoyo temporal ficticio' && updated.locationKind === 'temporary_external' && updated.externalLocationDescription === 'Centro externo ficticio' && updated.adoptionAvailability === 'available', 'Foster end did not retain reason/history/destination/availability');
      assert(data.fosterStays.filter(row => row.animalId === secondId).length === 1, 'Repeated end duplicated a stay'); await screenshot('foster-history'); return { stayBefore: stay, stayAfter: closed, animalAfter: updated };
    });
    await check('two-general-animal-tasks-created-through-ui-and-calendar-shares-the-same-records', async () => {
      await nav('tasks');
      for (const title of ['Seguimiento conservar ficticio', 'Preparación cancelar ficticia']) { await click('q.new'); await modal().locator('[name=title]').fill(title); await modal().locator('[name=typeId]').selectOption(catalog.otherTask); await modal().locator('[name=animalId]').selectOption(mainId); await save(); }
      const before = await observe(); await page.getByLabel(await t('q.mode'), { exact: true }).selectOption('calendar'); await page.getByRole('button', { name: 'Seguimiento conservar ficticio', exact: true }).waitFor(); await page.getByRole('button', { name: 'Preparación cancelar ficticia', exact: true }).waitFor();
      assert(JSON.stringify(before) === JSON.stringify(await observe()) && before.counts.tasks === 2, 'Calendar duplicated or mutated task records'); await screenshot('tasks-calendar'); return { snapshot: before, sameTaskRecords: true };
    });
    await check('existing-contact-application-review-and-approval-do-not-create-reservation-or-adoption', async () => {
      await animal(mainId, 'Luna ciclo ficticia', 'adoption'); await createApplication(applicantId); await createApplication(otherId);
      await click('aw.review', applicationCard('Solicitante principal ficticio')); await modal().locator('[name=interviewNotes]').fill('Entrevista revisada y conservada'); await save();
      let data = await tables(); assert(data.adoptionApplications.find(row => row.contactId === applicantId).status === 'under_review' && !data.reservations.length && !data.adoptions.length, 'Review performed another transition');
      await click('aw.approve', applicationCard('Solicitante principal ficticio')); await save(); data = await tables(); assert(data.adoptionApplications.find(row => row.contactId === applicantId).status === 'approved' && !data.reservations.length && !data.adoptions.length, 'Approval created a reservation/adoption');
      assert(data.contacts.length === 3 && data.contacts.find(row => row.id === applicantId).roles.includes('adopter'), 'Application duplicated contact or failed shared adopter role'); return { applications: data.adoptionApplications, contactCount: data.contacts.length };
    });
    await check('reservation-expiry-is-inclusive-and-cannot-be-closed-silently-on-its-final-day', async () => {
      await click('aw.reserve', applicationCard('Solicitante principal ficticio')); await modal().locator('[name=expiresOn]').fill(today); await modal().locator('[name=confirmed]').check(); await save(true);
      const data = await tables(), reservation = data.reservations[0]; assert(data.reservations.length === 1 && reservation.status === 'active' && reservation.expiresOn === today && data.animals.find(row => row.id === mainId).adoptionAvailability === 'reserved', 'Reservation not coherent');
      assert(await page.getByRole('button', { name: await t('aw.reservation.expired'), exact: true }).count() === 0, 'Expiry offered on inclusive final day'); return { reservation, expiryActionAbsentOnFinalDay: true };
    });
    await check('adoption-requires-every-task-choice-and-atomically-closes-all-relations-with-recorded-reasons', async () => {
      await click('aw.complete', applicationCard('Solicitante principal ficticio'));
      await modal().locator('[name=fosterEndReason]').fill('Acogida finalizada por adopción ficticia'); await modal().locator('[name=reservationClosureReason]').fill('Reserva cumplida en adopción ficticia'); await modal().locator('[name=otherApplicationsReason]').fill('Otra familia seleccionada con revisión'); await modal().locator('[name=notes]').fill('Adopción con historia conservada');
      const decisions = modal().locator('select[name^=taskDecision]'); assert(await decisions.count() === 2, 'Not every pending task was offered');
      for (let index = 0; index < 2; index++) { const label = await decisions.nth(index).getAttribute('aria-label'); await decisions.nth(index).selectOption(label.includes('conservar') ? 'keep' : 'cancel'); }
      await modal().locator('[name=confirmed]').check(); const before = await observe(); await click('common.save', modal()); assert(await modal().locator(':invalid').count() > 0 && JSON.stringify(before) === JSON.stringify(await observe()), 'Task cancellation without reason wrote partial adoption');
      await modal().locator('input[name^=taskReason]:visible').fill('La preparación ya no procede tras adoptar'); await modal().locator('[name=recordFee]').check();
      const categoryId = (await tables()).catalogOptions.find(row => row.kind === 'finance_income' && row.code === 'adoption').id; await modal().locator('[name=categoryId]').selectOption(categoryId);
      await modal().locator('[name=concept]').fill('Aportación ficticia de adopción'); await modal().locator('[name=amount]').fill('25,50'); await modal().locator('[name=decimalSeparator]').selectOption(','); await save(true);
      const data = await tables(), adopted = data.animals.find(row => row.id === mainId), adoption = data.adoptions[0], keep = data.tasks.find(row => row.title.includes('conservar')), cancel = data.tasks.find(row => row.title.includes('cancelar'));
      assert(data.adoptions.length === 1 && adopted.managementStatus === 'adopted' && adopted.locationKind === null && adopted.adoptionAvailability === 'unavailable', 'Adoption not atomic or duplicated');
      assert(data.stayEpisodes.find(row => row.id === adoption.episodeId).adoptionId === adoption.id && data.fosterStays.find(row => row.animalId === mainId).endReason === 'Acogida finalizada por adopción ficticia' && data.reservations[0].status === 'fulfilled', 'Adoption failed to close episode/foster/reservation');
      assert(data.adoptionApplications.find(row => row.contactId === otherId).closureReason === 'Otra familia seleccionada con revisión' && keep.status === 'pending' && cancel.status === 'cancelled' && cancel.cancellationReason === 'La preparación ya no procede tras adoptar', 'Application/task decisions missing');
      assert(data.financialMovements.length === 1 && data.financialMovements[0].amountMinor === 2550 && adoption.financialMovementId === data.financialMovements[0].id, 'Adoption fee duplicated or changed amount'); await screenshot('adoption-completed'); return { adoption, animal: adopted, tasks: data.tasks, reservations: data.reservations, fosterStays: data.fosterStays, movements: data.financialMovements };
    });
    await check('adoption-document-is-linked-to-the-historical-adoption-not-an-unrelated-animal-record', async () => {
      await page.locator('.adoption-workflow details').filter({ has: page.getByText(await t('aw.documents'), { exact: true }) }).locator('summary').click(); await click('d.newEmbedded'); await modal().locator('[name=title]').fill('Contrato ficticio de adopción'); await modal().locator('[name=typeId]').selectOption({ index: 0 }); await modal().locator('[name=file]').setInputFiles({ name: 'contrato-ficticio.txt', mimeType: 'text/plain', buffer: Buffer.from('Contrato ficticio ñ\nSin valor legal') }); await save();
      const data = await tables(), link = data.documentLinks[0]; assert(data.documents.length === 1 && data.assets.length === 1 && link.entityType === 'adoption' && link.entityId === data.adoptions[0].id, 'Document linked to incorrect entity'); return { document: data.documents[0], link, assets: data.assets.length };
    });
    await check('return-preserves-adoption-and-old-episode-and-creates-exactly-one-new-linked-entry', async () => {
      await click('aw.return'); await modal().locator('[name=reason]').fill('Devolución ficticia documentada'); await modal().locator('[name=locationKind]').selectOption('shelter'); await modal().locator('[name=locationId]').selectOption((await tables()).locations[0].id); await modal().locator('[name=availability]').selectOption('available'); await modal().locator('[name=confirmed]').check(); await save(true);
      const data = await tables(), adoption = data.adoptions[0], episodes = data.stayEpisodes.filter(row => row.animalId === mainId), current = episodes.find(row => !row.exitDate), animal = data.animals.find(row => row.id === mainId);
      assert(data.adoptions.length === 1 && adoption.returnDate === today && adoption.returnReason === 'Devolución ficticia documentada' && episodes.length === 2 && current.entryType === 'return' && current.returnedFromAdoptionId === adoption.id, 'Return replaced adoption or failed linked new episode');
      assert(animal.managementStatus === 'under_care' && animal.locationKind === 'shelter' && animal.adoptionAvailability === 'available' && data.financialMovements.length === 1 && data.documentLinks[0].entityId === adoption.id, 'Return altered money/document history or current state');
      await click('a.tab.history'); await screenshot('return-history'); return { adoption, episodes, animal, snapshot: await observe() };
    });
    await check('workflow-backup-reselection-restore-preserves-shared-relations-reasons-money-and-document-bytes', async () => {
      await nav('backup'); const before = await observe(), event = page.waitForEvent('download'); await click('ui.generateDownload'); const download = await event, file = path.join(folder, download.suggestedFilename()); await download.saveAs(file);
      await page.getByLabel(await t('ui.selectVerify'), { exact: true }).setInputFiles(file); await page.getByText(await t('ui.backupVerified'), { exact: true }).waitFor(); await page.getByLabel(await t('ui.selectRestore'), { exact: true }).setInputFiles(file); await page.getByRole('heading', { name: await t('ui.restoreSummary'), exact: true }).waitFor(); await page.locator('#confirm-restore').check(); await click('ui.applyRestore'); await page.getByText(await t('ui.restored'), { exact: true }).waitFor();
      const after = await observe(); assert(before.businessHash === after.businessHash && before.datasetId !== after.datasetId, 'Workflow restoration changed records/bytes or failed rebase'); return { before, after, file: path.relative(root, file), bytes: (await fs.stat(file)).size };
    });
    const beforeClose = await observe(); await check('complete-owned-browser-close', () => first.session.close()); const reopened = await open(); page = reopened.tab;
    await check('workflow-state-and-actual-document-bytes-persist-after-complete-reopen', async () => { const after = await observe(); assert(JSON.stringify(beforeClose) === JSON.stringify(after), 'Workflow changed after complete reopen'); assert(!result.pageErrors.length && !result.consoleErrors.length && !result.externalRequests.length, 'Runtime errors/external requests'); return { before: beforeClose, after, runtimeErrors: 0, externalPageRequests: 0 }; });
    await check('complete-reopened-browser-close', () => reopened.session.close());
    await check('tested-workspace-sources-remained-unchanged', async () => { assert(JSON.stringify(result.sourceFiles) === JSON.stringify(await sources()), 'Source files changed during acceptance'); return { hashesMatch: true, count: result.sourceFiles.length }; });
    result.completed = true;
  } catch (error) { result.fatalError = { name: error.name, message: error.message, stack: error.stack }; }
  finally {
    for (const session of sessions) try { await session.close(); } catch (error) { result.cleanupErrors = [...(result.cleanupErrors || []), String(error)]; }
    result.completedAt = new Date().toISOString(); result.status = result.fatalError || result.cleanupErrors || !result.completed || result.checks.some(row => !row.passed) ? 'failed' : 'passed';
    await persist(); console.log(result.status.toUpperCase()); if (result.status !== 'passed') process.exitCode = 1;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
