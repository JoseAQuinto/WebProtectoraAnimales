(function(root){
  'use strict';
  const live=row=>!row.supersededByEventId&&!row.voidReason,fail=()=>{throw new root.core.errors.AppError('hc.unsupported');};
  function original(tables,event){const seen=new Set();let row=event;while(row.correctsEventId){if(seen.has(row.id))fail();seen.add(row.id);row=tables.animalEvents.find(item=>item.id===row.correctsEventId);if(!row)fail();}return row;}
  function inspect(tables,event,today){
    if(!event||!live(event))fail();const animal=tables.animals.find(row=>row.id===event.animalId);if(!animal)fail();
    if(animal.archivedAt||animal.deletedAt)throw new root.core.errors.AppError('hc.restoreFirst');
    const minimums=[animal.birthDate].filter(Boolean),maximums=[today,animal.deceasedOn].filter(Boolean),affected=[];
    let source,field,kind;
    const affect=(table,row,key)=>affected.push({table,id:row.id,field:key,previous:row[key]});
    if(event.type==='application'&&event.source.type==='adoption_application'){
      source=tables.adoptionApplications.find(row=>row.id===event.source.id);const code=event.parameters.code;
      if(!source||source.animalId!==animal.id||!['pending','under_review','approved','rejected','cancelled'].includes(code))fail();
      const rank={pending:0,under_review:1,approved:2,rejected:3,cancelled:3},peers=tables.animalEvents.filter(row=>live(row)&&row.type==='application'&&row.source.type==='adoption_application'&&row.source.id===source.id);
      if(['rejected','cancelled'].includes(source.status)&&!peers.some(row=>row.parameters.code===source.status))fail();
      if(code!=='under_review'&&peers.filter(row=>row.parameters.code===code).length!==1)fail();
      const ordered=peers.map(row=>({row,root:original(tables,row)})).sort((a,b)=>a.root.recordedAt.localeCompare(b.root.recordedAt)||(rank[a.row.parameters.code]??4)-(rank[b.row.parameters.code]??4)||a.root.eventDate.localeCompare(b.root.eventDate)||a.root.id.localeCompare(b.root.id)),index=ordered.findIndex(item=>item.row.id===event.id);
      if(ordered[index-1])minimums.push(ordered[index-1].row.eventDate);if(ordered[index+1])maximums.push(ordered[index+1].row.eventDate);
      kind='application';field=code==='pending'?'applicationDate':code==='approved'?'approvalDate':'eventDate';
      if(field!=='eventDate'){if(source[field]!==event.eventDate)fail();affect('adoptionApplications',source,field);}else minimums.push(source.applicationDate);
      if(code==='pending'&&source.approvalDate)maximums.push(source.approvalDate);
      if(code==='approved'){
        minimums.push(source.applicationDate);maximums.push(...tables.reservations.filter(row=>row.applicationId===source.id).map(row=>row.reservationDate),...tables.adoptions.filter(row=>row.applicationId===source.id).map(row=>row.adoptionDate));
      }
      if(['rejected','cancelled'].includes(code)){if(source.status!==code)fail();if(source.approvalDate)minimums.push(source.approvalDate);}
    }else if(event.type==='reservation'&&event.source.type==='reservation'){
      source=tables.reservations.find(row=>row.id===event.source.id);const code=event.parameters.code;
      if(!source||source.animalId!==animal.id||!['active','fulfilled','cancelled','expired'].includes(code))fail();
      const application=tables.adoptionApplications.find(row=>row.id===source.applicationId);if(!application?.approvalDate)fail();
      const peers=tables.animalEvents.filter(row=>live(row)&&row.type==='reservation'&&row.source.type==='reservation'&&row.source.id===source.id&&row.parameters.code===code);if(peers.length!==1)fail();
      field=code==='active'?'reservationDate':'closedOn';kind=code==='active'?'reservation_start':'reservation_close';
      if(source[field]!==event.eventDate||(code!=='active'&&source.status!==code))fail();minimums.push(application.approvalDate);
      if(code==='active'){if(source.expiresOn)maximums.push(source.expiresOn);if(source.closedOn)maximums.push(source.closedOn);}
      else{
        minimums.push(source.reservationDate);
        if(code==='expired'){if(!source.expiresOn)fail();minimums.push(root.utils.calendar.shiftDays(source.expiresOn,1));}
        if(code==='fulfilled'){const adoptions=tables.adoptions.filter(row=>row.applicationId===application.id);if(adoptions.length!==1)fail();maximums.push(adoptions[0].adoptionDate);}
      }
      affect('reservations',source,field);
    }else fail();
    if(source.archivedAt||source.deletedAt)throw new root.core.errors.AppError('hc.restoreFirst');
    return{eventId:event.id,animalId:animal.id,animalName:animal.name,episodeId:null,type:event.type,kind,field,previousDate:event.eventDate,affected,
      minDate:minimums.sort().at(-1)||null,maxDate:maximums.sort()[0],command:'correctWorkflow',titleKey:'hc.title.'+kind,effectKey:'hc.effect.'+kind};
  }
  root.services.historyWorkflow=Object.freeze({inspect});
}(window.RescueManager));
