(function(root){
  'use strict';const ui=root.components.ui,el=ui.el,t=(...args)=>root.core.i18n.t(...args),view={query:'',includeInactive:false};
  function render(ctx){
    const results=el('div',{class:'stack','aria-live':'polite'}),search=el('input',{type:'search',maxlength:200,value:view.query,id:'global-search',autocomplete:'off'}),inactive=el('input',{type:'checkbox',id:'global-inactive'});inactive.checked=view.includeInactive;let timer;
    const status=row=>t(row.deletedAt?'p.trash':row.archivedAt?'p.archived':'p.active');
    function paint(){view.query=search.value;view.includeInactive=inactive.checked;const groups=root.services.search.search(ctx.snapshot.tables,view.query,{includeInactive:view.includeInactive});results.replaceChildren();
      if(!view.query.trim()){results.append(el('p',{class:'muted'},t('gs.start')));return;}
      for(const kind of['animals','contacts']){const section=el('section',{class:'card stack'},el('h2',{},t('table.'+kind)),el('p',{},t('gs.count',{count:groups[kind].total}))),area=el('div');let offset=0;
        const previous=ui.button(t('a.previous'),()=>{offset-=20;page();},true),next=ui.button(t('a.next'),()=>{offset+=20;page();},true);
        function page(){const found=root.services.search.search(ctx.snapshot.tables,view.query,{includeInactive:view.includeInactive,offset,limit:20})[kind];previous.disabled=offset===0;next.disabled=offset+20>=found.total;
          const rows = found.rows.map(row => {
            const link = kind === 'animals' ? el('a', {href:'#animals/'+row.id}, row.name+' ('+row.code+')')
              : ui.button(row.name, () => root.modules.people.openContact(row.id, {context:ctx}), true);
            const identifiers = kind === 'animals' ? row.microchipOriginal || t('ui.unknown')
              : [row.email, ...row.phones.map(item => item.original)].filter(Boolean).join(' · ');
            return el('li', {}, link, el('p', {class:'muted'}, status(row)+' · '+identifiers));
          });
          area.replaceChildren(rows.length ? el('ul', {class:'stack'}, rows) : el('p', {}, t('gs.empty')));
        }
        page();section.append(area,el('div',{class:'actions pager'},previous,next));results.append(section);}
    }
    search.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>{if(search.isConnected)paint();},180);});inactive.addEventListener('change',paint);
    const clear=ui.button(t('p.clear'),()=>{search.value='';inactive.checked=false;paint();search.focus();},true);paint();
    return [el('header',{class:'page-heading'},el('div',{},el('h1',{},t('nav.search')),el('p',{class:'muted'},t('gs.help')))),el('section',{class:'card stack'},el('label',{for:'global-search'},t('gs.query')),search,el('label',{for:'global-inactive'},inactive,t('gs.includeInactive')),clear),results];
  }
  root.modules.search=Object.freeze({render});
}(window.RescueManager));
