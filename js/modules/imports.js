(function(root){
  'use strict';
  const ui=root.components.ui,el=ui.el,t=(...args)=>root.core.i18n.t(...args),adapter=root.services.importContacts;
  const view={file:null,parsed:null,mapping:[],source:'',remember:false,delimiter:'',encoding:'utf-8',batchId:null,decisions:{},report:null,result:null,page:1};let generation=0,controller=null;
  const fieldLabel=key=>t('im.field.'+key);
  function reason(issue){
    const codes={'value.email':'email','value.phone':'phone','value.enum':'enum','array.duplicate':'duplicate','array.limit':'list','text.lengthOrWhitespace':'text','field.required':'required','csv.columnCount':'columns','csv.cellLength':'length','import.phoneJSON':'phones','import.uuid':'uuid','import.externalId':'external'};
    return t('im.error.'+(codes[issue.code]||'invalid'));
  }
  function render(ctx){
    const status=el('p',{role:'status'}),details=el('div',{class:'stack'});
    function reset(){generation++;controller?.abort();Object.assign(view,{file:null,parsed:null,mapping:[],batchId:null,decisions:{},report:null,result:null,page:1});ctx.refresh();}
    function invalidate(){view.report=null;view.decisions={};view.result=null;view.page=1;}
    async function read(file){
      const token=++generation;controller?.abort();view.file=file;view.parsed=null;invalidate();details.replaceChildren();document.getElementById('import-mapping')?.setAttribute('hidden','');status.textContent=t('im.reading');
      try{const parsed=await root.services.importParser.csv(file,{delimiter:view.delimiter,encoding:view.encoding});if(token!==generation)return;view.parsed=parsed;view.mapping=adapter.mapping(parsed.headers);view.batchId=root.utils.ids.uuidV4();await ctx.refresh();}
      catch(error){if(token===generation){status.textContent=ui.message(error);status.setAttribute('role','alert');}}
    }
    async function validate(){
      if(!view.parsed)return;const token=++generation;controller?.abort();controller=new AbortController();view.report=null;details.replaceChildren(el('p',{},t('im.validating')));status.textContent=t('im.validating');
      try{const report=await root.services.contactImport.preview(ctx.snapshot,view.parsed,view.mapping,{batchId:view.batchId,source:view.source,remember:view.remember,signal:controller.signal,onProgress:value=>{if(token===generation)status.textContent=t('im.progress',value);}},view.decisions);if(token!==generation)return;view.report=report;view.result=null;await ctx.refresh();}
      catch(error){if(token===generation){status.textContent=ui.message(error);status.setAttribute('role','alert');details.replaceChildren(el('p',{role:'alert'},ui.message(error)));}}
    }
    function reportFile(){
      const report=view.report,rows=[];for(const row of report.rows){const issues=row.errors.length?row.errors:[{field:'',code:row.action==='undecided'?'duplicate.unresolved':row.warnings.join('|')}];for(const issue of issues)rows.push([row.line,row.name,issue.field||'',issue.code||'',row.action,row.targetId||'',row.matches.map(match=>match.id).join('|')]);}
      for(const issue of report.globalErrors)rows.push([0,'',issue.field||'',issue.code,'dataset_error','','']);
      ui.download(new Blob([root.utils.tabular.csv(['row','name','field','reason_code','action','target_id','matching_ids'],rows,{delimiter:view.delimiter||';',bom:true})],{type:'text/csv;charset=utf-8'}),'rescue-manager-contact-import-report.csv');
    }
    function apply(){
      const report=view.report;if(!report)return;const subset=!!(report.counts.error||report.counts.conflict||report.counts.skip),fields=[{key:'confirmed',labelKey:'im.confirm',type:'checkbox',required:true}];
      if(subset)fields.push({key:'confirmedSubset',labelKey:'im.confirmSubset',type:'checkbox',required:true});if(report.unknown)fields.push({key:'ignoreUnknown',labelKey:'im.ignoreUnknown',type:'checkbox',required:true});
      const progress=el('p',{role:'status'});let abort;const cancel=ui.button(t('im.cancelPreparation'),()=>abort?.abort(),true);cancel.hidden=true;
      const dialog=ui.form(t('im.apply'),fields,{},async input=>{
        abort=new AbortController();cancel.hidden=false;cancel.disabled=false;
        try{const result=await root.services.contactImport.apply(report,{...input,signal:abort.signal,onProgress:value=>{progress.textContent=t(value.phase==='activating'?'im.activating':'im.progress',value);if(value.phase==='activating')cancel.disabled=true;}});view.result={...report.counts,noChanges:!!result.noChanges};view.report=null;view.decisions={};ctx.notify(t('im.applied',report.counts));await ctx.refresh();}
        finally{cancel.hidden=true;}
      });
      dialog.querySelector('h2').after(el('p',{class:'notice'},t('im.summary',report.counts)),el('p',{class:'muted'},t(report.staged?'im.largeHelp':'im.atomicHelp')),progress,cancel);
    }
    const input=el('input',{type:'file',accept:'.csv,text/csv',id:'import-file'});input.addEventListener('change',()=>{if(input.files[0])read(input.files[0]);});
    const delimiter=el('select',{id:'import-delimiter'},el('option',{value:''},t('im.auto')),el('option',{value:','},t('rp.comma')),el('option',{value:';'},t('rp.semicolon')));delimiter.value=view.delimiter;
    const encoding=el('select',{id:'import-encoding'},['utf-8','windows-1252','iso-8859-15'].map(value=>el('option',{value},value)));encoding.value=view.encoding;
    for(const[key,control]of[['delimiter',delimiter],['encoding',encoding]])control.addEventListener('change',()=>{view[key]=control.value;if(view.file)read(view.file);});
    const source=el('input',{id:'import-source',maxlength:120,value:view.source}),remember=el('input',{id:'import-remember',type:'checkbox'});remember.checked=view.remember;
    source.addEventListener('input',()=>{view.source=source.value;invalidate();details.replaceChildren(el('p',{},t('im.revalidate')));});remember.addEventListener('change',()=>{view.remember=remember.checked;invalidate();ctx.refresh();});
    const template=ui.button(t('im.template'),()=>ui.download(new Blob([root.utils.tabular.csv(adapter.fields,[],{delimiter:view.delimiter||(root.core.i18n.language==='es'?';':','),bom:true})],{type:'text/csv;charset=utf-8'}),'rescue-manager-contacts-import-template.csv'),true);
    const validateButton=ui.button(t('im.validate'),validate);validateButton.disabled=!view.parsed;
    const controls=el('section',{class:'card stack'},el('p',{},t('im.help')),el('a',{href:'#backup'},t('ui.createBackup')),template,el('label',{for:'import-file'},t('im.file')),input,
      view.file?el('p',{class:'muted preserve-lines'},view.file.name):null,el('div',{class:'people-filters'},el('div',{class:'field'},el('label',{for:'import-delimiter'},t('rp.separator')),delimiter),el('div',{class:'field'},el('label',{for:'import-encoding'},t('im.encoding')),encoding),el('div',{class:'field'},el('label',{for:'import-source'},t('im.source')),source)),
      el('label',{for:'import-remember'},remember,t('im.remember')),el('p',{class:'muted'},t('im.sourceHelp')),el('div',{class:'actions'},validateButton,ui.button(t('im.reset'),reset,true),ui.button(t('im.cancelPreview'),()=>{generation++;controller?.abort();status.textContent=t('im.cancelled');},true)),status);
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
        const contacts=['update','link'].includes(decision.value)?ctx.snapshot.tables.contacts:[];
        const targets=new Map([...contacts.map(item=>[item.id,item.name+' · '+(item.email||item.phones[0]?.original||item.id)]),...row.matches.filter(item=>!contacts.some(contact=>contact.id===item.id)).map(item=>[item.id,item.name+' · '+item.id])]);
        const target=el('select',{'aria-label':t('im.targetRow',{row:row.line})},el('option',{value:''},t('aw.choose')),[...targets].map(([value,label])=>el('option',{value},label)));target.value=row.targetId||row.matches[0]?.id||'';target.disabled=!['link','update'].includes(decision.value);
        const change=()=>{view.decisions[row.line]={action:decision.value,targetId:target.value||null};validate();};decision.addEventListener('change',change);target.addEventListener('change',change);
        return el('tr',{},el('th',{scope:'row'},String(row.line)),el('td',{},row.name),el('td',{},row.errors.map(issue=>el('p',{},(issue.field?fieldLabel(issue.field.split('.')[0])+': ':'')+reason(issue))),row.warnings.length?el('p',{class:'muted'},t('im.nameWarning')):null,row.matches.map(match=>el('p',{},match.name+' · '+match.reasons.map(key=>t('im.match.'+key)).join(', ')))),el('td',{},t('im.action.'+row.action)),el('td',{},decision,target));
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
