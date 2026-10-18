(function(root){
  'use strict';
  const forbidden=new Set(['__proto__','constructor','prototype']);
  async function csv(file,options={}){
    if(!(file instanceof Blob)||!file.size||file.size>root.config.limits.csvBytes)throw new RangeError('CSV exceeds 10 MiB or is empty');
    const encoding=options.encoding||'utf-8',delimiter=options.delimiter||'';
    if(!['utf-8','windows-1252','iso-8859-15'].includes(encoding)||!['',',',';'].includes(delimiter))throw new RangeError('Unsupported CSV configuration');
    const bytes=new Uint8Array(await file.arrayBuffer()),text=new TextDecoder(encoding,{fatal:true}).decode(bytes);
    const parsed=root.vendor.Papa.parse(text,{header:false,delimiter,dynamicTyping:false,skipEmptyLines:'greedy'}),[head,...rows]=parsed.data;
    if(!head?.length||head.length>256||rows.length>root.config.limits.csvRows)throw new RangeError('CSV exceeds column or row limits');
    const headers=head.map(value=>String(value).trim());if(headers.some(value=>value.length>200||forbidden.has(value.toLowerCase())))throw new TypeError('Unsafe CSV header');
    return Object.freeze({sha256:await root.utils.integrity.sha256(bytes),byteLength:bytes.length,encoding,delimiter:parsed.meta.delimiter,headers:Object.freeze(headers),
      rows:Object.freeze(rows.map((cells,index)=>Object.freeze({line:index+2,cells:Object.freeze(cells),errors:Object.freeze([
        ...parsed.errors.filter(error=>error.row===index+1).map(error=>({field:'',code:'csv.'+error.code})),
        ...(cells.length!==headers.length?[{field:'',code:'csv.columnCount'}]:[]),...(cells.some(value=>value.length>20000)?[{field:'',code:'csv.cellLength'}]:[])] )}))),
      errors:Object.freeze(parsed.errors.filter(error=>error.code!=='UndetectableDelimiter'&&(!Number.isInteger(error.row)||error.row===0)).map(error=>({field:'',code:'csv.'+error.code}))) });
  }
  root.services.importParser=Object.freeze({csv});
}(window.RescueManager));
