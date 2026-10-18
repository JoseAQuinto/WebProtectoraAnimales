'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const sandbox=vm.createContext({window:{}});for(const file of['namespace','utils/strings','utils/dates','services/animal-queries'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../js/'+file+'.js'),'utf8'),sandbox);
const list=sandbox.window.RescueManager.services.animalQueries.list,ids=(data,filters)=>Array.from(list(data,filters),row=>row.id);
function tables(){return{
 animals:[{id:'a',name:'Ámbar',code:'00042',speciesId:'dog',sex:'female',breed:'Lábrador',managementStatus:'under_care',adoptionAvailability:'available',locationKind:'foster',locationId:null,microchipNormalized:'00001234',notes:'',createdAt:'2026-01-01'},
 {id:'b',name:'Nube',code:'CAT8',speciesId:'cat',sex:'male',breed:null,managementStatus:'under_care',adoptionAvailability:'reserved',locationKind:'shelter',locationId:'room',microchipNormalized:null,notes:'',createdAt:'2026-01-02'},
 {id:'c',name:'Sol',code:'DOG9',speciesId:'dog',sex:'male',breed:'labrador',managementStatus:'adopted',adoptionAvailability:'unavailable',locationKind:null,locationId:null,microchipNormalized:null,archivedAt:'stamp',notes:'',createdAt:'2020-01-01'},
 {id:'d',name:'Trash',code:'D10',speciesId:'dog',sex:'unknown',breed:null,managementStatus:'other_exit',adoptionAvailability:'unavailable',locationKind:null,locationId:null,microchipNormalized:null,deletedAt:'stamp',notes:'',createdAt:'2020-01-01'}],
 stayEpisodes:[{animalId:'a',entryDate:'2020-01-01'},{animalId:'a',entryDate:'2026-10-01'},{animalId:'b',entryDate:'2026-09-01'},{animalId:'c',entryDate:'2020-01-01'}],
 fosterStays:[{animalId:'a',fosterProfileId:'f',endDate:null},{animalId:'b',fosterProfileId:'g',endDate:'2026-10-01'}],
 contacts:[{id:'old',mergedIntoContactId:'x'},{id:'x'},{id:'y'}],
 adoptions:[{animalId:'c',adopterContactId:'old',adoptionDate:'2020-01-02',returnDate:'2020-02-01'},{animalId:'c',adopterContactId:'y',adoptionDate:'2026-10-01',returnDate:null}]
};}
test('same-filter options combine OR while different animal filters combine AND',()=>{
 const data=tables();assert.deepEqual(ids(data,{species:['dog','cat'],sex:['female']}),['a']);assert.deepEqual(ids(data,{species:['dog','cat'],availability:['available','reserved']}),['a','b']);
 assert.deepEqual(ids(data,{species:['dog'],sex:['male']}),[]);assert.deepEqual(ids(data,{breed:['LABRADOR'],mode:'all'}),['a','c']);assert.deepEqual(ids(data,{breed:['']}),['b']);assert.deepEqual(ids(data,{location:['shelter','foster'],place:['room']}),['b']);
});
test('latest entry dates, inclusive periods and current versus ended foster stays have explicit semantics',()=>{
 const data=tables();assert.deepEqual(ids(data,{entryFrom:'2026-10-01',entryTo:'2026-10-01'}),['a']);assert.deepEqual(ids(data,{entryFrom:'2020-01-01',entryTo:'2020-12-31',mode:'all'}),['c']);
 assert.deepEqual(ids(data,{foster:['f','g']}),['a']);assert.deepEqual(ids(data,{foster:['g']}),[]);assert.deepEqual(ids(data,{foster:['f','g'],pastFosters:true}),['a','b']);
});
test('adopter and period must match the same adoption and returned facts resolve merged contact identities',()=>{
 const data=tables();assert.deepEqual(ids(data,{mode:'all',adopter:['x'],adoptionFrom:'2026-01-01'}),[]);
 assert.deepEqual(ids(data,{mode:'all',adopter:['x'],adoptionFrom:'2020-01-02',adoptionTo:'2020-01-02'}),['c']);assert.deepEqual(ids(data,{mode:'all',adopter:['y']}),['c']);
});
test('archived and trash visibility, normalized search and deterministic sort preserve source data',()=>{
 const data=tables(),before=JSON.stringify(data);assert.deepEqual(ids(data,{}),['a','b']);assert.deepEqual(ids(data,{mode:'trash'}),['d']);assert.deepEqual(ids(data,{search:'AMBAR'}),['a']);assert.deepEqual(ids(data,{search:'0000-1234'}),['a']);assert.deepEqual(ids(data,{search:'-'}),[]);
 const sorted=Array.from(list(data,{mode:'all',sort:'createdAt'}),row=>row.id);assert.deepEqual(sorted,['c','a','b']);assert.equal(JSON.stringify(data),before);
});
test('invalid periods, query and filter shapes fail explicitly without falling back to unfiltered results',()=>{
 for(const filters of[{entryFrom:'2026-02-30'},{adoptionFrom:'2026-10-02',adoptionTo:'2026-10-01'},{species:'dog'},{sex:[1]},{search:'x'.repeat(201)},{mode:'anything'},{sort:'id'}])assert.throws(()=>list(tables(),filters));
});
