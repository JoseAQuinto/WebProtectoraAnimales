(function(root){
  'use strict';
  const config=new Set(['organizationSettings','catalogOptions','locations','activityLog']);
  function status(snapshot){
    const batches=new Map();let business=0;
    for(const[table,rows]of Object.entries(snapshot.tables))for(const record of rows){
      if(record.origin==='demo'){if(!batches.has(record.originBatchId))batches.set(record.originBatchId,{id:record.originBatchId,count:0,createdAt:record.createdAt});const batch=batches.get(record.originBatchId);batch.count++;if(batch.createdAt>record.createdAt)batch.createdAt=record.createdAt;}
      else if(!config.has(table)&&!(table==='assets'&&record.type==='logo'))business++;
    }return{canLoad:!business&&!batches.size,businessRecords:business,batches:[...batches.values()].sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id))};
  }
  function rowLabel(table,record,tables){
    const direct=record.name||record.title||record.concept||record.description||record.originalName||record.customLabel;if(direct)return direct;
    const date=record.date||record.entryDate||record.startDate||record.adoptionDate||record.applicationDate||record.eventDate||record.reservationDate||'';
    const owner=record.animalId?tables.animals.find(row=>row.id===record.animalId)?.name:record.contactId?tables.contacts.find(row=>row.id===record.contactId)?.name:record.documentId?tables.documents.find(row=>row.id===record.documentId)?.title:'';
    return[owner,date||record.code].filter(Boolean).join(' · ');
  }
  const counts=()=>({create:0,update:0,link:0,skip:0,error:0,conflict:0,remove:0});
  function report(snapshot,batchId,operationId,tables,changes,rows,extra,reason){
    const globalErrors=root.domain.validateDataset(tables,{datasetId:snapshot.datasetId}).map(issue=>({field:issue.table+'.'+(issue.id||'')+'.'+issue.path,code:issue.code}));
    return root.services.importBatches.register({module:'demo',format:'demo',rows,globalErrors,counts:extra.counts,revision:snapshot.globalRevision,unknown:0,records:changes.length,staged:true,sha256:'',batchId,...extra},{snapshot,tables,changes,operationId,batchId,source:'demo',reason});
  }
  async function previewLoad(snapshot,options={}){
    if(!status(snapshot).canLoad)throw new root.core.errors.AppError('dm.loadBlocked');
    const batchId=options.batchId||root.utils.ids.uuidV4(),operationId=root.utils.ids.uuidV4(),built=await root.services.demoBuilder.build(snapshot,{...options,batchId,operationId});
    const result=counts();result.create=built.changes.length;const rows=built.changes.map(({table,record})=>({table,id:record.id,name:rowLabel(table,record,built.tables),action:'create'}));
    return report(snapshot,batchId,operationId,built.tables,built.changes,rows,{counts:result,kind:'load',language:options.language||'en',referenceDate:built.today,requiresConversion:false},'demo_load');
  }
  function previewClear(snapshot,batchId,options={}){
    if(!root.utils.ids.isUuidV4(batchId))throw root.storage.error('InvalidInputError','Select a demonstration batch');
    const selected=new Map(),all=[];for(const[table,rows]of Object.entries(snapshot.tables))for(const record of rows){const key=table+'/'+record.id;all.push({table,record,key});if(record.origin==='demo'&&record.originBatchId===batchId)selected.set(key,{table,record});}
    if(!selected.size)throw new root.core.errors.AppError('dm.noBatch');
    const graph=new Map([...selected.keys()].map(key=>[key,new Set()])),seeds=new Set(),dependencies=[];
    for(const{table,record,key}of all)for(const target of root.services.recordGraph.references(table,record)){
      const targetKey=target.table+'/'+target.id;if(!selected.has(targetKey))continue;
      if(selected.has(key)){graph.get(key).add(targetKey);graph.get(targetKey).add(key);}else{seeds.add(targetKey);dependencies.push({table,id:record.id,name:rowLabel(table,record,snapshot.tables),targetTable:target.table,targetId:target.id,path:target.path});}
    }
    const protectedRows=new Set(seeds),queue=[...seeds];for(let i=0;i<queue.length;i++)for(const key of graph.get(queue[i]))if(!protectedRows.has(key)){protectedRows.add(key);queue.push(key);}
    const now=options.now||new Date().toISOString(),today=root.utils.dates.today(snapshot.tables.organizationSettings[0].timeZone,Date.parse(now)),tables={},changes=[],rows=[],result=counts(),operationId=root.utils.ids.uuidV4(),replacements=new Map();
    for(const[key,{table,record}]of selected){
      if(protectedRows.has(key)){
        if(record.revision===Number.MAX_SAFE_INTEGER)throw root.storage.error('RevisionOverflowError','Record revision exhausted');
        const replacement=root.domain.createRecord(table,{...record,origin:'real',originBatchId:null,revision:record.revision+1,updatedAt:now},{datasetId:snapshot.datasetId,today,now});replacements.set(key,replacement);changes.push({table,record:replacement,expectedRevision:record.revision});result.update++;rows.push({table,id:record.id,name:rowLabel(table,record,snapshot.tables),action:'convert'});
      }else{changes.push({table,record,expectedRevision:record.revision});result.remove++;rows.push({table,id:record.id,name:rowLabel(table,record,snapshot.tables),action:'remove'});}
    }
    for(const[table,values]of Object.entries(snapshot.tables))tables[table]=values.filter(record=>!selected.has(table+'/'+record.id)||protectedRows.has(table+'/'+record.id)).map(record=>replacements.get(table+'/'+record.id)||record);
    const log=root.domain.createRecord('activityLog',{operation:'demo_clear',occurredAt:now,operationId,target:null,summaryParameters:{code:'demo.clear',previousId:batchId,count:result.remove,field:String(result.update)}},{datasetId:snapshot.datasetId,now,today});tables.activityLog.push(log);changes.push({table:'activityLog',record:log,expectedRevision:null});
    return report(snapshot,batchId,operationId,tables,changes,rows,{counts:result,kind:'clear',dependencies,requiresConversion:protectedRows.size>0},'demo_clear');
  }
  root.services.demo=Object.freeze({status,previewLoad,previewClear,apply:(report,confirmation)=>root.services.importBatches.apply(report,confirmation)});
}(window.RescueManager));
