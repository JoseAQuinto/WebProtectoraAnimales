'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const sandbox = vm.createContext({ window: {}, Intl, BigInt, Number });
for (const name of ['namespace', 'utils/dates', 'services/reports']) {
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../../js/' + name + '.js'), 'utf8'), sandbox, { filename: name + '.js' });
}
const reports = sandbox.window.RescueManager.services.reports;
// Reports run inside a vm realm, so returned objects/arrays must be normalized
// before structural comparison against main-realm expected values.
const clean = value => JSON.parse(JSON.stringify(value));
function table() { return { animals: [], stayEpisodes: [], adoptions: [], financialMovements: [], donations: [], donationLines: [], catalogOptions: [] }; }
let seq = 0; const id = prefix => prefix + '-' + (++seq);
const animal = (t, over = {}) => t.animals.push({ id: id('a'), deletedAt: null, archivedAt: null, managementStatus: 'under_care', locationKind: 'shelter', adoptionAvailability: 'available', sex: 'female', speciesId: 'dog', birthDate: null, estimatedAgeMonths: null, ...over }) && t.animals[t.animals.length - 1];
const movement = (t, over = {}) => t.financialMovements.push({ id: id('m'), direction: 'expense', date: '2026-10-10', amountMinor: 1000, status: 'posted', animalId: null, categoryId: 'vet-cat', ...over }) && t.financialMovements[t.financialMovements.length - 1];
const donation = (t, over = {}) => t.donations.push({ id: id('d'), deletedAt: null, type: 'monetary', status: 'recorded', date: '2026-10-10', financialMovementId: null, ...over }) && t.donations[t.donations.length - 1];

test('currentCensus separates location and availability which can overlap', () => {
  const t = table();
  animal(t, { managementStatus: 'under_care', locationKind: 'shelter', adoptionAvailability: 'available' });
  animal(t, { managementStatus: 'under_care', locationKind: 'foster', adoptionAvailability: 'available' });
  animal(t, { managementStatus: 'under_care', locationKind: 'shelter', adoptionAvailability: 'reserved' });
  animal(t, { managementStatus: 'adopted', locationKind: 'shelter', adoptionAvailability: 'unavailable' });
  assert.deepEqual(clean(reports.currentCensus(t)), { underCare: 3, inShelter: 2, inFoster: 1, available: 2, reserved: 1 });
});

test('entriesPerMonth buckets episodes inclusively and excludes deleted rows', () => {
  const t = table();
  t.stayEpisodes.push({ id: id('e'), deletedAt: null, entryDate: '2026-01-05' });
  t.stayEpisodes.push({ id: id('e'), deletedAt: null, entryDate: '2026-01-31' });
  t.stayEpisodes.push({ id: id('e'), deletedAt: null, entryDate: '2026-02-01' });
  t.stayEpisodes.push({ id: id('e'), deletedAt: '2026-01-01T00:00:00Z', entryDate: '2026-01-15' });
  assert.deepEqual(clean(reports.entriesPerMonth(t, { from: '2026-01-01', to: '2026-02-28' })),
    [{ month: '2026-01', count: 2 }, { month: '2026-02', count: 1 }]);
});

test('adoptionsPerMonth counts completed adoptions; a later return does not erase the fact', () => {
  const t = table();
  t.adoptions.push({ id: id('ad'), deletedAt: null, adoptionDate: '2026-01-10', returnDate: '2026-03-01' });
  t.adoptions.push({ id: id('ad'), deletedAt: null, adoptionDate: '2026-01-20', returnDate: null });
  t.adoptions.push({ id: id('ad'), deletedAt: null, adoptionDate: '2026-03-05', returnDate: null });
  assert.deepEqual(clean(reports.adoptionsPerMonth(t, { from: '2026-01-01', to: '2026-03-31' })),
    [{ month: '2026-01', count: 2 }, { month: '2026-02', count: 0 }, { month: '2026-03', count: 1 }]);
});

test('financesPerMonth sums posted movements by month and excludes voided', () => {
  const t = table();
  movement(t, { direction: 'income', date: '2026-01-05', amountMinor: 1000, status: 'posted' });
  movement(t, { direction: 'income', date: '2026-01-25', amountMinor: 250, status: 'posted' });
  movement(t, { direction: 'expense', date: '2026-01-05', amountMinor: 300, status: 'posted' });
  movement(t, { direction: 'income', date: '2026-01-05', amountMinor: 9000, status: 'voided' });
  movement(t, { direction: 'expense', date: '2026-02-02', amountMinor: 700, status: 'posted' });
  const r = reports.financesPerMonth(t, { from: '2026-01-01', to: '2026-02-28' });
  assert.deepEqual(clean(r.income), [{ month: '2026-01', amountMinor: 1250 }, { month: '2026-02', amountMinor: 0 }]);
  assert.deepEqual(clean(r.expense), [{ month: '2026-01', amountMinor: 300 }, { month: '2026-02', amountMinor: 700 }]);
});

test('distribution helpers group current records by the requested dimension', () => {
  const t = table();
  animal(t, { speciesId: 'dog', sex: 'female', adoptionAvailability: 'available', managementStatus: 'under_care' });
  animal(t, { speciesId: 'dog', sex: 'male', adoptionAvailability: 'reserved', managementStatus: 'under_care' });
  animal(t, { speciesId: 'cat', sex: 'female', adoptionAvailability: 'available', managementStatus: 'adopted' });
  assert.deepEqual(clean(reports.speciesDistribution(t)), [{ key: 'dog', count: 2 }]);
  assert.deepEqual(clean(reports.sexDistribution(t)), [{ key: 'female', count: 1 }, { key: 'male', count: 1 }]);
  assert.deepEqual(clean(reports.availabilityDistribution(t)), [{ key: 'available', count: 1 }, { key: 'reserved', count: 1 }]);
  assert.deepEqual(clean(reports.situationDistribution(t)), [{ key: 'under_care', count: 2 }, { key: 'adopted', count: 1 }]);
});

test('ageDistribution uses administrative bands with an unknown category', () => {
  const t = table();
  animal(t, { birthDate: '2026-01-15' });
  animal(t, { birthDate: '2024-01-15' });
  animal(t, { birthDate: '2020-01-15' });
  animal(t, { birthDate: '2015-01-15' });
  animal(t, {});
  animal(t, { estimatedAgeMonths: 6, estimatedAgeReferenceDate:'2026-10-01' });
  assert.deepEqual(clean(reports.ageDistribution(t, '2026-10-15')),
    [{ key: 'under_1', count: 2 }, { key: '1_to_3', count: 1 }, { key: '4_to_7', count: 1 }, { key: '8_plus', count: 1 }, { key: 'unknown', count: 1 }]);
});

test('timeToAdoption averages days per episode closed by adoption and reports cases', () => {
  const t = table();
  t.stayEpisodes.push({ id: 'ep1', deletedAt: null, entryDate: '2026-01-01',exitReason:'adoption',exitDate:'2026-01-11' });
  t.stayEpisodes.push({ id: 'ep2', deletedAt: null, entryDate: '2026-01-01',exitReason:'adoption',exitDate:'2026-01-21' });
  t.stayEpisodes.push({ id: 'ep3', deletedAt: null, entryDate: '2026-05-01' });
  t.adoptions.push({ id: id('ad'), deletedAt: null, episodeId: 'ep1', adoptionDate: '2026-01-11' });
  t.adoptions.push({ id: id('ad'), deletedAt: null, episodeId: 'ep2', adoptionDate: '2026-01-21' });
  t.adoptions.push({ id: id('ad'), deletedAt: null, episodeId: 'missing', adoptionDate: '2026-06-01' });
  assert.deepEqual(clean(reports.timeToAdoption(t)), { averageDays: 15, cases: 2 });
  assert.deepEqual(clean(reports.timeToAdoption(table())), { averageDays: null, cases: 0 });
});

test('veterinary expenses sum only posted veterinary-category expenses', () => {
  const t = table();
  t.catalogOptions.push({ id: 'vet-cat', code: 'veterinary' }, { id: 'food-cat', code: 'food' });
  movement(t, { categoryId: 'vet-cat', amountMinor: 500, status: 'posted', date: '2026-10-01' });
  movement(t, { categoryId: 'vet-cat', amountMinor: 700, status: 'posted', date: '2026-10-02' });
  movement(t, { categoryId: 'vet-cat', amountMinor: 9000, status: 'voided', date: '2026-10-03' });
  movement(t, { categoryId: 'food-cat', amountMinor: 300, status: 'posted', date: '2026-10-04' });
  assert.equal(reports.veterinaryExpenses(t, { from: '2026-10-01', to: '2026-10-31' }), 1200);
});

test('monetary and material donations report separately and material value is not income', () => {
  const t = table();
  const m1 = movement(t, { direction: 'income', amountMinor: 2000, status: 'posted' });
  movement(t, { direction: 'income', amountMinor: 8888, status: 'voided' });
  donation(t, { type: 'monetary', status: 'recorded', financialMovementId: m1.id });
  donation(t, { type: 'monetary', status: 'voided' });
  donation(t, { type: 'material', status: 'recorded', date: '2026-10-05' });
  t.donationLines.push({ id: id('l'), donationId: t.donations[2].id, estimatedValueMinor: 300 });
  t.donationLines.push({ id: id('l'), donationId: t.donations[2].id, estimatedValueMinor: 250 });
  assert.equal(reports.monetaryDonations(t, { from: '2026-10-01', to: '2026-10-31' }), 2000);
  assert.deepEqual(clean(reports.materialDonations(t, { from: '2026-10-01', to: '2026-10-31' })), { count: 1, lines: 2, estimatedValueMinor: 550 });
});

test('costsByAnimal and generalExpenses separate per-animal costs from general costs', () => {
  const t = table();
  movement(t, { animalId: 'a1', amountMinor: 100, status: 'posted' });
  movement(t, { animalId: 'a1', amountMinor: 200, status: 'posted' });
  movement(t, { animalId: 'a2', amountMinor: 50, status: 'posted' });
  movement(t, { animalId: 'a1', amountMinor: 9999, status: 'voided' });
  movement(t, { animalId: null, amountMinor: 400, status: 'posted' });
  assert.deepEqual(clean(reports.costsByAnimal(t)), [{ animalId: 'a1', totalMinor: 300 }, { animalId: 'a2', totalMinor: 50 }]);
  assert.equal(reports.generalExpenses(t, { from: '2026-10-01', to: '2026-10-31' }), 400);
});

test('estimated ages advance from their reference date and absent/future references stay unknown',()=>{
  const t=table();animal(t,{estimatedAgeMonths:11,estimatedAgeReferenceDate:'2025-01-31'});animal(t,{estimatedAgeMonths:6});animal(t,{estimatedAgeMonths:6,estimatedAgeReferenceDate:'2027-01-01'});
  assert.deepEqual(clean(reports.ageDistribution(t,'2026-02-28')),[{key:'unknown',count:2},{key:'1_to_3',count:1}]);
});
test('period validation rejects malformed, reversed, missing monthly dates and excessive ranges',()=>{
  const t=table();for(const p of[{from:'2026-02-30',to:'2026-03-01'},{from:'2026-02-01',to:'2026-01-31'},{from:'2026-01-01'},{from:'0001-01-01',to:'9999-12-31'}])assert.throws(()=>reports.entriesPerMonth(t,p));
  assert.throws(()=>reports.generalExpenses(t,{from:'not-a-date'}));
});
test('whole-period financial sums reject overflow even if each monthly bucket is safe',()=>{
  const t=table();movement(t,{date:'2026-01-01',direction:'income',amountMinor:Number.MAX_SAFE_INTEGER});movement(t,{date:'2026-02-01',direction:'income',amountMinor:1});
  assert.throws(()=>reports.financialSummary(t,{from:'2026-01-01',to:'2026-02-28'}));
});
test('adoption duration uses selected period and genuinely closed adoption episodes, preserving returns',()=>{
  const t=table();t.stayEpisodes.push({id:'one',entryDate:'2026-01-01',exitDate:'2026-01-11',exitReason:'adoption'},{id:'two',entryDate:'2026-02-01',exitDate:'2026-02-21',exitReason:'adoption'},{id:'open',entryDate:'2026-01-01',exitDate:null});
  t.adoptions.push({episodeId:'one',adoptionDate:'2026-01-11',returnDate:'2026-02-01'},{episodeId:'two',adoptionDate:'2026-02-21'},{episodeId:'open',adoptionDate:'2026-01-15'});
  assert.deepEqual(clean(reports.timeToAdoption(t,{from:'2026-01-01',to:'2026-01-31'})),{averageDays:10,cases:1});
});
