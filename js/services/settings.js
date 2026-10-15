(function () {
  'use strict';
  const root = window.RescueManager;
  async function create(input) {
    const datasetId = root.utils.ids.uuidV4(), now = new Date().toISOString();
    const tables = Object.fromEntries(root.storage.schema.tables.map(name => [name, []]));
    tables.organizationSettings.push(root.domain.createRecord('organizationSettings', input, { datasetId, now }));
    tables.catalogOptions = root.services.catalogs.seed(datasetId, now);
    tables.locations.push(root.domain.createRecord('locations', { name: input.name, type: 'shelter' }, { datasetId, now }));
    const prepared = await root.storage.datasetManager.prepare({ datasetId, dataRevision: 0, tables }, { reason: 'initialize' });
    await root.storage.datasetManager.activate(prepared, {});
    return root.services.context.open();
  }
  function update(input, command) {
    return root.services.context.execute('settings.update', input, (data, h) => {
      const previous = data.organizationSettings[0];
      const record = h.edit('organizationSettings', previous, input);
      return { changes: [h.replace('organizationSettings', record)], result: { id: record.id } };
    }, command);
  }
  root.services.settings = Object.freeze({ create, update });
}());
