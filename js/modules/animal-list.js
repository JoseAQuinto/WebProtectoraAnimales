(function(root){
  'use strict';
  const ui=root.components.ui,el=ui.el,t=(...args)=>root.core.i18n.t(...args);
  const fresh=()=>({search:'',species:[],sex:[],breed:[],status:[],availability:[],location:[],place:[],foster:[],adopter:[],entryFrom:'',entryTo:'',adoptionFrom:'',adoptionTo:'',pastFosters:false,mode:'active',sort:'name',page:1}),view=fresh();let timer=null;
  function dispose(){clearTimeout(timer);}
  function render(ctx,options){
    const tables=ctx.snapshot.tables,size=tables.organizationSettings[0].displayPreferences.pageSize,controls=new Map(),filters=el('div',{class:'people-filters'}),results=el('div'),chips=el('div',{class:'actions filter-chips'}),errors=el('p',{role:'alert',class:'form-errors'});
    const catalog=id=>{const row=tables.catalogOptions.find(item=>item.id===id);return row?root.services.catalogs.label(row):t('ui.unknown');};
    function field(key,label,input,multiple=false){input.id='animal-filter-'+key;if(multiple){input.multiple=true;input.size=4;for(const option of input.options)option.selected=view[key].includes(option.value);}else if(input.type==='checkbox')input.checked=view[key];else input.value=view[key];
      controls.set(key,{input,label,multiple});const container=el('div',{class:'field'},el('label',{for:input.id},t(label)),input);filters.append(container);input.addEventListener(key==='search'?'input':'change',()=>{view[key]=multiple?[...input.selectedOptions].map(option=>option.value):input.type==='checkbox'?input.checked:input.value;view.page=1;if(key==='search'){clearTimeout(timer);timer=setTimeout(()=>{if(results.isConnected)paint();},180);}else paint();});return container;}
    const select=entries=>el('select',{},entries.map(([value,label])=>el('option',{value},label)));
    field('search','a.search',el('input',{type:'search',maxlength:200}));
    for(const[key,label,entries]of[
      ['species','a.species',tables.catalogOptions.filter(row=>row.kind==='species').sort((a,b)=>a.sortOrder-b.sortOrder).map(row=>[row.id,root.services.catalogs.label(row)])],
      ['sex','a.sex',root.domain.enums.sex.map(value=>[value,t('a.sex.'+value)])],
      ['breed','a.breed',(()=>{const breeds=new Map([['',t('ui.unknown')]]);for(const row of tables.animals){const value=root.utils.strings.normalizeSearch(row.breed||'');if(!breeds.has(value))breeds.set(value,row.breed);}return[...breeds].sort((a,b)=>a[1].localeCompare(b[1]));})()],
      ['status','a.status',root.domain.enums.managementStatus.map(value=>[value,t('a.status.'+value)])],
      ['availability','a.availability',root.domain.enums.adoptionAvailability.map(value=>[value,t('a.availability.'+value)])],
      ['location','a.location',root.domain.enums.locationKind.map(value=>[value,t('a.location.'+value)]).concat([['',t('ui.unknown')]])],
      ['place','aq.place',tables.locations.map(row=>[row.id,row.name])],
      ['foster','aq.family',tables.fosterProfiles.map(row=>[row.id,root.services.contacts.resolve(tables,row.contactId)?.name||t('ui.unknown')])],
      ['adopter','aq.adopter',(()=>{const people=new Map();for(const row of tables.adoptions){const contact=root.services.contacts.resolve(tables,row.adopterContactId);if(contact)people.set(contact.id,contact.name);}return[...people].sort((a,b)=>a[1].localeCompare(b[1]));})()]
    ])field(key,label,select(entries),true);
    for(const key of['entryFrom','entryTo','adoptionFrom','adoptionTo'])field(key,'aq.'+key,el('input',{type:'date'}));
    field('pastFosters','aq.pastFosters',el('input',{type:'checkbox'}));field('mode','a.mode',select(['active','all','trash'].map(value=>[value,t('a.'+value)])));field('sort','a.sort',select(['name','code','createdAt'].map(value=>[value,t('a.'+value)])));
    const advancedFilters=el('div',{class:'people-filters'}),advanced=el('details',{class:'animal-advanced-filters'},el('summary',{},t('aq.advanced')),advancedFilters);
    for(const[key,item]of controls)if(!['search','species','status','availability','location'].includes(key)){advancedFilters.append(item.input.closest('.field'));if(item.multiple?view[key].length:key==='mode'?view[key]!=='active':key==='sort'?view[key]!=='name':!!view[key])advanced.open=true;}
    function sync(){for(const[key,item]of controls){if(item.multiple)for(const option of item.input.options)option.selected=view[key].includes(option.value);else if(item.input.type==='checkbox')item.input.checked=view[key];else item.input.value=view[key];}}
    function selected(){chips.replaceChildren();let count=0;for(const[key,item]of controls){if(key==='sort'||key==='mode'&&view[key]==='active'||key==='pastFosters'&&!view[key])continue;
        const values=item.multiple?view[key]:view[key]?[view[key]]:[];for(const value of values){count++;const text=t(item.label)+': '+(item.input.options?[...item.input.options].find(option=>option.value===value)?.textContent||value:typeof value==='boolean'?t('common.yes'):value),remove=ui.button(text+' ×',()=>{view[key]=item.multiple?view[key].filter(item=>item!==value):key==='pastFosters'?false:key==='mode'?'active':'';view.page=1;sync();paint();},true);remove.setAttribute('aria-label',t('aq.remove',{label:text}));chips.append(remove);}}
      chips.prepend(el('span',{class:'muted'},t('aq.active',{count})));}
    function paint(){
      options.dispose();selected();let rows;try{rows=root.services.animalQueries.list(tables,view,root.core.i18n.language);errors.textContent='';}catch(_){errors.textContent=t('aq.periodError');results.replaceChildren();return;}
      const pages=Math.max(1,Math.ceil(rows.length/size));view.page=Math.min(view.page,pages);const chosen=rows.slice((view.page-1)*size,view.page*size);
      const previous=ui.button(t('a.previous'),()=>{view.page--;paint();},true),next=ui.button(t('a.next'),()=>{view.page++;paint();},true);previous.disabled=view.page<=1;next.disabled=view.page>=pages;
      let records=el('p',{class:'muted'},t('aq.noMatches'));
      if(chosen.length&&tables.organizationSettings[0].displayPreferences.animalView==='cards')records=el('div',{class:'animal-cards'},chosen.map(row=>el('article',{class:'card stack'},options.image(row),el('h2',{},el('a',{href:'#animals/'+row.id},row.name)),el('p',{class:'eyebrow'},row.code),el('p',{},catalog(row.speciesId)+' · '+t('a.status.'+row.managementStatus)),el('p',{},t('a.availability.'+row.adoptionAvailability)),el('p',{},options.where(row)))));
      else if(chosen.length)records=el('div',{class:'table-wrap'},el('table',{},el('thead',{},el('tr',{},['a.photo','a.code','a.name','a.species','a.state','a.location','a.actions'].map(key=>el('th',{scope:'col'},t(key))))),el('tbody',{},chosen.map(row=>el('tr',{},el('td',{},options.image(row)),el('td',{},row.code),el('th',{scope:'row'},row.name),el('td',{},catalog(row.speciesId)),el('td',{},t('a.status.'+row.managementStatus)),el('td',{},options.where(row)),el('td',{},el('a',{class:'button secondary',href:'#animals/'+row.id},t('a.open'))))))));
      results.replaceChildren(records,el('div',{class:'actions'},previous,el('span',{},t('a.page',{page:view.page,pages,count:rows.length})),next));
    }
    const clear=ui.button(t('p.clear'),()=>{Object.assign(view,fresh());sync();paint();},true),create=ui.button(t('a.new'),options.create);create.disabled=!ctx.canWrite();paint();
    return[el('header',{class:'page-heading'},el('div',{},el('h1',{},t('nav.animals')),el('p',{class:'muted'},t('a.help'))),create),el('section',{class:'card stack'},el('p',{class:'muted'},t('aq.help')),filters,advanced,el('p',{class:'muted'},t('aq.periodHelp')),clear,chips,errors,results)];
  }
  root.modules.animalList=Object.freeze({render,dispose});
}(window.RescueManager));
