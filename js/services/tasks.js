(function () {
  'use strict';
  const root = window.RescueManager;
  const fields = ['title', 'description', 'notes', 'dueDate', 'dueLocalTime', 'timeZone', 'priority',
    'animalId', 'contactId', 'responsibleVolunteerId', 'typeId', 'source'];
  const clinicalTypes = new Set(['veterinary_visit', 'vaccination', 'medication']);
  function only(input, allowed, h) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !allowed.includes(key))) h.fail('InvalidInputError', 'Unexpected task input');
  }
  function active(task, h) {
    if (task.deletedAt || task.archivedAt || !['pending', 'in_progress'].includes(task.status)) h.fail('InvalidStateError', 'The task is no longer open');
    return task;
  }
  function log(h, operation, id, reason) {
    return h.insert('activityLog', h.create('activityLog', { operation, occurredAt: h.now, operationId: h.operationId,
      target: { type: 'task', id }, summaryParameters: reason ? { reason } : {} }));
  }
  function buildTask(data, h, input) {
    only(input, fields, h);
    const type = h.find('catalogOptions', input.typeId);
    if (type.kind !== 'task_type' || !type.active || type.deletedAt || type.archivedAt) h.fail('InvalidInputError', 'Select an active task type');
    if (input.animalId && h.find('animals', input.animalId).deletedAt) h.fail('InvalidInputError', 'The selected animal is in the trash');
    if (input.contactId) {
      const contact = h.find('contacts', input.contactId);
      if (contact.deletedAt || contact.mergedIntoContactId) h.fail('InvalidInputError', 'Select an available contact');
    }
    if (input.responsibleVolunteerId) {
      const volunteer = h.find('volunteerProfiles', input.responsibleVolunteerId);
      if (volunteer.status !== 'active' || volunteer.deletedAt || volunteer.archivedAt) h.fail('InvalidInputError', 'Select an active volunteer');
    }
    const organization = data.organizationSettings[0];
    return h.create('tasks', { ...input,
      ...(input.dueLocalTime && !input.timeZone ? { timeZone: organization.timeZone } : {}),
      ...(input.source ? { originKey: 'task:' + h.operationId } : {}) });
  }
  function create(input, command) {
    return root.services.context.execute('tasks.create', input, (data, h) => {
      const task = buildTask(data, h, input);
      return { changes: [h.insert('tasks', task), log(h, 'create', task.id)], result: { id: task.id } };
    }, command);
  }
  function edit(id, patch, command) {
    return root.services.context.execute('tasks.edit', { id, patch }, (data, h) => {
      only(patch, fields.filter(field => field !== 'source').concat('status'), h);
      const previous = active(h.find('tasks', id), h);
      if (patch.status !== undefined && !['pending', 'in_progress'].includes(patch.status)) h.fail('InvalidStateError', 'Complete or cancel the task through its explicit action');
      const candidate = { ...previous, ...patch };
      const input = Object.fromEntries(fields.map(field => [field, candidate[field]]));
      buildTask(data, h, input);
      const task = h.edit('tasks', previous, patch);
      return { changes: [h.replace('tasks', task), log(h, 'update', id)], result: { id } };
    }, command);
  }
  function complete(id, input = {}, command) {
    return root.services.context.execute('tasks.complete', { id, input }, (data, h) => {
      only(input, ['date'], h); const previous = active(h.find('tasks', id), h);
      const type = h.find('catalogOptions', previous.typeId);
      if (clinicalTypes.has(type.code) || previous.source?.type === 'care_plan') h.fail('ClinicalRecordRequiredError', 'Confirm the performed health act in Health to complete this task');
      const task = h.edit('tasks', previous, { status: 'completed', completedOn: input.date || h.today });
      return { changes: [h.replace('tasks', task), log(h, 'state_change', id)], result: { id } };
    }, command);
  }
  function cancel(id, input, command) {
    return root.services.context.execute('tasks.cancel', { id, input }, (data, h) => {
      only(input, ['date', 'reason'], h); const previous = active(h.find('tasks', id), h);
      const task = h.edit('tasks', previous, { status: 'cancelled', cancelledOn: input.date || h.today, cancellationReason: input.reason });
      return { changes: [h.replace('tasks', task), log(h, 'state_change', id, input.reason)], result: { id } };
    }, command);
  }
  function urgency(task, today) {
    if (!root.utils.dates.isValid(today)) throw new TypeError('Expected a calendar date');
    if (['completed', 'cancelled'].includes(task.status)) return 'closed';
    if (task.dueDate < today) return 'overdue';
    if (task.dueDate === today) return 'today';
    return root.utils.dates.daysBetween(today, task.dueDate) <= 7 ? 'next_week' : 'later';
  }
  function list(tables, filters = {}) {
    const has = (value, expected) => !expected || (Array.isArray(expected) ? expected.includes(value) : value === expected);
    return tables.tasks.filter(task => !task.deletedAt && (filters.includeArchived || !task.archivedAt) &&
      has(task.status, filters.status) && has(task.priority, filters.priority) && has(task.typeId, filters.typeId) &&
      has(task.animalId, filters.animalId) && has(task.contactId, filters.contactId) && has(task.responsibleVolunteerId, filters.responsibleVolunteerId) &&
      (!filters.from || task.dueDate >= filters.from) && (!filters.to || task.dueDate <= filters.to))
      .sort((first, second) => first.dueDate.localeCompare(second.dueDate) || (first.dueLocalTime || '').localeCompare(second.dueLocalTime || '') || first.id.localeCompare(second.id));
  }
  root.services.tasks = Object.freeze({ create, edit, complete, cancel, urgency, list, buildTask });
}());
