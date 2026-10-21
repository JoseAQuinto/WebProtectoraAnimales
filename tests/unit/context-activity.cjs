'use strict';
// Real context service over a simulated lease/repository adapter. These tests verify activity/cleanup
// outcomes, not persistence; native lease fencing, aborts and commits are covered by read-cache-ui.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{webcrypto}=require('node:crypto');
async function setup(failIdle=false){
 const sandbox=vm.createContext({window:{crypto:webcrypto},crypto:webcrypto,Intl,Date,Blob,Uint8Array,ArrayBuffer,TextEncoder,TextDecoder}),load=file=>vm.runInContext(fs.readFileSync(path.join(__dirname,'../../js/'+file+'.js'),'utf8'),sandbox);
 for(const file of['namespace','config','utils/ids','utils/dates','utils/canonical-json','utils/integrity'])load(file);
 const r=sandbox.window.RescueManager,datasetId=r.utils.ids.uuidV4(),state={revision:0,commits:0,renewals:[],diagnostics:[],lease:null};
 const error=(name,message)=>Object.assign(new Error(message),{name});r.storage.error=error;r.storage.database={open:async()=>({})};
 r.storage.writeCoordinator={readActive:async()=>({key:'active',datasetId,revision:state.revision}),acquire:async(owner,id,ttl)=>{state.lease={owner,datasetId:id,token:'fixture-token',expiresAt:Date.now()+ttl};return true;},readLease:async()=>({...state.lease}),renew:async(options,ttl)=>{state.renewals.push(ttl);if(failIdle&&ttl===r.config.leaseMs)throw error('SecurityError','Lease cleanup unavailable');state.lease={...state.lease,expiresAt:Date.now()+ttl};return{...state.lease};},replay:async()=>null};
 r.storage.repositories={snapshot:async()=>({datasetId,globalRevision:state.revision,dataRevision:state.revision,animalSequence:0,tables:structuredClone({organizationSettings:[{timeZone:'UTC'}],animals:[],activityLog:[],contacts:[]})}),commit:async(options,changes,result,capture)=>{assert.equal(Object.isFrozen(capture.tables),true);assert.equal(options.expectedRevision,state.revision);state.commits++;state.revision++;return{activeRevision:state.revision,revision:state.revision,duplicate:false,result};}};
 r.services.diagnostics={record:(kind,value)=>state.diagnostics.push({kind,name:value.name})};load('services/context');await r.services.context.open();
 const changes=()=>[{table:'contacts',record:{id:r.utils.ids.uuidV4(),datasetId},expectedRevision:null}];return{r,state,context:r.services.context,changes};
}
test('an active command has an extended lease and returns to the ordinary lease after its confirmed result',async()=>{
 const f=await setup(),result=await f.context.execute('test.activity',{},async()=>{assert.equal(f.context.busy,true);assert.equal(f.state.renewals.at(-1),f.r.config.activeCommandLeaseMs);return{changes:f.changes(),result:{saved:true}};});
 assert.equal(result.result.saved,true);assert.equal(f.context.busy,false);assert.equal(f.state.commits,1);assert.deepEqual(f.state.renewals,[f.r.config.activeCommandLeaseMs,f.r.config.leaseMs]);assert.equal(f.context.status().canWrite,true);
});
test('lease cleanup failure does not turn a confirmed commit into an unconfirmed business result',async()=>{
 const f=await setup(true),result=await f.context.execute('test.activity',{},()=>({changes:f.changes(),result:{saved:true}}));
 assert.equal(result.result.saved,true);assert.equal(f.state.commits,1);assert.equal(f.context.busy,false);assert.equal(f.context.status().canWrite,false);assert.equal(f.state.diagnostics.at(-1).name,'SecurityError');
});
test('a preparation error is preserved when subsequent lease cleanup also fails',async()=>{
 const f=await setup(true);await assert.rejects(f.context.execute('test.activity',{},(data,h)=>h.fail('InvalidInputError','Original preparation failure')),{name:'InvalidInputError',message:'Original preparation failure'});
 assert.equal(f.state.commits,0);assert.equal(f.context.busy,false);assert.equal(f.context.status().canWrite,false);assert.equal(f.state.diagnostics.at(-1).name,'SecurityError');
});
test('an overlapping failed command does not shorten the lease of another active command',async()=>{
 const f=await setup();let release,entered;const started=new Promise(resolve=>{entered=resolve;}),hold=new Promise(resolve=>{release=resolve;});
 const first=f.context.execute('test.first',{},async()=>{entered();await hold;return{changes:f.changes()};});await started;
 await assert.rejects(f.context.execute('test.second',{},(data,h)=>h.fail('InvalidInputError','Expected failure')),{name:'InvalidInputError'});
 assert.equal(f.context.busy,true);assert.ok(f.state.renewals.every(ttl=>ttl===f.r.config.activeCommandLeaseMs));release();await first;
 assert.equal(f.context.busy,false);assert.equal(f.state.renewals.at(-1),f.r.config.leaseMs);assert.equal(f.state.commits,1);
});
test('protected preparation keeps its active lease across a nested command until preparation finishes',async()=>{
 const f=await setup();await f.context.withActivity(async()=>{
  assert.equal(f.context.busy,true);assert.equal(f.state.renewals.at(-1),f.r.config.activeCommandLeaseMs);
  await f.context.execute('test.prepared',{},()=>({changes:f.changes()}));
  assert.equal(f.context.busy,true);assert.ok(f.state.renewals.every(ttl=>ttl===f.r.config.activeCommandLeaseMs));
 });
 assert.equal(f.context.busy,false);assert.equal(f.state.renewals.at(-1),f.r.config.leaseMs);assert.equal(f.state.commits,1);
});
