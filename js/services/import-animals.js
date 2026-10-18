(function(root){
  'use strict';
  const fields=Object.freeze(['external_id','id','code','name','species_id','species_code','breed','sex','birth_date','birth_precision','estimated_age_months','age_reference_date','size_id','size_code','color','microchip','sterilization_status','sterilization_date','description','character','behavior','special_needs','notes','management_status','entry_date','entry_reason','origin_description','episode_notes','location_kind','location_id','external_location_description','availability']);
  const profile={code:'code',name:'name',breed:'breed',sex:'sex',birth_date:'birthDate',birth_precision:'birthPrecision',estimated_age_months:'estimatedAgeMonths',age_reference_date:'estimatedAgeReferenceDate',color:'color',microchip:'microchipOriginal',sterilization_status:'sterilizationStatus',sterilization_date:'sterilizationDate',description:'description',character:'character',behavior:'behavior',special_needs:'specialNeeds',notes:'notes'};
  const notes=new Set(['description','character','behavior','special_needs','notes']),nullable=new Set(['breed','birth_date','estimated_age_months','age_reference_date','color','microchip','sterilization_date']);
  const invalid=(field,code)=>{throw Object.assign(new TypeError(code),{issues:[{field,code}]});};
  function date(value,format,field){
    if(!value)return null;let normalized=value;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value)){
      const match=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
      if(!match||format==='iso')invalid(field,'import.date');
      normalized=match[3]+'-'+(format==='day_first'?match[2]:match[1])+'-'+(format==='day_first'?match[1]:match[2]);
    }
    if(!root.utils.dates.isValid(normalized))invalid(field,'import.date');return normalized;
  }
  function normalize(raw,tables,options={}){
    const format=options.dateFormat||'iso';if(!['iso','day_first','month_first'].includes(format))invalid('entry_date','import.date');
    if(raw.id&&!root.utils.ids.isUuidV4(raw.id))invalid('id','import.uuid');
    if(raw.external_id&&raw.external_id.length>200)invalid('external_id','import.externalId');
    const patch={};for(const[field,key]of Object.entries(profile))if(Object.hasOwn(raw,field)){
      const value=raw[field];patch[key]=nullable.has(field)&&!value?null:value;
      if(notes.has(field))patch[key]=value;
      if(['birth_date','age_reference_date','sterilization_date'].includes(field))patch[key]=date(value,format,field);
      if(field==='estimated_age_months'&&value){if(!/^\d+$/.test(value)||!Number.isSafeInteger(Number(value)))invalid(field,'import.integer');patch[key]=Number(value);}
    }
    for(const kind of['species','size'])if(Object.hasOwn(raw,kind+'_id')||Object.hasOwn(raw,kind+'_code')){
      const id=raw[kind+'_id']||null,code=raw[kind+'_code']||null;
      if(id&&!root.utils.ids.isUuidV4(id))invalid(kind+'_id','import.uuid');
      const matches=tables.catalogOptions.filter(row=>row.kind===kind&&(!id||row.id===id)&&(!code||row.code===code));
      if(!id&&!code)patch[kind+'Id']=null;
      else if(matches.length!==1)invalid(kind+'_id','import.reference');else patch[kind+'Id']=matches[0].id;
    }
    const lifecycle={};for(const key of['management_status','entry_reason','origin_description','episode_notes','location_kind','location_id','external_location_description','availability'])if(Object.hasOwn(raw,key))lifecycle[key]=raw[key];
    if(Object.hasOwn(raw,'entry_date'))lifecycle.entry_date=date(raw.entry_date,format,'entry_date');
    return{patch,lifecycle,id:raw.id||null,externalId:raw.external_id||null};
  }
  function entry(normalized){
    const l=normalized.lifecycle;if(l.management_status&&l.management_status!=='under_care')invalid('management_status','import.lifecycle');
    if(!l.entry_date)invalid('entry_date','field.required');if(!l.entry_reason)invalid('entry_reason','field.required');
    if(!['shelter','temporary_external'].includes(l.location_kind))invalid('location_kind','import.location');
    return{animal:normalized.patch,date:l.entry_date,entryReason:l.entry_reason,originDescription:l.origin_description||'',notes:l.episode_notes||'',availability:l.availability,
      location:l.location_kind==='shelter'?{kind:'shelter',id:l.location_id}:{kind:'temporary_external',description:l.external_location_description}};
  }
  function checkUpdate(normalized,previous,tables){
    const episode=tables.stayEpisodes.filter(row=>row.animalId===previous.id).sort((a,b)=>b.entryDate.localeCompare(a.entryDate)||b.id.localeCompare(a.id))[0];
    const expected={management_status:previous.managementStatus,availability:previous.adoptionAvailability,location_kind:previous.locationKind,location_id:previous.locationId,external_location_description:previous.externalLocationDescription,entry_date:episode?.entryDate,entry_reason:episode?.entryReason,origin_description:episode?.originDescription,episode_notes:episode?.notes};
    for(const[key,value]of Object.entries(normalized.lifecycle))if((value||null)!==(expected[key]||null))invalid(key,'import.lifecycle');
    // Profile changes must also respect existing episodes when the birth date changes.
    if(normalized.patch.birthDate&&tables.stayEpisodes.some(row=>row.animalId===previous.id&&row.entryDate<normalized.patch.birthDate))invalid('birth_date','animal.entryBeforeBirth');
  }
  function mapping(headers){
    const aliases={microchip_original:'microchip',adoption_availability:'availability',estimated_age_reference_date:'age_reference_date'};
    return headers.map(header=>{const key=header.toLowerCase().trim();if(fields.includes(key))return key;if(aliases[key])return aliases[key];for(const field of fields)for(const language of['en','es'])if(root.locales[language]?.['ex.column.'+field]===header&&!['species','location'].includes(field))return field;return'';});
  }
  root.services.importAnimals=Object.freeze({fields,normalize,entry,checkUpdate,mapping,date});
}(window.RescueManager));
