(function(root){
  'use strict';
  const plans=new WeakMap(),fail=(name,message)=>{throw root.storage.error(name,message);};
  function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
  async function list(page=1){if(!Number.isSafeInteger(page)||page<1)fail('InvalidInputError','Choose a page');const datasets=(await root.storage.datasetManager.list()).filter(row=>['staging','retired'].includes(row.state)).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)||a.id.localeCompare(b.id)),pages=Math.max(1,Math.ceil(datasets.length/20));page=Math.min(page,pages);const results=await Promise.allSettled(datasets.slice((page-1)*20,page*20).map(row=>root.storage.retention.review(row.id)));for(const result of results)if(result.status==='rejected'&&!['DatasetChangedError','RevisionConflictError'].includes(result.reason?.name))throw result.reason;return{page,pages,total:datasets.length,rows:results.filter(row=>row.status==='fulfilled').map(row=>row.value)};}
  async function preview(id){
    const active=await root.services.context.snapshot();if(!active?.tables.organizationSettings[0])fail('DatasetChangedError','An active organization is required');
    const target=await root.storage.retention.review(id);if(target.active?.datasetId!==active.datasetId||target.active.revision!==active.globalRevision)fail('RevisionConflictError','Data changed during cleanup review');
    const report=freeze({...target,datasetId:active.datasetId,revision:active.globalRevision,dataRevision:active.dataRevision});
    const plan={...report,today:root.utils.dates.today(active.tables.organizationSettings[0].timeZone)},fingerprint=await root.utils.integrity.sha256(root.utils.canonicalJson.stringify({target:report.target,counts:report.counts,datasetId:report.datasetId,revision:report.revision}));plans.set(report,{plan,fingerprint,operationId:root.utils.ids.uuidV4(),result:null});return report;
  }
  async function apply(report,confirmation={}){
    const saved=plans.get(report);if(!saved)fail('InvalidInputError','Review this cleanup first');
    if(confirmation.confirmed!==true||(report.target.state==='retired'&&confirmation.targetCopyConfirmed!==true))fail('ConfirmationRequiredError','Confirm exactly this permanent cleanup and the retained external copy');
    if(saved.result)return{...saved.result,duplicate:true};const current=await root.services.context.snapshot();if(current?.datasetId!==report.datasetId)fail('DatasetChangedError','The active organization changed');
    const options={...root.services.context.options(current),expectedRevision:report.revision,operationId:saved.operationId,fingerprint:saved.fingerprint,signal:confirmation.signal,onProgress:confirmation.onProgress};
    saved.result=await root.storage.retention.remove(saved.plan,options);await root.services.context.snapshot();return saved.result;
  }
  root.services.retention=Object.freeze({list,preview,apply});
}(window.RescueManager));
