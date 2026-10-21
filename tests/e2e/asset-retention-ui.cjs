/* Developer-only acceptance of reviewed removal of unused embedded files. Real file://, offline persistent profile, no runtime mocks. */
'use strict';
const fs = require('node:fs/promises'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto');
const { pathToFileURL } = require('node:url'), { launch } = require('./chromium.cjs');
const root = path.resolve(__dirname, '../..'), options = { browser: 'chrome', output: 'asset-retention-ui-chrome.json', machine: 'unspecified' };
for (let index = 2; index < process.argv.length; index += 2) { const key = process.argv[index].replace(/^--/, '');
  if (!['browser', 'output', 'machine', 'executable'].includes(key) || !process.argv[index + 1]) throw new Error('Use --browser --output --machine --executable'); options[key] = process.argv[index + 1]; }
if (!['chrome', 'edge'].includes(options.browser) || !/^[a-zA-Z0-9._-]+\.json$/.test(options.output)) throw new Error('Invalid browser or output');
const output = path.join(root, 'tests/results', options.output), hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const result = { format: 'rescue-manager-asset-retention-ui-test', version: 1, browser: options.browser, machine: options.machine, startedAt: new Date().toISOString(),
  operatingSystem: { type: os.type(), release: os.release(), version: os.version() }, checks: [], launches: [], closures: [], screenshots: [], pageErrors: [], consoleErrors: [], externalRequests: [],
  limitations: ['Organization, animal, photographs, logos and documents are prepared through real production services, explicitly identified as test fixture preparation; canvas PNG files are synthetic.',
    'Review, inspection, backup download/verification, selection, cancellation and removal use the visible UI; storage-level guard probes call the real IndexedDB primitive directly and are identified as such.',
    'Cancellation aborts a real IndexedDB transaction after a real delete request; this does not simulate physical disk failure or real quota exhaustion.',
    'Viewport emulation is not a physical mobile/tablet test.', 'No business service is mocked.', 'Page request trace excludes browser-internal traffic.'] };
const assert = (condition, message) => { if (!condition) throw new Error(message); };
async function sources() { const html = path.join(root, 'index.html'), source = await fs.readFile(html, 'utf8'), files = new Set([html, ...Array.from(source.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"]+)"/g), match => path.resolve(root, match[1]))]);
  for (const file of files) if (file.endsWith('.css')) for (const match of (await fs.readFile(file, 'utf8')).matchAll(/@import\s+(?:url\()?['"]([^'"]+)['"]/g)) files.add(path.resolve(path.dirname(file), match[1]));
  return Promise.all([...files].map(async file => ({ file: path.relative(root, file).replaceAll('\\', '/'), sha256: hash(await fs.readFile(file)) }))); }
async function persist() { await fs.writeFile(output, JSON.stringify(result, null, 2) + '\n'); }
async function check(id, operation) { try { result.checks.push({ id, passed: true, evidence: await operation() }); console.log('PASS ' + id); }
  catch (error) { result.checks.push({ id, passed: false, error: { name: error.name, message: error.message, stack: error.stack } }); console.log('FAIL ' + id + ': ' + error.message); throw error; } finally { await persist(); } }
(async()=>{
  try{await fs.access(output);throw new Error('Evidence exists');}catch(error){if(error.code!=='ENOENT')throw error;}
  const folder=path.join(root,'.tmp','asset-retention-'+options.browser+'-'+Date.now()),profile=path.join(folder,'profile'),sessions=[];
  let page,fixture;
  const t=(key,values)=>page.evaluate(([key,values])=>window.RescueManager.core.i18n.t(key,values),[key,values]),modal=()=>page.locator('dialog[open]').last();
  const click=async(key,scope=page)=>scope.getByRole('button',{name:await t(key),exact:true}).click();
  async function open(){const session=await launch(options.browser,profile,result,false,{executable:options.executable});sessions.push(session);const tab=await session.context.newPage();tab.setDefaultTimeout(12000);await tab.setViewportSize({width:1440,height:1050});
    tab.on('pageerror',error=>result.pageErrors.push(String(error)));tab.on('console',message=>{if(message.type()==='error')result.consoleErrors.push(message.text());});tab.on('request',request=>{if(/^https?:/i.test(request.url()))result.externalRequests.push(request.url());});
    await tab.goto(pathToFileURL(path.join(root,'index.html')).href);await tab.evaluate(()=>window.RescueManager.core.app.ready);return{session,tab};}
  async function observe(){const value=await page.evaluate(async()=>{const r=window.RescueManager,s=await r.services.context.snapshot({fresh:true}),tables={};for(const[name,rows]of Object.entries(s.tables)){tables[name]=[];for(const row of [...rows].sort((a,b)=>a.id.localeCompare(b.id))){const copy={...row};delete copy.datasetId;if(name==='assets'){copy.blobHash=await r.utils.integrity.sha256(copy.blob);delete copy.blob;}tables[name].push(copy);}}return{datasetId:s.datasetId,revision:s.globalRevision,dataRevision:s.dataRevision,counts:Object.fromEntries(Object.entries(tables).map(([name,rows])=>[name,rows.length])),digest:await r.utils.integrity.sha256(r.utils.canonicalJson.stringify(tables)),tables};});Object.defineProperty(value,'tables',{enumerable:false});return value;}
  const same=(before,after)=>assert(JSON.stringify(before)===JSON.stringify(after),'Data changed unexpectedly');
  function sameTables(before,after,excluded){for(const[name,rows]of Object.entries(before.tables))if(!excluded.includes(name))assert(JSON.stringify(rows)===JSON.stringify(after.tables[name]),name+' changed unexpectedly');}
  async function nav(){await page.evaluate(()=>{location.hash='retention';});await page.getByRole('heading',{name:await t('nav.retention'),level:1,exact:true}).waitFor();}
  async function review(){await page.locator('button[data-asset-review]').click();await modal().getByRole('heading',{name:await t('ra.review'),exact:true}).waitFor();}
  async function save(double=false){const handle=await modal().elementHandle();if(double)await modal().getByRole('button',{name:await t('common.save'),exact:true}).evaluate(button=>{button.click();button.click();});else await click('common.save',modal());try{await handle.waitForElementState('hidden');}catch(error){error.message+='\n'+await modal().innerText();throw error;}finally{await handle.dispose();}}
  async function cancel(){if(await modal().getAttribute('data-dirty')==='true')page.once('dialog',dialog=>dialog.accept());await click('common.cancel',modal());await page.waitForFunction(()=>!document.querySelector('dialog[open]'));}
  async function copy(label){const name=await t('rt.downloadCurrent'),[download]=await Promise.all([page.waitForEvent('download'),modal().getByRole('button',{name,exact:true}).click()]);const file=path.join(folder,label+'.json');await download.saveAs(file);await modal().getByLabel(await t('rt.verifyCurrent'),{exact:true}).setInputFiles(file);await modal().getByText(await t('ui.backupVerified'),{exact:true}).waitFor();return file;}
  async function confirm(){await modal().locator('[name=copyConfirmed]').check();await modal().locator('[name=confirmed]').check();}
  const box=key=>modal().locator('input[data-group-key="'+key+'"]');
  async function analysis(){return page.evaluate(async()=>{const r=window.RescueManager,s=await r.services.context.snapshot({fresh:true}),value=r.domain.assetReferences.analyze(s.tables);return{groups:value.groups.map(group=>({key:group.key,assetIds:group.assetIds,bytes:group.bytes})),kept:value.kept,totalCount:value.totalCount,unusedCount:value.unusedCount};});}
  async function probe(mode){return page.evaluate(async mode=>{const r=window.RescueManager,s=await r.services.context.snapshot({fresh:true}),rows=new Map(s.tables.assets.map(row=>[row.id,row])),animal=s.tables.animals[0];const ids=mode==='referenced'?[animal.photoAssetId,animal.thumbnailAssetId]:mode==='trash'?[s.tables.documents.find(row=>row.deletedAt).assetId]:[[...rows.values()].find(row=>row.type==='photo'&&row.id!==animal.photoAssetId).id];const signatures=Object.fromEntries(ids.map(id=>[id,r.domain.assetReferences.signature(rows.get(id))]));try{await r.storage.assetRetention.remove({assetIds:ids,signatures,dataRevision:s.dataRevision,today:r.utils.dates.today('UTC')},{...r.services.context.options(s),operationId:r.utils.ids.uuidV4(),fingerprint:'probe-'+r.utils.ids.uuidV4()});return{error:null};}catch(e){return{error:e.name,message:e.message};}},mode);}
  try{
    result.sourceFiles=await sources();const first=await open();page=first.tab;
    await check('explicit-fixture-with-replaced-photo-and-logo-current-and-trashed-documents',async()=>{
      fixture=await page.evaluate(async()=>{const r=window.RescueManager,s=r.services;await s.settings.create({name:'Archivos ficticios',language:'es',currencyCode:'EUR',dateFormat:'day_first',timeZone:'UTC'});const snap=await s.context.snapshot({fresh:true}),species=snap.tables.catalogOptions.find(row=>row.kind==='species').id,typeId=snap.tables.catalogOptions.find(row=>row.kind==='document_type').id,location=snap.tables.locations[0].id,today=r.utils.dates.today('UTC');
        const png=async(color,name)=>{const canvas=document.createElement('canvas');canvas.width=96;canvas.height=64;const g=canvas.getContext('2d');g.fillStyle=color;g.fillRect(0,0,96,64);g.fillStyle='#fff';g.fillRect(10,10,30,20);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));return new File([blob],name,{type:'image/png'});};
        const animal=(await s.animals.registerEntry({animal:{name:'Animal ficticio con fotos',speciesId:species},date:today,entryReason:'Entrada',location:{kind:'shelter',id:location},availability:'available'})).result.animalId;
        const oldPhoto=(await s.photos.set(animal,await png('#b33','foto-antigua.png'))).result,currentPhoto=(await s.photos.set(animal,await png('#3a5','foto-actual.png'))).result;
        const oldLogo=(await s.photos.setOrganizationLogo(await png('#34c','logo-antiguo.png'))).result,logo=(await s.photos.setOrganizationLogo(await png('#ca3','logo-actual.png'))).result;
        const kept=(await s.documents.createEmbedded({title:'Documento vigente ficticio',typeId,date:today,links:[{entityType:'animal',entityId:animal}]},new File(['Documento vigente: ñ.'],'vigente.txt',{type:'text/plain'}))).result;
        const trashed=(await s.documents.createEmbedded({title:'Documento en papelera ficticio',typeId,date:today,links:[{entityType:'animal',entityId:animal}]},new File(['Documento en papelera: ñ.'],'papelera.txt',{type:'text/plain'}))).result;await s.documents.trash(trashed.id);
        r.core.i18n.setLanguage('es');await r.core.app.render();return{animal,oldPhoto,currentPhoto,oldLogo:oldLogo.logoAssetId,logo:logo.logoAssetId,keptAsset:kept.assetId,trashedAsset:trashed.assetId};});
      const value=await analysis(),photoKey=[fixture.oldPhoto.photoAssetId,fixture.oldPhoto.thumbnailAssetId].sort().join('+');
      assert(value.totalCount===8&&value.unusedCount===3&&value.groups.length===2,'Unexpected candidate count');assert(value.groups.some(group=>group.key===photoKey)&&value.groups.some(group=>group.key===fixture.oldLogo),'Expected groups missing');assert(value.kept.current.count===4&&value.kept.inactive.count===1,'Kept reasons mismatch');
      fixture.photoKey=photoKey;fixture.logoKey=fixture.oldLogo;return{fixture,analysis:value,current:await observe()};
    });
    await check('review-dialog-lists-closed-groups-and-kept-reasons-without-writing',async()=>{
      await nav();const before=await observe();await review();const text=await modal().innerText();for(const name of['foto-antigua-','logo-antiguo-'])assert(text.includes(name),'Candidate '+name+' missing');for(const name of['foto-actual-','logo-actual-','vigente.txt','papelera.txt'])assert(!text.includes(name),'Referenced '+name+' offered');
      for(const reason of['current','inactive'])assert(text.includes(await t('ra.kept.'+reason)),'Kept reason missing');assert(await box(fixture.photoKey).count()===1&&await box(fixture.logoKey).count()===1,'Group checkboxes missing');assert(!(await box(fixture.photoKey).isChecked()),'Group preselected');same(before,await observe());await cancel();return{before};
    });
    await check('inspection-download-and-image-preview-match-stored-bytes-without-writing',async()=>{
      const before=await observe();await review();const group=modal().locator('fieldset').filter({has:page.locator('input[data-group-key="'+fixture.photoKey+'"]')}),item=group.locator('li').filter({hasText:fixture.oldPhoto.thumbnailAssetId});const label=await t('ra.download'),[download]=await Promise.all([page.waitForEvent('download'),item.getByRole('button',{name:label,exact:true}).click()]);const target=path.join(folder,'inspected-thumbnail.webp');await download.saveAs(target);
      const stored=before.tables.assets.find(row=>row.id===fixture.oldPhoto.thumbnailAssetId);assert(hash(await fs.readFile(target))===stored.sha256,'Downloaded inspection bytes differ');await group.locator('li').filter({hasText:fixture.oldPhoto.photoAssetId}).getByRole('button',{name:await t('ra.preview'),exact:true}).click();const image=modal().locator('img.asset-preview');await image.waitFor();assert(await image.evaluate(node=>node.complete&&node.naturalWidth>0),'Preview not decoded');
      same(before,await observe());await cancel();return{downloadSha256:stored.sha256,preview:true};
    });
    await check('English-Spanish-independent-zero-one-many-group-and-file-counts',async()=>{
      const before=await observe(),cases=[];
      for(const language of ['en','es']){
        await page.locator('#language').selectOption(language);await page.getByRole('heading',{name:await t('nav.retention'),level:1,exact:true}).waitFor();await review();
        const selected=modal().getByText(language==='en'?/^Selected:/ : /^Seleccionados:/),expected=language==='en'?['0 groups, 0 files','1 group, 1 file','2 groups, 3 files','1 group, 2 files']:['0 grupos, 0 archivos','1 grupo, 1 archivo','2 grupos, 3 archivos','1 grupo, 2 archivos'];
        await click('ra.selectNone',modal());
        const checkCount=async index=>{const text=await selected.innerText();assert(text.includes(expected[index]),'Independent plural count: '+text);cases.push({language,text});};
        await checkCount(0);await box(fixture.logoKey).check();await checkCount(1);await box(fixture.photoKey).check();await checkCount(2);await box(fixture.logoKey).uncheck();await checkCount(3);
        const legends=(await modal().locator('legend').allTextContents()).join('\n');assert(language==='en'?/\b1 file\b/.test(legends)&&/\b2 files\b/.test(legends):/\b1 archivo\b/.test(legends)&&/\b2 archivos\b/.test(legends),'File group singular/plural missing');
        assert(!/\(s\)/.test(await modal().innerText()),'Parenthesized plural remains');await cancel();
      }
      same(before,await observe());return{cases,businessUnchanged:true};
    });
    await check('English-Spanish-three-widths-review-is-read-only-and-does-not-overflow',async()=>{
      const before=await observe();for(const language of['en','es']){await page.locator('#language').selectOption(language);await page.getByRole('heading',{name:await t('nav.retention'),level:1,exact:true}).waitFor();await review();for(const width of[360,768,1440]){await page.setViewportSize({width,height:1000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Storage page overflow');assert(await modal().evaluate(node=>node.scrollWidth<=node.clientWidth+1),'Dialog overflow');const target=path.join(folder,'asset-retention-'+language+'-'+width+'.png');await page.screenshot({path:target});result.screenshots.push(path.relative(root,target));}await cancel();}await page.setViewportSize({width:1440,height:1050});same(before,await observe());return{languages:['en','es'],widths:[360,768,1440]};
    });
    await check('selection-confirmation-and-verified-current-copy-are-all-required',async()=>{
      const before=await observe();await review();await confirm();await click('common.save',modal());await modal().getByText(await t('ra.selectGroup'),{exact:true}).waitFor();await box(fixture.photoKey).check();await click('common.save',modal());await modal().getByText(await t('ra.copyRequired'),{exact:true}).waitFor();same(before,await observe());
      await modal().getByRole('button',{name:await t('rt.downloadCurrent'),exact:true}).waitFor();fixture.copyBefore=await copy('current-before-file-removal');assert(await box(fixture.photoKey).isChecked(),'Selection lost after verification');await cancel();return{before,copyHash:hash(await fs.readFile(fixture.copyBefore))};
    });
    await check('storage-refuses-referenced-file-and-partial-group-even-at-current-revision',async()=>{
      const before=await observe(),referenced=await probe('referenced'),orphan=await probe('orphan'),trash=await probe('trash');
      assert(referenced.error==='RevisionConflictError'&&trash.error==='RevisionConflictError','Referenced file accepted');assert(orphan.error==='InvalidInputError','Partial group accepted');same(before,await observe());return{referenced,trash,orphan};
    });
    await check('a-concurrent-active-write-invalidates-the-open-review-and-is-preserved',async()=>{
      await review();await box(fixture.photoKey).check();await confirm();const person=await page.evaluate(async()=>(await window.RescueManager.services.contacts.create({type:'person',name:'Trabajo concurrente ficticio',roles:[],phones:[],notes:''})).result.id),before=await observe();await click('common.save',modal());await modal().getByText(await t('errors.revisionConflict'),{exact:true}).waitFor();const after=await observe();same(before,after);assert(after.tables.contacts.some(row=>row.id===person),'Concurrent work lost');await cancel();return{person};
    });
    await check('lost-writer-control-rejects-removal-with-files-preserved',async()=>{
      await review();await copy('current-after-concurrent-write');await box(fixture.photoKey).check();await confirm();const before=await observe(),other=await first.session.context.newPage();await other.goto(pathToFileURL(path.join(root,'index.html')).href);await other.evaluate(()=>window.RescueManager.core.app.ready);await other.evaluate(()=>window.RescueManager.services.context.takeControl());await page.evaluate(async()=>{try{await window.RescueManager.services.context.renew();}catch(_){}});
      await click('common.save',modal());await modal().getByText(await t('errors.leaseLost'),{exact:true}).waitFor();same(before,await observe());await page.evaluate(()=>window.RescueManager.services.context.takeControl());await other.close();return{before};
    });
    await check('visible-cancel-button-aborts-before-completion-and-keeps-decisions',async()=>{
      const before=await observe();await modal().evaluate(node=>{const r=window.RescueManager;node.querySelector('button[type=submit]').click();Array.from(node.querySelectorAll('button')).find(button=>button.textContent===r.core.i18n.t('rt.cancelRemoval')).click();});await modal().getByText(await t('errors.aborted'),{exact:true}).waitFor();assert(await modal().locator('[name=confirmed]').isChecked()&&await box(fixture.photoKey).isChecked(),'Cancellation lost decisions');same(before,await observe());await cancel();return{before,action:'Synchronous DOM clicks cancel before deletion begins; next check cancels after a real delete request.'};
    });
    await check('cooperative-cancellation-after-a-real-delete-rolls-back-every-file-and-record',async()=>{
      const before=await observe(),proof=await page.evaluate(async key=>{const r=window.RescueManager,report=await r.services.assetRetention.preview(),controller=new AbortController();let progress=0;try{await r.services.assetRetention.apply(report,{groups:[key],confirmed:true,copyConfirmed:true,signal:controller.signal,onProgress:value=>{progress=value.completed;controller.abort();}});}catch(e){return{error:e.name,progress};}return{error:null,progress};},fixture.photoKey);assert(proof.error==='AbortError'&&proof.progress>0,'Cancellation after delete not reached');same(before,await observe());return{proof};
    });
    await check('UI-removes-only-the-selected-group-in-one-commit-and-preserves-other-bytes',async()=>{
      await nav();const before=await observe();await review();await box(fixture.photoKey).check();await confirm();await save(true);const after=await observe(),removed=[fixture.oldPhoto.photoAssetId,fixture.oldPhoto.thumbnailAssetId];
      assert(removed.every(id=>!after.tables.assets.some(row=>row.id===id)),'Selected files remain');assert(JSON.stringify(before.tables.assets.filter(row=>!removed.includes(row.id)))===JSON.stringify(after.tables.assets),'Other files changed');sameTables(before,after,['assets','activityLog']);assert(after.revision===before.revision+1&&after.counts.activityLog===before.counts.activityLog+1,'Removal not one atomic commit');
      const log=after.tables.activityLog.find(row=>row.summaryParameters.code==='retention.deleteAssets');assert(log&&log.summaryParameters.count===2&&log.target===null,'Maintenance activity missing');const value=await analysis();assert(value.groups.length===1&&value.groups[0].key===fixture.logoKey,'Remaining candidates mismatch');fixture.removalOperation=log.operationId;return{before,after,log};
    });
    await check('storage-replay-returns-the-saved-receipt-without-repeating-removal',async()=>{
      const before=await observe(),receipt=await page.evaluate(async id=>{const r=window.RescueManager,s=await r.services.context.snapshot({fresh:true}),operation=await r.storage.transactions.run(['operations'],'readonly',(tx,api)=>api.request(tx.objectStore('operations').get([s.datasetId,id]),row=>api.setResult(row)));return r.storage.assetRetention.remove({assetIds:operation.result.assetIds,signatures:{},dataRevision:s.dataRevision-1,today:r.utils.dates.today('UTC')},{...r.services.context.options(s),expectedRevision:s.globalRevision-1,operationId:operation.id,fingerprint:operation.fingerprint});},fixture.removalOperation);assert(receipt.duplicate&&receipt.result.count===2,'Replay missed');same(before,await observe());return receipt;
    });
    await check('external-copy-verified-before-removal-still-contains-removed-file-bytes',async()=>{
      const content=await fs.readFile(fixture.copyBefore,'utf8'),found=await page.evaluate(async([text,ids])=>{const r=window.RescueManager,decoded=await r.services.backupCodec.decode(new File([text],'copy.json',{type:'application/json'})),rows=decoded.tables.assets.filter(row=>ids.includes(row.id));return Promise.all(rows.map(async row=>({id:row.id,sha256:row.sha256,actual:await r.utils.integrity.sha256(row.blob)})));},[content,[fixture.oldPhoto.photoAssetId,fixture.oldPhoto.thumbnailAssetId]]);assert(found.length===2&&found.every(row=>row.sha256===row.actual),'External copy lost removed bytes');return{found};
    });
    await check('another-removal-needs-a-new-copy-then-select-all-removes-the-old-logo',async()=>{
      const before=await observe();await review();await click('ra.selectAll',modal());await confirm();await click('common.save',modal());await modal().getByText(await t('ra.copyRequired'),{exact:true}).waitFor();same(before,await observe());await copy('current-before-logo-removal');await save();const after=await observe();assert(!after.tables.assets.some(row=>row.id===fixture.oldLogo)&&after.tables.organizationSettings[0].logoAssetId===fixture.logo,'Logo removal mismatch');sameTables(before,after,['assets','activityLog']);assert(after.counts.assets===5,'Unexpected remaining file count');return{before,after};
    });
    await check('empty-review-offers-no-removal-and-reports-kept-files',async()=>{
      const before=await observe();await review();await modal().getByText(await t('ra.empty'),{exact:true}).waitFor();assert(await modal().locator('button[type=submit]').isDisabled(),'Empty review can save');same(before,await observe());await cancel();return{before};
    });
    const beforeClose=await observe();await check('complete-owned-close',()=>first.session.close());const reopened=await open();page=reopened.tab;
    await check('reopen-preserves-remaining-files-and-removals-without-runtime-or-network-errors',async()=>{
      same(beforeClose,await observe());await nav();await review();await modal().getByText(await t('ra.empty'),{exact:true}).waitFor();await cancel();assert(!result.pageErrors.length&&!result.consoleErrors.length&&!result.externalRequests.length,'Runtime/external errors');return{digest:beforeClose.digest};
    });
    await check('complete-reopened-close',()=>reopened.session.close());await check('source-files-unchanged',async()=>{assert(JSON.stringify(result.sourceFiles)===JSON.stringify(await sources()),'Runtime source changed');return{count:result.sourceFiles.length};});result.completed=true;
  }catch(error){result.fatalError={name:error.name,message:error.message,stack:error.stack};}
  finally{for(const session of sessions)try{await session.close();}catch(error){result.cleanupErrors=[...(result.cleanupErrors||[]),String(error)];}result.completedAt=new Date().toISOString();result.status=result.fatalError||result.cleanupErrors||!result.completed?'failed':'passed';await persist();console.log(result.status.toUpperCase());if(result.status!=='passed')process.exitCode=1;}
})().catch(error=>{console.error(error);process.exitCode=1;});
