(function(root){
  'use strict';
  const s=root.storage,tables=s.schema.tables,run=(...args)=>s.transactions.run(...args),fail=(name,message)=>{throw s.error(name,message);};
  const signature=target=>root.utils.canonicalJson.stringify(target);
  function review(id){
    if(!root.utils.ids.isUuidV4(id))return Promise.reject(s.error('InvalidInputError','Select a dataset'));
    return run(['meta','datasets',...tables],'readonly',(tx,api)=>api.request(tx.objectStore('meta').get('active'),active=>{
      if(active?.datasetId===id)fail('DatasetChangedError','The active dataset cannot be removed');
      api.request(tx.objectStore('datasets').get(id),target=>{
        if(!target||!['staging','retired'].includes(target.state))fail('DatasetChangedError','The selected inactive dataset is unavailable');
        const value={target,active,counts:{},assetBytes:0,organizationName:null};let pending=tables.length+2;
        const done=()=>{if(--pending===0){value.records=Object.values(value.counts).reduce((sum,count)=>sum+count,0);api.setResult(value);}};
        for(const table of tables)api.request(tx.objectStore(table).index('byDataset').count(IDBKeyRange.only(id)),count=>{value.counts[table]=count;done();});
        api.request(tx.objectStore('organizationSettings').index('byDataset').getAll(IDBKeyRange.only(id),2),rows=>{value.organizationName=rows[0]?.name||null;done();});
        api.request(tx.objectStore('assets').index('byDataset').openCursor(IDBKeyRange.only(id)),cursor=>{if(cursor){value.assetBytes+=cursor.value.byteLength;cursor.continue();}else done();});
      });
    }));
  }
  async function remove(plan,options){
    if(!plan||!root.utils.ids.isUuidV4(plan.target?.id)||plan.target.id===options.datasetId||!root.utils.ids.isUuidV4(options.operationId))fail('InvalidInputError','Select exactly one inactive dataset');
    if(options.signal?.aborted)fail('AbortError','Cleanup cancelled');let abort;
    try{return await run(['meta','datasets','operations','backupReceipts',...tables],'readwrite',(tx,api)=>{
      abort=()=>api.fail(s.error('AbortError','Cleanup cancelled before transaction completion'));options.signal?.addEventListener('abort',abort,{once:true});if(options.signal?.aborted){abort();return;}
      api.request(tx.objectStore('meta').get('active'),active=>{
        if(!active||active.datasetId!==options.datasetId||active.datasetId===plan.target.id)fail('DatasetChangedError','The active dataset changed');
        api.request(tx.objectStore('meta').get('writer'),lease=>{
          if(!lease||lease.datasetId!==active.datasetId||lease.owner!==options.owner||lease.token!==options.leaseToken||lease.expiresAt<=Date.now())fail('LeaseLostError','This tab no longer controls writes');
          api.request(tx.objectStore('operations').get([active.datasetId,options.operationId]),previous=>{
            if(previous){if(previous.fingerprint!==options.fingerprint)fail('IdempotencyConflictError','Cleanup intent changed');api.setResult({operationId:previous.id,revision:previous.revisionAfter,activeRevision:active.revision,duplicate:true,result:previous.result});return;}
            if(active.revision!==options.expectedRevision)fail('RevisionConflictError','Data changed since cleanup review');
            api.request(tx.objectStore('datasets').get(plan.target.id),target=>{
              if(target&&target.schemaVersion!==root.config.schemaVersion)fail('VersionError','Use a compatible application to review this dataset');
              if(!target||!['staging','retired'].includes(target.state)||signature(target)!==signature(plan.target))fail('RevisionConflictError','The selected preparation or recovery changed');
              api.request(tx.objectStore('datasets').get(active.datasetId),dataset=>{
                if(!dataset||dataset.state!=='active'||dataset.schemaVersion!==root.config.schemaVersion||dataset.dataRevision!==plan.dataRevision)fail('RevisionConflictError','Current data changed');
                api.request(tx.objectStore('backupReceipts').index('byDataset').getAll(IDBKeyRange.only(active.datasetId)),currentCopies=>{
                  if(!currentCopies.some(row=>row.state==='verified'&&row.dataRevision===dataset.dataRevision))fail('VerifiedBackupRequiredError','Verify a current external backup');
                  api.request(tx.objectStore('backupReceipts').index('byDataset').getAll(IDBKeyRange.only(target.id)),targetCopies=>{
                    if(target.state==='retired'&&!targetCopies.some(row=>row.state==='verified'&&row.dataRevision===target.dataRevision))throw new root.core.errors.AppError('rt.targetCopyRequired');
                    let checks=tables.length;for(const table of tables)api.request(tx.objectStore(table).index('byDataset').count(IDBKeyRange.only(target.id)),count=>{if(count!==plan.counts[table])fail('RevisionConflictError','Selected dataset records changed');if(--checks===0)erase(dataset,active,target);});
                  });
                });
              });
            });
          });
        });
      });
      function erase(dataset,active,target){
        if(!Number.isSafeInteger(active.revision)||active.revision>=Number.MAX_SAFE_INTEGER||!Number.isSafeInteger(dataset.dataRevision)||dataset.dataRevision>=Number.MAX_SAFE_INTEGER)fail('RevisionOverflowError','Revision cannot be incremented');
        let remaining=tables.length+2,removed=0;
        const done=()=>{if(--remaining!==0)return;
          const now=new Date().toISOString(),result={datasetId:target.id,state:target.state,records:removed,assetBytes:plan.assetBytes},revision=active.revision+1;
          const log=root.domain.createRecord('activityLog',{operation:'delete',occurredAt:now,operationId:options.operationId,target:null,summaryParameters:{code:'retention.deleteDataset',previousId:target.id,field:target.state,count:1}},{datasetId:active.datasetId,now,today:plan.today});
          tx.objectStore('activityLog').add(log);tx.objectStore('datasets').delete(target.id);tx.objectStore('meta').delete('animalSequence:'+target.id);
          tx.objectStore('datasets').put({...dataset,dataRevision:dataset.dataRevision+1,updatedAt:now});tx.objectStore('meta').put({...active,revision});
          tx.objectStore('operations').add({datasetId:active.datasetId,id:options.operationId,fingerprint:options.fingerprint,revisionBefore:active.revision,revisionAfter:revision,result,createdAt:now});
          api.setResult({operationId:options.operationId,revision,activeRevision:revision,duplicate:false,result});
        };
        for(const table of tables)api.request(tx.objectStore(table).index('byDataset').openKeyCursor(IDBKeyRange.only(target.id)),cursor=>{
          if(cursor){tx.objectStore(table).delete(cursor.primaryKey);removed++;options.onProgress?.({completed:removed,total:plan.records});cursor.continue();}else done();
        });
        api.request(tx.objectStore('operations').openKeyCursor(IDBKeyRange.bound([target.id],[target.id,[]])),cursor=>{if(cursor){tx.objectStore('operations').delete(cursor.primaryKey);cursor.continue();}else done();});
        api.request(tx.objectStore('backupReceipts').index('byDataset').openKeyCursor(IDBKeyRange.only(target.id)),cursor=>{if(cursor){tx.objectStore('backupReceipts').delete(cursor.primaryKey);cursor.continue();}else done();});
      }
    });}finally{if(abort)options.signal?.removeEventListener('abort',abort);}
  }
  s.retention=Object.freeze({review,remove});
}(window.RescueManager));
