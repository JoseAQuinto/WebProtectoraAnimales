(function (root) {
  'use strict';
  const d = root.domain;
  const { issue, finish, present, own, appendIssue } = d.validationInternals;
  function validateDataset(tables, options = {}) {
    const errors = [];
    const inspectRecord = d.validationInternals.inspectDataset(tables, errors);
    if (!tables || typeof tables !== 'object' || Array.isArray(tables) || (typeof Blob !== 'undefined' && tables instanceof Blob)) appendIssue(errors, issue('@dataset', null, '', 'dataset.object', 'dataset.object'));
    if (errors.length) return finish(errors, options);
    const add = (table, record, path, code) => appendIssue(errors, issue(table, record, path, code, code));
    const rows = Object.create(null), maps = Object.create(null), valid = Object.create(null);
    Object.keys(tables).forEach(table => { if (!own(d.schemas, table)) add(table, null, '', 'table.unknown'); });
    let count = 0; const datasets = new Set();
    d.tableNames.forEach(table => {
      rows[table] = own(tables, table) ? tables[table] : [];
      if (!Array.isArray(rows[table])) { add(table, null, '', 'table.array'); rows[table] = []; }
      count += rows[table].length; maps[table] = new Map(); valid[table] = [];
    });
    if (count > 200000) add('@dataset', null, '', 'dataset.recordLimit');
    if (errors.length) return finish(errors, options);
    const organizations = rows.organizationSettings;
    const context = Object.assign({}, options, { throwOnError: false });
    if (!context.timeZone && organizations.length === 1 && typeof organizations[0].timeZone === 'string') context.timeZone = organizations[0].timeZone;
    if (options.today !== undefined) context.today = d.validationInternals.today(options);
    else {
      try { context.today = d.validationInternals.today(context); }
      catch (_) { context.today = root.utils.dates.today('UTC'); }
    }
    d.tableNames.forEach(table => rows[table].forEach(record => {
      const recordErrors = inspectRecord(table, record, context); recordErrors.forEach(error => appendIssue(errors, error));
      if (!recordErrors.length) {
        valid[table].push(record); datasets.add(record.datasetId);
        const key = record.datasetId + '/' + record.id;
        if (maps[table].has(key)) add(table, record, 'id', 'record.duplicateId');
        else maps[table].set(key, record);
      }
    }));
    if (datasets.size > 1) add('@dataset', null, 'datasetId', 'dataset.multiple');
    if ((!options.allowEmpty || count > 0) && organizations.length !== 1) add('organizationSettings', null, '', 'organization.exactlyOne');
    // Relations are checked for all structurally valid rows, including archive and trash.
    const get = (table, record, id) => present(id) ? maps[table].get(record.datasetId + '/' + id) : null;
    function reference(table, record, targetTable, id, path, kind) {
      if (!present(id)) return null;
      const target = get(targetTable, record, id);
      if (!target) add(table, record, path, 'reference.missing');
      else if (kind && target.kind !== kind) add(table, record, path, 'reference.catalogKind');
      return target;
    }
    function fieldRefs(table, record, field, value, path) {
      if (!present(value)) return;
      if (field.ref) reference(table, record, field.ref.table, value, path, field.ref.kind);
      if (field.originRef) reference(table, record, d.entityTables[value.type], value.id, path + '.id');
      if (field.type === 'array') value.forEach((item, index) => fieldRefs(table, record, field.items, item, path + '.' + index));
      if (field.type === 'object') d.validationInternals.entries(field.fields).forEach(([key, child]) => fieldRefs(table, record, child, value[key], path + '.' + key));
    }
    d.tableNames.forEach(table => {
      const fields = d.validationInternals.entries(d.schemas[table].fields);
      valid[table].forEach(record => fields.forEach(([key, field]) => fieldRefs(table, record, field, record[key], key)));
      d.schemas[table].indexes.filter(index => index.unique).forEach(index => {
        const seen = new Set();
        valid[table].forEach(record => {
          const values = index.keyPath.map(key => record[key]);
          if (values.some(value => !present(value))) return;
          const signature = JSON.stringify(values);
          if (seen.has(signature)) add(table, record, index.keyPath.slice(1).join(','), 'unique.' + index.name);
          seen.add(signature);
        });
      });
    });
    function dynamicReferences(table, typeField, idField) {
      valid[table].forEach(record => reference(table, record, d.entityTables[record[typeField]], record[idField], idField));
    }
    dynamicReferences('documentLinks', 'entityType', 'entityId'); dynamicReferences('importIdentityMap', 'entityType', 'entityId');
    function cycles(table, field) {
      const done = new Set();
      valid[table].forEach(record => {
        const visited = new Set(); let cursor = record;
        while (cursor && !done.has(cursor.id)) {
          if (visited.has(cursor.id)) { add(table, record, field, 'reference.cycle'); break; }
          visited.add(cursor.id); cursor = get(table, cursor, cursor[field]);
        }
        visited.forEach(id => done.add(id));
      });
    }
    [['locations', 'parentLocationId'], ['contacts', 'mergedIntoContactId'], ['assets', 'derivedFromAssetId'],
      ['financialMovements', 'correctsMovementId'], ['animalEvents', 'correctsEventId'],
      ['inventoryMovements', 'compensatesMovementId']].forEach(([table, field]) => cycles(table, field));
    const group = (table, field) => {
      const groups = new Map();
      valid[table].forEach(record => { const key = record[field]; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(record); });
      return groups;
    };
    const episodes = group('stayEpisodes', 'animalId'), stays = group('fosterStays', 'animalId'), reservations = group('reservations', 'animalId');
    const adoptions = group('adoptions', 'animalId'), lines = group('donationLines', 'donationId');
    const adoptedByApplication = group('adoptions', 'applicationId'), returnedByAdoption = group('stayEpisodes', 'returnedFromAdoptionId');
    function intervals(table, groups, start, end) {
      groups.forEach(records => {
        const sorted = records.slice().sort((a, b) => a[start].localeCompare(b[start]) || a.id.localeCompare(b.id));
        let furthest = null, openCount = 0;
        sorted.forEach(record => {
          if (!present(record[end])) openCount++;
          // Zero-day historical intervals are empty; an open interval still counts as open.
          if (record[end] === record[start]) return;
          if (furthest && (!present(furthest[end]) || record[start] < furthest[end])) add(table, record, start, 'interval.overlap');
          if (!furthest || !present(record[end]) || (present(furthest[end]) && record[end] > furthest[end])) furthest = record;
        });
        if (openCount > 1) add(table, sorted[0], end, 'interval.multipleOpen');
      });
    }
    intervals('stayEpisodes', episodes, 'entryDate', 'exitDate'); intervals('fosterStays', stays, 'startDate', 'endDate');
    valid.animals.forEach(animal => {
      const history = episodes.get(animal.id) || [], open = history.filter(row => !row.exitDate);
      const currentStays = (stays.get(animal.id) || []).filter(row => !row.endDate);
      const currentReservations = (reservations.get(animal.id) || []).filter(row => row.status === 'active');
      // Sequence-shaped codes must leave room for the next automatic code.
      if (/^A-\d{16,}$/.test(animal.code)) add('animals', animal, 'code', 'animal.codeSequence');
      if ((animal.managementStatus === 'under_care') !== (open.length === 1)) add('animals', animal, 'managementStatus', 'animal.episodeState');
      if (history.filter(row => row.entryType === 'first_entry').length > 1) add('animals', animal, 'id', 'episode.multipleFirstEntry');
      if (history.some(row => animal.birthDate && row.entryDate < animal.birthDate)) add('animals', animal, 'birthDate', 'animal.entryBeforeBirth');
      if ((animal.locationKind === 'foster') !== (currentStays.length === 1)) add('animals', animal, 'locationKind', 'animal.fosterState');
      if ((animal.adoptionAvailability === 'reserved') !== (currentReservations.length === 1)) add('animals', animal, 'adoptionAvailability', 'animal.reservationState');
      if (currentReservations.length > 1) add('animals', animal, 'adoptionAvailability', 'reservation.multipleActive');
      if (animal.managementStatus !== 'under_care' && (open.length || currentStays.length || currentReservations.length)) add('animals', animal, 'managementStatus', 'animal.activeRelations');
      if (animal.managementStatus === 'adopted' && !(adoptions.get(animal.id) || []).some(row => !row.returnDate)) add('animals', animal, 'managementStatus', 'animal.adoptionMissing');
      if (animal.deceasedOn && history.some(row => row.entryDate > animal.deceasedOn || (row.exitDate && row.exitDate > animal.deceasedOn))) add('animals', animal, 'deceasedOn', 'animal.deathBeforeEpisode');
      const photo = get('assets', animal, animal.photoAssetId), thumb = get('assets', animal, animal.thumbnailAssetId);
      if (photo && photo.type !== 'photo') add('animals', animal, 'photoAssetId', 'asset.type');
      if (thumb && (thumb.type !== 'thumbnail' || thumb.derivedFromAssetId !== animal.photoAssetId)) add('animals', animal, 'thumbnailAssetId', 'asset.thumbnailParent');
    });
    valid.stayEpisodes.forEach(episode => {
      const adoption = get('adoptions', episode, episode.adoptionId), returned = get('adoptions', episode, episode.returnedFromAdoptionId);
      if (adoption && (adoption.animalId !== episode.animalId || adoption.episodeId !== episode.id || adoption.adoptionDate !== episode.exitDate)) add('stayEpisodes', episode, 'adoptionId', 'episode.adoptionMismatch');
      if (returned && (returned.animalId !== episode.animalId || returned.returnDate !== episode.entryDate || returned.episodeId === episode.id)) add('stayEpisodes', episode, 'returnedFromAdoptionId', 'episode.returnMismatch');
      const animal = get('animals', episode, episode.animalId);
      if (episode.exitReason === 'deceased' && animal && (animal.managementStatus !== 'deceased' || animal.deceasedOn !== episode.exitDate)) add('stayEpisodes', episode, 'exitReason', 'episode.deathMismatch');
    });
    const profileOccupancy = new Map();
    // Stays without a recorded exception must fit the capacity; exception stays are the documented overflow.
    valid.fosterStays.forEach(stay => { if (!stay.endDate && !stay.exceptionReason) profileOccupancy.set(stay.fosterProfileId, (profileOccupancy.get(stay.fosterProfileId) || 0) + 1); });
    valid.fosterStays.forEach(stay => {
      const episode = get('stayEpisodes', stay, stay.episodeId), animal = get('animals', stay, stay.animalId), profile = get('fosterProfiles', stay, stay.fosterProfileId);
      if (episode && (episode.animalId !== stay.animalId || stay.startDate < episode.entryDate || (episode.exitDate && (!stay.endDate || stay.endDate > episode.exitDate)))) add('fosterStays', stay, 'episodeId', 'foster.episodeBounds');
      if (profile && animal && !stay.endDate) {
        const occupancy = profileOccupancy.get(profile.id) || 0;
        // Availability describes new placements (checked by fosters.assign), not animals already hosted.
        const incompatible = !profile.acceptedSpeciesIds.includes(animal.speciesId) || !animal.sizeId || !profile.acceptedSizeIds.includes(animal.sizeId) || occupancy > profile.totalCapacity;
        if (incompatible && !stay.exceptionReason) add('fosterStays', stay, 'exceptionReason', 'foster.exceptionRequired');
      }
    });
    [['fosterProfiles', 'foster'], ['volunteerProfiles', 'volunteer']].forEach(([table, role]) => valid[table].forEach(profile => {
      const contact = get('contacts', profile, profile.contactId);
      if (contact && (!contact.roles.includes(role) || contact.mergedIntoContactId)) add(table, profile, 'contactId', 'contact.role');
    }));
    function role(table, record, field, requiredRole) {
      const contact = get('contacts', record, record[field]);
      if (contact && !contact.roles.includes(requiredRole)) add(table, record, field, 'contact.role');
    }
    valid.reservations.forEach(reservation => {
      const application = get('adoptionApplications', reservation, reservation.applicationId);
      if (application && (application.animalId !== reservation.animalId || !application.approvalDate || reservation.reservationDate < application.approvalDate ||
        (reservation.status === 'active' && application.status !== 'approved') || (reservation.status === 'fulfilled' && application.status !== 'completed'))) add('reservations', reservation, 'applicationId', 'reservation.applicationMismatch');
    });
    // Adoption and return intervals also exclude incompatible historical adoptions.
    intervals('adoptions', adoptions, 'adoptionDate', 'returnDate');
    valid.adoptions.forEach(adoption => {
      const application = get('adoptionApplications', adoption, adoption.applicationId), episode = get('stayEpisodes', adoption, adoption.episodeId);
      if (application && (application.animalId !== adoption.animalId || application.contactId !== adoption.adopterContactId || application.status !== 'completed' ||
        !application.approvalDate || adoption.adoptionDate < application.approvalDate)) add('adoptions', adoption, 'applicationId', 'adoption.applicationMismatch');
      if (episode && (episode.animalId !== adoption.animalId || episode.adoptionId !== adoption.id || episode.exitReason !== 'adoption' ||
        episode.exitDate !== adoption.adoptionDate || adoption.adoptionDate < episode.entryDate)) add('adoptions', adoption, 'episodeId', 'adoption.episodeMismatch');
      const returns = returnedByAdoption.get(adoption.id) || [];
      if ((adoption.returnDate && returns.length !== 1) || (!adoption.returnDate && returns.length)) add('adoptions', adoption, 'returnDate', 'adoption.returnEpisode');
      const animal = get('animals', adoption, adoption.animalId);
      if (!adoption.returnDate && animal && animal.managementStatus === 'under_care') add('adoptions', adoption, 'returnDate', 'adoption.returnMissing');
      if (animal && animal.deceasedOn && adoption.adoptionDate > animal.deceasedOn) add('adoptions', adoption, 'adoptionDate', 'adoption.afterDeath');
      const movement = get('financialMovements', adoption, adoption.financialMovementId);
      if (movement && (movement.direction !== 'income' || movement.animalId !== adoption.animalId || !movement.source || movement.source.type !== 'adoption' || movement.source.id !== adoption.id)) add('adoptions', adoption, 'financialMovementId', 'finance.adoptionMismatch');
    });
    valid.adoptionApplications.forEach(application => {
      const completed = adoptedByApplication.get(application.id) || [];
      if ((application.status === 'completed') !== (completed.length === 1)) add('adoptionApplications', application, 'status', 'application.adoptionState');
      const animal = get('animals', application, application.animalId);
      if (animal && animal.managementStatus !== 'under_care' && ['pending', 'under_review', 'approved'].includes(application.status)) add('adoptionApplications', application, 'status', 'application.closedAnimal');
    });
    valid.veterinaryRecords.forEach(record => {
      role('veterinaryRecords', record, 'veterinarianContactId', 'veterinarian');
      const clinic = get('contacts', record, record.clinicContactId);
      if (clinic && clinic.type !== 'organization') add('veterinaryRecords', record, 'clinicContactId', 'health.clinicType');
      ['carePlanId', 'sourceTaskId', 'nextReviewTaskId'].forEach(field => {
        const target = get(field === 'carePlanId' ? 'carePlans' : 'tasks', record, record[field]);
        if (target && target.animalId !== record.animalId) add('veterinaryRecords', record, field, 'health.animalMismatch');
        if (field === 'sourceTaskId' && target && (target.status !== 'completed' || target.completedOn !== record.date)) add('veterinaryRecords', record, field, 'health.taskNotCompleted');
      });
      const expense = get('financialMovements', record, record.expenseMovementId);
      if (expense && (expense.direction !== 'expense' || expense.animalId !== record.animalId)) add('veterinaryRecords', record, 'expenseMovementId', 'health.expenseMismatch');
      const animal = get('animals', record, record.animalId);
      if (record.type === 'sterilization' && !record.deletedAt && animal && (animal.sterilizationStatus !== 'yes' || animal.sterilizationDate !== record.date)) add('veterinaryRecords', record, 'date', 'health.sterilizationMismatch');
    });
    valid.carePlans.forEach(plan => role('carePlans', plan, 'veterinarianContactId', 'veterinarian'));
    valid.tasks.forEach(task => {
      if (task.source) {
        const target = get(d.entityTables[task.source.type], task, task.source.id);
        const owner = target && (task.source.type === 'animal' ? target.id : target.animalId);
        // An unlinked animal would make a generated clinical task impossible to complete.
        if (target && owner !== undefined && owner !== task.animalId) add('tasks', task, 'animalId', 'task.animalMismatch');
        if (target && task.source.type === 'care_plan' && task.dueDate < target.startDate) add('tasks', task, 'dueDate', 'task.beforeOrigin');
      }
    });
    const organization = valid.organizationSettings[0];
    if (organization) {
      const logo = get('assets', organization, organization.logoAssetId);
      if (logo && logo.type !== 'logo') add('organizationSettings', organization, 'logoAssetId', 'asset.type');
    }
    const sums = { income: 0n, expense: 0n };
    valid.financialMovements.forEach(movement => {
      if (!organization || movement.currencyCode !== organization.currencyCode) add('financialMovements', movement, 'currencyCode', 'finance.currencyMismatch');
      const category = get('catalogOptions', movement, movement.categoryId);
      if (category && category.kind !== 'finance_' + movement.direction) add('financialMovements', movement, 'categoryId', 'reference.catalogKind');
      if (movement.status === 'posted') sums[movement.direction] += BigInt(movement.amountMinor);
      const corrected = get('financialMovements', movement, movement.correctsMovementId), replacement = get('financialMovements', movement, movement.replacementMovementId);
      if (corrected && (corrected.status !== 'voided' || corrected.replacementMovementId !== movement.id || corrected.direction !== movement.direction)) add('financialMovements', movement, 'correctsMovementId', 'finance.correctionMismatch');
      if (replacement && replacement.correctsMovementId !== movement.id) add('financialMovements', movement, 'replacementMovementId', 'finance.correctionMismatch');
      if (movement.source && movement.source.type === 'donation') {
        const donation = get('donations', movement, movement.source.id);
        if (donation && donation.financialMovementId !== movement.id && !movement.replacementMovementId) add('financialMovements', movement, 'source', 'finance.donationBacklink');
      }
    });
    if (sums.income > BigInt(Number.MAX_SAFE_INTEGER) || sums.expense > BigInt(Number.MAX_SAFE_INTEGER)) add('financialMovements', null, 'amountMinor', 'finance.totalUnsafe');
    valid.donations.forEach(donation => {
      const material = lines.get(donation.id) || [], movement = get('financialMovements', donation, donation.financialMovementId);
      if ((donation.type === 'material' && !material.length) || (donation.type === 'monetary' && material.length)) add('donations', donation, 'type', 'donation.linesMismatch');
      if (movement && (movement.direction !== 'income' || movement.date !== donation.date || (movement.contactId || null) !== (donation.donorContactId || null) ||
        !movement.source || movement.source.type !== 'donation' || movement.source.id !== donation.id ||
        (donation.status === 'recorded') !== (movement.status === 'posted'))) add('donations', donation, 'financialMovementId', 'donation.incomeMismatch');
    });
    const stockMovements = group('inventoryMovements', 'itemId'), compensations = group('inventoryMovements', 'compensatesMovementId');
    valid.donationLines.forEach(line => {
      const donation = get('donations', line, line.donationId), item = get('inventoryItems', line, line.inventoryItemId), movement = get('inventoryMovements', line, line.inventoryMovementId);
      if (donation && donation.type !== 'material') add('donationLines', line, 'donationId', 'donation.materialRequired');
      if (item && (item.unitId !== line.unitId || item.quantityPrecision !== line.quantityPrecision)) add('donationLines', line, 'inventoryItemId', 'inventory.unitMismatch');
      if (movement && (movement.donationLineId !== line.id || movement.itemId !== line.inventoryItemId || movement.type !== 'donation' || movement.deltaScaled !== line.quantityScaled || (donation && movement.date !== donation.date))) add('donationLines', line, 'inventoryMovementId', 'donation.stockMismatch');
      if (donation && donation.status === 'voided' && movement && !(compensations.get(movement.id) || []).some(row => row.deltaScaled === -movement.deltaScaled)) add('donationLines', line, 'inventoryMovementId', 'donation.compensationRequired');
    });
    valid.inventoryMovements.forEach(movement => {
      const line = get('donationLines', movement, movement.donationLineId), compensated = get('inventoryMovements', movement, movement.compensatesMovementId), expense = get('financialMovements', movement, movement.expenseMovementId);
      if (line && line.inventoryMovementId !== movement.id) add('inventoryMovements', movement, 'donationLineId', 'inventory.lineBacklink');
      if (compensated && (compensated.itemId !== movement.itemId || compensated.deltaScaled !== -movement.deltaScaled || movement.type !== 'adjustment' || movement.date < compensated.date)) add('inventoryMovements', movement, 'compensatesMovementId', 'inventory.compensationMismatch');
      if (expense && expense.direction !== 'expense') add('inventoryMovements', movement, 'expenseMovementId', 'inventory.expenseMismatch');
    });
    valid.inventoryItems.forEach(item => {
      role('inventoryItems', item, 'supplierContactId', 'supplier');
      let stock = 0n;
      const movements = (stockMovements.get(item.id) || []).slice().sort((a, b) => a.date.localeCompare(b.date) ||
        Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id));
      movements.forEach(movement => {
        stock += BigInt(movement.deltaScaled);
        if (stock < 0n) add('inventoryMovements', movement, 'deltaScaled', 'inventory.negativeHistoricalStock');
        if (stock > BigInt(Number.MAX_SAFE_INTEGER)) add('inventoryMovements', movement, 'deltaScaled', 'inventory.totalUnsafe');
      });
    });
    let assetBytes = 0;
    valid.assets.forEach(asset => {
      assetBytes += asset.byteLength;
      const parent = get('assets', asset, asset.derivedFromAssetId);
      if (asset.type === 'thumbnail' && parent && parent.type !== 'photo') add('assets', asset, 'derivedFromAssetId', 'asset.thumbnailParent');
    });
    if (assetBytes > 64 * 1024 * 1024) add('assets', null, 'byteLength', 'asset.datasetBudget');
    valid.documents.forEach(document => {
      const asset = get('assets', document, document.assetId);
      if (asset && asset.type !== 'embedded_document') add('documents', document, 'assetId', 'asset.type');
    });
    valid.animalEvents.forEach(event => {
      const source = get(d.entityTables[event.source.type], event, event.source.id);
      if (source && ((event.source.type === 'animal' ? source.id : source.animalId) !== event.animalId) && !['document', 'contact', 'location'].includes(event.source.type)) add('animalEvents', event, 'source', 'event.animalMismatch');
      const corrected = get('animalEvents', event, event.correctsEventId), superseded = get('animalEvents', event, event.supersededByEventId);
      if (corrected && (corrected.supersededByEventId !== event.id || corrected.animalId !== event.animalId)) add('animalEvents', event, 'correctsEventId', 'event.correctionMismatch');
      if (superseded && superseded.correctsEventId !== event.id) add('animalEvents', event, 'supersededByEventId', 'event.correctionMismatch');
    });
    return finish(errors, options);
  }
  d.validateDataset = validateDataset;
}(window.RescueManager));
