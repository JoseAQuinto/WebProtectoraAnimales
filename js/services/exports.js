(function(root){
  'use strict';
  const adapters=root.services.exportDefinitions,definitions=adapters.definitions;
  function definition(kind){if(!Object.hasOwn(definitions,kind))throw new RangeError('Unknown export module');return definitions[kind];}
  function criteria(filters){
    const result={};for(const key of['search','status','from','to','animalId','contactId','visibility']){const value=filters[key]??'';if(typeof value!=='string'||value.length>200)throw new TypeError('Invalid export filter');result[key]=value;}
    for(const key of['from','to'])if(result[key]&&!root.utils.dates.isValid(result[key]))throw new RangeError('Invalid export period');
    if(result.from&&result.to&&result.from>result.to)throw new RangeError('Invalid export period');
    if(result.visibility&&!['active','all','trash'].includes(result.visibility))throw new RangeError('Invalid export visibility');return result;
  }
  function select(snapshot,kind,filters={},scope='filtered'){
    const def=definition(kind);if(!['filtered','all'].includes(scope))throw new RangeError('Invalid export scope');
    const chosen=scope==='filtered'?criteria(filters):{},text=root.utils.strings.normalizeSearch(chosen.search||''),context=adapters.context(snapshot.tables);
    const rows=snapshot.tables[def.table].filter(row=>!def.direction||row.direction===def.direction).map(row=>adapters.describe(kind,row,context)).filter(item=>{
      const r=item.row;if(scope==='all')return true;
      return(chosen.visibility==='trash'?!!r.deletedAt:!r.deletedAt&&(chosen.visibility==='all'||!r.archivedAt))&&
        (!chosen.status||item.status===chosen.status)&&(!chosen.from||item.date&&item.date>=chosen.from)&&(!chosen.to||item.date&&item.date<=chosen.to)&&
        (!chosen.animalId||item.animal?.id===chosen.animalId)&&(!chosen.contactId||item.contact?.id===chosen.contactId)&&
        (!text||root.utils.strings.normalizeSearch([item.name,item.animal?.code,item.contact?.email,item.notes].filter(Boolean).join(' ')).includes(text));
    }).sort((a,b)=>(b.date||'').localeCompare(a.date||'')||a.name.localeCompare(b.name)||a.row.id.localeCompare(b.row.id));
    return{kind,scope,filters:chosen,context,rows};
  }
  function table(selection){
    const headers=adapters.columns[selection.kind],rows=[];
    for(const item of selection.rows){const group=adapters.cells(selection.kind,item,selection.context);if(rows.length+group.length>100000)throw new RangeError('Export exceeds 100000 CSV rows');for(const row of group){if(row.length!==headers.length)throw new TypeError('Export column mismatch');rows.push(row);}}
    return{headers,rows};
  }
  function related(selection){
    const {kind,context:c}=selection,selected=new Set(selection.rows.map(item=>item.row.id)),extra=[];
    const include=(table,predicate)=>{for(const row of c.tables[table])if(predicate(row))extra.push([table,row.id]);};
    let documentTargets=new Set();
    if(kind==='animals'){
      for(const table of['stayEpisodes','weightMeasurements','fosterStays','adoptionApplications','reservations','adoptions','veterinaryRecords','carePlans','tasks','animalEvents'])include(table,row=>selected.has(row.animalId));
      documentTargets=new Set([...selected].map(id=>'animal/'+id));
      for(const [table,type]of[['adoptions','adoption'],['veterinaryRecords','veterinary_record']])for(const row of c.tables[table])if(selected.has(row.animalId))documentTargets.add(type+'/'+row.id);
    }else if(kind==='contacts'){
      include('fosterProfiles',row=>selected.has(row.contactId));include('volunteerProfiles',row=>selected.has(row.contactId));
      const profiles=new Set(c.tables.volunteerProfiles.filter(row=>selected.has(row.contactId)).map(row=>row.id));include('volunteerHours',row=>profiles.has(row.volunteerProfileId));
      documentTargets=new Set([...selected].map(id=>'contact/'+id));
    }else if(kind==='applications'){
      include('reservations',row=>selected.has(row.applicationId));include('adoptions',row=>selected.has(row.applicationId));
    }else if(kind==='adoptions')documentTargets=new Set([...selected].map(id=>'adoption/'+id));
    else if(kind==='volunteers')include('volunteerHours',row=>selected.has(row.volunteerProfileId));
    else if(kind==='donations')include('donationLines',row=>selected.has(row.donationId));
    include('documentLinks',row=>documentTargets.has(row.entityType+'/'+row.entityId));return extra;
  }
  function container(snapshot,selection,exportedAt=new Date().toISOString()){
    const primary=definition(selection.kind).table,main=new Set(selection.rows.map(item=>item.row.id)),queued=new Set(),pending=[],references={};
    const inverse=new Map();for(const[table,field]of[['stayEpisodes','animalId'],['fosterStays','animalId'],['reservations','animalId'],['adoptions','animalId'],['donationLines','donationId'],['inventoryMovements','itemId']]){const grouped=new Map();for(const row of snapshot.tables[table]){if(!grouped.has(row[field]))grouped.set(row[field],[]);grouped.get(row[field]).push(row.id);}inverse.set(table,grouped);}
    const add=(table,id)=>{if(!id)return;const key=table+'/'+id;if(queued.has(key))return;if(queued.size>=100000)throw new RangeError('Export exceeds 100000 related records');queued.add(key);pending.push([table,id]);};
    selection.rows.forEach(item=>add(primary,item.row.id));related(selection).forEach(([name,id])=>add(name,id));
    function scan(spec,value){
      if(value===null||value===undefined)return;
      if(spec.ref)add(spec.ref.table,value);
      else if(spec.originRef)add(root.domain.entityTables[value.type],value.id);
      else if(spec.type==='array')value.forEach(item=>scan(spec.items,item));
      else if(spec.type==='object')for(const[key,field]of Object.entries(spec.fields))scan(field,value[key]);
    }
    for(let index=0;index<pending.length;index++){
      const [name,id]=pending[index];
      const row=selection.context.get(name,id);if(!row)throw new RangeError('Unresolved export reference');
      if(name!==primary||!main.has(id)){if(!references[name])references[name]=[];const copy={...row};if(name==='assets')delete copy.blob;references[name].push(copy);}
      for(const[key,field]of Object.entries(root.domain.schemas[name].fields))scan(field,row[key]);
      if(name==='documentLinks')add(root.domain.entityTables[row.entityType],row.entityId);
      // Include inverse records needed to reconstruct the referenced entity's invariants.
      if(name==='animals')for(const table of['stayEpisodes','fosterStays','reservations','adoptions'])for(const child of inverse.get(table).get(id)||[])add(table,child);
      if(name==='donations')for(const child of inverse.get('donationLines').get(id)||[])add('donationLines',child);
      if(name==='inventoryItems')for(const child of inverse.get('inventoryMovements').get(id)||[])add('inventoryMovements',child);
    }
    for(const rows of Object.values(references))rows.sort((a,b)=>a.id.localeCompare(b.id));
    const org=snapshot.tables.organizationSettings[0];
    return{format:'rescue-manager-module-export',formatVersion:1,appVersion:root.config.appVersion,schemaVersion:root.config.schemaVersion,module:selection.kind,exportedAt,
      source:{datasetId:snapshot.datasetId,dataRevision:snapshot.dataRevision,globalRevision:snapshot.globalRevision},scope:{mode:selection.scope,filters:selection.filters},
      organization:{name:org.name,currencyCode:org.currencyCode,timeZone:org.timeZone},includesFiles:false,assetPolicy:'metadata-only',notBackup:true,referencePolicy:'selected-related-and-forward-v2',
      records:selection.rows.map(item=>item.row),references};
  }
  root.services.exports=Object.freeze({definition,select,table,container});
}(window.RescueManager));
