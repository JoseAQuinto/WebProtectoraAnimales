(function () {
  'use strict';
  const root = window.RescueManager, s = root.storage, v = root.services;
  const integration = root.integration = Object.assign({}, root.testObservations);
  const report = integration.report = { startedAt: new Date().toISOString(), checks: [], passed: false };
  const today = root.utils.dates.today('UTC'), id = () => root.utils.ids.uuidV4();
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  let contactId, fosterId, volunteerId, animalId, stayId, hourId, outsideHourId, catalog, locationId;
  const option = (kind, code) => catalog.find(row => row.kind === kind && row.code === code).id;
  function draw() {
    document.getElementById('summary').textContent = report.passed ? 'Pruebas correctas' : 'Comprobaciones en curso o con errores';
    document.getElementById('checks').replaceChildren(...report.checks.map(check => {
      const row = document.createElement('li'); row.className = check.passed ? 'pass' : 'fail'; row.textContent = (check.passed ? '✓ ' : '✕ ') + check.id; return row;
    }));
    document.getElementById('details').textContent = JSON.stringify(report, null, 2);
  }
  async function test(name, work) {
    try { report.checks.push({ id: name, passed: true, evidence: await work() }); }
    catch (error) { report.checks.push({ id: name, passed: false, error: { name: error.name, message: error.message, details: error.details, stack: error.stack } }); }
    draw();
  }
  async function rejects(work) { try { await work(); } catch (error) { return error.name; } throw new Error('Invalid operation succeeded'); }
  integration.snapshot = async () => {
    const snapshot = await s.repositories.snapshot();
    return snapshot ? { datasetId: snapshot.datasetId, dataRevision: snapshot.dataRevision, digest: await s.datasetManager.digest(snapshot) } : null;
  };
  async function unchangedAfter(work) {
    const before = await integration.snapshot(), error = await rejects(work), after = await integration.snapshot();
    assert(before.digest === after.digest && before.dataRevision === after.dataRevision, 'Rejected change modified the database');
    return error;
  }
  async function run() {
    await test('profiles-start-with-real-organization-and-central-contact-service', async () => {
      await s.database.open(); assert((await s.writeCoordinator.readActive()) === null, 'Fixture profile was not empty');
      await v.settings.create({ name: 'Perfiles sintéticos ñ 🐾', currencyCode: 'EUR', dateFormat: 'iso', timeZone: 'UTC', language: 'es' });
      const snapshot = await v.context.snapshot(); catalog = snapshot.tables.catalogOptions; locationId = snapshot.tables.locations[0].id;
      contactId = (await v.contacts.create({ name: 'Persona ficticia de acogida y voluntariado', email: 'profiles@example.invalid', roles: [] })).result.id;
      return { datasetId: snapshot.datasetId, contactId };
    });
    await test('foster-and-volunteer-profiles-add-central-roles-atomically-and-replay', async () => {
      const input = { contactId, totalCapacity: 2, acceptedSpeciesIds: [option('species', 'dog')], acceptedSizeIds: [option('size', 'medium')], availability: 'available' };
      const command = { operationId: id() }, first = await v.fosters.createProfile(input, command);
      fosterId = first.result.id;
      const replay = await v.fosters.createProfile(input, command);
      volunteerId = (await v.volunteers.createProfile({ contactId, availability: 'Fines de semana', functionIds: [option('volunteer_function', 'walking')], specialties: 'Socialización', status: 'active' })).result.id;
      const data = (await v.context.snapshot()).tables, contact = data.contacts.find(row => row.id === contactId);
      assert(replay.duplicate && data.fosterProfiles.length === 1 && data.volunteerProfiles.length === 1, 'Profiles duplicated on replay');
      assert(contact.roles.includes('foster') && contact.roles.includes('volunteer') && contact.revision === 3, 'Profiles did not update the central contact roles');
      return { fosterId, volunteerId, roles: contact.roles, replay: replay.duplicate };
    });
    await test('duplicate-profiles-and-broken-catalog-references-preserve-data', async () => {
      const errors = [];
      errors.push(await unchangedAfter(() => v.fosters.createProfile({ contactId, totalCapacity: 1 })));
      errors.push(await unchangedAfter(() => v.volunteers.createProfile({ contactId })));
      errors.push(await unchangedAfter(() => v.volunteers.updateProfile(volunteerId, { functionIds: [id()] })));
      return { errors, unchanged: true };
    });
    await test('foster-occupancy-is-derived-from-real-open-stays', async () => {
      animalId = (await v.animals.registerEntry({ animal: { name: 'Luna de perfiles', speciesId: option('species', 'dog'), sizeId: option('size', 'medium') }, date: today, entryReason: 'Prueba', location: { kind: 'shelter', id: locationId }, availability: 'available' })).result.animalId;
      stayId = (await v.fosters.assign({ animalId, fosterProfileId: fosterId, startDate: today })).result.fosterStayId;
      const occupancy = v.fosters.occupancy((await v.context.snapshot()).tables, fosterId);
      assert(occupancy.occupied === 1 && occupancy.capacity === 2 && occupancy.free === 1 && occupancy.animalIds[0] === animalId, 'Occupancy was not derived from the open stay');
      return occupancy;
    });
    await test('editing-active-foster-profile-keeps-current-occupancy-and-rejects-incompatibility', async () => {
      await v.fosters.updateProfile(fosterId, { totalCapacity: 3, availability: 'unavailable', restrictions: 'Avisar antes de nuevas entradas' });
      const capture = await v.context.snapshot(), occupancy = v.fosters.occupancy(capture.tables, fosterId);
      assert(occupancy.occupied === 1 && occupancy.free === 2, 'Editing profile lost current occupancy');
      const incompatible = await unchangedAfter(() => v.fosters.updateProfile(fosterId, { acceptedSpeciesIds: [option('species', 'cat')] }));
      const stale = await unchangedAfter(() => v.fosters.updateProfile(fosterId, { notes: 'Formulario antiguo' }, { expectedRevision: capture.globalRevision - 1 }));
      assert(stale === 'RevisionConflictError', 'Stale edit did not fail explicitly');
      return { occupancy, incompatible, stale };
    });
    await test('volunteer-hours-create-replay-edit-and-filter-period-from-stored-records', async () => {
      const command = { operationId: id() }, input = { volunteerProfileId: volunteerId, date: today, activity: 'Paseos', durationMinutes: 90, notes: 'Entrada sintética' };
      hourId = (await v.volunteers.logHours(input, command)).result.id;
      assert((await v.volunteers.logHours(input, command)).duplicate, 'Hours replay was not idempotent');
      outsideHourId = (await v.volunteers.logHours({ volunteerProfileId: volunteerId, date: '2020-01-01', activity: 'Limpieza histórica', durationMinutes: 30 })).result.id;
      await v.volunteers.editHours(hourId, { durationMinutes: 120, activity: 'Paseos y socialización' });
      const tables = (await v.context.snapshot()).tables, all = v.volunteers.totals(tables), period = v.volunteers.totals(tables, { volunteerProfileId: volunteerId, from: today, to: today });
      assert(all.minutes === 150 && all.entries === 2 && period.minutes === 120 && period.entries === 1 && all.byVolunteer[0].minutes === 150, 'Period totals do not match stored hours');
      assert(!('totalMinutes' in tables.volunteerProfiles[0]), 'A derived total was cached on the profile');
      return { all, period };
    });
    await test('inactive-profile-retains-hours-and-trash-restore-recalculates-totals', async () => {
      await v.volunteers.updateProfile(volunteerId, { status: 'inactive', availability: 'Sin nuevas tareas', functionIds: [option('volunteer_function', 'cleaning')] });
      await v.volunteers.trashHours(outsideHourId);
      let tables = (await v.context.snapshot()).tables;
      assert(v.volunteers.totals(tables).minutes === 120 && v.volunteers.list(tables, { status: 'inactive' })[0].contact.id === contactId, 'Inactive profile or trashed hours were mishandled');
      await v.volunteers.restoreHours(outsideHourId);
      const past = (await v.volunteers.logHours({ volunteerProfileId: volunteerId, date: today, activity: 'Apoyo ya realizado', durationMinutes: 15 })).result.id;
      tables = (await v.context.snapshot()).tables;
      assert(v.volunteers.totals(tables).minutes === 165, 'Inactive profile lost historic hours');
      const invalid = await unchangedAfter(() => v.volunteers.editHours(hourId, { durationMinutes: 0 }));
      return { past, minutes: 165, invalid };
    });
    await test('closing-foster-stay-releases-derived-occupancy-with-history-intact', async () => {
      await v.fosters.end({ fosterStayId: stayId, endDate: today, endReason: 'Regreso sintético', location: { kind: 'shelter', id: locationId } });
      const tables = (await v.context.snapshot()).tables, occupancy = v.fosters.occupancy(tables, fosterId);
      assert(occupancy.occupied === 0 && tables.fosterStays.length === 1 && tables.fosterStays[0].endDate === today && tables.animals[0].locationKind === 'shelter', 'Closing the stay deleted history or retained occupancy');
      return occupancy;
    });
    await test('profiles-hours-and-history-survive-full-backup-restoration', async () => {
      const before = await v.context.snapshot(), encoded = await v.backup.create(), decoded = await v.backup.verify(encoded.blob);
      await v.backup.restore(decoded, { confirmed: true, expectedRevision: before.globalRevision });
      const after = await s.repositories.snapshot(), rebased = { ...before, datasetId: after.datasetId, tables: Object.fromEntries(Object.entries(before.tables).map(([name, rows]) => [name, rows.map(row => ({ ...row, datasetId: after.datasetId }))])) };
      assert(await s.datasetManager.digest(rebased) === await s.datasetManager.digest(after), 'Backup changed profile or hours records');
      assert(v.volunteers.totals(after.tables).minutes === 165 && root.domain.validateDataset(after.tables, { datasetId: after.datasetId }).length === 0, 'Restored dataset is invalid');
      return { minutes: 165, fosterProfiles: after.tables.fosterProfiles.length, volunteerProfiles: after.tables.volunteerProfiles.length, hours: after.tables.volunteerHours.length, digest: await s.datasetManager.digest(after) };
    });
    report.passed = report.checks.length > 0 && report.checks.every(row => row.passed); report.completedAt = new Date().toISOString(); draw(); return report;
  }
  integration.ready = new URLSearchParams(location.search).has('peer') ? s.database.open() : run();
}());
