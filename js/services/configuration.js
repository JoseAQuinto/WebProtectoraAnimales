(function(root){
  'use strict';
  function only(input,fields,h){if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!fields.includes(key)))h.fail('InvalidInputError','Unexpected configuration field');}
  function log(h,type,id,operation){return h.insert('activityLog',h.create('activityLog',{operation,occurredAt:h.now,operationId:h.operationId,target:{type,id},summaryParameters:{}}));}
  function editable(row,h){if(row.deletedAt||row.archivedAt)h.fail('InvalidStateError','Restore this configuration record first');return row;}
  function createOption(input,command){return root.services.context.execute('configuration.option.create',input,(data,h)=>{
    only(input,['kind','customLabel','sortOrder','active'],h);
    const row=h.create('catalogOptions',{...input,code:'custom_'+root.utils.ids.uuidV4(),isSystem:false,labelKey:null});
    return{changes:[h.insert('catalogOptions',row),log(h,'catalog_option',row.id,'create')],result:{id:row.id}};
  },command);}
  function updateOption(id,patch,command){return root.services.context.execute('configuration.option.update',{id,patch},(data,h)=>{
    const previous=editable(h.find('catalogOptions',id),h);only(patch,previous.isSystem?['active','sortOrder']:['customLabel','active','sortOrder'],h);
    const row=h.edit('catalogOptions',previous,patch);return{changes:[h.replace('catalogOptions',row),log(h,'catalog_option',id,'update')],result:{id}};
  },command);}
  function parent(data,h,id,parentId,previousParent){
    if(!parentId)return;
    let cursor=h.find('locations',parentId);
    if(parentId!==previousParent&&(!cursor.active||cursor.archivedAt||cursor.deletedAt))h.fail('InvalidStateError','Choose an active parent location');
    while(cursor){if(cursor.id===id)h.fail('InvalidInputError','A location cannot contain itself or one of its parents');cursor=cursor.parentLocationId?data.locations.find(row=>row.id===cursor.parentLocationId):null;}
  }
  function createLocation(input,command){return root.services.context.execute('configuration.location.create',input,(data,h)=>{
    only(input,['name','type','parentLocationId','active','notes'],h);parent(data,h,null,input.parentLocationId,null);
    const row=h.create('locations',input);return{changes:[h.insert('locations',row),log(h,'location',row.id,'create')],result:{id:row.id}};
  },command);}
  function updateLocation(id,patch,command){return root.services.context.execute('configuration.location.update',{id,patch},(data,h)=>{
    only(patch,['name','type','parentLocationId','active','notes'],h);const previous=editable(h.find('locations',id),h);
    if(Object.hasOwn(patch,'parentLocationId'))parent(data,h,id,patch.parentLocationId,previous.parentLocationId);
    const row=h.edit('locations',previous,patch);return{changes:[h.replace('locations',row),log(h,'location',id,'update')],result:{id}};
  },command);}
  root.services.configuration=Object.freeze({createOption,updateOption,createLocation,updateLocation});
}(window.RescueManager));
