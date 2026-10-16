(function () {
  'use strict';
  const root = window.RescueManager, s = root.storage, v = root.services;
  const integration = root.integration = Object.assign({}, root.testObservations);
  const report = integration.report = { startedAt: new Date().toISOString(), checks: [], passed: false };
  const today = root.utils.dates.today('UTC'), id = () => root.utils.ids.uuidV4();
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  let animalId, contactId, typeId, png, textId, pdfId, externalId, firstPhoto, latestWeightId;
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
  const metadata = extra => ({ title: 'Documento sintético ñ 🐾', typeId, date: today, notes: 'Prueba offline\nSegunda línea', ...extra });
  async function makePng() {
    const canvas = document.createElement('canvas'); canvas.width = 1800; canvas.height = 700;
    const context = canvas.getContext('2d'); assert(context, 'Canvas unavailable');
    context.fillStyle = '#e0d7c2'; context.fillRect(0, 0, 1800, 700);
    context.fillStyle = '#265e51'; context.fillRect(100, 100, 600, 500);
    context.fillStyle = '#d68b3c'; context.beginPath(); context.arc(1300, 350, 230, 0, Math.PI * 2); context.fill();
    const blob = await new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('PNG encoding failed')), 'image/png'));
    return new File([blob], 'foto-sintetica.png', { type: 'image/png' });
  }
  function makePdf() {
    // Complete small PDF built locally; the application checks its envelope and downloads bytes,
    // and never embeds or executes it. This test does not assert PDF viewer compatibility.
    const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>', '<< /Length 0 >>\nstream\n\nendstream'];
    let text = '%PDF-1.4\n', offsets = [0];
    objects.forEach((object, index) => { offsets.push(text.length); text += (index + 1) + ' 0 obj\n' + object + '\nendobj\n'; });
    const xref = text.length;
    text += 'xref\n0 5\n0000000000 65535 f \n' + offsets.slice(1).map(offset => String(offset).padStart(10, '0') + ' 00000 n \n').join('');
    text += 'trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
    return new File([text], 'sintetico.pdf', { type: 'application/pdf' });
  }
  async function run() {
    let heartbeat;
    try {
      await test('media-start-with-real-organization-animal-and-contact', async () => {
        await s.database.open(); assert((await s.writeCoordinator.readActive()) === null, 'Fixture profile was not empty');
        await v.settings.create({ name: 'Recursos sintéticos ñ 🐾', currencyCode: 'EUR', dateFormat: 'iso', timeZone: 'UTC', language: 'es' });
        heartbeat = setInterval(() => v.context.renew().catch(error => integration.runtimeErrors.push({ message: error.message })), root.config.leaseRenewMs);
        const snapshot = await v.context.snapshot(), catalog = snapshot.tables.catalogOptions;
        typeId = catalog.find(row => row.kind === 'document_type').id;
        animalId = (await v.animals.registerEntry({ animal: { name: 'Luna de recursos', speciesId: catalog.find(row => row.kind === 'species' && row.code === 'dog').id },
          date: today, entryReason: 'Prueba sintética', location: { kind: 'shelter', id: snapshot.tables.locations[0].id }, availability: 'available' })).result.animalId;
        contactId = (await v.contacts.create({ name: 'Contacto ficticio de documentación', email: 'media@example.invalid', roles: [] })).result.id;
        return { datasetId: snapshot.datasetId, animalId, contactId };
      });
      await test('real-png-is-decoded-resized-reencoded-and-saved-with-derived-thumbnail-atomically', async () => {
        png = await makePng();
        const command = { operationId: id() };
        firstPhoto = (await v.photos.set(animalId, png, command)).result;
        const replay = await v.photos.set(animalId, png, command), tables = (await v.context.snapshot()).tables;
        const photo = tables.assets.find(row => row.id === firstPhoto.photoAssetId), thumbnail = tables.assets.find(row => row.id === firstPhoto.thumbnailAssetId);
        assert(replay.duplicate && tables.assets.length === 2, 'Retry duplicated photo resources');
        assert(photo.width === 1600 && photo.height < 700 && thumbnail.width === 320, 'Real PNG was not resized');
        assert(photo.byteLength <= 1024 * 1024 && thumbnail.byteLength <= 1024 * 1024 && thumbnail.derivedFromAssetId === photo.id, 'Prepared outputs violate byte limits or parent relation');
        const read = await v.photos.read(thumbnail.id), url = URL.createObjectURL(read.blob);
        try {
          const image = new Image(); image.src = url; await image.decode();
          assert(image.naturalWidth === thumbnail.width && image.naturalHeight === thumbnail.height, 'Validated preview could not be decoded');
        } finally { URL.revokeObjectURL(url); }
        return { input: { width: 1800, height: 700, bytes: png.size }, photo: { mime: photo.mime, width: photo.width, height: photo.height, bytes: photo.byteLength },
          thumbnail: { mime: thumbnail.mime, width: thumbnail.width, height: thumbnail.height, bytes: thumbnail.byteLength }, replay: replay.duplicate, objectUrlRevoked: true };
      });
      await test('real-logo-and-photo-replacement-retain-previous-resources', async () => {
        const logoId = (await v.photos.setOrganizationLogo(png)).result.logoAssetId;
        await v.photos.set(animalId, png);
        const tables = (await v.context.snapshot()).tables, animal = tables.animals.find(row => row.id === animalId);
        assert(tables.organizationSettings[0].logoAssetId === logoId && tables.assets.find(row => row.id === logoId).type === 'logo', 'Logo is not a stored image asset');
        assert(tables.assets.length === 5 && animal.photoAssetId !== firstPhoto.photoAssetId && tables.assets.some(row => row.id === firstPhoto.photoAssetId && !row.deletedAt), 'Replacement deleted old photo resources');
        await v.photos.read(logoId);
        return { assets: tables.assets.length, replacedPhotoKept: true, logoId };
      });
      await test('txt-and-pdf-incorporate-validated-bytes-with-animal-contact-links-and-source-event', async () => {
        const text = new File(['Documento ficticio ñ 🐾\nSegunda línea'], 'sintetico.txt', { type: 'text/plain' });
        const command = { operationId: id() }, input = metadata({ links: [{ entityType: 'animal', entityId: animalId }, { entityType: 'contact', entityId: contactId }] });
        textId = (await v.documents.createEmbedded(input, text, command)).result.id;
        assert((await v.documents.createEmbedded(input, text, command)).duplicate, 'Document replay was not idempotent');
        const pdf = makePdf(); pdfId = (await v.documents.createEmbedded(metadata({ title: 'PDF sintético descargable' }), pdf)).result.id;
        const textResource = await v.documents.download(textId), pdfResource = await v.documents.download(pdfId), tables = (await v.context.snapshot()).tables;
        assert(await textResource.blob.text() === await text.text() && pdfResource.mime === 'application/pdf', 'Document bytes changed during incorporation');
        assert(await root.utils.integrity.sha256(pdf) === pdfResource.sha256, 'PDF hash changed');
        assert(tables.documentLinks.filter(row => row.documentId === textId).length === 2 && tables.animalEvents.filter(row => row.type === 'document' && row.source.id === textId).length === 1, 'Links or document event were duplicated or omitted');
        assert(!document.querySelector('object,iframe,embed'), 'A PDF was embedded as active content');
        return { documents: tables.documents.length, textBytes: textResource.byteLength, pdfBytes: pdfResource.byteLength, links: 2, eventCount: 1, noEmbeddedPdf: true };
      });
      await test('external-file-reselection-compares-hash-and-never-embeds-or-opens-external-path', async () => {
        const selected = new File(['Archivo externo ficticio'], 'referencia.docx', { type: 'application/octet-stream' });
        externalId = (await v.documents.createExternal(metadata({ externalFileName: selected.name, externalLocation: 'Carpeta externa del usuario', externalFileType: 'Word',
          originalSha256: await root.utils.integrity.sha256(selected) }))).result.id;
        const match = await v.documents.compareExternal(externalId, selected), mismatch = await v.documents.compareExternal(externalId, new File(['diferente'], 'otro.docx'));
        const error = await unchangedAfter(() => v.documents.download(externalId)), tables = (await v.context.snapshot()).tables;
        assert(match.matches === true && mismatch.matches === false && error === 'ExternalReferenceError', 'External hash comparison or download restriction failed');
        assert(tables.documents.find(row => row.id === externalId).assetId === null && tables.assets.length === 7, 'External reference embedded bytes');
        return { match: match.matches, mismatch: mismatch.matches, error, referenceOnly: true };
      });
      await test('broken-relation-invalid-files-and-stale-revision-leave-no-partial-files-or-links', async () => {
        const errors = [];
        errors.push(await unchangedAfter(() => v.documents.createEmbedded(metadata({ links: [{ entityType: 'animal', entityId: id() }] }), new File(['ok'], 'ok.txt', { type: 'text/plain' }))));
        errors.push(await unchangedAfter(() => v.documents.createEmbedded(metadata(), new File(['<!doctype html><html>unsafe</html>'], 'unsafe.txt', { type: 'text/plain' }))));
        errors.push(await unchangedAfter(() => v.photos.set(animalId, new File(['not a PNG'], 'unsafe.png', { type: 'image/png' }))));
        const capture = await v.context.snapshot();
        errors.push(await unchangedAfter(() => v.documents.update(textId, { title: 'Obsolete' }, { expectedRevision: capture.globalRevision - 1 })));
        assert(errors.includes('RevisionConflictError'), 'Stale form was not explicitly rejected');
        return { errors, datasetUnchanged: true };
      });
      await test('configured-budget-is-checked-before-a-write-and-keeps-all-existing-resources', async () => {
        const original = root.config, used = (await v.context.snapshot()).tables.assets.reduce((sum, row) => sum + row.byteLength, 0);
        let error;
        // Deterministic budget boundary injection avoids claiming that this small fixture exhausts
        // an actual browser quota. The production 64 MiB boundary is tested in Node separately.
        root.config = Object.freeze({ ...original, limits: Object.freeze({ ...original.limits, embeddedAssetBytes: used }) });
        try { error = await unchangedAfter(() => v.documents.createEmbedded(metadata(), new File(['one more byte'], 'budget.txt', { type: 'text/plain' }))); }
        finally { root.config = original; }
        assert(error === 'AssetBudgetError' && root.config.limits.embeddedAssetBytes === 64 * 1024 * 1024, 'Budget check failed or production budget was not restored');
        return { injectedBudgetBytes: used, additionalRejectedBytes: 13, error, actualBrowserQuotaNotExhausted: true };
      });
      await test('document-archive-trash-and-link-reactivation-preserve-bytes-and-source-history', async () => {
        const before = (await v.context.snapshot()).tables, link = before.documentLinks.find(row => row.documentId === textId && row.entityType === 'animal');
        await v.documents.unlink(link.id); await v.documents.link(textId, { entityType: 'animal', entityId: animalId });
        await v.documents.archive(textId); assert(v.documents.list((await v.context.snapshot()).tables).every(row => row.id !== textId), 'Archive remains in active list');
        await v.documents.unarchive(textId); await v.documents.trash(textId);
        let tables = (await v.context.snapshot()).tables;
        assert(v.documents.list(tables, { trash: true })[0].id === textId && tables.documentLinks.length === 2 && tables.assets.length === before.assets.length, 'Trash removed relationships or bytes');
        await v.documents.restore(textId); tables = (await v.context.snapshot()).tables;
        assert(tables.documentLinks.find(row => row.id === link.id).revision === 3 && !tables.documentLinks.find(row => row.id === link.id).deletedAt, 'Relink created a duplicate instead of reactivating the same identity');
        return { links: tables.documentLinks.length, assets: tables.assets.length, originalLinkIdPreserved: true };
      });
      await test('real-persisted-weight-measurements-derive-latest-and-reject-invalid-or-stale-input', async () => {
        const first = (await v.weights.record({ animalId, date: '2020-01-01', grams: 8400 })).result.id;
        latestWeightId = (await v.weights.record({ animalId, date: today, grams: 9200, notes: 'Peso medido' })).result.id;
        await v.weights.record({ animalId, date: '2021-01-01', grams: 8800 });
        assert(v.weights.latest((await v.context.snapshot()).tables, animalId).id === latestWeightId, 'Insertion order replaced latest measurement');
        const errors = [await unchangedAfter(() => v.weights.record({ animalId, date: today, grams: 0 })), await unchangedAfter(() => v.weights.record({ animalId, date: '2020-02-30', grams: 9000 }))];
        await v.weights.trash(latestWeightId);
        assert(v.weights.latest((await v.context.snapshot()).tables, animalId).date === '2021-01-01', 'Trashed weight remains current');
        await v.weights.restore(latestWeightId); await v.weights.update(first, { grams: 8500 });
        const tables = (await v.context.snapshot()).tables;
        assert(v.weights.latest(tables, animalId).grams === 9200 && !('grams' in tables.animals[0]), 'Weight is duplicated on the animal or latest changed incorrectly');
        return { latestGrams: 9200, measurements: tables.weightMeasurements.length, invalidErrors: errors };
      });
      await test('all-photos-documents-links-external-reference-and-weights-survive-full-backup-restoration', async () => {
        const before = await v.context.snapshot(), encoded = await v.backup.create(), decoded = await v.backup.verify(encoded.blob);
        assert(decoded.summary.embeddedAssetCount === 7 && decoded.summary.externalReferenceCount === 1, 'Backup manifest omitted resources or external references');
        await v.backup.restore(decoded, { confirmed: true, expectedRevision: before.globalRevision });
        const after = await s.repositories.snapshot(), rebased = { ...before, datasetId: after.datasetId, tables: Object.fromEntries(Object.entries(before.tables).map(([name, rows]) => [name, rows.map(row => ({ ...row, datasetId: after.datasetId }))])) };
        const expectedDigest = await s.datasetManager.digest(rebased), actualDigest = await s.datasetManager.digest(after);
        assert(expectedDigest === actualDigest, 'Restoration changed records or binary hashes');
        assert(root.domain.validateDataset(after.tables, { datasetId: after.datasetId }).length === 0, 'Restored dataset is invalid');
        await v.documents.download(textId); await v.documents.download(pdfId); await v.photos.read(firstPhoto.thumbnailAssetId);
        assert(v.weights.latest(after.tables, animalId).id === latestWeightId, 'Restoration changed latest derived weight');
        return { embeddedAssets: after.tables.assets.length, embeddedBytes: decoded.summary.embeddedAssetBytes, externalReferences: decoded.summary.externalReferenceCount,
          documents: after.tables.documents.length, links: after.tables.documentLinks.length, measurements: after.tables.weightMeasurements.length, digest: actualDigest, bytesVerified: true };
      });
    } finally { if (heartbeat) clearInterval(heartbeat); }
    report.passed = report.checks.length > 0 && report.checks.every(row => row.passed); report.completedAt = new Date().toISOString(); draw(); return report;
  }
  integration.ready = new URLSearchParams(location.search).has('peer') ? s.database.open() : run();
}());
