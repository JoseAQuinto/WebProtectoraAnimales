(function(root){
  'use strict';
  const plans=new WeakMap(),fail=(name,message)=>{throw root.storage.error(name,message);};
  function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
  // Plain text labels only; the UI places them with textContent.
  function label(tables,table,row){
    const find=(name,id)=>(tables[name]||[]).find(item=>item.id===id);
    if(table==='animals')return{title:row.name,detail:row.code};
    if(table==='contacts')return{title:row.name,detail:row.email||''};
    if(table==='documents')return{title:row.title,detail:row.date};
    if(table==='weightMeasurements')return{title:find('animals',row.animalId)?.name||'',detail:row.date+' · '+row.grams+' g'};
    if(table==='volunteerHours'){const profile=find('volunteerProfiles',row.volunteerProfileId);return{title:find('contacts',profile?.contactId)?.name||'',detail:row.date+' · '+row.activity+' · '+row.durationMinutes+' min'};}
    return{title:row.name||row.title||row.concept||row.id,detail:''};
  }
  async function snapshot(){const value=await root.services.context.snapshot();if(!value?.tables.organizationSettings[0])fail('DatasetChangedError','An active organization is required');return value;}
  async function list(page=1){
    if(!Number.isSafeInteger(page)||page<1)fail('InvalidInputError','Choose a page');
    const value=await snapshot(),found=root.domain.trashClosure.roots(value.tables),pages=Math.max(1,Math.ceil(found.length/20));page=Math.min(page,pages);
    return{page,pages,total:found.length,rows:found.slice((page-1)*20,page*20).map(item=>({...item,...label(value.tables,item.table,value.tables[item.table].find(row=>row.id===item.id))}))};
  }
  // Read-only review of one root; the private plan keeps the exact closure and civil date.
  async function preview(table,id){
    const value=await snapshot(),today=root.utils.dates.today(value.tables.organizationSettings[0].timeZone),analysis=root.domain.trashClosure.analyze(value.tables,table,id,{today});
    if(!analysis.root)fail('RecordNotFoundError','The record no longer exists');
    const row=value.tables[table].find(item=>item.id===id),report=freeze({...analysis,label:label(value.tables,table,row),datasetId:value.datasetId,revision:value.globalRevision,dataRevision:value.dataRevision});
    plans.set(report,{today,operationId:root.utils.ids.uuidV4(),fingerprint:await root.utils.integrity.sha256(root.utils.canonicalJson.stringify({type:'trash.purge',datasetId:report.datasetId,revision:report.revision,records:report.records})),result:null});return report;
  }
  async function apply(report,confirmation={}){
    const saved=plans.get(report);if(!saved)fail('InvalidInputError','Review this deletion first');
    if(report.blocked)fail('InvalidStateError','Resolve the blocking relations first');
    if(confirmation.confirmed!==true||confirmation.copyConfirmed!==true)fail('ConfirmationRequiredError','Confirm exactly this permanent deletion and the retained external copy');
    if(saved.result)return{...saved.result,duplicate:true};
    const current=await root.services.context.snapshot();if(current?.datasetId!==report.datasetId)fail('DatasetChangedError','The active organization changed');
    const options={...root.services.context.options(current),expectedRevision:report.revision,operationId:saved.operationId,fingerprint:saved.fingerprint,signal:confirmation.signal,onProgress:confirmation.onProgress};
    saved.result=await root.storage.trashPurge.remove({table:report.root.table,id:report.root.id,records:report.records,dataRevision:report.dataRevision,today:saved.today},options);
    await root.services.context.snapshot();return saved.result;
  }
  root.services.trashPurge=Object.freeze({list,preview,apply});
}(window.RescueManager));
