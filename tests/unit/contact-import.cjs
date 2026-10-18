'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {harness}=require('./support/service-harness.cjs');
function setup(){const h=harness({datasetId:'91000000-0000-4000-8000-000000000001',today:'2026-10-18',catalogKinds:[],services:['contacts']});for(const name of['config','utils/integrity','../vendor/papaparse/papaparse.min','storage/database','services/import-parser','services/import-contacts','services/import-batches','services/contact-import'])h.load(name);return h;}
async function parse(h,text,opts){return h.root.services.importParser.csv(new File([text],'contacts.csv',{type:'text/csv'}),opts);}
async function preview(h,file,decisions={},extra={}){const snapshot={...await h.root.services.context.snapshot(),dataRevision:h.revision};return h.root.services.contactImport.preview(snapshot,file,h.root.services.importContacts.mapping(file.headers),{batchId:h.id(),now:'2026-10-18T12:10:00.000Z',...extra},decisions);}
test('parser keeps identifiers, UTF-8/BOM, quoted delimiters and newlines as text with an exact source hash',async()=>{
 const h=setup(),p=await parse(h,'\ufeffexternal_id;name;phones;notes\r\n00007;José;+34 600-001-020;"Texto; con ""comillas""\ny ñ"');
 assert.equal(p.rows[0].cells[0],'00007');assert.equal(p.rows[0].cells[2],'+34 600-001-020');assert.equal(p.rows[0].cells[3],'Texto; con "comillas"\ny ñ');assert.match(p.sha256,/^[a-f0-9]{64}$/);assert.equal(p.delimiter,';');assert.equal(p.errors.length,0);
 const one=await parse(h,'name\nNombre\n');assert.equal(one.rows.length,1);assert.equal(one.errors.length,0);
 const legacy=await h.root.services.importParser.csv(new File([new Uint8Array([110,97,109,101,10,74,111,115,233])],'legacy.csv'),{encoding:'windows-1252',delimiter:','});assert.equal(legacy.rows[0].cells[0],'José');
 await assert.rejects(h.root.services.importParser.csv(new File([new Uint8Array([110,97,109,101,10,233])],'bad.csv'),{encoding:'utf-8'}));
});
test('CSV limits and dangerous headers reject before any preview or business write',async()=>{
 const h=setup(),before=h.state();for(const header of['__proto__','constructor','prototype'])await assert.rejects(parse(h,header+'\nvalue'));
 await assert.rejects(parse(h,'name\n'+Array(10001).fill('X').join('\n')));await assert.rejects(parse(h,Array.from({length:257},(_,i)=>'c'+i).join(',')+'\nX'));
 await assert.rejects(h.root.services.importParser.csv(new Blob([new Uint8Array(h.root.config.limits.csvBytes+1)])));
 const long=await parse(h,'name\n'+ 'x'.repeat(20001));assert.equal(long.rows[0].errors[0].code,'csv.cellLength');assert.equal(h.state(),before);
});
test('preview is pure and explicit subset plus unknown-column acknowledgement is required before one atomic apply',async()=>{
 const h=setup(),file=await parse(h,'name,email,extra\nValid,sample@example.test,ignored\nInvalid,not-an-email,other'),before=h.state(),report=await preview(h,file);
 assert.equal(report.counts.create,1);assert.equal(report.counts.error,1);assert.equal(report.unknown,2);assert.equal(report.rows[1].errors[0].field,'email');assert.equal(h.state(),before);
 await assert.rejects(h.root.services.contactImport.apply(report,{confirmed:true}),{name:'ConfirmationRequiredError'});await assert.rejects(h.root.services.contactImport.apply(report,{confirmed:true,confirmedSubset:true}),{name:'ConfirmationRequiredError'});assert.equal(h.state(),before);
 await h.root.services.contactImport.apply(report,{confirmed:true,confirmedSubset:true,ignoreUnknown:true});assert.equal(h.tables.contacts.length,1);assert.equal(h.tables.contacts[0].origin,'import');assert.equal(h.tables.activityLog.length,1);const revision=h.revision;assert.equal((await h.root.services.contactImport.apply(report,{confirmed:true,confirmedSubset:true,ignoreUnknown:true})).duplicate,true);assert.equal(h.revision,revision);
});
test('UUID/email/phone conflicts need decisions while name-only matches remain warnings and are never merged',async()=>{
 const h=setup(),id=(await h.root.services.contacts.create({type:'person',name:'José',email:'same@example.test',phones:[{original:'0034 600001020',label:''}],roles:[],notes:''})).result.id;
 const file=await parse(h,'id,name,email,phones\n'+id+',Existing,,\n,Other,SAME@example.test,\n,Phone,,+34(600)001020\n,JOSE,,'),report=await preview(h,file);
 assert.equal(report.counts.conflict,3);assert.equal(report.counts.create,1);assert.equal(report.rows[3].warnings[0],'name_only');assert.equal(report.rows[0].targetId,id);
 const reviewed=await preview(h,file,{2:{action:'link',targetId:id},3:{action:'skip'},4:{action:'create'}});assert.equal(reviewed.counts.link,1);assert.equal(reviewed.counts.create,2);await h.root.services.contactImport.apply(reviewed,{confirmed:true,confirmedSubset:true});assert.equal(h.tables.contacts.length,3);
});
test('explicit partial updates preserve unmapped contact data and empty mapped optional cells clear only those fields',async()=>{
 const h=setup(),id=(await h.root.services.contacts.create({type:'person',name:'Original',email:'old@example.test',phones:[{label:'Casa',original:'+0012345'}],roles:['volunteer'],notes:'Keep'})).result.id;
 const file=await parse(h,'id,email,notes\n'+id+',,Changed'),report=await preview(h,file,{2:{action:'update',targetId:id}});assert.equal(report.counts.update,1);await h.root.services.contactImport.apply(report,{confirmed:true});const row=h.row('contacts',id);assert.equal(row.name,'Original');assert.equal(row.email,null);assert.equal(row.phones[0].original,'+0012345');assert.equal(row.roles[0],'volunteer');assert.equal(row.notes,'Changed');assert.equal(row.origin,'real');
});
test('remembered external IDs and within-file linking reuse stable planned contacts without duplicate identities',async()=>{
 const h=setup(),file=await parse(h,'external_id,name,email\n0007,First,shared@example.test\n0008,Alias,SHARED@example.test'),opts={source:'Sheet A',remember:true},initial=await preview(h,file,{},opts),target=initial.rows[0].targetId;
 const report=await preview(h,file,{3:{action:'link',targetId:target}},opts);assert.equal(report.counts.create,1);assert.equal(report.counts.link,1);assert.equal(report.rows[0].targetId,target);await h.root.services.contactImport.apply(report,{confirmed:true});assert.equal(h.tables.contacts.length,1);assert.equal(h.tables.importIdentityMap.length,2);assert.equal(h.tables.importIdentityMap[0].externalId,'0007');
 const repeated=await preview(h,file,{},opts);assert.equal(repeated.repeatedFile,true);assert.equal(repeated.counts.create,0);assert.equal(repeated.counts.conflict,2);assert.ok(repeated.rows[0].matches.some(match=>match.reasons.includes('external_id')));
});
test('unsafe phone JSON, invalid identity and repeated updates report field errors instead of applying partial row edits',async()=>{
 const h=setup(),file=await parse(h,'name,phones,id\nBad,"[{""__proto__"":{},""original"":""+123""}]",\nBad UUID,,0007'),report=await preview(h,file);assert.equal(report.counts.error,2);assert.equal(report.rows[0].errors[0].field,'phones');assert.equal(report.rows[1].errors[0].field,'id');assert.equal(h.tables.contacts.length,0);
 const id=(await h.root.services.contacts.create({type:'person',name:'Original',roles:[],phones:[],notes:''})).result.id,two=await parse(h,'id,notes\n'+id+',First\n'+id+',Second'),plan=await preview(h,two,{2:{action:'update',targetId:id},3:{action:'update',targetId:id}});assert.equal(plan.counts.update,1);assert.equal(plan.counts.error,1);assert.equal(h.row('contacts',id).notes,'');
});
test('stale previews reject without mutation and public report mutation cannot bypass confirmations',async()=>{
 const h=setup(),file=await parse(h,'name\nNew'),report=await preview(h,file);assert.ok(Object.isFrozen(report.counts));assert.ok(Object.isFrozen(report.rows[0]));assert.throws(()=>{report.counts.error=0;});
 await h.root.services.contacts.create({type:'person',name:'Concurrent',roles:[],phones:[],notes:''});const before=h.state();await assert.rejects(h.root.services.contactImport.apply(report,{confirmed:true}),{name:'RevisionConflictError'});assert.equal(h.state(),before);
 await assert.rejects(h.root.services.contactImport.apply({...report},{confirmed:true}),{name:'InvalidInputError'});
});
test('preview can be cancelled between chunks and large batches require a verified current copy before staging',async()=>{
 const h=setup(),file=await parse(h,'name\n'+Array.from({length:1001},(_,i)=>'Person '+i).join('\n')),before=h.state(),abort=new AbortController();await assert.rejects(preview(h,file,{}, {signal:abort.signal,onProgress:()=>abort.abort()}),{name:'AbortError'});assert.equal(h.state(),before);
 const report=await preview(h,file);assert.equal(report.counts.create,1001);assert.equal(report.staged,true);assert.equal(report.records,1002);h.root.services.backup={list:async()=>[]};h.root.services.context.options=()=>({});await assert.rejects(h.root.services.contactImport.apply(report,{confirmed:true}),{name:'VerifiedBackupRequiredError'});assert.equal(h.state(),before);
});
