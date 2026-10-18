(function(root){
  'use strict';
  const groups=['species','sex','breed','status','availability','location','place','foster','adopter'];
  function list(tables,filters={},locale='en'){
    const sets={};for(const key of groups){const values=filters[key]||[];if(!Array.isArray(values)||values.length>10000||values.some(value=>typeof value!=='string'))throw new TypeError('Invalid animal filter');sets[key]=new Set(key==='breed'?values.map(root.utils.strings.normalizeSearch):values);}
    for(const prefix of['entry','adoption']){for(const suffix of['From','To'])if(filters[prefix+suffix]&&!root.utils.dates.isValid(filters[prefix+suffix]))throw new RangeError('Invalid animal filter date');if(filters[prefix+'From']&&filters[prefix+'To']&&filters[prefix+'From']>filters[prefix+'To'])throw new RangeError('Invalid animal period');}
    if(filters.search!==undefined&&(typeof filters.search!=='string'||filters.search.length>200))throw new TypeError('Invalid animal query');
    const mode=filters.mode||'active',sort=filters.sort||'name';if(!['active','all','trash'].includes(mode)||!['name','code','createdAt'].includes(sort))throw new RangeError('Invalid animal list mode');
    const text=root.utils.strings.normalizeSearch(filters.search||''),chip=root.utils.strings.normalizeMicrochip(filters.search||''),latest=new Map(),stays=new Map(),adoptions=new Map(),contacts=new Map(tables.contacts.map(row=>[row.id,row])),resolved=new Map();
    const group=(map,id,value)=>{if(!map.has(id))map.set(id,[]);map.get(id).push(value);};
    for(const row of tables.stayEpisodes)if(!row.deletedAt&&(!latest.has(row.animalId)||latest.get(row.animalId)<row.entryDate))latest.set(row.animalId,row.entryDate);
    for(const row of tables.fosterStays)if(!row.deletedAt&&(filters.pastFosters||!row.endDate))group(stays,row.animalId,row.fosterProfileId);
    function contactId(id){if(resolved.has(id))return resolved.get(id);let row=contacts.get(id);while(row?.mergedIntoContactId)row=contacts.get(row.mergedIntoContactId);const value=row?.id||id;resolved.set(id,value);return value;}
    for(const row of tables.adoptions)if(!row.deletedAt)group(adoptions,row.animalId,{date:row.adoptionDate,contactId:contactId(row.adopterContactId)});
    const match=(key,value)=>!sets[key].size||sets[key].has(value||''),period=(prefix,date)=>(!filters[prefix+'From']||date&&date>=filters[prefix+'From'])&&(!filters[prefix+'To']||date&&date<=filters[prefix+'To']);
    const adoptionFilter=sets.adopter.size||filters.adoptionFrom||filters.adoptionTo;
    return tables.animals.filter(row=>
      (mode==='trash'?!!row.deletedAt:!row.deletedAt&&(mode==='all'||!row.archivedAt))&&match('species',row.speciesId)&&match('sex',row.sex)&&match('breed',root.utils.strings.normalizeSearch(row.breed||''))&&match('status',row.managementStatus)&&match('availability',row.adoptionAvailability)&&match('location',row.locationKind)&&match('place',row.locationId)&&
      (!sets.foster.size||(stays.get(row.id)||[]).some(id=>sets.foster.has(id)))&&period('entry',latest.get(row.id))&&
      (!adoptionFilter||(adoptions.get(row.id)||[]).some(adoption=>match('adopter',adoption.contactId)&&period('adoption',adoption.date)))&&
      (!text||root.utils.strings.normalizeSearch([row.code,row.name,row.breed,row.notes].join(' ')).includes(text)||chip&&(row.microchipNormalized||'').includes(chip))
    ).sort((a,b)=>String(a[sort]||'').localeCompare(String(b[sort]||''),locale)||a.id.localeCompare(b.id));
  }
  root.services.animalQueries=Object.freeze({list});
}(window.RescueManager));
