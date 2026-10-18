'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {harness}=require('./support/service-harness.cjs');
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
test('every mandatory module exports a correctly shaped CSV table without modifying the snapshot',async()=>{
 const {r,snapshot}=await setup(),before=JSON.stringify(snapshot);for(const kind of Object.keys(r.services.exportDefinitions.definitions)){const selection=r.services.exports.select(snapshot,kind,{},'all'),table=r.services.exports.table(selection);assert.ok(selection.rows.length>0,kind);assert.ok(table.rows.length>0,kind);for(const row of table.rows){assert.equal(row.length,table.headers.length,kind);assert.ok(row.every(value=>value===null||typeof value==='string'||Number.isSafeInteger(value)),kind);}const exported=JSON.parse(r.utils.canonicalJson.stringify(r.services.exports.container(snapshot,selection)));assert.equal(exported.module,kind);assert.equal(exported.records.length,selection.rows.length);assert.equal(exported.includesFiles,false);}
 assert.equal(JSON.stringify(snapshot),before);
});
test('CSV projections preserve identifier text, exact money and quantity, zero estimates and grouped material rows',async()=>{
 const {r,snapshot}=await setup(),table=kind=>r.services.exports.table(r.services.exports.select(snapshot,kind,{},'all'));
 const a=table('animals');assert.equal(a.rows[0][a.headers.indexOf('code')],'000042');assert.equal(a.rows[0][a.headers.indexOf('microchip')],'000-001-002');
 const money=table('expenses');assert.equal(money.rows[0][money.headers.indexOf('amount_decimal')],'12.34');assert.equal(money.rows[0][money.headers.indexOf('amount_minor')],1234);
 const d=table('donations'),material=d.rows.filter(row=>row[d.headers.indexOf('donation_type')]==='material');assert.equal(material.length,2);assert.equal(material[0][0],material[1][0]);assert.ok(material.some(row=>row[d.headers.indexOf('quantity_decimal')]==='1.25'));assert.ok(material.some(row=>row[d.headers.indexOf('estimated_value_decimal')]==='0.00'));assert.ok(material.some(row=>row[d.headers.indexOf('estimated_value_decimal')]===null));
 assert.equal(table('volunteer_hours').rows[0][table('volunteer_hours').headers.indexOf('duration_minutes')],90);
});
test('module JSON includes related and forward references with asset metadata but no file bytes or mutation',async()=>{
 const {r,snapshot,doc,animalId}=await setup(),before=JSON.stringify(snapshot);
 const value=r.services.exports.container(snapshot,r.services.exports.select(snapshot,'animals',{},'all'),'2026-10-18T12:00:00.000Z');
 assert.equal(value.format,'rescue-manager-module-export');assert.equal(value.includesFiles,false);assert.equal(value.notBackup,true);assert.equal(value.records[0].id,animalId);assert.equal(value.references.documents[0].id,doc);assert.equal(value.references.stayEpisodes.length,2);assert.ok(value.references.veterinaryRecords.length);assert.ok(value.references.contacts.length);assert.ok(value.references.catalogOptions.length);assert.equal(value.references.assets.length,1);assert.ok(!Object.hasOwn(value.references.assets[0],'blob'));assert.ok(value.references.assets[0].sha256);
 const json=r.utils.canonicalJson.stringify(value);assert.ok(!json.includes('"blob"'));assert.equal(JSON.parse(json).records[0].code,'000042');assert.equal(JSON.stringify(snapshot),before);
});
test('all scope overrides filters while filtered dates/status/visibility are explicit and conjunctive',async()=>{
 const {h,r,snapshot,animalId}=await setup();snapshot.tables.animals[0].archivedAt='2026-10-18T12:00:00Z';
 assert.equal(r.services.exports.select(snapshot,'animals').rows.length,0);assert.equal(r.services.exports.select(snapshot,'animals',{visibility:'all',search:'AMBAR',animalId,from:'2026-10-18',to:'2026-10-18'}).rows.length,1);
 assert.equal(r.services.exports.select(snapshot,'animals',{visibility:'all',status:'adopted'}).rows.length,0);assert.equal(r.services.exports.select(snapshot,'animals',{status:'adopted',search:'no match'},'all').rows.length,1);
 assert.equal(r.services.exports.select(snapshot,'adoptions',{status:'returned',from:'2026-10-18',to:'2026-10-18'}).rows.length,1);
 assert.throws(()=>r.services.exports.select(snapshot,'animals',{from:'2026-10-19',to:'2026-10-18'}));for(const kind of['__proto__','constructor','unknown'])assert.throws(()=>r.services.exports.select(snapshot,kind));assert.ok(h.tables.animals.length);
});
test('JSON and CSV keep original merged contact references while showing the surviving name',async()=>{
 const {r,snapshot,contactId}=await setup(),survivor={...snapshot.tables.contacts[0],id:'81000000-0000-4000-8000-000000000099',name:'Surviving contact'};snapshot.tables.contacts.push(survivor);snapshot.tables.contacts[0].mergedIntoContactId=survivor.id;
 const selection=r.services.exports.select(snapshot,'expenses'),table=r.services.exports.table(selection),value=r.services.exports.container(snapshot,selection);assert.equal(table.rows[0][table.headers.indexOf('contact_id')],null);
 const donations=r.services.exports.select(snapshot,'donations'),d=r.services.exports.table(donations);assert.ok(d.rows.every(row=>row[d.headers.indexOf('contact_id')]===contactId));assert.ok(d.rows.every(row=>row[d.headers.indexOf('contact_name')]===survivor.name));const exported=r.services.exports.container(snapshot,donations);assert.ok(exported.references.contacts.some(row=>row.id===contactId));assert.ok(exported.references.contacts.some(row=>row.id===survivor.id));assert.equal(value.records.length,1);
});
test('all CSV column labels, module labels and status options exist in both dictionaries',()=>{
 const sandbox=vm.createContext({window:{}});for(const name of['js/namespace','js/domain/enums','js/services/export-definitions','locales/en','locales/es'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../..',name+'.js'),'utf8'),sandbox);
 const r=sandbox.window.RescueManager;for(const locale of['en','es'])for(const[kind,def]of Object.entries(r.services.exportDefinitions.definitions)){assert.equal(typeof r.locales[locale]['ex.module.'+kind],'string');for(const key of r.services.exportDefinitions.columns[kind])assert.equal(typeof r.locales[locale]['ex.column.'+key],'string',locale+': '+key);for(const key of def.statuses||[])assert.equal(typeof r.locales[locale]['ex.status.'+key],'string',locale+': '+key);}
});
