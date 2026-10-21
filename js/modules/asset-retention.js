(function(root){
  'use strict';
  const ui=root.components.ui,el=ui.el,t=(...args)=>root.core.i18n.t(...args),service=root.services.assetRetention,mb=bytes=>(bytes/1048576).toFixed(2),size=bytes=>bytes<1024?t('ra.bytes',{value:bytes}):bytes<1048576?t('ra.kib',{value:(bytes/1024).toFixed(1)}):t('ra.mib',{value:mb(bytes)});
  function review(ctx,report){
    const progress=el('p',{role:'status'}),urls=[],controls=[],boxes=[];let controller=null,working=false;
    const dialog=ui.form(t('ra.review'),[
      {key:'copyConfirmed',labelKey:'ra.keepCopy',type:'checkbox',required:true},
      {key:'confirmed',labelKey:'ra.confirm',type:'checkbox',required:true}
    ],{},async(input)=>{
      if(working)throw new root.core.errors.AppError('rt.busy');const groups=boxes.filter(box=>box.checked).map(box=>box.dataset.groupKey);if(!groups.length)throw new root.core.errors.AppError('ra.selectGroup');
      controller=new AbortController();controls.forEach(control=>control.disabled=true);cancel.disabled=false;progress.textContent=t('ra.removing',{completed:0,total:report.groups.filter(group=>groups.includes(group.key)).reduce((sum,group)=>sum+group.files.length,0)});
      try{const value=await service.apply(report,{...input,groups,signal:controller.signal,onProgress:state=>{progress.textContent=t('ra.removing',state);}});ctx.notify(t('ra.removed',{count:value.result.count,size:size(value.result.bytes)}));await ctx.refresh();}
      catch(error){if(error.name==='VerifiedBackupRequiredError')throw new root.core.errors.AppError('ra.copyRequired');throw error;}
      finally{controller=null;cancel.disabled=true;controls.forEach(control=>control.disabled=false);}
    },{});
    dialog.classList.add('history-correction-form');dialog.addEventListener('close',()=>urls.forEach(url=>URL.revokeObjectURL(url)));
    const save=dialog.querySelector('button[type=submit]'),cancel=ui.button(t('rt.cancelRemoval'),()=>controller?.abort(),true);cancel.disabled=true;dialog.querySelector('.actions').prepend(cancel);
    async function job(status,work){if(working||controller)return;working=true;save.disabled=true;controls.forEach(control=>control.disabled=true);try{await work();}catch(error){status.textContent=ui.message(error);}finally{working=false;controls.forEach(control=>control.disabled=false);save.disabled=!ctx.canWrite()||!report.groups.length;}}
    const selected=el('p',{role:'status'}),update=()=>{const chosen=report.groups.filter(group=>boxes.some(box=>box.checked&&box.dataset.groupKey===group.key));selected.textContent=t('ra.selected',{groups:t('ra.groupCount',{count:chosen.length}),files:t('ra.fileCount',{count:chosen.reduce((sum,group)=>sum+group.files.length,0)}),size:size(chosen.reduce((sum,group)=>sum+group.bytes,0))});};
    function file(row){
      const status=el('p',{role:'status'}),facts=[t('ra.type.'+row.type),row.mime,size(row.byteLength),row.width?row.width+'×'+row.height:null,t('ra.created',{date:row.createdAt.slice(0,10)}),row.deletedAt?t('ra.inTrash'):row.archivedAt?t('ra.archived'):null].filter(Boolean).join(' · ');
      const download=ui.button(t('ra.download'),()=>job(status,async()=>{const value=await service.read(report,row.id);ui.download(value.blob,value.fileName);status.textContent=t('ra.downloaded');}),true);controls.push(download);
      const item=el('li',{class:'stack'},el('strong',{class:'preserve-lines'},row.originalName),el('span',{},facts),el('span',{class:'muted preserve-lines'},t('ra.identity',{id:row.id})),el('div',{class:'actions'},download),status);
      if(row.mime.startsWith('image/')){const show=ui.button(t('ra.preview'),()=>job(status,async()=>{const value=await service.read(report,row.id),url=URL.createObjectURL(value.blob);urls.push(url);show.replaceWith(el('img',{src:url,alt:t('ra.previewAlt',{name:row.originalName}),class:'asset-preview'}));}),true);controls.push(show);item.querySelector('.actions').append(show);}
      return item;
    }
    const groups=report.groups.map((group,index)=>{
      const box=el('input',{type:'checkbox','data-group-key':group.key,id:'asset-group-'+index});box.addEventListener('change',update);boxes.push(box);controls.push(box);
      return el('fieldset',{class:'card stack'},el('legend',{},el('label',{for:box.id},box,' ',t('ra.group',{number:index+1,count:group.files.length,size:size(group.bytes)}))),el('ul',{class:'stack'},group.files.map(file)));
    });
    const all=ui.button(t('ra.selectAll'),()=>{boxes.forEach(box=>{box.checked=true;});update();},true),none=ui.button(t('ra.selectNone'),()=>{boxes.forEach(box=>{box.checked=false;});update();},true);controls.push(all,none);
    const kept=['current','inactive','history','dependent'].map(reason=>el('li',{},t('ra.keptRow',{reason:t('ra.kept.'+reason),count:report.kept[reason].count,size:size(report.kept[reason].bytes)})));
    const copy=root.components.backupProof.current(report,job,controls,'ra.copyHelp');
    const summary=el('section',{class:'stack'},
      el('p',{},t('ra.summary',{files:t('ra.fileCount',{count:report.totalCount}),size:size(report.totalBytes),limit:size(report.limitBytes),unusedFiles:t('ra.fileCount',{count:report.unusedCount}),unusedSize:size(report.unusedBytes)})),
      el('p',{class:'notice warning'},t('ra.warning')),
      el('section',{class:'stack'},el('h3',{},t('ra.keptCaption')),el('ul',{class:'asset-kept'},kept)),
      el('p',{class:'muted'},t('ra.keptHelp')),
      report.groups.length?el('section',{class:'stack'},el('h3',{},t('ra.candidates')),el('div',{class:'actions'},all,none),selected,...groups):el('p',{},t('ra.empty')),
      copy,progress);
    dialog.querySelector('h2').after(summary);update();save.disabled=!ctx.canWrite()||!report.groups.length;return dialog;
  }
  function render(ctx){
    const open=ui.button(t('ra.review'),()=>ctx.action(async()=>review(ctx,await service.preview())),true);open.dataset.assetReview='true';
    return el('section',{class:'card stack'},el('h2',{},t('ra.title')),el('p',{},t('ra.help')),open);
  }
  root.modules.assetRetention=Object.freeze({render});
}(window.RescueManager));
