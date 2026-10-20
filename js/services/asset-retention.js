(function(root){
  'use strict';
  const plans=new WeakMap(),fail=(name,message)=>{throw root.storage.error(name,message);};
  function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
  // Read-only review of the active dataset: nothing is selected or removed here.
  async function preview(){
    const active=await root.services.context.snapshot(),organization=active?.tables.organizationSettings[0];if(!organization)fail('DatasetChangedError','An active organization is required');
    const analysis=root.domain.assetReferences.analyze(active.tables),{references,...summary}=analysis;
    const report=freeze({...summary,datasetId:active.datasetId,revision:active.globalRevision,dataRevision:active.dataRevision,limitBytes:root.config.limits.embeddedAssetBytes});
    plans.set(report,{today:root.utils.dates.today(organization.timeZone),operationId:root.utils.ids.uuidV4(),fingerprint:null,result:null});return report;
  }
  function selection(report,keys){
    if(!Array.isArray(keys)||!keys.length||new Set(keys).size!==keys.length)fail('InvalidInputError','Select at least one file group');
    return keys.map(key=>{const group=report.groups.find(row=>row.key===key);if(!group)fail('InvalidInputError','Select reviewed file groups only');return group;});
  }
  async function apply(report,confirmation={}){
    const saved=plans.get(report);if(!saved)fail('InvalidInputError','Review this cleanup first');
    const groups=selection(report,confirmation.groups);
    if(confirmation.confirmed!==true||confirmation.copyConfirmed!==true)fail('ConfirmationRequiredError','Confirm exactly this permanent file removal and the retained external copy');
    const assetIds=groups.flatMap(group=>group.assetIds).sort(),signatures=Object.fromEntries(groups.flatMap(group=>group.files.map(file=>[file.id,file.signature])));
    const fingerprint=await root.utils.integrity.sha256(root.utils.canonicalJson.stringify({type:'retention.deleteAssets',datasetId:report.datasetId,revision:report.revision,signatures}));
    if(saved.result){if(saved.fingerprint!==fingerprint)fail('IdempotencyConflictError','This review was already applied to another selection');return{...saved.result,duplicate:true};}
    const current=await root.services.context.snapshot();if(current?.datasetId!==report.datasetId)fail('DatasetChangedError','The active organization changed');
    const options={...root.services.context.options(current),expectedRevision:report.revision,operationId:saved.operationId,fingerprint,signal:confirmation.signal,onProgress:confirmation.onProgress};
    const result=await root.storage.assetRetention.remove({assetIds,signatures,dataRevision:report.dataRevision,today:saved.today},options);
    saved.fingerprint=fingerprint;saved.result=result;await root.services.context.snapshot();return result;
  }
  // Inspection before removal reuses the validated reader; a changed or reused file is refused.
  async function read(report,assetId){
    if(!plans.has(report)||!report.groups.some(group=>group.assetIds.includes(assetId)))fail('InvalidInputError','Select a reviewed unused file');
    const file=await root.services.assetFiles.readAsset(assetId),reviewed=report.groups.flatMap(group=>group.files).find(row=>row.id===assetId);
    if(file.sha256!==reviewed.sha256||file.byteLength!==reviewed.byteLength)fail('RevisionConflictError','The file changed since review');return file;
  }
  root.services.assetRetention=Object.freeze({preview,apply,read});
}(window.RescueManager));
