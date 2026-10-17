(function(root){
  'use strict';
  const dates=root.utils.dates;
  const leap=year=>year%4===0&&(year%100!==0||year%400===0);
  const daysInMonth=(year,month)=>month===2?(leap(year)?29:28):[4,6,9,11].includes(month)?30:31;
  const iso=(year,month,day)=>String(year).padStart(4,'0')+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');
  function shiftDays(value,amount){
    if(!dates.isValid(value)||!Number.isInteger(amount)||Math.abs(amount)>366000)throw new RangeError('Invalid calendar shift');
    let [year,month,day]=value.split('-').map(Number);day+=amount;
    while(day<1){month--;if(month<1){year--;month=12;}if(year<1)throw new RangeError('Date precedes supported calendar');day+=daysInMonth(year,month);}
    while(day>daysInMonth(year,month)){day-=daysInMonth(year,month);month++;if(month>12){year++;month=1;}if(year>9999)throw new RangeError('Date exceeds supported calendar');}
    return iso(year,month,day);
  }
  function shiftMonth(value,amount){
    if(typeof value!=='string'||!/^\d{4}-\d{2}$/.test(value)||!dates.isValid(value+'-01')||!Number.isInteger(amount))throw new RangeError('Invalid calendar month');
    const [year,month]=value.split('-').map(Number),index=(year-1)*12+month-1+amount;
    if(index<0||index>=9999*12)throw new RangeError('Month exceeds supported calendar');
    return iso(Math.floor(index/12)+1,index%12+1,1).slice(0,7);
  }
  function month(value){
    if(typeof value!=='string'||!/^\d{4}-\d{2}$/.test(value)||!dates.isValid(value+'-01'))throw new RangeError('Invalid calendar month');
    const first=value+'-01',[year,number]=value.split('-').map(Number),offset=dates.daysBetween('0001-01-01',first)%7;
    const cells=[];
    // Monday first. Null boundary cells avoid manufacturing dates outside years 0001–9999.
    for(let index=0;index<42;index++){try{const date=shiftDays(first,index-offset);cells.push({date,inMonth:date.slice(0,7)===value});}catch(_){cells.push({date:null,inMonth:false});}}
    return {value,first,last:iso(year,number,daysInMonth(year,number)),cells};
  }
  root.utils.calendar=Object.freeze({shiftDays,shiftMonth,month});
}(window.RescueManager));
