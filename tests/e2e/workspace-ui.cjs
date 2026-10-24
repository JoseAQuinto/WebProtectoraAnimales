/* Developer-only acceptance of real phase 4 forms, downloads and persistence by offline file://. */
'use strict';
const fs = require('node:fs/promises'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto');
const { pathToFileURL } = require('node:url'), { launch } = require('./chromium.cjs');
const root = path.resolve(__dirname, '../..'), options = { browser: 'chrome', output: 'workspace-ui-chrome.json', machine: 'unspecified', mode: 'all' };
const args = process.argv.slice(2);
for (let index = 0; index < args.length; index += 2) {
  const key = args[index].replace(/^--/, '');
  if (!['browser', 'output', 'machine', 'executable', 'mode', 'resume-profile'].includes(key) || !args[index + 1]) throw new Error('Use --browser --output --machine --executable --mode --resume-profile');
  options[key] = args[index + 1];
}
if (!['chrome', 'edge', 'firefox'].includes(options.browser) || !/^[a-zA-Z0-9._-]+\.json$/.test(options.output) || !['all', 'viewport'].includes(options.mode)) throw new Error('Invalid browser, output or mode');
if ((options.mode === 'viewport') !== !!options['resume-profile']) throw new Error('Viewport mode requires --resume-profile; all mode requires a fresh profile');
const result = { format: 'rescue-manager-workspace-ui-test', version: 2, browser: options.browser, machine: options.machine, mode: options.mode,
  operatingSystem: { type: os.type(), release: os.release(), version: os.version() }, startedAt: new Date().toISOString(), checks: [], launches: [], closures: [],
  screenshots: [], pageErrors: [], consoleErrors: [], externalRequests: [], limitations: ['Synthetic organization in an isolated desktop browser profile.',
    'Viewport sizes do not verify physical mobile/tablet devices.', 'Page HTTP trace does not observe browser-internal traffic.', 'Phase 4 forms only; later module interfaces remain outside scope.'] };
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
async function sources() {
  const html = path.join(root, 'index.html'), text = await fs.readFile(html, 'utf8');
  const files = new Set([html, ...Array.from(text.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"]+)"/g), match => path.resolve(root, match[1]))]);
  for (const file of files) if (file.endsWith('.css')) for (const match of (await fs.readFile(file, 'utf8')).matchAll(/@import\s+(?:url\()?['"]([^'"]+)['"]/g)) files.add(path.resolve(path.dirname(file), match[1]));
  return Promise.all([...files].map(async file => ({ file: path.relative(root, file).replaceAll('\\', '/'), sha256: hash(await fs.readFile(file)) })));
}
async function check(id, work) {
  try { result.checks.push({ id, passed: true, evidence: await work() }); console.log('PASS ' + id); }
  catch (error) { result.checks.push({ id, passed: false, error: { name: error.name, message: error.message, stack: error.stack } }); console.log('FAIL ' + id + ': ' + error.message); throw error; }
}
(async () => {
  const sessions = [], folder = path.join(root, '.tmp', 'workspace-ui-' + options.browser + '-' + Date.now());
  let profile = path.join(folder, 'profile');
  let page, animalId, contactId;
  async function open() {
    const session = await launch(options.browser, profile, result, false, { executable: options.executable }); sessions.push(session);
    const tab = await session.context.newPage(); tab.setDefaultTimeout(10000); await tab.setViewportSize({ width: 1440, height: 1100 });
    tab.on('pageerror', error => result.pageErrors.push(String(error)));
    tab.on('console', message => { if (message.type() === 'error') result.consoleErrors.push(message.text()); });
    tab.on('request', request => { if (/^https?:/i.test(request.url())) result.externalRequests.push(request.url()); });
    await tab.goto(pathToFileURL(path.join(root, 'index.html')).href, { waitUntil: 'load' }); await tab.evaluate(() => window.RescueManager.core.app.ready); return { session, tab };
  }
  const t = key => page.evaluate(key => window.RescueManager.core.i18n.t(key), key), modal = () => page.locator('dialog[open]').last();
  async function click(key, scope = page, role = 'button') { await scope.getByRole(role, { name: await t(key), exact: true }).click(); }
  async function closeDialogs() { for (let index = 0; index < 5 && await page.locator('dialog[open]').count(); index++) await click('common.close', modal()); }
  async function nav(key) { await closeDialogs(); await page.setViewportSize({ width: 1440, height: 1100 }); await click('nav.' + key, page, 'link'); await page.waitForFunction(key => location.hash.split('/')[0] === '#' + key, key); }
  async function save() { const handle = await modal().elementHandle(); await click('common.save', modal());
    try { await handle.waitForElementState('hidden', { timeout: 10000 }); }
    catch (error) { error.message += '\nForm: ' + await modal().innerText(); throw error; }
    finally { await handle.dispose(); }
  }
  async function screenshots(name) {
    for (const width of [1440, 360]) {
      await page.setViewportSize({ width, height: 1000 }); const file = path.join(folder, name + '-' + width + '.png');
      await page.screenshot({ path: file, fullPage: true }); result.screenshots.push({ file: path.relative(root, file), sha256: hash(await fs.readFile(file)), width });
    }
    await page.setViewportSize({ width: 1440, height: 1100 });
  }
  async function observe() {
    return page.evaluate(async () => {
      const root = window.RescueManager, snapshot = await root.services.context.snapshot({fresh:true}); if (!snapshot) return null;
      const tables = {};
      for (const [name, rows] of Object.entries(snapshot.tables)) {
        tables[name] = [];
        for (const row of [...rows].sort((a, b) => a.id.localeCompare(b.id))) {
          const value = { ...row }; delete value.datasetId;
          if (name === 'assets') { delete value.blob; value.actualSha256 = await root.utils.integrity.sha256(row.blob); }
          tables[name].push(value);
        }
      }
      return { datasetId: snapshot.datasetId, dataRevision: snapshot.dataRevision, counts: Object.fromEntries(Object.entries(tables).map(([name, rows]) => [name, rows.length])), businessHash: await root.utils.integrity.sha256(root.utils.canonicalJson.stringify(tables)) };
    });
  }
  async function verifyViews() {
    const before = await observe(), viewports = [];
    for (const module of ['contacts', 'fosters', 'volunteers', 'animals', 'documents']) {
      await nav(module);
      for (const width of [360, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        const dimensions = await page.evaluate(() => ({ viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth,
          filterControls: Array.from(document.querySelectorAll('.people-filters input,.people-filters select,.people-filters textarea')).map(control => {
            const bounds = control.getBoundingClientRect(), container = control.closest('.people-filters').getBoundingClientRect();
            return { name: control.name || control.id || control.tagName, left: bounds.left, right: bounds.right, containerLeft: container.left, containerRight: container.right,
              contained: bounds.width === 0 || bounds.left >= Math.max(0, container.left) - 1 && bounds.right <= Math.min(innerWidth, container.right) + 1 };
          }) }));
        assert(dimensions.scrollWidth <= dimensions.viewport, module + ' overflows at ' + width);
        assert(dimensions.filterControls.every(control => control.contained), module + ' clips filter controls at ' + width + ': ' + JSON.stringify(dimensions.filterControls));
        viewports.push({ module, ...dimensions });
      }
    }
    await page.locator('#language').selectOption('en'); await page.waitForFunction(() => document.documentElement.lang === 'en');
    await page.getByRole('heading', { name: 'Documents', level: 1, exact: true }).waitFor();
    assert((await observe()).businessHash === before.businessHash, 'Language switch altered data');
    assert(!result.pageErrors.length && !result.consoleErrors.length && !result.externalRequests.length, 'Runtime errors or external page requests');
    await screenshots('documents-en'); return { viewports, dataPreserved: true, runtimeErrors: 0, externalPageRequests: 0 };
  }
  try { await fs.access(path.join(root, 'tests/results', options.output)); throw new Error('Evidence output already exists; choose a new filename'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  try {
    if (options.mode === 'viewport') {
      assert(path.isAbsolute(options['resume-profile']), 'Resume profile must be absolute');
      profile = await fs.realpath(options['resume-profile']);
      const relative = path.relative(path.join(root, '.tmp'), profile);
      assert(new RegExp('^workspace-ui-' + options.browser + '-[0-9]+[\\\\/]profile$').test(relative), 'Resume profile must be an existing isolated workspace UI profile for this browser under this repository .tmp');
      result.resumedProfile = relative;
    }
    await fs.mkdir(folder, { recursive: true });
    result.sourceFiles = await sources(); const first = await open(); page = first.tab;
    if (options.mode === 'viewport') {
      const before = await observe();
      await check('existing-synthetic-profile-resumed-offline-without-business-writes', async () => {
        const environment = await page.evaluate(() => ({ protocol: location.protocol, online: navigator.onLine }));
        assert(environment.protocol === 'file:' && !environment.online && before && before.counts.animals > 0, 'Expected an existing synthetic offline file profile');
        return { ...environment, before, profile: result.resumedProfile };
      });
      await check('new-module-viewports-filter-bounds-and-language-preserve-data', verifyViews);
      await nav('animals');
      const animal = await page.evaluate(async () => (await window.RescueManager.services.context.snapshot({fresh:true})).tables.animals[0]);
      await page.evaluate(id => { location.hash = '#animals/' + id; }, animal.id);
      await page.getByRole('heading', { name: animal.name, level: 1, exact: true }).waitFor();
      await screenshots('animal-info'); await click('a.tab.documents'); await screenshots('animal-documents');
      await check('visual-recheck-left-records-revision-and-binaries-unchanged', async () => { const after = await observe(); assert(JSON.stringify(before) === JSON.stringify(after), 'Visual recheck changed business data'); return { before, after }; });
      await check('complete-owned-browser-close', () => first.session.close());
      await check('tested-workspace-sources-remained-unchanged', async () => { assert(JSON.stringify(result.sourceFiles) === JSON.stringify(await sources()), 'Source files changed during acceptance'); return { hashesMatch: true, count: result.sourceFiles.length }; });
      return;
    }
    await check('organization-created-through-real-offline-file-form', async () => {
      const initial = await page.evaluate(() => ({ protocol: location.protocol, online: navigator.onLine }));
      assert(initial.protocol === 'file:' && !initial.online && await observe() === null, 'Expected empty offline file:// profile');
      await page.locator('#language').selectOption('es'); await page.waitForFunction(() => document.documentElement.lang === 'es');
      await click('ui.createOrganization'); await modal().locator('[name="name"]').fill('Refugio UI ficticio ñ 🐾');
      await modal().locator('[name="language"]').selectOption('es'); await modal().locator('[name="timeZone"]').fill('UTC'); await save();
      assert((await observe()).counts.organizationSettings === 1, 'Organization not committed'); return initial;
    });
    await check('central-contact-create-and-duplicate-review-prevent-silent-duplicate', async () => {
      await nav('contacts'); await click('p.newContact'); await modal().locator('[name="name"]').fill('Familia UI ficticia'); await modal().locator('[name="email"]').fill('family-ui@example.invalid'); await save();
      await modal().getByRole('heading', { name: 'Familia UI ficticia', exact: true }).waitFor(); await closeDialogs();
      contactId = await page.evaluate(async () => (await window.RescueManager.services.context.snapshot({fresh:true})).tables.contacts[0].id);
      const before = await observe(); await click('p.newContact'); await modal().locator('[name="name"]').fill('Posible duplicado'); await modal().locator('[name="email"]').fill('family-ui@example.invalid'); await click('common.save', modal());
      await modal().getByText(await t('p.confirmDuplicateNeeded'), { exact: true }).waitFor();
      assert((await observe()).businessHash === before.businessHash, 'Unconfirmed duplicate changed data'); assert(await modal().locator('[name="name"]').inputValue() === 'Posible duplicado', 'Duplicate error discarded form');
      page.once('dialog', dialog => dialog.accept()); await click('common.cancel', modal()); await page.locator('dialog[open]').waitFor({ state: 'detached' });
      return { contactId, contacts: before.counts.contacts, unconfirmedDuplicateBlocked: true, inputRetained: true };
    });
    await check('foster-volunteer-profiles-and-hours-use-shared-central-contact', async () => {
      await page.getByRole('row').filter({ hasText: 'Familia UI ficticia' }).getByRole('button', { name: await t('p.open'), exact: true }).click();
      await click('p.newFoster', modal()); await modal().locator('[name="totalCapacity"]').fill('2'); await modal().locator('[name="availability"]').selectOption('available'); await save();
      await modal().getByRole('heading', { name: 'Familia UI ficticia', exact: true }).waitFor(); await click('p.newVolunteer', modal()); await save();
      await modal().getByRole('heading', { name: 'Familia UI ficticia', exact: true }).waitFor(); await click('p.hours', modal()); await click('p.logHours', modal());
      await modal().locator('[name="activity"]').fill('Paseos de prueba'); await modal().locator('[name="durationMinutes"]').fill('90'); await save();
      await modal().getByText('Paseos de prueba', { exact: true }).waitFor(); await closeDialogs();
      const capture = await observe(); assert(capture.counts.contacts === 1 && capture.counts.fosterProfiles === 1 && capture.counts.volunteerProfiles === 1 && capture.counts.volunteerHours === 1, 'Profiles duplicated person or hours missing'); return capture;
    });
    await check('animal-entry-and-positive-weight-save-through-real-forms', async () => {
      await nav('animals'); await click('a.new'); await modal().locator('[name="name"]').fill('Luna UI ñ 🐾'); await modal().locator('[name="speciesId"]').selectOption({index:0}); await modal().locator('[name="entryReason"]').fill('Rescate sintético'); await modal().locator('[name="availability"]').selectOption('available'); await save();
      await page.getByRole('heading', { name: 'Luna UI ñ 🐾', exact: true }).waitFor(); animalId = await page.evaluate(async () => (await window.RescueManager.services.context.snapshot({fresh:true})).tables.animals[0].id);
      await click('a.addWeight'); await modal().locator('[name="grams"]').fill('9500'); await save(); await page.getByText(/9500 g/).first().waitFor();
      const capture = await observe(); assert(capture.counts.animals === 1 && capture.counts.stayEpisodes === 1 && capture.counts.weightMeasurements === 1, 'Animal entry or weight missing'); return { animalId, ...capture };
    });
    await check('real-photo-selected-in-ui-is-optimized-and-previewed', async () => {
      const buffer = await page.evaluate(async () => { const canvas = document.createElement('canvas'); canvas.width = 2000; canvas.height = 800; const ctx = canvas.getContext('2d'); ctx.fillStyle = '#4d7c66'; ctx.fillRect(0, 0, 2000, 800); ctx.fillStyle = '#edba66'; ctx.fillRect(200, 100, 700, 600); const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png')); return Array.from(new Uint8Array(await blob.arrayBuffer())); });
      await click('a.setPhoto'); await modal().locator('[name="file"]').setInputFiles({ name: 'foto-ui.png', mimeType: 'image/png', buffer: Buffer.from(buffer) }); await save();
      await page.waitForFunction(() => { const image = document.querySelector('img.animal-photo'); return image && image.complete && image.naturalWidth === 1600; });
      const capture = await observe(); assert(capture.counts.assets === 2, 'Photo and thumbnail not atomic'); await screenshots('animal-info'); return { assets: 2, previewWidth: 1600 };
    });
    await check('invalid-document-keeps-fields-and-writes-nothing-then-valid-txt-saves', async () => {
      await click('a.tab.documents'); await click('d.newEmbedded'); await modal().locator('[name="title"]').fill('Documento UI ñ'); await modal().locator('[name="typeId"]').selectOption({index:0});
      await modal().locator('[name="file"]').setInputFiles({ name: 'unsafe.txt', mimeType: 'text/plain', buffer: Buffer.from('<!DOCTYPE html><html>unsafe</html>') }); const before = await observe();
      await click('common.save', modal()); await modal().locator('.form-errors p').waitFor();
      assert(await modal().locator('[name="title"]').inputValue() === 'Documento UI ñ' && (await observe()).businessHash === before.businessHash, 'Invalid file lost fields or changed data');
      await modal().locator('[name="file"]').setInputFiles({ name: 'documento-ui.txt', mimeType: 'text/plain', buffer: Buffer.from('Documento sintético ñ\nSegunda línea') }); await save();
      await page.getByRole('row').filter({ hasText: 'Documento UI ñ' }).waitFor(); const capture = await observe(); assert(capture.counts.documents === 1 && capture.counts.documentLinks === 1 && capture.counts.assets === 3, 'Document not linked to animal'); return { inputRetained: true, invalidChangedNoData: true, ...capture };
    });
    await check('document-download-link-unlink-and-external-reference-follow-live-ui-state', async () => {
      await page.getByRole('row').filter({ hasText: 'Documento UI ñ' }).getByRole('button', { name: await t('d.open'), exact: true }).click();
      const event = page.waitForEvent('download'); await click('d.download', modal()); const download = await event, savedFile = path.join(folder, 'documento-descargado.txt'); await download.saveAs(savedFile);
      assert(await fs.readFile(savedFile, 'utf8') === 'Documento sintético ñ\nSegunda línea', 'Download changed bytes');
      await modal().getByLabel(await t('d.linkType'), { exact: true }).selectOption('contact'); await modal().getByLabel(await t('d.linkTarget'), { exact: true }).selectOption(contactId); await click('d.link', modal()); await click('d.link', modal()); await page.locator('dialog[open]').waitFor({ state: 'detached' });
      await page.getByRole('row').filter({ hasText: 'Documento UI ñ' }).getByRole('button', { name: await t('d.open'), exact: true }).click(); await click('d.unlink', modal().getByRole('listitem').filter({ hasText: 'Familia UI ficticia' })); await click('d.unlink', modal()); await page.locator('dialog[open]').waitFor({ state: 'detached' });
      await click('d.newExternal'); await modal().locator('[name="title"]').fill('Referencia externa UI'); await modal().locator('[name="typeId"]').selectOption({index:0}); await modal().locator('[name="externalFileName"]').fill('contrato-original.docx'); await modal().locator('[name="externalLocation"]').fill('Archivador local rojo'); await save();
      await page.getByRole('row').filter({ hasText: 'Referencia externa UI' }).waitFor(); const capture = await observe(); assert(capture.counts.documents === 2 && capture.counts.assets === 3 && capture.counts.documentLinks === 3, 'External bytes embedded or link history deleted'); await screenshots('animal-documents'); return { downloadName: download.suggestedFilename(), downloadBytesMatch: true, ...capture };
    });
    await check('real-ui-backup-download-reselection-and-restoration-preserve-records-and-binaries', async () => {
      await nav('backup'); const before = await observe(), event = page.waitForEvent('download'); await click('ui.generateDownload'); const download = await event, downloaded = path.join(folder, download.suggestedFilename()); await download.saveAs(downloaded);
      await page.getByLabel(await t('ui.selectVerify'), { exact: true }).setInputFiles(downloaded); await page.getByText(await t('ui.backupVerified'), { exact: true }).waitFor(); const container = JSON.parse(await fs.readFile(downloaded, 'utf8'));
      assert(container.content.manifest.embeddedAssetCount === 3 && container.content.manifest.externalReferenceCount === 1, 'Backup omitted media or external reference');
      await page.getByLabel(await t('ui.selectRestore'), { exact: true }).setInputFiles(downloaded); await page.getByRole('heading', { name: await t('ui.restoreSummary'), exact: true }).waitFor(); await page.locator('#confirm-restore').check(); await click('ui.applyRestore'); await page.getByText(await t('ui.restored'), { exact: true }).waitFor();
      const after = await observe(); assert(before.businessHash === after.businessHash && before.datasetId !== after.datasetId, 'UI restoration changed data/bytes or failed to rebase'); return { file: path.relative(root, downloaded), bytes: (await fs.stat(downloaded)).size, before, after };
    });
    await check('new-module-viewports-and-language-switch-preserve-data-with-clean-runtime', verifyViews);
    const beforeClose = await observe(); await check('complete-owned-browser-close', () => first.session.close()); const reopened = await open(); page = reopened.tab;
    await check('records-and-actual-binary-hashes-persist-after-complete-browser-reopen', async () => { const after = await observe(); assert(beforeClose.businessHash === after.businessHash && beforeClose.datasetId === after.datasetId && beforeClose.dataRevision === after.dataRevision, 'Data changed after reopening'); return { before: beforeClose, after, sameProfile: true }; });
    await check('complete-reopened-browser-close', () => reopened.session.close());
    await check('tested-workspace-sources-remained-unchanged', async () => { assert(JSON.stringify(result.sourceFiles) === JSON.stringify(await sources()), 'Source files changed during acceptance'); return { hashesMatch: true, count: result.sourceFiles.length }; });
  } catch (error) { result.fatalError = { name: error.name, message: error.message, stack: error.stack }; }
  finally {
    for (const session of sessions) try { await session.close(); } catch (error) { result.cleanupErrors = [...(result.cleanupErrors || []), String(error)]; }
    result.completedAt = new Date().toISOString(); result.status = result.fatalError || result.cleanupErrors || result.checks.some(row => !row.passed) || !result.checks.length ? 'failed' : 'passed';
    await fs.writeFile(path.join(root, 'tests/results', options.output), JSON.stringify(result, null, 2) + '\n'); console.log(result.status.toUpperCase()); if (result.status !== 'passed') process.exitCode = 1;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
