(function(root){
  'use strict';
  const adapter=root.services.importRelated,identities=new WeakMap();
  const error=(name,message)=>{throw root.storage.error(name,message);};
  async function preview(kind,snapshot,parsed,mapping,options={},decisions={}){
    const def=adapter.definitions[kind];if(!def||!root.utils.ids.isUuidV4(options.batchId)||!Array.isArray(mapping)||mapping.length!==parsed.headers.length||mapping.some(key=>key&&!def.fields.includes(key))||new Set(mapping.filter(Boolean)).size!==mapping.filter(Boolean).length)throw new TypeError('Invalid related import mapping');
    if(options.remember&&(!options.source||typeof options.source!=='string'||options.source!==options.source.trim()||options.source.length>120))throw new TypeError('Choose an import source name');
    const ws=root.services.importWorkspace.create(snapshot,options),operationId=root.utils.ids.uuidV4(),fileCode=(kind==='applications'?'apps':kind)+'.csv:'+parsed.sha256,rows=[],counts={create:0,update:0,link:0,skip:0,error:0,conflict:0},touched=new Set();let unknown=0;
    if(!identities.has(parsed))identities.set(parsed,new Map());const byKind=identities.get(parsed);if(!byKind.has(kind))byKind.set(kind,new Map(parsed.rows.map(row=>[row.line,root.utils.ids.uuidV4()])));const ids=byKind.get(kind);
    const identityKey=row=>JSON.stringify([row.source,row.entityType,row.externalId]),identityIndex=new Map(ws.tables.importIdentityMap.map(row=>[identityKey(row),row]));
    for(const source of parsed.rows){
      if(rows.length%100===0){if(options.signal?.aborted)error('AbortError','Import preview cancelled');options.onProgress?.({completed:rows.length,total:parsed.rows.length});await new Promise(resolve=>setTimeout(resolve,0));if(options.signal?.aborted)error('AbortError','Import preview cancelled');}
      const decision=decisions[source.line]||{},raw={};mapping.forEach((key,index)=>{if(key)raw[key]=source.cells[index]||'';else if(source.cells[index])unknown++;});
      const result={line:source.line,name:'',action:decision.action||'',targetId:decision.targetId||null,matches:[],errors:[],warnings:[],externalId:raw.external_id||null};
      if(decision.action==='skip'){result.action='skip';counts.skip++;rows.push(result);continue;}
      try{
        if(source.errors.length)throw Object.assign(new Error('CSV structure'),{issues:source.errors});
        const value=adapter.normalize(kind,raw,ws.tables,options),exact=value.id?ws.get(def.table,value.id):null,key=identityKey({source:options.source,entityType:def.entity,externalId:value.externalId}),identity=options.remember&&value.externalId?identityIndex.get(key):null;
        const matches=new Map();for(const item of[...(exact?[{id:exact.id,reasons:['uuid'],strong:true}]:[]),...(identity?[{id:identity.entityId,reasons:['external_id'],strong:true}]:[]),...adapter.matches(kind,value,ws.tables)]){
          const previous=matches.get(item.id);if(previous)previous.reasons.push(...item.reasons.filter(reason=>!previous.reasons.includes(reason)));else matches.set(item.id,{...item,name:adapter.label(kind,ws.get(def.table,item.id),ws.tables)});
        }
        result.matches=[...matches.values()];result.action=decision.action||(matches.size?'undecided':'create');result.targetId=decision.targetId||exact?.id||identity?.entityId||(matches.size===1?[...matches.keys()][0]:null);
        const labelRow=ws.get(def.table,result.targetId)||{contactId:value.contactId,animalId:value.animalId};result.name=adapter.label(kind,labelRow,ws.tables);
        if(result.action==='undecided'){counts.conflict++;rows.push(result);continue;}
        if(!['create','update','link'].includes(result.action))throw new TypeError('Unknown related import decision');
        if(result.action==='create'&&exact)throw Object.assign(new Error('Existing UUID'),{issues:[{field:'id',code:'import.existingUUID'}]});
        if(result.action!=='create'&&!ws.get(def.table,result.targetId))throw Object.assign(new Error('Missing target'),{issues:[{field:'id',code:'import.target'}]});
        if(result.action==='update'&&(!ws.originals.has(def.table+'/'+result.targetId)||touched.has(result.targetId)))throw Object.assign(new Error('Repeated update'),{issues:[{field:'id',code:'import.repeatedUpdate'}]});
        const transaction=ws.row(def.table,value.id||ids.get(source.line));let target=result.targetId;
        if(result.action!=='link')target=adapter.build(kind,value,transaction,result.action,target);
        if(options.remember&&value.externalId){
          if(identity&&identity.entityId!==target)throw Object.assign(new Error('Identity rebound'),{issues:[{field:'external_id',code:'import.identityConflict'}]});
          if(!identity)transaction.stage([transaction.h.insert('importIdentityMap',transaction.h.create('importIdentityMap',{source:options.source,entityType:def.entity,externalId:value.externalId,entityId:target}))]);
        }
        transaction.commit();if(options.remember&&value.externalId&&!identity)identityIndex.set(key,ws.tables.importIdentityMap[ws.tables.importIdentityMap.length-1]);
        if(result.action!=='link')touched.add(target);result.targetId=target;result.name=adapter.label(kind,ws.get(def.table,target),ws.tables);counts[result.action]++;
      }catch(problem){result.action='error';counts.error++;result.errors=problem.issues||problem.details?.map(issue=>({field:issue.path||'',code:issue.code}))||[{field:'',code:'import.invalidRow'}];}
      rows.push(result);
    }
    if(options.signal?.aborted)error('AbortError','Import preview cancelled');
    if(ws.changes.size){const transaction=ws.row(null,null),log=transaction.h.create('activityLog',{operation:'import',occurredAt:ws.now,operationId,target:null,summaryParameters:{code:fileCode,count:counts.create+counts.update+counts.link}});transaction.stage([transaction.h.insert('activityLog',log)]);transaction.commit();}
    const globalErrors=parsed.errors.concat(root.domain.validateDataset(ws.tables,{datasetId:snapshot.datasetId,today:ws.today}).map(issue=>({field:issue.table+'.'+issue.path,code:issue.code})));
    return root.services.importBatches.register({module:kind,rows,counts,unknown,unknownColumns:parsed.headers.filter((_,index)=>!mapping[index]),globalErrors,revision:snapshot.globalRevision,records:ws.changes.size,staged:ws.changes.size>1000,sha256:parsed.sha256,repeatedFile:snapshot.tables.activityLog.some(row=>row.operation==='import'&&row.summaryParameters.code===fileCode)},
      {snapshot,tables:ws.tables,changes:[...ws.changes.values()],operationId,batchId:options.batchId,source:options.source||''});
  }
  root.services.relatedImport=Object.freeze({preview,apply:(report,confirmation)=>root.services.importBatches.apply(report,confirmation)});
}(window.RescueManager));
