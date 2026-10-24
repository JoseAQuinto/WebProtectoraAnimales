(function(root){
  'use strict';
  function open(ctx,row,onSaved){
    const ui=root.components.ui,el=ui.el,t=(...args)=>root.core.i18n.t(...args),info=root.services.documentDates.inspect(ctx.snapshot.tables,row.id),zone=ctx.snapshot.tables.organizationSettings[0].timeZone;
    const dialog=ui.form(t('dc.title'),[{key:'date',labelKey:'d.date',type:'date',required:true,max:root.utils.dates.today(zone)},{key:'reason',labelKey:'hc.reason',type:'textarea',required:true,maxLength:200},{key:'confirmed',labelKey:'dc.confirm',type:'checkbox',required:true}],{date:info.date},async(input,command)=>{await root.services.documentDates.correct(row.id,input,command);await onSaved();},{expectedRevision:ctx.snapshot.globalRevision});
    dialog.classList.add('history-correction-form');
    const review=el('section',{class:'stack'}),area=el('div');let page=1;
    const civil=value=>{const format=ctx.snapshot.tables.organizationSettings[0].dateFormat;return format==='day_first'?value.slice(8)+'/'+value.slice(5,7)+'/'+value.slice(0,4):format==='month_first'?value.slice(5,7)+'/'+value.slice(8)+'/'+value.slice(0,4):value;};
    function paint(){const pages=Math.max(1,Math.ceil(info.events.length/20)),previous=ui.button(t('a.previous'),()=>{page--;paint();},true),next=ui.button(t('a.next'),()=>{page++;paint();},true);previous.disabled=page<=1;next.disabled=page>=pages;area.replaceChildren(info.events.length?el('ul',{},info.events.slice((page-1)*20,page*20).map(event=>el('li',{},el('p',{},event.animalName+' · '+civil(event.date)),el('small',{},t('hi.recorded')+': '+new Intl.DateTimeFormat(root.core.i18n.language,{dateStyle:'medium',timeStyle:'short',timeZone:zone}).format(new Date(event.recordedAt)))))):el('p',{},t('dc.noEvents')),el('div',{class:'actions pager'},previous,el('span',{},t('ui.recordPage',{page,pages,count:info.events.length})),next));}
    review.append(...[el('p',{},info.title+' · '+civil(info.date)),el('p',{class:'notice warning'},t('dc.help')),info.drift?el('p',{class:'notice warning'},t('dc.drift',{count:info.drift})):null,el('h3',{},t('dc.affected',{count:info.events.length})),area].filter(Boolean));paint();dialog.querySelector('h2').after(review);
    return dialog;
  }
  root.modules.documentDates=Object.freeze({open});
}(window.RescueManager));
