(function (root) {
  'use strict';
  const e = root.domain.enums;
  const f = (type, extra) => Object.assign({ type, required: true }, extra);
  const text = (maxLength, extra) => f('string', Object.assign({ maxLength }, extra));
  const name = () => text(120, { minLength: 1, trimmed: true });
  const title = () => text(200, { minLength: 1, trimmed: true });
  const notes = () => text(20000, { required: false, default: '' });
  const optionalText = max => text(max, { nullable: true, required: false, default: null });
  const integer = (min, max, extra) => f('integer', Object.assign({ min, max: max === null ? Number.MAX_SAFE_INTEGER : max }, extra));
  const enumeration = (values, extra) => f('enum', Object.assign({ values }, extra));
  const optional = field => Object.assign({}, field, { required: false, nullable: true, default: null });
  const bool = value => f('boolean', { default: value });
  const date = (nonFuture = true) => f('date', { nonFuture });
  const instant = () => f('instant');
  const uuid = () => f('uuid');
  const ref = (table, kind) => f('uuid', { ref: Object.assign({ table }, kind ? { kind } : {}) });
  const array = (items, maxItems) => f('array', { items, maxItems, unique: true, default: [] });
  const option = kind => ref('catalogOptions', kind);
  const source = types => f('object', { fields: { type: enumeration(types), id: uuid() }, originRef: true });
  const originKey = () => optional(text(200, { minLength: 1, trimmed: true }));
  const allTypes = Object.keys(root.domain.entityTables);
  const common = {
    id: uuid(), datasetId: uuid(), createdAt: instant(), updatedAt: instant(), revision: integer(1, null, { default: 1 }),
    archivedAt: optional(instant()), deletedAt: optional(instant()), origin: enumeration(e.origin, { default: 'real' }),
    originBatchId: optional(uuid())
  };
  const ix = (name, fields, unique = false, sparse = false) => ({ name, keyPath: ['datasetId'].concat(fields), unique, sparse });
  const schemas = Object.create(null);
  function table(nameValue, fields, indexes = [], options = {}) {
    schemas[nameValue] = Object.assign({ keyPath: ['datasetId', 'id'], fields: Object.assign({}, common, fields),
      indexes: [ix('byDataset', [])].concat(indexes), allowArchive: true, allowTrash: true }, options);
  }
  table('organizationSettings', {
    name: name(), logoAssetId: optional(ref('assets')), phone: optional(f('phone')), email: optional(f('email')),
    address: optionalText(2000), language: enumeration(e.language, { default: 'en' }), currencyCode: enumeration(e.currency),
    dateFormat: enumeration(e.dateFormat), timeZone: f('timeZone'),
    displayPreferences: f('object', { fields: { animalView: enumeration(['table', 'cards']), pageSize: enumeration([10, 25, 50, 100]) },
      default: { animalView: 'table', pageSize: 25 } }), printDetails: notes(), printFooter: text(2000, { required: false, default: '' }),
    backupReminderDays: integer(1, 365, { default: 7 }), backupReminderWrites: integer(1, 100000, { default: 100 }),
    backupRemindersEnabled: bool(true)
  }, [ix('onePerDataset', [], true)], { allowArchive: false, allowTrash: false });
  table('catalogOptions', {
    kind: enumeration(e.catalogKind), code: text(80, { minLength: 1, trimmed: true }),
    labelKey: optional(text(120, { minLength: 1 })), customLabel: optional(name()),
    isSystem: bool(false), active: bool(true), sortOrder: integer(0, 100000, { default: 0 })
  }, [ix('byKind', ['kind']), ix('byKindCode', ['kind', 'code'], true)]);
  table('locations', { name: name(), type: enumeration(e.locationType, { default: 'shelter' }),
    parentLocationId: optional(ref('locations')), active: bool(true), notes: notes() }, [ix('byParent', ['parentLocationId'])]);
  table('animals', {
    code: text(40, { minLength: 1, trimmed: true }), name: name(), speciesId: option('species'), breed: optionalText(120),
    sex: enumeration(e.sex, { default: 'unknown' }), birthDate: optional(date()), birthPrecision: enumeration(e.birthPrecision, { default: 'unknown' }),
    estimatedAgeMonths: optional(integer(0, 12000)), estimatedAgeReferenceDate: optional(date()), sizeId: optional(option('size')),
    color: optionalText(120), microchipOriginal: optional(text(100, { minLength: 1 })), microchipNormalized: optional(text(100, { minLength: 1 })),
    sterilizationStatus: enumeration(e.sterilizationStatus, { default: 'unknown' }), sterilizationDate: optional(date()),
    photoAssetId: optional(ref('assets')), thumbnailAssetId: optional(ref('assets')), description: notes(), character: notes(),
    behavior: notes(), specialNeeds: notes(), notes: notes(), managementStatus: enumeration(e.managementStatus), deceasedOn: optional(date()),
    adoptionAvailability: enumeration(e.adoptionAvailability), locationKind: optional(enumeration(e.locationKind)),
    locationId: optional(ref('locations')), externalLocationDescription: optional(text(2000, { minLength: 1, trimmed: true }))
  }, [ix('byCode', ['code'], true), ix('byMicrochip', ['microchipNormalized'], true, true),
    ix('byManagementStatus', ['managementStatus']), ix('bySpecies', ['speciesId']), ix('byAvailability', ['adoptionAvailability'])]);
  table('stayEpisodes', { animalId: ref('animals'), entryDate: date(), originDescription: text(2000, { required: false, default: '' }),
    entryReason: title(), entryType: enumeration(e.entryType), exitDate: optional(date()), exitReason: optional(enumeration(e.exitReason)),
    adoptionId: optional(ref('adoptions')), returnedFromAdoptionId: optional(ref('adoptions')), notes: notes()
  }, [ix('byAnimalEntry', ['animalId', 'entryDate']), ix('byAdoption', ['adoptionId'], true, true),
    ix('byReturnedAdoption', ['returnedFromAdoptionId'], true, true)]);
  table('weightMeasurements', { animalId: ref('animals'), date: date(), grams: integer(1, null), notes: notes() }, [ix('byAnimalDate', ['animalId', 'date'])]);
  table('contacts', { type: enumeration(e.contactType, { default: 'person' }), name: name(),
    phones: array(f('object', { fields: { label: text(40), original: f('phone'), normalized: text(60, { minLength: 1 }) } }), 10),
    email: optional(f('email')), emailNormalized: optional(text(254, { minLength: 1 })), address: optionalText(2000),
    roles: array(enumeration(e.contactRole), 7), notes: notes(), mergedIntoContactId: optional(ref('contacts'))
  }, [ix('byEmail', ['emailNormalized']), ix('byName', ['name'])]);
  table('fosterProfiles', { contactId: ref('contacts'), totalCapacity: integer(0, 10000),
    acceptedSpeciesIds: array(option('species'), 100), acceptedSizeIds: array(option('size'), 100),
    availability: enumeration(e.fosterAvailability, { default: 'unavailable' }), restrictions: notes(), notes: notes()
  }, [ix('byContact', ['contactId'], true)]);
  table('fosterStays', { animalId: ref('animals'), episodeId: ref('stayEpisodes'), fosterProfileId: ref('fosterProfiles'),
    startDate: date(), endDate: optional(date()), endReason: optional(title()), exceptionReason: optional(title()), notes: notes()
  }, [ix('byAnimalStart', ['animalId', 'startDate']), ix('byProfileStart', ['fosterProfileId', 'startDate']), ix('byEpisode', ['episodeId'])]);
  table('adoptionApplications', { animalId: ref('animals'), contactId: ref('contacts'), applicationDate: date(),
    status: enumeration(e.applicationStatus, { default: 'pending' }), interviewNotes: notes(), notes: notes(),
    approvalDate: optional(date()), closureReason: optional(title())
  }, [ix('byAnimalStatus', ['animalId', 'status']), ix('byContact', ['contactId']), ix('byStatus', ['status'])]);
  table('reservations', { animalId: ref('animals'), applicationId: ref('adoptionApplications'), reservationDate: date(),
    expiresOn: optional(date(false)), status: enumeration(e.reservationStatus, { default: 'active' }),
    closedOn: optional(date()), closureReason: optional(title())
  }, [ix('byAnimalStatus', ['animalId', 'status']), ix('byApplication', ['applicationId'])]);
  table('adoptions', { animalId: ref('animals'), applicationId: ref('adoptionApplications'), adopterContactId: ref('contacts'),
    episodeId: ref('stayEpisodes'), adoptionDate: date(), returnDate: optional(date()), returnReason: optional(title()),
    financialMovementId: optional(ref('financialMovements')), notes: notes()
  }, [ix('byApplication', ['applicationId'], true), ix('byEpisode', ['episodeId'], true), ix('byAnimalDate', ['animalId', 'adoptionDate'])]);
  table('volunteerProfiles', { contactId: ref('contacts'), availability: notes(), functionIds: array(option('volunteer_function'), 100),
    specialties: notes(), status: enumeration(e.profileStatus, { default: 'active' }), notes: notes() }, [ix('byContact', ['contactId'], true)]);
  table('volunteerHours', { volunteerProfileId: ref('volunteerProfiles'), date: date(), activity: title(),
    durationMinutes: integer(1, 1440), notes: notes() }, [ix('byVolunteerDate', ['volunteerProfileId', 'date'])]);
  table('veterinaryRecords', { animalId: ref('animals'), type: enumeration(e.veterinaryType), date: date(), title: title(),
    description: notes(), results: notes(), notes: notes(), veterinarianContactId: optional(ref('contacts')), clinicContactId: optional(ref('contacts')),
    nextReviewTaskId: optional(ref('tasks')), carePlanId: optional(ref('carePlans')), sourceTaskId: optional(ref('tasks')),
    expenseMovementId: optional(ref('financialMovements')), conditionActive: optional(f('boolean')), resolvedOn: optional(date())
  }, [ix('byAnimalDate', ['animalId', 'date']), ix('bySourceTask', ['sourceTaskId'], true, true)]);
  table('carePlans', { animalId: ref('animals'), typeId: option('care_plan_type'), name: name(), startDate: date(false),
    plannedEndDate: optional(date(false)), status: enumeration(e.carePlanStatus, { default: 'planned' }), medication: optionalText(200),
    doseInstructions: optionalText(2000), routeInstructions: optionalText(2000), frequencyInstructions: optionalText(2000),
    veterinarianContactId: optional(ref('contacts')), notes: notes() }, [ix('byAnimalStatus', ['animalId', 'status'])]);
  table('tasks', { title: title(), description: notes(), notes: notes(), dueDate: date(false), dueLocalTime: optional(f('localTime')),
    timeZone: optional(f('timeZone')), priority: enumeration(e.priority, { default: 'medium' }), status: enumeration(e.taskStatus, { default: 'pending' }),
    animalId: optional(ref('animals')), contactId: optional(ref('contacts')), responsibleVolunteerId: optional(ref('volunteerProfiles')),
    typeId: option('task_type'), source: optional(source(['care_plan', 'veterinary_record', 'adoption', 'adoption_application', 'animal', 'inventory_item'])),
    originKey: originKey(), completedOn: optional(date()), cancelledOn: optional(date()), cancellationReason: optional(title())
  }, [ix('byDueStatus', ['dueDate', 'status']), ix('byStatus', ['status']), ix('byAnimal', ['animalId']), ix('byOriginKey', ['originKey'], true, true)]);
  table('financialMovements', { direction: enumeration(e.financeDirection), date: date(), categoryId: ref('catalogOptions'),
    concept: title(), amountMinor: integer(1, null), currencyCode: enumeration(e.currency), animalId: optional(ref('animals')),
    contactId: optional(ref('contacts')), source: optional(source(['donation', 'veterinary_record', 'adoption', 'inventory_movement'])),
    originKey: originKey(), status: enumeration(e.financeStatus, { default: 'posted' }), voidReason: optional(title()), voidedOn: optional(date()),
    correctsMovementId: optional(ref('financialMovements')), replacementMovementId: optional(ref('financialMovements')), notes: notes()
  }, [ix('byDate', ['date']), ix('byDirectionDate', ['direction', 'date']), ix('byCategoryDate', ['categoryId', 'date']),
    ix('byAnimalDate', ['animalId', 'date']), ix('byOriginKey', ['originKey'], true, true), ix('byCorrects', ['correctsMovementId'], true, true)], { allowTrash: false });
  table('donations', { donorContactId: optional(ref('contacts')), date: date(), type: enumeration(e.donationType),
    financialMovementId: optional(ref('financialMovements')), status: enumeration(e.donationStatus, { default: 'recorded' }),
    voidReason: optional(title()), notes: notes() }, [ix('byDate', ['date']), ix('byFinancialMovement', ['financialMovementId'], true, true)], { allowTrash: false });
  table('donationLines', { donationId: ref('donations'), materialTypeId: option('material_type'), description: title(), quantityScaled: integer(1, null),
    quantityPrecision: integer(0, 3, { default: 0 }), unitId: option('unit'), inventoryItemId: optional(ref('inventoryItems')),
    inventoryMovementId: optional(ref('inventoryMovements')), estimatedValueMinor: optional(integer(0, null))
  }, [ix('byDonation', ['donationId']), ix('byInventoryMovement', ['inventoryMovementId'], true, true)], { allowTrash: false });
  table('inventoryItems', { name: name(), categoryId: option('inventory_category'), unitId: option('unit'), quantityPrecision: integer(0, 3, { default: 0 }),
    minimumStockScaled: integer(0, null, { default: 0 }), supplierContactId: optional(ref('contacts')),
    status: enumeration(e.inventoryItemStatus, { default: 'active' }), notes: notes() }, [ix('byStatus', ['status'])]);
  table('inventoryMovements', { itemId: ref('inventoryItems'), date: date(), type: enumeration(e.inventoryMovementType), deltaScaled: integer(-Number.MAX_SAFE_INTEGER, null, { nonzero: true }),
    reason: title(), contactId: optional(ref('contacts')), donationLineId: optional(ref('donationLines')), expenseMovementId: optional(ref('financialMovements')),
    originKey: originKey(), compensatesMovementId: optional(ref('inventoryMovements')), notes: notes()
  }, [ix('byItemDate', ['itemId', 'date']), ix('byOriginKey', ['originKey'], true, true),
    ix('byDonationLine', ['donationLineId'], true, true), ix('byCompensated', ['compensatesMovementId'], true, true)], { allowTrash: false });
  table('assets', { type: enumeration(e.assetType), originalName: text(255, { minLength: 1 }),
    mime: enumeration(['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain']), byteLength: integer(1, 8 * 1024 * 1024),
    sha256: f('sha256'), blob: f('blob'), width: optional(integer(1, 40000000)), height: optional(integer(1, 40000000)),
    derivedFromAssetId: optional(ref('assets')) }, [ix('bySha256', ['sha256']), ix('byDerivedFrom', ['derivedFromAssetId'])]);
  table('documents', { title: title(), typeId: option('document_type'), date: date(), notes: notes(), mode: enumeration(e.documentMode),
    assetId: optional(ref('assets')), externalFileName: optional(text(255, { minLength: 1 })),
    externalLocation: optional(text(2000, { minLength: 1 })), externalFileType: optionalText(120), originalSha256: optional(f('sha256')) }, [ix('byDate', ['date'])]);
  table('documentLinks', { documentId: ref('documents'), entityType: enumeration(e.documentEntityType), entityId: uuid() },
    [ix('byDocument', ['documentId']), ix('byEntity', ['entityType', 'entityId']), ix('byLink', ['documentId', 'entityType', 'entityId'], true)]);
  // Version 1 parameter vocabulary is deliberately small and closed; never store entire records here.
  const parameters = () => f('object', { fields: { code: optional(text(80, { minLength: 1 })), reason: optional(title()),
    previousId: optional(uuid()), nextId: optional(uuid()), count: optional(integer(0, 100000)), field: optional(text(80, { minLength: 1 })) },
    maxSerializedLength: 2000, default: {} });
  table('animalEvents', { animalId: ref('animals'), type: enumeration(e.eventType), eventDate: date(), recordedAt: instant(),
    source: source(allTypes), originKey: text(200, { minLength: 1, trimmed: true }), parameters: parameters(),
    correctsEventId: optional(ref('animalEvents')), supersededByEventId: optional(ref('animalEvents')), voidReason: optional(title())
  }, [ix('byAnimalDate', ['animalId', 'eventDate']), ix('byOriginKey', ['originKey'], true), ix('byCorrected', ['correctsEventId'], true, true)], { allowArchive: false, allowTrash: false });
  table('activityLog', { operation: enumeration(e.operation), occurredAt: instant(), operationId: uuid(),
    target: optional(source(allTypes)), summaryParameters: parameters() }, [ix('byOccurredAt', ['occurredAt']), ix('byOperation', ['operationId'])], { allowArchive: false, allowTrash: false });
  table('importIdentityMap', { source: text(120, { minLength: 1, trimmed: true }), entityType: enumeration(allTypes),
    externalId: text(200, { minLength: 1 }), entityId: uuid() }, [ix('byExternalIdentity', ['source', 'entityType', 'externalId'], true)]);
  function freeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); }
    return value;
  }
  root.domain.schemas = freeze(schemas);
  root.domain.tableNames = Object.freeze(Object.keys(schemas));
}(window.RescueManager));
