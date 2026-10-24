(function(root){
  'use strict';
  const ui=root.components.ui,el=ui.el,t=(...args)=>root.core.i18n.t(...args),service=root.services.exports,definitions=root.services.exportDefinitions.definitions;
  const view={kind:'animals',scope:'filtered',search:'',status:'',from:'',to:'',animalId:'',contactId:'',visibility:'active',page:1};
  function render(ctx){
    const output=el('div',{class:'stack'}),filters=el('div',{class:'people-filters'}),fields=new Map();let selection=null,timer;
    function field(key,label,input){input.id='export-'+key;input.value=view[key];const wrapper=el('div',{class:'field'},el('label',{for:input.id},t(label)),input);fields.set(key,{input,wrapper});filters.append(wrapper);input.addEventListener(key==='search'?'input':'change',()=>{view[key]=input.value;view.page=1;if(key==='kind'){view.status=view.animalId=view.contactId=view.from=view.to='';for(const name of['status','animalId','contactId','from','to'])fields.get(name).input.value='';configure();}if(key==='scope')configure();if(key==='search'){clearTimeout(timer);timer=setTimeout(()=>{if(output.isConnected)paint();},180);}else paint();});return input;}
    field('kind','ex.module',el('select',{},Object.keys(definitions).map(value=>el('option',{value},t('ex.module.'+value)))));
    field('scope','ex.scope',el('select',{},['filtered','all'].map(value=>el('option',{value},t('ex.scope.'+value)))));
    field('search','ex.search',el('input',{type:'search',maxlength:200}));field('status','a.state',el('select'));
    field('from','p.from',el('input',{type:'date'}));field('to','p.to',el('input',{type:'date'}));
    field('animalId','ag.animal',el('select',{},el('option',{value:''},t('p.all')),ctx.snapshot.tables.animals.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(row=>el('option',{value:row.id},row.name+' ('+row.code+')'))));
    field('contactId','a.contact',el('select',{},el('option',{value:''},t('p.all')),ctx.snapshot.tables.contacts.filter(row=>!row.mergedIntoContactId).slice().sort((a,b)=>a.name.localeCompare(b.name)).map(row=>el('option',{value:row.id},row.name))));
    field('visibility','ag.visibility',el('select',{},['active','all','trash'].map(value=>el('option',{value},t('ag.visibility.'+value)))));
    function configure(){
      const def=service.definition(view.kind),all=view.scope==='all';for(const[key,item]of fields)if(!['kind','scope'].includes(key))item.wrapper.hidden=all||(key==='from'||key==='to')&&!def.date||key==='status'&&!def.statuses||key==='animalId'&&!def.animal||key==='contactId'&&!def.contact;
      const status=fields.get('status').input;status.replaceChildren(el('option',{value:''},t('p.all')),...(def.statuses||[]).map(value=>el('option',{value},t('ex.status.'+value))));status.value=view.status;
    }
    function download(){
      if(!selection)return;const snapshot=ctx.snapshot,capture=service.select(snapshot,view.kind,view,view.scope);
      const dialog=ui.form(t('ex.download'),[{key:'format',labelKey:'ex.format',required:true,options:[{value:'csv',label:'CSV'},{value:'json',label:'JSON'}]},
        {key:'delimiter',labelKey:'rp.separator',required:true,options:[{value:',',label:t('rp.comma')},{value:';',label:t('rp.semicolon')}]},{key:'bom',labelKey:'rp.excel',type:'checkbox'},
        {key:'confirmed',labelKey:'ex.confirm',type:'checkbox',required:true}],{format:'csv',delimiter:root.core.i18n.language==='es'?';':',',bom:true},async input=>{
        if(!input.confirmed)throw new root.core.errors.AppError('ex.confirm');
        const org=snapshot.tables.organizationSettings[0],today=root.utils.dates.today(org.timeZone);let content;
        if(input.format==='csv'){const table=service.table(capture);content=root.utils.tabular.csv(table.headers.map(key=>t('ex.column.'+key)),table.rows,{delimiter:input.delimiter,bom:input.bom});}
        else content=root.utils.canonicalJson.stringify(service.container(snapshot,capture));
        const blob=new Blob([content],{type:input.format==='csv'?'text/csv;charset=utf-8':'application/json'});if(blob.size>root.config.limits.backupBytes)throw new RangeError('Module export exceeds 128 MiB');
        ui.download(blob,'rescue-manager-'+capture.kind+'-'+capture.scope+'-'+today+'.'+input.format);
      });
      dialog.querySelector('h2').after(el('p',{class:'notice'},t('ex.review',{module:t('ex.module.'+capture.kind),scope:t('ex.scope.'+capture.scope),count:capture.rows.length,revision:snapshot.globalRevision})),el('p',{class:'muted'},t('ex.filesHelp')));
      const format=dialog.querySelector('[name=format]');function paintFormat(){for(const key of['delimiter','bom'])dialog.querySelector('[name='+key+']').closest('.field').hidden=format.value!=='csv';}format.addEventListener('change',paintFormat);paintFormat();
    }
    const save=ui.button(t('ex.download'),download);
    function paint(){
      try{selection=service.select(ctx.snapshot,view.kind,view,view.scope);save.disabled=false;}
      catch(_){selection=null;save.disabled=true;output.replaceChildren(el('p',{role:'alert'},t('ex.filterError')));return;}
      const pages=Math.max(1,Math.ceil(selection.rows.length/20));view.page=Math.min(view.page,pages);
      const previous=ui.button(t('a.previous'),()=>{view.page--;paint();},true),next=ui.button(t('a.next'),()=>{view.page++;paint();},true);previous.disabled=view.page<=1;next.disabled=view.page>=pages;
      const rows=selection.rows.slice((view.page-1)*20,view.page*20).map(item=>el('tr',{},el('th',{scope:'row'},item.name||t('ui.unknown')),el('td',{},item.date||t('ui.unknown')),el('td',{},item.status?t('ex.status.'+item.status):t('ui.unknown')),el('td',{class:'preserve-lines'},item.notes)));
      output.replaceChildren(...[el('p',{class:'notice'},t('ex.selected',{count:selection.rows.length,scope:t('ex.scope.'+view.scope)})),definitions[view.kind].date?el('p',{class:'muted'},t('ex.date.'+view.kind)):null,
        rows.length?el('div',{class:'table-wrap'},el('table',{},el('thead',{},el('tr',{},['ex.column.name','a.date','a.state','a.notes'].map(key=>el('th',{scope:'col'},t(key))))),el('tbody',{},rows))):el('p',{},t('ex.empty')),el('div',{class:'actions pager'},previous,el('span',{},t('ui.recordPage',{page:view.page,pages,count:selection.rows.length})),next)].filter(Boolean));
    }
    const clear=ui.button(t('p.clear'),()=>{for(const key of['search','status','from','to','animalId','contactId']){view[key]='';fields.get(key).input.value='';}view.visibility='active';fields.get('visibility').input.value='active';view.page=1;paint();},true);configure();paint();
    return[el('header',{class:'page-heading'},el('h1',{},t('nav.exports'))),el('section',{class:'card stack'},el('p',{class:'muted'},t('ex.help')),filters,el('div',{class:'actions'},save,clear),el('p',{class:'muted'},t('ex.csvHelp')),el('a',{href:'#backup'},t('ui.createBackup'))),el('section',{class:'card stack'},output)];
  }
  root.modules.exports=Object.freeze({render});
}(window.RescueManager));
