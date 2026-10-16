/* Real local-file UI QA. Synthetic organization in a dedicated browser profile. */
'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { launch } = require('./chromium.cjs');
const root = path.resolve(__dirname, '../..');
const args = process.argv.slice(2);
let output = 'ui-chrome.json', machine = 'unspecified', browser = 'chrome';
// Preserve the original positional filename while accepting portable handoff flags.
if (args[0] && !args[0].startsWith('--')) output = args.shift();
for (let index = 0; index < args.length; index += 2) {
  if (!['--output', '--machine', '--browser'].includes(args[index]) || !args[index + 1]) throw new Error('Use [filename.json] or --output filename.json --machine alias --browser chrome|edge');
  if (args[index] === '--output') output = args[index + 1]; else if (args[index] === '--machine') machine = args[index + 1]; else browser = args[index + 1];
}
if (!/^[a-zA-Z0-9._-]+\.json$/.test(output)) throw new Error('Output must be a plain JSON filename');
if (!/^[a-zA-Z0-9._-]{1,80}$/.test(machine)) throw new Error('Machine must be a short alias');
if (!['chrome', 'edge'].includes(browser)) throw new Error('Browser must be chrome or edge');
const result = { format: 'rescue-manager-foundation-ui-test', version: 1, browser, machine,
  startedAt: new Date().toISOString(), checks: [], launches: [], closures: [], pageErrors: [], consoleErrors: [], externalRequests: [], screenshots: [],
  limitations: ['Foundation UI only; business module forms are not implemented.', 'Viewport emulation is not a real mobile/tablet device.', 'Page request trace does not cover browser-internal traffic.'] };
const assert = (condition, message) => { if (!condition) throw new Error(message); };
async function sources() {
  const html = path.join(root, 'index.html'), text = await fs.readFile(html, 'utf8');
  const files = [html, path.join(root, 'css/app.css'), ...Array.from(text.matchAll(/<script[^>]+src="([^"]+)"/g), match => path.resolve(root, match[1]))];
  return Promise.all(files.map(async file => ({ file: path.relative(root, file).replaceAll('\\', '/'), sha256: crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex') })));
}
async function check(id, work) {
  try { const evidence = await work(); result.checks.push({ id, passed: true, evidence }); console.log('PASS ' + id); }
  catch (error) { result.checks.push({ id, passed: false, error: { name: error.name, message: error.message, stack: error.stack } }); console.log('FAIL ' + id + ': ' + error.message); }
}
(async () => {
  let session;
  try {
    result.sourceFiles = await sources();
    const folder = path.join(root, '.tmp', 'ui-' + Date.now());
    session = await launch(browser, path.join(folder, 'profile'), result);
    const context = session.context;
    async function open() {
      const page = await context.newPage();
      page.setDefaultTimeout(10000);
      await page.setViewportSize({ width: 1440, height: 1000 });
      page.on('pageerror', error => result.pageErrors.push(String(error)));
      page.on('console', message => { if (message.type() === 'error') result.consoleErrors.push(message.text()); });
      page.on('request', request => { if (/^https?:/i.test(request.url())) result.externalRequests.push(request.url()); });
      await page.goto(pathToFileURL(path.join(root, 'index.html')).href, { waitUntil: 'load' });
      await page.evaluate(() => window.RescueManager.core.app.ready);
      return page;
    }
    const page = await open();
    page.setDefaultTimeout(10000);
    await page.setViewportSize({ width: 1440, height: 1000 });
    async function observe() {
      return page.evaluate(async () => {
        const root = window.RescueManager, snap = await root.services.context.snapshot();
        if (!snap) return null;
        const tables = Object.fromEntries(Object.entries(snap.tables).map(([name, rows]) => [name, rows.map(row => {
          const value = { ...row }; delete value.datasetId; return value;
        }).sort((a, b) => a.id.localeCompare(b.id))]));
        return { datasetId: snap.datasetId, globalRevision: snap.globalRevision,
          name: snap.tables.organizationSettings[0].name, counts: Object.fromEntries(Object.entries(tables).map(([name, rows]) => [name, rows.length])),
          businessHash: await root.utils.integrity.sha256(root.utils.canonicalJson.stringify(tables)) };
      });
    }
    await check('initial-english-offline-in-isolated-profile', async () => {
      const evidence = await page.evaluate(() => ({ lang: document.documentElement.lang, protocol: location.protocol, online: navigator.onLine,
        heading: document.querySelector('h1').textContent, active: window.RescueManager.services.context.status().active }));
      assert(evidence.lang === 'en' && evidence.protocol === 'file:' && !evidence.online && evidence.active === null, 'Initial local/offline/empty English state was incorrect');
      assert(evidence.heading === 'No organization data is accessible here', 'Unexpected initial heading');
      return evidence;
    });
    await check('switch-to-spanish-and-clean-dialog-escape-focus-return', async () => {
      await page.locator('#language').selectOption('es');
      await page.waitForFunction(() => document.documentElement.lang === 'es');
      const opener = page.getByRole('button', { name: 'Crear una organización', exact: true });
      await opener.click();
      await page.locator('dialog[open]').waitFor();
      assert(await page.locator('#field-name').evaluate(node => document.activeElement === node), 'Dialog did not focus its first field');
      await page.keyboard.press('Escape');
      await page.locator('dialog').waitFor({ state: 'detached' });
      const focusReturned = await opener.evaluate(node => document.activeElement === node);
      assert(focusReturned, 'Escape did not return focus to the opener');
      return { lang: 'es', focusReturned };
    });
    await check('dirty-dialog-cancel-preserves-then-discards-with-confirmation', async () => {
      const opener = page.getByRole('button', { name: 'Crear una organización', exact: true });
      await opener.click(); await page.locator('#field-name').fill('Cambio sin guardar');
      page.once('dialog', dialog => dialog.dismiss());
      await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
      assert(await page.locator('dialog').isVisible() && await page.locator('#field-name').inputValue() === 'Cambio sin guardar', 'Rejected discard lost the form');
      page.once('dialog', dialog => dialog.accept());
      await page.keyboard.press('Escape');
      await page.locator('dialog').waitFor({ state: 'detached' });
      assert(await observe() === null, 'Cancelling initialized an organization');
      return { cancelledDiscardPreservedInput: true, confirmedDiscardClosed: true };
    });
    await check('organization-form-save-and-reload-persists', async () => {
      await page.getByRole('button', { name: 'Crear una organización', exact: true }).click();
      await page.locator('#field-name').fill('Refugio QA sintético ñ 🐾');
      await page.locator('#field-language').selectOption('es');
      await page.locator('#field-timeZone').fill('Europe/Madrid');
      await page.locator('#field-email').fill('qa@example.invalid');
      await page.getByRole('button', { name: 'Guardar', exact: true }).click();
      await page.locator('dialog').waitFor({ state: 'detached' });
      const before = await observe(); assert(before?.name === 'Refugio QA sintético ñ 🐾', 'Organization not committed');
      await page.reload({ waitUntil: 'load' }); await page.evaluate(() => window.RescueManager.core.app.ready);
      const after = await observe(); assert(before.businessHash === after.businessHash, 'Reload changed organization data');
      // R4: the reloaded page regains control by itself when the previous document's lease expires.
      const readOnlyAfterReload = await page.getByRole('button', { name: 'Tomar el control de escritura', exact: true }).count() > 0;
      const explained = await page.getByText('Si acabas de recargar o reabrir la página', { exact: false }).count() > 0;
      const started = Date.now(), leaseMs = await page.evaluate(() => window.RescueManager.config.leaseMs);
      await page.waitForFunction(() => window.RescueManager.services.context.status().canWrite, null, { timeout: leaseMs + 10000 });
      const controlRecoveredMs = Date.now() - started;
      await page.getByRole('button', { name: 'Tomar el control de escritura', exact: true }).waitFor({ state: 'detached', timeout: 5000 });
      assert(controlRecoveredMs <= leaseMs + 2000 && (!readOnlyAfterReload || explained), 'Reloaded page did not regain control within one lease period');
      return { before, after, readOnlyAfterReload, controlRecoveredMs, takeoverUsed: false, languageAfterReload: await page.locator('html').getAttribute('lang') };
    });
    await check('viewport-navigation-and-overflow', async () => {
      const widths = [];
      for (const width of [360, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        const dimensions = await page.evaluate(() => ({ viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
        assert(dimensions.scrollWidth <= dimensions.viewport, 'Page overflow at ' + width);
        if (width === 360) {
          const menu = page.getByRole('button', { name: 'Abrir menú', exact: true });
          await menu.click();
          assert(await page.locator('#navigation').isVisible(), 'Mobile menu did not open');
          await page.keyboard.press('Escape');
          assert(!await page.locator('#navigation').isVisible(), 'Escape did not close mobile menu');
          dimensions.menuExpandedAfterEscape = await menu.getAttribute('aria-expanded');
          assert(dimensions.menuExpandedAfterEscape === 'false', 'Menu aria-expanded stayed true after Escape');
        }
        widths.push({ width, ...dimensions });
      }
      return widths;
    });
    await check('second-tab-read-only-settings-disabled', async () => {
      const peer = await open();
      await peer.getByRole('link', { name: 'Configuración', exact: true }).click();
      const edit = peer.getByRole('button', { name: 'Editar organización', exact: true });
      await edit.waitFor(); assert(await edit.isDisabled(), 'Second tab can edit organization');
      const canWrite = await peer.evaluate(() => window.RescueManager.services.context.status().canWrite);
      assert(!canWrite, 'Second tab holds writer state');
      await peer.close(); return { canWrite, editDisabled: true };
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    let downloaded;
    await check('backup-download-and-reselect-verification-through-ui', async () => {
      await page.getByRole('link', { name: 'Copias de seguridad', exact: true }).click();
      const downloadEvent = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Generar y descargar', exact: true }).click();
      const download = await downloadEvent; downloaded = path.join(folder, download.suggestedFilename());
      await download.saveAs(downloaded);
      await page.getByLabel('Seleccionar copia para verificar', { exact: true }).setInputFiles(downloaded);
      await page.getByText('La copia seleccionada ha superado las comprobaciones de integridad y relaciones.', { exact: true }).waitFor();
      const bytes = await fs.readFile(downloaded), container = JSON.parse(bytes.toString('utf8'));
      const receipts = await page.evaluate(() => window.RescueManager.services.backup.list());
      assert(receipts[0].state === 'verified', 'Reselected download was not recorded as verified');
      return { file: path.relative(root, downloaded), bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), format: container.format, receiptState: receipts[0].state };
    });
    await check('ui-restore-confirmation-and-preserved-business-data', async () => {
      assert(downloaded, 'No downloaded backup available');
      const before = await observe();
      await page.getByLabel('Seleccionar copia para restaurar', { exact: true }).setInputFiles(downloaded);
      await page.getByRole('heading', { name: 'Revisar la sustitución', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Sustituir por esta copia', exact: true }).click();
      assert((await observe()).datasetId === before.datasetId, 'Unchecked confirmation changed active data');
      await page.locator('#confirm-restore').check();
      await page.getByRole('button', { name: 'Sustituir por esta copia', exact: true }).click();
      await page.getByText('La copia se ha restaurado y comprobado. El conjunto anterior se conserva para recuperación local.', { exact: true }).waitFor();
      const after = await observe();
      assert(after.datasetId !== before.datasetId && after.businessHash === before.businessHash, 'UI restore changed records or did not activate a separate dataset');
      const datasets = await page.evaluate(() => window.RescueManager.storage.datasetManager.list());
      assert(datasets.some(row => row.id === before.datasetId && row.state === 'retired'), 'Previous dataset was not retained');
      return { before, after, previousDatasetRetained: true };
    });
    await check('screenshots-and-clean-runtime', async () => {
      for (const width of [1440, 360]) {
        await page.setViewportSize({ width, height: 1000 });
        const filename = output.replace(/\.json$/, '') + '-' + width + '.png';
        await page.screenshot({ path: path.join(root, 'tests/results', filename), fullPage: true });
        result.screenshots.push(filename);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Backup page overflow at ' + width);
      }
      assert(!result.pageErrors.length && !result.consoleErrors.length && !result.externalRequests.length, 'UI errors or external page requests were observed');
      return { pageErrors: result.pageErrors, consoleErrors: result.consoleErrors, externalRequests: result.externalRequests };
    });
    await check('complete-owned-browser-close', () => session.close());
    await check('tested-ui-sources-remained-unchanged', async () => {
      assert(JSON.stringify(result.sourceFiles) === JSON.stringify(await sources()), 'UI source changed during QA');
      return { count: result.sourceFiles.length, hashesMatch: true };
    });
  } catch (error) { result.fatalError = { name: error.name, message: error.message, stack: error.stack }; }
  finally {
    if (session) { try { await session.close(); } catch (error) { result.cleanupError = String(error); } }
    result.completedAt = new Date().toISOString();
    result.status = result.fatalError || result.cleanupError || result.checks.some(check => !check.passed) ? 'failed' : 'passed';
    await fs.writeFile(path.join(root, 'tests/results', output), JSON.stringify(result, null, 2) + '\n');
    console.log(result.status.toUpperCase()); if (result.status !== 'passed') process.exitCode = 1;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
