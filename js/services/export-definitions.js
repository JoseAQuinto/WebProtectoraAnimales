(function(root){
  'use strict';
  const definitions={
    animals:{table:'animals',date:'entryDate',statuses:root.domain.enums.managementStatus,animal:true},
    contacts:{table:'contacts',contact:true},
    applications:{table:'adoptionApplications',date:'applicationDate',statuses:root.domain.enums.applicationStatus,animal:true,contact:true},
    adoptions:{table:'adoptions',date:'adoptionDate',statuses:['active','returned'],animal:true,contact:true},
    expenses:{table:'financialMovements',date:'date',statuses:['posted','voided'],animal:true,contact:true,direction:'expense'},
    income:{table:'financialMovements',date:'date',statuses:['posted','voided'],animal:true,contact:true,direction:'income'},
    volunteers:{table:'volunteerProfiles',statuses:['active','inactive'],contact:true},
    volunteer_hours:{table:'volunteerHours',date:'date',contact:true},
    donations:{table:'donations',date:'date',statuses:['recorded','voided'],contact:true}
  };
  const columns={
    animals:['id','code','name','species','sex','breed','microchip','birth_date','birth_precision','estimated_age_months','age_reference_date','management_status','availability','location','entry_date','notes'],
    contacts:['id','name','contact_type','phones','email','address','roles','notes','archived_at','deleted_at','merged_into_contact_id'],
    applications:['id','animal_id','animal_code','animal_name','contact_id','contact_name','application_date','status','approval_date','interview_notes','closure_reason','notes'],
    adoptions:['id','animal_id','animal_code','animal_name','contact_id','contact_name','adoption_date','return_date','return_reason','episode_id','financial_movement_id','notes'],
    expenses:['id','date','concept','category','amount_decimal','amount_minor','currency','animal_id','animal_code','contact_id','contact_name','status','void_reason','corrects_movement_id','replacement_movement_id','notes'],
    income:['id','date','concept','category','amount_decimal','amount_minor','currency','animal_id','animal_code','contact_id','contact_name','status','void_reason','corrects_movement_id','replacement_movement_id','notes'],
    volunteers:['id','contact_id','contact_name','availability','functions','specialties','status','notes'],
    volunteer_hours:['id','volunteer_profile_id','contact_id','contact_name','date','activity','duration_minutes','notes'],
    donations:['id','date','donation_type','contact_id','contact_name','status','amount_decimal','amount_minor','currency','financial_movement_id','line_id','material_type','description','quantity_decimal','quantity_scaled','quantity_precision','unit','estimated_value_decimal','estimated_value_minor','inventory_item_id','inventory_movement_id','notes']
  };
  function context(tables){
    const maps=Object.fromEntries(Object.entries(tables).map(([key,rows])=>[key,new Map(rows.map(row=>[row.id,row]))]));
    const get=(table,id)=>maps[table]?.get(id)||null,catalog=id=>{const row=get('catalogOptions',id);return row?root.services.catalogs.label(row):'';};
    const contact=id=>root.services.contacts.resolve(tables,id);
    const entryDates=new Map();for(const row of tables.stayEpisodes)if(!row.deletedAt&&(!entryDates.has(row.animalId)||entryDates.get(row.animalId)<row.entryDate))entryDates.set(row.animalId,row.entryDate);
    const lines=new Map();for(const row of tables.donationLines){if(!lines.has(row.donationId))lines.set(row.donationId,[]);lines.get(row.donationId).push(row);}for(const rows of lines.values())rows.sort((a,b)=>a.id.localeCompare(b.id));
    return{tables,maps,get,catalog,contact,entryDates,lines};
  }
  function describe(kind,row,c){
    const profile=kind==='volunteer_hours'?c.get('volunteerProfiles',row.volunteerProfileId):null;
    const contactId=kind==='contacts'?row.id:row.contactId||row.adopterContactId||row.donorContactId||profile?.contactId;
    const person=c.contact(contactId),animal=kind==='animals'?row:c.get('animals',row.animalId),date=kind==='animals'?c.entryDates.get(row.id)||null:row[definitions[kind].date]||null;
    return{row,animal,contact:person,contactId:contactId||null,date,name:row.name||row.concept||row.activity||[animal?.name,person?.name].filter(Boolean).join(' · '),
      status:kind==='animals'?row.managementStatus:kind==='adoptions'?(row.returnDate?'returned':'active'):row.status||'',notes:row.notes||''};
  }
  function decimal(value,precision){if(value===null||value===undefined)return null;if(!Number.isSafeInteger(value)||!Number.isInteger(precision)||precision<0||precision>3)throw new RangeError('Invalid export quantity');const raw=String(Math.abs(value)).padStart(precision+1,'0');return(value<0?'-':'')+(precision?raw.slice(0,-precision)+'.'+raw.slice(-precision):raw);}
  function money(value,c){return decimal(value,root.utils.money.currencies[c.tables.organizationSettings[0].currencyCode]);}
  function cells(kind,item,c){
    const r=item.row,a=item.animal,p=item.contact,identity=[r.id,r.animalId,a?.code||null,a?.name||null],person=[item.contactId,p?.name||null];
    if(kind==='animals')return[[r.id,r.code,r.name,c.catalog(r.speciesId),r.sex,r.breed,r.microchipOriginal,r.birthDate,r.birthPrecision,r.estimatedAgeMonths,r.estimatedAgeReferenceDate,r.managementStatus,r.adoptionAvailability,r.locationKind==='shelter'?c.get('locations',r.locationId)?.name||'':r.externalLocationDescription||r.locationKind,item.date,r.notes]];
    if(kind==='contacts')return[[r.id,r.name,r.type,JSON.stringify(r.phones),r.email,r.address,r.roles.join('|'),r.notes,r.archivedAt,r.deletedAt,r.mergedIntoContactId]];
    if(kind==='applications')return[[...identity,...person,r.applicationDate,r.status,r.approvalDate,r.interviewNotes,r.closureReason,r.notes]];
    if(kind==='adoptions')return[[...identity,...person,r.adoptionDate,r.returnDate,r.returnReason,r.episodeId,r.financialMovementId,r.notes]];
    if(kind==='expenses'||kind==='income')return[[r.id,r.date,r.concept,c.catalog(r.categoryId),money(r.amountMinor,c),r.amountMinor,r.currencyCode,r.animalId,a?.code||null,...person,r.status,r.voidReason,r.correctsMovementId,r.replacementMovementId,r.notes]];
    if(kind==='volunteers')return[[r.id,...person,r.availability,r.functionIds.map(c.catalog).join(' | '),r.specialties,r.status,r.notes]];
    if(kind==='volunteer_hours')return[[r.id,r.volunteerProfileId,...person,r.date,r.activity,r.durationMinutes,r.notes]];
    const movement=c.get('financialMovements',r.financialMovementId),currency=c.tables.organizationSettings[0].currencyCode,prefix=[r.id,r.date,r.type,...person,r.status,movement?money(movement.amountMinor,c):null,movement?.amountMinor??null,currency,r.financialMovementId];
    return(c.lines.get(r.id)||[null]).map(line=>[...prefix,line?.id||null,line?c.catalog(line.materialTypeId):null,line?.description||null,line?decimal(line.quantityScaled,line.quantityPrecision):null,line?.quantityScaled??null,line?.quantityPrecision??null,line?c.catalog(line.unitId):null,line?money(line.estimatedValueMinor,c):null,line?.estimatedValueMinor??null,line?.inventoryItemId||null,line?.inventoryMovementId||null,r.notes]);
  }
  Object.values(definitions).forEach(Object.freeze);Object.values(columns).forEach(Object.freeze);
  root.services.exportDefinitions=Object.freeze({definitions:Object.freeze(definitions),columns:Object.freeze(columns),context,describe,decimal,cells});
}(window.RescueManager));
