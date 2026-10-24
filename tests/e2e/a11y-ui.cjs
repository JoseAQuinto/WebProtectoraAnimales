/* Developer-only automated accessibility audit of every route, animal tab and header dialog. Real file://, offline persistent profile, no runtime mocks.
   It is a rule-based audit (names, structure, ids, tables, dialogs, language, contrast, keyboard order); it is not a manual assistive-technology review. */
'use strict';
const fs = require('node:fs/promises'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto');
const { pathToFileURL } = require('node:url'), { launch } = require('./chromium.cjs');
const root = path.resolve(__dirname, '../..'), options = { browser: 'chrome', output: 'a11y-ui-chrome.json', machine: 'unspecified' };
for (let index = 2; index < process.argv.length; index += 2) { const key = process.argv[index].replace(/^--/, '');
  if (!['browser', 'output', 'machine', 'executable'].includes(key) || !process.argv[index + 1]) throw new Error('Use --browser --output --machine --executable'); options[key] = process.argv[index + 1]; }
if (!['chrome', 'edge', 'firefox'].includes(options.browser) || !/^[a-zA-Z0-9._-]+\.json$/.test(options.output)) throw new Error('Invalid browser or output');
const output = path.join(root, 'tests/results', options.output), hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const routes = ['dashboard', 'search', 'animals', 'adoptions', 'contacts', 'fosters', 'volunteers', 'tasks', 'finance', 'donations', 'inventory', 'documents', 'reports', 'exports', 'imports', 'moduleImport', 'demo', 'backup', 'retention', 'settings', 'help'];
const tabs = ['info', 'health', 'foster', 'adoption', 'expenses', 'documents', 'history'];
const result = { format: 'rescue-manager-a11y-ui-test', version: 1, browser: options.browser, machine: options.machine, startedAt: new Date().toISOString(),
  operatingSystem: { type: os.type(), release: os.release(), version: os.version() }, checks: [], audits: [], dialogScopes: [], launches: [], closures: [], pageErrors: [], consoleErrors: [], externalRequests: [],
  limitations: ['Rule-based automated audit only: accessible names, headings, duplicate ids, tables, dialogs, language, text contrast (solid backgrounds) and positive tabindex. No screen reader, voice control or manual expert review.',
    'Data comes from the optional fictitious demo loaded through its real service after a verified backup.', 'Header dialogs are opened and dismissed with Escape; nested and conditional dialogs are only audited where covered by name.', 'No business service is mocked.'] };
const assert = (condition, message) => { if (!condition) throw new Error(message); };
async function sources() { const html = path.join(root, 'index.html'), source = await fs.readFile(html, 'utf8'), files = new Set([html, ...Array.from(source.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"]+)"/g), match => path.resolve(root, match[1]))]);
  return Promise.all([...files].map(async file => ({ file: path.relative(root, file).replaceAll('\\', '/'), sha256: hash(await fs.readFile(file)) }))); }
async function persist() { await fs.writeFile(output, JSON.stringify(result, null, 2) + '\n'); }
async function check(id, operation) { try { result.checks.push({ id, passed: true, evidence: await operation() }); console.log('PASS ' + id); }
  catch (error) { result.checks.push({ id, passed: false, error: { name: error.name, message: error.message, stack: error.stack } }); console.log('FAIL ' + id + ': ' + error.message); throw error; } finally { await persist(); } }
// Runs inside the page; returns rule violations for the visible document or the top open dialog.
function audit(scopeName) {
  const dialog = [...document.querySelectorAll('dialog[open]')].pop(), scope = dialog || document.querySelector('main') || document.body, out = [];
  const visible = node => { if (!node.isConnected) return false; const style = getComputedStyle(node); if (style.display === 'none' || style.visibility === 'hidden') return false; const box = node.getBoundingClientRect(); return box.width > 0 || box.height > 0 || node.getClientRects().length > 0; };
  const text = node => (node?.textContent || '').replace(/\s+/g, ' ').trim();
  const describe = node => node.tagName.toLowerCase() + (node.id ? '#' + node.id : '') + (node.getAttribute('name') ? '[name=' + node.getAttribute('name') + ']' : '') + ' "' + text(node).slice(0, 40) + '"';
  const name = node => { const by = node.getAttribute('aria-labelledby'); if (by) return by.split(/\s+/).map(id => text(document.getElementById(id))).join(' ').trim(); const aria = (node.getAttribute('aria-label') || '').trim(); if (aria) return aria;
    if (node.labels && node.labels.length) return [...node.labels].map(text).join(' ').trim(); if (node.tagName === 'IMG') return node.getAttribute('alt') || ''; return (text(node) || node.getAttribute('title') || '').trim(); };
  const add = (rule, node, detail) => out.push({ scope: scopeName, rule, node: node ? describe(node) : null, detail: detail || null });
  for (const node of scope.querySelectorAll('input:not([type=hidden]),select,textarea')) if (visible(node) && !name(node)) add('control-name', node);
  for (const node of scope.querySelectorAll('button,a[href],[role=button]')) if (visible(node) && !name(node)) add('interactive-name', node);
  for (const node of scope.querySelectorAll('img')) if (!node.hasAttribute('alt')) add('image-alt', node);
  const ids = new Map(); for (const node of document.querySelectorAll('[id]')) ids.set(node.id, (ids.get(node.id) || 0) + 1); for (const [id, count] of ids) if (count > 1) add('duplicate-id', null, id + ' ×' + count);
  for (const node of document.querySelectorAll('[aria-labelledby],label[for]')) { const refs = node.hasAttribute('aria-labelledby') ? node.getAttribute('aria-labelledby').split(/\s+/) : [node.getAttribute('for')]; for (const id of refs) if (!document.getElementById(id)) add('broken-reference', node, id); }
  for (const node of scope.querySelectorAll('[tabindex]')) if (Number(node.getAttribute('tabindex')) > 0) add('positive-tabindex', node);
  if (dialog) { if (!name(dialog)) add('dialog-name', dialog); }
  else { const h1 = [...scope.querySelectorAll('h1')].filter(visible); if (h1.length !== 1) add('single-h1', null, String(h1.length)); }
  let last = dialog ? 1 : 0; for (const node of scope.querySelectorAll('h1,h2,h3,h4,h5,h6')) { if (!visible(node)) continue; const level = Number(node.tagName[1]); if (last && level > last + 1) add('heading-order', node, 'h' + last + '→h' + level); last = level; }
  for (const table of scope.querySelectorAll('table')) { if (!visible(table)) continue; if (!table.querySelector('th')) add('table-headers', table); for (const th of table.querySelectorAll('tbody th')) if (!th.getAttribute('scope')) add('row-header-scope', th); }
  if (document.documentElement.lang !== window.RescueManager.core.i18n.language) add('document-language', null, document.documentElement.lang);
  if (!document.querySelector('main')) add('landmark-main'); if (!document.querySelector('nav')) add('landmark-nav');
  const rgb = value => { const match = /rgba?\(([^)]+)\)/.exec(value); if (!match) return null; const parts = match[1].split(',').map(Number); return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 }; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const background = node => { for (let cursor = node; cursor; cursor = cursor.parentElement) { const style = getComputedStyle(cursor); if (style.backgroundImage !== 'none') return null; const color = rgb(style.backgroundColor); if (color && color.a >= 0.99) return color; } return { r: 255, g: 255, b: 255, a: 1 }; };
  for (const node of scope.querySelectorAll('*')) {
    if (!visible(node) || ![...node.childNodes].some(child => child.nodeType === 3 && child.textContent.trim())) continue;
    if (node.closest('[disabled],[aria-disabled=true]') || (node.tagName === 'OPTION')) continue;
    const style = getComputedStyle(node), fg = rgb(style.color), bg = background(node); if (!fg || !bg || fg.a < 0.99) continue;
    const a = lum(fg), b = lum(bg), ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), size = parseFloat(style.fontSize), bold = Number(style.fontWeight) >= 700, large = size >= 24 || (bold && size >= 18.66);
    if (ratio < (large ? 3 : 4.5)) add('contrast', node, ratio.toFixed(2) + ' ' + style.color + ' on ' + `rgb(${bg.r}, ${bg.g}, ${bg.b})`);
  }
  return out;
}
(async()=>{
  try{await fs.access(output);throw new Error('Evidence exists');}catch(error){if(error.code!=='ENOENT')throw error;}
  const folder=path.join(root,'.tmp','a11y-'+options.browser+'-'+Date.now()),profile=path.join(folder,'profile'),sessions=[];let page;
  const t=(key,values)=>page.evaluate(([key,values])=>window.RescueManager.core.i18n.t(key,values),[key,values]);
  async function open(){const session=await launch(options.browser,profile,result,false,{executable:options.executable});sessions.push(session);const tab=await session.context.newPage();tab.setDefaultTimeout(15000);await tab.setViewportSize({width:1440,height:1050});
    tab.on('pageerror',error=>result.pageErrors.push(String(error)));tab.on('console',message=>{if(message.type()==='error')result.consoleErrors.push(message.text());});tab.on('request',request=>{if(/^https?:/i.test(request.url()))result.externalRequests.push(request.url());});
    await tab.goto(pathToFileURL(path.join(root,'index.html')).href);await tab.evaluate(()=>window.RescueManager.core.app.ready);return{session,tab};}
  async function go(hash){await page.evaluate(hash=>{location.hash=hash;},hash);await page.waitForFunction(()=>!!document.querySelector('main h1'));await page.waitForTimeout(150);}
  const run=label=>page.evaluate(audit.toString().replace(/^function audit/,'(function audit')+')('+JSON.stringify(label)+')');
  async function dialogs(label){const count=await page.locator('main .page-heading button:not([disabled])').count(),found=[];for(let index=0;index<count;index++){const button=page.locator('main .page-heading button:not([disabled])').nth(index),name=(await button.innerText()).trim();await button.click();const opened=await page.locator('dialog[open]').count();if(opened){result.dialogScopes.push(label+' › '+name);found.push(...await run(label+' › '+name));await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('dialog[open]'));}else await go(label.split(' ')[0]);}return found;}
  try{
    result.sourceFiles=await sources();const first=await open();page=first.tab;
    await check('empty-start-screen-audit',async()=>{const found=await run('start');result.audits.push({scope:'start',violations:found});return{violations:found};});
    await check('fictitious-demo-loaded-through-its-service-after-verified-backup',async()=>page.evaluate(async()=>{const r=window.RescueManager,s=r.services;await s.settings.create({name:'Auditoría ficticia',language:'es',currencyCode:'EUR',dateFormat:'day_first',timeZone:'UTC'});const copy=await s.backup.create();await s.backup.requested(copy.container.content.backupId);await s.backup.verify(new File([copy.blob],'copy.json',{type:'application/json'}));const snap=await s.context.snapshot({fresh:true}),report=await s.demo.previewLoad(snap,{language:'es'});await s.demo.apply(report,{confirmed:true});await s.context.open();await r.core.app.render();const after=await s.context.snapshot({fresh:true});return{animals:after.tables.animals.length,contacts:after.tables.contacts.length};}));
    for(const language of['es','en']){
      await check('audit-every-route-and-header-dialog-'+language,async()=>{await page.evaluate(language=>{window.RescueManager.core.i18n.setLanguage(language);return window.RescueManager.core.app.render();},language);const all=[];for(const route of routes){await go(route);const found=await run(route+' '+language);all.push(...found,...await dialogs(route+' '+language));}result.audits.push({scope:'routes-'+language,violations:all});return{routes:routes.length,violations:all.length};});
      await check('audit-every-animal-tab-'+language,async()=>{const id=await page.evaluate(async()=>(await window.RescueManager.services.context.snapshot({fresh:true})).tables.animals.find(row=>!row.deletedAt).id);const all=[];for(const tab of tabs){await go('animals/'+id+'/'+tab);all.push(...await run('animal-'+tab+' '+language));}await go('animals/'+id);await page.locator('button[data-print-sheet]').click();await page.locator('dialog[open]').waitFor();all.push(...await run('print-sheet '+language));await page.keyboard.press('Escape');result.audits.push({scope:'animal-'+language,violations:all});return{tabs:tabs.length,violations:all.length};});
    }
    await check('keyboard-skip-link-and-focus-order-reach-main-content',async()=>{await go('dashboard');await page.keyboard.press('Tab');const first=await page.evaluate(()=>({tag:document.activeElement.tagName,href:document.activeElement.getAttribute('href'),text:document.activeElement.textContent.trim()}));await page.keyboard.press('Enter');const focused=await page.evaluate(()=>!!document.activeElement.closest('main')||document.activeElement.id==='main');return{first,focusedMain:focused};});
    await check('no-rule-violations-in-any-audited-scope',async()=>{const all=result.audits.flatMap(row=>row.violations),summary={};for(const row of all)summary[row.rule]=(summary[row.rule]||0)+1;const keyboard=result.checks.find(row=>row.id==='keyboard-skip-link-and-focus-order-reach-main-content').evidence;assert(keyboard.focusedMain,'Skip link does not move focus to main');assert(!all.length,'Violations: '+JSON.stringify(summary));assert(result.dialogScopes.length>=10,'Too few header dialogs audited: '+result.dialogScopes.length);return{summary,dialogs:result.dialogScopes.length};});
    await check('no-runtime-or-network-errors',async()=>{assert(!result.pageErrors.length&&!result.consoleErrors.length&&!result.externalRequests.length,'Runtime/external errors');return true;});
    await check('complete-owned-close',()=>first.session.close());await check('source-files-unchanged',async()=>{assert(JSON.stringify(result.sourceFiles)===JSON.stringify(await sources()),'Runtime source changed');return{count:result.sourceFiles.length};});result.completed=true;
  }catch(error){result.fatalError={name:error.name,message:error.message,stack:error.stack};}
  finally{for(const session of sessions)try{await session.close();}catch(error){result.cleanupErrors=[...(result.cleanupErrors||[]),String(error)];}result.completedAt=new Date().toISOString();result.status=result.fatalError||result.cleanupErrors||!result.completed?'failed':'passed';await persist();console.log(result.status.toUpperCase());if(result.status!=='passed')process.exitCode=1;}
})().catch(error=>{console.error(error);process.exitCode=1;});
