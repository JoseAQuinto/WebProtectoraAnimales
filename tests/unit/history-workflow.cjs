'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{harness}=require('./support/service-harness.cjs');
async function setup(){const h=harness({datasetId:'10000000-0000-4000-8000-000000000001',today:'2026-10-19',services:['animals','adoptions','history-events','history-workflow','history-corrections'],catalogKinds:['species','size','finance_income']});h.load('core/errors');h.load('utils/calendar');const s=h.root.services;
  const a=(await s.animals.registerEntry({animal:{name:'Animal ficticio',speciesId:h.catalog.species.id,sizeId:h.catalog.size.id},date:'2026-10-01',entryReason:'Rescate',location:{kind:'shelter',id:h.location.id},availability:'available'})).result.animalId,person=h.seed('contacts',{name:'Persona ficticia',roles:['adopter']});
  const app=(await s.adoptions.createApplication({animalId:a,contactId:person.id,applicationDate:'2026-10-02'})).result.applicationId;
  const event=(code,type='application')=>h.tables.animalEvents.find(row=>row.type===type&&row.parameters.code===code&&!row.supersededByEventId);return{h,s,a,app,event};
}
const input=(id,date)=>({eventId:id,date,reason:'Fecha contrastada',confirmed:true});
test('application creation and approval update source fields while preserving transitions and current state',async()=>{
  const f=await setup();await f.s.adoptions.review({applicationId:f.app,reviewDate:'2026-10-04'});await f.s.adoptions.approve({applicationId:f.app,approvalDate:'2026-10-06'});
  await f.s.historyCorrections.correctWorkflow(input(f.event('pending').id,'2026-10-03'));assert.equal(f.h.row('adoptionApplications',f.app).applicationDate,'2026-10-03');assert.equal(f.h.row('adoptionApplications',f.app).status,'approved');
  await f.s.historyCorrections.correctWorkflow(input(f.event('approved').id,'2026-10-07'));assert.equal(f.h.row('adoptionApplications',f.app).approvalDate,'2026-10-07');assert.equal(f.event('under_review').eventDate,'2026-10-04');
});
test('a corrected review keeps original transition ordering rather than sorting its new recording time',async()=>{
  const f=await setup();await f.s.adoptions.review({applicationId:f.app,reviewDate:'2026-10-04'});await f.s.adoptions.approve({applicationId:f.app,approvalDate:'2026-10-06'});const review=f.event('under_review'),before=structuredClone(f.h.row('adoptionApplications',f.app));
  const first=await f.s.historyCorrections.correctWorkflow(input(review.id,'2026-10-05'));assert.deepEqual(f.h.row('adoptionApplications',f.app),before);
  const current=f.h.row('animalEvents',first.result.eventId);assert.equal(f.s.historyCorrections.inspect(f.h.tables,current.id,'2026-10-19').maxDate,'2026-10-06');await f.s.historyCorrections.correctWorkflow(input(current.id,'2026-10-03'));assert.equal(f.event('approved').eventDate,'2026-10-06');
});
test('approval cannot cross an existing reservation and date conflicts leave the complete graph unchanged',async()=>{
  const f=await setup();await f.s.adoptions.approve({applicationId:f.app,approvalDate:'2026-10-04'});await f.s.adoptions.reserve({applicationId:f.app,reservationDate:'2026-10-06'});const before=f.h.state();
  await assert.rejects(f.s.historyCorrections.correctWorkflow(input(f.event('approved').id,'2026-10-07')),e=>e.code==='hc.dateBounds');assert.equal(f.h.state(),before);
  await f.s.historyCorrections.correctWorkflow(input(f.event('approved').id,'2026-10-05'));assert.equal(f.h.tables.reservations[0].reservationDate,'2026-10-06');assert.equal(f.h.tables.animals[0].adoptionAvailability,'reserved');
});
test('application rejection corrects only the historical closure date, preserving reason, state and prior approval',async()=>{
  const f=await setup();await f.s.adoptions.approve({applicationId:f.app,approvalDate:'2026-10-04'});await f.s.adoptions.reject({applicationId:f.app,date:'2026-10-08',reason:'Motivo original de rechazo'});const before=structuredClone(f.h.row('adoptionApplications',f.app)),old=f.event('rejected');await f.s.historyCorrections.correctWorkflow(input(old.id,'2026-10-09'));assert.deepEqual(f.h.row('adoptionApplications',f.app),before);assert.equal(f.h.row('animalEvents',old.id).parameters.reason,'Motivo original de rechazo');assert.equal(f.event('rejected').parameters.reason,'Fecha contrastada');
});
test('reservation creation and expiry correction retain inclusive expiry and never reopen the reservation',async()=>{
  const f=await setup();await f.s.adoptions.approve({applicationId:f.app,approvalDate:'2026-10-03'});const id=(await f.s.adoptions.reserve({applicationId:f.app,reservationDate:'2026-10-04',expiresOn:'2026-10-08'})).result.reservationId;
  await f.s.adoptions.closeReservation({reservationId:id,status:'expired',date:'2026-10-09',reason:'Caducidad original',availability:'available'});
  await f.s.historyCorrections.correctWorkflow(input(f.event('active','reservation').id,'2026-10-05'));const before=f.h.state();await assert.rejects(f.s.historyCorrections.correctWorkflow(input(f.event('expired','reservation').id,'2026-10-08')),e=>e.code==='hc.dateBounds');assert.equal(f.h.state(),before);
  await f.s.historyCorrections.correctWorkflow(input(f.event('expired','reservation').id,'2026-10-10'));const row=f.h.row('reservations',id);assert.equal(row.reservationDate,'2026-10-05');assert.equal(row.closedOn,'2026-10-10');assert.equal(row.expiresOn,'2026-10-08');assert.equal(row.status,'expired');assert.equal(row.closureReason,'Caducidad original');assert.equal(f.h.tables.animals[0].adoptionAvailability,'available');
});
test('fulfilled reservation date is bounded by its adoption and preserves the fee and episode',async()=>{
  const f=await setup();await f.s.adoptions.approve({applicationId:f.app,approvalDate:'2026-10-03'});await f.s.adoptions.reserve({applicationId:f.app,reservationDate:'2026-10-04'});await f.s.adoptions.complete({applicationId:f.app,adoptionDate:'2026-10-10',reservationClosureReason:'Formalización',fee:{categoryId:f.h.catalog.finance_income.id,concept:'Cuota',amountMinor:5000}});const before=structuredClone(f.h.tables);
  await assert.rejects(f.s.historyCorrections.correctWorkflow(input(f.event('fulfilled','reservation').id,'2026-10-11')),e=>e.code==='hc.dateBounds');await f.s.historyCorrections.correctWorkflow(input(f.event('fulfilled','reservation').id,'2026-10-09'));for(const table of['adoptions','stayEpisodes','financialMovements','animals'])assert.deepEqual(f.h.tables[table],before[table],table);
});
test('workflow correction replay and stale reviews remain guarded with historical transition codes preserved',async()=>{
  const f=await setup(),old=f.event('pending'),request=input(old.id,'2026-10-03'),cmd={operationId:f.h.id(),expectedRevision:f.h.revision};const first=await f.s.historyCorrections.correctWorkflow(request,cmd),before=f.h.state();assert.equal((await f.s.historyCorrections.correctWorkflow(request,cmd)).duplicate,true);assert.equal(f.h.state(),before);assert.equal(f.h.row('animalEvents',first.result.eventId).parameters.code,'pending');await assert.rejects(f.s.historyCorrections.correctWorkflow(input(first.result.eventId,'2026-10-04'),{expectedRevision:cmd.expectedRevision}),{name:'RevisionConflictError'});
});
test('automatic application closures record their own dated transition once and cannot precede the application',async()=>{
  const f=await setup();await f.s.adoptions.approve({applicationId:f.app,approvalDate:'2026-10-03'});const other=(await f.s.adoptions.createApplication({animalId:f.a,contactId:f.h.tables.contacts[0].id,applicationDate:'2026-10-05'})).result.applicationId,before=f.h.state();
  await assert.rejects(f.s.animals.recordExit({animalId:f.a,date:'2026-10-04',reason:'Salida ficticia',exitReason:'other',applicationClosureReason:'Cierre de solicitudes'}),{name:'BusinessRuleError'});assert.equal(f.h.state(),before);
  const input={applicationId:f.app,adoptionDate:'2026-10-10',otherApplicationsReason:'Otro solicitante adoptó'},cmd={operationId:f.h.id(),expectedRevision:f.h.revision};await f.s.adoptions.complete(input,cmd);await f.s.adoptions.complete(input,cmd);
  const closures=f.h.tables.animalEvents.filter(row=>row.type==='application'&&row.source.id===other&&row.parameters.code==='cancelled');assert.equal(closures.length,1);assert.equal(closures[0].eventDate,'2026-10-10');assert.equal(closures[0].parameters.reason,'Otro solicitante adoptó');assert.equal(f.h.row('adoptionApplications',other).status,'cancelled');
  f.h.tables.animalEvents.splice(f.h.tables.animalEvents.findIndex(row=>row.id===closures[0].id),1);const legacy=f.h.tables.animalEvents.find(row=>row.source.id===other&&row.parameters.code==='pending');assert.equal(f.s.historyCorrections.canCorrect(f.h.tables,legacy),false);
});
