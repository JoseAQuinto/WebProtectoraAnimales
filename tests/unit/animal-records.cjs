'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { harness } = require('./support/service-harness.cjs');
function setup() { return harness({datasetId:'10000000-0000-4000-8000-000000000001',today:'2026-10-16',services:['animals'],catalogKinds:['species']}); }
async function enter(h) {
  return (await h.root.services.animals.registerEntry({animal:{name:'Animal ficticio',speciesId:h.catalog.species.id},date:'2026-10-15',entryReason:'Prueba',location:{kind:'shelter',id:h.location.id},availability:'available'})).result.animalId;
}
test('active care cannot disappear through archive or trash, and rejection preserves data',async()=>{
  const h=setup(),id=await enter(h),before=h.state();
  for(const method of ['archive','trash']) await assert.rejects(()=>h.root.services.animals[method](id),{name:'BusinessRuleError'});
  assert.equal(h.state(),before);
});
test('archive/trash/restore preserve closed stay history and replay does not add activity twice',async()=>{
  const h=setup(),id=await enter(h),animals=h.root.services.animals;
  await animals.recordExit({animalId:id,date:'2026-10-16',exitReason:'other',reason:'Salida documentada'});
  const episode=structuredClone(h.tables.stayEpisodes[0]),command={operationId:h.id()};
  await animals.archive(id,command); const count=h.tables.activityLog.length;
  assert.equal((await animals.archive(id,command)).duplicate,true);
  assert.equal(h.tables.activityLog.length,count);
  assert.ok(h.row('animals',id).archivedAt); await animals.trash(id); assert.ok(h.row('animals',id).deletedAt);
  await animals.restore(id); assert.equal(h.row('animals',id).archivedAt,null); assert.equal(h.row('animals',id).deletedAt,null);
  assert.equal(JSON.stringify(h.tables.stayEpisodes[0]),JSON.stringify(episode));
});
