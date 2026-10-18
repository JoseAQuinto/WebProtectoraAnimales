(function(root){
  'use strict';
  const fields=Object.freeze(['external_id','id','type','name','phones','email','address','roles','notes']),forbidden=new Set(['__proto__','constructor','prototype']);
  const invalid=(field,code)=>{throw Object.assign(new TypeError(code),{issues:[{field,code}]});};
  function normalize(raw){
    const input={type:raw.type||'person',name:raw.name||'',phones:[],email:raw.email||null,address:raw.address||null,roles:raw.roles?raw.roles.split('|').map(value=>value.trim()).filter(Boolean):[],notes:raw.notes||''};
    if(raw.phones){
      if(raw.phones.trim().startsWith('[')){
        let values;try{values=JSON.parse(raw.phones,(key,value)=>{if(forbidden.has(key))throw new TypeError('Unsafe phone key');return value;});}catch(_){invalid('phones','import.phoneJSON');}
        if(!Array.isArray(values)||values.length>10)invalid('phones','import.phoneJSON');
        input.phones=values.map(phone=>{if(!phone||typeof phone!=='object'||Array.isArray(phone)||Object.keys(phone).some(key=>!['label','original','normalized'].includes(key))||typeof phone.original!=='string'||phone.label!==undefined&&typeof phone.label!=='string')invalid('phones','import.phoneJSON');return{label:phone.label||'',original:phone.original};});
      }else input.phones=[{label:'',original:raw.phones}];
    }
    if(raw.id&&!root.utils.ids.isUuidV4(raw.id))invalid('id','import.uuid');
    if(raw.external_id&&raw.external_id.length>200)invalid('external_id','import.externalId');
    return{input,patch:Object.fromEntries(Object.entries(input).filter(([key])=>Object.hasOwn(raw,key))),id:raw.id||null,externalId:raw.external_id||null};
  }
  function mapping(headers){
    const aliases={contact_type:'type'};return headers.map(header=>{const key=header.toLowerCase().trim();if(fields.includes(key))return key;if(aliases[key])return aliases[key];for(const field of fields){const exportField=field==='type'?'contact_type':field;for(const language of['en','es'])if(root.locales[language]?.['ex.column.'+exportField]===header)return field;}return'';});
  }
  root.services.importContacts=Object.freeze({fields,normalize,mapping});
}(window.RescueManager));
