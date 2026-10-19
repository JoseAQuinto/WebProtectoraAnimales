(function(root){
  'use strict';
  const live=row=>!row.supersededByEventId&&!row.voidReason,fail=()=>{throw new root.core.errors.AppError('hc.unsupported');};
  function first(tables,event){let row=event;const seen=new Set();while(row.correctsEventId){if(seen.has(row.id))fail();seen.add(row.id);row=tables.animalEvents.find(item=>item.id===row.correctsEventId);if(!row)fail();}return row;}
  function inspect(tables,event,today){
    if(!event||!live(event)||event.source.type!=='animal'||!['transfer','deceased'].includes(event.type)||event.source.id!==event.animalId)fail();
    const animal=tables.animals.find(row=>row.id===event.animalId);if(!animal)fail();if(animal.archivedAt||animal.deletedAt)throw new root.core.errors.AppError('hc.restoreFirst');
    const original=first(tables,event),operationId=original.originKey.split('/')[0],log=tables.activityLog.find(row=>row.operationId===operationId&&row.target?.type==='animal'&&row.target.id===animal.id),code=log?.summaryParameters.code;
    const history=tables.stayEpisodes.filter(row=>row.animalId===animal.id).slice().sort((a,b)=>a.entryDate.localeCompare(b.entryDate)||a.id.localeCompare(b.id));
    let kind,field,episode=null;const affected=[],related=[],minimums=[animal.birthDate].filter(Boolean),maximums=[today,animal.deceasedOn].filter(Boolean);
    const affect=(table,row,key)=>affected.push({table,id:row.id,field:key,previous:row[key]});
    if(event.type==='deceased'){
      if(animal.managementStatus!=='deceased'||animal.deceasedOn!==event.eventDate||tables.animalEvents.filter(row=>live(row)&&row.type==='deceased'&&row.animalId===animal.id).length!==1)fail();
      kind='deceased';field='deceasedOn';affect('animals',animal,field);
      const matches=history.filter(row=>row.exitReason==='deceased'&&row.exitDate===event.eventDate);if(matches.length>1)fail();episode=matches[0]||null;
      for(const row of history){minimums.push(row.entryDate);if(row.exitDate&&row.id!==episode?.id)minimums.push(row.exitDate);}
      minimums.push(...tables.adoptions.filter(row=>row.animalId===animal.id).map(row=>row.adoptionDate));
      // The current death is being corrected, so it cannot be its own upper bound.
      maximums.splice(0,maximums.length,...[today].filter(Boolean));
      if(episode)affect('stayEpisodes',episode,'exitDate');
    }else if(code==='animal.exit'){
      const matches=history.filter(row=>['transfer','other'].includes(row.exitReason)&&row.exitDate===event.eventDate);if(matches.length!==1)fail();episode=matches[0];kind='exit';field='exitDate';affect('stayEpisodes',episode,field);
      const next=history[history.findIndex(row=>row.id===episode.id)+1];if(next)maximums.push(next.entryDate);
    }else if(code==='animal.location'){
      const matches=history.filter(row=>row.entryDate<=event.eventDate&&(!row.exitDate||row.exitDate>=event.eventDate));if(matches.length!==1)fail();episode=matches[0];kind='transfer';field='eventDate';
      if(episode.exitDate)maximums.push(episode.exitDate);
    }else fail();
    if(episode){if(episode.archivedAt||episode.deletedAt)throw new root.core.errors.AppError('hc.restoreFirst');minimums.push(episode.entryDate);}
    function add(table,row,key,type,eventCode,label){
      const matches=type?tables.animalEvents.filter(item=>live(item)&&item.type===type&&item.source.type===(table==='fosterStays'?'foster_stay':'reservation')&&item.source.id===row.id&&(!eventCode||item.parameters.code===eventCode)):[],closure=matches.length===1&&matches[0].eventDate===row[key]?matches[0]:null;
      related.push({key:table+'/'+row.id,table,id:row.id,field:key,previous:row[key],label,eventId:closure?.id||null,canMove:(!type||!!closure)&&!row.archivedAt&&!row.deletedAt,labelKey:table==='reservations'?'hc.related.cancelledReservation':null});
    }
    const eventOperation=row=>first(tables,row).originKey.split('/')[0];
    if(episode)for(const stay of tables.fosterStays.filter(row=>row.episodeId===episode.id&&row.endDate).sort((a,b)=>a.startDate.localeCompare(b.startDate)||a.id.localeCompare(b.id))){
      if(kind==='transfer'&&!tables.animalEvents.some(row=>row.type==='foster_end'&&row.source.type==='foster_stay'&&row.source.id===stay.id&&eventOperation(row)===operationId))continue;
      const profile=tables.fosterProfiles.find(row=>row.id===stay.fosterProfileId);add('fosterStays',stay,'endDate','foster_end',null,tables.contacts.find(row=>row.id===profile?.contactId)?.name||animal.name);
    }
    if(kind!=='transfer'){
      for(const reservation of tables.reservations.filter(row=>row.animalId===animal.id&&row.status==='cancelled').sort((a,b)=>a.reservationDate.localeCompare(b.reservationDate)||a.id.localeCompare(b.id))){
        if(!tables.animalEvents.some(row=>row.type==='reservation'&&row.source.type==='reservation'&&row.source.id===reservation.id&&row.parameters.code==='cancelled'&&eventOperation(row)===operationId))continue;
        const application=tables.adoptionApplications.find(row=>row.id===reservation.applicationId);add('reservations',reservation,'closedOn','reservation','cancelled',tables.contacts.find(row=>row.id===application?.contactId)?.name||animal.name);
      }
      for(const task of tables.tasks.filter(row=>row.animalId===animal.id&&row.status==='cancelled'&&row.cancelledOn===event.eventDate).sort((a,b)=>a.title.localeCompare(b.title)||a.id.localeCompare(b.id)))add('tasks',task,'cancelledOn',null,null,task.title);
      related.push(...root.services.historyEvents.applicationClosures(tables,event));
    }
    if(kind==='transfer'){
      const peers=tables.animalEvents.filter(row=>row.id!==event.id&&live(row)&&row.type==='transfer'&&row.animalId===animal.id&&row.eventDate>=episode.entryDate&&(!episode.exitDate||row.eventDate<=episode.exitDate));
      for(const peer of peers){const rootEvent=first(tables,peer);if(rootEvent.eventDate<original.eventDate)minimums.push(peer.eventDate);else if(rootEvent.eventDate>original.eventDate)maximums.push(peer.eventDate);}
    }
    return{eventId:event.id,animalId:animal.id,animalName:animal.name,episodeId:episode?.id||null,type:event.type,kind,field,previousDate:event.eventDate,
      minDate:minimums.sort().at(-1)||null,maxDate:maximums.sort()[0],affected,related,command:'correctDeparture',titleKey:'hc.title.'+kind,effectKey:'hc.effect.'+kind,relatedHelpKey:'hc.departureRelatedHelp'};
  }
  root.services.historyDeparture=Object.freeze({inspect});
}(window.RescueManager));
