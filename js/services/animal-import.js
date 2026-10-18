(function(root){
  'use strict';
  const adapter=root.services.importAnimals,identities=new WeakMap();
  const error=(name,message)=>{throw root.storage.error(name,message);};
  async function preview(snapshot,parsed,mapping,options={},decisions={}){
    if(!root.utils.ids.isUuidV4(options.batchId)||!Array.isArray(mapping)||mapping.length!==parsed.headers.length||mapping.some(key=>key&&!adapter.fields.includes(key))||new Set(mapping.filter(Boolean)).size!==mapping.filter(Boolean).length)throw new TypeError('Invalid animal import mapping');
    if(options.remember&&(!options.source||typeof options.source!=='string'||options.source!==options.source.trim()||options.source.length>120))throw new TypeError('Choose an import source name');
    const now=options.now||new Date().toISOString(),today=root.utils.dates.today(snapshot.tables.organizationSettings[0].timeZone,Date.parse(now)),tables=Object.fromEntries(Object.entries(snapshot.tables).map(([name,rows])=>[name,rows.slice()])),changes=new Map(),rows=[],touched=new Set(),operationId=root.utils.ids.uuidV4();
    if(!identities.has(parsed))identities.set(parsed,new Map(parsed.rows.map(row=>[row.line,root.utils.ids.uuidV4()])));const ids=identities.get(parsed);
    const positions=Object.fromEntries(Object.entries(tables).map(([name,values])=>[name,new Map(values.map((row,index)=>[row.id,index]))]));
    const originals=new Map(),identityIndex=new Map(),indexes={code:new Map(),microchip:new Map(),name:new Map()},assignedCodes=new Set();let maximum=snapshot.animalSequence||0;
    const identityKey=row=>JSON.stringify([row.source,row.entityType,row.externalId]);
    const animal=id=>positions.animals.has(id)?tables.animals[positions.animals.get(id)]:null;
    function index(row,remove=false){for(const[kind,key]of[['code',row.code],['microchip',row.microchipNormalized],['name',root.utils.strings.normalizeSearch(row.name)]]){if(!key)continue;if(!indexes[kind].has(key))indexes[kind].set(key,new Set());if(remove)indexes[kind].get(key).delete(row.id);else indexes[kind].get(key).add(row.id);}}
    function reserve(code){if(!code)return;assignedCodes.add(code);const match=/^A-(\d+)$/.exec(code);if(match){const n=Number(match[1]);if(!Number.isSafeInteger(n))error('RevisionOverflowError','Animal code sequence exhausted');maximum=Math.max(maximum,n);}}
    for(const[name,values]of Object.entries(tables))for(const row of values)originals.set(name+'/'+row.id,row);
    tables.animals.forEach(row=>{index(row);reserve(row.code);});tables.activityLog.forEach(row=>reserve(row.summaryParameters.code));tables.importIdentityMap.forEach(row=>identityIndex.set(identityKey(row),row));
    const counts={create:0,update:0,link:0,skip:0,error:0,conflict:0};let unknown=0;
    function put(change){const{table,record}=change,key=table+'/'+record.id,at=positions[table].get(record.id);if(at===undefined){positions[table].set(record.id,tables[table].length);tables[table].push(record);}else{if(table==='animals')index(tables[table][at],true);tables[table][at]=record;}if(table==='animals'){index(record);reserve(record.code);}if(table==='importIdentityMap')identityIndex.set(identityKey(record),record);changes.set(key,{...change,expectedRevision:originals.get(key)?.revision??null});}
    for(const source of parsed.rows){
      if(rows.length%100===0){if(options.signal?.aborted)error('AbortError','Import preview cancelled');options.onProgress?.({completed:rows.length,total:parsed.rows.length});await new Promise(resolve=>setTimeout(resolve,0));if(options.signal?.aborted)error('AbortError','Import preview cancelled');}
      const decision=decisions[source.line]||{},raw={};mapping.forEach((key,i)=>{if(key)raw[key]=source.cells[i]||'';else if(source.cells[i])unknown++;});
      const result={line:source.line,name:raw.name||'',action:decision.action||'',targetId:decision.targetId||null,matches:[],errors:[],warnings:[],externalId:raw.external_id||null};
      if(decision.action==='skip'){counts.skip++;result.action='skip';rows.push(result);continue;}
      try{
        if(source.errors.length)throw Object.assign(new Error('CSV structure'),{issues:source.errors});
        const normalized=adapter.normalize(raw,tables,options),exact=normalized.id?animal(normalized.id):null,identity=options.remember&&normalized.externalId?identityIndex.get(identityKey({source:options.source,entityType:'animal',externalId:normalized.externalId})):null;
        const matches=new Map();function match(id,reason){if(!matches.has(id))matches.set(id,{id,name:animal(id)?.name||'',reasons:[],strong:false});const value=matches.get(id);if(!value.reasons.includes(reason))value.reasons.push(reason);if(reason!=='name')value.strong=true;}
        if(exact)match(exact.id,'uuid');if(identity)match(identity.entityId,'external_id');
        for(const[kind,key]of[['code',raw.code],['microchip',raw.microchip?root.utils.strings.normalizeMicrochip(raw.microchip):null],['name',root.utils.strings.normalizeSearch(raw.name||'')]])if(key)for(const id of indexes[kind].get(key)||[])match(id,kind);
        result.matches=[...matches.values()];const strong=result.matches.filter(row=>row.strong);result.action=decision.action||(strong.length?'undecided':'create');result.targetId=decision.targetId||exact?.id||identity?.entityId||(strong.length===1?strong[0].id:null);result.name=raw.name||animal(result.targetId)?.name||'';
        if(result.matches.some(row=>!row.strong))result.warnings.push('name_only');
        if(result.action==='undecided'){counts.conflict++;rows.push(result);continue;}
        if(!['create','update','link'].includes(result.action))throw new TypeError('Unknown animal import decision');
        const pending=[];let chosen;
        const create=(table,input)=>root.domain.createRecord(table,{...input,...(table==='animals'&&result.action==='create'?{id:normalized.id||ids.get(source.line)}:{}),origin:'import',originBatchId:options.batchId},{datasetId:snapshot.datasetId,now,today});
        const h={now,today,operationId,datasetId:snapshot.datasetId,create,fail:error,find:(table,id)=>{const row=tables[table][positions[table].get(id)];if(!row)error('RecordNotFoundError','Missing import reference');return row;},
          edit:(table,previous,patch)=>root.domain.createRecord(table,{...previous,...patch,revision:previous.revision+1,updatedAt:now},{datasetId:snapshot.datasetId,now,today}),insert:(table,record)=>({table,record,expectedRevision:null}),replace:(table,record)=>({table,record,expectedRevision:record.revision-1}),hasAnimalCode:code=>assignedCodes.has(code),allocateAnimalCode:()=>{if(maximum>=Number.MAX_SAFE_INTEGER)error('RevisionOverflowError','Animal code sequence exhausted');return'A-'+String(++maximum).padStart(6,'0');}};
        if(result.action==='create'){
          if(exact)throw Object.assign(new Error('Existing UUID'),{issues:[{field:'id',code:'import.existingUUID'}]});
          const built=root.services.animalCommands.entry(tables,h,adapter.entry(normalized),true);pending.push(...built.changes);chosen=pending.find(change=>change.table==='animals').record;
        }else{
          chosen=animal(result.targetId);if(!chosen)throw Object.assign(new Error('Missing target'),{issues:[{field:'id',code:'import.target'}]});
          if(result.action==='update'){
            if(!originals.has('animals/'+chosen.id)||touched.has(chosen.id))throw Object.assign(new Error('Repeated update'),{issues:[{field:'id',code:'import.repeatedUpdate'}]});
            adapter.checkUpdate(normalized,chosen,tables);const built=root.services.animalCommands.update(tables,h,{animalId:chosen.id,patch:normalized.patch});pending.push(...built.changes);chosen=pending.find(change=>change.table==='animals').record;
          }
        }
        if(result.action!=='link'){
          if(/^A-\d{16,}$/.test(chosen.code))throw Object.assign(new Error('Code sequence too large'),{issues:[{field:'code',code:'import.integer'}]});
          for(const[kind,key]of[['code',chosen.code],['microchip',chosen.microchipNormalized]])if(key&&[...(indexes[kind].get(key)||[])].some(id=>id!==chosen.id))throw Object.assign(new Error('Unique animal identifier'),{issues:[{field:kind,code:'import.uniqueAnimal'}]});
          if(chosen.birthDate&&pending.some(change=>change.table==='stayEpisodes'&&change.record.entryDate<chosen.birthDate))throw Object.assign(new Error('Entry before birth'),{issues:[{field:'birth_date',code:'animal.entryBeforeBirth'}]});
        }
        if(options.remember&&normalized.externalId){
          if(identity&&identity.entityId!==chosen.id)throw Object.assign(new Error('Identity rebound'),{issues:[{field:'external_id',code:'import.identityConflict'}]});
          if(!identity)pending.push(h.insert('importIdentityMap',create('importIdentityMap',{source:options.source,entityType:'animal',externalId:normalized.externalId,entityId:chosen.id})));
        }
        pending.forEach(put);if(result.action!=='link')touched.add(chosen.id);result.targetId=chosen.id;counts[result.action]++;
      }catch(problem){result.action='error';counts.error++;result.errors=problem.issues||problem.details?.map(issue=>({field:issue.path||'',code:issue.code}))||[{field:'',code:'import.invalidRow'}];}
      rows.push(result);
    }
    if(options.signal?.aborted)error('AbortError','Import preview cancelled');
    if(changes.size){const log=root.domain.createRecord('activityLog',{operation:'import',occurredAt:now,operationId,target:null,summaryParameters:{code:'animals.csv:'+parsed.sha256,count:counts.create+counts.update+counts.link},origin:'import',originBatchId:options.batchId},{datasetId:snapshot.datasetId,now,today});put({table:'activityLog',record:log,expectedRevision:null});}
    const globalErrors=parsed.errors.concat(root.domain.validateDataset(tables,{datasetId:snapshot.datasetId,today}).map(issue=>({field:issue.table+'.'+issue.path,code:issue.code})));
    return root.services.importBatches.register({module:'animals',rows,counts,unknown,unknownColumns:parsed.headers.filter((_,i)=>!mapping[i]),globalErrors,revision:snapshot.globalRevision,records:changes.size,staged:changes.size>1000,sha256:parsed.sha256,repeatedFile:snapshot.tables.activityLog.some(row=>row.operation==='import'&&row.summaryParameters.code==='animals.csv:'+parsed.sha256)},
      {snapshot,tables,changes:[...changes.values()],operationId,batchId:options.batchId,source:options.source||''});
  }
  root.services.animalImport=Object.freeze({preview,apply:(report,confirmation)=>root.services.importBatches.apply(report,confirmation)});
}(window.RescueManager));
