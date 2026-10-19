(function(root){
  'use strict';
  const fail=key=>{throw new root.core.errors.AppError('hc.'+key);},live=row=>!row.supersededByEventId&&!row.voidReason;
  function inspect(tables,event,today){
    if(!live(event))fail('unsupported');
    const animal=tables.animals.find(row=>row.id===event.animalId);if(!animal)fail('unsupported');
    if(animal.deletedAt||animal.archivedAt)fail('restoreFirst');
    const affected=[],minimums=[animal.birthDate].filter(Boolean),maximums=[today,animal.deceasedOn].filter(Boolean);
    let field,source,kind,episodeId=null,expense=null;
    const affect=(table,row,key)=>affected.push({table,id:row.id,field:key,previous:row[key]});
    if(event.source.type==='foster_stay'){
      source=tables.fosterStays.find(row=>row.id===event.source.id);kind=event.type;
      if(!source||source.animalId!==animal.id||!['foster_start','foster_end'].includes(kind))fail('unsupported');
      field=kind==='foster_start'?'startDate':'endDate';
      const episode=tables.stayEpisodes.find(row=>row.id===source.episodeId);if(!episode||episode.animalId!==animal.id)fail('unsupported');episodeId=episode.id;
      minimums.push(episode.entryDate);if(episode.exitDate)maximums.push(episode.exitDate);
      const stays=tables.fosterStays.filter(row=>row.animalId===animal.id).slice().sort((a,b)=>a.startDate.localeCompare(b.startDate)||a.id.localeCompare(b.id)),index=stays.findIndex(row=>row.id===source.id);
      if(field==='startDate'){if(source.endDate)maximums.push(source.endDate);if(stays[index-1]?.endDate)minimums.push(stays[index-1].endDate);if(stays[index+1])maximums.push(stays[index+1].startDate);}
      else{minimums.push(source.startDate);if(stays[index+1])maximums.push(stays[index+1].startDate);}
      affect('fosterStays',source,field);
    }else if(event.source.type==='veterinary_record'){
      source=tables.veterinaryRecords.find(row=>row.id===event.source.id);kind='clinical';field='date';
      if(!source||source.animalId!==animal.id)fail('unsupported');
      const expected=['vaccination','deworming','sterilization','checkup'].includes(source.type)?source.type:'treatment';if(event.type!==expected)fail('unsupported');
      affect('veterinaryRecords',source,field);
      if(source.resolvedOn)maximums.push(source.resolvedOn);
      if(source.carePlanId){const plan=tables.carePlans.find(row=>row.id===source.carePlanId);if(!plan||plan.animalId!==animal.id)fail('unsupported');minimums.push(plan.startDate);}
      if(source.sourceTaskId){const task=tables.tasks.find(row=>row.id===source.sourceTaskId);if(!task||task.animalId!==animal.id||task.status!=='completed'||task.completedOn!==source.date)fail('unsupported');affect('tasks',task,'completedOn');}
      if(source.nextReviewTaskId){const task=tables.tasks.find(row=>row.id===source.nextReviewTaskId);if(!task||task.animalId!==animal.id)fail('unsupported');maximums.push(task.dueDate);}
      for(const task of tables.tasks)if(!task.deletedAt&&task.source?.type==='veterinary_record'&&task.source.id===source.id)maximums.push(task.dueDate);
      if(source.type==='sterilization'){
        if(animal.sterilizationStatus!=='yes'||animal.sterilizationDate!==source.date||tables.veterinaryRecords.some(row=>row.animalId===animal.id&&row.id!==source.id&&row.type==='sterilization'&&!row.deletedAt))fail('unsupported');
        affect('animals',animal,'sterilizationDate');
      }
      if(source.expenseMovementId){expense=tables.financialMovements.find(row=>row.id===source.expenseMovementId);if(!expense||expense.animalId!==animal.id||expense.direction!=='expense')fail('unsupported');}
    }else fail('unsupported');
    if(source.deletedAt||source.archivedAt)fail('restoreFirst');
    if(!source[field]||source[field]!==event.eventDate||tables.animalEvents.filter(row=>live(row)&&row.source.type===event.source.type&&row.source.id===source.id&&row.type===event.type).length!==1)fail('unsupported');
    return{eventId:event.id,animalId:animal.id,animalName:animal.name,episodeId,type:event.type,kind,field,previousDate:event.eventDate,
      minDate:minimums.sort().at(-1)||null,maxDate:maximums.sort()[0],affected,command:'correctLinked',titleKey:'hc.title.'+kind,effectKey:'hc.effect.'+kind,
      requiresExpenseConfirmation:!!expense,expenseDate:expense?.date||null};
  }
  root.services.historyLinkedFacts=Object.freeze({inspect});
}(window.RescueManager));
