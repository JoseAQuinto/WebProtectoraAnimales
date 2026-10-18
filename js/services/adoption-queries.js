(function(root){
  'use strict';
  const kinds=Object.freeze({application:['adoptionApplications','applicationDate'],reservation:['reservations','reservationDate'],adoption:['adoptions','adoptionDate']});
  function query(tables,kind,filters={}){
    const spec=kinds[kind];if(!spec||!Object.hasOwn(kinds,kind))throw new RangeError('Unknown adoption view');
    for(const key of['from','to'])if(filters[key]&&!root.utils.dates.isValid(filters[key]))throw new RangeError('Invalid period');
    if(filters.from&&filters.to&&filters.from>filters.to)throw new RangeError('Invalid period order');
    const text=root.utils.strings.normalizeSearch(filters.search||''),animals=new Map(tables.animals.map(row=>[row.id,row])),applications=new Map(tables.adoptionApplications.map(row=>[row.id,row]));
    const rows=tables[spec[0]].map(row=>{
      const contactId=kind==='reservation'?applications.get(row.applicationId)?.contactId:row.contactId||row.adopterContactId;
      return{row,animal:animals.get(row.animalId),contact:root.services.contacts.resolve(tables,contactId),date:row[spec[1]],status:kind==='adoption'?(row.returnDate?'returned':'active'):row.status};
    }).filter(item=>{
      const row=item.row;
      return (filters.mode==='trash'?!!row.deletedAt:!row.deletedAt&&(filters.mode==='all'||!row.archivedAt))&&
        (!filters.status||filters.status===item.status)&&(!filters.from||item.date>=filters.from)&&(!filters.to||item.date<=filters.to)&&
        (!filters.animalId||item.animal?.id===filters.animalId)&&(!filters.contactId||item.contact?.id===filters.contactId)&&
        (!text||root.utils.strings.normalizeSearch([item.animal?.name,item.animal?.code,item.contact?.name,item.contact?.email].filter(Boolean).join(' ')).includes(text));
    }).sort((a,b)=>b.date.localeCompare(a.date)||b.row.createdAt.localeCompare(a.row.createdAt)||a.row.id.localeCompare(b.row.id));
    const offset=filters.offset??0,limit=filters.limit??20;if(!Number.isInteger(offset)||offset<0||!Number.isInteger(limit)||limit<1||limit>100)throw new RangeError('Invalid result page');
    return{total:rows.length,rows:rows.slice(offset,offset+limit)};
  }
  root.services.adoptionQueries=Object.freeze({query});
}(window.RescueManager));
