(function (root) {
  'use strict';
  const values = {
    origin: ['real', 'demo', 'import'], language: ['en', 'es'],
    currency: ['EUR', 'USD', 'GBP', 'CAD', 'AUD', 'MXN', 'JPY', 'KWD'],
    dateFormat: ['iso', 'day_first', 'month_first'],
    catalogKind: ['species', 'size', 'finance_income', 'finance_expense', 'inventory_category',
      'document_type', 'material_type', 'unit', 'volunteer_function', 'task_type', 'care_plan_type'],
    locationType: ['shelter', 'room', 'area', 'other'], sex: ['male', 'female', 'unknown'],
    birthPrecision: ['exact', 'estimated', 'unknown'], sterilizationStatus: ['yes', 'no', 'unknown'],
    managementStatus: ['under_care', 'adopted', 'deceased', 'other_exit'],
    adoptionAvailability: ['unavailable', 'available', 'reserved'],
    locationKind: ['shelter', 'foster', 'temporary_external'], entryType: ['first_entry', 'return', 'other'],
    exitReason: ['adoption', 'deceased', 'transfer', 'other'], contactType: ['person', 'organization'],
    contactRole: ['adopter', 'foster', 'volunteer', 'donor', 'veterinarian', 'supplier', 'collaborator'],
    fosterAvailability: ['available', 'unavailable', 'conditional'],
    applicationStatus: ['pending', 'under_review', 'approved', 'rejected', 'completed', 'cancelled'],
    reservationStatus: ['active', 'fulfilled', 'cancelled', 'expired'], profileStatus: ['active', 'inactive'],
    veterinaryType: ['vaccination', 'deworming', 'checkup', 'sterilization', 'surgery', 'test',
      'diagnosis', 'disease', 'allergy', 'medication_administration', 'other'],
    carePlanStatus: ['planned', 'active', 'completed', 'cancelled'],
    priority: ['low', 'medium', 'high', 'urgent'], taskStatus: ['pending', 'in_progress', 'completed', 'cancelled'],
    financeDirection: ['income', 'expense'], financeStatus: ['posted', 'voided'],
    donationType: ['monetary', 'material'], donationStatus: ['recorded', 'voided'],
    inventoryItemStatus: ['active', 'archived'],
    inventoryMovementType: ['opening_balance', 'purchase', 'donation', 'consumption', 'return', 'adjustment'],
    assetType: ['photo', 'thumbnail', 'logo', 'embedded_document'], documentMode: ['embedded', 'external_reference'],
    documentEntityType: ['animal', 'contact', 'adoption', 'veterinary_record'],
    eventType: ['entry', 'return', 'checkup', 'vaccination', 'deworming', 'treatment', 'sterilization',
      'foster_start', 'foster_end', 'application', 'reservation', 'adoption', 'transfer', 'deceased', 'document'],
    operation: ['create', 'update', 'archive', 'trash', 'restore', 'import', 'state_change', 'void',
      'merge', 'correct', 'delete', 'demo_load', 'demo_clear']
  };
  Object.keys(values).forEach(key => Object.freeze(values[key]));
  root.domain.enums = Object.freeze(values);
  root.domain.entityTables = Object.freeze({
    animal: 'animals', contact: 'contacts', stay_episode: 'stayEpisodes', weight_measurement: 'weightMeasurements',
    foster_profile: 'fosterProfiles', foster_stay: 'fosterStays', adoption_application: 'adoptionApplications',
    reservation: 'reservations', adoption: 'adoptions', volunteer_profile: 'volunteerProfiles',
    volunteer_hours: 'volunteerHours', veterinary_record: 'veterinaryRecords', care_plan: 'carePlans',
    task: 'tasks', financial_movement: 'financialMovements', donation: 'donations', donation_line: 'donationLines',
    inventory_item: 'inventoryItems', inventory_movement: 'inventoryMovements', asset: 'assets',
    document: 'documents', catalog_option: 'catalogOptions', location: 'locations',
    organization_settings: 'organizationSettings', animal_event: 'animalEvents'
  });
}(window.RescueManager));
