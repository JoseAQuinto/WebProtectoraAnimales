(function(root){
  'use strict';
  function create(snapshot,options){
    const now=options.now||new Date().toISOString(),today=root.utils.dates.today(snapshot.tables.organizationSettings[0].timeZone,Date.parse(now)),tables=Object.fromEntries(Object.entries(snapshot.tables).map(([table,rows])=>[table,rows.slice()])),changes=new Map(),originals=new Map(),positions={};
    for(const[table,rows]of Object.entries(tables)){positions[table]=new Map();rows.forEach((record,index)=>{positions[table].set(record.id,index);originals.set(table+'/'+record.id,record);});}
    const fail=(name,message)=>{throw root.storage.error(name,message);},get=(table,id)=>tables[table][positions[table].get(id)]||null;
    function put(change){const{table,record}=change,key=table+'/'+record.id,at=positions[table].get(record.id);if(at===undefined){positions[table].set(record.id,tables[table].length);tables[table].push(record);}else tables[table][at]=record;changes.set(key,{table,record,expectedRevision:originals.get(key)?.revision??null});}
    function row(primaryTable,primaryId){
      const pending=new Map(),cache=new Map();
      const data=new Proxy(tables,{get(target,table){if(typeof table!=='string'||!Object.hasOwn(target,table))return target[table];if(!cache.has(table)){const result=target[table].slice(),at=new Map(result.map((record,index)=>[record.id,index]));for(const change of pending.values())if(change.table===table){const index=at.get(change.record.id);if(index===undefined){at.set(change.record.id,result.length);result.push(change.record);}else result[index]=change.record;}cache.set(table,result);}return cache.get(table);}});
      const context={datasetId:snapshot.datasetId,now,today};
      const h={now,today,operationId:root.utils.ids.uuidV4(),datasetId:snapshot.datasetId,fail,
        find(table,id){const record=pending.get(table+'/'+id)?.record||get(table,id);if(!record)fail('RecordNotFoundError','Choose an existing relation');return record;},
        create(table,input){return root.domain.createRecord(table,{...input,...(table===primaryTable?{id:primaryId}:{}),origin:'import',originBatchId:options.batchId},context);},
        edit(table,previous,patch){const original=originals.get(table+'/'+previous.id);if(original?.revision===Number.MAX_SAFE_INTEGER)fail('RevisionOverflowError','Record revision exhausted');return root.domain.createRecord(table,{...previous,...patch,revision:original?original.revision+1:1,updatedAt:now},context);},
        insert:(table,record)=>({table,record,expectedRevision:null}),replace:(table,record)=>({table,record,expectedRevision:originals.get(table+'/'+record.id)?.revision??0})};
      function stage(list){for(const change of list){const key=change.table+'/'+change.record.id,original=originals.get(key);if(change.expectedRevision===null&&(pending.has(key)||get(change.table,change.record.id)))fail('RevisionConflictError','Cannot create an existing UUID');const record={...change.record,revision:original?original.revision+1:1};pending.set(key,{...change,record});cache.delete(change.table);}h.operationId=root.utils.ids.uuidV4();}
      return{data,h,stage,commit:()=>{pending.forEach(put);},get:(table,id)=>pending.get(table+'/'+id)?.record||get(table,id)};
    }
    return{tables,changes,originals,now,today,get,row};
  }
  root.services.importWorkspace=Object.freeze({create});
}(window.RescueManager));
