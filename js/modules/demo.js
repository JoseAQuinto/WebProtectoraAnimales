(function(root){
  'use strict';
  const ui=root.components.ui,el=ui.el,t=(key,values)=>root.core.i18n.t(key,values),service=root.services.demo,view={language:null,report:null,result:null,page:1};let generation=0;
  function banner(snapshot){const value=service.status(snapshot);return value.batches.length?el('aside',{class:'notice warning'},el('p',{},t('dm.banner')),el('a',{href:'#demo'},t('dm.manage'))):null;}
  function render(ctx){
    if(!view.language)view.language=root.core.i18n.language;const value=service.status(ctx.snapshot),status=el('p',{role:'status'}),output=el('div',{class:'stack'}),label=table=>t('mj.table.'+table);
    async function review(kind,batchId){const token=++generation;view.report=null;view.result=null;view.page=1;output.replaceChildren();status.textContent=t('dm.preparing');
      try{const snapshot=await root.services.context.snapshot(),report=kind==='load'?await service.previewLoad(snapshot,{language:view.language}):service.previewClear(snapshot,batchId);if(token!==generation)return;view.report=report;await ctx.refresh();}
      catch(error){if(token===generation){status.textContent=ui.message(error);status.setAttribute('role','alert');}}
    }
    function apply(){
      const report=view.report,fields=[{key:'confirmed',labelKey:report.kind==='load'?'dm.confirmLoad':'dm.confirmClear',type:'checkbox',required:true}];if(report.requiresConversion)fields.push({key:'confirmedConversion',labelKey:'dm.confirmConversion',type:'checkbox',required:true});
      const progress=el('p',{role:'status'});let abort;const cancel=ui.button(t('im.cancelPreparation'),()=>abort?.abort(),true);cancel.hidden=true;
      const dialog=ui.form(t(report.kind==='load'?'dm.load':'dm.clear'),fields,{},async input=>{
        abort=new AbortController();cancel.hidden=false;cancel.disabled=false;
        try{await service.apply(report,{...input,signal:abort.signal,onProgress:value=>{progress.textContent=t(value.phase==='activating'?'im.activating':'im.progress',value);if(value.phase==='activating')cancel.disabled=true;}});view.result={kind:report.kind,...report.counts};view.report=null;ctx.notify(t(report.kind==='load'?'dm.loaded':'dm.cleared',report.counts));await ctx.refresh();}
        finally{cancel.hidden=true;}
      });dialog.querySelector('h2').after(el('p',{class:'notice'},t(report.kind==='load'?'dm.loadSummary':'dm.clearSummary',report.counts)),el('p',{class:'muted'},t('dm.backupHelp')),progress,cancel);
    }
    const language=el('select',{id:'demo-language'},['en','es'].map(code=>el('option',{value:code},t('dm.language.'+code))));language.value=view.language;language.addEventListener('change',()=>{view.language=language.value;view.report=null;output.replaceChildren(el('p',{},t('dm.revalidate')));});
    const load=ui.button(t('dm.reviewLoad'),()=>review('load'));load.disabled=!value.canLoad||!ctx.canWrite();
    const controls=el('section',{class:'card stack'},el('p',{},t('dm.help')),el('p',{class:'notice warning'},t('dm.workIsReal')),el('label',{for:'demo-language'},t('dm.language')),language,el('div',{class:'actions'},load,el('a',{href:'#backup'},t('ui.createBackup'))),!value.canLoad?el('p',{class:'muted'},t(value.batches.length?'dm.alreadyLoaded':'dm.businessBlocked',{count:value.businessRecords})):null,el('p',{class:'muted'},t('dm.backupHelp')),status);
    if(value.batches.length)controls.append(el('section',{class:'stack'},el('h2',{},t('dm.batches')),value.batches.map(batch=>{const button=ui.button(t('dm.reviewClear'),()=>review('clear',batch.id),true);button.disabled=!ctx.canWrite();return el('div',{class:'card stack'},el('p',{},t('dm.batch',{date:batch.createdAt,count:batch.count})),button);})));
    if(view.result)output.append(el('p',{class:'notice'},t(view.result.kind==='load'?'dm.loaded':'dm.cleared',view.result)));
    if(view.report){
      const report=view.report,pages=Math.max(1,Math.ceil(report.rows.length/20));view.page=Math.min(view.page,pages);
      const body=report.rows.slice((view.page-1)*20,view.page*20).map(row=>el('tr',{},el('td',{},label(row.table)),el('th',{scope:'row'},row.name||t('ui.unknown')),el('td',{},t('dm.action.'+row.action))));
      const previous=ui.button(t('a.previous'),()=>{view.page--;ctx.refresh();},true),next=ui.button(t('a.next'),()=>{view.page++;ctx.refresh();},true);previous.disabled=view.page<=1;next.disabled=view.page>=pages;
      const commit=ui.button(t(report.kind==='load'?'dm.load':'dm.clear'),apply);commit.disabled=!!report.globalErrors.length||report.revision!==ctx.snapshot.globalRevision||!ctx.canWrite();
      output.append(el('section',{class:'card stack'},el('h2',{},t('dm.review')),el('p',{class:'notice'},t(report.kind==='load'?'dm.loadSummary':'dm.clearSummary',report.counts)),report.referenceDate?el('p',{},t('dm.reference',{date:report.referenceDate})):null,
        report.requiresConversion?el('div',{class:'notice warning'},el('p',{},t('dm.conversionHelp')),el('h3',{},t('dm.dependencies')),report.dependencies.slice(0,20).map(row=>el('p',{class:'preserve-lines'},label(row.table)+' · '+row.name+' → '+label(row.targetTable)))):null,
        report.globalErrors.length?el('p',{role:'alert'},t('dm.validationError')):null,report.revision!==ctx.snapshot.globalRevision?el('p',{role:'alert'},t('im.stale')):null,
        el('div',{class:'table-wrap'},el('table',{},el('thead',{},el('tr',{},['mj.table','dm.record','mj.outcome'].map(key=>el('th',{scope:'col'},t(key))))),el('tbody',{},body))),el('div',{class:'actions'},previous,el('span',{},t('ui.recordPage',{page:view.page,pages,count:report.rows.length})),next),
        el('div',{class:'actions'},commit,ui.button(t('dm.discardReview'),()=>{generation++;view.report=null;ctx.refresh();},true))));
    }
    return[el('header',{class:'page-heading'},el('h1',{},t('nav.demo'))),controls,output];
  }
  root.modules.demo=Object.freeze({render,banner});
}(window.RescueManager));
