(function(root){
  'use strict';
  const ui=root.components.ui,el=ui.el,t=(...args)=>root.core.i18n.t(...args);
  // Download + reselect proof of a current full backup at one exact dataRevision.
  // job(status, work) is the owner's serialized runner; controls are disabled while it works.
  function current(report,job,controls,helpKey){
    const status=el('p',{role:'status'}),file=el('input',{type:'file',accept:'.json,application/json'});
    const button=ui.button(t('rt.downloadCurrent'),()=>job(status,async()=>{const copy=await root.services.backup.create();ui.download(copy.blob,'rescue-manager-current-backup-'+copy.container.content.createdAt.slice(0,10)+'.json');await root.services.backup.requested(copy.container.content.backupId);status.textContent=t('rt.downloaded');}),true);controls.push(button,file);
    file.setAttribute('aria-label',t('rt.verifyCurrent'));file.addEventListener('change',()=>{const chosen=file.files[0];if(chosen)job(status,async()=>{const value=await root.services.backup.verify(chosen);if(value.datasetId!==report.datasetId||value.dataRevision!==report.dataRevision)throw new root.core.errors.AppError('rt.wrongBackup');const receipts=await root.services.backup.listForDataset(report.datasetId);if(!receipts.some(row=>row.backupId===value.backup.backupId&&row.state==='verified'&&row.dataRevision===report.dataRevision))throw new root.core.errors.AppError('rt.copyRequired');status.textContent=t('ui.backupVerified');});});
    root.services.backup.listForDataset(report.datasetId).then(rows=>{if(!status.textContent)status.textContent=t(rows.some(row=>row.state==='verified'&&row.dataRevision===report.dataRevision)?'rt.copyVerified':'rt.copyRequired');}).catch(error=>{status.textContent=ui.message(error);});
    return el('section',{class:'stack'},el('h3',{},t('rt.currentBackup')),el('p',{},t(helpKey)),button,el('label',{},t('rt.verifyCurrent'),file),status);
  }
  root.components.backupProof=Object.freeze({current});
}(window.RescueManager));
