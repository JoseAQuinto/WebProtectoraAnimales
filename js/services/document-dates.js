(function(root){
  'use strict';
  const fail=key=>{throw new root.core.errors.AppError('dc.'+key);};
  function inspect(tables,id){
    const document=tables.documents.find(row=>row.id===id);if(!document||document.archivedAt||document.deletedAt)fail('restoreFirst');
    const events=tables.animalEvents.filter(row=>row.type==='document'&&row.source.type==='document'&&row.source.id===id&&!row.supersededByEventId&&!row.voidReason).map(row=>({id:row.id,animalId:row.animalId,animalName:tables.animals.find(animal=>animal.id===row.animalId)?.name||'',date:row.eventDate,recordedAt:row.recordedAt})).sort((a,b)=>a.animalName.localeCompare(b.animalName)||a.recordedAt.localeCompare(b.recordedAt)||a.id.localeCompare(b.id));
    return{documentId:id,title:document.title,date:document.date,events,drift:events.filter(row=>row.date!==document.date).length};
  }
  function correct(id,input,command){return root.services.context.execute('documents.correctDate',{id,input},(tables,h)=>{
    if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!['date','reason','confirmed'].includes(key)))h.fail('InvalidInputError','Unexpected document date correction');
    const info=inspect(tables,id);if(input.confirmed!==true)fail('confirmation');
    if(!root.utils.dates.isValid(input.date)||input.date>h.today)fail('invalidDate');
    if(typeof input.reason!=='string'||!input.reason||input.reason!==input.reason.trim()||input.reason.length>200)fail('reasonRequired');
    const pending=info.events.filter(row=>row.date!==input.date);if(input.date===info.date&&!pending.length)fail('unchanged');
    const changes=[h.replace('documents',h.edit('documents',h.find('documents',id),{date:input.date}))],eventIds=[];
    for(const event of pending)eventIds.push(root.services.historyEvents.replace(h,changes,h.find('animalEvents',event.id),input.date,input.reason,'date').id);
    changes.push(h.insert('activityLog',h.create('activityLog',{operation:'correct',occurredAt:h.now,operationId:h.operationId,target:{type:'document',id},summaryParameters:{code:'document.date',field:'date',reason:input.reason,count:eventIds.length}})));
    return{changes,result:{documentId:id,eventIds,corrected:eventIds.length}};
  },command);}
  root.services.documentDates=Object.freeze({inspect,correct});
}(window.RescueManager));
