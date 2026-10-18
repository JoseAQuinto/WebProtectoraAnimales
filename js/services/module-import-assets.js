(function(root){
  'use strict';
  const cache=new WeakMap(),fail=code=>{throw new root.core.errors.AppError(code);};
  const compatible=(source,target)=>['type','mime','byteLength','sha256','width','height'].every(field=>(source[field]??null)===(target[field]??null));
  async function files(values=[],options={}){
    if(!Array.isArray(values)||values.length>1000||values.some(file=>!(file instanceof Blob)||!file.size||file.size>root.config.limits.documentBytes)||values.reduce((sum,file)=>sum+file.size,0)>root.config.limits.embeddedAssetBytes)fail('mj.assetLimit');
    const result=new Map();for(let index=0;index<values.length;index++){
      if(options.signal?.aborted)throw root.storage.error('AbortError','Asset matching cancelled');const file=values[index];
      if(!cache.has(file))cache.set(file,await root.utils.integrity.sha256(file));result.set(cache.get(file),file);options.onProgress?.({phase:'files',completed:index+1,total:values.length});await new Promise(resolve=>setTimeout(resolve,0));
    }return result;
  }
  async function materialize(record,file){
    if(!file||file.size!==record.byteLength)fail('mj.missingAsset');
    const blob=new Blob([file],{type:record.mime}),bytes=new Uint8Array(await blob.arrayBuffer());
    try{
      const info=root.utils.files.inspect(bytes,record.mime);root.utils.files.validateName(record.originalName,record.mime);
      if((info.width??null)!==(record.width??null)||(info.height??null)!==(record.height??null))fail('mj.assetMismatch');
      if(info.mime.startsWith('image/'))await root.utils.images.verify(blob,info);
      if(await root.utils.integrity.sha256(bytes)!==record.sha256)fail('mj.assetMismatch');
      root.domain.validateRecord('assets',{...record,blob},{datasetId:record.datasetId,throwOnError:true});
    }catch(error){if(error instanceof root.core.errors.AppError)throw error;fail('mj.assetMismatch');}
    return blob;
  }
  root.services.moduleImportAssets=Object.freeze({files,compatible,materialize});
}(window.RescueManager));
