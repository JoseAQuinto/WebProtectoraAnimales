(function(root){
  'use strict';
  const ui=root.components.ui,el=ui.el,t=(...args)=>root.core.i18n.t(...args);
  const fresh=()=>({search:'',species:[],sex:[],breed:[],status:[],availability:[],location:[],place:[],foster:[],adopter:[],entryFrom:'',entryTo:'',adoptionFrom:'',adoptionTo:'',pastFosters:false,mode:'active',sort:'name',page:1}),view=fresh();let timer=null;
  // Filters shown directly; the rest live under "More filters". Values of one filter widen the search, different filters narrow it (see animalQueries).
  const main=['search','species','status','availability','location'];
  function dispose(){clearTimeout(timer);}
  function render(ctx,options){
    const tables=ctx.snapshot.tables,size=tables.organizationSettings[0].displayPreferences.pageSize,controls=new Map(),filters=el('div',{class:'filter-grid'}),results=el('div'),chips=el('div',{class:'filter-chips'}),count=el('p',{class:'result-count',role:'status'}),errors=el('p',{role:'alert',class:'form-errors'});
    const catalog=id=>{const row=tables.catalogOptions.find(item=>item.id===id);return row?root.services.catalogs.label(row):t('ui.unknown');};
    const update=(key,value)=>{view[key]=value;view.page=1;if(key==='search'){clearTimeout(timer);timer=setTimeout(()=>{if(results.isConnected)paint();},180);}else paint();};
    function field(key,label,input){input.id='animal-filter-'+key;if(input.type==='checkbox')input.checked=view[key];else input.value=view[key];
      controls.set(key,{input,label,multiple:false});const container=input.type==='checkbox'?el('div',{class:'field field-check'},input,el('label',{for:input.id},t(label))):el('div',{class:'field'},el('label',{for:input.id},t(label)),input);
      filters.append(container);input.addEventListener(key==='search'?'input':'change',()=>update(key,input.type==='checkbox'?input.checked:input.value));return container;}
    function multiple(key,label,entries){const container=ui.choices({id:'animal-filter-'+key,label:t(label),items:entries,selected:view[key],onChange:values=>update(key,values)});
      controls.set(key,{input:container,label,multiple:true,entries:new Map(entries)});filters.append(container);return container;}
    const select=entries=>el('select',{},entries.map(([value,label])=>el('option',{value},label)));
    const byLabel=(a,b)=>a[1].localeCompare(b[1],root.core.i18n.language);
    field('search','a.search',el('input',{type:'search',maxlength:200,placeholder:t('aq.searchPlaceholder')}));
    for(const[key,label,entries]of[
      ['species','a.species',tables.catalogOptions.filter(row=>row.kind==='species').sort((a,b)=>a.sortOrder-b.sortOrder).map(row=>[row.id,root.services.catalogs.label(row)])],
      ['status','a.status',root.domain.enums.managementStatus.map(value=>[value,t('a.status.'+value)])],
      ['availability','a.availability',root.domain.enums.adoptionAvailability.map(value=>[value,t('a.availability.'+value)])],
      ['location','a.location',root.domain.enums.locationKind.map(value=>[value,t('a.location.'+value)]).concat([['',t('ui.unknown')]])],
      ['sex','a.sex',root.domain.enums.sex.map(value=>[value,t('a.sex.'+value)])],
      ['breed','a.breed',(()=>{const breeds=new Map([['',t('ui.unknown')]]);for(const row of tables.animals){const value=root.utils.strings.normalizeSearch(row.breed||'');if(!breeds.has(value))breeds.set(value,row.breed);}return[...breeds].sort(byLabel);})()],
      ['place','aq.place',tables.locations.map(row=>[row.id,row.name]).sort(byLabel)],
      ['foster','aq.family',tables.fosterProfiles.map(row=>[row.id,root.services.contacts.resolve(tables,row.contactId)?.name||t('ui.unknown')]).sort(byLabel)],
      ['adopter','aq.adopter',(()=>{const people=new Map();for(const row of tables.adoptions){const contact=root.services.contacts.resolve(tables,row.adopterContactId);if(contact)people.set(contact.id,contact.name);}return[...people].sort(byLabel);})()]
    ])multiple(key,label,entries);
    field('pastFosters','aq.pastFosters',el('input',{type:'checkbox'}));
    for(const key of['entryFrom','entryTo','adoptionFrom','adoptionTo'])field(key,'aq.'+key,el('input',{type:'date'}));
    field('mode','a.mode',select(['active','all','trash'].map(value=>[value,t('aq.mode.'+value)])));field('sort','a.sort',select(['name','code','createdAt'].map(value=>[value,t('a.'+value)])));
    const advancedFilters=el('div',{class:'filter-grid'}),advanced=el('details',{class:'animal-advanced-filters'},el('summary',{},t('aq.advanced')),advancedFilters,el('p',{class:'muted'},t('aq.periodHelp')));
    for(const[key,item]of controls)if(!main.includes(key)){advancedFilters.append(item.input.closest('.field'));if(item.multiple?view[key].length:key==='mode'?view[key]!=='active':key==='sort'?view[key]!=='name':!!view[key])advanced.open=true;}
    function sync(){for(const[key,item]of controls){if(item.multiple)item.input.setValues(view[key]);else if(item.input.type==='checkbox')item.input.checked=view[key];else item.input.value=view[key];}}
    function describe(key,item,value){if(item.multiple)return item.entries.get(value)??value;if(item.input.options)return[...item.input.options].find(option=>option.value===value)?.textContent||value;if(typeof value==='boolean')return t('common.yes');return item.input.type==='date'?root.utils.dates.display(value,tables.organizationSettings[0].dateFormat):value;}
    function selected(){const list=el('div',{class:'chip-list'});let total=0;for(const[key,item]of controls){if(key==='sort'||key==='mode'&&view[key]==='active'||key==='pastFosters'&&!view[key])continue;
        const values=item.multiple?view[key]:view[key]?[view[key]]:[];for(const value of values){total++;const text=t(item.label)+': '+describe(key,item,value),remove=el('button',{type:'button',class:'chip',on:{click:()=>{view[key]=item.multiple?view[key].filter(entry=>entry!==value):key==='pastFosters'?false:key==='mode'?'active':'';view.page=1;sync();paint();}}},el('span',{},text),el('span',{class:'chip-remove','aria-hidden':'true'},'×'));remove.setAttribute('aria-label',t('aq.remove',{label:text}));list.append(remove);}}
      clear.hidden=!total;chips.hidden=!total;chips.replaceChildren(el('span',{class:'chip-title'},t('aq.active',{count:total})),list,clear);}
    function paint(){
      options.dispose();selected();let rows;try{rows=root.services.animalQueries.list(tables,view,root.core.i18n.language);errors.textContent='';}catch(_){errors.textContent=t('aq.periodError');count.textContent='';results.replaceChildren();return;}
      const pages=Math.max(1,Math.ceil(rows.length/size));view.page=Math.min(view.page,pages);const chosen=rows.slice((view.page-1)*size,view.page*size);count.textContent=t('aq.count',{count:rows.length});
      const previous=ui.button(t('a.previous'),()=>{view.page--;paint();},true),next=ui.button(t('a.next'),()=>{view.page++;paint();},true);previous.disabled=view.page<=1;next.disabled=view.page>=pages;
      let records=el('div',{class:'empty-state'},el('p',{},t(tables.animals.length?'aq.noMatches':'aq.noAnimals')));
      if(chosen.length&&tables.organizationSettings[0].displayPreferences.animalView==='cards')records=el('div',{class:'animal-cards'},chosen.map(row=>el('article',{class:'card stack'},options.image(row),el('h2',{},el('a',{href:'#animals/'+row.id},row.name)),el('p',{class:'eyebrow'},row.code),el('p',{},catalog(row.speciesId)+' · '+t('a.status.'+row.managementStatus)),el('p',{},t('a.availability.'+row.adoptionAvailability)),el('p',{},options.where(row)))));
      else if(chosen.length)records=el('div',{class:'table-wrap'},el('table',{class:'responsive-table'},el('thead',{},el('tr',{},['a.photo','a.name','a.code','a.species','a.state','a.location','a.actions'].map(key=>el('th',{scope:'col'},t(key))))),el('tbody',{},chosen.map(row=>el('tr',{},el('td',{},options.image(row)),el('th',{scope:'row'},el('a',{href:'#animals/'+row.id},row.name)),el('td',{},row.code),el('td',{},catalog(row.speciesId)),el('td',{},t('a.status.'+row.managementStatus)),el('td',{},options.where(row)),el('td',{},el('a',{class:'button secondary',href:'#animals/'+row.id,'aria-label':t('a.openNamed',{name:row.name})},t('a.open'))))))));
      results.replaceChildren(...[records,pages>1?el('div',{class:'actions pager'},previous,el('span',{},t('a.page',{page:view.page,pages,count:rows.length})),next):null].filter(Boolean));
    }
    const clear=ui.button(t('p.clear'),()=>{Object.assign(view,fresh());sync();paint();},true),create=ui.button(t('a.new'),options.create);create.disabled=!ctx.canWrite();paint();
    return[el('header',{class:'page-heading'},el('div',{},el('h1',{},t('nav.animals')),el('p',{class:'muted'},t('a.help'))),create),el('section',{class:'card stack filter-card','aria-label':t('aq.filters')},el('p',{class:'muted'},t('aq.help')),filters,advanced,chips,errors),el('section',{class:'stack'},count,results)];
  }
  root.modules.animalList=Object.freeze({render,dispose});
}(window.RescueManager));
