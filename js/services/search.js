(function(root){
  'use strict';const strings=root.utils.strings;
  function search(tables,query,options={}){
    if(typeof query!=='string'||query.length>200)throw new RangeError('Invalid search text');
    const text=strings.normalizeSearch(query),chip=strings.normalizeMicrochip(query);let phone='';try{phone=strings.normalizePhone(query);}catch(_){}
    const limit=options.limit??20,offset=options.offset??0;if(!Number.isInteger(limit)||limit<1||limit>100||!Number.isInteger(offset)||offset<0)throw new RangeError('Invalid result page');
    const visible=row=>(options.includeInactive||!row.archivedAt&&!row.deletedAt)&&!row.mergedIntoContactId;
    const animals=text?tables.animals.filter(row=>visible(row)&&(strings.normalizeSearch(row.name+' '+row.code).includes(text)||chip&&(row.microchipNormalized||'').includes(chip))):[];
    const contacts=text?tables.contacts.filter(row=>visible(row)&&(strings.normalizeSearch(row.name).includes(text)||(row.emailNormalized||'').includes(strings.normalizeEmail(query))||phone&&row.phones.some(item=>item.normalized.includes(phone)))):[];
    const order=(a,b)=>a.name.localeCompare(b.name)||a.id.localeCompare(b.id);animals.sort(order);contacts.sort(order);
    return {animals:{total:animals.length,rows:animals.slice(offset,offset+limit)},contacts:{total:contacts.length,rows:contacts.slice(offset,offset+limit)}};
  }
  root.services.search=Object.freeze({search});
}(window.RescueManager));
