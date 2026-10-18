(function(root){
  'use strict';
  const owns=(o,k)=>Object.hasOwn(o,k),meta=new Set(['id','datasetId','createdAt','updatedAt','revision','origin','originBatchId']),equal=(a,b)=>root.utils.canonicalJson.stringify(a)===root.utils.canonicalJson.stringify(b);
  const editable={contacts:['type','name','phones','email','address','roles','notes'],animals:['name','speciesId','breed','sex','birthDate','birthPrecision','estimatedAgeMonths','estimatedAgeReferenceDate','sizeId','color','microchipOriginal','sterilizationStatus','sterilizationDate','description','character','behavior','specialNeeds','notes'],
    volunteerProfiles:['availability','functionIds','specialties','status','notes'],fosterProfiles:['totalCapacity','acceptedSpeciesIds','acceptedSizeIds','availability','restrictions','notes'],locations:['name','type','parentLocationId','active','notes'],catalogOptions:['active','sortOrder','customLabel'],
    documents:['title','typeId','date','notes','externalFileName','externalLocation','externalFileType','originalSha256'],weightMeasurements:['date','grams','notes']};
  function business(table,record){return Object.fromEntries(Object.keys(root.domain.schemas[table].fields).filter(key=>!meta.has(key)&&key!=='blob').map(key=>[key,record[key]??null]));}
  function label(table,row,tables){if(!row)return'';if(row.name||row.title||row.concept||row.originalName)return row.name||row.title||row.concept||row.originalName;if(row.contactId)return(tables.contacts||[]).find(contact=>contact.id===row.contactId)?.name||row.contactId;return[row.code,row.date||row.entryDate||row.adoptionDate||row.eventDate,row.type||row.status].filter(Boolean).join(' · ');}
  function mappingRecord(table,record,mappings){
    const id=(target,value)=>mappings.get(target+'/'+value)||value;
    function value(field,item){if(item===null||item===undefined)return item;if(field.ref)return id(field.ref.table,item);if(field.originRef)return{type:item.type,id:id(root.domain.entityTables[item.type],item.id)};if(field.type==='array')return item.map(child=>value(field.items,child));if(field.type==='object')return Object.fromEntries(Object.entries(field.fields).filter(([key])=>owns(item,key)).map(([key,spec])=>[key,value(spec,item[key])]));return item;}
    const result=Object.fromEntries(Object.entries(root.domain.schemas[table].fields).filter(([key])=>owns(record,key)&&key!=='blob').map(([key,spec])=>[key,value(spec,record[key])]));
    if(table==='documentLinks')result.entityId=id(root.domain.entityTables[result.entityType],result.entityId);
    if(table==='importIdentityMap')result.entityId=id(root.domain.entityTables[result.entityType],result.entityId);return result;
  }
  function candidates(table,incoming,tables){
    const result=[];for(const row of tables[table]){const reasons=[];
      if(table==='catalogOptions'&&row.kind===incoming.kind&&row.code===incoming.code)reasons.push('catalog');
      if(table==='contacts'){if(incoming.emailNormalized&&row.emailNormalized===incoming.emailNormalized)reasons.push('email');if(incoming.phones?.some(phone=>row.phones.some(other=>phone.normalized===other.normalized)))reasons.push('phone');}
      if(table==='animals'){if(incoming.code===row.code)reasons.push('code');if(incoming.microchipNormalized&&incoming.microchipNormalized===row.microchipNormalized)reasons.push('microchip');}
      if(['fosterProfiles','volunteerProfiles'].includes(table)&&row.contactId===incoming.contactId)reasons.push('contact');
      if(table==='stayEpisodes'&&row.animalId===incoming.animalId&&row.entryDate===incoming.entryDate&&row.entryType===incoming.entryType)reasons.push('episode');
      if(table==='adoptionApplications'&&row.animalId===incoming.animalId&&row.contactId===incoming.contactId&&row.applicationDate===incoming.applicationDate)reasons.push('application');
      if(table==='adoptions'&&row.animalId===incoming.animalId&&row.adoptionDate===incoming.adoptionDate&&row.adopterContactId===incoming.adopterContactId)reasons.push('adoption');
      if(table==='assets'&&root.services.moduleImportAssets.compatible(incoming,row))reasons.push('asset');
      if(!reasons.length&&['contacts','animals','locations'].includes(table)&&root.utils.strings.normalizeSearch(row.name)===root.utils.strings.normalizeSearch(incoming.name))reasons.push('name');
      if(reasons.length)result.push({id:row.id,name:label(table,row,tables),reasons,strong:reasons.some(reason=>reason!=='name')});
    }return result;
  }
  function dependencies(table,record){
    const result=[];function scan(field,value){if(value===null||value===undefined)return;if(field.ref)result.push(field.ref.table+'/'+value);else if(field.originRef)result.push(root.domain.entityTables[value.type]+'/'+value.id);else if(field.type==='array')value.forEach(item=>scan(field.items,item));else if(field.type==='object')for(const[key,child]of Object.entries(field.fields))scan(child,value[key]);}
    for(const[key,field]of Object.entries(root.domain.schemas[table].fields))scan(field,record[key]);
    if(table==='documentLinks'||table==='importIdentityMap')result.push(root.domain.entityTables[record.entityType]+'/'+record.entityId);return result;
  }
  async function preview(snapshot,packageValue,options={},decisions={}){
    if(!root.services.moduleImportCodec.isPackage(packageValue)||!root.utils.ids.isUuidV4(options.batchId))throw root.storage.error('InvalidInputError','Read a module JSON first');
    const {entries,container,sha256}=packageValue,now=options.now||new Date().toISOString(),today=root.utils.dates.today(snapshot.tables.organizationSettings[0].timeZone,Date.parse(now)),mappings=new Map(),originals=new Map(),tables=Object.fromEntries(Object.entries(snapshot.tables).map(([table,rows])=>[table,rows.slice()])),rows=[],changes=new Map(),touched=new Set(),operationId=root.utils.ids.uuidV4();
    for(const[table,values]of Object.entries(tables))for(const record of values)originals.set(table+'/'+record.id,record);
    for(const entry of entries){const decision=decisions[entry.key];if(['link','update'].includes(decision?.action)&&originals.has(entry.table+'/'+decision.targetId))mappings.set(entry.key,decision.targetId);}
    const files=await root.services.moduleImportAssets.files(options.files||[],options),counts={create:0,update:0,link:0,skip:0,error:0,conflict:0},assetHashes=new Map();
    const monetary=entries.some(entry=>entry.table==='financialMovements'||entry.table==='donationLines'&&entry.record.estimatedValueMinor!=null);
    const globalErrors=[];if(monetary&&container.organization.currencyCode!==tables.organizationSettings[0].currencyCode)globalErrors.push({field:'organization.currencyCode',code:'mj.currency'});
    for(const entry of entries){
      if(rows.length%100===0){if(options.signal?.aborted)throw root.storage.error('AbortError','JSON preview cancelled');options.onProgress?.({phase:'validating',completed:rows.length,total:entries.length});await new Promise(resolve=>setTimeout(resolve,0));if(options.signal?.aborted)throw root.storage.error('AbortError','JSON preview cancelled');}
      const {table,key,record:source}=entry,decision=decisions[key]||{},incoming=mappingRecord(table,source,mappings),exact=originals.get(key),matches=candidates(table,incoming,snapshot.tables),different=exact&&!equal(business(table,incoming),business(table,exact));
      const strong=matches.filter(match=>match.strong),row={key,table,id:source.id,primary:entry.primary,name:label(table,source,container.references)||source.id,action:decision.action||(exact&&!different?'link':exact||strong.length?'undecided':'create'),targetId:decision.targetId||exact?.id||(strong.length===1?strong[0].id:null),matches,errors:[],differences:exact?Object.keys(business(table,incoming)).filter(field=>!equal(incoming[field]??null,exact[field]??null)&&field!=='blob'):[],canUpdate:!!editable[table]};
      if(exact&&!matches.some(match=>match.id===exact.id))row.matches.unshift({id:exact.id,name:label(table,exact,tables),reasons:['uuid']});
      try{
        if(!['create','update','link','skip','undecided'].includes(row.action))throw new root.core.errors.AppError('mj.invalidDecision');
        if(row.action==='undecided'){counts.conflict++;rows.push(row);continue;}if(row.action==='skip'){counts.skip++;rows.push(row);continue;}
        if(row.action==='link'){
          const target=originals.get(table+'/'+row.targetId);if(!target)throw new root.core.errors.AppError('mj.target');
          if(table==='assets'){
            if(!root.services.moduleImportAssets.compatible(incoming,target))throw new root.core.errors.AppError('mj.assetMismatch');
            if(!assetHashes.has(target.id))assetHashes.set(target.id,await root.utils.integrity.sha256(target.blob));if(assetHashes.get(target.id)!==source.sha256)throw new root.core.errors.AppError('mj.assetMismatch');
          }
          mappings.set(key,target.id);counts.link++;rows.push(row);continue;
        }
        if(row.action==='create'&&exact)throw new root.core.errors.AppError('mj.existing');
        const target=row.action==='update'?originals.get(table+'/'+row.targetId):null;
        let record;
        if(row.action==='update'){
          if(!target||!editable[table]||target.archivedAt||target.deletedAt||target.mergedIntoContactId||touched.has(table+'/'+target.id))throw new root.core.errors.AppError('mj.updateForbidden');
          const before=business(table,target),after=business(table,incoming),allowed=editable[table];
          for(const field of Object.keys(after))if(!equal(before[field],after[field])&&!allowed.includes(field)&&!['microchipNormalized','emailNormalized'].includes(field))throw new root.core.errors.AppError('mj.updateForbidden',[{path:field}]);
          if(table==='catalogOptions'&&(target.isSystem&&incoming.customLabel!==target.customLabel))throw new root.core.errors.AppError('mj.updateForbidden');
          if(target.revision===Number.MAX_SAFE_INTEGER)throw root.storage.error('RevisionOverflowError','Record revision exhausted');
          const patch=Object.fromEntries(allowed.map(field=>[field,incoming[field]]));
          if(table==='contacts')patch.phones=patch.phones.map(phone=>({label:phone.label,original:phone.original}));
          record=root.domain.createRecord(table,{...target,...patch,updatedAt:now,revision:target.revision+1},{datasetId:snapshot.datasetId,now,today});
        }else{
          let blob;if(table==='assets')blob=await root.services.moduleImportAssets.materialize(source,files.get(source.sha256));
          record=root.domain.createRecord(table,{...incoming,...(blob?{blob}:{}),datasetId:snapshot.datasetId,revision:1,origin:'import',originBatchId:options.batchId},{datasetId:snapshot.datasetId,now,today});
        }
        const targetKey=table+'/'+record.id;if(touched.has(targetKey))throw new root.core.errors.AppError('mj.updateForbidden');touched.add(targetKey);
        const at=tables[table].findIndex(value=>value.id===record.id);if(at<0)tables[table].push(record);else tables[table][at]=record;
        changes.set(targetKey,{table,record,expectedRevision:target?.revision??null});mappings.set(key,record.id);row.targetId=record.id;counts[row.action]++;
      }catch(problem){row.action='error';counts.error++;row.errors=[{code:problem instanceof root.core.errors.AppError?problem.code:'mj.invalidRecord',field:problem.details?.[0]?.path||''}];}
      rows.push(row);
    }
    // Referenced source rows need a valid explicit resolution even when their UUID exists locally.
    const outcomes=new Map(rows.map(row=>[row.key,row.action]));for(const entry of entries)if(['create','update'].includes(outcomes.get(entry.key)))for(const key of dependencies(entry.table,entry.record))if(outcomes.has(key)&&!['create','update','link'].includes(outcomes.get(key)))globalErrors.push({field:entry.key+' → '+key,code:'mj.unresolvedDependency'});
    if(changes.size){const log=root.domain.createRecord('activityLog',{operation:'import',occurredAt:now,operationId,target:null,summaryParameters:{code:'json:'+sha256,field:container.module,count:counts.create+counts.update},origin:'import',originBatchId:options.batchId},{datasetId:snapshot.datasetId,now,today});tables.activityLog.push(log);changes.set('activityLog/'+log.id,{table:'activityLog',record:log,expectedRevision:null});}
    const validation=root.domain.validateDataset(tables,{datasetId:snapshot.datasetId,today});globalErrors.push(...validation.map(issue=>({field:issue.table+'.'+(issue.id||'')+'.'+issue.path,code:issue.code})));
    return root.services.importBatches.register({module:container.module,format:'json',rows,counts,globalErrors,unknown:0,revision:snapshot.globalRevision,records:changes.size,staged:true,requiresUpdates:counts.update>0,sha256,repeatedFile:snapshot.tables.activityLog.some(row=>row.operation==='import'&&row.summaryParameters.code==='json:'+sha256),source:container.organization,sourceRows:entries.length,missingAssets:rows.filter(row=>row.errors.some(issue=>issue.code==='mj.missingAsset')).map(row=>({id:row.id,name:row.name})),
      fileMatches:files.size,tableCounts:packageValue.counts},{snapshot,tables,changes:[...changes.values()],operationId,batchId:options.batchId,source:container.source.datasetId});
  }
  root.services.moduleImport=Object.freeze({preview,apply:(report,confirmation)=>root.services.importBatches.apply(report,confirmation),mappingRecord,business,label});
}(window.RescueManager));
