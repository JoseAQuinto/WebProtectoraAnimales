'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{harness}=require('./support/service-harness.cjs');
const datasetId='10000000-0000-4000-8000-000000000001';
function setup(){const h=harness({datasetId,today:'2026-10-19',services:['animals','fosters','adoptions','history-events','history-corrections'],catalogKinds:['species','size','finance_income','task_type']});h.load('core/errors');return h;}
async function entry(h,date='2026-10-02'){
  const result=await h.root.services.animals.registerEntry({animal:{name:'Animal ficticio',speciesId:h.catalog.species.id,sizeId:h.catalog.size.id,birthDate:'2026-09-01',birthPrecision:'exact'},date,entryReason:'Rescate original',location:{kind:'shelter',id:h.location.id},availability:'available'});
  return{...result.result,eventId:h.tables.animalEvents.at(-1).id};
}
const input=(eventId,date='2026-10-03')=>({eventId,date,reason:'Fecha contrastada con el registro original',confirmed:true});
async function returned(h){const e=await entry(h),person=h.seed('contacts',{name:'Persona ficticia',roles:['adopter','foster']}),s=h.root.services;
  const app=(await s.adoptions.createApplication({animalId:e.animalId,contactId:person.id,applicationDate:'2026-10-04'})).result.applicationId;
  await s.adoptions.approve({applicationId:app,approvalDate:'2026-10-05'});
  const adoption=(await s.adoptions.complete({applicationId:app,adoptionDate:'2026-10-06',fee:{categoryId:h.catalog.finance_income.id,concept:'Cuota ficticia',amountMinor:7500}})).result.adoptionId;
  const result=await s.adoptions.returnAdoption({adoptionId:adoption,returnDate:'2026-10-08',reason:'Motivo original de devolución',location:{kind:'shelter',id:h.location.id},availability:'unavailable'});
  return{...result.result,eventId:h.tables.animalEvents.at(-1).id,firstEpisodeId:e.episodeId};
}
test('entry correction changes source and creates one reciprocal replacement while preserving the historical event',async()=>{
  const h=setup(),e=await entry(h),before=structuredClone(h.tables),original=h.row('animalEvents',e.eventId),s=h.root.services.historyCorrections;
  const review=s.inspect(h.tables,e.eventId,'2026-10-19');assert.equal(review.minDate,'2026-09-01');assert.equal(review.maxDate,'2026-10-19');assert.equal(review.affected.length,1);assert.equal(h.state(),JSON.stringify(before));
  const result=await s.correct(input(e.eventId)),old=h.row('animalEvents',e.eventId),next=h.row('animalEvents',result.result.eventId);
  assert.equal(h.row('stayEpisodes',e.episodeId).entryDate,'2026-10-03');assert.equal(old.eventDate,'2026-10-02');assert.equal(old.recordedAt,original.recordedAt);assert.deepEqual(old.parameters,original.parameters);
  assert.equal(old.supersededByEventId,next.id);assert.equal(next.correctsEventId,old.id);assert.equal(next.eventDate,'2026-10-03');assert.equal(next.source.id,e.episodeId);assert.equal(next.parameters.reason,input(e.eventId).reason);
  assert.equal(old.revision,original.revision+1);assert.equal(next.revision,1);assert.equal(h.tables.animalEvents.length,before.animalEvents.length+1);
  for(const table of h.root.domain.tableNames)if(!['animalEvents','activityLog','stayEpisodes'].includes(table))assert.deepEqual(h.tables[table],before[table],table);
});
test('retry and correction chains preserve every original date, unique effects and stale form protection',async()=>{
  const h=setup(),e=await entry(h),s=h.root.services.historyCorrections,cmd={operationId:h.id(),expectedRevision:h.revision},a=input(e.eventId),first=await s.correct(a,cmd),state=h.state(),revision=h.revision;
  assert.equal((await s.correct(a,cmd)).duplicate,true);assert.equal(h.state(),state);assert.equal(h.revision,revision);
  await assert.rejects(s.correct({...a,date:'2026-10-04'},cmd),{name:'IdempotencyConflictError'});
  await assert.rejects(s.correct(input(first.result.eventId,'2026-10-04'),{expectedRevision:cmd.expectedRevision}),{name:'RevisionConflictError'});
  await assert.rejects(s.correct(input(e.eventId,'2026-10-04')),error=>error.code==='hc.unsupported');
  const second=await s.correct(input(first.result.eventId,'2026-10-04'));
  assert.equal(h.row('animalEvents',e.eventId).supersededByEventId,first.result.eventId);assert.equal(h.row('animalEvents',first.result.eventId).supersededByEventId,second.result.eventId);
  assert.equal(h.tables.animalEvents.filter(row=>!row.supersededByEventId&&!row.voidReason).length,1);assert.equal(h.tables.stayEpisodes.length,1);
});
test('return date correction updates the same adoption and return episode without repeating fee, tasks or reasons',async()=>{
  const h=setup(),e=await returned(h),before=structuredClone(h.tables),s=h.root.services.historyCorrections;
  const review=s.inspect(h.tables,e.eventId,'2026-10-19');assert.equal(review.minDate,'2026-10-06');assert.equal(review.affected.length,2);
  await s.correct(input(e.eventId,'2026-10-09'));
  assert.equal(h.row('stayEpisodes',e.episodeId).entryDate,'2026-10-09');assert.equal(h.row('adoptions',e.adoptionId).returnDate,'2026-10-09');
  assert.equal(h.row('adoptions',e.adoptionId).returnReason,'Motivo original de devolución');assert.equal(h.row('stayEpisodes',e.firstEpisodeId).exitDate,'2026-10-06');
  for(const table of['animals','financialMovements','tasks','adoptionApplications','reservations','inventoryMovements'])assert.deepEqual(h.tables[table],before[table],table);
  assert.equal(h.tables.adoptions.length,1);assert.equal(h.tables.stayEpisodes.length,2);assert.equal(h.tables.financialMovements.length,1);
});
test('birth, neighboring episodes, return adoption and future dates reject the entire correction',async()=>{
  const h=setup(),e=await returned(h),s=h.root.services.historyCorrections,before=h.state();
  for(const date of['2026-09-30','2026-10-05','2026-10-20','2026-02-30','03/10/2026']){await assert.rejects(s.correct(input(e.eventId,date)),error=>error.code==='hc.dateBounds');assert.equal(h.state(),before);}
  const first=h.tables.animalEvents.find(row=>row.source.id===e.firstEpisodeId&&row.type==='entry');await assert.rejects(s.correct(input(first.id,'2026-10-07')),error=>error.code==='hc.dateBounds');assert.equal(h.state(),before);
});
test('foster stay and unscoped known facts bound an entry without silently moving those facts',async()=>{
  const h=setup(),e=await entry(h),person=h.seed('contacts',{name:'Acogida ficticia',roles:['foster']}),profile=h.seed('fosterProfiles',{contactId:person.id,totalCapacity:1,acceptedSpeciesIds:[h.catalog.species.id],acceptedSizeIds:[h.catalog.size.id],availability:'available'});
  await h.root.services.fosters.assign({animalId:e.animalId,fosterProfileId:profile.id,startDate:'2026-10-04'});
  const s=h.root.services.historyCorrections,before=h.state();assert.equal(s.inspect(h.tables,e.eventId,'2026-10-19').maxDate,'2026-10-04');
  await assert.rejects(s.correct(input(e.eventId,'2026-10-05')),error=>error.code==='hc.dateBounds');assert.equal(h.state(),before);
  await s.correct(input(e.eventId,'2026-10-04'));assert.equal(h.tables.fosterStays[0].startDate,'2026-10-04');assert.equal(h.tables.animals[0].locationKind,'foster');
});
test('a same-day prior adoption does not falsely constrain the returned episode to its old return date',async()=>{
  const h=setup(),e=await returned(h),s=h.root.services.historyCorrections;await s.correct(input(e.eventId,'2026-10-06'));
  const live=h.tables.animalEvents.find(row=>row.type==='return'&&!row.supersededByEventId);await s.correct(input(live.id,'2026-10-09'));assert.equal(h.row('adoptions',e.adoptionId).returnDate,'2026-10-09');
});
test('a measured weight without a timeline event still constrains moving the entry past a known fact',async()=>{
  const h=setup(),e=await entry(h),s=h.root.services.historyCorrections;h.seed('weightMeasurements',{animalId:e.animalId,date:'2026-10-04',grams:1200});const before=h.state();
  assert.equal(s.inspect(h.tables,e.eventId,'2026-10-19').maxDate,'2026-10-04');await assert.rejects(s.correct(input(e.eventId,'2026-10-05')),error=>error.code==='hc.dateBounds');assert.equal(h.state(),before);
});
test('confirmation, changed date, explicit reason and exact input shape are mandatory with no partial writes',async()=>{
  const h=setup(),e=await entry(h),s=h.root.services.historyCorrections,before=h.state();
  for(const[patch,code]of[[{confirmed:false},'hc.confirmation'],[{date:'2026-10-02'},'hc.unchanged'],[{reason:''},'hc.reasonRequired'],[{reason:' Motivo '},'hc.reasonRequired'],[{reason:'a'.repeat(201)},'hc.reasonRequired']]){await assert.rejects(s.correct({...input(e.eventId),...patch}),error=>error.code===code);assert.equal(h.state(),before);}
  await assert.rejects(s.correct({...input(e.eventId),supersededByEventId:h.id()}),{name:'InvalidInputError'});assert.equal(h.state(),before);
});
test('ambiguous, voided, missing or mismatched history is rejected and archived animals require restoration',async()=>{
  const h=setup(),e=await entry(h),s=h.root.services.historyCorrections,original=h.row('animalEvents',e.eventId);
  assert.equal(s.canCorrect(h.tables,original),true);h.row('animals',e.animalId).archivedAt='2026-10-19T12:00:00.000Z';assert.equal(s.canCorrect(h.tables,original),false);
  await assert.rejects(s.correct(input(e.eventId)),error=>error.code==='hc.restoreFirst');h.row('animals',e.animalId).archivedAt=null;
  original.voidReason='Hecho anulado';assert.equal(s.canCorrect(h.tables,original),false);original.voidReason=null;
  h.seed('animalEvents',{animalId:e.animalId,type:'entry',eventDate:'2026-10-02',recordedAt:'2026-10-19T12:00:00.000Z',source:original.source,originKey:'ambiguous-example'});
  assert.equal(s.canCorrect(h.tables,original),false);await assert.rejects(s.correct(input(e.eventId)),error=>error.code==='hc.unsupported');
});
