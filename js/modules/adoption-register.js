(function(root){
  'use strict';
  const ui=root.components.ui,el=ui.el,t=(...args)=>root.core.i18n.t(...args);
  const views=Object.freeze({application:'aw.applications',reservation:'aw.reservations',adoption:'aw.adoptions'});
  const state={kind:'application',search:'',status:'',animalId:'',contactId:'',from:'',to:'',mode:'active',page:1};
  let detailDialog=null;
  function dispose(){if(detailDialog?.open)detailDialog.close();detailDialog=null;}
  function open(ctx,item){
    if(!item.animal)return ui.dialog(t('ag.open'),el('p',{},t('a.notFound')));
    dispose();
    const focused={...ctx,get snapshot(){return ctx.snapshot;},refresh:async()=>{dispose();await ctx.refresh();}};
    const animalLink=el('a',{href:'#animals/'+item.animal.id+'/adoption'},item.animal.code+' · '+item.animal.name);
    animalLink.addEventListener('click',dispose);
    detailDialog=ui.dialog(t(views[state.kind]),[animalLink,root.modules.adoptionWorkflow.render(focused,item.animal,{type:state.kind,id:item.row.id})],{wide:true});
  }
  function newApplication(ctx){
    const animals=ctx.snapshot.tables.animals.filter(row=>!row.archivedAt&&!row.deletedAt&&row.managementStatus==='under_care').sort((a,b)=>a.name.localeCompare(b.name));
    const select=el('select',{id:'application-animal'},el('option',{value:''},t('aw.choose')),animals.map(row=>el('option',{value:row.id},row.code+' · '+row.name)));
    let chooser;const next=ui.button(t('ag.continue'),()=>{const animal=animals.find(row=>row.id===select.value);if(animal){chooser.close();root.modules.adoptionForms.application(ctx,animal);}});
    next.disabled=true;select.addEventListener('change',()=>{next.disabled=!select.value;});
    chooser=ui.dialog(t('aw.new'),[el('p',{},t(animals.length?'ag.chooseAnimal':'ag.noAnimals')),el('label',{for:'application-animal'},t('a.name')),select,next]);
  }
  function render(ctx){
    const tables=ctx.snapshot.tables,area=el('div',{class:'stack'}),tabs=el('div',{class:'tabs'}),filters=el('div',{class:'people-filters'});
    const writable=()=>typeof ctx.canWrite==='function'?ctx.canWrite():root.services.context.status().canWrite;
    const date=value=>{const format=tables.organizationSettings[0].dateFormat;return !value?t('aw.notSpecified'):format==='day_first'?value.slice(8)+'/'+value.slice(5,7)+'/'+value.slice(0,4):format==='month_first'?value.slice(5,7)+'/'+value.slice(8)+'/'+value.slice(0,4):value;};
    const control=(key,label,input)=>{input.id='adoption-register-'+key;input.value=state[key];filters.append(el('div',{class:'field'},el('label',{for:input.id},t(label)),input));input.addEventListener(key==='search'?'input':'change',()=>{state[key]=input.value;state.page=1;if(key==='search'){clearTimeout(timer);timer=setTimeout(()=>{if(area.isConnected)paint();},180);}else paint();});return input;};
    let timer;
    const search=control('search','ag.search',el('input',{type:'search',maxlength:200}));
    const status=control('status','a.state',el('select'));
    const animalSelect=control('animalId','ag.animal',el('select',{},el('option',{value:''},t('p.all')),tables.animals.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(row=>el('option',{value:row.id},row.code+' · '+row.name))));
    const contactSelect=control('contactId','a.contact',el('select',{},el('option',{value:''},t('p.all')),tables.contacts.filter(row=>!row.mergedIntoContactId).slice().sort((a,b)=>a.name.localeCompare(b.name)).map(row=>el('option',{value:row.id},row.name))));
    const from=control('from','p.from',el('input',{type:'date'})),to=control('to','p.to',el('input',{type:'date'}));
    const mode=control('mode','ag.visibility',el('select',{},['active','all','trash'].map(value=>el('option',{value},t('ag.visibility.'+value)))));
    function statuses(){const values=state.kind==='application'?root.domain.enums.applicationStatus:state.kind==='reservation'?root.domain.enums.reservationStatus:['active','returned'];
      status.replaceChildren(el('option',{value:''},t('p.all')), ...values.map(value=>el('option',{value},t((state.kind==='application'?'a.application.':state.kind==='reservation'?'aw.reservationStatus.':'ag.adoption.')+value))));status.value=state.status;
      for(const tab of tabs.children)tab.setAttribute('aria-pressed',String(tab.dataset.kind===state.kind));}
    for(const[kind,label]of Object.entries(views)){const tab=ui.button(t(label),()=>{state.kind=kind;state.status='';state.page=1;statuses();paint();},true);tab.dataset.kind=kind;tabs.append(tab);}statuses();
    function paint(){
      let found;try{found=root.services.adoptionQueries.query(ctx.snapshot.tables,state.kind,{...state,offset:(state.page-1)*20});}
      catch(_){area.replaceChildren(el('p',{role:'alert'},t('p.periodError')));return;}
      const pages=Math.max(1,Math.ceil(found.total/20));if(state.page>pages){state.page=pages;paint();return;}
      const previous=ui.button(t('a.previous'),()=>{state.page--;paint();},true),next=ui.button(t('a.next'),()=>{state.page++;paint();},true);previous.disabled=state.page<=1;next.disabled=state.page>=pages;
      const rows=found.rows.map(item=>{
        const animal=item.animal?el('a',{href:'#animals/'+item.animal.id+'/adoption'},item.animal.code+' · '+item.animal.name):t('ui.unknown');
        const contact=item.contact?ui.button(item.contact.name,()=>root.modules.people.openContact(item.contact.id,{context:ctx}),true):t('ui.unknown');
        const statusKey=(state.kind==='application'?'a.application.':state.kind==='reservation'?'aw.reservationStatus.':'ag.adoption.')+item.status;
        return el('tr',{},el('td',{},date(item.date)),el('th',{scope:'row'},animal),el('td',{},contact),el('td',{},t(statusKey)),el('td',{},state.kind==='reservation'?date(item.row.expiresOn):state.kind==='adoption'?date(item.row.returnDate):date(item.row.approvalDate)),el('td',{},ui.button(t('ag.open'),()=>open(ctx,item),true)));
      });
      const extra=state.kind==='reservation'?'aw.expiresOn':state.kind==='adoption'?'aw.returnDate':'aw.approvalDate';
      area.replaceChildren(el('h2',{},t(views[state.kind])),el('p',{class:'muted'},t('ag.periodHelp.'+state.kind)),rows.length?el('div',{class:'table-wrap'},el('table',{},el('thead',{},el('tr',{},['a.date','ag.animal','a.contact','a.state',extra,'a.actions'].map(key=>el('th',{scope:'col'},t(key))))),el('tbody',{},rows))):el('p',{},t('aw.empty')),el('div',{class:'actions'},previous,el('span',{},t('a.page',{page:state.page,pages,count:found.total})),next));
    }
    const clear=ui.button(t('p.clear'),()=>{for(const key of['search','status','animalId','contactId','from','to'])state[key]='';state.mode='active';state.page=1;search.value=status.value=animalSelect.value=contactSelect.value=from.value=to.value='';mode.value='active';paint();},true);
    const create=ui.button(t('aw.new'),()=>newApplication(ctx));create.disabled=!writable();paint();
    return[el('header',{class:'page-heading'},el('div',{},el('h1',{},t('nav.adoptions')),el('p',{class:'muted'},t('ag.help'))),create),tabs,el('section',{class:'card stack'},filters,clear),el('section',{class:'card stack'},area)];
  }
  root.modules.adoptionRegister=Object.freeze({render,dispose});
}(window.RescueManager));
