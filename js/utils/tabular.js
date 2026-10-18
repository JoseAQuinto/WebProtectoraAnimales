(function(root){
  'use strict';
  // Prefix potentially executable spreadsheet text, including leading controls/whitespace.
  // This is an export safeguard, not a promise that spreadsheets preserve types on resave.
  const formula=/^(?:[\u0000-\u0020\u007f-\u009f]*[=+\-@\uff1d\uff0b\uff0d\uff20]|[\u0000-\u001f\u007f-\u009f])/u;
  function csv(headers,rows,options={}){
    if(!Array.isArray(headers)||!headers.length||!headers.every(value=>typeof value==='string')||!Array.isArray(rows)||rows.length>100000)throw new RangeError('Invalid export table');
    if(![',',';'].includes(options.delimiter||','))throw new RangeError('Unsupported CSV separator');
    for(const row of rows)if(!Array.isArray(row)||row.length!==headers.length||row.some(value=>value!==null&&typeof value!=='string'&&!(typeof value==='number'&&Number.isSafeInteger(value))))throw new TypeError('Unsupported table cell');
    return (options.bom?'\ufeff':'')+root.vendor.Papa.unparse({fields:headers,data:rows},{delimiter:options.delimiter||',',quotes:true,newline:'\r\n',escapeFormulae:formula});
  }
  root.utils.tabular=Object.freeze({csv});
}(window.RescueManager));
