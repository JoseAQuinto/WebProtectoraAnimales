(function (root) {
  'use strict';
  // Pure, deterministic report calculations over an in-memory snapshot.
  // Reports read the same records and rules as the rest of the application;
  // they never write and never depend on the DOM or storage.
  const dates = root.utils.dates;
  const month = value => value.slice(0, 7);
  const posted = row => row.status === 'posted';
  const inRange = (value, from, to) => (!from || value >= from) && (!to || value <= to);
  const number = value => {
    if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < 0n) throw new RangeError('Report total exceeds the safe integer range');
    return Number(value);
  };
  function period(options,required=false){
    for(const key of ['from','to'])if(options[key]&&!dates.isValid(options[key]))throw new RangeError('Invalid report date');
    if(required&&(!options.from||!options.to))throw new RangeError('A monthly report needs both dates');
    if(options.from&&options.to&&options.from>options.to)throw new RangeError('The period end precedes its start');
  }
  function monthsIn(from, to) {
    period({from,to},true);
    const start = month(from), end = month(to);
    if (start > end) throw new RangeError('The period end precedes its start');
    const result = [];
    let year = Number(start.slice(0, 4)), m = Number(start.slice(5, 7));
    const endYear = Number(end.slice(0, 4)), endMonth = Number(end.slice(5, 7));
    if((endYear-year)*12+endMonth-m+1>1200)throw new RangeError('Report period exceeds 100 years');
    while (year < endYear || (year === endYear && m <= endMonth)) {
      result.push(String(year).padStart(4, '0') + '-' + String(m).padStart(2, '0'));
      m += 1; if (m > 12) { m = 1; year += 1; }
    }
    return result;
  }
  function underCare(tables) {
    return tables.animals.filter(row => !row.deletedAt && row.managementStatus === 'under_care');
  }
  function countBy(rows, field) {
    const counts = new Map();
    for (const row of rows) {
      const key = row[field] == null ? 'unknown' : row[field];
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return [...counts.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  }
  function bucketMonths(months, rows, dateField, from, to) {
    const totals = new Map(months.map(key => [key, 0n]));
    for (const row of rows) {
      if (!inRange(row[dateField], from, to)) continue;
      const key = month(row[dateField]);
      if (!totals.has(key)) continue;
      totals.set(key, totals.get(key) + 1n);
    }
    return months.map(key => ({ month: key, count: number(totals.get(key)) }));
  }
  function currentCensus(tables) {
    const care = underCare(tables);
    return {
      underCare: care.length,
      inShelter: care.filter(row => row.locationKind === 'shelter').length,
      inFoster: care.filter(row => row.locationKind === 'foster').length,
      available: care.filter(row => row.adoptionAvailability === 'available').length,
      reserved: care.filter(row => row.adoptionAvailability === 'reserved').length
    };
  }
  function entriesPerMonth(tables, options = {}) {
    const months = monthsIn(options.from, options.to);
    return bucketMonths(months, tables.stayEpisodes.filter(row => !row.deletedAt), 'entryDate', options.from, options.to);
  }
  function adoptionsPerMonth(tables, options = {}) {
    const months = monthsIn(options.from, options.to);
    return bucketMonths(months, tables.adoptions.filter(row => !row.deletedAt), 'adoptionDate', options.from, options.to);
  }
  function financesPerMonth(tables, options = {}) {
    const months = monthsIn(options.from, options.to);
    const income = new Map(months.map(key => [key, 0n])), expense = new Map(months.map(key => [key, 0n]));
    for (const row of tables.financialMovements) {
      if (!posted(row) || !inRange(row.date, options.from, options.to)) continue;
      const key = month(row.date); const target = row.direction === 'income' ? income : expense;
      if (target.has(key)) target.set(key, target.get(key) + BigInt(row.amountMinor));
    }
    return {
      income: months.map(key => ({ month: key, amountMinor: number(income.get(key)) })),
      expense: months.map(key => ({ month: key, amountMinor: number(expense.get(key)) }))
    };
  }
  function speciesDistribution(tables) { return countBy(underCare(tables), 'speciesId'); }
  function sexDistribution(tables) { return countBy(underCare(tables), 'sex'); }
  function availabilityDistribution(tables) { return countBy(underCare(tables), 'adoptionAvailability'); }
  function situationDistribution(tables) { return countBy(tables.animals.filter(row => !row.deletedAt), 'managementStatus'); }
  function ageMonths(animal, referenceDate) {
    if (animal.birthDate) { try { return dates.ageOn(animal.birthDate, referenceDate).totalMonths; } catch (_) { return null; } }
    if(!Number.isSafeInteger(animal.estimatedAgeMonths)||!dates.isValid(animal.estimatedAgeReferenceDate)||animal.estimatedAgeReferenceDate>referenceDate)return null;
    return animal.estimatedAgeMonths+dates.ageMonthsOn(animal.estimatedAgeReferenceDate,referenceDate);
  }
  function ageBand(animal, referenceDate) {
    const months = ageMonths(animal, referenceDate);
    if (months == null || months < 0) return 'unknown';
    if (months < 12) return 'under_1';
    if (months < 48) return '1_to_3';
    if (months < 96) return '4_to_7';
    return '8_plus';
  }
  function ageDistribution(tables, referenceDate) {
    return countBy(underCare(tables).map(row => ({ ...row, ageBand: ageBand(row, referenceDate) })), 'ageBand');
  }
  function timeToAdoption(tables,options={}) {
    period(options);
    const episodes=new Map(tables.stayEpisodes.map(row=>[row.id,row]));
    let totalDays = 0, cases = 0;
    for (const adoption of tables.adoptions) {
      if (adoption.deletedAt||!inRange(adoption.adoptionDate,options.from,options.to)) continue;
      const episode = episodes.get(adoption.episodeId);
      if (!episode || episode.deletedAt||episode.exitReason!=='adoption'||episode.exitDate!==adoption.adoptionDate) continue;
      totalDays += dates.daysBetween(episode.entryDate, adoption.adoptionDate);
      cases += 1;
    }
    return cases ? { averageDays: Math.round(totalDays / cases), cases } : { averageDays: null, cases: 0 };
  }
  function veterinaryExpenses(tables, options = {}) {
    period(options);
    let total = 0n;
    for (const row of tables.financialMovements) {
      if (row.direction !== 'expense' || !posted(row) || !inRange(row.date, options.from, options.to)) continue;
      const category = tables.catalogOptions.find(item => item.id === row.categoryId);
      if (category && category.code === 'veterinary') total += BigInt(row.amountMinor);
    }
    return number(total);
  }
  function monetaryDonations(tables, options = {}) {
    period(options);
    let total = 0n;
    for (const donation of tables.donations) {
      if (donation.deletedAt || donation.type !== 'monetary' || donation.status !== 'recorded' || !inRange(donation.date, options.from, options.to)) continue;
      const movement = tables.financialMovements.find(row => row.id === donation.financialMovementId);
      if (movement && posted(movement)) total += BigInt(movement.amountMinor);
    }
    return number(total);
  }
  function materialDonations(tables, options = {}) {
    period(options);
    let count = 0, lines = 0, estimated = 0n;
    for (const donation of tables.donations) {
      if (donation.deletedAt || donation.type !== 'material' || donation.status !== 'recorded' || !inRange(donation.date, options.from, options.to)) continue;
      count += 1;
      for (const line of tables.donationLines) {
        if (line.donationId !== donation.id) continue;
        lines += 1;
        if (Number.isSafeInteger(line.estimatedValueMinor) && line.estimatedValueMinor > 0) estimated += BigInt(line.estimatedValueMinor);
      }
    }
    return { count, lines, estimatedValueMinor: number(estimated) };
  }
  function costsByAnimal(tables, options = {}) {
    period(options);
    const totals = new Map();
    for (const row of tables.financialMovements) {
      if (row.direction !== 'expense' || !posted(row) || !row.animalId || !inRange(row.date, options.from, options.to)) continue;
      totals.set(row.animalId, (totals.get(row.animalId) || 0n) + BigInt(row.amountMinor));
    }
    return [...totals.entries()].map(([animalId, total]) => ({ animalId, totalMinor: number(total) })).sort((a, b) => b.totalMinor - a.totalMinor || a.animalId.localeCompare(b.animalId));
  }
  function generalExpenses(tables, options = {}) {
    period(options);
    let total = 0n;
    for (const row of tables.financialMovements) {
      if (row.direction !== 'expense' || !posted(row) || row.animalId || !inRange(row.date, options.from, options.to)) continue;
      total += BigInt(row.amountMinor);
    }
    return number(total);
  }
  function financialSummary(tables,options={}){
    period(options);let income=0n,expense=0n;
    for(const row of tables.financialMovements)if(posted(row)&&inRange(row.date,options.from,options.to)){
      if(!Number.isSafeInteger(row.amountMinor)||row.amountMinor<=0||!['income','expense'].includes(row.direction))throw new TypeError('Invalid financial record');
      if(row.direction==='income')income+=BigInt(row.amountMinor);else expense+=BigInt(row.amountMinor);
    }
    return {incomeMinor:number(income),expenseMinor:number(expense),balanceMinor:Number(income-expense)};
  }
  root.services.reports = Object.freeze({financialSummary,
    currentCensus, entriesPerMonth, adoptionsPerMonth, financesPerMonth,
    speciesDistribution, sexDistribution, availabilityDistribution, situationDistribution, ageDistribution,
    timeToAdoption, veterinaryExpenses, monetaryDonations, materialDonations, costsByAnimal, generalExpenses
  });
}(window.RescueManager));
