'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{harness}=require('./support/service-harness.cjs');
async function setup({ended=false,returned=false}={}){const h=harness({datasetId:'10000000-0000-4000-8000-000000000001',today:'2026-10-19',services:['animals','fosters','adoptions','history-events','history-adoption','history-corrections'],catalogKinds:['species','size','finance_income','task_type']});h.load('core/errors');const s=h.root.services;
  const animal=(await s.animals.registerEntry({animal:{name:'Animal ficticio',speciesId:h.catalog.species.id,sizeId:h.catalog.size.id},date:'2026-10-01',entryReason:'Rescate',location:{kind:'shelter',id:h.location.id},availability:'available'})).result.animalId;
  const person=h.seed('contacts',{name:'Familia ficticia',roles:['adopter','foster']}),profile=h.seed('fosterProfiles',{contactId:person.id,totalCapacity:1,acceptedSpeciesIds:[h.catalog.species.id],acceptedSizeIds:[h.catalog.size.id],availability:'available'});
  const stay=(await s.fosters.assign({animalId:animal,fosterProfileId:profile.id,startDate:'2026-10-02'})).result.fosterStayId;
  if(ended)await s.fosters.end({fosterStayId:stay,endDate:'2026-10-08',endReason:'Fin anterior independiente',location:{kind:'shelter',id:h.location.id}});
  const app=(await s.adoptions.createApplication({animalId:animal,contactId:person.id,applicationDate:'2026-10-02'})).result.applicationId;await s.adoptions.approve({applicationId:app,approvalDate:'2026-10-03'});const reservation=(await s.adoptions.reserve({applicationId:app,reservationDate:'2026-10-04'})).result.reservationId;
  const task=h.seed('tasks',{animalId:animal,title:'Tarea a cancelar',typeId:h.catalog.task_type.id,dueDate:'2026-11-01'}),keep=h.seed('tasks',{animalId:animal,title:'Seguimiento conservado',typeId:h.catalog.task_type.id,dueDate:'2026-11-02'});
  const adoption=(await s.adoptions.complete({applicationId:app,adoptionDate:'2026-10-10',fosterEndReason:'Fin original',reservationClosureReason:'Reserva completada',taskDecisions:{keep:[keep.id],cancel:[{id:task.id,reason:'Motivo original de tarea'}]},fee:{categoryId:h.catalog.finance_income.id,concept:'Cuota ficticia',amountMinor:7500}})).result.adoptionId;
  const event=h.tables.animalEvents.find(row=>row.type==='adoption');
  if(returned)await s.adoptions.returnAdoption({adoptionId:adoption,returnDate:'2026-10-12',reason:'Devolución original',location:{kind:'shelter',id:h.location.id},availability:'available'});
  return{h,s,animal,stay,app,reservation,task,keep,adoption,event};
}
function request(f,date='2026-10-09',action='move'){const info=f.s.historyAdoption.inspect(f.h.tables,f.event,'2026-10-19');return{eventId:f.event.id,date,reason:'Fecha contrastada',confirmed:true,preserveIncomeDate:true,relatedDecisions:info.related.map(row=>({key:row.key,action}))};}
test('adoption correction coordinates episode and explicitly selected foster/reservation/task dates without replaying fee',async()=>{
  const f=await setup(),{h,s}=f,before=structuredClone(h.tables),review=s.historyAdoption.inspect(h.tables,f.event,'2026-10-19');assert.equal(review.related.length,3);assert.equal(h.state(),JSON.stringify(before));
  const result=await s.historyCorrections.correctAdoption(request(f));assert.equal(result.result.moved,3);assert.equal(h.row('adoptions',f.adoption).adoptionDate,'2026-10-09');assert.equal(h.tables.stayEpisodes[0].exitDate,'2026-10-09');assert.equal(h.row('fosterStays',f.stay).endDate,'2026-10-09');assert.equal(h.row('reservations',f.reservation).closedOn,'2026-10-09');assert.equal(h.row('tasks',f.task.id).cancelledOn,'2026-10-09');
  assert.equal(h.row('fosterStays',f.stay).endReason,'Fin original');assert.equal(h.row('tasks',f.task.id).cancellationReason,'Motivo original de tarea');assert.deepEqual(h.tables.financialMovements,before.financialMovements);assert.deepEqual(h.tables.animals,before.animals);assert.deepEqual(h.row('tasks',f.keep.id),before.tasks.find(row=>row.id===f.keep.id));assert.equal(h.tables.animalEvents.length,before.animalEvents.length+3);
  for(const old of before.animalEvents){const row=h.row('animalEvents',old.id);assert.equal(row.eventDate,old.eventDate);assert.equal(JSON.stringify(row.parameters),JSON.stringify(old.parameters));if(row.supersededByEventId)assert.equal(h.row('animalEvents',row.supersededByEventId).correctsEventId,row.id);}
});
test('keeping independent earlier closures does not infer a causal link or modify their events',async()=>{
  const f=await setup({ended:true}),before=structuredClone(f.h.tables);await f.s.historyCorrections.correctAdoption(request(f,'2026-10-11','keep'));
  for(const table of['fosterStays','reservations','tasks','financialMovements','animals'])assert.deepEqual(f.h.tables[table],before[table],table);assert.equal(f.h.tables.animalEvents.length,before.animalEvents.length+1);
});
test('tasks matching the old date are only candidates and require independent explicit choices',async()=>{
  const f=await setup(),other=f.h.seed('tasks',{animalId:f.animal,title:'Cancelación independiente',typeId:f.h.catalog.task_type.id,dueDate:'2026-11-03',status:'cancelled',cancelledOn:'2026-10-10',cancellationReason:'Causa ajena a adopción'}),input=request(f);
  input.relatedDecisions.find(row=>row.key==='tasks/'+other.id).action='keep';await f.s.historyCorrections.correctAdoption(input);assert.equal(f.h.row('tasks',other.id).cancelledOn,'2026-10-10');assert.equal(f.h.row('tasks',f.task.id).cancelledOn,'2026-10-09');
});
test('omitted duplicate or stale decisions and missing fee confirmation reject the entire correction',async()=>{
  const f=await setup(),before=f.h.state(),base=request(f);
  for(const patch of[{relatedDecisions:[]},{relatedDecisions:[base.relatedDecisions[0],base.relatedDecisions[0],base.relatedDecisions[2]]},{relatedDecisions:[...base.relatedDecisions.slice(0,2),{key:'tasks/foreign',action:'move'}]}]){await assert.rejects(f.s.historyCorrections.correctAdoption({...base,...patch}),e=>e.code==='hc.relatedReview');assert.equal(f.h.state(),before);}
  await assert.rejects(f.s.historyCorrections.correctAdoption({...base,preserveIncomeDate:false}),e=>e.code==='hc.incomeConfirmation');assert.equal(f.h.state(),before);
});
test('date bounds reject approval/reservation conflicts, later kept foster closures and dates after return',async()=>{
  const f=await setup({returned:true}),before=f.h.state();for(const input of[request(f,'2026-10-02'),request(f,'2026-10-03'),request(f,'2026-10-09','keep'),request(f,'2026-10-13')]){await assert.rejects(f.s.historyCorrections.correctAdoption(input),e=>['hc.relatedBounds','hc.dateBounds'].includes(e.code));assert.equal(f.h.state(),before);}
  await f.s.historyCorrections.correctAdoption(request(f));assert.equal(f.h.row('adoptions',f.adoption).returnDate,'2026-10-12');assert.equal(f.h.tables.stayEpisodes[1].entryDate,'2026-10-12');assert.equal(f.h.tables.animals[0].managementStatus,'under_care');
});
test('a missing closure event prevents moving that closure while retaining its valid earlier date is allowed',async()=>{
  const f=await setup({ended:true}),end=f.h.tables.animalEvents.find(row=>row.type==='foster_end');end.voidReason='Hecho pendiente de revisión';const info=f.s.historyAdoption.inspect(f.h.tables,f.event,'2026-10-19');assert.equal(info.related.find(row=>row.table==='fosterStays').canMove,false);const before=f.h.state();await assert.rejects(f.s.historyCorrections.correctAdoption(request(f)),e=>e.code==='hc.unsupported');assert.equal(f.h.state(),before);const input=request(f);input.relatedDecisions.find(row=>row.key==='fosterStays/'+f.stay).action='keep';await f.s.historyCorrections.correctAdoption(input);assert.equal(f.h.row('fosterStays',f.stay).endDate,'2026-10-08');
});
test('adoption correction replay and later chains retain optimistic revision and unique child replacements',async()=>{
  const f=await setup(),input=request(f),cmd={operationId:f.h.id(),expectedRevision:f.h.revision},first=await f.s.historyCorrections.correctAdoption(input,cmd),before=f.h.state();assert.equal((await f.s.historyCorrections.correctAdoption(input,cmd)).duplicate,true);assert.equal(f.h.state(),before);await assert.rejects(f.s.historyCorrections.correctAdoption({...input,date:'2026-10-08'},cmd),{name:'IdempotencyConflictError'});
  const current=f.h.row('animalEvents',first.result.eventId),info=f.s.historyAdoption.inspect(f.h.tables,current,'2026-10-19'),next={...input,eventId:current.id,date:'2026-10-11',relatedDecisions:info.related.map(row=>({key:row.key,action:'keep'}))};await assert.rejects(f.s.historyCorrections.correctAdoption(next,{expectedRevision:cmd.expectedRevision}),{name:'RevisionConflictError'});await f.s.historyCorrections.correctAdoption(next);assert.equal(f.h.tables.adoptions.length,1);assert.equal(f.h.tables.financialMovements.length,1);
});
