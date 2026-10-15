(function () {
  'use strict';
  const root = window.RescueManager;
  const initial = Object.freeze({
    species: ['dog','cat','rabbit','bird','other'], size: ['small','medium','large','giant'],
    finance_income: ['donation','membership','adoption','event','grant','other'],
    finance_expense: ['veterinary','medication','food','facilities','transport','supplies','maintenance','other'],
    inventory_category: ['food','medication','hygiene','veterinary','blankets','carriers','accessories','other'],
    document_type: ['general','medical','adoption','invoice','identity','other'],
    material_type: ['food','medication','equipment','other'], unit: ['item','kg','g','litre','ml','pack'],
    volunteer_function: ['walking','cleaning','transport','feeding','photography','social_media','events','veterinary_visits'],
    task_type: ['veterinary_visit','vaccination','medication','interview','call','transport','purchase','cleaning','adoption_followup','other'],
    care_plan_type: ['treatment','vaccination','deworming','care','other']
  });
  function seed(datasetId, now) {
    const records = [];
    for (const [kind, codes] of Object.entries(initial)) codes.forEach((code, index) => records.push(root.domain.createRecord('catalogOptions', {
      kind, code, labelKey: 'catalog.' + kind + '.' + code, isSystem: true, sortOrder: index
    }, { datasetId, now })));
    return records;
  }
  function label(record) { return record.customLabel || root.core.i18n.t(record.labelKey); }
  root.services.catalogs = Object.freeze({ seed, initial, label });
}());
