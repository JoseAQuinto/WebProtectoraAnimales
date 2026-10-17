(function (root) {
  'use strict';
  const ui = root.components.ui, el = ui.el, t = (key, values) => root.core.i18n.t(key, values);
  const active = row => row && !row.deletedAt && !row.archivedAt && !row.mergedIntoContactId;
  const writable = ctx => typeof ctx.canWrite === 'function' ? ctx.canWrite() : ctx.canWrite === undefined ? root.services.context.status().canWrite : !!ctx.canWrite;
  const today = ctx => root.utils.dates.today(ctx.snapshot.tables.organizationSettings[0].timeZone);
  const field = (key, extra = {}) => ({ key, labelKey: 'hw.' + key, ...extra });
  const note = (key, extra = {}) => field(key, { type: 'textarea', keepEmpty: true, ...extra });
  const enums = (values, prefix) => values.map(value => ({ value, label: t(prefix + value) }));
  const fail = key => { throw new root.core.errors.AppError(key); };
  function allowed(ctx, animal) {
    if (!writable(ctx)) { ui.dialog(t('common.readOnly'), el('p', {}, t('ui.readOnly'))); return false; }
    if (!active(animal)) { ui.dialog(t('hw.title'), el('p', {}, t('hw.activeAnimalRequired'))); return false; }
    return true;
  }
  function contacts(tables, predicate, selected) {
    return tables.contacts.filter(row => (active(row) || row.id === selected) && predicate(row)).sort((a, b) => a.name.localeCompare(b.name, root.core.i18n.language))
      .map(row => ({ value: row.id, label: row.name }));
  }
  function catalog(tables, kind, selected) {
    return tables.catalogOptions.filter(row => row.kind === kind && ((active(row) && row.active) || row.id === selected)).sort((a, b) => a.sortOrder - b.sortOrder)
      .map(row => ({ value: row.id, label: root.services.catalogs.label(row) }));
  }
  function control(dialog, key) { return dialog.querySelector('[name="' + key + '"]'); }
  function visible(dialog, key, shown, required = false) {
    const input = control(dialog, key); if (!input) return;
    input.closest('.field').hidden = !shown; input.required = shown && required;
  }
  const planTasks = (tables, id, except) => tables.tasks.filter(task => !task.deletedAt && ['pending', 'in_progress'].includes(task.status) && task.source?.type === 'care_plan' && task.source.id === id && task.id !== except);
  async function saved(ctx) { ctx.notify?.(t('hw.saved')); await ctx.refresh(); }
  function record(ctx, animal, task) {
    if (!allowed(ctx, animal)) return;
    const snapshot = ctx.snapshot, tables = snapshot.tables, organization = tables.organizationSettings[0];
    const taskType = task && tables.catalogOptions.find(row => row.id === task.typeId)?.code;
    const requiredType = { vaccination: 'vaccination', medication: 'medication_administration' }[taskType];
    const fromPlan = task?.source?.type === 'care_plan' ? task.source.id : null;
    const plans = tables.carePlans.filter(row => row.animalId === animal.id && active(row) && ['planned', 'active'].includes(row.status));
    const expenses = tables.financialMovements.filter(row => row.animalId === animal.id && row.direction === 'expense' && row.status === 'posted');
    const fields = [field('type', { required: true, options: enums(requiredType ? [requiredType] : root.domain.enums.veterinaryType, 'a.vet.') }),
      field('date', { required: true, type: 'date', max: today(ctx) }), field('title', { labelKey: 'hw.recordTitle', required: true, maxLength: 200 }),
      note('description'), note('results'), note('notes', { advancedKey: 'hw.more' }),
      field('veterinarianContactId', { options: contacts(tables, row => row.roles.includes('veterinarian')), advancedKey: 'hw.more' }),
      field('clinicContactId', { options: contacts(tables, row => row.type === 'organization'), advancedKey: 'hw.more' }),
      field('carePlanId', { required: !!fromPlan, options: fromPlan ? plans.filter(row => row.id === fromPlan).map(row => ({ value: row.id, label: row.name })) : plans.map(row => ({ value: row.id, label: row.name })), advancedKey: 'hw.more' }),
      field('nextReviewTaskId', { options: tables.tasks.filter(row => row.animalId === animal.id && active(row) && ['pending', 'in_progress'].includes(row.status) && row.id !== task?.id)
        .map(row => ({ value: row.id, label: t('hw.taskOption', { title: row.title, date: row.dueDate }) })), advancedKey: 'hw.more', help: 'hw.nextTaskHelp' }),
      field('conditionState', { required: true, options: enums(['unknown', 'active', 'resolved'], 'hw.condition.') }),
      field('resolvedOn', { type: 'date', max: today(ctx) }),
      field('expenseMode', { required: true, options: enums(['none', 'new', 'existing'], 'hw.expenseMode.'), sectionKey: 'hw.expenses' }),
      field('expenseMovementId', { options: [{ value: '', label: t('hw.choose') }, ...expenses.map(row => ({ value: row.id,
        label: t('hw.expenseOption', { date: row.date, concept: row.concept, amount: root.utils.money.format(row.amountMinor, row.currencyCode, { locale: root.core.i18n.language }) }) }))], sectionKey: 'hw.expenses', help: 'hw.existingExpenseHelp' }),
      field('expenseCategoryId', { options: catalog(tables, 'finance_expense'), sectionKey: 'hw.expenses' }),
      field('expenseConcept', { maxLength: 200, sectionKey: 'hw.expenses' }), field('expenseAmount', { maxLength: 32, sectionKey: 'hw.expenses' }),
      field('decimalSeparator', { options: [{ value: '.', label: t('hw.separator.dot') }, { value: ',', label: t('hw.separator.comma') }], sectionKey: 'hw.expenses' }),
      field('expenseContactId', { options: contacts(tables, () => true), sectionKey: 'hw.expenses' }), note('expenseNotes', { sectionKey: 'hw.expenses' }),
      field('completePlan', { type: 'checkbox', help: 'hw.completePlanHelp' })];
    if (task) fields.push(field('performedConfirmed', { type: 'checkbox', required: true, help: 'hw.performedHelp' }));
    const dialog = ui.form(t(task ? 'hw.performTask' : 'hw.record'), fields,
      { type: requiredType || 'checkup', date: today(ctx), title: task?.title || '', description: '', results: '', notes: '', carePlanId: fromPlan,
        conditionState: 'unknown', expenseMode: 'none', decimalSeparator: root.core.i18n.language === 'es' ? ',' : '.', completePlan: false, performedConfirmed: false },
      async (input, command) => {
        if (task && !input.performedConfirmed) fail('hw.confirmPerformed');
        const clinical = { animalId: animal.id, type: input.type, date: input.date, title: input.title, description: input.description, results: input.results, notes: input.notes,
          veterinarianContactId: input.veterinarianContactId, clinicContactId: input.clinicContactId, carePlanId: input.carePlanId, nextReviewTaskId: input.nextReviewTaskId };
        const condition = ['disease', 'allergy'].includes(input.type);
        clinical.conditionActive = condition && input.conditionState !== 'unknown' ? input.conditionState === 'active' : null;
        clinical.resolvedOn = condition && input.conditionState === 'resolved' ? input.resolvedOn : null;
        const options = {};
        if (task) options.completeTaskId = task.id;
        if (input.completePlan) {
          if (!input.carePlanId || planTasks(tables, input.carePlanId, task?.id).length) fail('hw.pendingPlanTasks');
          options.completePlan = true;
        }
        if (input.expenseMode === 'new') {
          if (!input.expenseAmount) fail('hw.amountRequired');
          options.expense = { categoryId: input.expenseCategoryId, concept: input.expenseConcept,
            amountMinor: root.utils.money.parse(input.expenseAmount, organization.currencyCode, { decimalSeparator: input.decimalSeparator }), contactId: input.expenseContactId, notes: input.expenseNotes };
        } else if (input.expenseMode === 'existing') {
          if (!input.expenseMovementId) fail('hw.expenseRequired'); options.expenseMovementId = input.expenseMovementId;
        }
        await root.services.health.record(clinical, options, command); await saved(ctx);
      }, { expectedRevision: snapshot.globalRevision });
    const heading = dialog.querySelector('h2');
    heading.after(el('p', {}, animal.name), el('p', { class: 'muted' }, t(task ? 'hw.performTaskHelp' : 'hw.recordHelp')),
      el('p', { class: 'muted' }, t('hw.amountHelp', { currency: organization.currencyCode, precision: root.utils.money.currencies[organization.currencyCode] })));
    const taskInformation = el('div', { class: 'notice', 'aria-live': 'polite' }); control(dialog, 'completePlan').closest('.field').before(taskInformation);
    function paint() {
      const condition = ['disease', 'allergy'].includes(control(dialog, 'type').value), resolved = control(dialog, 'conditionState').value === 'resolved';
      visible(dialog, 'conditionState', condition, true); visible(dialog, 'resolvedOn', condition && resolved);
      control(dialog, 'resolvedOn').min = control(dialog, 'date').value;
      const mode = control(dialog, 'expenseMode').value;
      visible(dialog, 'expenseMovementId', mode === 'existing', true);
      ['expenseCategoryId', 'expenseConcept', 'expenseAmount', 'decimalSeparator'].forEach(key => visible(dialog, key, mode === 'new', true));
      ['expenseContactId', 'expenseNotes'].forEach(key => visible(dialog, key, mode === 'new'));
      const plan = plans.find(row => row.id === control(dialog, 'carePlanId').value), pending = plan ? planTasks(tables, plan.id, task?.id) : [];
      visible(dialog, 'completePlan', !!plan && !pending.length);
      if (!plan || pending.length) control(dialog, 'completePlan').checked = false;
      control(dialog, 'date').min = plan?.startDate || '';
      taskInformation.hidden = !plan;
      taskInformation.replaceChildren(...(plan ? [el('p', {}, t('hw.planSelected', { name: plan.name })), pending.length ? el('div', {},
        el('p', {}, t('hw.pendingPlanHelp')), el('ul', {}, pending.map(row => el('li', {}, row.title)))) : el('p', {}, t('hw.canCompletePlan'))] : []));
    }
    ['type', 'conditionState', 'date', 'expenseMode'].forEach(key => control(dialog, key).addEventListener('change', paint));
    control(dialog,'carePlanId').addEventListener('change',()=>{control(dialog,'completePlan').checked=false;paint();});paint();return dialog;
  }
  function plan(ctx, animal, existing) {
    if (!allowed(ctx, animal)) return;
    const snapshot = ctx.snapshot, tables = snapshot.tables;
    const statuses = existing?.status === 'active' ? ['active', 'completed', 'cancelled'] : existing ? ['planned', 'active', 'completed', 'cancelled'] : ['planned', 'active'];
    const fields = [field('name', { required: true, maxLength: 120 }), field('typeId', { required: true, options: catalog(tables, 'care_plan_type', existing?.typeId) }),
      field('startDate', { type: 'date', required: true }), field('plannedEndDate', { type: 'date' }), field('status', { required: true, options: enums(statuses, 'a.plan.') }),
      field('medication', { maxLength: 200, advancedKey: 'hw.instructions' }),
      ...['doseInstructions', 'routeInstructions', 'frequencyInstructions'].map(key => note(key, { maxLength: 2000, advancedKey: 'hw.instructions' })),
      field('veterinarianContactId', { options: contacts(tables, row => row.roles.includes('veterinarian'), existing?.veterinarianContactId), advancedKey: 'hw.instructions' }), note('notes'),
      field('closeConfirmed', { type: 'checkbox' })];
    const dialog = ui.form(t(existing ? 'hw.editPlan' : 'hw.newPlan'), fields, existing || { startDate: today(ctx), status: 'planned', notes: '' }, async (input, command) => {
      const { closeConfirmed, ...values } = input;
      if (['completed', 'cancelled'].includes(values.status) && !closeConfirmed) fail('hw.confirmClose');
      if (existing) await root.services.health.updatePlan(existing.id, values, command);
      else await root.services.health.createPlan({ animalId: animal.id, ...values }, command);
      await saved(ctx);
    }, { expectedRevision: snapshot.globalRevision });
    dialog.querySelector('h2').after(el('p', {}, animal.name), el('p', { class: 'muted' }, t('hw.instructionsHelp')));
    const pending = existing ? planTasks(tables, existing.id) : [];
    if (pending.length) dialog.querySelector('h2').after(el('div', { class: 'notice warning' }, el('p', {}, t('hw.pendingPlanHelp')), el('ul', {}, pending.map(row => el('li', {}, row.title)))));
    const paint = () => { visible(dialog, 'closeConfirmed', ['completed', 'cancelled'].includes(control(dialog, 'status').value), true); control(dialog, 'plannedEndDate').min = control(dialog, 'startDate').value; };
    control(dialog, 'status').addEventListener('change', () => { control(dialog, 'closeConfirmed').checked = false; paint(); }); control(dialog, 'startDate').addEventListener('change', paint); paint(); return dialog;
  }
  root.modules.healthForms = Object.freeze({ record, plan });
}(window.RescueManager));
