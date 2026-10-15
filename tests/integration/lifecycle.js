(function () {
  'use strict';
  const root = window.RescueManager, s = root.storage, v = root.services;
  const integration = root.integration = Object.assign({}, root.testObservations);
  const report = integration.report = { startedAt: new Date().toISOString(), userAgent: navigator.userAgent, checks: [], passed: false };
  const id = () => root.utils.ids.uuidV4(), today = root.utils.dates.today('UTC');
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  let catalog, locationId, contactId, fosterProfileId, animalId, applicationId, adoptionId, stayId, itemId;
  function draw() {
    document.getElementById('summary').textContent = report.passed ? 'Pruebas correctas' : 'Comprobaciones en curso o con errores';
    document.getElementById('checks').replaceChildren(...report.checks.map(check => {
      const li = document.createElement('li'); li.className = check.passed ? 'pass' : 'fail'; li.textContent = (check.passed ? '✓ ' : '✕ ') + check.id; return li;
    }));
    document.getElementById('details').textContent = JSON.stringify(report, null, 2);
  }
  async function test(name, work) {
    try { report.checks.push({ id: name, passed: true, evidence: await work() }); }
    catch (error) { report.checks.push({ id: name, passed: false, error: { name: error.name, message: error.message, details: error.details, stack: error.stack } }); }
    draw();
  }
  integration.snapshot = async () => {
    const capture = await s.repositories.snapshot();
    return capture ? { datasetId: capture.datasetId, dataRevision: capture.dataRevision, digest: await s.datasetManager.digest(capture) } : null;
  };
  async function run() {
    await test('organization-created-through-real-settings-with-local-catalogs', async () => {
      await s.database.open(); assert((await s.writeCoordinator.readActive()) === null, 'Test profile is not empty');
      const status = await v.settings.create({ name: 'Protectora ficticia de integración ñ 🐾', currencyCode: 'EUR', language: 'es', dateFormat: 'day_first', timeZone: 'UTC' });
      assert(status.canWrite, 'The test context did not acquire a writer lease');
      const capture = await v.context.snapshot(); catalog = capture.tables.catalogOptions;
      locationId = capture.tables.locations[0].id;
      return { datasetId: capture.datasetId, catalogs: catalog.length, canWrite: status.canWrite };
    });
    const option = (kind, code) => {
      const record = catalog.find(row => row.kind === kind && row.code === code); assert(record, 'Missing catalog fixture: ' + kind + '/' + code); return record.id;
    };
    await test('central-contact-and-foster-profile-committed-together', async () => {
      const saved = await v.context.execute('test.seedContact', { name: 'Persona ficticia' }, (data, h) => {
        const contact = h.create('contacts', { name: 'Persona ficticia', roles: ['adopter', 'foster', 'donor', 'veterinarian', 'supplier'], email: 'fixture@example.invalid' });
        const profile = h.create('fosterProfiles', { contactId: contact.id, totalCapacity: 2, acceptedSpeciesIds: [option('species', 'dog')], acceptedSizeIds: [option('size', 'medium')], availability: 'available' });
        const activity = h.create('activityLog', { operation: 'create', occurredAt: h.now, operationId: h.operationId, target: { type: 'contact', id: contact.id } });
        return { changes: [h.insert('contacts', contact), h.insert('fosterProfiles', profile), h.insert('activityLog', activity)], result: { contactId: contact.id, fosterProfileId: profile.id } };
      });
      contactId = saved.result.contactId; fosterProfileId = saved.result.fosterProfileId;
      const capture = await v.context.snapshot(); assert(capture.tables.contacts.length === 1 && capture.tables.fosterProfiles[0].contactId === contactId, 'Central relationship was not persisted');
      return saved.result;
    });
    await test('animal-entry-uses-atomic-sequence-and-idempotent-replay', async () => {
      const input = { animal: { name: 'Luna ficticia', speciesId: option('species', 'dog'), sizeId: option('size', 'medium') }, date: today,
        entryReason: 'Rescate sintético', location: { kind: 'shelter', id: locationId }, availability: 'available' };
      const command = { operationId: id() }, first = await v.animals.registerEntry(input, command), second = await v.animals.registerEntry(input, command);
      animalId = first.result.animalId;
      const capture = await v.context.snapshot();
      assert(second.duplicate && capture.tables.animals.length === 1 && capture.tables.stayEpisodes.length === 1, 'Entry replay duplicated a record');
      assert(capture.tables.animals[0].code === 'A-000001' && capture.animalSequence === 1, 'Atomic animal sequence was not advanced');
      return { animalId, code: capture.tables.animals[0].code, animalSequence: capture.animalSequence, duplicate: second.duplicate };
    });
    await test('foster-approval-and-reservation-use-distinct-related-records', async () => {
      stayId = (await v.fosters.assign({ animalId, fosterProfileId, startDate: today })).result.fosterStayId;
      applicationId = (await v.adoptions.createApplication({ animalId, contactId, applicationDate: today })).result.applicationId;
      await v.adoptions.approve({ applicationId, approvalDate: today });
      let capture = await v.context.snapshot(); assert(capture.tables.adoptions.length === 0 && capture.tables.reservations.length === 0, 'Approval adopted or reserved implicitly');
      await v.adoptions.reserve({ applicationId, reservationDate: today, expiresOn: today });
      capture = await v.context.snapshot(); assert(capture.tables.animals[0].locationKind === 'foster' && capture.tables.animals[0].adoptionAvailability === 'reserved', 'Location and availability were mixed');
      return { stayId, applicationId, reservationId: capture.tables.reservations[0].id };
    });
    await test('adoption-closes-foster-episode-reservation-with-one-income-and-explicit-followup', async () => {
      const followup = await v.tasks.create({ title: 'Seguimiento ficticio', dueDate: today, animalId, typeId: option('task_type', 'adoption_followup') });
      const input = { applicationId, adoptionDate: today, fosterEndReason: 'Adopción ficticia formalizada', reservationClosureReason: 'Adopción ficticia formalizada',
        taskDecisions: { keep: [followup.result.id], cancel: [] }, fee: { categoryId: option('finance_income', 'adoption'), concept: 'Aportación ficticia de adopción', amountMinor: 10000 } };
      const command = { operationId: id() }, saved = await v.adoptions.complete(input, command);
      const replay = await v.adoptions.complete(input, command); adoptionId = saved.result.adoptionId;
      const data = (await v.context.snapshot()).tables;
      assert(replay.duplicate && data.adoptions.length === 1 && data.financialMovements.length === 1, 'Adoption retry duplicated its income');
      assert(data.fosterStays.find(row => row.id === stayId).endDate === today && data.stayEpisodes[0].exitReason === 'adoption', 'Operational stays remained open');
      assert(data.reservations[0].status === 'fulfilled' && data.adoptionApplications[0].status === 'completed' && data.animals[0].managementStatus === 'adopted', 'Adoption state was not coordinated');
      assert(data.tasks.find(row => row.id === followup.result.id).status === 'pending', 'The explicit follow-up decision was ignored');
      return { adoptionId, financialMovementId: saved.result.financialMovementId, duplicate: replay.duplicate };
    });
    await test('return-preserves-adoption-and-creates-new-open-episode', async () => {
      const result = await v.adoptions.returnAdoption({ adoptionId, returnDate: today, reason: 'Devolución sintética', location: { kind: 'shelter', id: locationId }, availability: 'available' });
      const data = (await v.context.snapshot()).tables;
      assert(data.adoptions.length === 1 && data.adoptions[0].returnDate === today && data.stayEpisodes.length === 2, 'Return destroyed previous history');
      assert(data.stayEpisodes.filter(row => !row.exitDate).length === 1 && data.animals[0].managementStatus === 'under_care', 'Return did not create one current episode');
      assert(data.stayEpisodes.find(row => row.id === result.result.episodeId).returnedFromAdoptionId === adoptionId, 'Return episode lost adoption reference');
      return result.result;
    });
    await test('monetary-and-material-donations-create-one-income-and-stock-per-line', async () => {
      const moneyInput = { date: today, donorContactId: contactId, categoryId: option('finance_income', 'donation'), concept: 'Donación ficticia', amountMinor: 2500 };
      const command = { operationId: id() }, monetary = await v.donations.createMonetary(moneyInput, command);
      assert((await v.donations.createMonetary(moneyInput, command)).duplicate, 'Donation replay did not reuse its income');
      itemId = (await v.inventory.createItem({ name: 'Pienso ficticio', categoryId: option('inventory_category', 'food'), unitId: option('unit', 'pack'), quantityPrecision: 0, minimumStockScaled: 10, supplierContactId: contactId })).result.id;
      const material = await v.donations.createMaterial({ date: today, donorContactId: contactId, lines: [{ materialTypeId: option('material_type', 'food'), description: 'Paquetes ficticios',
        quantityScaled: 20, quantityPrecision: 0, unitId: option('unit', 'pack'), inventoryItemId: itemId, estimatedValueMinor: 6000 }] });
      await v.inventory.move({ itemId, date: today, type: 'consumption', deltaScaled: -5, reason: 'Consumo ficticio' });
      const data = (await v.context.snapshot()).tables, totals = v.finance.totals(data.financialMovements), stock = v.inventory.stock(data, itemId);
      assert(totals.incomeMinor === 12500 && stock.quantityScaled === 15, 'Material donation altered monetary totals or stock was duplicated');
      assert(data.donationLines.length === 1 && data.inventoryMovements.filter(row => row.donationLineId).length === 1, 'A material line produced duplicate stock movements');
      return { monetary: monetary.result.id, material: material.result.id, totals, stock };
    });
    await test('negative-stock-rejection-leaves-real-indexeddb-unchanged', async () => {
      const before = await integration.snapshot(); let rejected = null;
      try { await v.inventory.move({ itemId, date: today, type: 'consumption', deltaScaled: -100, reason: 'Salida inválida de prueba' }); } catch (error) { rejected = error.name; }
      assert(rejected === 'ValidationError' && before.digest === (await integration.snapshot()).digest, 'Rejected stock write changed persisted data');
      return { rejected, unchanged: true };
    });
    await test('performed-health-act-completes-task-and-shares-a-single-expense', async () => {
      const task = await v.tasks.create({ title: 'Vacuna ficticia prevista', dueDate: today, animalId, typeId: option('task_type', 'vaccination') });
      const input = { animalId, type: 'vaccination', date: today, title: 'Vacuna ficticia realizada', veterinarianContactId: contactId };
      const options = { completeTaskId: task.result.id, expense: { categoryId: option('finance_expense', 'veterinary'), concept: 'Gasto veterinario ficticio', amountMinor: 3000, contactId } };
      const command = { operationId: id() }, saved = await v.health.record(input, options, command);
      assert((await v.health.record(input, options, command)).duplicate, 'Health replay did not reuse the performed act');
      const data = (await v.context.snapshot()).tables, record = data.veterinaryRecords[0], totals = v.finance.totals(data.financialMovements);
      assert(data.veterinaryRecords.length === 1 && data.tasks.find(row => row.id === task.result.id).status === 'completed', 'Performed act did not complete its unique task');
      assert(data.financialMovements.filter(row => row.direction === 'expense').length === 1 && record.expenseMovementId === saved.result.expenseMovementId, 'Clinical cost was duplicated');
      assert(totals.incomeMinor === 12500 && totals.expenseMinor === 3000 && totals.balanceMinor === 9500, 'Cross-module totals differ from source movements');
      return { clinical: saved.result.id, expenseMovementId: record.expenseMovementId, totals };
    });
    await test('embedded-document-is-prepared-outside-transactions-and-related-to-animal', async () => {
      const blob = new Blob(['Documento ficticio ñ\nsegunda línea'], { type: 'text/plain' }), sha256 = await root.utils.integrity.sha256(blob);
      const result = await v.context.execute('test.document', { animalId, sha256 }, (data, h) => {
        const asset = h.create('assets', { type: 'embedded_document', originalName: 'ficticio.txt', mime: blob.type, byteLength: blob.size, sha256, blob });
        const document = h.create('documents', { title: 'Documento ficticio', typeId: option('document_type', 'general'), date: today, mode: 'embedded', assetId: asset.id });
        const link = h.create('documentLinks', { documentId: document.id, entityType: 'animal', entityId: animalId });
        return { changes: [h.insert('assets', asset), h.insert('documents', document), h.insert('documentLinks', link)], result: { assetId: asset.id } };
      });
      return { ...result.result, byteLength: blob.size, sha256 };
    });
    await test('full-service-dataset-backup-verifies-roundtrip-and-all-business-totals', async () => {
      const before = await v.context.snapshot(), encoded = await v.backup.create(), decoded = await v.backup.verify(encoded.blob);
      assert(await s.datasetManager.digest(before) === await s.datasetManager.digest(decoded), 'Full service backup changed records, references or blobs');
      const state = (await v.backup.list()).find(row => row.backupId === encoded.container.content.backupId);
      assert(state.state === 'verified', 'Self-verified backup receipt was not persisted');
      assert(root.domain.validateDataset(decoded.tables, { datasetId: decoded.datasetId, today }).length === 0, 'Decoded services dataset failed domain integrity');
      assert(v.finance.totals(decoded.tables.financialMovements).balanceMinor === 9500 && v.inventory.stock(decoded.tables, itemId).quantityScaled === 15, 'Backup changed computed business totals');
      return { summary: encoded.summary, digest: await s.datasetManager.digest(decoded), verified: state.state, dataRevision: before.dataRevision };
    });
    report.passed = report.checks.every(row => row.passed); report.completedAt = new Date().toISOString(); draw(); return report;
  }
  integration.ready = new URLSearchParams(location.search).has('peer') ? s.database.open() : run();
}());
