(function(root){
  'use strict';
  const ui=root.components.ui,el=ui.el,t=(...args)=>root.core.i18n.t(...args),service=root.services.tasks;
  const view={search:'',status:'open',priority:'',typeId:'',animalId:'',responsibleVolunteerId:'',from:'',to:'',mode:'list',month:'',page:1};
  const active=row=>!row.deletedAt&&!row.archivedAt;
  const command=ctx=>({expectedRevision:ctx.snapshot.globalRevision});
  const field=(key,extra={})=>({key,labelKey:'q.'+key,...extra});
  const choices=(values,prefix)=>values.map(value=>({value,label:t(prefix+value)}));
  function date(ctx,value){if(!value)return t('ui.unknown');const format=ctx.snapshot.tables.organizationSettings[0].dateFormat;
    return format==='day_first'?value.slice(8)+'/'+value.slice(5,7)+'/'+value.slice(0,4):format==='month_first'?value.slice(5,7)+'/'+value.slice(8)+'/'+value.slice(0,4):value;}
  function catalog(tables,id){const row=tables.catalogOptions.find(item=>item.id===id);return row?root.services.catalogs.label(row):t('ui.unknown');}
  function clinical(tables,task){return task.source?.type==='care_plan'||['veterinary_visit','vaccination','medication'].includes(tables.catalogOptions.find(row=>row.id===task.typeId)?.code);}
  async function saved(ctx){ctx.notify(t('ui.saved'));await ctx.refresh();}
  function editor(ctx,options={}){
    const tables=ctx.snapshot.tables,task=options.task,plan=options.plan,animal=options.animal;
    const fixed=plan||task?.source,fields=[field('title',{required:true,maxLength:200}),field('dueDate',{type:'date',required:true,min:plan?.startDate}),
      field('typeId',{required:true,options:tables.catalogOptions.filter(row=>row.kind==='task_type'&&(active(row)&&row.active||row.id===task?.typeId)).map(row=>({value:row.id,label:root.services.catalogs.label(row)}))}),
      field('priority',{required:true,options:choices(root.domain.enums.priority,'q.priority.')})];
    if(!fixed)fields.push(field('animalId',{options:tables.animals.filter(row=>active(row)||row.id===task?.animalId).map(row=>({value:row.id,label:row.code+' · '+row.name}))}));
    const currentVolunteer=tables.volunteerProfiles.find(row=>row.id===task?.responsibleVolunteerId);
    fields.push(field('contactId',{options:tables.contacts.filter(row=>active(row)&&!row.mergedIntoContactId||row.id===task?.contactId).map(row=>({value:row.id,label:row.name})),advancedKey:'q.more'}),
      field('responsibleVolunteerId',{options:tables.volunteerProfiles.filter(row=>active(row)&&row.status==='active'||row.id===task?.responsibleVolunteerId).map(row=>({value:row.id,label:(root.services.contacts.resolve(tables,row.contactId)?.name||t('ui.unknown'))+(row.status!=='active'||!active(row)?' · '+t('q.inactive'):'' )})),advancedKey:'q.more',help:currentVolunteer&&(!active(currentVolunteer)||currentVolunteer.status!=='active')?'q.reviewAssignedVolunteer':null}),
      field('dueLocalTime',{type:'time',advancedKey:'q.more'}),field('timeZone',{maxLength:100,advancedKey:'q.more',help:'q.timeHelp'}),
      field('description',{type:'textarea',keepEmpty:true,advancedKey:'q.more'}),field('notes',{type:'textarea',keepEmpty:true,advancedKey:'q.more'}));
    if(task)fields.push(field('status',{required:true,options:choices(['pending','in_progress'],'a.task.')}));
    const values=task||{animalId:animal?.id,dueDate:plan?.startDate||root.utils.dates.today(tables.organizationSettings[0].timeZone),priority:'medium'};
    const dialog=ui.form(t(task?'q.edit':'q.new'),fields,values,async(input,cmd)=>{
      if(plan)delete input.animalId;else if(task?.source)input.animalId=task.animalId;
      if(!input.dueLocalTime)input.timeZone=null;
      if(task)await service.edit(task.id,input,cmd);else if(plan)await root.services.health.scheduleTask(plan.id,input,cmd);else await service.create(input,cmd);
      await saved(ctx);
    },command(ctx));
    const type=dialog.querySelector('[name=typeId]'),animalControl=dialog.querySelector('[name=animalId]');
    if(animalControl){const repaint=()=>{animalControl.required=['veterinary_visit','vaccination','medication'].includes(tables.catalogOptions.find(row=>row.id===type.value)?.code);animalControl.closest('.field').querySelector('label').textContent=t('q.animalId')+(animalControl.required?' *':'');};type.addEventListener('change',repaint);repaint();}
    if(plan||animal)dialog.querySelector('h2').after(el('p',{},plan?.name||animal.name));
    return dialog;
  }
  function closeTask(ctx,task,cancel){
    const tables=ctx.snapshot.tables;
    if(!cancel&&clinical(tables,task)){
      const animal=tables.animals.find(row=>row.id===task.animalId);
      if(animal)return root.modules.healthWorkflow.record(ctx,animal,task);
      return ui.dialog(t('q.clinical'),el('p',{},t('q.needsAnimal')));
    }
    const dialog=ui.form(t(cancel?'q.cancelTask':'q.complete'),[field('date',{type:'date',required:true,max:root.utils.dates.today(tables.organizationSettings[0].timeZone)}),
      ...(cancel?[field('reason',{required:true,maxLength:200})]:[]),field('confirmed',{type:'checkbox',required:true})],{date:root.utils.dates.today(tables.organizationSettings[0].timeZone)},async(input,cmd)=>{
      if(!input.confirmed)throw new root.core.errors.AppError('q.confirmRequired');
      const {confirmed,...values}=input;await service[cancel?'cancel':'complete'](task.id,values,cmd);await saved(ctx);
    },command(ctx));dialog.querySelector('h2').after(el('p',{},task.title));return dialog;
  }
  function detail(ctx,task){
    const tables=ctx.snapshot.tables,animal=tables.animals.find(row=>row.id===task.animalId),contact=root.services.contacts.resolve(tables,task.contactId),volunteer=tables.volunteerProfiles.find(row=>row.id===task.responsibleVolunteerId);
    const controls=el('div',{class:'actions'}),isOpen=active(task)&&['pending','in_progress'].includes(task.status),writable=root.services.context.status().canWrite;
    if(isOpen)for(const[key,work]of[['q.edit',()=>editor(ctx,{task})],[clinical(tables,task)?'q.clinical':'q.complete',()=>closeTask(ctx,task,false)],['q.cancelTask',()=>closeTask(ctx,task,true)]]){const button=ui.button(t(key),()=>{modal.close();work();},true);button.disabled=!writable;controls.append(button);}
    const modal=ui.dialog(task.title,[el('p',{class:'badge'},t('a.task.'+task.status)+' · '+t('q.priority.'+task.priority)),el('p',{},date(ctx,task.dueDate)+(task.dueLocalTime?' · '+task.dueLocalTime+' · '+task.timeZone:'')),
      el('p',{},catalog(tables,task.typeId)),animal?el('a',{href:'#animals/'+animal.id,on:{click:()=>modal.close()}},animal.code+' · '+animal.name):null,
      contact?el('p',{},t('q.contactId')+': '+contact.name):null,volunteer?el('p',{},t('q.responsibleVolunteerId')+': '+root.services.contacts.resolve(tables,volunteer.contactId)?.name):null,
      ...['description','notes','cancellationReason'].filter(key=>task[key]).map(key=>el('p',{class:'preserve-lines'},task[key])),el('p',{class:'muted'},t('q.noAutomatic')),controls],{wide:true});return modal;
  }
  function render(ctx,animal){
    const tables=ctx.snapshot.tables,today=root.utils.dates.today(tables.organizationSettings[0].timeZone),panel=el('section',{class:'card stack'}),results=el('div'),state=animal?{...view,animalId:animal.id,mode:'list'}:view;
    if(!state.month)state.month=today.slice(0,7);
    const filterArea=el('div',{class:'people-filters'}),label=(key,control)=>{const id='task-filter-'+root.utils.ids.uuidV4();control.id=id;return el('div',{class:'field'},el('label',{for:id},t('q.'+key)),control);};
    function filtered(){return service.list(tables,{...state,status:state.status==='open'?['pending','in_progress']:state.status}).filter(row=>!state.search||root.utils.strings.normalizeSearch(row.title+' '+row.description+' '+row.notes).includes(root.utils.strings.normalizeSearch(state.search)));}
    function list(rows){
      const pages=Math.max(1,Math.ceil(rows.length/20));state.page=Math.min(state.page,pages);
      const previous=ui.button(t('a.previous'),()=>{state.page--;paint();},true),next=ui.button(t('a.next'),()=>{state.page++;paint();},true);previous.disabled=state.page<=1;next.disabled=state.page>=pages;
      return el('div',{class:'stack'},rows.length?el('div',{class:'table-wrap'},el('table',{},el('thead',{},el('tr',{},['q.title','q.dueDate','q.priority','q.status','q.animalId','q.actions'].map(key=>el('th',{scope:'col'},t(key))))),el('tbody',{},rows.slice((state.page-1)*20,state.page*20).map(task=>{
        const animal=tables.animals.find(row=>row.id===task.animalId);return el('tr',{},el('th',{scope:'row'},ui.button(task.title,()=>detail(ctx,task),true)),el('td',{},date(ctx,task.dueDate)+(task.dueLocalTime?' '+task.dueLocalTime:''),el('br'),el('small',{},t('q.urgency.'+service.urgency(task,today)))),el('td',{},t('q.priority.'+task.priority)),el('td',{},t('a.task.'+task.status)),el('td',{},animal?animal.code+' · '+animal.name:t('ui.unknown')),el('td',{},ui.button(t('q.open'),()=>detail(ctx,task),true)));})))):el('p',{class:'muted'},t('q.empty')),
        el('div',{class:'actions'},previous,el('span',{},t('q.page',{page:state.page,pages,count:rows.length})),next));
    }
    function calendar(rows){
      const grid=root.utils.calendar.month(state.month),header=el('div',{class:'actions'}),month=el('input',{type:'month',value:state.month,min:'0001-01',max:'9999-12'});
      const shift=amount=>{try{state.month=root.utils.calendar.shiftMonth(state.month,amount);paint();}catch(_){}};
      month.addEventListener('change',()=>{if(month.value&&month.checkValidity()){state.month=month.value;paint();}else month.reportValidity();});
      header.append(ui.button(t('q.previousMonth'),()=>shift(-1),true),label('month',month),ui.button(t('q.nextMonth'),()=>shift(1),true));
      const days=el('div',{class:'calendar-days'},['mon','tue','wed','thu','fri','sat','sun'].map(key=>el('div',{class:'calendar-weekday'},t('q.day.'+key))),grid.cells.map(cell=>{
        if(!cell.date)return el('div',{class:'calendar-day outside'});
        const matches=rows.filter(row=>row.dueDate===cell.date);
        return el('section',{class:'calendar-day'+(cell.inMonth?'':' outside')+(cell.date===today?' today':''),'aria-label':date(ctx,cell.date)},el('h3',{},cell.date.slice(8)+(cell.date===today?' · '+t('q.today'):'')),matches.slice(0,3).map(task=>ui.button((task.dueLocalTime?task.dueLocalTime+' ':'')+task.title,()=>detail(ctx,task),true)),
          matches.length>3?ui.button(t('q.moreTasks',{count:matches.length}),()=>{const modal=ui.dialog(date(ctx,cell.date),el('div',{class:'stack'},matches.map(task=>ui.button(task.title,()=>{modal.close();detail(ctx,task);},true))),{wide:true});},true):null);
      }));
      return el('div',{class:'stack'},header,el('p',{class:'muted'},t('q.calendarHelp')),el('div',{class:'calendar-scroll',tabindex:0,'aria-label':t('q.calendar')},days));
    }
    function paint(){if(state.from&&state.to&&state.to<state.from){results.replaceChildren(el('p',{role:'alert'},t('p.periodError')));return;}const rows=filtered();results.replaceChildren(state.mode==='calendar'?calendar(rows):list(rows));}
    const changed=key=>event=>{state[key]=event.target.value;state.page=1;paint();};
    let searchTimer;
    const search=el('input',{type:'search',value:state.search,maxlength:200,on:{input:()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{if(search.isConnected){state.search=search.value;state.page=1;paint();}},180);}}});filterArea.append(label('search',search));
    const optionGroups={status:[['open',t('q.openTasks')],['',t('q.all')],...root.domain.enums.taskStatus.map(value=>[value,t('a.task.'+value)])],priority:[['',t('q.all')],...root.domain.enums.priority.map(value=>[value,t('q.priority.'+value)])],
      typeId:[['',t('q.all')],...tables.catalogOptions.filter(row=>row.kind==='task_type').map(row=>[row.id,root.services.catalogs.label(row)])],
      ...(!animal?{animalId:[['',t('q.all')],...tables.animals.map(row=>[row.id,row.code+' · '+row.name])]}:{}),
      responsibleVolunteerId:[['',t('q.all')],...tables.volunteerProfiles.map(row=>[row.id,root.services.contacts.resolve(tables,row.contactId)?.name||t('ui.unknown')])],mode:[['list',t('q.list')],['calendar',t('q.calendar')]]};
    for(const[key,options]of Object.entries(optionGroups)){const select=el('select',{on:{change:changed(key)}},options.map(([value,text])=>el('option',{value},text)));select.value=state[key];filterArea.append(label(key,select));}
    for(const key of['from','to'])filterArea.append(label(key,el('input',{type:'date',value:state[key],on:{change:changed(key)}})));
    const create=ui.button(t('q.new'),()=>editor(ctx,{animal}));create.disabled=!root.services.context.status().canWrite||animal&&!active(animal);
    panel.append(el('h2',{},t('nav.tasks')),el('p',{class:'muted'},t('q.help')),create,filterArea,results);paint();return panel;
  }
  root.modules.tasks=Object.freeze({render,editor,detail,clinical});
}(window.RescueManager));
