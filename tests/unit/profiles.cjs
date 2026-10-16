'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { harness: build } = require('./support/service-harness.cjs');
const datasetId = '30000000-0000-4000-8000-000000000001', today = '2026-10-15';
const harness = () => build({ datasetId, today, catalogKinds: ['species', 'size', 'volunteer_function', 'task_type'],
  services: ['animals', 'fosters', 'tasks', 'contacts', 'volunteers'] });
const same = (actual, expected) => assert.deepEqual(JSON.parse(JSON.stringify(actual)), expected);
async function contact(h, name, roles = ['adopter']) { return (await h.root.services.contacts.create({ name, roles })).result.id; }
async function animal(h, name) {
  return (await h.root.services.animals.registerEntry({ animal: { name, speciesId: h.catalog.species.id, sizeId: h.catalog.size.id }, date: '2026-10-01',
    entryReason: 'Rescate', location: { kind: 'shelter', id: h.location.id }, availability: 'available' })).result.animalId;
}
test('foster profile grants the role atomically, is unique per contact and derives occupancy from open stays', async () => {
  const h = harness(), f = h.root.services.fosters, familyId = await contact(h, 'Familia García');
  const input = { contactId: familyId, totalCapacity: 1, acceptedSpeciesIds: [h.catalog.species.id], acceptedSizeIds: [h.catalog.size.id], availability: 'available' };
  let before = h.state();
  await assert.rejects(f.createProfile({ ...input, acceptedSpeciesIds: [h.catalog.size.id] }), /correct catalog/);
  await assert.rejects(f.createProfile({ ...input, acceptedSizeIds: 'all' }), /must be a list/);
  assert.equal(h.state(), before);
  const profileId = (await f.createProfile(input)).result.id;
  same(h.row('contacts', familyId).roles, ['adopter', 'foster']);
  await assert.rejects(f.createProfile(input), /already has a foster profile/);
  const first = await animal(h, 'Luna'), second = await animal(h, 'Sol');
  await h.root.services.fosters.assign({ animalId: first, fosterProfileId: profileId, startDate: '2026-10-02' });
  same(f.occupancy(h.tables, profileId), { capacity: 1, occupied: 1, free: 0, animalIds: [first], overCapacity: false });
  // A documented overflow no longer invalidates the regular stay that was already within capacity.
  await assert.rejects(f.assign({ animalId: second, fosterProfileId: profileId, startDate: '2026-10-03' }), /Confirm/);
  await f.assign({ animalId: second, fosterProfileId: profileId, startDate: '2026-10-03', confirmException: true, exceptionReason: 'Urgencia veterinaria revisada' });
  assert.equal(f.occupancy(h.tables, profileId).overCapacity, true);
  assert.equal(h.root.domain.validateDataset(h.tables, { datasetId, today }).length, 0);
  // Availability only governs new placements: the family can stop accepting animals while hosting these two.
  await f.updateProfile(profileId, { availability: 'unavailable', restrictions: 'Sin nuevas acogidas hasta noviembre' });
  before = h.state();
  await assert.rejects(f.updateProfile(profileId, { totalCapacity: 0 }), /no longer fit/);
  await assert.rejects(f.updateProfile(profileId, { acceptedSpeciesIds: [] }), /no longer fit/);
  await assert.rejects(f.updateProfile(profileId, { contactId: familyId }), /Unexpected/);
  assert.equal(h.state(), before);
  assert.equal(h.row('fosterProfiles', profileId).availability, 'unavailable');
});
test('volunteer profile keeps contact data central, validates functions and allows status changes', async () => {
  const h = harness(), v = h.root.services.volunteers, personId = await contact(h, 'Irene Ruiz');
  const before = h.state();
  await assert.rejects(v.createProfile({ contactId: personId, functionIds: [h.catalog.species.id] }), /active volunteer functions/);
  await assert.rejects(v.createProfile({ contactId: personId, phone: '600000000' }), /Unexpected/);
  assert.equal(h.state(), before);
  const profileId = (await v.createProfile({ contactId: personId, functionIds: [h.catalog.volunteer_function.id], availability: 'Sábados por la mañana', specialties: 'Fotografía' })).result.id;
  same(h.row('contacts', personId).roles, ['adopter', 'volunteer']);
  await assert.rejects(v.createProfile({ contactId: personId }), /already has a volunteer profile/);
  await v.updateProfile(profileId, { status: 'inactive' });
  assert.equal(h.tables.activityLog.at(-1).operation, 'state_change');
  same(v.list(h.tables, { status: 'inactive' }).map(row => [row.profile.id, row.contact.name]), [[profileId, 'Irene Ruiz']]);
  same(v.list(h.tables, { status: 'active' }), []);
});
test('volunteer hours validate duration and dates, support correction and trash, and totals derive from entries', async () => {
  const h = harness(), v = h.root.services.volunteers;
  const ana = (await v.createProfile({ contactId: await contact(h, 'Ana'), functionIds: [h.catalog.volunteer_function.id] })).result.id;
  const luis = (await v.createProfile({ contactId: await contact(h, 'Luis'), status: 'inactive' })).result.id;
  const entry = (await v.logHours({ volunteerProfileId: ana, date: '2026-10-01', activity: 'Paseos', durationMinutes: 90 })).result.id;
  await v.logHours({ volunteerProfileId: ana, date: '2026-09-28', activity: 'Limpieza', durationMinutes: 60 });
  await v.logHours({ volunteerProfileId: luis, date: '2026-10-10', activity: 'Transporte al veterinario', durationMinutes: 45 });
  const before = h.state();
  await assert.rejects(v.logHours({ volunteerProfileId: ana, date: '2026-10-16', activity: 'Futuro', durationMinutes: 30 }), { name: 'ValidationError' });
  await assert.rejects(v.logHours({ volunteerProfileId: ana, date: today, activity: 'Cero', durationMinutes: 0 }), { name: 'ValidationError' });
  await assert.rejects(v.logHours({ volunteerProfileId: ana, date: today, activity: 'Fracción', durationMinutes: 1.5 }), { name: 'ValidationError' });
  assert.equal(h.state(), before);
  same(v.totals(h.tables, { from: '2026-10-01', to: '2026-10-31' }), { minutes: 135, entries: 2,
    byVolunteer: [{ volunteerProfileId: ana, minutes: 90, entries: 1 }, { volunteerProfileId: luis, minutes: 45, entries: 1 }] });
  await v.editHours(entry, { durationMinutes: 120, notes: 'Corregido: dos perros más' });
  assert.equal(v.totals(h.tables, { volunteerProfileId: ana }).minutes, 180);
  await v.trashHours(entry);
  assert.equal(v.totals(h.tables, { volunteerProfileId: ana }).minutes, 60);
  await assert.rejects(v.editHours(entry, { durationMinutes: 10 }), /Restore the entry/);
  await v.restoreHours(entry);
  assert.equal(v.totals(h.tables).minutes, 225);
  assert.equal(h.tables.volunteerProfiles.every(row => !('totalMinutes' in row)), true);
});
