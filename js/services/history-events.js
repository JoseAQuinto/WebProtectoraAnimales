(function(root){
  'use strict';
  function replace(h,changes,previous,date,reason,field){
    if(previous.supersededByEventId||previous.voidReason)throw new root.core.errors.AppError('hc.unsupported');
    const replacement=h.create('animalEvents',{animalId:previous.animalId,type:previous.type,eventDate:date,recordedAt:h.now,
      source:previous.source,originKey:'correction:'+h.operationId+':'+previous.id,correctsEventId:previous.id,
      parameters:{...previous.parameters,reason,field}});
    changes.push(h.replace('animalEvents',h.edit('animalEvents',previous,{supersededByEventId:replacement.id})),h.insert('animalEvents',replacement));return replacement;
  }
  function first(tables,event){let row=event;const seen=new Set();while(row.correctsEventId){if(seen.has(row.id))throw new root.core.errors.AppError('hc.unsupported');seen.add(row.id);row=tables.animalEvents.find(item=>item.id===row.correctsEventId);if(!row)throw new root.core.errors.AppError('hc.unsupported');}return row;}
  function applicationClosures(tables,event){
    const operationId=first(tables,event).originKey.split('/')[0];if(!root.utils.ids.isUuidV4(operationId))return[];
    return tables.animalEvents.filter(row=>row.animalId===event.animalId&&!row.supersededByEventId&&!row.voidReason&&row.type==='application'&&row.source.type==='adoption_application'&&row.parameters.code==='cancelled'&&first(tables,row).originKey.split('/')[0]===operationId).map(row=>{
      const source=tables.adoptionApplications.find(item=>item.id===row.source.id),person=tables.contacts.find(item=>item.id===source?.contactId);
      return{key:'animalEvents/'+row.id,table:'animalEvents',id:row.id,field:'eventDate',previous:row.eventDate,label:person?.name||source?.applicationDate||'',eventId:row.id,canMove:!!source&&!source.archivedAt&&!source.deletedAt,labelKey:'hc.related.applicationClosure'};
    }).sort((a,b)=>a.label.localeCompare(b.label)||a.id.localeCompare(b.id));
  }
  root.services.historyEvents=Object.freeze({replace,first,applicationClosures});
}(window.RescueManager));
