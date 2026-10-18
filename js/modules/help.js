(function(root){
  'use strict';
  const chapters=['start','settings','animals','contacts','health','fosters','adoptions','tasks','finance','donations','inventory','documents','exchange','backup','transfer','update','trash','troubleshoot','demo'];
  function render(){
    const {el,button}=root.components.ui,t=(...args)=>root.core.i18n.t(...args);
    const section=(key,prefix='guide.')=>el('section',{class:'card',id:'help-'+key},el('h2',{},t(prefix+key)),...t(prefix+key+'Text').split('\n\n').map(text=>el('p',{},text)));
    return [el('div',{class:'page-heading'},el('h1',{},t('ui.helpTitle'))),section('where','ui.'),
      el('nav',{'aria-label':t('guide.contents'),class:'card'},el('h2',{},t('guide.contents')),el('ul',{},chapters.map(key=>el('li',{},el('a',{href:'#help-'+key,on:{click:event=>{event.preventDefault();const target=document.getElementById('help-'+key);target.scrollIntoView();target.querySelector('h2').focus();}}},t('guide.'+key)))))),
      el('div',{class:'stack help'},chapters.map(key=>{const node=section(key);node.querySelector('h2').tabIndex=-1;return node;}),section('privacy','ui.'),section('limits','ui.')),
      button(t('ui.print'),()=>window.print(),true)];
  }
  root.modules.help=Object.freeze({render});
}(window.RescueManager));
