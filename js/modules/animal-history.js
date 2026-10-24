(function(root){
  'use strict';const ui=root.components.ui,el=ui.el,t=(...args)=>root.core.i18n.t(...args);
  function civil(ctx,value){if(!value)return t('ui.unknown');const format=ctx.snapshot.tables.organizationSettings[0].dateFormat;return format==='day_first'?value.slice(8)+'/'+value.slice(5,7)+'/'+value.slice(0,4):format==='month_first'?value.slice(5,7)+'/'+value.slice(8)+'/'+value.slice(0,4):value;}
  function source(ctx,event){
    const data=ctx.snapshot.tables,type=event.source.type,table=root.domain.entityTables[type],row=data[table]?.find(item=>item.id===event.source.id);
    if(!row)return ui.dialog(t('hi.source'),el('p',{},t('hi.missing')));
    const animal=data.animals.find(item=>item.id===(row.animalId||(type==='animal'?row.id:null))),fields=[];
    const text=(key,value)=>{if(value!==null&&value!==undefined&&value!=='')fields.push(el('div',{},el('dt',{},t(key)),el('dd',{class:'preserve-lines'},value)));};
    const contact=id=>{const person=root.services.contacts.resolve(data,id);return person?ui.button(person.name,()=>root.modules.people.openContact(person.id,{context:ctx}),true):t('ui.unknown');};
    text('hi.source',t('table.'+table));if(animal)text('a.name',animal.name+' ('+animal.code+')');
    if(type==='veterinary_record')return root.modules.healthWorkflow.openRecord(ctx,row.id);
    for(const[key,label]of Object.entries({name:'a.name',title:'a.title',code:'a.code',entryReason:'af.entryReason',originDescription:'af.origin',endReason:'fw.endReason',exceptionReason:'fw.exceptionReason',closureReason:'aw.closureReason',interviewNotes:'aw.interviewNotes',returnReason:'aw.returnReason',notes:'a.notes',description:'a.description',externalFileName:'d.externalName',externalLocation:'d.location'}))text(label,row[key]);
    for(const[key,label]of Object.entries({entryDate:'af.entryDate',exitDate:'a.end',startDate:'fw.startDate',endDate:'fw.endDate',applicationDate:'aw.applicationDate',approvalDate:'aw.approvalDate',reservationDate:'aw.reservationDate',expiresOn:'aw.expiresOn',closedOn:'aw.closedOn',adoptionDate:'aw.adoptionDate',returnDate:'aw.returnDate',date:'a.date'}))if(row[key])text(label,civil(ctx,row[key]));
    if(type==='adoption_application')text('a.state',t('a.application.'+row.status));if(type==='reservation')text('a.state',t('aw.reservationStatus.'+row.status));if(type==='animal')text('a.state',t('a.status.'+row.managementStatus));
    let contactId=row.contactId||row.adopterContactId;if(type==='foster_stay')contactId=data.fosterProfiles.find(item=>item.id===row.fosterProfileId)?.contactId;if(type==='reservation')contactId=data.adoptionApplications.find(item=>item.id===row.applicationId)?.contactId;if(contactId)text('a.contact',contact(contactId));
    if(row.exitReason)text('a.reason',t('hi.exit.'+row.exitReason));if(row.entryType)text('a.type',t('hi.entry.'+row.entryType));
    const extra=[];if(type==='adoption')extra.push(ctx.documents({entityType:type,entityId:row.id}));
    if(type==='document'){text('d.mode',t(row.mode==='embedded'?'d.embedded':'d.external'));if(row.mode==='embedded')extra.push(ui.button(t('d.download'),()=>ctx.action(async()=>{const file=await root.services.documents.download(row.id);ui.download(file.blob,file.fileName);}),true));else extra.push(el('p',{class:'notice warning'},t('d.externalHelp')));}
    return ui.dialog(t('hi.source'),[el('p',{class:'muted'},t('hi.sourceCurrent')),el('dl',{class:'detail-grid'},fields),...extra],{wide:true});
  }
  function correct(ctx,event){
    const info=root.services.historyCorrections.inspect(ctx.snapshot.tables,event.id,root.utils.dates.today(ctx.snapshot.tables.organizationSettings[0].timeZone));
    const dialog=ui.form(t(info.titleKey),[
      {key:'date',labelKey:'hc.newDate',type:'date',required:true,min:info.minDate,max:info.maxDate},
      {key:'reason',labelKey:'hc.reason',type:'textarea',required:true,maxLength:200},
      ...(info.related||[]).map((item,index)=>({key:'related_'+index,labelKey:item.labelKey||'hc.related.'+item.table,required:true,sectionKey:'hc.relatedHeading',options:[{value:'',label:t('hc.choose')},{value:'keep',label:t('hc.keepDate')},{value:'move',label:t('hc.moveDate')}]})),
      ...(info.requiresIncomeConfirmation?[{key:'preserveIncomeDate',labelKey:'hc.preserveIncome',type:'checkbox',required:true}]:[]),
      ...(info.requiresExpenseConfirmation?[{key:'preserveExpenseDate',labelKey:'hc.preserveExpense',type:'checkbox',required:true}]:[]),
      {key:'confirmed',labelKey:'hc.confirm',type:'checkbox',required:true}
    ],{date:info.previousDate},async(input,command)=>{
      if(info.related){input.relatedDecisions=info.related.map((item,index)=>({key:item.key,action:input['related_'+index]}));info.related.forEach((item,index)=>delete input['related_'+index]);}
      await root.services.historyCorrections[info.command]({...input,eventId:event.id},command);ctx.notify(t('hc.saved'));await ctx.refresh();
    },{expectedRevision:ctx.snapshot.globalRevision});
    dialog.classList.add('history-correction-form');
    const notes=[el('p',{},info.animalName+' · '+t('a.event.'+info.type)+' · '+civil(ctx,info.previousDate)),
      el('p',{class:'notice warning'},t('hc.help')),el('p',{},t(info.effectKey)),
      info.incomeDate?el('p',{class:'notice warning'},t('hc.incomeDate',{date:civil(ctx,info.incomeDate)})):null,
      info.expenseDate?el('p',{class:'notice warning'},t('hc.expenseDate',{date:civil(ctx,info.expenseDate)})):null,
      el('p',{},t('hc.bounds',{from:info.minDate?civil(ctx,info.minDate):t('ui.unknown'),to:civil(ctx,info.maxDate)}))].filter(Boolean);
    dialog.querySelector('h2').after(...notes);
    if(info.related?.length){
      const section=dialog.querySelector('[name=related_0]').closest('section');section.querySelector('h3').after(el('p',{class:'notice warning'},t(info.relatedHelpKey||'hc.relatedHelp')));
      info.related.forEach((item,index)=>{const control=dialog.querySelector('[name=related_'+index+']');control.previousElementSibling.append(document.createTextNode(' · '+item.label+' · '+civil(ctx,item.previous)));if(!item.canMove){control.querySelector('option[value=move]').disabled=true;control.after(el('small',{},t('hc.noClosureEvent')));}});
    }
  }
  function render(ctx,animal){
    const area=el('div'),filter=el('select',{'aria-label':t('hi.type')},el('option',{value:''},t('p.all')),root.domain.enums.eventType.map(value=>el('option',{value},t('a.event.'+value)))),corrected=el('input',{type:'checkbox',id:'history-corrected'}),periodFrom=el('input',{type:'date','aria-label':t('p.from')}),periodTo=el('input',{type:'date','aria-label':t('p.to')});let page=1;
    function paint(){
      if(periodFrom.value&&periodTo.value&&periodFrom.value>periodTo.value){area.replaceChildren(el('p',{role:'alert'},t('p.periodError')));return;}
      const rows=ctx.snapshot.tables.animalEvents.filter(row=>row.animalId===animal.id&&(!filter.value||row.type===filter.value)&&(!periodFrom.value||row.eventDate>=periodFrom.value)&&(!periodTo.value||row.eventDate<=periodTo.value)&&(corrected.checked||!row.supersededByEventId&&!row.voidReason)).sort((a,b)=>b.eventDate.localeCompare(a.eventDate)||b.recordedAt.localeCompare(a.recordedAt)||a.id.localeCompare(b.id));
      const pages=Math.max(1,Math.ceil(rows.length/20));page=Math.min(page,pages);const previous=ui.button(t('a.previous'),()=>{page--;paint();},true),next=ui.button(t('a.next'),()=>{page++;paint();},true);previous.disabled=page<=1;next.disabled=page>=pages;
      const stamp=value=>new Intl.DateTimeFormat(root.core.i18n.language,{dateStyle:'medium',timeStyle:'short',timeZone:ctx.snapshot.tables.organizationSettings[0].timeZone}).format(new Date(value));
      area.replaceChildren(rows.length?el('div',{class:'table-wrap'},el('table',{},el('thead',{},el('tr',{},['hi.factDate','hi.recorded','a.event','a.state','a.reason','hi.source'].map(key=>el('th',{scope:'col'},t(key))))),el('tbody',{},rows.slice((page-1)*20,page*20).map(event=>{
        const code=event.parameters.code,status=event.type==='application'&&root.domain.enums.applicationStatus.includes(code)?t('a.application.'+code):event.type==='reservation'&&root.domain.enums.reservationStatus.includes(code)?t('aw.reservationStatus.'+code):'';
        return el('tr',{},el('td',{},civil(ctx,event.eventDate)),el('td',{},stamp(event.recordedAt)),el('th',{scope:'row'},t('a.event.'+event.type)),el('td',{},status,event.supersededByEventId||event.voidReason?el('p',{class:'badge'},t('hi.corrected')):event.correctsEventId?el('p',{class:'badge'},t('hc.replacement')):null),el('td',{class:'preserve-lines'},event.parameters.reason||event.voidReason||''),el('td',{},el('div',{class:'actions'},ui.button(t('hi.openSource'),()=>source(ctx,event),true),root.services.historyCorrections.canCorrect(ctx.snapshot.tables,event)?(()=>{const button=ui.button(t(root.services.historyCorrections.inspect(ctx.snapshot.tables,event.id).titleKey),()=>correct(ctx,event),true);button.disabled=!ctx.canWrite();button.dataset.eventId=event.id;return button;})():null)));})))):el('p',{class:'muted'},t('a.emptySection')),el('div',{class:'actions pager'},previous,el('span',{},t('hi.page',{page,pages,count:rows.length})),next));
    }
    for(const control of[filter,corrected,periodFrom,periodTo])control.addEventListener('change',()=>{page=1;paint();});paint();
    return el('div',{class:'stack'},el('p',{class:'muted'},t('hi.help')),el('div',{class:'people-filters'},el('div',{class:'field'},el('label',{},t('hi.type'),filter)),el('div',{class:'field'},el('label',{},t('p.from'),periodFrom)),el('div',{class:'field'},el('label',{},t('p.to'),periodTo))),el('label',{for:'history-corrected'},corrected,t('hi.includeCorrected')),area);
  }
  root.modules.animalHistory=Object.freeze({render});
}(window.RescueManager));
