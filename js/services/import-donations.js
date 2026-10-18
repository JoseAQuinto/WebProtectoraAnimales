(function(root){
  'use strict';
  const fields=Object.freeze(['group_id','external_id','id','type','date','contact_id','contact_external_id','currency','category_id','category_code','concept','amount','amount_minor','material_type_id','material_type_code','description','quantity','quantity_scaled','quantity_precision','unit_id','unit_code','inventory_item_id','estimated_value','estimated_value_minor','financial_movement_id','inventory_movement_id','status','correction_reason','correction_date','notes']);
  const definition=Object.freeze({table:'donations',entity:'donation',fields}),common=['external_id','id','type','date','contact_id','contact_external_id','currency','status','correction_reason','correction_date','financial_movement_id','notes'];
  const invalid=(field,code,line)=>{throw Object.assign(new TypeError(code),{issues:[{field,code,...(line?{line}:{})}]});};
  function group(parsed,mapping){
    const grouped=new Map(),rows=[];
    for(const source of parsed.rows){const raw={};mapping.forEach((key,index)=>{if(key)raw[key]=source.cells[index]||'';});const key=raw.group_id||((raw.type==='material'&&raw.id)?raw.id:null);
      if(key&&grouped.has(key)){const target=grouped.get(key);target.members.push({...source,raw});target.lines.push(source.line);target.errors.push(...source.errors.map(issue=>({...issue,line:source.line})));continue;}
      const target={...source,members:[{...source,raw}],lines:[source.line],errors:source.errors.map(issue=>({...issue,line:source.line}))};rows.push(target);if(key)grouped.set(key,target);
    }return rows;
  }
  function scaled(raw,valueField,scaledField,precision,separator,allowZero=false){
    let a=null,b=null;if(raw[scaledField]){if(!/^\d+$/.test(raw[scaledField])||!Number.isSafeInteger(Number(raw[scaledField])))invalid(scaledField,'import.money');a=Number(raw[scaledField]);}
    if(raw[valueField]){try{b=root.utils.quantities.parse(raw[valueField],precision,{decimalSeparator:separator});}catch(_){invalid(valueField,'import.money');}}
    if(a!==null&&b!==null&&a!==b)invalid(valueField,'import.money');const result=a??b;if(result!==null&&(result<0||!allowZero&&result===0))invalid(valueField,'import.money');return result;
  }
  function option(raw,kind,tables,idField,codeField){
    const id=raw[idField],code=raw[codeField];if(id&&!root.utils.ids.isUuidV4(id))invalid(idField,'import.uuid');
    const found=tables.catalogOptions.filter(row=>row.kind===kind&&(!id||row.id===id)&&(!code||row.code===code));if(!id&&!code||found.length!==1)invalid(idField,'import.reference');return found[0].id;
  }
  function normalize(raw,tables,options,source){
    const merged={...raw};for(const field of common){const values=source.members.map(row=>row.raw[field]||'').filter(Boolean);if(new Set(values).size>1)invalid(field,'import.group',source.members.find(row=>row.raw[field]&&row.raw[field]!==values[0])?.line);if(values.length)merged[field]=values[0];}
    if(merged.id&&!root.utils.ids.isUuidV4(merged.id))invalid('id','import.uuid');if((merged.external_id||merged.group_id||'').length>200)invalid('external_id','import.externalId');
    if(!['monetary','material'].includes(merged.type))invalid('type','value.enum');if(merged.type==='monetary'&&source.members.length!==1||source.members.length>1000)invalid('group_id','import.group');
    if(merged.type==='material'&&!merged.group_id&&!merged.id)invalid('group_id','field.required');
    if(merged.group_id&&merged.group_id!==merged.group_id.trim())invalid('group_id','text.lengthOrWhitespace');
    const value={id:merged.id||null,externalId:merged.external_id||merged.group_id||null,type:merged.type,raw:merged,contactId:root.services.importRelated.reference(merged,'contact',tables,options),date:root.services.importAnimals.date(merged.date,options.dateFormat||'iso','date'),sourceMovements:source.members.some(row=>!!row.raw.inventory_movement_id),lines:[]};
    if(merged.currency&&merged.currency!==tables.organizationSettings[0].currencyCode)invalid('currency','import.currency');
    if(merged.type==='monetary'){if(['quantity','quantity_scaled','quantity_precision','material_type_id','material_type_code','description','unit_id','unit_code','estimated_value','estimated_value_minor','inventory_item_id','inventory_movement_id'].some(key=>merged[key]))invalid('type','import.group');value.finance=root.services.importFinance.normalize({...merged,direction:'income'},tables,options);return value;}
    if(source.members.some(row=>['amount','amount_minor','category_id','category_code','concept'].some(key=>row.raw[key])))invalid('type','import.group');
    for(const member of source.members){
      try{
        const line=member.raw,precision=line.quantity_precision?Number(line.quantity_precision):0;if(line.quantity_precision&&!/^\d+$/.test(line.quantity_precision)||!Number.isInteger(precision)||precision<0||precision>3)invalid('quantity_precision','import.integer');
        const quantity=scaled(line,'quantity','quantity_scaled',precision,options.decimalSeparator||'.');if(quantity===null)invalid('quantity','field.required');
        if(line.inventory_item_id&&!root.utils.ids.isUuidV4(line.inventory_item_id))invalid('inventory_item_id','import.uuid');
        const estimated=scaled(line,'estimated_value','estimated_value_minor',root.utils.money.currencies[tables.organizationSettings[0].currencyCode],options.decimalSeparator||'.',true);
        const unitId=option(line,'unit',tables,'unit_id','unit_code');if(line.inventory_item_id){const item=tables.inventoryItems.find(row=>row.id===line.inventory_item_id);if(!item||item.unitId!==unitId||item.quantityPrecision!==precision)invalid('inventory_item_id','import.reference');}
        value.lines.push({materialTypeId:option(line,'material_type',tables,'material_type_id','material_type_code'),description:line.description||'',quantityScaled:quantity,quantityPrecision:precision,unitId,inventoryItemId:line.inventory_item_id||null,estimatedValueMinor:estimated});
      }catch(problem){if(problem.issues)problem.issues=problem.issues.map(issue=>({...issue,line:member.line}));throw problem;}
    }return value;
  }
  function matches(value,tables){return tables.donations.filter(row=>row.type===value.type&&row.date===value.date&&(row.donorContactId||null)===(value.contactId||null)&&(value.type==='monetary'?tables.financialMovements.find(movement=>movement.id===row.financialMovementId)?.amountMinor===value.finance.patch.amountMinor:row.notes===(value.raw.notes||''))).map(row=>({id:row.id,reasons:['donation'],strong:true}));}
  function label(row){return(row?.date||'')+' · '+(row?.notes||row?.type||'');}
  function build(value,transaction,action,targetId){
    const{data,h,stage}=transaction;
    if(value.raw.status&&value.raw.status!=='recorded')invalid('status','import.lifecycle');
    if(action==='create'){
      if(value.raw.correction_reason||value.raw.correction_date||sourceHasStoredMovement(value))invalid('financial_movement_id','import.lifecycle');
      if(!value.date)invalid('date','field.required');
      let built;if(value.type==='monetary'){
        const p=value.finance.patch;for(const[key,field]of[['categoryId','category_id'],['concept','concept'],['amountMinor','amount']])if(!p[key])invalid(field,'field.required');
        built=root.services.donationCommands.monetary(data,h,{date:value.date,donorContactId:value.contactId,categoryId:p.categoryId,concept:p.concept,amountMinor:p.amountMinor,notes:value.raw.notes||''});
      }else built=root.services.donationCommands.material(data,h,{date:value.date,donorContactId:value.contactId,notes:value.raw.notes||'',lines:value.lines});
      stage(built.changes);return built.result.id;
    }
    const previous=h.find('donations',targetId);if(previous.type!=='monetary'||value.type!=='monetary'||previous.status!=='recorded')invalid('type','import.lifecycle');
    if(value.raw.financial_movement_id&&value.raw.financial_movement_id!==previous.financialMovementId)invalid('financial_movement_id','import.lifecycle');
    if(!value.raw.correction_reason)invalid('correction_reason','field.required');if(!value.finance.correctionDate)invalid('correction_date','field.required');
    if(value.finance.correctionDate<previous.date||value.finance.correctionDate<(value.date||previous.date))invalid('correction_date','import.date');
    const p={...value.finance.patch};delete p.direction;const built=root.services.financeCommands.correct(data,h,previous.financialMovementId,p,{reason:value.raw.correction_reason,date:value.finance.correctionDate});stage(built.changes);
    if(Object.hasOwn(value.raw,'notes'))stage([h.replace('donations',h.edit('donations',h.find('donations',targetId),{notes:value.raw.notes}))]);
    return targetId;
  }
  function sourceHasStoredMovement(value){return!!value.raw.financial_movement_id||value.sourceMovements;}
  function mapping(headers){const aliases={donation_type:'type',amount_decimal:'amount',quantity_decimal:'quantity',estimated_value_decimal:'estimated_value',donor_contact_id:'contact_id'};return headers.map(header=>{const key=header.toLowerCase().trim();if(fields.includes(key))return key;if(aliases[key])return aliases[key];for(const field of fields){const exported={type:'donation_type',amount:'amount_decimal',quantity:'quantity_decimal',estimated_value:'estimated_value_decimal'}[field]||field;for(const language of['en','es'])if(root.locales[language]?.['ex.column.'+exported]===header)return field;}return'';});}
  root.services.importDonations=Object.freeze({definition,group,normalize,matches,label,build,mapping});
}(window.RescueManager));
