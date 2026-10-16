(function () {
  'use strict';
  const root = window.RescueManager;
  const empty = tables => Object.values(tables).every(rows => !rows.length);
  function initialRecords(input, datasetId, now) {
    return { organizationSettings: [root.domain.createRecord('organizationSettings', input, { datasetId, now })],
      catalogOptions: root.services.catalogs.seed(datasetId, now),
      locations: [root.domain.createRecord('locations', { name: input.name, type: 'shelter' }, { datasetId, now })] };
  }
  async function create(input, command = {}) {
    const current = await root.services.context.snapshot();
    if (current) {
      // A restored empty backup leaves an active dataset without records: fill it through the guarded writer.
      if (!empty(current.tables)) throw root.storage.error('DatasetChangedError', 'An organization already exists');
      await root.services.context.execute('settings.create', input, (data, h) => {
        if (!empty(data)) h.fail('DatasetChangedError', 'An organization already exists');
        const records = initialRecords(input, h.datasetId, h.now);
        return { changes: Object.entries(records).flatMap(([table, rows]) => rows.map(row => h.insert(table, row))),
          result: { id: records.organizationSettings[0].id } };
      }, command);
      return root.services.context.status();
    }
    const datasetId = root.utils.ids.uuidV4(), now = new Date().toISOString();
    const tables = Object.fromEntries(root.storage.schema.tables.map(name => [name, []]));
    Object.assign(tables, initialRecords(input, datasetId, now));
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
