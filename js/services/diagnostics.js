(function(root){
  'use strict';
  // Requirement 36: a limited local log of technical events, never record contents, never sent anywhere.
  // Kept in the infrastructure 'meta' store (no schema or backup change); it survives reloads when storage works
  // and still lists the current session's events when IndexedDB itself is failing.
  const LIMIT=200,KEY='diagnostics',uuid=/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
  let events=[],loading=null,queue=Promise.resolve();
  const clean=(value,max)=>String(value??'').replace(uuid,'<id>').replace(/\s+/g,' ').trim().slice(0,max);
  function entry(kind,error){return{at:new Date().toISOString(),kind:clean(kind,40),name:clean(error?.name||'Error',60),code:clean(typeof error?.code==='string'?error.code:'',80),message:clean(error?.message??error,300),route:clean(String(location.hash||'').replace(/^#/,'').split('/')[0],40),appVersion:root.config.appVersion};}
  const valid=row=>row&&typeof row==='object'&&typeof row.at==='string'&&typeof row.name==='string';
  function ready(){
    loading=loading||root.storage.transactions.run(['meta'],'readonly',(tx,api)=>api.request(tx.objectStore('meta').get(KEY),value=>api.setResult(Array.isArray(value?.events)?value.events.filter(valid):[])))
      .then(stored=>{events=[...stored,...events].slice(-LIMIT);},()=>{});
    return loading;
  }
  function persist(){queue=queue.then(()=>root.storage.transactions.run(['meta'],'readwrite',tx=>{tx.objectStore('meta').put({key:KEY,events:events.slice(-LIMIT)});})).catch(()=>{});return queue;}
  function record(kind,error){events.push(entry(kind,error));if(events.length>LIMIT)events=events.slice(-LIMIT);ready().then(persist);}
  async function list(){await ready();return events.slice().reverse();}
  // The user reviews this file before deciding to share it; it is only downloaded on request.
  async function exportFile(){await ready();const c=root.config;return new Blob([JSON.stringify({format:'rescue-manager-diagnostics',version:1,exportedAt:new Date().toISOString(),appVersion:c.appVersion,dbVersion:c.dbVersion,schemaVersion:c.schemaVersion,backupFormatVersion:c.backupFormatVersion,language:root.core.i18n.language,events},null,2)],{type:'application/json'});}
  async function clear(){await ready();events=[];await persist();}
  window.addEventListener('error',event=>record('uncaught',event.error||{name:'Error',message:event.message}));
  window.addEventListener('unhandledrejection',event=>record('unhandled',event.reason));
  root.services.diagnostics=Object.freeze({record,list,export:exportFile,clear,limit:LIMIT});
}(window.RescueManager));
