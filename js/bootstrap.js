(function () {
  'use strict';
  const root = window.RescueManager, ui = root.components.ui, el = ui.el, button = ui.button;
  const t = (...args) => root.core.i18n.t(...args);
  const state = { snapshot: null, pending: null, busy: false, message: null };
  let sidebar, routeToken = 0;
  const notice = (text,error) => el('div',{class:'notice'+(error?' error':''),role:error?'alert':'status'},text);
  const heading = (title,help) => el('header',{class:'page-heading'},el('div',{},el('p',{class:'eyebrow'},t('app.name')),el('h1',{},title),el('p',{class:'muted'},help)));
  async function act(work) {
    if (state.busy) return;
    state.busy = true;
    try { await work(); } catch(error) { state.message = {text:ui.message(error),error:true}; }
    finally { state.busy = false; await render(); }
  }
  function fields() {
    return [{key:'name',required:true,maxLength:120},
      {key:'language',required:true,options:[{value:'en',label:'English'},{value:'es',label:'Español'}]},
      {key:'currencyCode',required:true,options:Object.keys(root.utils.money.currencies).map(value=>({value,label:value}))},
      {key:'dateFormat',required:true,options:['iso','day_first','month_first'].map(value=>({value,label:t('format.'+value)}))},
      {key:'timeZone',required:true,maxLength:100},{key:'phone',maxLength:50},{key:'email',type:'email',maxLength:254},{key:'address',type:'textarea'}];
  }
  function editOrganization(create) {
    const org = state.snapshot?.tables.organizationSettings[0];
    const values = create ? {language:root.core.i18n.language,currencyCode:'EUR',dateFormat:'day_first',timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'} : org;
    ui.form(t(create?'ui.createOrganization':'ui.editSettings'),fields(),values,async(input,command)=>{
      if(create) await root.services.settings.create(input,command); else await root.services.settings.update(input,command);
      root.core.i18n.setLanguage(input.language); state.message = {text:t('ui.saved')}; await render();
    },{expectedRevision:create?state.activeRevision:state.snapshot?.globalRevision});
  }
  function pick(label,restore) {
    const input = el('input',{type:'file',accept:'.json,application/json',class:'file-picker','aria-label':label});
    input.addEventListener('change',()=>act(async()=>{
      if(!input.files[0]) return;
      const revision=state.activeRevision,source = await root.services.backup.verify(input.files[0]);
      if(restore) state.pending = {source,revision}; else state.message = {text:t('ui.backupVerified')};
    }));
    return el('label',{},label,input);
  }
  function summary() {
    const source = state.pending.source, value = source.summary,revision=state.pending.revision;
    const confirmation = el('input',{type:'checkbox',id:'confirm-restore'}), progress = el('p',{role:'status'});
    let controller;
    const cancel=button(t('common.cancel'),()=>{controller?.abort();},true);cancel.hidden=true;
    const apply = button(t('ui.applyRestore'),()=>act(async()=>{
      if(!confirmation.checked) { confirmation.focus(); return; }
      apply.disabled = true;
      controller=new AbortController();cancel.hidden=false;
      try{await root.services.backup.restore(source,{confirmed:true,expectedRevision:revision,signal:controller.signal,
        onProgress(count){progress.textContent=t('ui.preparing',count);}});}finally{cancel.hidden=true;}
      state.pending=null;state.message={text:t('ui.restored')};
    }));
    return el('section',{class:'card stack'},el('h2',{},t('ui.restoreSummary')),
      el('p',{},t('ui.organization')+': '+value.organizationName),el('p',{},t('ui.backupDate')+': '+value.createdAt),
      el('p',{},t('ui.files')+': '+value.embeddedAssetCount+' · '+t('ui.externalFiles')+': '+value.externalReferenceCount),
      el('div',{class:'table-wrap'},el('table',{},el('thead',{},el('tr',{},el('th',{scope:'col'},t('ui.module')),el('th',{scope:'col'},t('ui.records')))),
        el('tbody',{},Object.entries(value.recordCounts).filter(([,count])=>count).map(([name,count])=>el('tr',{},el('th',{scope:'row'},t('table.'+name)),el('td',{},count)))))),
      state.snapshot?notice(t('ui.beforeRestore')):null,
      el('label',{for:'confirm-restore'},confirmation,t('ui.confirmReplacement')),progress,
      el('div',{class:'actions'},apply,cancel,button(t('ui.closeSummary'),()=>{if(!state.busy){state.pending=null;render();}},true)));
  }
  async function recovery(){
    const rows=await root.services.recovery.list();
    return el('section',{class:'card stack'},el('h2',{},t('r.title')),el('p',{class:'muted'},t('r.help')),
      rows.length?el('ul',{class:'stack'},rows.map(row=>{
        const restore=button(t('r.recover'),()=>{
          const revision=state.activeRevision;
          ui.form(t('r.recover'),[{key:'confirmed',labelKey:'ui.confirmReplacement',type:'checkbox',required:true}],{},async(input)=>{
            if(!input.confirmed)return;await root.services.recovery.recover(row.datasetId,{confirmed:true,expectedRevision:revision});state.message={text:t('ui.restored')};state.pending=null;await render();
          });
        },true);restore.disabled=!root.services.context.status().canWrite;
        return el('li',{},el('h3',{},row.organizationName||t('r.unnamed')),el('p',{},t(row.state==='retired'?'r.retired':'r.staging')+' · '+row.updatedAt),
          el('p',{},t('r.records',{count:row.recordCount,bytes:row.assetBytes})),row.state==='retired'?restore:el('p',{class:'muted'},t('r.incomplete')));
      })):el('p',{class:'muted'},t('r.empty')));
  }
  async function backups() {
    const receipts = await root.services.backup.list();
    return [heading(t('ui.backupTitle'),t('ui.backupHelp')),el('div',{class:'grid'},
      state.snapshot?el('section',{class:'card'},el('h2',{},t('ui.createBackup')),el('p',{class:'muted'},t('ui.createBackupHelp')),
        button(t('ui.generateDownload'),()=>act(async()=>{
          const value=await root.services.backup.create();ui.download(value.blob,'rescue-manager-backup-'+value.container.content.createdAt.slice(0,10)+'.json');
          await root.services.backup.requested(value.container.content.backupId);state.message={text:t('ui.backupGenerated')};
        }))):null,
      el('section',{class:'card'},el('h2',{},t('ui.verifyBackup')),el('p',{class:'muted'},t('ui.verifyHelp')),pick(t('ui.selectVerify'),false)),
      el('section',{class:'card'},el('h2',{},t('ui.restore')),el('p',{class:'muted'},t('ui.restoreHelp')),pick(t('ui.selectRestore'),true))),
      state.pending?summary():null,
      el('section',{class:'card'},el('h2',{},t('ui.lastBackup')),receipts.length?el('ul',{},receipts.slice(0,10).map(row=>el('li',{},row.generatedAt+' · '+t('ui.'+row.state)))):el('p',{class:'muted'},t('ui.noBackups'))),await recovery()];
  }
  function overview() {
    const data=state.snapshot.tables,current=data.animals.filter(row=>!row.deletedAt&&row.managementStatus==='under_care');
    const stats=[['ui.underCare',current.length],['ui.foster',current.filter(row=>row.locationKind==='foster').length],['ui.available',current.filter(row=>row.adoptionAvailability==='available').length],
      ['ui.contacts',data.contacts.filter(row=>!row.deletedAt&&!row.archivedAt&&!row.mergedIntoContactId).length],['ui.pendingTasks',data.tasks.filter(row=>['pending','in_progress'].includes(row.status)).length],['ui.assets',data.assets.length]];
    return [heading(t('ui.welcome'),t('ui.overviewHelp')),el('section',{class:'stats'},stats.map(([key,value])=>el('article',{class:'card stat'},el('span',{},t(key)),el('strong',{},new Intl.NumberFormat(root.core.i18n.language).format(value))))),
      el('section',{class:'card'},el('h2',{},t('ui.nextSteps')),el('p',{class:'muted'},t('ui.nextStepsHelp')),el('a',{class:'button',href:'#backup'},t('ui.createBackup')))];
  }
  function help() {
    return [heading(t('ui.helpTitle'),''),el('div',{class:'stack help'},['where','copies','privacy','external','limits'].map(key=>el('section',{class:'card'},el('h2',{},t('ui.'+key)),el('p',{},t('ui.'+key+'Text'))))),button(t('ui.print'),()=>window.print(),true)];
  }
  function settings() {
    const org=state.snapshot.tables.organizationSettings[0],edit=button(t('ui.editSettings'),()=>editOrganization(false));
    edit.disabled=!root.services.context.status().canWrite;
    return [heading(t('nav.settings'),t('ui.settingsHelp')),el('section',{class:'card'},el('h2',{},org.name),el('p',{class:'muted'},org.currencyCode+' · '+org.timeZone),edit)];
  }
  function shell(page) {
    const org=state.snapshot?.tables.organizationSettings[0];
    const language=el('select',{id:'language','aria-label':t('ui.language')},el('option',{value:'en'},'English'),el('option',{value:'es'},'Español'));
    language.value=root.core.i18n.language;language.addEventListener('change',()=>{root.core.i18n.setLanguage(language.value);render();});
    sidebar=el('aside',{class:'sidebar',id:'navigation'},el('div',{class:'brand'},el('span',{class:'brand-mark','aria-hidden':'true'},'⌂'),t('app.name')),
      el('nav',{class:'nav','aria-label':t('app.name')},['dashboard','animals','contacts','fosters','volunteers','documents','backup','settings','help'].filter(key=>org||['backup','help'].includes(key)).map(key=>el('a',{href:'#'+key,'aria-current':page===key?'page':null},t('nav.'+key)))),
      el('div',{class:'sidebar-footer'},el('small',{},root.config.appVersion),el('br'),el('small',{},t('ui.offline'))));
    const menu=button('☰',()=>{const visible=sidebar.classList.toggle('visible');menu.setAttribute('aria-expanded',String(visible));},true);
    menu.classList.add('menu-toggle');menu.setAttribute('aria-label',t('ui.menu'));menu.setAttribute('aria-controls','navigation');menu.setAttribute('aria-expanded','false');
    const main=el('main',{class:'content',id:'main',tabindex:'-1'});
    document.getElementById('app').replaceChildren(el('a',{class:'skip-link',href:'#main'},t('ui.skip')),el('div',{class:'shell'},sidebar,
      el('div',{class:'workspace'},el('header',{class:'topbar'},el('div',{class:'actions'},menu,el('span',{class:'organization'},org?.name||t('app.name'))),
        el('div',{class:'top-actions'},el('span',{class:'badge'},t('ui.offline')),el('label',{class:'language-label',for:'language'},el('span',{},t('ui.language')),language))),
        el('div',{class:'development'},t('ui.development')),main)));
    return main;
  }
  async function render() {
    const token=++routeToken;
    try {
      // An active but empty dataset (restored empty backup) still needs control and revision checks.
      const capture=await root.services.context.snapshot();state.activeRevision=capture?capture.globalRevision:undefined;
      state.snapshot=capture?.tables.organizationSettings.length?capture:null;
      const parts=location.hash.slice(1).split('/'),page=parts[0]||'dashboard';
      const ctx={get snapshot(){return state.snapshot;},route:{id:parts[1]||null,tab:parts[2]||null},refresh:render,action:act,
        canWrite:()=>root.services.context.status().canWrite,notify:(text,error)=>{state.message={text,error};},
        afterSave:id=>{if(page==='animals'&&parts[1]!==id)location.hash='animals/'+id;}};
      ctx.documents=entity=>root.modules.documents.render(ctx,entity);
      root.modules.animals.dispose();
      const children=page==='help'?help():page==='backup'?await backups():!state.snapshot?[
        el('section',{class:'card empty'},el('p',{class:'eyebrow'},t('app.name')),el('h1',{},t('ui.noOrganization')),el('p',{class:'muted'},t('ui.noOrganizationHelp')),
          el('div',{class:'actions'},button(t('ui.createOrganization'),()=>editOrganization(true)),el('a',{class:'button secondary',href:'#backup'},t('ui.restore'))))]:page==='settings'?settings():page==='animals'?root.modules.animals.render(ctx):['contacts','fosters','volunteers'].includes(page)?root.modules.people.render(page,ctx):page==='documents'?[heading(t('nav.documents'),t('d.help')),root.modules.documents.render(ctx)]:overview();
      if(token!==routeToken)return;
      const main=shell(page);
      if(state.message){main.append(notice(state.message.text,state.message.error));state.message=null;}
      if(capture&&!root.services.context.status().canWrite)main.append(el('div',{class:'notice warning'},el('p',{},t('ui.readOnly')),el('p',{},t('ui.readOnlyReload')),
        button(t('ui.takeControl'),()=>act(async()=>{if(confirm(t('ui.takeControlConfirm')))await root.services.context.takeControl();}),true)));
      main.append(...children.filter(Boolean));document.documentElement.lang=root.core.i18n.language;document.title=t('app.name');schedule();
    }catch(error){document.getElementById('app').replaceChildren(el('main',{class:'content'},notice(ui.message(error),true)));}
  }
  window.addEventListener('hashchange',()=>{if(location.hash!=='#main')render();});
  window.addEventListener('beforeunload',event=>{if(document.querySelector('dialog[data-dirty=true]')){event.preventDefault();event.returnValue='';}});
  window.addEventListener('keydown',event=>{if(event.key==='Escape'&&sidebar?.classList.contains('visible')){
    sidebar.classList.remove('visible');const menu=document.querySelector('.menu-toggle');menu?.setAttribute('aria-expanded','false');menu?.focus();
  }});
  let retryTimer=null;
  function reclaim(){root.services.context.retry().then(next=>{if(next.canWrite)render();else schedule();}).catch(()=>{});}
  // Read-only after a reload: try again exactly when the previous lease expires.
  function schedule(){const status=root.services.context.status();clearTimeout(retryTimer);
    if(!status.canWrite&&status.blockedUntil)retryTimer=setTimeout(reclaim,Math.min(31000,Math.max(250,status.blockedUntil-Date.now()+250)));}
  // Hidden tabs stop renewing (another visible tab may then take over) unless a long operation is running.
  setInterval(()=>{const status=root.services.context.status();if(document.hidden&&!((state.busy||ui.busy)&&status.canWrite))return;
    if(status.canWrite)root.services.context.renew().catch(()=>render());else if(status.active)reclaim();},root.config.leaseRenewMs);
  async function start(){try{await root.services.context.open();const capture=await root.services.context.snapshot();if(capture?.tables.organizationSettings[0])root.core.i18n.setLanguage(capture.tables.organizationSettings[0].language);await render();}catch(error){document.getElementById('app').replaceChildren(el('main',{class:'content'},notice(ui.message(error),true)));}}
  root.core.app=Object.freeze({ready:start(),render});
}());
