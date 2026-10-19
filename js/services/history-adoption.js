(function(root){
  'use strict';
  const fail=key=>{throw new root.core.errors.AppError('hc.'+key);},live=row=>!row.supersededByEventId&&!row.voidReason;
  function inspect(tables,event,today){
    if(!event||!live(event)||event.type!=='adoption'||event.source.type!=='adoption')fail('unsupported');
    const adoption=tables.adoptions.find(row=>row.id===event.source.id),animal=tables.animals.find(row=>row.id===event.animalId);
    if(!adoption||!animal||adoption.animalId!==animal.id||adoption.adoptionDate!==event.eventDate)fail('unsupported');
    if(animal.archivedAt||animal.deletedAt||adoption.archivedAt||adoption.deletedAt)fail('restoreFirst');
    const episode=tables.stayEpisodes.find(row=>row.id===adoption.episodeId),application=tables.adoptionApplications.find(row=>row.id===adoption.applicationId);
    if(!episode||episode.adoptionId!==adoption.id||episode.exitDate!==adoption.adoptionDate||!application||application.status!=='completed')fail('unsupported');
    if(tables.animalEvents.filter(row=>live(row)&&row.type==='adoption'&&row.source.type==='adoption'&&row.source.id===adoption.id).length!==1)fail('unsupported');
    const related=[];
    function add(table,row,field,type,code,label){
      const matching=type?tables.animalEvents.filter(item=>live(item)&&item.type===type&&item.source.type===(table==='fosterStays'?'foster_stay':'reservation')&&item.source.id===row.id&&(!code||item.parameters.code===code)):[];
      const event=matching.length===1&&matching[0].eventDate===row[field]?matching[0]:null;
      related.push({key:table+'/'+row.id,table,id:row.id,field,previous:row[field],label,eventId:event?.id||null,canMove:(!type||!!event)&&!row.archivedAt&&!row.deletedAt});
    }
    for(const stay of tables.fosterStays.filter(row=>row.episodeId===episode.id&&row.endDate).sort((a,b)=>a.startDate.localeCompare(b.startDate)||a.id.localeCompare(b.id))){
      const profile=tables.fosterProfiles.find(row=>row.id===stay.fosterProfileId),person=tables.contacts.find(row=>row.id===profile?.contactId);add('fosterStays',stay,'endDate','foster_end',null,person?.name||animal.name);
    }
    for(const reservation of tables.reservations.filter(row=>row.applicationId===application.id&&row.status==='fulfilled').sort((a,b)=>a.reservationDate.localeCompare(b.reservationDate)||a.id.localeCompare(b.id)))add('reservations',reservation,'closedOn','reservation','fulfilled',tables.contacts.find(row=>row.id===application.contactId)?.name||animal.name);
    // These are candidates by date only, never an inferred causal link. Each requires a human decision.
    for(const task of tables.tasks.filter(row=>row.animalId===animal.id&&row.status==='cancelled'&&row.cancelledOn===event.eventDate).sort((a,b)=>a.title.localeCompare(b.title)||a.id.localeCompare(b.id)))add('tasks',task,'cancelledOn',null,null,task.title);
    const income=adoption.financialMovementId?tables.financialMovements.find(row=>row.id===adoption.financialMovementId):null;
    if(adoption.financialMovementId&&(!income||income.direction!=='income'||income.animalId!==animal.id))fail('unsupported');
    return{eventId:event.id,animalId:animal.id,animalName:animal.name,episodeId:episode.id,type:event.type,kind:'adoption',field:'adoptionDate',previousDate:event.eventDate,
      minDate:[animal.birthDate,episode.entryDate,application.approvalDate].filter(Boolean).sort().at(-1),maxDate:[today,animal.deceasedOn,adoption.returnDate].filter(Boolean).sort()[0],
      affected:[{table:'adoptions',id:adoption.id,field:'adoptionDate',previous:adoption.adoptionDate},{table:'stayEpisodes',id:episode.id,field:'exitDate',previous:episode.exitDate}],related,
      command:'correctAdoption',titleKey:'hc.title.adoption',effectKey:'hc.effect.adoption',requiresIncomeConfirmation:!!income,incomeDate:income?.date||null};
  }
  function correct(input,command){return root.services.context.execute('history.correct-adoption-date',input,(tables,h)=>{
    if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!['eventId','date','reason','confirmed','preserveIncomeDate','relatedDecisions'].includes(key)))h.fail('InvalidInputError','Unexpected adoption correction fields');
    if(input.confirmed!==true)fail('confirmation');const info=inspect(tables,h.find('animalEvents',input.eventId),h.today);
    if(!root.utils.dates.isValid(input.date)||input.date<info.minDate||input.date>info.maxDate)fail('dateBounds');
    if(input.date===info.previousDate)fail('unchanged');if(typeof input.reason!=='string'||input.reason!==input.reason.trim()||!input.reason||input.reason.length>200)fail('reasonRequired');
    if(info.requiresIncomeConfirmation&&input.preserveIncomeDate!==true)fail('incomeConfirmation');
    if(!Array.isArray(input.relatedDecisions)||input.relatedDecisions.length!==info.related.length)fail('relatedReview');
    const decisions=new Map();for(const choice of input.relatedDecisions){if(!choice||typeof choice!=='object'||Object.keys(choice).some(key=>!['key','action'].includes(key))||!['keep','move'].includes(choice.action)||decisions.has(choice.key))fail('relatedReview');decisions.set(choice.key,choice.action);}
    if(info.related.some(item=>!decisions.has(item.key)))fail('relatedReview');
    const changes=info.affected.map(item=>h.replace(item.table,h.edit(item.table,h.find(item.table,item.id),{[item.field]:input.date}))),moved=[];
    for(const item of info.related){const row=h.find(item.table,item.id),move=decisions.get(item.key)==='move',date=move?input.date:item.previous;
      if(move&&!item.canMove)fail('unsupported');if(item.table==='fosterStays'&&(date<row.startDate||date>input.date))fail('relatedBounds');
      if(item.table==='reservations'&&(date<row.reservationDate||date>input.date))fail('relatedBounds');
      if(!move||date===item.previous)continue;
      changes.push(h.replace(item.table,h.edit(item.table,row,{[item.field]:date})));moved.push(item);
      if(item.eventId)root.services.historyEvents.replace(h,changes,h.find('animalEvents',item.eventId),date,input.reason,item.field);
    }
    const replacement=root.services.historyEvents.replace(h,changes,h.find('animalEvents',info.eventId),input.date,input.reason,'adoptionDate');
    changes.push(h.insert('activityLog',h.create('activityLog',{operation:'correct',occurredAt:h.now,operationId:h.operationId,target:{type:'animal_event',id:replacement.id},summaryParameters:{code:'history.adoptionDate',field:'adoptionDate',previousId:info.eventId,nextId:replacement.id,reason:input.reason,count:moved.length}})));
    for(const item of moved.filter(row=>row.table==='tasks'))changes.push(h.insert('activityLog',h.create('activityLog',{operation:'correct',occurredAt:h.now,operationId:h.operationId,target:{type:'task',id:item.id},summaryParameters:{code:'history.adoptionTaskDate',field:item.field,previousId:info.eventId,nextId:replacement.id,reason:input.reason}})));
    return{changes,result:{animalId:info.animalId,eventId:replacement.id,correctsEventId:info.eventId,episodeId:info.episodeId,moved:moved.length}};
  },command);}
  root.services.historyAdoption=Object.freeze({inspect,correct});
}(window.RescueManager));
