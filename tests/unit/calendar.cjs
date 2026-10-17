'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),test=require('node:test'),assert=require('node:assert/strict');
const sandbox=vm.createContext({window:{}});
for(const file of ['js/namespace.js','js/utils/dates.js','js/utils/calendar.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../..',file),'utf8'),sandbox);
const calendar=sandbox.window.RescueManager.utils.calendar;
test('calendar shifts preserve civil days through leap years and daylight-saving boundaries',()=>{
  for(const [from,amount,to]of[['2024-02-28',1,'2024-02-29'],['2024-03-01',-1,'2024-02-29'],['1900-02-28',1,'1900-03-01'],['2000-03-01',-1,'2000-02-29'],['2026-03-29',1,'2026-03-30'],['2026-10-25',1,'2026-10-26'],['0001-01-02',-1,'0001-01-01'],['9999-12-30',1,'9999-12-31']])assert.equal(calendar.shiftDays(from,amount),to);
  assert.equal(calendar.shiftMonth('2026-12',1),'2027-01');assert.equal(calendar.shiftMonth('2026-01',-1),'2025-12');
  for(const work of[()=>calendar.shiftDays('0001-01-01',-1),()=>calendar.shiftDays('9999-12-31',1),()=>calendar.shiftMonth('0001-01',-1),()=>calendar.shiftMonth('9999-12',1),()=>calendar.month('2026-13'),()=>calendar.shiftDays('2026-02-29',1)])assert.throws(work);
});
test('month grid is Monday-first, complete and uses unique civil dates without Date or UTC',()=>{
  const feb=calendar.month('2024-02');assert.equal(feb.first,'2024-02-01');assert.equal(feb.last,'2024-02-29');assert.equal(feb.cells.length,42);assert.equal(feb.cells[0].date,'2024-01-29');assert.equal(feb.cells.filter(row=>row.inMonth).length,29);assert.equal(new Set(feb.cells.map(row=>row.date)).size,42);
  const first=calendar.month('0001-01');assert.equal(first.cells[0].date,'0001-01-01');
  const end=calendar.month('9999-12');assert.equal(end.cells.filter(row=>row.inMonth).length,31);assert(end.cells.some(row=>row.date===null));
});
