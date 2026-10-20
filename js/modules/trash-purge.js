(function(root){
  'use strict';
  const ui=root.components.ui,el=ui.el,t=(...args)=>root.core.i18n.t(...args),service=root.services.trashPurge;
  const size=bytes=>bytes<1024?t('ra.bytes',{value:bytes}):bytes<1048576?t('ra.kib',{value:(bytes/1024).toFixed(1)}):t('ra.mib',{value:(bytes/1048576).toFixed(2)});
  const table=name=>t('table.'+name);
  function rows(counts,key){return Object.entries(counts).sort(([a],[b])=>a.localeCompare(b)).map(([name,count])=>el('li',{},t(key,{table:table(name),count})));}
  function review(ctx,report){
    const progress=el('p',{role:'status'}),controls=[];let controller=null,working=false;
    const dialog=ui.form(t('tp.review'),[
      {key:'copyConfirmed',labelKey:'tp.keepCopy',type:'checkbox',required:true},
      {key:'confirmed',labelKey:'tp.confirm',type:'checkbox',required:true}
    ],{},async(input)=>{
      if(working)throw new root.core.errors.AppError('rt.busy');controller=new AbortController();controls.forEach(control=>control.disabled=true);cancel.disabled=false;progress.textContent=t('tp.removing',{completed:0,total:report.records.length});
      try{const value=await service.apply(report,{...input,signal:controller.signal,onProgress:state=>{progress.textContent=t('tp.removing',state);}});ctx.notify(t('tp.removed',{count:value.result.records}));await ctx.refresh();}
      catch(error){if(error.name==='VerifiedBackupRequiredError')throw new root.core.errors.AppError('ra.copyRequired');throw error;}
      finally{controller=null;cancel.disabled=true;controls.forEach(control=>control.disabled=false);}
    },{});
    dialog.classList.add('history-correction-form');
    const save=dialog.querySelector('button[type=submit]'),cancel=ui.button(t('rt.cancelRemoval'),()=>controller?.abort(),true);cancel.disabled=true;dialog.querySelector('.actions').prepend(cancel);
    async function job(status,work){if(working||controller)return;working=true;save.disabled=true;controls.forEach(control=>control.disabled=true);try{await work();}catch(error){status.textContent=ui.message(error);}finally{working=false;controls.forEach(control=>control.disabled=false);save.disabled=!ctx.canWrite()||report.blocked;}}
    const blockers=new Map();for(const item of report.blockers){const id=item.reason+'/'+item.table;blockers.set(id,{...item,count:(blockers.get(id)?.count||0)+1});}
    const summary=el('section',{class:'stack'},
      el('div',{class:'card stack'},el('h3',{class:'preserve-lines'},report.label.title||table(report.root.table)),el('p',{class:'preserve-lines'},[table(report.root.table),report.label.detail].filter(Boolean).join(' · ')),el('p',{class:'muted preserve-lines'},t('tp.identity',{id:report.root.id,date:(report.root.deletedAt||'').slice(0,10)}))),
      el('p',{class:'notice warning'},t('tp.warning')),
      report.blocked?el('div',{class:'notice error stack',role:'alert'},el('h3',{},t('tp.blocked')),el('ul',{},[...blockers.values()].map(item=>el('li',{},t('tp.blocker.'+item.reason,{table:table(item.table),count:item.count})))),el('p',{},t('tp.blockedHelp'))):null,
      el('section',{class:'stack'},el('h3',{},t('tp.removes')),el('ul',{class:'asset-kept'},rows(report.counts,'tp.countRow')),report.assets.length?el('p',{},t('tp.files',{count:report.assets.length,size:size(report.assetBytes)})):null),
      Object.keys(report.affected).length?el('section',{class:'stack'},el('h3',{},t('tp.affected')),el('ul',{class:'asset-kept'},rows(report.affected,'tp.countRow')),el('p',{class:'muted'},t('tp.affectedHelp'))):null,
      report.blocked?null:root.components.backupProof.current(report,job,controls,'tp.copyHelp'),progress);
    dialog.querySelector('h2').after(summary);save.disabled=!ctx.canWrite()||report.blocked;return dialog;
  }
  async function render(ctx,page=1){
    const value=await service.list(page),card=el('section',{class:'card stack'}),previous=ui.button(t('a.previous'),()=>load(value.page-1),true),next=ui.button(t('a.next'),()=>load(value.page+1),true);previous.disabled=value.page<=1;next.disabled=value.page>=value.pages;
    async function load(number){try{card.replaceWith(await render(ctx,number));}catch(error){ctx.notify(ui.message(error),true);await ctx.refresh();}}
    const list=value.rows.map(row=>{const open=ui.button(t('tp.review'),()=>ctx.action(async()=>review(ctx,await service.preview(row.table,row.id))),true);open.dataset.trashRoot=row.table+'/'+row.id;return el('li',{class:'stack'},el('strong',{class:'preserve-lines'},row.title||table(row.table)),el('span',{class:'preserve-lines'},[table(row.table),row.detail,t('tp.trashedOn',{date:row.deletedAt.slice(0,10)})].filter(Boolean).join(' · ')),el('div',{class:'actions'},open));});
    card.append(el('h2',{},t('tp.title')),el('p',{},t('tp.help')),list.length?el('ul',{class:'stack trash-roots'},list):el('p',{},t('tp.empty')),el('div',{class:'actions'},previous,el('span',{},t('ui.recordPage',{page:value.page,pages:value.pages,count:value.total})),next));return card;
  }
  root.modules.trashPurge=Object.freeze({render});
}(window.RescueManager));
