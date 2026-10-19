'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{harness}=require('./support/service-harness.cjs');
function setup(){const h=harness({datasetId:'10000000-0000-4000-8000-000000000001',today:'2026-10-19',services:['animals','fosters','adoptions','finance','tasks','health','history-linked-facts','history-corrections'],catalogKinds:['species','size','finance_income','finance_expense','task_type','care_plan_type']});h.load('core/errors');return h;}
async function animal(h){return(await h.root.services.animals.registerEntry({animal:{name:'Animal ficticio',speciesId:h.catalog.species.id,sizeId:h.catalog.size.id,birthDate:'2026-09-01',birthPrecision:'exact'},date:'2026-10-01',entryReason:'Rescate',location:{kind:'shelter',id:h.location.id},availability:'available'})).result.animalId;}
const input=(eventId,date)=>({eventId,date,reason:'Fecha contrastada con el documento original',confirmed:true});
const event=(h,type,id)=>h.tables.animalEvents.find(row=>row.type===type&&row.source.id===id&&!row.supersededByEventId);
async function foster(h,animalId,startDate='2026-10-03'){
  let profile=h.tables.fosterProfiles[0];if(!profile){const person=h.seed('contacts',{name:'Familia ficticia',roles:['foster']});profile=h.seed('fosterProfiles',{contactId:person.id,totalCapacity:1,acceptedSpeciesIds:[h.catalog.species.id],acceptedSizeIds:[h.catalog.size.id],availability:'available'});}
  return(await h.root.services.fosters.assign({animalId,fosterProfileId:profile.id,startDate})).result.fosterStayId;
}
test('foster start and end corrections preserve one stay, family, capacity exception, location and original end reason',async()=>{
  const h=setup(),s=h.root.services,a=await animal(h),stay=await foster(h,a),start=event(h,'foster_start',stay),location=structuredClone(h.tables.animals[0]);
  await s.historyCorrections.correctLinked(input(start.id,'2026-10-04'));assert.equal(h.row('fosterStays',stay).startDate,'2026-10-04');assert.deepEqual(h.tables.animals[0],location);
  await s.fosters.end({fosterStayId:stay,endDate:'2026-10-10',endReason:'Fin original de acogida',location:{kind:'shelter',id:h.location.id}});
  const end=event(h,'foster_end',stay),before=structuredClone(h.tables.animals);await s.historyCorrections.correctLinked(input(end.id,'2026-10-09'));
  assert.equal(h.row('fosterStays',stay).endDate,'2026-10-09');assert.equal(h.row('fosterStays',stay).endReason,'Fin original de acogida');assert.deepEqual(h.tables.animals,before);assert.equal(h.tables.fosterStays.length,1);
});
test('foster date corrections cannot overlap another stay or cross the containing episode',async()=>{
  const h=setup(),s=h.root.services,a=await animal(h),stay=await foster(h,a);await s.fosters.end({fosterStayId:stay,endDate:'2026-10-07',endReason:'Cambio original',location:{kind:'shelter',id:h.location.id}});const next=await foster(h,a,'2026-10-09'),before=h.state();
  for(const[id,date]of[[event(h,'foster_start',stay).id,'2026-09-30'],[event(h,'foster_end',stay).id,'2026-10-10'],[event(h,'foster_start',next).id,'2026-10-06']]){await assert.rejects(s.historyCorrections.correctLinked(input(id,date)),e=>e.code==='hc.dateBounds');assert.equal(h.state(),before);}
});
test('a health date correction coordinates completion of the same task and explicitly preserves a shared invoice',async()=>{
  const h=setup(),s=h.root.services,a=await animal(h),task=(await s.tasks.create({animalId:a,title:'Acto previsto',typeId:h.catalog.task_type.id,dueDate:'2026-10-04'})).result.id;
  const first=(await s.health.record({animalId:a,type:'checkup',date:'2026-10-05',title:'Acto ficticio'},{completeTaskId:task,expense:{categoryId:h.catalog.finance_expense.id,concept:'Factura combinada',amountMinor:12500}})).result;
  await s.health.record({animalId:a,type:'vaccination',date:'2026-10-06',title:'Otro acto de la misma factura'},{expenseMovementId:first.expenseMovementId});
  const before=h.state(),money=structuredClone(h.tables.financialMovements),other=structuredClone(h.tables.veterinaryRecords[1]);await assert.rejects(s.historyCorrections.correctLinked(input(first.eventId,'2026-10-07')),e=>e.code==='hc.expenseConfirmation');assert.equal(h.state(),before);
  await s.historyCorrections.correctLinked({...input(first.eventId,'2026-10-07'),preserveExpenseDate:true});assert.equal(h.row('veterinaryRecords',first.id).date,'2026-10-07');assert.equal(h.row('tasks',task).completedOn,'2026-10-07');assert.equal(h.row('tasks',task).dueDate,'2026-10-04');assert.equal(h.row('tasks',task).status,'completed');assert.deepEqual(h.tables.financialMovements,money);assert.deepEqual(h.tables.veterinaryRecords[1],other);assert.equal(h.tables.tasks.length,1);
});
test('sterilization date corrections update the animal and completed task without reopening either fact',async()=>{
  const h=setup(),s=h.root.services,a=await animal(h),task=(await s.tasks.create({animalId:a,title:'Esterilización ficticia',typeId:h.catalog.task_type.id,dueDate:'2026-10-04'})).result.id;
  const row=(await s.health.record({animalId:a,type:'sterilization',date:'2026-10-05',title:'Acto ficticio'},{completeTaskId:task})).result;await s.historyCorrections.correctLinked(input(row.eventId,'2026-10-06'));
  assert.equal(h.row('animals',a).sterilizationDate,'2026-10-06');assert.equal(h.row('animals',a).sterilizationStatus,'yes');assert.equal(h.row('tasks',task).completedOn,'2026-10-06');assert.equal(h.row('veterinaryRecords',row.id).date,'2026-10-06');assert.equal(h.tables.veterinaryRecords.length,1);
});
test('clinical bounds preserve plan start, condition resolution and linked next-review date',async()=>{
  const h=setup(),s=h.root.services,a=await animal(h),plan=h.seed('carePlans',{animalId:a,typeId:h.catalog.care_plan_type.id,name:'Plan ficticio',startDate:'2026-10-03',status:'active'}),task=(await s.tasks.create({animalId:a,title:'Próxima revisión',typeId:h.catalog.task_type.id,dueDate:'2026-10-08'})).result.id;
  const record=(await s.health.record({animalId:a,type:'disease',date:'2026-10-05',title:'Condición ficticia',conditionActive:false,resolvedOn:'2026-10-09',carePlanId:plan.id,nextReviewTaskId:task})).result,before=h.state();
  for(const date of['2026-10-02','2026-10-09']){await assert.rejects(s.historyCorrections.correctLinked(input(record.eventId,date)),e=>e.code==='hc.dateBounds');assert.equal(h.state(),before);}
  await s.historyCorrections.correctLinked(input(record.eventId,'2026-10-08'));assert.equal(h.row('carePlans',plan.id).status,'active');assert.equal(h.row('veterinaryRecords',record.id).resolvedOn,'2026-10-09');assert.equal(h.row('tasks',task).dueDate,'2026-10-08');
});
test('every health event mapping remains eligible and a shared sterilization fact requires a broader coordinated review',async()=>{
  for(const type of['vaccination','deworming','checkup','sterilization','surgery','test','diagnosis','disease','allergy','medication_administration','other']){
    const h=setup(),s=h.root.services,a=await animal(h),row=(await s.health.record({animalId:a,type,date:'2026-10-05',title:'Acto ficticio'})).result;assert.equal(s.historyCorrections.canCorrect(h.tables,h.row('animalEvents',row.eventId)),true,type);
    if(type==='sterilization'){await s.health.record({animalId:a,type,date:'2026-10-05',title:'Segundo registro'});assert.equal(s.historyCorrections.canCorrect(h.tables,h.row('animalEvents',row.eventId)),false);}
  }
});
test('linked corrections retain idempotency and cannot be submitted through a different command kind',async()=>{
  const h=setup(),s=h.root.services,a=await animal(h),stay=await foster(h,a),e=event(h,'foster_start',stay),request=input(e.id,'2026-10-04'),cmd={operationId:h.id(),expectedRevision:h.revision};
  await assert.rejects(s.historyCorrections.correct(request,cmd),{name:'InvalidInputError'});const result=await s.historyCorrections.correctLinked(request,cmd),state=h.state();assert.equal((await s.historyCorrections.correctLinked(request,cmd)).duplicate,true);assert.equal(h.state(),state);assert.equal(h.row('animalEvents',result.result.eventId).parameters.field,'startDate');
});
