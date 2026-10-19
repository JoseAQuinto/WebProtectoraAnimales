'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{descendants,verifiedRoot}=require('../e2e/owned-processes.cjs');
const row=(pid,parent,seconds)=>({ProcessId:pid,ParentProcessId:parent,CreatedAt:'2026-10-19T16:00:'+String(seconds).padStart(2,'0')+'.000Z'});
test('owned browser descendants exclude children older than their current PID-reused parent',()=>{
  const root=row(10,1,20),child=row(11,10,21),stale=row(12,11,1),grandchild=row(13,11,22),rows=[stale,grandchild,root,child];
  assert.deepEqual(descendants(rows,root).map(r=>r.ProcessId),[13,10,11]);
});
test('a missing or reused browser root identity never authorizes a tree',()=>{
  const root=row(10,1,20);assert.deepEqual(descendants([row(10,1,30),row(11,10,31)],root),[]);assert.deepEqual(descendants([row(11,10,21)],root),[]);
});
test('unreadable child command lines require valid chronological ancestry, not a PID alone',()=>{
  const root=row(10,1,20),unknown={...row(11,10,21),CommandLine:null},invalid={ProcessId:12,ParentProcessId:10,CreatedAt:null};assert.deepEqual(descendants([root,unknown,invalid],root),[root,unknown]);
});
test('browser root verification requires both this launch time and its explicit isolated profile',()=>{
  const root={...row(10,1,20),CommandLine:'chrome --user-data-dir=C:\\project\\.tmp\\owned-profile'},start=Date.parse(root.CreatedAt);
  assert.equal(verifiedRoot([root],10,'c:\\PROJECT\\.tmp\\owned-profile',start),root);assert.equal(verifiedRoot([root],10,'unrelated-profile',start),null);assert.equal(verifiedRoot([root],10,'owned-profile',start+3000),null);
});
