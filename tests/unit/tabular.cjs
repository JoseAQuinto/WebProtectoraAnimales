'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),test=require('node:test'),assert=require('node:assert/strict');
const context=vm.createContext({window:{}});for(const file of ['js/namespace.js','vendor/papaparse/papaparse.min.js','js/utils/tabular.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../..',file),'utf8'),context);
const root=context.window.RescueManager,csv=root.utils.tabular.csv;
test('CSV quotes delimiters, newlines and Unicode and safeguards formula/control prefixes',()=>{
  const values=['=1+1','+00123','-CMD','@SUM(A1)','\tformula','\rtext','\ntext','  =1','\u0000=1','＝1','＋1','−1','00abc','ñ 🐾;"\nline'];
  for(const delimiter of [',',';']){const encoded=csv(['Column'],values.map(value=>[value]),{delimiter,bom:true});assert(encoded.startsWith('\ufeff'));const parsed=root.vendor.Papa.parse(encoded,{header:true,dynamicTyping:false,delimiter}).data;
    for(let i=0;i<values.length;i++){const dangerous=i<11;assert.equal(parsed[i].Column,(dangerous?"'":'')+values[i]);}}
});
test('CSV preserves typed numeric negatives and rejects unsafe numeric or compound cells',()=>{
  assert(csv(['Count','Value'],[[-3,'000123']]).includes('"-3","000123"'));
  for(const rows of [[[NaN]],[[Number.MAX_SAFE_INTEGER+1]],[[{}]],[[true]],[[1,2]]])assert.throws(()=>csv(['Value'],rows));
  assert.throws(()=>csv(['x'],[],{delimiter:'\t'}));
});
