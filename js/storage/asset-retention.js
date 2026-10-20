(function(root){
  'use strict';
  const s=root.storage,tables=s.schema.tables,run=(...args)=>s.transactions.run(...args),fail=(name,message)=>{throw s.error(name,message);};
  // Removes reviewed active-dataset files without incoming references. Every guard, the full reference
  // analysis and dataset validation are repeated inside the same readwrite transaction as the deletes.
  async function remove(plan,options){
    const ids=Array.isArray(plan?.assetIds)?plan.assetIds:[];
    if(!ids.length||new Set(ids).size!==ids.length||!ids.every(id=>root.utils.ids.isUuidV4(id))||!plan.signatures||!root.utils.ids.isUuidV4(options.datasetId)||!root.utils.ids.isUuidV4(options.operationId))fail('InvalidInputError','Select at least one reviewed file group');
    if(options.signal?.aborted)fail('AbortError','Cleanup cancelled');let abort;
    try{return await run(['meta','datasets','operations','backupReceipts',...tables],'readwrite',(tx,api)=>{
      abort=()=>api.fail(s.error('AbortError','Cleanup cancelled before transaction completion'));options.signal?.addEventListener('abort',abort,{once:true});if(options.signal?.aborted){abort();return;}
      api.request(tx.objectStore('meta').get('active'),active=>{
        if(!active||active.datasetId!==options.datasetId)fail('DatasetChangedError','The active dataset changed');
        api.request(tx.objectStore('meta').get('writer'),lease=>{
          if(!lease||lease.datasetId!==active.datasetId||lease.owner!==options.owner||lease.token!==options.leaseToken||lease.expiresAt<=Date.now())fail('LeaseLostError','This tab no longer controls writes');
          api.request(tx.objectStore('operations').get([active.datasetId,options.operationId]),previous=>{
            if(previous){if(previous.fingerprint!==options.fingerprint)fail('IdempotencyConflictError','Cleanup intent changed');api.setResult({operationId:previous.id,revision:previous.revisionAfter,activeRevision:active.revision,duplicate:true,result:previous.result});return;}
            if(active.revision!==options.expectedRevision)fail('RevisionConflictError','Data changed since cleanup review');
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
        const analysis=root.domain.assetReferences.analyze(data),selected=new Set(ids),candidates=new Map();
        analysis.groups.forEach(group=>group.files.forEach(file=>candidates.set(file.id,{file,group})));
        for(const id of ids){
          const entry=candidates.get(id);
          if(!entry||entry.file.signature!==plan.signatures[id])fail('RevisionConflictError','A selected file is referenced again or changed');
          if(!entry.group.assetIds.every(member=>selected.has(member)))fail('InvalidInputError','Select complete file groups only');
        }
        const now=new Date().toISOString(),revision=active.revision+1,bytes=ids.reduce((sum,id)=>sum+candidates.get(id).file.byteLength,0);
        const log=root.domain.createRecord('activityLog',{operation:'delete',occurredAt:now,operationId:options.operationId,target:null,summaryParameters:{code:'retention.deleteAssets',field:'assets',count:ids.length}},{datasetId:active.datasetId,now,today:plan.today});
        const next={...data,assets:data.assets.filter(row=>!selected.has(row.id)),activityLog:[...data.activityLog,log]};
        root.domain.validateDataset(next,{datasetId:active.datasetId,today:plan.today,throwOnError:true});
        const result={count:ids.length,bytes,assetIds:[...ids].sort()};let removed=0;
        for(const id of ids)api.request(tx.objectStore('assets').delete([active.datasetId,id]),()=>{removed++;options.onProgress?.({completed:removed,total:ids.length});});
        tx.objectStore('activityLog').add(log);
        tx.objectStore('datasets').put({...dataset,dataRevision:dataset.dataRevision+1,updatedAt:now});tx.objectStore('meta').put({...active,revision});
        tx.objectStore('operations').add({datasetId:active.datasetId,id:options.operationId,fingerprint:options.fingerprint,revisionBefore:active.revision,revisionAfter:revision,result,createdAt:now});
        api.setResult({operationId:options.operationId,revision,activeRevision:revision,duplicate:false,result});
      }
    });}finally{if(abort)options.signal?.removeEventListener('abort',abort);}
  }
  s.assetRetention=Object.freeze({remove});
}(window.RescueManager));
