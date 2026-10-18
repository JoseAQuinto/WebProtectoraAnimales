(function(root){
  'use strict';
  function references(table,record){
    const result=[];function scan(field,value,path){if(value===null||value===undefined)return;if(field.ref)result.push({table:field.ref.table,id:value,path});else if(field.originRef)result.push({table:root.domain.entityTables[value.type],id:value.id,path:path+'.id'});else if(field.type==='array')value.forEach((item,index)=>scan(field.items,item,path+'.'+index));else if(field.type==='object')for(const[key,child]of Object.entries(field.fields))scan(child,value[key],path+'.'+key);}
    for(const[key,field]of Object.entries(root.domain.schemas[table].fields))scan(field,record[key],key);
    if(table==='documentLinks'||table==='importIdentityMap')result.push({table:root.domain.entityTables[record.entityType],id:record.entityId,path:'entityId'});return result;
  }
  root.services.recordGraph=Object.freeze({references});
}(window.RescueManager));
