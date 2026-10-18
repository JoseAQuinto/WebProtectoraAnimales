(function(root){
  'use strict';
  const packages=new WeakSet(),owns=(o,k)=>Object.hasOwn(o,k),fail=(path)=>{throw new root.core.errors.AppError('mj.invalidFile',[{path}]);};
  function shape(value,keys,path){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length||keys.some(key=>!owns(value,key)))fail(path);}
  const integer=value=>Number.isSafeInteger(value)&&value>=0;
  function instant(value){try{return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)&&new Date(value).toISOString()===value;}catch(_){return false;}}
  function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
  async function read(file){
    if(!(file instanceof Blob)||!file.size||file.size>root.config.limits.backupBytes)fail('file.size');
    const bytes=new Uint8Array(await file.arrayBuffer());let container;
    try{container=root.services.backupCodec.parseStrict(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch(_){fail('file.json');}
    shape(container,['format','formatVersion','appVersion','schemaVersion','module','exportedAt','source','scope','organization','includesFiles','assetPolicy','notBackup','referencePolicy','records','references'],'container');
    if(container.format!=='rescue-manager-module-export'||container.includesFiles!==false||container.notBackup!==true||container.assetPolicy!=='metadata-only')fail('format');
    if(container.formatVersion!==1||container.schemaVersion!==root.config.schemaVersion)throw root.storage.error('VersionError','Incompatible module JSON version');
    if(!['selected-related-and-forward-v1','selected-related-and-forward-v2'].includes(container.referencePolicy)||typeof container.appVersion!=='string'||!/^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/.test(container.appVersion)||container.appVersion.length>80||!instant(container.exportedAt))fail('metadata');
    if(!owns(root.services.exportDefinitions.definitions,container.module))fail('module');const definition=root.services.exportDefinitions.definitions[container.module];
    shape(container.source,['datasetId','dataRevision','globalRevision'],'source');if(!root.utils.ids.isUuidV4(container.source.datasetId)||!integer(container.source.dataRevision)||!integer(container.source.globalRevision))fail('source');
    shape(container.organization,['name','currencyCode','timeZone'],'organization');const org=container.organization;if(typeof org.name!=='string'||!org.name.trim()||org.name.length>120||org.name!==org.name.trim()||!root.domain.enums.currency.includes(org.currencyCode))fail('organization');
    try{new Intl.DateTimeFormat('en',{timeZone:org.timeZone}).format();}catch(_){fail('organization.timeZone');}
    shape(container.scope,['mode','filters'],'scope');if(!['all','filtered'].includes(container.scope.mode)||!container.scope.filters||Array.isArray(container.scope.filters)||typeof container.scope.filters!=='object')fail('scope');
    if(!container.references||typeof container.references!=='object'||Array.isArray(container.references)||Object.keys(container.references).some(table=>!owns(root.domain.schemas,table)||table==='organizationSettings'))fail('references');
    const entries=[],ids=new Set(),today=root.utils.dates.today(org.timeZone);let assetBytes=0;
    function add(table,rows,primary){
      if(!Array.isArray(rows)||rows.length>100000)fail(table);
      for(const record of rows){
        if(entries.length>=100000||!record||typeof record!=='object'||Array.isArray(record)||!root.utils.ids.isUuidV4(record.id)||record.datasetId!==container.source.datasetId)fail(table);
        const key=table+'/'+record.id.toLowerCase();if(ids.has(key))fail(key);ids.add(key);
        const errors=root.domain.validateRecord(table,record,{datasetId:container.source.datasetId,today});
        if(table==='assets'){
          if(owns(record,'blob')||owns(record,'base64')||errors.some(issue=>issue.path!=='blob'))fail(key);
          if(record.byteLength>(record.type==='embedded_document'?root.config.limits.documentBytes:1024*1024))fail(key+'.byteLength');
          assetBytes+=record.byteLength;if(assetBytes>root.config.limits.embeddedAssetBytes)fail('assets.size');
          try{root.utils.files.validateName(record.originalName,record.mime);}catch(_){fail(key+'.originalName');}
        }else if(errors.length)fail(key+'.'+errors[0].path);
        if(primary&&definition.direction&&record.direction!==definition.direction)fail(key+'.direction');
        entries.push({key:table+'/'+record.id,table,record,primary});
      }
    }
    add(definition.table,container.records,true);for(const[table,rows]of Object.entries(container.references))add(table,rows,false);
    function limits(value,depth=0){if(depth>40)fail('depth');if(typeof value==='string'&&value.length>20000)fail('text.length');if(value&&typeof value==='object')for(const item of Object.values(value))limits(item,depth+1);}
    limits(container);
    const result=freeze({container,entries,sha256:await root.utils.integrity.sha256(bytes),byteLength:bytes.length,counts:Object.fromEntries(root.domain.tableNames.map(table=>[table,entries.filter(entry=>entry.table===table).length]))});packages.add(result);return result;
  }
  root.services.moduleImportCodec=Object.freeze({read,isPackage:value=>packages.has(value)});
}(window.RescueManager));
