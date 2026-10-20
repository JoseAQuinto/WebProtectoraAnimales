/* Developer-only acceptance of the printable animal sheet and its personal-data option. Real file://, offline persistent profile, no runtime mocks. */
'use strict';
const fs = require('node:fs/promises'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto');
const { pathToFileURL } = require('node:url'), { launch } = require('./chromium.cjs');
const root = path.resolve(__dirname, '../..'), options = { browser: 'chrome', output: 'animal-print-ui-chrome.json', machine: 'unspecified' };
for (let index = 2; index < process.argv.length; index += 2) { const key = process.argv[index].replace(/^--/, '');
  if (!['browser', 'output', 'machine', 'executable'].includes(key) || !process.argv[index + 1]) throw new Error('Use --browser --output --machine --executable'); options[key] = process.argv[index + 1]; }
if (!['chrome', 'edge'].includes(options.browser) || !/^[a-zA-Z0-9._-]+\.json$/.test(options.output)) throw new Error('Invalid browser or output');
const output = path.join(root, 'tests/results', options.output), hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const result = { format: 'rescue-manager-animal-print-ui-test', version: 1, browser: options.browser, machine: options.machine, startedAt: new Date().toISOString(),
  operatingSystem: { type: os.type(), release: os.release(), version: os.version() }, checks: [], launches: [], closures: [], screenshots: [], pageErrors: [], consoleErrors: [], externalRequests: [],
  limitations: ['Organization, contacts, animal, photograph, weights, health record and foster stay are prepared through real production services, explicitly identified as test fixture preparation; canvas PNG files are synthetic.', 'window.print is replaced by a recording test hook so the browser print dialog does not block headless runs; print media is then emulated and Chromium printToPDF renders the paginated output. No physical printer or paper is tested.', 'Viewport emulation is not a physical mobile/tablet test.', 'No business service is mocked.', 'Page request trace excludes browser-internal traffic.'] };
const assert = (condition, message) => { if (!condition) throw new Error(message); };
async function sources() { const html = path.join(root, 'index.html'), source = await fs.readFile(html, 'utf8'), files = new Set([html, ...Array.from(source.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"]+)"/g), match => path.resolve(root, match[1]))]);
  for (const file of files) if (file.endsWith('.css')) for (const match of (await fs.readFile(file, 'utf8')).matchAll(/@import\s+(?:url\()?['"]([^'"]+)['"]/g)) files.add(path.resolve(path.dirname(file), match[1]));
  return Promise.all([...files].map(async file => ({ file: path.relative(root, file).replaceAll('\\', '/'), sha256: hash(await fs.readFile(file)) }))); }
async function persist() { await fs.writeFile(output, JSON.stringify(result, null, 2) + '\n'); }
async function check(id, operation) { try { result.checks.push({ id, passed: true, evidence: await operation() }); console.log('PASS ' + id); }
  catch (error) { result.checks.push({ id, passed: false, error: { name: error.name, message: error.message, stack: error.stack } }); console.log('FAIL ' + id + ': ' + error.message); throw error; } finally { await persist(); } }
(async()=>{
  try{await fs.access(output);throw new Error('Evidence exists');}catch(error){if(error.code!=='ENOENT')throw error;}
  const folder=path.join(root,'.tmp','animal-print-'+options.browser+'-'+Date.now()),profile=path.join(folder,'profile'),sessions=[];
  let page,fixture;
  const t=(key,values)=>page.evaluate(([key,values])=>window.RescueManager.core.i18n.t(key,values),[key,values]),modal=()=>page.locator('dialog[open]').last();
  const click=async(key,scope=page)=>scope.getByRole('button',{name:await t(key),exact:true}).click();
  async function open(){const session=await launch(options.browser,profile,result,false,{executable:options.executable});sessions.push(session);const tab=await session.context.newPage();tab.setDefaultTimeout(12000);await tab.setViewportSize({width:1440,height:1050});
    tab.on('pageerror',error=>result.pageErrors.push(String(error)));tab.on('console',message=>{if(message.type()==='error')result.consoleErrors.push(message.text());});tab.on('request',request=>{if(/^https?:/i.test(request.url()))result.externalRequests.push(request.url());});
    await tab.goto(pathToFileURL(path.join(root,'index.html')).href);await tab.evaluate(()=>window.RescueManager.core.app.ready);return{session,tab};}
  async function observe(){const value=await page.evaluate(async()=>{const r=window.RescueManager,s=await r.services.context.snapshot(),tables={};for(const[name,rows]of Object.entries(s.tables)){tables[name]=[];for(const row of [...rows].sort((a,b)=>a.id.localeCompare(b.id))){const copy={...row};delete copy.datasetId;if(name==='assets'){copy.blobHash=await r.utils.integrity.sha256(copy.blob);delete copy.blob;}tables[name].push(copy);}}return{datasetId:s.datasetId,revision:s.globalRevision,dataRevision:s.dataRevision,counts:Object.fromEntries(Object.entries(tables).map(([name,rows])=>[name,rows.length])),digest:await r.utils.integrity.sha256(r.utils.canonicalJson.stringify(tables)),tables};});Object.defineProperty(value,'tables',{enumerable:false});return value;}
  const same=(before,after)=>assert(JSON.stringify(before)===JSON.stringify(after),'Data changed unexpectedly');
  const personal=['Familia Acogida Ficticia','+34 600 000 001','acogida@example.test','Clínica Ficticia','clinica@example.test'],note='Nota interna ficticia';
  async function openSheet(){await page.evaluate(id=>{location.hash='animals/'+id;},fixture.animal);await page.locator('button[data-print-sheet]').waitFor();await page.locator('button[data-print-sheet]').click();await modal().getByRole('heading',{name:await t('pr.title'),exact:true}).waitFor();await modal().locator('.print-preview .print-sheet').waitFor();}
  async function close(){await click('common.close',modal());await page.waitForFunction(()=>!document.querySelector('dialog[open]'));}
  const previewText=()=>modal().locator('.print-preview').innerText();
  async function printed(label){
    await page.evaluate(()=>{window.__printCalls=[];window.print=()=>{window.__printCalls.push({sheet:!!document.querySelector('body > .print-sheet-output'),mode:document.documentElement.classList.contains('printing-sheet')});};});
    await click('ui.print',modal());const calls=await page.evaluate(()=>window.__printCalls);assert(calls.length===1&&calls[0].sheet&&calls[0].mode,'Print hook not reached with the sheet ready');
    await page.emulateMedia({media:'print'});const visible=await page.evaluate(()=>{const shown=node=>!!node&&getComputedStyle(node).display!=='none';return{shell:shown(document.querySelector('.shell')),dialog:shown(document.querySelector('dialog[open]')),sheet:shown(document.querySelector('body > .print-sheet-output')),text:document.querySelector('body > .print-sheet-output').innerText};});
    assert(!visible.shell&&!visible.dialog&&visible.sheet,'Print media does not isolate the sheet');const pdf=await page.pdf({format:'A4',printBackground:false}),target=path.join(folder,'animal-sheet-'+label+'.pdf');await fs.writeFile(target,pdf);const pages=(pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g)||[]).length;assert(pdf.length>1000&&pages>=1,'PDF not rendered');
    await page.emulateMedia({media:'screen'});await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')));assert(await page.evaluate(()=>!document.querySelector('body > .print-sheet-output')&&!document.documentElement.classList.contains('printing-sheet')),'Print output not cleaned up');
    return{calls,text:visible.text,pdf:{bytes:pdf.length,sha256:hash(pdf),pages,file:path.relative(root,target)}};
  }
  try{
    result.sourceFiles=await sources();const first=await open();page=first.tab;
    await check('explicit-fixture-with-organization-print-details-logo-photo-health-weights-and-foster',async()=>{
      fixture=await page.evaluate(async([personal,note])=>{const r=window.RescueManager,s=r.services;await s.settings.create({name:'Protectora ficticia',language:'es',currencyCode:'EUR',dateFormat:'day_first',timeZone:'UTC'});await s.settings.update({printDetails:'Calle Ficticia 1\nCIF ficticio',printFooter:'Pie de impresión ficticio'});const snap=await s.context.snapshot(),option=kind=>snap.tables.catalogOptions.find(row=>row.kind===kind).id,location=snap.tables.locations[0].id,today=r.utils.dates.today('UTC');
        const png=async(color,name)=>{const canvas=document.createElement('canvas');canvas.width=120;canvas.height=90;const g=canvas.getContext('2d');g.fillStyle=color;g.fillRect(0,0,120,90);g.fillStyle='#fff';g.fillRect(20,20,40,30);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));return new File([blob],name,{type:'image/png'});};
        await s.photos.setOrganizationLogo(await png('#264','logo.png'));
        const foster=(await s.contacts.create({type:'person',name:personal[0],phones:[{label:'',original:personal[1]}],email:personal[2],roles:['foster'],notes:''})).result.id,vet=(await s.contacts.create({type:'organization',name:personal[3],phones:[],email:personal[4],roles:['veterinarian'],notes:''})).result.id;
        const animal=(await s.animals.registerEntry({animal:{name:'Luna ficticia',speciesId:option('species'),sizeId:option('size'),breed:'Mestiza',color:'Tricolor',description:'Descripción pública ficticia\ncon dos líneas',notes:note},date:today,entryReason:'Rescate ficticio',location:{kind:'shelter',id:location},availability:'available'})).result.animalId;
        await s.photos.set(animal,await png('#a63','luna.png'));await s.weights.record({animalId:animal,date:today,grams:4200});
        await s.health.record({animalId:animal,type:'vaccination',date:today,title:'Vacuna ficticia',veterinarianContactId:vet});
        const profile=(await s.fosters.createProfile({contactId:foster,totalCapacity:2,acceptedSpeciesIds:[option('species')],acceptedSizeIds:[option('size')],availability:'available'})).result.id;await s.fosters.assign({animalId:animal,fosterProfileId:profile,startDate:today});
        r.core.i18n.setLanguage('es');await r.core.app.render();return{animal,foster,vet};},[personal,note]);return{fixture,current:await observe()};
    });
    await check('preview-excludes-personal-data-and-internal-notes-by-default-without-writing',async()=>{
      const before=await observe();await openSheet();const text=await previewText();for(const value of['Luna ficticia','A-000001','Vacuna ficticia','Calle Ficticia 1','Pie de impresión ficticio','Descripción pública ficticia',await t('pr.personalExcluded'),await t('a.location.foster')])assert(text.includes(value),'Missing '+value);for(const value of[...personal,note])assert(!text.includes(value),'Leaked '+value);
      assert(await modal().locator('.print-preview img.print-sheet-photo').evaluate(node=>node.complete&&node.naturalWidth>0),'Photo not decoded');assert(await modal().locator('.print-preview img.print-sheet-logo').count()===1,'Logo missing');assert(!(await modal().locator('#print-personal').isChecked())&&!(await modal().locator('#print-notes').isChecked()),'Options preselected');same(before,await observe());return{before};
    });
    await check('explicit-options-add-personal-data-and-notes-to-the-preview-only',async()=>{
      const before=await observe();await modal().locator('#print-personal').check();let text=await previewText();for(const value of personal)assert(text.includes(value),'Missing personal '+value);assert(!text.includes(note)&&text.includes(await t('pr.personalIncluded')),'Notes or warning mismatch');await modal().locator('#print-notes').check();text=await previewText();assert(text.includes(note),'Internal note missing');same(before,await observe());return{before};
    });
    await check('print-with-personal-data-isolates-the-sheet-renders-a-paginated-pdf-and-cleans-up',async()=>{
      const before=await observe(),value=await printed('personal');for(const item of personal)assert(value.text.includes(item),'Printed output lacks '+item);same(before,await observe());return value;
    });
    await check('print-without-personal-data-keeps-it-out-of-the-printed-output',async()=>{
      const before=await observe();await modal().locator('#print-personal').uncheck();await modal().locator('#print-notes').uncheck();const value=await printed('excluded');for(const item of[...personal,note])assert(!value.text.includes(item),'Printed output leaked '+item);assert(value.text.includes('Vacuna ficticia'),'Printed output incomplete');same(before,await observe());await close();assert(await page.evaluate(()=>!document.querySelector('.print-sheet-output')&&!document.documentElement.classList.contains('printing-sheet')),'Closing left print state');return value;
    });
    await check('read-only-tab-can-still-preview-and-print-without-writing',async()=>{
      const before=await observe(),other=await first.session.context.newPage();await other.goto(pathToFileURL(path.join(root,'index.html')).href);await other.evaluate(()=>window.RescueManager.core.app.ready);await other.evaluate(()=>window.RescueManager.services.context.takeControl());await page.evaluate(async()=>{try{await window.RescueManager.services.context.renew();}catch(_){}});await page.evaluate(()=>window.RescueManager.core.app.render());
      assert(!(await page.evaluate(()=>window.RescueManager.services.context.status().canWrite)),'Tab still writes');await openSheet();assert(!(await modal().getByRole('button',{name:await t('ui.print'),exact:true}).isDisabled()),'Print disabled in read-only tab');const value=await printed('read-only');await close();same(before,await observe());await page.evaluate(()=>window.RescueManager.services.context.takeControl());await other.close();return{pdf:value.pdf};
    });
    await check('English-Spanish-three-widths-preview-does-not-overflow',async()=>{
      const before=await observe();for(const language of['en','es']){await page.locator('#language').selectOption(language);await openSheet();await modal().locator('#print-personal').check();for(const width of[360,768,1440]){await page.setViewportSize({width,height:1000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Page overflow');assert(await modal().evaluate(node=>node.scrollWidth<=node.clientWidth+1),'Dialog overflow');const target=path.join(folder,'animal-print-'+language+'-'+width+'.png');await page.screenshot({path:target});result.screenshots.push(path.relative(root,target));}await close();}await page.setViewportSize({width:1440,height:1050});same(before,await observe());return{languages:['en','es'],widths:[360,768,1440]};
    });
    const beforeClose=await observe();await check('complete-owned-close',()=>first.session.close());const reopened=await open();page=reopened.tab;
    await check('reopen-preserves-data-and-sheet-without-runtime-or-network-errors',async()=>{
      same(beforeClose,await observe());await openSheet();await close();assert(!result.pageErrors.length&&!result.consoleErrors.length&&!result.externalRequests.length,'Runtime/external errors');return{digest:beforeClose.digest};
    });
    await check('complete-reopened-close',()=>reopened.session.close());await check('source-files-unchanged',async()=>{assert(JSON.stringify(result.sourceFiles)===JSON.stringify(await sources()),'Runtime source changed');return{count:result.sourceFiles.length};});result.completed=true;
  }catch(error){result.fatalError={name:error.name,message:error.message,stack:error.stack};}
  finally{for(const session of sessions)try{await session.close();}catch(error){result.cleanupErrors=[...(result.cleanupErrors||[]),String(error)];}result.completedAt=new Date().toISOString();result.status=result.fatalError||result.cleanupErrors||!result.completed?'failed':'passed';await persist();console.log(result.status.toUpperCase());if(result.status!=='passed')process.exitCode=1;}
})().catch(error=>{console.error(error);process.exitCode=1;});
