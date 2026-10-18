(function(root){
  'use strict';
  const plans=new WeakMap(),fail=(name,message)=>{throw root.storage.error(name,message);};
  function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
  function register(report,plan){freeze(report);plans.set(report,{...plan,result:null,prepared:null});return report;}
  async function apply(report,confirmation={}){
    const plan=plans.get(report);if(!plan)fail('InvalidInputError','Preview this import first');
    if(confirmation.confirmed!==true)fail('ConfirmationRequiredError','Confirm the import scope');
    if(report.requiresCorrections&&confirmation.confirmedCorrections!==true)fail('ConfirmationRequiredError','Confirm linked financial corrections');
    if(report.requiresUpdates&&confirmation.confirmedUpdates!==true)fail('ConfirmationRequiredError','Confirm explicit profile updates');
    if(report.requiresConversion&&confirmation.confirmedConversion!==true)fail('ConfirmationRequiredError','Confirm conversion of protected demonstration records');
    if(report.globalErrors.length)fail('InvalidInputError','Resolve dataset validation errors');
    if((report.counts.skip||report.counts.error||report.counts.conflict)&&confirmation.confirmedSubset!==true)fail('ConfirmationRequiredError','Confirm the exact valid subset');
    if(report.unknown&&confirmation.ignoreUnknown!==true)fail('ConfirmationRequiredError','Review unmapped columns');
    if(plan.result)return{...plan.result,duplicate:true};
    if(!plan.changes.length)return{duplicate:false,noChanges:true,counts:report.counts};
    if(confirmation.signal?.aborted)fail('AbortError','Import cancelled before application');
    if(!report.staged){
      const intent={batchId:plan.batchId,sourceHash:report.sha256,source:plan.source,changes:await root.utils.integrity.sha256(root.utils.canonicalJson.stringify(plan.changes)),counts:report.counts};
      const result=await root.services.context.execute('import.'+report.module+'.csv',intent,(data,h)=>{if(h.datasetId!==plan.snapshot.datasetId)h.fail('DatasetChangedError','Import source dataset changed');return{changes:plan.changes,result:{batchId:plan.batchId,counts:report.counts}};},{operationId:plan.operationId,expectedRevision:report.revision});plan.result=result;return result;
    }
    const current=await root.services.context.snapshot();
    if(plan.prepared&&current.datasetId===plan.prepared.targetId){plan.result={duplicate:true,counts:report.counts,batchId:plan.batchId};return plan.result;}
    if(current.datasetId!==plan.snapshot.datasetId)fail('DatasetChangedError','Import source dataset changed');
    if(current.globalRevision!==report.revision)fail('RevisionConflictError','Data changed after preview');
    const options={...root.services.context.options(current),reason:plan.reason||'import',signal:confirmation.signal,onProgress:confirmation.onProgress};
    const receipts=await root.services.backup.list();if(!receipts.some(row=>row.state==='verified'&&row.dataRevision===current.dataRevision))fail('VerifiedBackupRequiredError','Verify a current copy before preparing a large import');
    if(current.dataRevision===Number.MAX_SAFE_INTEGER)fail('RevisionOverflowError','Dataset revision exhausted');
    plan.prepared=await root.storage.datasetManager.prepare({datasetId:current.datasetId,dataRevision:current.dataRevision+1,tables:plan.tables},options);
    if(confirmation.signal?.aborted)fail('AbortError','Import cancelled before activation');
    confirmation.onProgress?.({phase:'activating',completed:plan.prepared.total,total:plan.prepared.total});
    const result=await root.storage.datasetManager.activate(plan.prepared,options);await root.services.context.open();plan.result={...result,counts:report.counts,batchId:plan.batchId};return plan.result;
  }
  root.services.importBatches=Object.freeze({register,apply});
}(window.RescueManager));
