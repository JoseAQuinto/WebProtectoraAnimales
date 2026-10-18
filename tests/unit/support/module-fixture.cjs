'use strict';
const {harness}=require('./service-harness.cjs');
async function setup(){
 const h=harness({datasetId:'81000000-0000-4000-8000-000000000001',today:'2026-10-18',catalogKinds:['species','size','finance_income','finance_expense','inventory_category','material_type','unit','volunteer_function','document_type'],services:['animals','contacts','fosters','volunteers','finance','inventory','donations','adoptions','health']});
 for(const file of['config','utils/integrity','utils/files','utils/quantities','utils/money','services/documents','services/catalogs','services/export-definitions','services/exports'])h.load(file);
 const r=h.root,date='2026-10-18',contactId=(await r.services.contacts.create({type:'person',name:'=SUM(1;2)',email:'sample@example.test',phones:[{label:'Móvil',original:'+34 600-001-020'}],roles:[],notes:'Notas con ; "comillas"\ny ñ'})).result.id;
 const animalId=(await r.services.animals.registerEntry({animal:{name:'Ámbar',code:'000042',microchipOriginal:'000-001-002',speciesId:h.catalog.species.id},date,entryReason:'Prueba',location:{kind:'shelter',id:h.location.id},availability:'available'})).result.animalId;
 const applicationId=(await r.services.adoptions.createApplication({animalId,contactId,applicationDate:date})).result.applicationId;await r.services.adoptions.approve({applicationId,approvalDate:date});
 const adoptionId=(await r.services.adoptions.complete({applicationId,adoptionDate:date,taskDecisions:{keep:[],cancel:[]}})).result.adoptionId;
 await r.services.adoptions.returnAdoption({adoptionId,returnDate:date,reason:'Retorno',location:{kind:'shelter',id:h.location.id},availability:'available'});
 const vet=(await r.services.health.record({animalId,date,type:'checkup',title:'Revisión'},{expense:{categoryId:h.catalog.finance_expense.id,concept:'Gasto',amountMinor:1234}})).result.id;
 const doc=(await r.services.documents.createEmbedded({title:'Documento',typeId:h.catalog.document_type.id,date,links:[{entityType:'animal',entityId:animalId},{entityType:'veterinary_record',entityId:vet}]},new File(['Texto ñ'],'example.txt',{type:'text/plain'}))).result.id;
 const profileId=(await r.services.volunteers.createProfile({contactId,functionIds:[h.catalog.volunteer_function.id]})).result.id;await r.services.volunteers.logHours({volunteerProfileId:profileId,date,activity:'Paseo',durationMinutes:90});
 const itemId=(await r.services.inventory.createItem({name:'Pienso',categoryId:h.catalog.inventory_category.id,unitId:h.catalog.unit.id,quantityPrecision:2})).result.id;
 await r.services.donations.createMonetary({date,donorContactId:contactId,categoryId:h.catalog.finance_income.id,concept:'Ingreso',amountMinor:2500});
 const materialId=(await r.services.donations.createMaterial({date,donorContactId:contactId,lines:[{materialTypeId:h.catalog.material_type.id,description:'Material con stock',quantityScaled:125,quantityPrecision:2,unitId:h.catalog.unit.id,inventoryItemId:itemId,estimatedValueMinor:0},{materialTypeId:h.catalog.material_type.id,description:'Material sin stock',quantityScaled:3,quantityPrecision:0,unitId:h.catalog.unit.id,estimatedValueMinor:null}]})).result.id;
 const snapshot={...await r.services.context.snapshot(),dataRevision:h.revision};return{h,r,snapshot,contactId,animalId,profileId,adoptionId,doc,materialId};
}
module.exports={setup};
