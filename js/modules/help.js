(function(root){
  'use strict';
  const chapters=['start','settings','animals','contacts','health','fosters','adoptions','tasks','finance','donations','inventory','documents','exchange','backup','transfer','update','trash','troubleshoot','demo'];
  // Local technical log: reviewed and downloaded only on request; clearing needs confirmation.
  function diagnostics(el,button,t){
    const list=el('ol',{class:'diagnostics-list'}),status=el('p',{role:'status'}),service=root.services.diagnostics;
    const paint=()=>service.list().then(rows=>{status.textContent=t('dg.count',{count:rows.length,limit:service.limit});list.replaceChildren(...rows.slice(0,20).map(row=>el('li',{},el('span',{class:'muted'},row.at.replace('T',' ').slice(0,19)+' · '+row.kind+(row.route?' · #'+row.route:'')),' ',el('strong',{},row.name),row.code?' ('+row.code+')':'',row.message?': '+row.message:'')));}).catch(error=>{status.textContent=root.components.ui.message(error);});
    const download=button(t('dg.export'),async()=>{root.components.ui.download(await service.export(),'rescue-manager-diagnostics-'+new Date().toISOString().slice(0,10)+'.json');status.textContent=t('dg.exported');},true);
    const clear=button(t('dg.clear'),async()=>{if(!confirm(t('dg.clearConfirm')))return;await service.clear();paint();},true);
    paint();return el('section',{class:'card stack',id:'help-diagnostics'},el('h2',{},t('dg.title')),el('p',{},t('dg.help')),status,list,el('div',{class:'actions'},download,clear));
  }
  function render(){
    const {el,button}=root.components.ui,t=(...args)=>root.core.i18n.t(...args);
    const section=(key,prefix='guide.')=>el('section',{class:'card',id:'help-'+key},el('h2',{},t(prefix+key)),...t(prefix+key+'Text').split('\n\n').map(text=>el('p',{},text)));
    return [el('div',{class:'page-heading'},el('h1',{},t('ui.helpTitle'))),section('where','ui.'),
      el('nav',{'aria-label':t('guide.contents'),class:'card help-contents'},el('h2',{},t('guide.contents')),el('ul',{},chapters.map(key=>el('li',{},el('a',{href:'#help-'+key,on:{click:event=>{event.preventDefault();const target=document.getElementById('help-'+key);target.scrollIntoView();target.querySelector('h2').focus();}}},t('guide.'+key)))))),
      el('div',{class:'stack help'},chapters.map(key=>{const node=section(key);node.querySelector('h2').tabIndex=-1;return node;}),section('privacy','ui.'),section('limits','ui.'),diagnostics(el,button,t)),
      button(t('ui.print'),()=>window.print(),true)];
  }
  root.modules.help=Object.freeze({render});
}(window.RescueManager));
