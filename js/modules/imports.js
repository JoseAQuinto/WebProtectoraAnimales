(function(root){
  'use strict';
  const ui=root.components.ui,el=ui.el,translate=(...args)=>root.core.i18n.t(...args);
  const t=(key,...args)=>translate(Object.hasOwn(root.locales.en,key.replace(/^im\./,({animals:'ia.',volunteers:'imv.',applications:'imp.',movements:'imf.',donations:'imd.'}[view.kind]||'im.')))?key.replace(/^im\./,({animals:'ia.',volunteers:'imv.',applications:'imp.',movements:'imf.',donations:'imd.'}[view.kind]||'im.')):key,...args);
  const view={kind:'contacts',dateFormat:'iso',decimalSeparator:'.',referenceQuery:'',referencePage:1,file:null,parsed:null,mapping:[],source:'',remember:false,delimiter:'',encoding:'utf-8',batchId:null,decisions:{},report:null,result:null,page:1};let generation=0,controller=null;
  const fieldLabel=key=>t('im.field.'+({microchipNormalized:'microchip',microchipOriginal:'microchip',estimatedAgeReferenceDate:'age_reference_date',estimatedAgeMonths:'estimated_age_months',speciesId:'species_id',sizeId:'size_id',birthDate:'birth_date',birthPrecision:'birth_precision',sterilizationStatus:'sterilization_status',sterilizationDate:'sterilization_date',specialNeeds:'special_needs',contactId:'contact_id',animalId:'animal_id',functionIds:'function_ids',applicationDate:'application_date',approvalDate:'approval_date',interviewNotes:'interview_notes',closureReason:'closure_reason',categoryId:'category_id',amountMinor:'amount_minor',currencyCode:'currency',materialTypeId:'material_type_id',quantityScaled:'quantity_scaled',quantityPrecision:'quantity_precision',unitId:'unit_id',inventoryItemId:'inventory_item_id',estimatedValueMinor:'estimated_value_minor'}[key]||key));
  function reason(issue){
    const codes={'value.email':'email','value.phone':'phone','value.enum':'enum','array.duplicate':'duplicate','array.limit':'list','text.lengthOrWhitespace':'text','field.required':'required','csv.columnCount':'columns','csv.cellLength':'length','import.phoneJSON':'phones','import.uuid':'uuid','import.externalId':'external','import.date':'date','value.date':'date','date.future':'date','import.integer':'integer','import.reference':'reference','import.lifecycle':'lifecycle','import.location':'location','import.uniqueAnimal':'unique','import.existingUUID':'existing','import.target':'target','import.repeatedUpdate':'repeated','import.identityConflict':'identity','animal.entryBeforeBirth':'birth','import.money':'money','import.currency':'currency','import.group':'group'};
    return t('im.error.'+(codes[issue.code]||'invalid'));
  }
  function render(ctx){
    const definition=root.services.importRelated.definitions[view.kind],adapter=definition?{fields:definition.fields,mapping:headers=>root.services.importRelated.mapping(view.kind,headers)}:view.kind==='animals'?root.services.importAnimals:root.services.importContacts,service=definition?{preview:(...args)=>root.services.relatedImport.preview(view.kind,...args),apply:root.services.relatedImport.apply}:view.kind==='animals'?root.services.animalImport:root.services.contactImport;
    const status=el('p',{role:'status'}),details=el('div',{class:'stack'});
    function reset(){generation++;controller?.abort();Object.assign(view,{file:null,parsed:null,mapping:[],batchId:null,referenceQuery:'',referencePage:1,decisions:{},report:null,result:null,page:1});ctx.refresh();}
    function invalidate(){view.report=null;view.decisions={};view.result=null;view.page=1;}
    async function read(file){
      const token=++generation;controller?.abort();view.file=file;view.parsed=null;invalidate();details.replaceChildren();document.getElementById('import-mapping')?.setAttribute('hidden','');status.textContent=t('im.reading');
      try{const parsed=await root.services.importParser.csv(file,{delimiter:view.delimiter,encoding:view.encoding});if(token!==generation)return;view.parsed=parsed;view.mapping=adapter.mapping(parsed.headers);view.batchId=root.utils.ids.uuidV4();await ctx.refresh();}
      catch(error){if(token===generation){status.textContent=ui.message(error);status.setAttribute('role','alert');}}
    }
    async function validate(){
      if(!view.parsed)return;const token=++generation;controller?.abort();controller=new AbortController();view.report=null;details.replaceChildren(el('p',{},t('im.validating')));status.textContent=t('im.validating');
      try{const report=await service.preview(ctx.snapshot,view.parsed,view.mapping,{batchId:view.batchId,dateFormat:view.dateFormat,decimalSeparator:view.decimalSeparator,source:view.source,remember:view.remember,signal:controller.signal,onProgress:value=>{if(token===generation)status.textContent=t('im.progress',value);}},view.decisions);if(token!==generation)return;view.report=report;view.result=null;await ctx.refresh();}
      catch(error){if(token===generation){status.textContent=ui.message(error);status.setAttribute('role','alert');details.replaceChildren(el('p',{role:'alert'},ui.message(error)));}}
    }
    function reportFile(){
      const report=view.report,rows=[];for(const row of report.rows){const issues=row.errors.length?row.errors:[{field:'',code:row.action==='undecided'?'duplicate.unresolved':row.warnings.join('|')}];for(const issue of issues)rows.push([issue.line||row.line,row.name,issue.field||'',issue.code||'',row.action,(row.lines||[row.line]).join('|'),row.targetId||'',row.resultId||row.targetId||'',row.matches.map(match=>match.id).join('|')]);}
      for(const issue of report.globalErrors)rows.push([0,'',issue.field||'',issue.code,'dataset_error','','','','']);
      ui.download(new Blob([root.utils.tabular.csv(['row','name','field','reason_code','action','source_rows','target_id','result_id','matching_ids'],rows,{delimiter:view.delimiter||';',bom:true})],{type:'text/csv;charset=utf-8'}),'rescue-manager-'+view.kind+'-import-report.csv');
    }
    function apply(){
      const report=view.report;if(!report)return;const subset=!!(report.counts.error||report.counts.conflict||report.counts.skip),fields=[{key:'confirmed',labelKey:'im.confirm',type:'checkbox',required:true}];
      if(report.requiresCorrections)fields.push({key:'confirmedCorrections',labelKey:'imf.confirmCorrections',type:'checkbox',required:true});
      if(subset)fields.push({key:'confirmedSubset',labelKey:view.kind==='donations'?'imd.confirmSubset':'im.confirmSubset',type:'checkbox',required:true});if(report.unknown)fields.push({key:'ignoreUnknown',labelKey:'im.ignoreUnknown',type:'checkbox',required:true});
      const progress=el('p',{role:'status'});let abort;const cancel=ui.button(t('im.cancelPreparation'),()=>abort?.abort(),true);cancel.hidden=true;
      const dialog=ui.form(t('im.apply'),fields,{},async input=>{
        abort=new AbortController();cancel.hidden=false;cancel.disabled=false;
        try{const result=await service.apply(report,{...input,signal:abort.signal,onProgress:value=>{progress.textContent=t(value.phase==='activating'?'im.activating':'im.progress',value);if(value.phase==='activating')cancel.disabled=true;}});view.result={...report.counts,noChanges:!!result.noChanges};view.report=null;view.decisions={};ctx.notify(t('im.applied',report.counts));await ctx.refresh();}
        finally{cancel.hidden=true;}
      });
      dialog.querySelector('h2').after(el('p',{class:'notice'},t('im.summary',report.counts)),el('p',{class:'muted'},t(report.staged?'im.largeHelp':'im.atomicHelp')),progress,cancel);
    }
    const kind=el('select',{id:'import-kind'},['contacts','animals','volunteers','applications','movements','donations'].map(value=>el('option',{value},translate('im.kind.'+value))));kind.value=view.kind;kind.addEventListener('change',()=>{view.kind=kind.value;reset();});
    const dates=el('select',{id:'import-date-format'},['iso','day_first','month_first'].map(value=>el('option',{value},translate('ia.date.'+value))));dates.value=view.dateFormat;dates.addEventListener('change',()=>{view.dateFormat=dates.value;invalidate();details.replaceChildren(el('p',{},t('im.revalidate')));});
    const decimal=el('select',{id:'import-decimal-separator'},['.',','].map(value=>el('option',{value},translate(value==='.'?'f.separator.dot':'f.separator.comma'))));decimal.value=view.decimalSeparator;decimal.addEventListener('change',()=>{view.decimalSeparator=decimal.value;invalidate();details.replaceChildren(el('p',{},t('im.revalidate')));});
    const input=el('input',{type:'file',accept:'.csv,text/csv',id:'import-file'});input.addEventListener('change',()=>{if(input.files[0])read(input.files[0]);});
    const delimiter=el('select',{id:'import-delimiter'},el('option',{value:''},t('im.auto')),el('option',{value:','},t('rp.comma')),el('option',{value:';'},t('rp.semicolon')));delimiter.value=view.delimiter;
    const encoding=el('select',{id:'import-encoding'},['utf-8','windows-1252','iso-8859-15'].map(value=>el('option',{value},value)));encoding.value=view.encoding;
    for(const[key,control]of[['delimiter',delimiter],['encoding',encoding]])control.addEventListener('change',()=>{view[key]=control.value;if(view.file)read(view.file);});
    const source=el('input',{id:'import-source',maxlength:120,value:view.source}),remember=el('input',{id:'import-remember',type:'checkbox'});remember.checked=view.remember;
    source.addEventListener('input',()=>{view.source=source.value;invalidate();details.replaceChildren(el('p',{},t('im.revalidate')));});remember.addEventListener('change',()=>{view.remember=remember.checked;invalidate();ctx.refresh();});
    const template=ui.button(t('im.template'),()=>ui.download(new Blob([root.utils.tabular.csv(adapter.fields,[],{delimiter:view.delimiter||(root.core.i18n.language==='es'?';':','),bom:true})],{type:'text/csv;charset=utf-8'}),'rescue-manager-'+view.kind+'-import-template.csv'),true);
    const validateButton=ui.button(t('im.validate'),validate);validateButton.disabled=!view.parsed;
    const controls=el('section',{class:'card stack'},['movements','donations'].includes(view.kind)?el('div',{class:'field'},el('label',{for:'import-decimal-separator'},translate('imf.decimalSeparator')),decimal,el('p',{class:'muted'},translate('imf.moneyHelp',{currency:ctx.snapshot.tables.organizationSettings[0].currencyCode}))):null,el('label',{for:'import-kind'},translate('im.kind')),kind,['animals','applications','movements','donations'].includes(view.kind)?el('div',{class:'field'},el('label',{for:'import-date-format'},translate('ia.dateFormat')),dates,el('p',{class:'muted'},translate('ia.dateHelp'))):null,el('p',{},t('im.help')),el('a',{href:'#backup'},t('ui.createBackup')),el('a',{href:'#moduleImport'},translate('nav.moduleImport')),template,el('label',{for:'import-file'},t('im.file')),input,
      view.file?el('p',{class:'muted preserve-lines'},view.file.name):null,el('div',{class:'people-filters'},el('div',{class:'field'},el('label',{for:'import-delimiter'},t('rp.separator')),delimiter),el('div',{class:'field'},el('label',{for:'import-encoding'},t('im.encoding')),encoding),el('div',{class:'field'},el('label',{for:'import-source'},t('im.source')),source)),
      el('label',{for:'import-remember'},remember,t('im.remember')),el('p',{class:'muted'},t('im.sourceHelp')),el('div',{class:'actions'},validateButton,ui.button(t('im.reset'),reset,true),ui.button(t('im.cancelPreview'),()=>{generation++;controller?.abort();status.textContent=t('im.cancelled');},true)),status);
    if(view.kind!=='contacts'){
      const active=row=>!row.deletedAt&&!row.archivedAt,referenceRows=[];
      if(view.kind==='animals')referenceRows.push(...ctx.snapshot.tables.locations.filter(row=>row.active&&active(row)).map(row=>[translate('ia.field.location_id'),row.id,row.name]));
      const kinds=view.kind==='animals'?['species','size']:view.kind==='volunteers'?['volunteer_function']:view.kind==='movements'?['finance_income','finance_expense']:view.kind==='donations'?['finance_income','material_type','unit']:[];
      referenceRows.push(...ctx.snapshot.tables.catalogOptions.filter(row=>kinds.includes(row.kind)&&row.active&&active(row)).map(row=>[['movements','donations'].includes(view.kind)?fieldLabel(view.kind==='donations'&&row.kind==='material_type'?'material_type_code':view.kind==='donations'&&row.kind==='unit'?'unit_code':'category_code')+' · '+row.kind:translate(view.kind==='animals'?'ia.field.'+row.kind+'_code':'imv.field.function_codes'),row.code+' / '+row.id,row.customLabel||translate(row.labelKey)]));
      if(definition)referenceRows.push(...ctx.snapshot.tables.contacts.filter(row=>active(row)&&!row.mergedIntoContactId).map(row=>[fieldLabel('contact_id'),row.id,row.name]));
      if(['applications','movements'].includes(view.kind))referenceRows.push(...ctx.snapshot.tables.animals.filter(row=>active(row)&&(view.kind==='movements'||row.managementStatus==='under_care')).map(row=>[fieldLabel('animal_id'),row.code+' / '+row.id,row.name]));
      if(view.kind==='donations')referenceRows.push(...ctx.snapshot.tables.inventoryItems.filter(row=>active(row)&&row.status==='active').map(row=>[fieldLabel('inventory_item_id'),row.id,row.name+' · '+String(row.quantityPrecision)]));
      const references=el('div'),query=el('input',{id:'import-reference-query',type:'search',value:view.referenceQuery});
      function drawReferences(){const search=root.utils.strings.normalizeSearch(view.referenceQuery),matching=referenceRows.filter(row=>!search||root.utils.strings.normalizeSearch(row.join(' ')).includes(search)),pages=Math.max(1,Math.ceil(matching.length/20));view.referencePage=Math.min(view.referencePage,pages);
        const previous=ui.button(t('a.previous'),()=>{view.referencePage--;drawReferences();},true),next=ui.button(t('a.next'),()=>{view.referencePage++;drawReferences();},true);previous.disabled=view.referencePage<=1;next.disabled=view.referencePage>=pages;
        references.replaceChildren(el('div',{class:'table-wrap'},el('table',{},el('thead',{},el('tr',{},['ia.referenceKind','ia.referenceCode','ia.referenceName'].map(key=>el('th',{scope:'col'},translate(key))))),el('tbody',{},matching.slice((view.referencePage-1)*20,view.referencePage*20).map(row=>el('tr',{},row.map(value=>el('td',{},value))))))),el('div',{class:'actions'},previous,el('span',{},t('a.page',{page:view.referencePage,pages,count:matching.length})),next));}
      query.addEventListener('input',()=>{view.referenceQuery=query.value;view.referencePage=1;drawReferences();});drawReferences();
      controls.append(el('details',{},el('summary',{},translate('ia.references')),el('p',{class:'muted'},t('im.referencesHelp')),el('label',{for:'import-reference-query'},translate('im.referenceSearch')),query,references));
    }
    if(view.parsed){
      const mappingRows=view.parsed.headers.map((header,index)=>{const select=el('select',{'aria-label':t('im.mapColumn',{column:header||String(index+1)})},el('option',{value:''},t('im.unmapped')),adapter.fields.map(value=>el('option',{value},value+' · '+fieldLabel(value))));select.value=view.mapping[index];select.addEventListener('change',()=>{view.mapping[index]=select.value;invalidate();details.replaceChildren(el('p',{},t('im.revalidate')));});
        return el('tr',{},el('th',{scope:'row'},header||String(index+1)),el('td',{},select),el('td',{class:'preserve-lines'},(view.parsed.rows.find(row=>row.cells[index])?.cells[index]||'').slice(0,200)));});
      controls.append(el('section',{id:'import-mapping',class:'stack'},el('p',{class:'muted preserve-lines'},t('im.fileInfo',{count:view.parsed.rows.length,hash:view.parsed.sha256})),el('p',{},t('im.mappingHelp')),el('div',{class:'table-wrap'},el('table',{},el('thead',{},el('tr',{},['im.column','im.destination','im.sample'].map(key=>el('th',{scope:'col'},t(key))))),el('tbody',{},mappingRows)))));
    }
    if(view.result)details.append(el('section',{class:'notice'},el('h2',{},t('im.result')),el('p',{},t('im.applied',view.result))));
    if(view.report){
      const report=view.report,pages=Math.max(1,Math.ceil(report.rows.length/20));view.page=Math.min(view.page,pages);
      const rows=report.rows.slice((view.page-1)*20,view.page*20).map(row=>{
        const requested=view.decisions[row.line]?.action||row.action;
        const decision=el('select',{'aria-label':t('im.decisionRow',{row:row.line})},['undecided','create','update','link','skip'].map(value=>el('option',{value},t('im.action.'+value))));decision.value=['create','update','link','skip'].includes(requested)?requested:'undecided';
        const contacts=['update','link'].includes(decision.value)?ctx.snapshot.tables[definition?.table||view.kind]:[];
        const targets=new Map([...contacts.map(item=>[item.id,definition?root.services.importRelated.label(view.kind,item,ctx.snapshot.tables)+' · '+item.id:item.name+' · '+(item.code||item.email||item.phones?.[0]?.original||item.id)]),...row.matches.filter(item=>!contacts.some(contact=>contact.id===item.id)).map(item=>[item.id,item.name+' · '+item.id])]);
        const target=el('select',{'aria-label':t('im.targetRow',{row:row.line})},el('option',{value:''},t('aw.choose')),[...targets].map(([value,label])=>el('option',{value},label)));target.value=row.targetId||row.matches[0]?.id||'';target.disabled=!['link','update'].includes(decision.value);
        const change=()=>{view.decisions[row.line]={action:decision.value,targetId:target.value||null};validate();};decision.addEventListener('change',change);target.addEventListener('change',change);
        return el('tr',{},el('th',{scope:'row'},(row.lines||[row.line]).join(', ')),el('td',{},row.name),el('td',{},row.errors.map(issue=>el('p',{},(issue.line?translate('imd.issueRow',{row:issue.line})+' · ':'')+(issue.field?fieldLabel(issue.field.split('.')[0])+': ':'')+reason(issue))),row.warnings.length?el('p',{class:'muted'},t('im.nameWarning')):null,row.matches.map(match=>el('p',{},match.name+' · '+match.reasons.map(key=>t('im.match.'+key)).join(', ')))),el('td',{},t('im.action.'+row.action)),el('td',{},decision,target));
      });
      const previous=ui.button(t('a.previous'),()=>{view.page--;ctx.refresh();},true),next=ui.button(t('a.next'),()=>{view.page++;ctx.refresh();},true);previous.disabled=view.page<=1;next.disabled=view.page>=pages;
      const commit=ui.button(t('im.apply'),apply);commit.disabled=!!report.globalErrors.length||report.revision!==ctx.snapshot.globalRevision||!ctx.canWrite()||report.counts.create+report.counts.update+report.counts.link===0;
      details.append(el('section',{class:'card stack'},el('h2',{},t('im.preview')),el('p',{class:'notice'},t('im.summary',report.counts)),report.repeatedFile?el('p',{class:'notice warning'},t('im.repeated')):null,
        report.revision!==ctx.snapshot.globalRevision?el('p',{role:'alert'},t('im.stale')):null,report.unknown?el('p',{class:'notice warning'},t('im.unknown',{count:report.unknown,columns:report.unknownColumns.join(', ')})):null,
        report.globalErrors.length?el('p',{role:'alert'},t('im.datasetError')):null,el('p',{class:'muted'},t(report.staged?'im.largeHelp':'im.atomicHelp')),
        el('div',{class:'table-wrap'},el('table',{},el('thead',{},el('tr',{},['im.row','im.field.name','im.issues','im.action','im.decision'].map(key=>el('th',{scope:'col'},t(key))))),el('tbody',{},rows))),el('div',{class:'actions'},previous,el('span',{},t('a.page',{page:view.page,pages,count:report.rows.length})),next,ui.button(t('im.report'),reportFile,true),commit)));
    }
    return[el('header',{class:'page-heading'},el('h1',{},t('nav.imports'))),controls,details];
  }
  root.modules.imports=Object.freeze({render});
}(window.RescueManager));
