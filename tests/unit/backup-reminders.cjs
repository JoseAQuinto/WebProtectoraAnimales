'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const sandbox=vm.createContext({window:{},Intl,Date});for(const name of['namespace','utils/dates','services/backup-reminders'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../js/'+name+'.js'),'utf8'),sandbox);
const evaluate=sandbox.window.RescueManager.services.backupReminders.evaluate;
function snapshot(){return{datasetId:'d',dataRevision:100,tables:{organizationSettings:[{createdAt:'2026-10-01T12:00:00Z',timeZone:'Europe/Madrid',backupRemindersEnabled:true,backupReminderDays:7,backupReminderWrites:100}]}};}
const receipt=(extra={})=>({datasetId:'d',dataRevision:50,state:'verified',generatedAt:'2026-10-01T12:00:00Z',verifiedAt:'2026-10-01T13:00:00Z',...extra});
test('only a verified receipt for this dataset suppresses the initial reminder',()=>{
 const s=snapshot(),now=Date.parse('2026-10-02T12:00:00Z');for(const rows of[[],[receipt({state:'generated'})],[receipt({state:'requested'})],[receipt({datasetId:'other'})],[receipt({dataRevision:101})]])assert.equal(evaluate(s,rows,now).due,true);
 assert.equal(evaluate(s,[receipt()],now).due,false);s.tables.organizationSettings[0].backupRemindersEnabled=false;assert.equal(evaluate(s,[],now).due,false);
});
test('days and writes trigger independently on inclusive boundaries with calendar days across DST',()=>{
 const s=snapshot(),r=receipt({generatedAt:'2026-10-24T22:30:00Z',dataRevision:100});s.tables.organizationSettings[0].backupReminderDays=1;
 assert.equal(evaluate(s,[r],Date.parse('2026-10-25T22:30:00Z')).days,0);assert.equal(evaluate(s,[r],Date.parse('2026-10-25T23:00:00Z')).due,true);
 s.tables.organizationSettings[0].backupReminderDays=365;s.dataRevision=199;assert.equal(evaluate(s,[r],Date.parse('2026-10-25T12:00:00Z')).due,false);s.dataRevision=200;assert.equal(evaluate(s,[r],Date.parse('2026-10-25T12:00:00Z')).due,true);
});
test('latest verified revision anchors reminders while generated/requested/newer other-dataset copies do not',()=>{
 const s=snapshot(),rows=[receipt({dataRevision:70}),receipt({dataRevision:90,state:'requested'}),receipt({datasetId:'x',dataRevision:99}),receipt({dataRevision:20,verifiedAt:'2026-10-02T00:00:00Z'})],before=JSON.stringify({s,rows});
 const result=evaluate(s,rows,Date.parse('2026-10-03T12:00:00Z'));assert.equal(result.writes,30);assert.equal(result.verified,true);assert.equal(JSON.stringify({s,rows}),before);
});
