'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {harness}=require('./support/service-harness.cjs');
function setup(){return harness({datasetId:'71000000-0000-4000-8000-000000000001',today:'2026-10-18',services:['animals','configuration','settings'],catalogKinds:['species','size']});}
test('custom catalog identity stays stable, translated system labels are protected, and retries do not duplicate',async()=>{
 const h=setup(),service=h.root.services.configuration,cmd={operationId:h.id()};
 const result=await service.createOption({kind:'species',customLabel:'Hurón',sortOrder:1},cmd),id=result.result.id,original=h.row('catalogOptions',id);
 assert.equal((await service.createOption({kind:'species',customLabel:'Hurón',sortOrder:1},cmd)).duplicate,true);
 await service.updateOption(id,{customLabel:'Hurón doméstico',active:false});assert.equal(h.row('catalogOptions',id).code,original.code);assert.equal(h.row('catalogOptions',id).active,false);
 const system=h.seed('catalogOptions',{kind:'species',code:'stable',labelKey:'catalog.species.dog',isSystem:true});await service.updateOption(system.id,{active:false});
 for(const patch of[{code:'changed'},{kind:'size'},{customLabel:'Changed'},{labelKey:'catalog.species.cat'},{isSystem:false}]){const before=h.state();await assert.rejects(service.updateOption(system.id,patch),{name:'InvalidInputError'});assert.equal(h.state(),before);}
});
test('inactive animal options remain editable on their current records and cannot be newly assigned',async()=>{
 const h=setup(),config=h.root.services.configuration,animals=h.root.services.animals;
 const entry=()=>animals.registerEntry({animal:{name:'Sintético',speciesId:h.catalog.species.id,sizeId:h.catalog.size.id},date:'2026-10-18',entryReason:'Prueba',location:{kind:'shelter',id:h.location.id},availability:'available'});
 const id=(await entry()).result.animalId;await config.updateOption(h.catalog.species.id,{active:false});await config.updateOption(h.catalog.size.id,{active:false});
 await animals.update({animalId:id,patch:{name:'Nombre corregido',speciesId:h.catalog.species.id,sizeId:h.catalog.size.id}});assert.equal(h.row('animals',id).name,'Nombre corregido');const before=h.state();await assert.rejects(entry(),{name:'BusinessRuleError'});assert.equal(h.state(),before);
});
test('location parent changes reject cycles and inactive new parents without losing history',async()=>{
 const h=setup(),service=h.root.services.configuration,child=(await service.createLocation({name:'Sala',type:'room',parentLocationId:h.location.id})).result.id;
 const before=h.state();await assert.rejects(service.updateLocation(h.location.id,{parentLocationId:child}),{name:'InvalidInputError'});assert.equal(h.state(),before);
 await service.updateLocation(h.location.id,{active:false});await service.updateLocation(child,{name:'Sala conservada',parentLocationId:h.location.id});
 const inactive=h.state();await assert.rejects(service.createLocation({name:'Nueva',parentLocationId:h.location.id}),{name:'InvalidStateError'});assert.equal(h.state(),inactive);assert.equal(h.row('locations',child).parentLocationId,h.location.id);
});
test('configuration writes reject stale revisions, wrong primitive values and unexpected fields atomically',async()=>{
 const h=setup(),service=h.root.services.configuration,revision=h.revision;await service.createOption({kind:'species',customLabel:'Ave'});
 const before=h.state();await assert.rejects(service.updateOption(h.catalog.species.id,{active:false},{expectedRevision:revision}),{name:'RevisionConflictError'});
 for(const input of[{kind:'species',customLabel:''},{kind:'species',customLabel:'Valid',sortOrder:1.5},{kind:'species',customLabel:'Valid',active:'false'},{kind:'species',customLabel:'Valid',code:'x'}])await assert.rejects(service.createOption(input));
 assert.equal(h.state(),before);
});
test('settings record preferences and activity atomically, protect resource identity, and never reinterpret existing currency amounts',async()=>{
 const h=setup(),settings=h.root.services.settings,cmd={operationId:h.id()};
 await settings.update({displayPreferences:{animalView:'cards',pageSize:10},printFooter:'Texto\ncon salto',backupReminderDays:3,backupReminderWrites:2},cmd);const before=h.state();assert.equal((await settings.update({displayPreferences:{animalView:'cards',pageSize:10},printFooter:'Texto\ncon salto',backupReminderDays:3,backupReminderWrites:2},cmd)).duplicate,true);assert.equal(h.state(),before);
 assert.equal(h.tables.activityLog.filter(row=>row.target.type==='organization_settings').length,1);assert.equal(h.tables.organizationSettings[0].printFooter,'Texto\ncon salto');await assert.rejects(settings.update({logoAssetId:null}),{name:'InvalidInputError'});
 const income=h.seed('catalogOptions',{kind:'finance_income',code:'income',customLabel:'Ingreso'});h.seed('financialMovements',{direction:'income',date:'2026-10-18',categoryId:income.id,concept:'Prueba',amountMinor:123,currencyCode:'EUR'});
 const withMoney=h.state();await assert.rejects(settings.update({currencyCode:'USD'}),{name:'ValidationError'});assert.equal(h.state(),withMoney);assert.equal(h.tables.financialMovements[0].amountMinor,123);
});
