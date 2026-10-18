(function(root){
  'use strict';
  const invalid=(field,code)=>{throw Object.assign(new TypeError(code),{issues:[{field,code}]});},owns=(raw,key)=>Object.hasOwn(raw,key);
  const definition=Object.freeze({table:'financialMovements',entity:'financial_movement',fields:Object.freeze(['external_id','id','direction','date','category_id','category_code','concept','amount','amount_minor','currency','animal_id','animal_code','animal_external_id','contact_id','contact_external_id','status','source_type','source_id','correction_reason','correction_date','notes'])});
  function normalize(raw,tables,options){
    if(raw.id&&!root.utils.ids.isUuidV4(raw.id))invalid('id','import.uuid');if(raw.external_id?.length>200)invalid('external_id','import.externalId');
    const currency=tables.organizationSettings[0].currencyCode,patch={};if(raw.currency&&raw.currency!==currency)invalid('currency','import.currency');
    for(const key of['direction','concept','notes'])if(owns(raw,key))patch[key]=raw[key];
    if(owns(raw,'date'))patch.date=root.services.importAnimals.date(raw.date,options.dateFormat||'iso','date');
    let minor=null,decimal=null;if(raw.amount_minor){if(!/^\d+$/.test(raw.amount_minor)||!Number.isSafeInteger(Number(raw.amount_minor))||Number(raw.amount_minor)<=0)invalid('amount_minor','import.money');minor=Number(raw.amount_minor);}
    if(raw.amount){try{decimal=root.utils.money.parse(raw.amount,currency,{decimalSeparator:options.decimalSeparator||'.'});}catch(_){invalid('amount','import.money');}if(decimal<=0)invalid('amount','import.money');}
    if(minor!==null&&decimal!==null&&minor!==decimal)invalid('amount','import.money');if(owns(raw,'amount')||owns(raw,'amount_minor')){if(minor===null&&decimal===null)invalid('amount','field.required');patch.amountMinor=minor??decimal;}
    if(owns(raw,'category_id')||owns(raw,'category_code')){
      if(raw.category_id&&!root.utils.ids.isUuidV4(raw.category_id))invalid('category_id','import.uuid');
      const found=tables.catalogOptions.filter(row=>(raw.direction?row.kind==='finance_'+raw.direction:['finance_income','finance_expense'].includes(row.kind))&&(!raw.category_id||row.id===raw.category_id)&&(!raw.category_code||row.code===raw.category_code));
      if(!raw.category_id&&!raw.category_code||found.length!==1)invalid('category_id','import.reference');patch.categoryId=found[0].id;
    }
    for(const kind of['animal','contact'])if([kind+'_id',kind+'_code',kind+'_external_id'].some(key=>owns(raw,key)))patch[kind+'Id']=root.services.importRelated.reference(raw,kind,tables,options);
    const correctionDate=owns(raw,'correction_date')?root.services.importAnimals.date(raw.correction_date,options.dateFormat||'iso','correction_date'):null;
    return{id:raw.id||null,externalId:raw.external_id||null,patch,correctionDate,raw};
  }
  function matches(value,tables){const p=value.patch;if(!p.direction||!p.date||!p.concept||!p.amountMinor)return[];return tables.financialMovements.filter(row=>row.status==='posted'&&row.direction===p.direction&&row.date===p.date&&row.amountMinor===p.amountMinor&&row.concept===p.concept&&(row.contactId||null)===(p.contactId||null)&&(row.animalId||null)===(p.animalId||null)).map(row=>({id:row.id,reasons:['movement'],strong:true}));}
  function label(row){return(row?.date||'')+' · '+(row?.concept||'');}
  function build(value,transaction,action,targetId){
    const{data,h,stage}=transaction,p={...value.patch};
    if(value.raw.status&&value.raw.status!=='posted')invalid('status','import.lifecycle');
    if(action==='create'){
      if(value.raw.source_type||value.raw.source_id||value.raw.correction_reason||value.correctionDate)invalid('source_id','import.lifecycle');
      for(const field of['direction','date','categoryId','concept','amountMinor'])if(!p[field])invalid({categoryId:'category_id',amountMinor:'amount'}[field]||field,'field.required');
      const built=root.services.financeCommands.create(data,h,p);stage(built.changes);return built.result.id;
    }
    const previous=h.find('financialMovements',targetId);if(owns(p,'direction')&&p.direction!==previous.direction)invalid('direction','import.lifecycle');delete p.direction;
    if(value.raw.source_type&&value.raw.source_type!==previous.source?.type||value.raw.source_id&&value.raw.source_id!==previous.source?.id)invalid('source_id','import.lifecycle');
    if(!value.raw.correction_reason)invalid('correction_reason','field.required');if(!value.correctionDate)invalid('correction_date','field.required');
    if(value.correctionDate<previous.date||value.correctionDate<(p.date||previous.date))invalid('correction_date','import.date');
    const built=root.services.financeCommands.correct(data,h,targetId,p,{reason:value.raw.correction_reason,date:value.correctionDate});stage(built.changes);return built.result.id;
  }
  function mapping(headers){const aliases={amount_decimal:'amount',currency_code:'currency'};return headers.map(header=>{const key=header.toLowerCase().trim();if(definition.fields.includes(key))return key;if(aliases[key])return aliases[key];for(const field of definition.fields){const exported=field==='amount'?'amount_decimal':field;for(const language of['en','es'])if(root.locales[language]?.['ex.column.'+exported]===header)return field;}return'';});}
  root.services.importFinance=Object.freeze({definition,normalize,matches,label,build,mapping});
}(window.RescueManager));
