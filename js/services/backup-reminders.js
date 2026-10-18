(function(root){
  'use strict';
  function evaluate(snapshot,receipts,now=Date.now()){
    const org=snapshot.tables.organizationSettings[0];
    if(!org||!org.backupRemindersEnabled)return{enabled:false,due:false};
    const verified=receipts.filter(row=>row.datasetId===snapshot.datasetId&&row.state==='verified'&&row.verifiedAt&&row.dataRevision<=snapshot.dataRevision).sort((a,b)=>b.dataRevision-a.dataRevision||b.generatedAt.localeCompare(a.generatedAt))[0];
    const anchor=verified?.generatedAt||org.createdAt,today=root.utils.dates.today(org.timeZone,now),from=root.utils.dates.today(org.timeZone,Date.parse(anchor));
    const days=Math.max(0,root.utils.dates.daysBetween(from,today)),writes=Math.max(0,snapshot.dataRevision-(verified?.dataRevision||0));
    return{enabled:true,due:!verified||days>=org.backupReminderDays||writes>=org.backupReminderWrites,days,writes,verified:!!verified,generatedAt:verified?.generatedAt||null};
  }
  root.services.backupReminders=Object.freeze({evaluate});
}(window.RescueManager));
