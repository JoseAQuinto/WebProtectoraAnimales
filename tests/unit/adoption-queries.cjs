'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const sandbox=vm.createContext({window:{}});
for(const name of['namespace','utils/strings','utils/dates','services/contacts','services/adoption-queries'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../js/'+name+'.js'),'utf8'),sandbox);
const query=sandbox.window.RescueManager.services.adoptionQueries.query,ids=value=>Array.from(value.rows,item=>item.row.id);
function tables(){return{animals:[{id:'animal',name:'Ámbar',code:'RM-0001'},{id:'other',name:'Luna',code:'RM-0002'}],contacts:[{id:'contact',name:'José',email:'jo@example.test'},{id:'old',name:'Alias',mergedIntoContactId:'contact'}],
 adoptionApplications:[{id:'a',animalId:'animal',contactId:'old',status:'approved',applicationDate:'2026-10-01',createdAt:'2026-10-01T12:00:00Z'},{id:'b',animalId:'other',contactId:'contact',status:'rejected',applicationDate:'2026-10-03',createdAt:'2026-10-03T12:00:00Z'}],
 reservations:[{id:'r',animalId:'animal',applicationId:'a',status:'fulfilled',reservationDate:'2026-10-02',createdAt:'2026-10-02T12:00:00Z'}],
 adoptions:[{id:'d',animalId:'animal',adopterContactId:'old',adoptionDate:'2026-10-02',returnDate:'2026-10-05',createdAt:'2026-10-02T12:00:00Z'},{id:'e',animalId:'other',adopterContactId:'contact',adoptionDate:'2026-10-04',returnDate:null,createdAt:'2026-10-04T12:00:00Z'}]};}
test('global register joins each source with animal and resolved contact without rewriting history',()=>{
 const data=tables(),before=JSON.stringify(data);
 for(const kind of['application','reservation','adoption']){const found=query(data,kind,{search:'AMBAR',contactId:'contact'});assert.equal(found.total,1);assert.equal(found.rows[0].animal.id,'animal');assert.equal(found.rows[0].contact.id,'contact');}
 assert.equal(query(data,'reservation',{search:'JOSE'}).total,1);assert.equal(query(data,'application',{search:'rm-0002'}).total,1);assert.equal(JSON.stringify(data),before);
});
test('each view uses its own inclusive date and adoption returns preserve the original date',()=>{
 const data=tables();assert.deepEqual(ids(query(data,'application',{from:'2026-10-01',to:'2026-10-01'})),['a']);
 assert.deepEqual(ids(query(data,'reservation',{from:'2026-10-02',to:'2026-10-02',status:'fulfilled'})),['r']);
 assert.deepEqual(ids(query(data,'adoption',{from:'2026-10-02',to:'2026-10-02',status:'returned'})),['d']);
 assert.deepEqual(ids(query(data,'adoption',{status:'active'})),['e']);assert.equal(query(data,'adoption',{from:'2026-10-05'}).total,0);
});
test('different filters combine with AND and archived/trash modes concern the source record',()=>{
 const data=tables();data.adoptionApplications[0].archivedAt='stamp';data.adoptionApplications[1].deletedAt='stamp';
 assert.equal(query(data,'application').total,0);assert.deepEqual(ids(query(data,'application',{mode:'all'})),['a']);assert.deepEqual(ids(query(data,'application',{mode:'trash'})),['b']);
 assert.equal(query(data,'application',{mode:'all',animalId:'animal',status:'rejected'}).total,0);
});
test('pagination is stable by date, registration and UUID and never mutates source arrays',()=>{
 const data=tables(),base=data.adoptionApplications[0];data.adoptionApplications=Array.from({length:43},(_,i)=>({...base,id:String(i).padStart(2,'0')})).reverse();
 const before=JSON.stringify(data);assert.equal(query(data,'application').rows.length,20);assert.equal(query(data,'application').total,43);assert.deepEqual(ids(query(data,'application',{offset:40})),['40','41','42']);assert.equal(JSON.stringify(data),before);
});
test('invalid views, calendar periods and paging are rejected',()=>{
 for(const kind of['bad','__proto__','constructor'])assert.throws(()=>query(tables(),kind));
 for(const filters of[{from:'2026-02-30'},{from:'2026-10-02',to:'2026-10-01'},{offset:-1},{limit:0},{limit:101}])assert.throws(()=>query(tables(),'application',filters));
});
