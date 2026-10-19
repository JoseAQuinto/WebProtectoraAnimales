'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{harness}=require('./support/service-harness.cjs');
function setup(){const h=harness({datasetId:'10000000-0000-4000-8000-000000000001',today:'2026-10-19',services:[],catalogKinds:[]});h.load('storage/database');h.load('utils/integrity');h.load('services/retention');const activeId='10000000-0000-4000-8000-000000000001',targetId=h.id(),meta={id:targetId,state:'retired',schemaVersion:1,dataRevision:2,stagingRevision:0,createdAt:'2026-10-18T12:00:00.000Z',updatedAt:'2026-10-18T12:00:00.000Z',validation:{digest:'f'.repeat(64)}},calls=[];
  const original=h.root.services.context.snapshot;h.root.services.context.snapshot=async()=>({...await original(),dataRevision:3});h.root.services.context.options=value=>({datasetId:value.datasetId,expectedRevision:value.globalRevision,owner:'owner',leaseToken:'lease'});
  h.root.storage.datasetManager={list:async()=>[meta]};h.root.storage.retention={review:async id=>{if(id===activeId)throw h.root.storage.error('DatasetChangedError','Active');return{target:structuredClone({...meta,id}),active:{datasetId:activeId,revision:h.revision},counts:{animals:4,assets:1},assetBytes:50,records:5,organizationName:'Organización antigua'};},remove:async(plan,options)=>{calls.push({plan,options});return{duplicate:false,revision:1,result:{datasetId:plan.target.id,records:plan.records}};}};return{h,s:h.root.services.retention,activeId,targetId,meta,calls};
}
test('retention preview is read-only and deeply frozen, and only its private report can authorize removal',async()=>{
  const f=setup(),report=await f.s.preview(f.targetId);assert.equal(f.calls.length,0);assert.equal(Object.isFrozen(report.target.validation),true);assert.throws(()=>{report.target.validation.digest='changed';});await assert.rejects(f.s.apply({...report},{confirmed:true,targetCopyConfirmed:true}),{name:'InvalidInputError'});assert.equal(f.calls.length,0);
});
test('permanent recovery removal requires both explicit decisions before reaching storage',async()=>{
  const f=setup(),report=await f.s.preview(f.targetId);for(const confirmation of[{}, {confirmed:true},{targetCopyConfirmed:true}])await assert.rejects(f.s.apply(report,confirmation),{name:'ConfirmationRequiredError'});assert.equal(f.calls.length,0);await f.s.apply(report,{confirmed:true,targetCopyConfirmed:true});assert.equal(f.calls.length,1);assert.equal(f.calls[0].options.expectedRevision,report.revision);assert.equal(f.calls[0].options.datasetId,f.activeId);
});
test('repeating the same applied report returns its receipt without issuing another destructive call',async()=>{
  const f=setup(),report=await f.s.preview(f.targetId),confirmation={confirmed:true,targetCopyConfirmed:true};await f.s.apply(report,confirmation);assert.equal((await f.s.apply(report,confirmation)).duplicate,true);assert.equal(f.calls.length,1);
});
test('inactive inventory is paged at twenty and storage failures are surfaced rather than hidden',async()=>{
  const f=setup();f.h.root.storage.datasetManager.list=async()=>Array.from({length:24},()=>({...f.meta,id:f.h.id()}));const result=await f.s.list();assert.equal(result.rows.length,20);assert.equal(result.total,24);assert.equal(result.pages,2);assert.equal((await f.s.list(2)).rows.length,4);f.h.root.storage.retention.review=async()=>{throw f.h.root.storage.error('SecurityError','Unavailable');};await assert.rejects(f.s.list(),{name:'SecurityError'});
});
test('active selection and changed active dataset never reach the removal primitive',async()=>{
  const f=setup();await assert.rejects(f.s.preview(f.activeId),{name:'DatasetChangedError'});const report=await f.s.preview(f.targetId);f.h.root.services.context.snapshot=async()=>({datasetId:f.h.id(),tables:{organizationSettings:[]}});await assert.rejects(f.s.apply(report,{confirmed:true,targetCopyConfirmed:true}),{name:'DatasetChangedError'});assert.equal(f.calls.length,0);
});
