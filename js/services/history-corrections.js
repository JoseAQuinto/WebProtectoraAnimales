(function(root){
  'use strict';
  const live=event=>!event.supersededByEventId&&!event.voidReason;
  const fail=key=>{throw new root.core.errors.AppError('hc.'+key);};
  function inspect(tables,eventId,today){
    const event=tables.animalEvents.find(row=>row.id===eventId);
    if(event&&['adoption_application','reservation'].includes(event.source.type))return root.services.historyWorkflow.inspect(tables,event,today);
    if(event?.source.type==='adoption')return root.services.historyAdoption.inspect(tables,event,today);
    if(event&&['foster_stay','veterinary_record'].includes(event.source.type))return root.services.historyLinkedFacts.inspect(tables,event,today);
    if(!event||!live(event)||!['entry','return'].includes(event.type)||event.source.type!=='stay_episode')fail('unsupported');
    const episode=tables.stayEpisodes.find(row=>row.id===event.source.id),animal=tables.animals.find(row=>row.id===event.animalId);
    if(!episode||!animal||episode.animalId!==animal.id||episode.entryDate!==event.eventDate||
      (episode.entryType==='return')!==(event.type==='return')||
      tables.animalEvents.filter(row=>row.source.type==='stay_episode'&&row.source.id===episode.id&&['entry','return'].includes(row.type)&&live(row)).length!==1)fail('unsupported');
    if(animal.archivedAt||animal.deletedAt||episode.archivedAt||episode.deletedAt)fail('restoreFirst');
    const history=tables.stayEpisodes.filter(row=>row.animalId===animal.id).slice().sort((a,b)=>a.entryDate.localeCompare(b.entryDate)||a.id.localeCompare(b.id)),index=history.findIndex(row=>row.id===episode.id);
    const minimums=[animal.birthDate,history[index-1]?.exitDate].filter(Boolean),maximums=[today,episode.exitDate,history[index+1]?.entryDate].filter(Boolean);
    const affected=[{table:'stayEpisodes',id:episode.id,field:'entryDate',previous:episode.entryDate}];
    if(episode.returnedFromAdoptionId){
      const adoption=tables.adoptions.find(row=>row.id===episode.returnedFromAdoptionId);
      if(!adoption||adoption.animalId!==animal.id||adoption.returnDate!==episode.entryDate)fail('unsupported');
      minimums.push(adoption.adoptionDate);affected.push({table:'adoptions',id:adoption.id,field:'returnDate',previous:adoption.returnDate});
    }
    const stays=tables.fosterStays.filter(row=>row.episodeId===episode.id),adoptions=tables.adoptions.filter(row=>row.episodeId===episode.id);
    maximums.push(...stays.map(row=>row.startDate),...adoptions.map(row=>row.adoptionDate));
    // A known episode owner takes precedence over date inference at shared boundaries.
    function belongs(row){
      if(row.source.type==='stay_episode')return row.source.id===episode.id;
      if(row.source.type==='foster_stay')return stays.some(stay=>stay.id===row.source.id);
      if(row.source.type==='adoption')return adoptions.some(adoption=>adoption.id===row.source.id);
      return row.eventDate>=episode.entryDate&&(!episode.exitDate||row.eventDate<episode.exitDate);
    }
    const limitingEvents=tables.animalEvents.filter(row=>row.animalId===animal.id&&row.id!==event.id&&live(row)&&belongs(row));
    maximums.push(...limitingEvents.map(row=>row.eventDate));
    const measurements=tables.weightMeasurements.filter(row=>row.animalId===animal.id&&!row.deletedAt&&row.date>=episode.entryDate&&(!episode.exitDate||row.date<episode.exitDate));
    maximums.push(...measurements.map(row=>row.date));
    return{eventId:event.id,animalId:animal.id,animalName:animal.name,episodeId:episode.id,type:event.type,kind:event.type,field:'entryDate',command:'correct',titleKey:'hc.title',effectKey:event.type==='return'?'hc.returnEffect':'hc.entryEffect',previousDate:event.eventDate,
      minDate:minimums.sort().at(-1)||null,maxDate:maximums.sort()[0],affected,
      limitingEvents:limitingEvents.map(row=>({id:row.id,type:row.type,date:row.eventDate}))};
  }
  function canCorrect(tables,event){try{inspect(tables,event.id);return true;}catch(error){if(error instanceof root.core.errors.AppError)return false;throw error;}}
  function apply(input,command,method){
    const type={correct:'history.correct-entry-date',correctLinked:'history.correct-linked-date',correctWorkflow:'history.correct-workflow-date'}[method];
    return root.services.context.execute(type,input,(tables,h)=>{
      if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!['eventId','date','reason','confirmed','preserveExpenseDate'].includes(key)))h.fail('InvalidInputError','Unexpected historical correction fields');
      if(input.confirmed!==true)fail('confirmation');
      const info=inspect(tables,input.eventId,h.today);
      if(info.command!==method)h.fail('InvalidInputError','Use the supported correction command for this fact');
      if(info.requiresExpenseConfirmation&&input.preserveExpenseDate!==true)fail('expenseConfirmation');
      if(!root.utils.dates.isValid(input.date)||input.date>info.maxDate||(info.minDate&&input.date<info.minDate))fail('dateBounds');
      if(input.date===info.previousDate)fail('unchanged');
      if(typeof input.reason!=='string'||input.reason!==input.reason.trim()||!input.reason||input.reason.length>200)fail('reasonRequired');
      const changes=info.affected.map(item=>h.replace(item.table,h.edit(item.table,h.find(item.table,item.id),{[item.field]:input.date})));
      const previous=h.find('animalEvents',input.eventId),replacement=root.services.historyEvents.replace(h,changes,previous,input.date,input.reason,info.field);
      changes.push(
        h.insert('activityLog',h.create('activityLog',{operation:'correct',occurredAt:h.now,operationId:h.operationId,
          target:{type:'animal_event',id:replacement.id},summaryParameters:{code:'history.'+info.field,previousId:previous.id,nextId:replacement.id,reason:input.reason,field:info.field}})));
      return{changes,result:{eventId:replacement.id,correctsEventId:previous.id,animalId:previous.animalId,episodeId:info.episodeId}};
    },command);
  }
  root.services.historyCorrections=Object.freeze({inspect,canCorrect,correct:(input,command)=>apply(input,command,'correct'),correctLinked:(input,command)=>apply(input,command,'correctLinked'),correctWorkflow:(input,command)=>apply(input,command,'correctWorkflow'),correctAdoption:(input,command)=>root.services.historyAdoption.correct(input,command)});
}(window.RescueManager));
