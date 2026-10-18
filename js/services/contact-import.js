(function(root){
  'use strict';
  const plans=new WeakMap(),identities=new WeakMap(),adapter=root.services.importContacts;
  const error=(name,message)=>{throw root.storage.error(name,message);};
  async function preview(snapshot,parsed,mapping,options={},decisions={}){
    if(!root.utils.ids.isUuidV4(options.batchId)||!Array.isArray(mapping)||mapping.length!==parsed.headers.length||mapping.some(key=>key&&!adapter.fields.includes(key))||new Set(mapping.filter(Boolean)).size!==mapping.filter(Boolean).length)throw new TypeError('Invalid import mapping');
    if(options.remember&&(!options.source||typeof options.source!=='string'||options.source!==options.source.trim()||options.source.length>120))throw new TypeError('Choose an import source name');
    const now=options.now||new Date().toISOString(),today=root.utils.dates.today(snapshot.tables.organizationSettings[0].timeZone,Date.parse(now)),tables=Object.fromEntries(Object.entries(snapshot.tables).map(([name,rows])=>[name,rows.slice()])),changes=new Map(),rows=[],touched=new Set();
    if(!identities.has(parsed))identities.set(parsed,new Map(parsed.rows.map(row=>[row.line,root.utils.ids.uuidV4()])));const ids=identities.get(parsed),operationId=root.utils.ids.uuidV4();
    const originals=new Map(),positions={contacts:new Map(),importIdentityMap:new Map()},identityIndex=new Map(),indexes={email:new Map(),phone:new Map(),name:new Map()};
    const identityKey=row=>JSON.stringify([row.source,row.entityType,row.externalId]);
    function indexContact(row,remove=false){if(row.deletedAt||row.mergedIntoContactId)return;const keys=[['email',row.emailNormalized],['name',root.utils.strings.normalizeSearch(row.name)],...row.phones.map(phone=>['phone',phone.normalized])];for(const[kind,key]of keys){if(!key)continue;const map=indexes[kind];if(!map.has(key))map.set(key,new Set());if(remove)map.get(key).delete(row.id);else map.get(key).add(row.id);}}
    for(const name of['contacts','importIdentityMap'])tables[name].forEach((row,index)=>{originals.set(name+'/'+row.id,row);positions[name].set(row.id,index);if(name==='contacts')indexContact(row);else identityIndex.set(identityKey(row),row);});
    const contact=id=>positions.contacts.has(id)?tables.contacts[positions.contacts.get(id)]:null;
    function duplicates(candidate,excludeId){const matches=new Map(),keys=[['email',candidate.emailNormalized],['name',root.utils.strings.normalizeSearch(candidate.name)],...candidate.phones.map(phone=>['phone',phone.normalized])];for(const[kind,key]of keys)for(const id of indexes[kind].get(key)||[]){if(id===excludeId)continue;if(!matches.has(id))matches.set(id,new Set());matches.get(id).add(kind);}return[...matches].map(([contactId,reasons])=>({contactId,reasons:[...reasons],strength:reasons.has('email')||reasons.has('phone')?'possible':'name_only'})).sort((a,b)=>a.contactId.localeCompare(b.contactId));}
    const create=(table,input)=>root.domain.createRecord(table,input,{datasetId:snapshot.datasetId,now,today});
    function put(table,row){const key=table+'/'+row.id,index=positions[table].get(row.id);if(index===undefined){positions[table].set(row.id,tables[table].length);tables[table].push(row);}else{if(table==='contacts')indexContact(tables[table][index],true);tables[table][index]=row;}if(table==='contacts')indexContact(row);else identityIndex.set(identityKey(row),row);changes.set(key,{table,record:row,expectedRevision:originals.get(key)?.revision??null});}
    const counts={create:0,update:0,link:0,skip:0,error:0,conflict:0};let unknown=0;
    for(const source of parsed.rows){
      if(rows.length%100===0){if(options.signal?.aborted)error('AbortError','Import preview cancelled');options.onProgress?.({completed:rows.length,total:parsed.rows.length});await new Promise(resolve=>setTimeout(resolve,0));if(options.signal?.aborted)error('AbortError','Import preview cancelled');}
      const decision=decisions[source.line]||{},raw={};mapping.forEach((key,index)=>{if(key)raw[key]=source.cells[index]||'';else if(source.cells[index])unknown++;});
      const result={line:source.line,name:raw.name||'',action:decision.action||'',targetId:decision.targetId||null,matches:[],errors:[],warnings:[],externalId:raw.external_id||null};
      if(decision.action==='skip'){counts.skip++;result.action='skip';rows.push(result);continue;}
      try{
        if(source.errors.length)throw Object.assign(new Error('CSV structure'),{issues:source.errors});
        const normalized=adapter.normalize(raw);
        const exact=normalized.id?contact(normalized.id):null,identity=options.remember&&normalized.externalId?identityIndex.get(identityKey({source:options.source,entityType:'contact',externalId:normalized.externalId})):null;
        const target=exact||identity&&contact(identity.entityId),base=contact(decision.targetId)||target;
        const inherited=base&&decision.action!=='create'?Object.fromEntries(Object.keys(normalized.input).map(key=>[key,base[key]])):normalized.input;
        const candidate=create('contacts',{...inherited,...normalized.patch,id:normalized.id||ids.get(source.line),origin:'import',originBatchId:options.batchId}),matches=duplicates(candidate,target?.id);
        result.name=raw.name||base?.name||'';
        result.matches=[...(target?[{id:target.id,name:target.name,reasons:[exact?'uuid':'external_id'],strong:true}]:[]),...matches.map(match=>({id:match.contactId,name:contact(match.contactId).name,reasons:match.reasons,strong:match.strength!=='name_only'}))];
        const strong=result.matches.some(match=>match.strong);result.action=decision.action||(strong?'undecided':'create');result.targetId=decision.targetId||target?.id||null;
        if(matches.some(match=>match.strength==='name_only'))result.warnings.push('name_only');
        if(result.action==='undecided'){counts.conflict++;rows.push(result);continue;}
        if(!['create','update','link'].includes(result.action))throw new TypeError('Unknown import decision');
        let chosenContact;
        if(result.action==='create'){
          if(exact)throw new TypeError('An existing UUID cannot be created twice');chosenContact=candidate;
        }else{
          const existing=contact(result.targetId);if(!existing)throw new TypeError('Choose a target contact');
          if(result.action==='update'){
            if(existing.deletedAt||existing.mergedIntoContactId||touched.has(existing.id))throw new TypeError('Restore, resolve merged identity or avoid multiple updates to one contact');
            const original=originals.get('contacts/'+existing.id);if(!original)throw new TypeError('Link to contacts already created in this batch instead of updating them');
            chosenContact=create('contacts',{...existing,...normalized.patch,revision:original.revision+1,updatedAt:now});
          }else chosenContact=existing;
        }
        if(options.remember&&normalized.externalId){
          if(identity&&identity.entityId!==chosenContact.id)throw new TypeError('External identifier already maps to another contact');
          if(!identity){const row=create('importIdentityMap',{source:options.source,entityType:'contact',externalId:normalized.externalId,entityId:chosenContact.id,origin:'import',originBatchId:options.batchId});put('importIdentityMap',row);}
        }
        if(result.action!=='link'){put('contacts',chosenContact);touched.add(chosenContact.id);}result.targetId=chosenContact.id;counts[result.action]++;
      }catch(problem){result.action='error';counts.error++;result.errors=problem.issues||problem.details?.map(issue=>({field:issue.path||'',code:issue.code}))||[{field:'',code:'import.invalidRow'}];}
      rows.push(result);
    }
    if(options.signal?.aborted)error('AbortError','Import preview cancelled');
    let globalErrors=parsed.errors.slice();
    if(changes.size){const log=create('activityLog',{operation:'import',occurredAt:now,operationId,target:null,summaryParameters:{code:'contacts.csv:'+parsed.sha256,count:counts.create+counts.update+counts.link},origin:'import',originBatchId:options.batchId});tables.activityLog.push(log);changes.set('activityLog/'+log.id,{table:'activityLog',record:log,expectedRevision:null});}
    const validation=root.domain.validateDataset(tables,{datasetId:snapshot.datasetId,today});globalErrors=globalErrors.concat(validation.map(issue=>({field:issue.table+'.'+issue.path,code:issue.code})));
    function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
    const publicPlan=freeze({module:'contacts',rows,counts,unknown,unknownColumns:parsed.headers.filter((_,index)=>!mapping[index]),globalErrors,revision:snapshot.globalRevision,records:changes.size,staged:changes.size>1000,sha256:parsed.sha256,repeatedFile:snapshot.tables.activityLog.some(row=>row.operation==='import'&&row.summaryParameters.code==='contacts.csv:'+parsed.sha256)});
    plans.set(publicPlan,{snapshot,changes:[...changes.values()],tables,operationId,batchId:options.batchId,source:options.source||'',result:null,prepared:null});return publicPlan;
  }
  async function apply(report,confirmation={}){
    const plan=plans.get(report);if(!plan)error('InvalidInputError','Preview this import first');
    if(confirmation.confirmed!==true)error('ConfirmationRequiredError','Confirm the import scope');
    if(report.globalErrors.length)error('InvalidInputError','Resolve dataset validation errors');
    if((report.counts.skip||report.counts.error||report.counts.conflict)&&confirmation.confirmedSubset!==true)error('ConfirmationRequiredError','Confirm the exact valid subset');
    if(report.unknown&&confirmation.ignoreUnknown!==true)error('ConfirmationRequiredError','Review unmapped columns');
    if(plan.result)return{...plan.result,duplicate:true};
    if(!plan.changes.length)return{duplicate:false,noChanges:true,counts:report.counts};
    const intent={batchId:plan.batchId,sourceHash:report.sha256,source:plan.source,changes:await root.utils.integrity.sha256(root.utils.canonicalJson.stringify(plan.changes)),counts:report.counts};
    if(!report.staged){
      const result=await root.services.context.execute('import.contacts.csv',intent,(data,h)=>{if(h.datasetId!==plan.snapshot.datasetId)h.fail('DatasetChangedError','Import source dataset changed');return{changes:plan.changes,result:{batchId:plan.batchId,counts:report.counts}};},{operationId:plan.operationId,expectedRevision:report.revision});plan.result=result;return result;
    }
    const current=await root.services.context.snapshot();
    if(plan.prepared&&current.datasetId===plan.prepared.targetId){plan.result={duplicate:true,counts:report.counts,batchId:plan.batchId};return plan.result;}
    if(current.datasetId!==plan.snapshot.datasetId)error('DatasetChangedError','Import source dataset changed');
    if(current.globalRevision!==report.revision)error('RevisionConflictError','Data changed after preview');
    const options={...root.services.context.options(current),reason:'import',signal:confirmation.signal,onProgress:confirmation.onProgress};
    const receipts=await root.services.backup.list();if(!receipts.some(row=>row.state==='verified'&&row.dataRevision===current.dataRevision))error('VerifiedBackupRequiredError','Verify a current copy before preparing a large import');
    if(current.dataRevision===Number.MAX_SAFE_INTEGER)error('RevisionOverflowError','Dataset revision exhausted');
    plan.prepared=await root.storage.datasetManager.prepare({datasetId:current.datasetId,dataRevision:current.dataRevision+1,tables:plan.tables},options);
    if(confirmation.signal?.aborted)error('AbortError','Import cancelled before activation');
    confirmation.onProgress?.({phase:'activating',completed:plan.prepared.total,total:plan.prepared.total});
    const result=await root.storage.datasetManager.activate(plan.prepared,options);await root.services.context.open();plan.result={...result,counts:report.counts,batchId:plan.batchId};return plan.result;
  }
  root.services.contactImport=Object.freeze({preview,apply});
}(window.RescueManager));
