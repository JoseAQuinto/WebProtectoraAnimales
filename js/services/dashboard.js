(function(root){
  'use strict';
  function calculate(tables,today){
    if(!root.utils.dates.isValid(today))throw new RangeError('Invalid dashboard reference date');
    const from=today.slice(0,7)+'-01',through=root.utils.calendar.shiftDays(today,7),open=new Set(tables.stayEpisodes.filter(row=>!row.deletedAt&&!row.exitDate).map(row=>row.animalId));
    const care=tables.animals.filter(row=>!row.deletedAt&&open.has(row.id)),tasks=tables.tasks.filter(row=>!row.deletedAt&&!row.archivedAt&&['pending','in_progress'].includes(row.status)).sort((a,b)=>a.dueDate.localeCompare(b.dueDate)||a.id.localeCompare(b.id));
    const catalogs=new Map(tables.catalogOptions.map(row=>[row.id,row])),balances=new Map();for(const row of tables.inventoryMovements)balances.set(row.itemId,(balances.get(row.itemId)||0n)+BigInt(row.deltaScaled));
    const low=tables.inventoryItems.filter(row=>!row.deletedAt&&!row.archivedAt&&row.status==='active').map(row=>{const quantity=balances.get(row.id)||0n;if(quantity<0n||quantity>BigInt(Number.MAX_SAFE_INTEGER))throw new RangeError('Invalid stock balance');return{...row,quantityScaled:Number(quantity)};}).filter(row=>row.quantityScaled<row.minimumStockScaled);
    const movements=tables.financialMovements.filter(row=>row.status==='posted'&&row.date>=from&&row.date<=today),cards={
      care:{type:'animal',rows:care},shelter:{type:'animal',rows:care.filter(row=>row.locationKind==='shelter')},foster:{type:'animal',rows:care.filter(row=>row.locationKind==='foster')},available:{type:'animal',rows:care.filter(row=>row.adoptionAvailability==='available')},reserved:{type:'animal',rows:care.filter(row=>row.adoptionAvailability==='reserved')},
      entries:{type:'episode',rows:tables.stayEpisodes.filter(row=>!row.deletedAt&&row.entryDate>=from&&row.entryDate<=today)},adoptions:{type:'adoption',rows:tables.adoptions.filter(row=>!row.deletedAt&&row.adoptionDate>=from&&row.adoptionDate<=today)},
      veterinary:{type:'task',rows:tasks.filter(row=>catalogs.get(row.typeId)?.code==='veterinary_visit'&&row.dueDate>=today&&row.dueDate<=through)},vaccines:{type:'task',rows:tasks.filter(row=>catalogs.get(row.typeId)?.code==='vaccination')},careTasks:{type:'task',rows:tasks.filter(row=>catalogs.get(row.typeId)?.code==='medication'||row.source?.type==='care_plan')},
      overdue:{type:'task',rows:tasks.filter(row=>row.dueDate<today)},today:{type:'task',rows:tasks.filter(row=>row.dueDate===today)},upcoming:{type:'task',rows:tasks.filter(row=>row.dueDate>today&&row.dueDate<=through)},
      income:{type:'finance',rows:movements.filter(row=>row.direction==='income')},expense:{type:'finance',rows:movements.filter(row=>row.direction==='expense')},balance:{type:'finance',rows:movements},lowStock:{type:'inventory',rows:low}
    };
    const chartFrom=root.utils.calendar.shiftMonth(today.slice(0,7),-11)+'-01',period={from:chartFrom,to:today},entries=root.services.reports.entriesPerMonth(tables,period),adoptions=root.services.reports.adoptionsPerMonth(tables,period),adoptionCounts=new Map(adoptions.map(row=>[row.month,row.count]));
    const finances=root.services.reports.financesPerMonth(tables,period),expenses=new Map(finances.expense.map(row=>[row.month,row.amountMinor]));
    const species=new Map();for(const row of care)species.set(row.speciesId,(species.get(row.speciesId)||0)+1);
    return{today,from,through,cards,money:root.services.reports.financialSummary(tables,{from,to:today}),
      charts:{entries:entries.map(row=>({month:row.month,entries:row.count,adoptions:adoptionCounts.get(row.month)||0})),finances:finances.income.map(row=>({month:row.month,incomeMinor:row.amountMinor,expenseMinor:expenses.get(row.month)||0})),species:[...species].map(([speciesId,count])=>({speciesId,count})).sort((a,b)=>b.count-a.count||a.speciesId.localeCompare(b.speciesId))}};
  }
  root.services.dashboard=Object.freeze({calculate});
}(window.RescueManager));
