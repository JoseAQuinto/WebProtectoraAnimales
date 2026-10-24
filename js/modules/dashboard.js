(function(root){
  'use strict';
  const ui=root.components.ui,el=ui.el,t=(...args)=>root.core.i18n.t(...args);let owned=null;
  function dispose(){if(owned?.open)owned.close();owned=null;}
  async function render(ctx){
    const tables=ctx.snapshot.tables,org=tables.organizationSettings[0],today=root.utils.dates.today(org.timeZone),data=root.services.dashboard.calculate(tables,today),receipts=await root.services.backup.list();
    const money=value=>root.utils.money.format(value,org.currencyCode,{locale:root.core.i18n.language}),number=value=>new Intl.NumberFormat(root.core.i18n.language).format(value),date=value=>!value?t('ui.unknown'):org.dateFormat==='day_first'?value.slice(8)+'/'+value.slice(5,7)+'/'+value.slice(0,4):org.dateFormat==='month_first'?value.slice(5,7)+'/'+value.slice(8)+'/'+value.slice(0,4):value;
    const animal=id=>tables.animals.find(row=>row.id===id),name=row=>row?row.name+' ('+row.code+')':t('ui.unknown');
    const focused={...ctx,get snapshot(){return ctx.snapshot;},refresh:async()=>{dispose();await ctx.refresh();}};
    function source(type,row){dispose();if(type==='task')owned=root.modules.tasks.detail(focused,row);else if(type==='finance')owned=root.modules.finance.detail(focused,row);else if(type==='inventory')owned=root.modules.inventory.detail(focused,row);else if(type==='adoption'){const pet=animal(row.animalId);if(pet)owned=ui.dialog(t('aw.adoptions'),root.modules.adoptionWorkflow.render(focused,pet,{type:'adoption',id:row.id}),{wide:true});}}
    function link(id,tab='info'){const row=animal(id),control=el('a',{href:'#animals/'+id+'/'+tab},name(row));control.addEventListener('click',dispose);return control;}
    function list(key){dispose();const card=data.cards[key],area=el('div',{class:'stack'});let page=1;
      function paint(){const pages=Math.max(1,Math.ceil(card.rows.length/20)),previous=ui.button(t('a.previous'),()=>{page--;paint();},true),next=ui.button(t('a.next'),()=>{page++;paint();},true);previous.disabled=page<=1;next.disabled=page>=pages;
        const rows=card.rows.slice((page-1)*20,page*20).map(row=>{
          let title,when='',detail='',open;
          if(card.type==='animal'){title=link(row.id);detail=t('a.status.'+row.managementStatus)+' · '+t('a.availability.'+row.adoptionAvailability);}
          else if(card.type==='episode'){title=link(row.animalId,'history');when=date(row.entryDate);detail=t('hi.entry.'+row.entryType)+' · '+row.entryReason;}
          else if(card.type==='adoption'){title=name(animal(row.animalId));when=date(row.adoptionDate);detail=root.services.contacts.resolve(tables,row.adopterContactId)?.name||t('ui.unknown');open=ui.button(t('db.openRecord'),()=>source(card.type,row),true);}
          else if(card.type==='task'){title=row.title;when=date(row.dueDate)+(row.dueLocalTime?' · '+row.dueLocalTime+' '+row.timeZone:'');detail=name(animal(row.animalId));open=ui.button(t('db.openRecord'),()=>source(card.type,row),true);}
          else if(card.type==='finance'){title=row.concept;when=date(row.date);detail=t('f.direction.'+row.direction)+' · '+money(row.amountMinor);open=ui.button(t('db.openRecord'),()=>source(card.type,row),true);}
          else{title=row.name;detail=root.utils.quantities.format(row.quantityScaled,row.quantityPrecision,{locale:root.core.i18n.language})+' / '+root.utils.quantities.format(row.minimumStockScaled,row.quantityPrecision,{locale:root.core.i18n.language})+' · '+root.services.catalogs.label(tables.catalogOptions.find(item=>item.id===row.unitId));open=ui.button(t('db.openRecord'),()=>source(card.type,row),true);}
          return el('tr',{},el('th',{scope:'row'},title),el('td',{},when),el('td',{class:'preserve-lines'},detail),el('td',{},open));
        });
        const table=rows.length?el('div',{class:'table-wrap'},el('table',{},el('thead',{},el('tr',{},['a.title','a.date','db.details','a.actions'].map(label=>el('th',{scope:'col'},t(label))))),el('tbody',{},rows))):el('p',{},t('db.empty'));
        area.replaceChildren(table,el('div',{class:'actions pager'},previous,el('span',{},t('ui.recordPage',{page,pages,count:card.rows.length})),next));
      }paint();owned=ui.dialog(t('db.'+key),[el('p',{class:'muted'},t('db.criteria',{from:date(data.from),to:date(today),through:date(data.through)})),area],{wide:true});
    }
    // Cards grouped by topic so the page reads as "animals / tasks / money" instead of one long grid; overdue work is highlighted.
    const groups=[['nav.group.care',['care','shelter','foster','available','reserved','entries','adoptions']],['nav.tasks',['overdue','today','upcoming','veterinary','vaccines','careTasks']],['db.moneyStock',['income','expense','balance','lowStock']]];
    const grouped=new Set(groups.flatMap(([,keys])=>keys));groups[groups.length-1][1].push(...Object.keys(data.cards).filter(key=>!grouped.has(key)));
    const metric=key=>{const card=data.cards[key];if(!card)return null;const value=key==='income'?money(data.money.incomeMinor):key==='expense'?money(data.money.expenseMinor):key==='balance'?money(data.money.balanceMinor):number(card.rows.length);
      const open=ui.button(t('db.openList'),()=>list(key),true);open.setAttribute('aria-label',t('db.openList')+': '+t('db.'+key));const alert=['overdue','lowStock'].includes(key)&&card.rows.length>0;
      return el('article',{class:'card stack metric-card'+(alert?' metric-alert':''),'data-dashboard-card':key},el('h3',{},t('db.'+key)),el('p',{class:'metric-value'},value),open);};
    const metrics=groups.map(([title,keys])=>el('section',{class:'stack metric-section'},el('h2',{},t(title)),el('div',{class:'metric-grid'},keys.map(metric))));
    const month=value=>/^\d{4}-\d{2}$/.test(value)?new Intl.DateTimeFormat(root.core.i18n.language,{month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(Number(value.slice(0,4)),Number(value.slice(5,7))-1,1))):value;
    const table=(headers,rows)=>el('details',{class:'data-table'},el('summary',{},t('db.showTable')),el('div',{class:'table-wrap'},el('table',{},el('thead',{},el('tr',{},headers.map(key=>el('th',{scope:'col'},t(key))))),el('tbody',{},rows.map(row=>el('tr',{},row.map(value=>el('td',{},value))))))));
    const chart=root.modules.reports.chart,entryChart=chart(data.charts.entries,[{key:'entries',label:'rp.entries',color:'#3d6a4f'},{key:'adoptions',label:'rp.adoptions',color:'#c48b2c'}],number,'db.chartHelp'),financeChart=chart(data.charts.finances,[{key:'incomeMinor',label:'rp.income',color:'#3d6a4f'},{key:'expenseMinor',label:'rp.expense',color:'#c48b2c'}],money,'db.chartHelp');
    function speciesChart(){
      const rows=data.charts.species.slice(0,6);if(!rows.length)return el('p',{class:'muted'},t('db.empty'));
      const ns='http'+'://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 720 '+(rows.length*35+10));svg.setAttribute('class','report-chart');svg.setAttribute('aria-hidden','true');
      const max=Math.max(...rows.map(row=>row.count));rows.forEach((row,index)=>{const label=document.createElementNS(ns,'text');label.setAttribute('x','8');label.setAttribute('y',String(index*35+22));label.textContent=root.services.catalogs.label(tables.catalogOptions.find(item=>item.id===row.speciesId))+' ('+number(row.count)+')';const bar=document.createElementNS(ns,'rect');bar.setAttribute('x','170');bar.setAttribute('y',String(index*35+4));bar.setAttribute('width',String(row.count/max*530));bar.setAttribute('height','24');bar.setAttribute('fill','#3d6a4f');svg.append(label,bar);});return svg;
    }
    const latest=receipts[0],verified=receipts.find(row=>row.state==='verified'),stamp=value=>new Intl.DateTimeFormat(root.core.i18n.language,{dateStyle:'medium',timeStyle:'short',timeZone:org.timeZone}).format(new Date(value));
    return[el('header',{class:'page-heading'},el('div',{},el('h1',{},t('nav.dashboard')),el('p',{class:'muted'},t('db.criteria',{from:date(data.from),to:date(today),through:date(data.through)}))),el('a',{class:'button secondary',href:'#backup'},t('nav.backup'))),
      el('p',{class:'muted dashboard-intro'},t('db.overlap')),...metrics,el('div',{class:'dashboard-panels'},
      el('section',{class:'card stack'},el('h2',{},t('rp.entriesAdoptions.title')),entryChart,table(['rp.month','rp.entries','rp.adoptions'],data.charts.entries.map(row=>[month(row.month),row.entries,row.adoptions]))),
      el('section',{class:'card stack'},el('h2',{},t('rp.incomeExpense.title')+' · '+org.currencyCode),financeChart,table(['rp.month','rp.income','rp.expense'],data.charts.finances.map(row=>[month(row.month),money(row.incomeMinor),money(row.expenseMinor)]))),
      el('section',{class:'card stack'},el('h2',{},t('rp.species')),el('p',{class:'muted'},t('db.speciesHelp')),speciesChart(),table(['db.group','a.species','rp.records'],data.charts.species.map((row,index)=>[index+1,root.services.catalogs.label(tables.catalogOptions.find(item=>item.id===row.speciesId)),row.count])),el('a',{href:'#reports'},t('nav.reports'))),el('section',{class:'card stack'},el('h2',{},t('ui.lastBackup')),el('p',{},latest?t('ui.'+latest.state)+' · '+stamp(latest.generatedAt):t('ui.noBackups')),verified?el('p',{class:'muted'},t('db.lastVerified',{date:stamp(verified.verifiedAt)})):null,el('a',{href:'#backup'},t('nav.backup'))))];
  }
  root.modules.dashboard=Object.freeze({render,dispose});
}(window.RescueManager));
