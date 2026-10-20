(function(root){
  'use strict';
  const s=root.storage,tables=s.schema.tables,run=(...args)=>s.transactions.run(...args),fail=(name,message)=>{throw s.error(name,message);};
  // Permanently removes one reviewed trashed root and its owned closure. Guards, closure analysis
  // and dataset validation are repeated inside the same readwrite transaction as the deletes.
  async function remove(plan,options){
    if(!plan||!tables.includes(plan.table)||!root.utils.ids.isUuidV4(plan.id)||!Array.isArray(plan.records)||!plan.records.length||!root.utils.ids.isUuidV4(options.datasetId)||!root.utils.ids.isUuidV4(options.operationId))fail('InvalidInputError','Review exactly one trashed record');
    if(options.signal?.aborted)fail('AbortError','Deletion cancelled');let abort;
    try{return await run(['meta','datasets','operations','backupReceipts',...tables],'readwrite',(tx,api)=>{
      abort=()=>api.fail(s.error('AbortError','Deletion cancelled before transaction completion'));options.signal?.addEventListener('abort',abort,{once:true});if(options.signal?.aborted){abort();return;}
      api.request(tx.objectStore('meta').get('active'),active=>{
        if(!active||active.datasetId!==options.datasetId)fail('DatasetChangedError','The active dataset changed');
        api.request(tx.objectStore('meta').get('writer'),lease=>{
          if(!lease||lease.datasetId!==active.datasetId||lease.owner!==options.owner||lease.token!==options.leaseToken||lease.expiresAt<=Date.now())fail('LeaseLostError','This tab no longer controls writes');
          api.request(tx.objectStore('operations').get([active.datasetId,options.operationId]),previous=>{
            if(previous){if(previous.fingerprint!==options.fingerprint)fail('IdempotencyConflictError','Deletion intent changed');api.setResult({operationId:previous.id,revision:previous.revisionAfter,activeRevision:active.revision,duplicate:true,result:previous.result});return;}
            if(active.revision!==options.expectedRevision)fail('RevisionConflictError','Data changed since deletion review');
            api.request(tx.objectStore('datasets').get(active.datasetId),dataset=>{
              if(!dataset||dataset.state!=='active'||dataset.schemaVersion!==root.config.schemaVersion||dataset.dataRevision!==plan.dataRevision)fail('RevisionConflictError','Current data changed');
              api.request(tx.objectStore('backupReceipts').index('byDataset').getAll(IDBKeyRange.only(active.datasetId)),copies=>{
                if(!copies.some(row=>row.state==='verified'&&row.dataRevision===dataset.dataRevision))fail('VerifiedBackupRequiredError','Verify a current external backup');
                const data={};let pending=tables.length;
                for(const table of tables)api.request(tx.objectStore(table).index('byDataset').getAll(IDBKeyRange.only(active.datasetId)),rows=>{data[table]=rows;if(--pending===0)erase(dataset,active,data);});
              });
            });
          });
        });
      });
      function erase(dataset,active,data){
        if(!Number.isSafeInteger(active.revision)||active.revision>=Number.MAX_SAFE_INTEGER||!Number.isSafeInteger(dataset.dataRevision)||dataset.dataRevision>=Number.MAX_SAFE_INTEGER)fail('RevisionOverflowError','Revision cannot be incremented');
        const analysis=root.domain.trashClosure.analyze(data,plan.table,plan.id,{today:plan.today});
        if(analysis.blocked)fail('InvalidStateError','The trashed record now has blocking relations');
        if(root.utils.canonicalJson.stringify(analysis.records)!==root.utils.canonicalJson.stringify(plan.records))fail('RevisionConflictError','The reviewed records changed');
        const now=new Date().toISOString(),revision=active.revision+1,total=analysis.records.length;
        const log=root.domain.createRecord('activityLog',{operation:'delete',occurredAt:now,operationId:options.operationId,target:null,summaryParameters:{code:'trash.purge',field:plan.table,previousId:plan.id,count:total}},{datasetId:active.datasetId,now,today:plan.today});
        const result={table:plan.table,id:plan.id,records:total,counts:analysis.counts,assetBytes:analysis.assetBytes};let removed=0;
        for(const record of analysis.records)api.request(tx.objectStore(record.table).delete([active.datasetId,record.id]),()=>{removed++;options.onProgress?.({completed:removed,total});});
        tx.objectStore('activityLog').add(log);
        tx.objectStore('datasets').put({...dataset,dataRevision:dataset.dataRevision+1,updatedAt:now});tx.objectStore('meta').put({...active,revision});
        tx.objectStore('operations').add({datasetId:active.datasetId,id:options.operationId,fingerprint:options.fingerprint,revisionBefore:active.revision,revisionAfter:revision,result,createdAt:now});
        api.setResult({operationId:options.operationId,revision,activeRevision:revision,duplicate:false,result});
      }
    });}finally{if(abort)options.signal?.removeEventListener('abort',abort);}
  }
  s.trashPurge=Object.freeze({remove});
}(window.RescueManager));
