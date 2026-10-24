(function(root){
  'use strict';
  const ui=root.components.ui,el=ui.el,t=(key,values)=>root.core.i18n.t(key,values),service=root.services.moduleImport;
  const view={file:null,packageValue:null,files:[],batchId:null,decisions:{},report:null,result:null,search:'',table:'',outcome:'',page:1};let generation=0,controller=null;
  const tableLabel=table=>t('mj.table.'+table);
  function render(ctx){
    const status=el('p',{role:'status'}),preview=el('div',{class:'stack'});
    function invalidate(){generation++;controller?.abort();view.report=null;view.result=null;view.page=1;preview.replaceChildren(el('p',{},t('mj.revalidate')));}
    function reset(){invalidate();Object.assign(view,{file:null,packageValue:null,files:[],batchId:null,decisions:{},search:'',table:'',outcome:'',page:1});ctx.refresh();}
    async function read(file){
      invalidate();const token=generation;view.file=file;view.packageValue=null;view.decisions={};view.files=[];view.search=view.table=view.outcome='';validateButton.disabled=true;document.getElementById('module-json-metadata')?.remove();document.getElementById('module-json-policy')?.remove();status.textContent=t('mj.reading');
      try{const packageValue=await root.services.moduleImportCodec.read(file);if(token!==generation)return;view.packageValue=packageValue;view.batchId=root.utils.ids.uuidV4();await ctx.refresh();}
      catch(error){if(token===generation){status.textContent=ui.message(error)+(error.details?.length?' · '+error.details.map(issue=>issue.path||'').join(', '):'');status.setAttribute('role','alert');}}
    }
    async function validate(){
      if(!view.packageValue)return;invalidate();const token=generation;controller=new AbortController();status.textContent=t('mj.validating');
      try{const snapshot=await root.services.context.snapshot(),report=await service.preview(snapshot,view.packageValue,{batchId:view.batchId,files:view.files,signal:controller.signal,onProgress:value=>{if(token===generation)status.textContent=t('mj.progress',value);}},view.decisions);if(token!==generation)return;view.report=report;await ctx.refresh();}
      catch(error){if(token===generation){status.textContent=ui.message(error);status.setAttribute('role','alert');}}
    }
    function reportFile(){
      const report=view.report;ui.download(new Blob([JSON.stringify({format:'rescue-manager-module-import-validation-report',formatVersion:1,sourceHash:report.sha256,module:report.module,revision:report.revision,counts:report.counts,globalErrors:report.globalErrors,rows:report.rows},null,2)],{type:'application/json'}),'rescue-manager-module-import-report.json');
    }
    function compare(row){
      const entry=view.packageValue.entries.find(entry=>entry.key===row.key),local=ctx.snapshot.tables[row.table].find(record=>record.id===row.targetId),source=entry.record;
      const fields=Object.keys(root.domain.schemas[row.table].fields).filter(field=>!['datasetId','blob'].includes(field)),show=value=>value===undefined?'':typeof value==='string'?value:JSON.stringify(value,null,2);
      ui.dialog(t('mj.compare'),el('div',{class:'stack'},el('p',{},tableLabel(row.table)+' · '+row.id),el('p',{class:'muted'},t('mj.compareHelp')),el('div',{class:'table-wrap'},el('table',{},el('thead',{},el('tr',{},['mj.field','mj.incoming','mj.current'].map(key=>el('th',{scope:'col'},t(key))))),el('tbody',{},fields.map(field=>el('tr',{},el('th',{scope:'row'},field),el('td',{class:'preserve-lines'},show(source[field])),el('td',{class:'preserve-lines'},show(local?.[field])))))))),{wide:true});
    }
    function apply(){
      const report=view.report,fields=[{key:'confirmed',labelKey:'mj.confirm',type:'checkbox',required:true}];
      if(report.requiresUpdates)fields.push({key:'confirmedUpdates',labelKey:'mj.confirmUpdates',type:'checkbox',required:true});
      if(report.counts.skip||report.counts.error||report.counts.conflict)fields.push({key:'confirmedSubset',labelKey:'mj.confirmSubset',type:'checkbox',required:true});
      const progress=el('p',{role:'status'});let abort;const cancel=ui.button(t('im.cancelPreparation'),()=>abort?.abort(),true);cancel.hidden=true;
      const dialog=ui.form(t('mj.apply'),fields,{},async input=>{
        abort=new AbortController();cancel.hidden=false;cancel.disabled=false;
        try{const result=await service.apply(report,{...input,signal:abort.signal,onProgress:value=>{progress.textContent=t(value.phase==='activating'?'im.activating':'im.progress',value);if(value.phase==='activating')cancel.disabled=true;}});view.result={...report.counts,noChanges:!!result.noChanges};view.report=null;view.decisions={};ctx.notify(t(result.noChanges?'mj.noChanges':'mj.applied',report.counts));await ctx.refresh();}
        finally{cancel.hidden=true;}
      });dialog.querySelector('h2').after(el('p',{class:'notice'},t('mj.summary',report.counts)),el('p',{class:'muted'},t('mj.stagingHelp')),progress,cancel);
    }
    const input=el('input',{id:'module-json-file',type:'file',accept:'.json,application/json'});input.addEventListener('change',()=>{if(input.files[0])read(input.files[0]);});
    const assets=el('input',{id:'module-json-assets',type:'file',multiple:true,accept:'.txt,.pdf,.jpg,.jpeg,.png,.webp'});assets.addEventListener('change',()=>{view.files=[...assets.files];invalidate();});
    const validateButton=ui.button(t('im.validate'),validate);validateButton.disabled=!view.packageValue;
    const controls=el('section',{class:'card stack'},el('p',{},t('mj.help')),el('p',{class:'notice warning'},t('mj.notBackup')),el('div',{class:'actions'},el('a',{href:'#backup'},t('ui.createBackup')),el('a',{href:'#imports'},t('nav.imports'))),
      el('label',{for:'module-json-file'},t('mj.file')),input,view.file?el('p',{class:'muted preserve-lines'},view.file.name):null,
      el('label',{for:'module-json-assets'},t('mj.assets')),assets,el('p',{class:'muted'},t('mj.assetsHelp')),el('p',{class:'muted preserve-lines'},view.files.map(file=>file.name).join('\n')),
      el('div',{class:'actions'},validateButton,ui.button(t('mj.clearAssets'),()=>{view.files=[];invalidate();ctx.refresh();},true),ui.button(t('im.reset'),reset,true),ui.button(t('im.cancelPreview'),()=>{generation++;controller?.abort();status.textContent=t('im.cancelled');},true)),status);
    if(view.packageValue){const p=view.packageValue,c=p.container;controls.append(el('p',{id:'module-json-metadata',class:'notice preserve-lines'},t('mj.metadata',{module:t('ex.module.'+c.module),organization:c.organization.name,currency:c.organization.currencyCode,date:c.exportedAt,count:p.entries.length,primary:c.records.length,hash:p.sha256})),el('p',{id:'module-json-policy',class:'muted preserve-lines'},t('mj.policy',{policy:c.referencePolicy})));}
    if(view.result)preview.append(el('section',{class:'notice'},el('h2',{},t('im.result')),el('p',{},t(view.result.noChanges?'mj.noChanges':'mj.applied',view.result))));
    if(view.report){
      const report=view.report,search=el('input',{id:'module-json-search',type:'search',value:view.search}),table=el('select',{id:'module-json-table'},el('option',{value:''},t('mj.allTables')),Object.entries(report.tableCounts).filter(([,count])=>count).map(([value,count])=>el('option',{value},tableLabel(value)+' · '+count))),outcome=el('select',{id:'module-json-outcome'},el('option',{value:''},t('mj.allOutcomes')),['create','update','link','skip','error','undecided'].map(value=>el('option',{value},t('mj.action.'+value))));table.value=view.table;outcome.value=view.outcome;
      const rowsHost=el('div',{class:'stack'});
      function draw(){
        const text=root.utils.strings.normalizeSearch(view.search),selected=report.rows.filter(row=>(!view.table||row.table===view.table)&&(!view.outcome||row.action===view.outcome)&&(!text||root.utils.strings.normalizeSearch(row.name+' '+row.id+' '+row.table).includes(text))),pages=Math.max(1,Math.ceil(selected.length/20));view.page=Math.min(view.page,pages);
        const body=selected.slice((view.page-1)*20,view.page*20).map(row=>{
          const chosen=view.decisions[row.key]?.action||row.action,action=el('select',{'aria-label':t('mj.rowDecision',{id:row.id})},['undecided','create','update','link','skip'].map(value=>el('option',{value,disabled:value==='update'&&!row.canUpdate},t('mj.action.'+value))));action.value=chosen==='error'?'undecided':chosen;
          const targets=['link','update'].includes(action.value)?ctx.snapshot.tables[row.table]:[],target=el('select',{'aria-label':t('mj.rowTarget',{id:row.id})},el('option',{value:''},t('aw.choose')),targets.map(record=>el('option',{value:record.id},service.label(row.table,record,ctx.snapshot.tables)+' · '+record.id)));target.value=view.decisions[row.key]?.targetId||row.targetId||row.matches[0]?.id||'';target.disabled=!['update','link'].includes(action.value);
          const change=()=>{view.decisions[row.key]={action:action.value,targetId:target.value||row.targetId||row.matches[0]?.id||null};validate();};action.addEventListener('change',change);target.addEventListener('change',change);
          return el('tr',{},el('td',{},tableLabel(row.table),row.primary?el('p',{class:'muted'},t('mj.primary')):null),el('th',{scope:'row'},row.name,el('p',{class:'muted'},row.id)),el('td',{},t('mj.action.'+row.action),row.errors.map(issue=>el('p',{role:'alert'},t(issue.code)+(issue.field?' · '+issue.field:''))),row.matches.map(match=>el('p',{},match.name+' · '+match.reasons.map(reason=>t('mj.match.'+reason)).join(', ')))),el('td',{},action,target,ui.button(t('mj.compare'),()=>compare(row),true)));
        });
        const previous=ui.button(t('a.previous'),()=>{view.page--;draw();},true),next=ui.button(t('a.next'),()=>{view.page++;draw();},true);previous.disabled=view.page<=1;next.disabled=view.page>=pages;
        rowsHost.replaceChildren(el('div',{class:'table-wrap'},el('table',{class:'module-json-table'},el('thead',{},el('tr',{},['mj.table','mj.record','mj.outcome','im.decision'].map(key=>el('th',{scope:'col'},t(key))))),el('tbody',{},body))),el('div',{class:'actions pager'},previous,el('span',{},t('ui.recordPage',{page:view.page,pages,count:selected.length})),next));
      }
      for(const[key,control]of[['search',search],['table',table],['outcome',outcome]])control.addEventListener(key==='search'?'input':'change',()=>{view[key]=control.value;view.page=1;draw();});draw();
      const bulk=(kind)=>{for(const row of report.rows){const matches=row.matches.filter(match=>match.reasons.includes(kind));if(row.action==='undecided'&&matches.length===1)view.decisions[row.key]={action:'link',targetId:matches[0].id};}validate();};
      const catalogs=ui.button(t('mj.linkCatalogs'),()=>bulk('catalog'),true),assetsButton=ui.button(t('mj.linkAssets'),()=>bulk('asset'),true);catalogs.disabled=!report.rows.some(row=>row.action==='undecided'&&row.matches.filter(match=>match.reasons.includes('catalog')).length===1);assetsButton.disabled=!report.rows.some(row=>row.action==='undecided'&&row.matches.filter(match=>match.reasons.includes('asset')).length===1);
      const commit=ui.button(t('mj.apply'),apply);commit.disabled=!!report.globalErrors.length||report.revision!==ctx.snapshot.globalRevision||!ctx.canWrite()||report.counts.create+report.counts.update+report.counts.link===0;
      preview.append(el('section',{class:'card stack'},el('h2',{},t('mj.preview')),el('p',{class:'notice'},t('mj.summary',report.counts)),report.repeatedFile?el('p',{class:'notice warning'},t('im.repeated')):null,
        report.revision!==ctx.snapshot.globalRevision?el('p',{role:'alert'},t('im.stale')):null,report.missingAssets.length?el('p',{class:'notice warning'},t('mj.missingCount',{count:report.missingAssets.length})):null,
        report.globalErrors.length?el('div',{role:'alert'},el('p',{},t('mj.datasetError')),report.globalErrors.slice(0,10).map(issue=>el('p',{class:'muted preserve-lines'},issue.code+' · '+issue.field))):null,
        el('p',{class:'muted'},t('mj.bulkHelp')),el('div',{class:'actions'},catalogs,assetsButton),el('div',{class:'people-filters'},el('div',{class:'field'},el('label',{for:'module-json-search'},t('mj.search')),search),el('div',{class:'field'},el('label',{for:'module-json-table'},t('mj.table')),table),el('div',{class:'field'},el('label',{for:'module-json-outcome'},t('mj.outcome')),outcome)),
        el('p',{class:'muted'},t('mj.scrollHint')),rowsHost,el('p',{class:'muted'},t('mj.stagingHelp')),el('div',{class:'actions'},ui.button(t('mj.report'),reportFile,true),commit)));
    }
    return[el('header',{class:'page-heading'},el('h1',{},t('nav.moduleImport'))),controls,preview];
  }
  root.modules.moduleImport=Object.freeze({render});
}(window.RescueManager));
