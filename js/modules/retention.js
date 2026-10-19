(function(root){
  'use strict';
  const ui=root.components.ui,el=ui.el,t=(...args)=>root.core.i18n.t(...args),service=root.services.retention;
  function review(ctx,report){
    const retired=report.target.state==='retired',progress=el('p',{role:'status'});let controller=null,working=false;const controls=[];
    const dialog=ui.form(t('rt.review'),[
      ...(retired?[{key:'targetCopyConfirmed',labelKey:'rt.keepTargetCopy',type:'checkbox',required:true}]:[]),
      {key:'confirmed',labelKey:retired?'rt.confirmRetired':'rt.confirmStaging',type:'checkbox',required:true}
    ],{},async(input)=>{
      if(working)throw new root.core.errors.AppError('rt.busy');controller=new AbortController();controls.forEach(control=>control.disabled=true);cancel.disabled=false;progress.textContent=t('rt.removing',{completed:0,total:report.records});
      try{await service.apply(report,{...input,signal:controller.signal,onProgress:value=>{progress.textContent=t('rt.removing',value);}});ctx.notify(t('rt.removed'));await ctx.refresh();}
      finally{controller=null;cancel.disabled=true;controls.forEach(control=>control.disabled=false);}
    },{});
    dialog.classList.add('history-correction-form');
    const cancel=ui.button(t('rt.cancelRemoval'),()=>controller?.abort(),true);cancel.disabled=true;dialog.querySelector('.actions').prepend(cancel);
    function copyBlock(target){
      const datasetId=target?report.target.id:report.datasetId,dataRevision=target?report.target.dataRevision:report.dataRevision,status=el('p',{role:'status'}),file=el('input',{type:'file',accept:'.json,application/json'}),button=ui.button(t(target?'rt.downloadTarget':'rt.downloadCurrent'),()=>job(async()=>{const copy=await(target?root.services.backup.createForDataset(datasetId):root.services.backup.create());ui.download(copy.blob,'rescue-manager-'+(target?'inactive':'current')+'-backup-'+copy.container.content.createdAt.slice(0,10)+'.json');await root.services.backup.requested(copy.container.content.backupId);status.textContent=t('rt.downloaded');}),true);
      controls.push(button,file);const save=dialog.querySelector('button[type=submit]');let version=0;
      async function job(work){if(working||controller)return;working=true;version++;save.disabled=true;controls.forEach(control=>control.disabled=true);try{await work();}catch(error){status.textContent=ui.message(error);}finally{working=false;controls.forEach(control=>control.disabled=false);save.disabled=!ctx.canWrite();}}
      file.setAttribute('aria-label',t(target?'rt.verifyTarget':'rt.verifyCurrent'));file.addEventListener('change',()=>{const selected=file.files[0];if(selected)job(async()=>{const value=await root.services.backup.verify(selected);if(value.datasetId!==datasetId||value.dataRevision!==dataRevision)throw new root.core.errors.AppError('rt.wrongBackup');const receipts=await root.services.backup.listForDataset(datasetId);if(!receipts.some(row=>row.backupId===value.backup.backupId&&row.state==='verified'&&row.dataRevision===dataRevision))throw new root.core.errors.AppError('rt.copyRequired');status.textContent=t('ui.backupVerified');});});
      root.services.backup.listForDataset(datasetId).then(rows=>{if(version===0&&!working&&!controller)status.textContent=t(rows.some(row=>row.state==='verified'&&row.dataRevision===dataRevision)?'rt.copyVerified':'rt.copyRequired');}).catch(error=>{status.textContent=ui.message(error);});
      return el('section',{class:'stack'},el('h3',{},t(target?'rt.targetBackup':'rt.currentBackup')),el('p',{},t(target?'rt.targetBackupHelp':'rt.currentBackupHelp')),button,el('label',{},t(target?'rt.verifyTarget':'rt.verifyCurrent'),file),status);
    }
    const summary=el('section',{class:'stack'},el('h3',{},report.organizationName||t('r.unnamed')),el('p',{class:'preserve-lines'},t('rt.identity',{id:report.target.id})),el('p',{},t('rt.summary',{state:t('rt.state.'+report.target.state),date:report.target.updatedAt,records:report.records,mb:(report.assetBytes/1048576).toFixed(2)})),el('p',{class:'notice warning'},t(retired?'rt.retiredWarning':'rt.stagingWarning')),el('div',{class:'table-wrap'},el('table',{},el('thead',{},el('tr',{},el('th',{scope:'col'},t('ui.module')),el('th',{scope:'col'},t('ui.records')))),el('tbody',{},Object.entries(report.counts).filter(([,count])=>count).map(([table,count])=>el('tr',{},el('th',{scope:'row'},t('table.'+table)),el('td',{},count)))))),copyBlock(false),...(retired?[copyBlock(true)]:[]),progress);
    dialog.querySelector('h2').after(summary);dialog.querySelector('button[type=submit]').disabled=!ctx.canWrite();return dialog;
  }
  async function render(ctx,page=1){
    const value=await service.list(page),area=el('div',{class:'stack'}),previous=ui.button(t('a.previous'),()=>load(value.page-1),true),next=ui.button(t('a.next'),()=>load(value.page+1),true);previous.disabled=value.page<=1;next.disabled=value.page>=value.pages;
    async function load(number){try{const content=await render(ctx,number);area.replaceWith(content);}catch(error){ctx.notify(ui.message(error),true);await ctx.refresh();}}
    const rows=value.rows.map(row=>{const open=ui.button(t('rt.review'),()=>ctx.action(async()=>review(ctx,await service.preview(row.target.id))),true);open.disabled=!ctx.canWrite();open.dataset.datasetId=row.target.id;return el('section',{class:'card stack'},el('h2',{},row.organizationName||t('r.unnamed')),el('p',{class:'preserve-lines'},t('rt.identity',{id:row.target.id})),el('p',{},t('rt.summary',{state:t('rt.state.'+row.target.state),date:row.target.updatedAt,records:row.records,mb:(row.assetBytes/1048576).toFixed(2)})),open);});
    area.append(el('header',{class:'page-heading'},el('h1',{},t('nav.retention'))),el('p',{class:'notice warning'},t('rt.help')),el('a',{href:'#backup'},t('rt.openBackups')),rows.length?el('div',{class:'stack'},rows):el('p',{},t('rt.empty')),el('div',{class:'actions'},previous,el('span',{},t('ui.recordPage',{page:value.page,pages:value.pages,count:value.total})),next));return area;
  }
  root.modules.retention=Object.freeze({render});
}(window.RescueManager));
