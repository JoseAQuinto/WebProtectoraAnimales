(function(root){
  'use strict';
  const invalid=(field,code)=>{throw Object.assign(new TypeError(code),{issues:[{field,code}]});},owns=(raw,key)=>Object.hasOwn(raw,key);
  function uuid(value,field){if(value&&!root.utils.ids.isUuidV4(value))invalid(field,'import.uuid');return value||null;}
  function reference(raw,kind,tables,options){
    const idField=kind+'_id',externalField=kind+'_external_id',codeField=kind+'_code',table=kind==='contact'?'contacts':'animals',values=[];
    if(raw[idField]){uuid(raw[idField],idField);values.push(raw[idField]);}
    if(raw[externalField]){const found=tables.importIdentityMap.find(row=>row.source===options.source&&row.entityType===kind&&row.externalId===raw[externalField]);if(!found)invalid(externalField,'import.reference');values.push(found.entityId);}
    if(kind==='animal'&&raw[codeField]){const found=tables.animals.filter(row=>row.code===raw[codeField]);if(found.length!==1)invalid(codeField,'import.reference');values.push(found[0].id);}
    if(!values.length)return null;
    const resolved=values.map(id=>kind==='contact'?root.services.contacts.resolve(tables,id)?.id:id);if(resolved.some(id=>!id)||new Set(resolved).size!==1||!tables[table].some(row=>row.id===resolved[0]))invalid(idField,'import.reference');return resolved[0];
  }
  const common=['external_id','id'],contact=['contact_id','contact_external_id'];
  const definitions={
    volunteers:{table:'volunteerProfiles',entity:'volunteer_profile',fields:[...common,...contact,'availability','function_ids','function_codes','specialties','status','notes']},
    movements:root.services.importFinance.definition,
    donations:root.services.importDonations.definition,
    applications:{table:'adoptionApplications',entity:'adoption_application',fields:[...common,'animal_id','animal_code','animal_external_id',...contact,'application_date','status','review_date','approval_date','closure_date','closure_reason','interview_notes','notes']}
  };
  function normalize(kind,raw,tables,options,source){
    if(kind==='donations')return root.services.importDonations.normalize(raw,tables,options,source);
    if(kind==='movements')return root.services.importFinance.normalize(raw,tables,options);
    const def=definitions[kind];if(!def)throw new TypeError('Unsupported related CSV');const id=uuid(raw.id,'id');if(raw.external_id?.length>200)invalid('external_id','import.externalId');
    const value={id,externalId:raw.external_id||null,contactId:reference(raw,'contact',tables,options),contactMapped:owns(raw,'contact_id')||owns(raw,'contact_external_id'),patch:{},raw};
    if(kind==='volunteers'){
      for(const key of['availability','specialties','status','notes'])if(owns(raw,key))value.patch[key]=raw[key];
      if(owns(raw,'function_ids')||owns(raw,'function_codes')){
        const ids=(raw.function_ids||'').split('|').map(text=>text.trim()).filter(Boolean),codes=(raw.function_codes||'').split('|').map(text=>text.trim()).filter(Boolean);ids.forEach(id=>uuid(id,'function_ids'));
        const resolved=codes.map(code=>{const found=tables.catalogOptions.filter(row=>row.kind==='volunteer_function'&&row.code===code);if(found.length!==1)invalid('function_codes','import.reference');return found[0].id;});
        for(const id of ids)if(!tables.catalogOptions.some(row=>row.id===id&&row.kind==='volunteer_function'))invalid('function_ids','import.reference');
        if(ids.length&&codes.length&&JSON.stringify([...ids].sort())!==JSON.stringify([...resolved].sort()))invalid('function_ids','import.reference');value.patch.functionIds=ids.length?ids:resolved;
      }
    }else{
      value.animalId=reference(raw,'animal',tables,options);const dates={application_date:'applicationDate',review_date:'reviewDate',approval_date:'approvalDate',closure_date:'closureDate'};
      for(const[key,field]of Object.entries(dates))if(owns(raw,key))value[field]=root.services.importAnimals.date(raw[key],options.dateFormat||'iso',key);
      for(const[key,field]of Object.entries({interview_notes:'interviewNotes',notes:'notes'}))if(owns(raw,key))value.patch[field]=raw[key];
      if(raw.status&&!['pending','under_review','approved','rejected','cancelled','completed'].includes(raw.status))invalid('status','value.enum');value.status=raw.status||null;
    }
    return value;
  }
  function matches(kind,value,tables){
    if(kind==='donations')return root.services.importDonations.matches(value,tables);
    if(kind==='movements')return root.services.importFinance.matches(value,tables);
    const def=definitions[kind];return tables[def.table].filter(row=>kind==='volunteers'?value.contactId&&row.contactId===value.contactId:value.animalId&&value.contactId&&value.applicationDate&&row.animalId===value.animalId&&row.contactId===value.contactId&&row.applicationDate===value.applicationDate).map(row=>({id:row.id,reasons:[kind==='volunteers'?'contact':'application'],strong:true}));
  }
  function label(kind,row,tables){if(kind==='donations')return root.services.importDonations.label(row);if(kind==='movements')return root.services.importFinance.label(row);const contact=root.services.contacts.resolve(tables,row.contactId);return kind==='volunteers'?contact?.name||'':(tables.animals.find(animal=>animal.id===row.animalId)?.name||'')+' · '+(contact?.name||'');}
  function build(kind,normalized,transaction,action,targetId){
    if(kind==='donations')return root.services.importDonations.build(normalized,transaction,action,targetId);
    if(kind==='movements')return root.services.importFinance.build(normalized,transaction,action,targetId);
    const{h,data,stage}=transaction,def=definitions[kind],previous=action==='update'?h.find(def.table,targetId):null;
    if(kind==='volunteers'){
      if(previous&&normalized.contactMapped&&!normalized.contactId)invalid('contact_id','field.required');
      if(previous&&normalized.contactId&&normalized.contactId!==previous.contactId)invalid('contact_id','import.lifecycle');
      if(!previous&&!normalized.contactId)invalid('contact_id','field.required');
      const built=previous?root.services.volunteerCommands.update(data,h,targetId,normalized.patch):root.services.volunteerCommands.create(data,h,{contactId:normalized.contactId,...normalized.patch});stage(built.changes);return previous?.id||built.result.id;
    }
    const commands=root.services.applicationCommands;
    if(previous){
      if(normalized.contactMapped&&!normalized.contactId)invalid('contact_id','field.required');
      if(['animal_id','animal_code','animal_external_id'].some(key=>owns(normalized.raw,key))&&!normalized.animalId)invalid('animal_id','field.required');
      if(owns(normalized.raw,'application_date')&&!normalized.applicationDate)invalid('application_date','field.required');
      for(const[key,field]of[['animalId','animal_id'],['contactId','contact_id'],['applicationDate','application_date']])if(normalized[key]&&normalized[key]!==previous[key])invalid(field,'import.lifecycle');
      if(Object.keys(normalized.patch).length)stage(commands.notes(data,h,targetId,normalized.patch).changes);
    }else{
      if(!normalized.animalId)invalid('animal_id','field.required');if(!normalized.contactId)invalid('contact_id','field.required');if(!normalized.applicationDate)invalid('application_date','field.required');
      const built=commands.create(data,h,{animalId:normalized.animalId,contactId:normalized.contactId,applicationDate:normalized.applicationDate,...normalized.patch});targetId=built.result.applicationId;stage(built.changes);
    }
    let current=h.find(def.table,targetId);const desired=normalized.status||current.status;
    if(normalized.reviewDate&&normalized.approvalDate&&normalized.approvalDate<normalized.reviewDate)invalid('approval_date','import.date');
    if(normalized.approvalDate&&['pending','under_review'].includes(desired))invalid('approval_date','import.lifecycle');
    if(normalized.closureDate&&!['rejected','cancelled'].includes(desired)||normalized.raw.closure_reason&&!['rejected','cancelled'].includes(desired))invalid('closure_date','import.lifecycle');
    if(normalized.reviewDate&&desired==='pending')invalid('review_date','import.lifecycle');
    if(current.status==='pending'&&normalized.reviewDate&&desired!=='pending'){
      stage(commands.review(data,h,{applicationId:targetId,reviewDate:normalized.reviewDate}).changes);current=h.find(def.table,targetId);
    }
    if(['rejected','cancelled'].includes(desired)&&normalized.approvalDate&&['pending','under_review'].includes(current.status)){
      stage(commands.approve(data,h,{applicationId:targetId,approvalDate:normalized.approvalDate}).changes);current=h.find(def.table,targetId);
    }
    if(desired==='completed'&&current.status!=='completed')invalid('status','import.lifecycle');
    if(desired!==current.status){
      if(desired==='pending')invalid('status','import.lifecycle');
      if(desired==='under_review'){if(!normalized.reviewDate)invalid('review_date','field.required');stage(commands.review(data,h,{applicationId:targetId,reviewDate:normalized.reviewDate}).changes);}
      else if(desired==='approved'){if(!normalized.approvalDate)invalid('approval_date','field.required');stage(commands.approve(data,h,{applicationId:targetId,approvalDate:normalized.approvalDate}).changes);}
      else if(['rejected','cancelled'].includes(desired)){
        if(!normalized.closureDate)invalid('closure_date','field.required');
        // Reservations need explicit availability and closure decisions in the normal workflow.
        if(data.reservations.some(row=>row.applicationId===targetId&&row.status==='active'))invalid('status','import.lifecycle');
        stage(commands.close(data,h,{applicationId:targetId,date:normalized.closureDate,reason:normalized.raw.closure_reason},desired).changes);
      }
    }else if(normalized.approvalDate&&normalized.approvalDate!==current.approvalDate)invalid('approval_date','import.lifecycle');
    if(normalized.reviewDate&&!data.animalEvents.some(row=>row.source.type==='adoption_application'&&row.source.id===targetId&&row.parameters.code==='under_review'&&!row.supersededByEventId&&!row.voidReason&&row.eventDate===normalized.reviewDate))invalid('review_date','import.lifecycle');
    if(normalized.closureDate&&desired===current.status&&!data.animalEvents.some(row=>row.source.type==='adoption_application'&&row.source.id===targetId&&row.parameters.code===desired&&!row.supersededByEventId&&!row.voidReason&&row.eventDate===normalized.closureDate))invalid('closure_date','import.lifecycle');
    const final=h.find(def.table,targetId);if(normalized.raw.closure_reason&&final.closureReason!==normalized.raw.closure_reason)invalid('closure_reason','import.lifecycle');
    return targetId;
  }
  function mapping(kind,headers){if(kind==='donations')return root.services.importDonations.mapping(headers);if(kind==='movements')return root.services.importFinance.mapping(headers);const fields=definitions[kind].fields,aliases={functions:'function_codes'};return headers.map(header=>{const key=header.toLowerCase().trim();if(fields.includes(key))return key;if(aliases[key]&&fields.includes(aliases[key]))return aliases[key];for(const field of fields)for(const language of['en','es'])if(root.locales[language]?.['ex.column.'+field]===header)return field;return'';});}
  root.services.importRelated=Object.freeze({definitions,normalize,matches,label,build,mapping,reference});
}(window.RescueManager));
