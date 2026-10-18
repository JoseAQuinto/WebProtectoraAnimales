'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const sandbox=vm.createContext({window:{}});
for(const name of['namespace','utils/strings','services/search'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../js/'+name+'.js'),'utf8'),sandbox);
const search=sandbox.window.RescueManager.services.search.search,plain=value=>JSON.parse(JSON.stringify(value));
function tables(){return{
 animals:[{id:'a',name:'Ámbar',code:'RM-0007',microchipOriginal:'0000-1234',microchipNormalized:'00001234'},{id:'b',name:'Nube',code:'RM-0008',microchipNormalized:null}],
 contacts:[{id:'c',name:'José Muñoz',email:'Jose@Example.test',emailNormalized:'jose@example.test',phones:[{original:'00 34 600-001-020',normalized:'+34600001020'}]},{id:'d',name:'Other',emailNormalized:null,phones:[]}]
};}
test('global search preserves originals while comparing names, code, chip, email and normalized phones',()=>{
 const data=tables(),before=JSON.stringify(data);
 for(const query of['ambar','ÁMBAR','rm-0007','0000 1234'])assert.deepEqual(plain(search(data,query).animals.rows.map(row=>row.id)),['a'],query);
 for(const query of['JOSE MUNOZ','jose@EXAMPLE.TEST','0034 600 001020','+34(600)001020','600001020'])assert.deepEqual(plain(search(data,query).contacts.rows.map(row=>row.id)),['c'],query);
 assert.equal(JSON.stringify(data),before);
});
test('archived and trash are explicit and merged contacts never repeat a result',()=>{
 const data=tables();data.animals[0].archivedAt='stamp';data.contacts[0].deletedAt='stamp';data.contacts.push({...data.contacts[0],id:'merged',mergedIntoContactId:'c'});
 assert.equal(search(data,'ambar').animals.total,0);assert.equal(search(data,'jose').contacts.total,0);
 assert.deepEqual(plain(search(data,'ambar',{includeInactive:true}).animals.rows.map(row=>row.id)),['a']);
 assert.deepEqual(plain(search(data,'jose',{includeInactive:true}).contacts.rows.map(row=>row.id)),['c']);
});
test('empty or punctuation-only chip comparison cannot expose every animal',()=>{
 const data=tables();data.animals.forEach(row=>{row.code=row.code.replace('-','');});
 for(const query of['','  ',' - ','<img onerror=alert(1)>']){const result=search(data,query);assert.equal(result.animals.total,0);assert.equal(result.contacts.total,0);}
});
test('groups have stable independent pages and validated bounds',()=>{
 const data=tables();data.animals=Array.from({length:43},(_,i)=>({...data.animals[0],id:String(i).padStart(2,'0'),name:'Same'}));
 assert.equal(search(data,'same').animals.rows.length,20);assert.equal(search(data,'same').animals.total,43);
 assert.deepEqual(plain(search(data,'same',{offset:40}).animals.rows.map(row=>row.id)),['40','41','42']);
 assert.equal(search(data,'same',{offset:99}).animals.rows.length,0);
 for(const options of[{offset:-1},{offset:1.5},{limit:0},{limit:101}])assert.throws(()=>search(data,'same',options));
 for(const query of[123,null,'a'.repeat(201)])assert.throws(()=>search(data,query));
});
