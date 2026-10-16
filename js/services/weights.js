(function (root) {
  'use strict';
  const c = root.services.context, fields = ['date', 'grams', 'notes'];
  function only(input, allowed, h) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !allowed.includes(key))) h.fail('InvalidInputError', 'Unexpected weight input');
  }
  function animal(h, id) {
    const row = h.find('animals', id);
    if (row.deletedAt || row.archivedAt) h.fail('InvalidStateError', 'Restore the animal before changing its weight measurements');
    return row;
  }
  function log(h, operation, id) {
    return h.insert('activityLog', h.create('activityLog', { operation, occurredAt: h.now, operationId: h.operationId,
      target: { type: 'weight_measurement', id }, summaryParameters: {} }));
  }
  function record(input, command) {
    return c.execute('weights.record', input, (data, h) => {
      only(input, ['animalId', ...fields], h); animal(h, input.animalId);
      const row = h.create('weightMeasurements', input);
      return { changes: [h.insert('weightMeasurements', row), log(h, 'create', row.id)], result: { id: row.id } };
    }, command);
  }
  function update(id, patch, command) {
    return c.execute('weights.update', { id, patch }, (data, h) => {
      only(patch, fields, h);
      const row = h.find('weightMeasurements', id); animal(h, row.animalId);
      if (row.deletedAt || row.archivedAt) h.fail('InvalidStateError', 'Restore the measurement before editing it');
      return { changes: [h.replace('weightMeasurements', h.edit('weightMeasurements', row, patch)), log(h, 'update', id)], result: { id } };
    }, command);
  }
  function state(id, trashed, command) {
    return c.execute(trashed ? 'weights.trash' : 'weights.restore', { id }, (data, h) => {
      const row = h.find('weightMeasurements', id); animal(h, row.animalId);
      if (!!row.deletedAt === trashed) h.fail('InvalidStateError', 'The measurement is not in the required state');
      return { changes: [h.replace('weightMeasurements', h.edit('weightMeasurements', row, { deletedAt: trashed ? h.now : null })),
        log(h, trashed ? 'trash' : 'restore', id)], result: { id } };
    }, command);
  }
  // No independent current weight field: ties use the documented date/creation/id ordering.
  function list(tables, animalId, filters = {}) {
    return tables.weightMeasurements.filter(row => row.animalId === animalId && (filters.trash ? !!row.deletedAt : !row.deletedAt) && !row.archivedAt)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
  }
  root.services.weights = Object.freeze({ record, update, list, latest: (tables, animalId) => list(tables, animalId)[0] || null,
    trash: (id, command) => state(id, true, command), restore: (id, command) => state(id, false, command) });
}(window.RescueManager));
