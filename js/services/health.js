(function () {
  'use strict';
  const root = window.RescueManager;
  const recordFields = ['animalId', 'type', 'date', 'title', 'description', 'results', 'notes',
    'veterinarianContactId', 'clinicContactId', 'nextReviewTaskId', 'carePlanId', 'conditionActive', 'resolvedOn'];
  const planFields = ['animalId', 'typeId', 'name', 'startDate', 'plannedEndDate', 'status', 'medication',
    'doseInstructions', 'routeInstructions', 'frequencyInstructions', 'veterinarianContactId', 'notes'];
  function only(input, allowed, h) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !allowed.includes(key))) h.fail('InvalidInputError', 'Unexpected health input');
  }
  function animal(h, id) {
    const value = h.find('animals', id);
    if (value.deletedAt) h.fail('InvalidStateError', 'Restore the animal from the trash before adding health records');
    return value;
  }
  function log(h, operation, type, id, parameters = {}) {
    return h.insert('activityLog', h.create('activityLog', { operation, occurredAt: h.now,
      operationId: h.operationId, target: { type, id }, summaryParameters: parameters }));
  }
  function eventType(type) {
    if (['vaccination', 'deworming', 'sterilization', 'checkup'].includes(type)) return type;
    return 'treatment';
  }
  function record(input, options = {}, command) {
    return root.services.context.execute('health.record', { input, options }, (data, h) => {
      only(input, recordFields, h); only(options, ['expense', 'expenseMovementId', 'completeTaskId', 'completePlan'], h);
      const previousAnimal = animal(h, input.animalId), recordId = root.utils.ids.uuidV4(), changes = [];
      let carePlanId = input.carePlanId || null, expenseMovementId = options.expenseMovementId || null;
      if (options.expense && expenseMovementId) h.fail('InvalidInputError', 'Create an expense or select an existing one');
      if (options.completePlan !== undefined && typeof options.completePlan !== 'boolean') h.fail('InvalidInputError', 'Plan completion must be explicit');
      if (options.completeTaskId) {
        const task = h.find('tasks', options.completeTaskId);
        if (!['pending', 'in_progress'].includes(task.status) || task.deletedAt || task.archivedAt || task.animalId !== input.animalId) h.fail('InvalidStateError', 'Select an open task for this animal');
        if (data.veterinaryRecords.some(row => row.sourceTaskId === task.id)) h.fail('InvalidStateError', 'This task already has a performed health record');
        const taskType = h.find('catalogOptions', task.typeId);
        const expectedType = { vaccination: 'vaccination', medication: 'medication_administration' }[taskType.code];
        if (expectedType && input.type !== expectedType) h.fail('InvalidInputError', 'The performed act must match the scheduled clinical task');
        if (task.source?.type === 'care_plan') {
          if (carePlanId && carePlanId !== task.source.id) h.fail('InvalidInputError', 'Task and health record refer to different plans');
          carePlanId = task.source.id;
        }
        changes.push(h.replace('tasks', h.edit('tasks', task, { status: 'completed', completedOn: input.date })));
      }
      if (options.expense) {
        only(options.expense, ['categoryId', 'concept', 'amountMinor', 'date', 'contactId', 'notes'], h);
        const expense = root.services.finance.buildMovement(data, h, { ...options.expense, direction: 'expense',
          animalId: input.animalId, date: options.expense.date || input.date },
        { source: { type: 'veterinary_record', id: recordId }, originKey: 'veterinary:' + recordId });
        expenseMovementId = expense.id; changes.push(h.insert('financialMovements', expense));
      } else if (expenseMovementId) {
        const expense = h.find('financialMovements', expenseMovementId);
        if (expense.direction !== 'expense' || expense.status !== 'posted' || expense.animalId !== input.animalId) h.fail('InvalidInputError', 'Select a posted expense for the same animal');
      }
      if (carePlanId) {
        const plan = h.find('carePlans', carePlanId);
        if (plan.animalId !== input.animalId || plan.deletedAt || plan.archivedAt || !['planned', 'active'].includes(plan.status)) h.fail('InvalidStateError', 'Select an open care plan for the same animal');
        if (input.date < plan.startDate) h.fail('InvalidInputError', 'Performed date precedes the care plan');
        if (options.completePlan) {
          if (data.tasks.some(task => task.source?.type === 'care_plan' && task.source.id === plan.id &&
              task.id !== options.completeTaskId && !task.deletedAt && ['pending', 'in_progress'].includes(task.status))) h.fail('InvalidStateError', 'Resolve the other pending plan tasks before completing the care plan');
          changes.push(h.replace('carePlans', h.edit('carePlans', plan, { status: 'completed' })));
        }
      } else if (options.completePlan) h.fail('InvalidInputError', 'Select the care plan to complete');
      const clinical = h.create('veterinaryRecords', { ...input, id: recordId, carePlanId,
        sourceTaskId: options.completeTaskId || null, expenseMovementId });
      changes.push(h.insert('veterinaryRecords', clinical));
      if (clinical.type === 'sterilization') {
        if (previousAnimal.sterilizationStatus === 'yes' && previousAnimal.sterilizationDate && previousAnimal.sterilizationDate !== clinical.date) h.fail('InvalidStateError', 'Review the existing sterilization record before changing its date');
        changes.push(h.replace('animals', h.edit('animals', previousAnimal, { sterilizationStatus: 'yes', sterilizationDate: clinical.date })));
      }
      const event = h.create('animalEvents', { animalId: clinical.animalId, type: eventType(clinical.type), eventDate: clinical.date,
        recordedAt: h.now, source: { type: 'veterinary_record', id: clinical.id }, originKey: 'veterinary:' + clinical.id, parameters: {} });
      changes.push(h.insert('animalEvents', event), log(h, 'create', 'veterinary_record', clinical.id));
      return { changes, result: { id: clinical.id, expenseMovementId, eventId: event.id, completedTaskId: clinical.sourceTaskId } };
    }, command);
  }
  function createPlan(input, command) {
    return root.services.context.execute('health.createPlan', input, (data, h) => {
      only(input, planFields, h); animal(h, input.animalId);
      const type = h.find('catalogOptions', input.typeId);
      if (type.kind !== 'care_plan_type' || !type.active || type.deletedAt || type.archivedAt) h.fail('InvalidInputError', 'Select an active care plan type');
      if (input.status !== undefined && !['planned', 'active'].includes(input.status)) h.fail('InvalidStateError', 'A new care plan starts planned or active');
      const plan = h.create('carePlans', input);
      return { changes: [h.insert('carePlans', plan), log(h, 'create', 'care_plan', plan.id)], result: { id: plan.id } };
    }, command);
  }
  function updatePlan(id, patch, command) {
    return root.services.context.execute('health.updatePlan', { id, patch }, (data, h) => {
      only(patch, planFields.filter(field => field !== 'animalId'), h);
      const previous = h.find('carePlans', id);
      if (previous.deletedAt || previous.archivedAt || !['planned', 'active'].includes(previous.status)) h.fail('InvalidStateError', 'The care plan is closed');
      if (patch.typeId && patch.typeId !== previous.typeId) {
        const type = h.find('catalogOptions', patch.typeId);
        if (type.kind !== 'care_plan_type' || !type.active || type.deletedAt || type.archivedAt) h.fail('InvalidInputError', 'Select an active care plan type');
      }
      if (patch.status === 'planned' && previous.status === 'active') h.fail('InvalidStateError', 'An active plan cannot return to planned');
      const plan = h.edit('carePlans', previous, patch);
      if (['completed', 'cancelled'].includes(plan.status) && data.tasks.some(task => task.source?.type === 'care_plan' &&
          task.source.id === id && !task.deletedAt && ['pending', 'in_progress'].includes(task.status))) h.fail('InvalidStateError', 'Complete or explicitly cancel pending plan tasks first');
      if (data.veterinaryRecords.some(row => row.carePlanId === id && row.date < plan.startDate)) h.fail('InvalidInputError', 'Plan start cannot follow an existing performed act');
      if (data.tasks.some(task => task.source?.type === 'care_plan' && task.source.id === id && task.dueDate < plan.startDate)) h.fail('InvalidInputError', 'Plan start cannot follow its scheduled tasks');
      return { changes: [h.replace('carePlans', plan), log(h, 'update', 'care_plan', id)], result: { id } };
    }, command);
  }
  function scheduleTask(planId, input, command) {
    return root.services.context.execute('health.scheduleTask', { planId, input }, (data, h) => {
      if (input.animalId || input.source) h.fail('InvalidInputError', 'Animal and source are supplied by the care plan');
      const plan = h.find('carePlans', planId);
      if (plan.deletedAt || plan.archivedAt || !['planned', 'active'].includes(plan.status)) h.fail('InvalidStateError', 'The care plan is closed');
      if (input.dueDate < plan.startDate) h.fail('InvalidInputError', 'Task cannot precede the care plan');
      const task = root.services.tasks.buildTask(data, h, { ...input, animalId: plan.animalId, source: { type: 'care_plan', id: plan.id } });
      return { changes: [h.insert('tasks', task), log(h, 'create', 'task', task.id)], result: { id: task.id } };
    }, command);
  }
  root.services.health = Object.freeze({ record, createPlan, updatePlan, scheduleTask });
}());
