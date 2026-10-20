/* Developer-only volume, latency and memory measurement in a real browser. Real file://, offline persistent profile, no runtime mocks.
   Timings are recorded as evidence of the current O(N) design; only functional correctness is asserted. */
'use strict';
const fs = require('node:fs/promises'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto');
const { pathToFileURL } = require('node:url'), { launch } = require('./chromium.cjs');
const root = path.resolve(__dirname, '../..'), options = { browser: 'chrome', output: 'volume-ui-chrome.json', machine: 'unspecified', steps: '0,5000,10000,20000' };
for (let index = 2; index < process.argv.length; index += 2) { const key = process.argv[index].replace(/^--/, '');
  if (!['browser', 'output', 'machine', 'executable', 'steps'].includes(key) || !process.argv[index + 1]) throw new Error('Use --browser --output --machine --executable --steps'); options[key] = process.argv[index + 1]; }
if (!['chrome', 'edge'].includes(options.browser) || !/^[a-zA-Z0-9._-]+\.json$/.test(options.output)) throw new Error('Invalid browser or output');
const steps = options.steps.split(',').map(Number); if (!steps.every((value, index) => Number.isSafeInteger(value) && value >= 0 && (!index || value > steps[index - 1]))) throw new Error('Invalid steps');
const output = path.join(root, 'tests/results', options.output), hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const result = { format: 'rescue-manager-volume-ui-test', version: 1, browser: options.browser, machine: options.machine, startedAt: new Date().toISOString(), steps,
  operatingSystem: { type: os.type(), release: os.release(), version: os.version(), cpus: os.cpus().length, cpuModel: os.cpus()[0]?.model, totalMemoryBytes: os.totalmem() },
  checks: [], measurements: [], launches: [], closures: [], pageErrors: [], consoleErrors: [], externalRequests: [],
  limitations: ['Synthetic contacts are inserted in explicit 1000-row fixture commits through the real context and repository path; they are not a realistic organization mix.',
    'Heap figures come from performance.memory (Chromium only, coarse) after a forced task boundary, not from a profiler; no garbage collection is forced.',
    'Timings depend on this machine and its load; they are evidence of order of growth, not guaranteed limits on other devices.',
    'Embedded files are synthetic 8 MiB text files; they do not represent image decoding cost.', 'No business service is mocked.'] };
const assert = (condition, message) => { if (!condition) throw new Error(message); };
async function sources() { const html = path.join(root, 'index.html'), source = await fs.readFile(html, 'utf8'), files = new Set([html, ...Array.from(source.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"]+)"/g), match => path.resolve(root, match[1]))]);
  return Promise.all([...files].map(async file => ({ file: path.relative(root, file).replaceAll('\\', '/'), sha256: hash(await fs.readFile(file)) }))); }
async function persist() { await fs.writeFile(output, JSON.stringify(result, null, 2) + '\n'); }
async function check(id, operation) { try { result.checks.push({ id, passed: true, evidence: await operation() }); console.log('PASS ' + id); }
  catch (error) { result.checks.push({ id, passed: false, error: { name: error.name, message: error.message, stack: error.stack } }); console.log('FAIL ' + id + ': ' + error.message); throw error; } finally { await persist(); } }
(async()=>{
  try{await fs.access(output);throw new Error('Evidence exists');}catch(error){if(error.code!=='ENOENT')throw error;}
  const folder=path.join(root,'.tmp','volume-'+options.browser+'-'+Date.now()),profile=path.join(folder,'profile'),sessions=[];let page;
  async function open(){const session=await launch(options.browser,profile,result,false,{executable:options.executable});sessions.push(session);const tab=await session.context.newPage();tab.setDefaultTimeout(600000);await tab.setViewportSize({width:1440,height:1050});
    tab.on('pageerror',error=>result.pageErrors.push(String(error)));tab.on('console',message=>{if(message.type()==='error')result.consoleErrors.push(message.text());});tab.on('request',request=>{if(/^https?:/i.test(request.url()))result.externalRequests.push(request.url());});
    await tab.goto(pathToFileURL(path.join(root,'index.html')).href);await tab.evaluate(()=>window.RescueManager.core.app.ready);return{session,tab};}
  // One measured sample: every timing is wall-clock in the page, heap after the step.
  const measure=label=>page.evaluate(async label=>{const r=window.RescueManager,s=r.services,time=async work=>{const start=performance.now();const value=await work();return{ms:Math.round(performance.now()-start),value};};
    const snap=await time(()=>s.context.snapshot()),records=Object.values(snap.value.tables).reduce((sum,rows)=>sum+rows.length,0),assetBytes=snap.value.tables.assets.reduce((sum,row)=>sum+row.byteLength,0);
    const validate=await time(()=>{r.domain.validateDataset(snap.value.tables,{datasetId:snap.value.datasetId,throwOnError:true});return true;});
    const write=await time(()=>s.contacts.create({type:'person',name:'Medición '+label+' '+records,roles:[],phones:[],notes:''}));
    const assets=await time(()=>r.domain.assetReferences.analyze(snap.value.tables));
    const render=await time(async()=>{location.hash='contacts';await new Promise(resolve=>setTimeout(resolve,0));await r.core.app.render();return document.querySelectorAll('main tbody tr, main .card').length;});
    await new Promise(resolve=>setTimeout(resolve,50));const heap=performance.memory?{used:performance.memory.usedJSHeapSize,total:performance.memory.totalJSHeapSize,limit:performance.memory.jsHeapSizeLimit}:null;
    return{label,records,assetBytes,snapshotMs:snap.ms,validateMs:validate.ms,singleWriteMs:write.ms,assetAnalysisMs:assets.ms,contactsRenderMs:render.ms,heap};},label);
  try{
    result.sourceFiles=await sources();const first=await open();page=first.tab;
    await check('organization-created-through-real-services',async()=>page.evaluate(async()=>{await window.RescueManager.services.settings.create({name:'Volumen ficticio',language:'es',currencyCode:'EUR',dateFormat:'day_first',timeZone:'UTC'});return true;}));
    let inserted=0;
    for(const target of steps){
      await check('grow-to-'+target+'-synthetic-contacts-in-1000-row-commits',async()=>{const timings=[];while(inserted<target){const count=Math.min(1000,target-inserted);timings.push(await page.evaluate(async([count,offset])=>{const s=window.RescueManager.services,start=performance.now();await s.context.execute('test.volume.contacts',{count,offset},(data,h)=>({changes:Array.from({length:count},(_,i)=>h.insert('contacts',h.create('contacts',{name:'Contacto de volumen '+(offset+i),email:'volumen'+(offset+i)+'@example.test',notes:'Línea 1\nLínea 2 con ñ'}))),result:{count}}));return Math.round(performance.now()-start);},[count,inserted]));inserted+=count;}return{inserted,batchMs:timings};});
      await check('measure-at-'+target+'-contacts',async()=>{const value=await measure('contacts-'+target);result.measurements.push(value);assert(value.records>=target,'Records missing');return value;});
    }
    await check('add-four-8-MiB-embedded-files-and-measure',async()=>{const timings=await page.evaluate(async()=>{const r=window.RescueManager,s=r.services,snap=await s.context.snapshot(),typeId=snap.tables.catalogOptions.find(row=>row.kind==='document_type').id,today=r.utils.dates.today('UTC'),out=[];for(let i=0;i<4;i++){const text='Volumen '+i+' '+'x'.repeat(8*1024*1024-12);const start=performance.now();await s.documents.createEmbedded({title:'Archivo de volumen '+i,typeId,date:today,links:[]},new File([text.slice(0,8*1024*1024)],'volumen-'+i+'.txt',{type:'text/plain'}));out.push(Math.round(performance.now()-start));}return out;});const value=await measure('files-32MiB');result.measurements.push(value);assert(value.assetBytes>=32*1024*1024-64,'Files missing');return{documentWriteMs:timings,...value};});
    await check('full-backup-create-download-reselect-verify-at-maximum-measured-size',async()=>{const start=Date.now(),created=await page.evaluate(async()=>{const r=window.RescueManager,t0=performance.now(),copy=await r.services.backup.create(),encodeMs=Math.round(performance.now()-t0);window.__volumeBlob=copy.blob;return{encodeMs,bytes:copy.blob.size,heap:performance.memory?performance.memory.usedJSHeapSize:null};});
      const verified=await page.evaluate(async()=>{const r=window.RescueManager,t0=performance.now(),value=await r.services.backup.verify(new File([window.__volumeBlob],'volume.json',{type:'application/json'}));delete window.__volumeBlob;return{verifyMs:Math.round(performance.now()-t0),records:Object.values(value.tables).reduce((sum,rows)=>sum+rows.length,0),heap:performance.memory?performance.memory.usedJSHeapSize:null};});
      assert(created.bytes<128*1024*1024,'Backup exceeds the format limit');assert(verified.records>=steps[steps.length-1],'Verified copy lost records');const value={...created,...verified,wallMs:Date.now()-start};result.measurements.push({label:'backup',...value});return value;});
    const before=await page.evaluate(async()=>{const r=window.RescueManager,s=await r.services.context.snapshot();return{revision:s.globalRevision,records:Object.values(s.tables).reduce((sum,rows)=>sum+rows.length,0)};});
    await check('complete-owned-close',()=>first.session.close());const reopened=await open();page=reopened.tab;
    await check('reopen-at-volume-measures-first-load-and-preserves-revision',async()=>{const value=await page.evaluate(async()=>{const r=window.RescueManager,t0=performance.now(),s=await r.services.context.snapshot();return{firstSnapshotMs:Math.round(performance.now()-t0),revision:s.globalRevision,records:Object.values(s.tables).reduce((sum,rows)=>sum+rows.length,0)};});assert(value.revision===before.revision&&value.records===before.records,'Reopen mismatch');assert(!result.pageErrors.length&&!result.consoleErrors.length&&!result.externalRequests.length,'Runtime/external errors');result.measurements.push({label:'reopen',...value});return value;});
    await check('complete-reopened-close',()=>reopened.session.close());await check('source-files-unchanged',async()=>{assert(JSON.stringify(result.sourceFiles)===JSON.stringify(await sources()),'Runtime source changed');return{count:result.sourceFiles.length};});result.completed=true;
  }catch(error){result.fatalError={name:error.name,message:error.message,stack:error.stack};}
  finally{for(const session of sessions)try{await session.close();}catch(error){result.cleanupErrors=[...(result.cleanupErrors||[]),String(error)];}result.completedAt=new Date().toISOString();result.status=result.fatalError||result.cleanupErrors||!result.completed?'failed':'passed';await persist();console.log(result.status.toUpperCase());if(result.status!=='passed')process.exitCode=1;}
})().catch(error=>{console.error(error);process.exitCode=1;});
