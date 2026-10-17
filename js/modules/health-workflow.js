(function (root) {
  'use strict';
  const ui = root.components.ui, el = ui.el, t = (key, values) => root.core.i18n.t(key, values);
  const active = row => row && !row.deletedAt && !row.archivedAt;
  const writable = ctx => typeof ctx.canWrite === 'function' ? ctx.canWrite() : ctx.canWrite === undefined ? root.services.context.status().canWrite : !!ctx.canWrite;
  const date = (ctx, value) => {
    if (!value) return t('hw.unknown'); const format = ctx.snapshot.tables.organizationSettings[0].dateFormat;
    return format === 'day_first' ? value.slice(8) + '/' + value.slice(5, 7) + '/' + value.slice(0, 4) : format === 'month_first' ? value.slice(5, 7) + '/' + value.slice(8) + '/' + value.slice(0, 4) : value;
  };
  const catalog = (tables, id) => { const row = tables.catalogOptions.find(item => item.id === id); return row ? root.services.catalogs.label(row) : t('hw.unknown'); };
  const contact = (tables, id) => root.services.contacts.resolve(tables, id);
  function contactLink(ctx, id) { const row = contact(ctx.snapshot.tables, id); return row ? ui.button(row.name, () => root.modules.people.openContact(row.id, { context: ctx }), true) : t('hw.unknown'); }
  function pair(key, value) { return el('div', {}, el('dt', {}, t(key)), el('dd', { class: 'preserve-lines' }, value ?? t('hw.unknown'))); }
  function text(key, value) { return value ? el('section', {}, el('h4', {}, t(key)), el('p', { class: 'preserve-lines' }, value)) : null; }
  function table(headers, rows) {
    return rows.length ? el('div', { class: 'table-wrap' }, el('table', {}, el('thead', {}, el('tr', {}, headers.map(key => el('th', { scope: 'col' }, t(key))))),
      el('tbody', {}, rows.map(values => el('tr', {}, values.map(value => el('td', {}, value ?? t('hw.unknown')))))))) : el('p', { class: 'muted' }, t('hw.empty'));
  }
  function detail(ctx, animal, record) {
    const tables = ctx.snapshot.tables, expense = tables.financialMovements.find(row => row.id === record.expenseMovementId), plan = tables.carePlans.find(row => row.id === record.carePlanId);
    const tasks = [record.sourceTaskId, record.nextReviewTaskId].map(id => tables.tasks.find(row => row.id === id)).filter(Boolean);
    return ui.dialog(record.title, [el('p', {}, animal.name), el('dl', { class: 'detail-grid' }, pair('hw.date', date(ctx, record.date)), pair('hw.type', t('a.vet.' + record.type)),
      pair('hw.veterinarianContactId', contactLink(ctx, record.veterinarianContactId)), pair('hw.clinicContactId', contactLink(ctx, record.clinicContactId)),
      pair('hw.carePlanId', plan?.name), pair('hw.conditionState', t(record.conditionActive === true ? 'hw.condition.active' : record.conditionActive === false ? 'hw.condition.resolved' : 'hw.condition.unknown')),
      pair('hw.resolvedOn', date(ctx, record.resolvedOn)), pair('hw.expenses', expense ? t('hw.linkedExpense', { concept: expense.concept, amount: root.utils.money.format(expense.amountMinor, expense.currencyCode, { locale: root.core.i18n.language }), status: t('a.finance.' + expense.status) }) : t('hw.noExpense'))),
      ...['description', 'results', 'notes'].map(key => text('hw.' + key, record[key])),
      tasks.length ? el('section', {}, el('h4', {}, t('hw.linkedTasks')), el('ul', {}, tasks.map(task => el('li', {}, ui.button(task.title, () => root.modules.tasks.detail(ctx, task), true))))) : null,
      ctx.documents({ entityType: 'veterinary_record', entityId: record.id })].filter(Boolean), { wide: true });
  }
  function render(ctx, animal) {
    const tables = ctx.snapshot.tables, allowed = active(animal) && writable(ctx), forms = root.modules.healthForms;
    const action = (key, callback) => { const control = ui.button(t(key), callback, true); control.disabled = !allowed; return control; };
    const records = tables.veterinaryRecords.filter(row => row.animalId === animal.id && !row.deletedAt).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    const plans = tables.carePlans.filter(row => row.animalId === animal.id && !row.deletedAt).sort((a, b) => b.startDate.localeCompare(a.startDate));
    const conditions = records.filter(row => ['allergy', 'disease'].includes(row.type) && row.conditionActive === true && !row.archivedAt);
    const content = el('div', { class: 'stack' }, el('h3', {}, t('hw.title')), el('p', { class: 'muted' }, t('hw.help')),
      el('div', { class: 'actions' }, action('hw.record', () => forms.record(ctx, animal)), action('hw.newPlan', () => forms.plan(ctx, animal))));
    if (!writable(ctx)) content.append(el('p', { class: 'notice' }, t('ui.readOnly')));
    if (!active(animal)) content.append(el('p', { class: 'muted' }, t('hw.activeAnimalRequired')));
    if (conditions.length) content.append(el('section', { class: 'notice warning' }, el('h4', {}, t('hw.activeConditions')),
      el('ul', {}, conditions.map(row => el('li', {}, ui.button(row.title, () => detail(ctx, animal, row), true))))));
    content.append(el('h4', {}, t('hw.performedHistory')), table(['hw.date', 'hw.type', 'hw.recordTitle', 'hw.veterinarianContactId', 'hw.expenses', 'hw.actions'], records.map(row => {
      const expense = tables.financialMovements.find(item => item.id === row.expenseMovementId);
      return [date(ctx, row.date), t('a.vet.' + row.type), row.title, contactLink(ctx, row.veterinarianContactId),
        expense ? t('hw.linkedExpense', { concept: expense.concept, amount: root.utils.money.format(expense.amountMinor, expense.currencyCode, { locale: root.core.i18n.language }), status: t('a.finance.' + expense.status) }) : t('hw.noExpense'),
        ui.button(t('hw.openRecord'), () => detail(ctx, animal, row), true)];
    })), el('p', { class: 'muted' }, t('hw.sharedInvoiceHelp')), el('h4', {}, t('hw.plans')));
    if (!plans.length) content.append(el('p', { class: 'muted' }, t('hw.emptyPlans')));
    for (const plan of plans) {
      const open = active(plan) && ['planned', 'active'].includes(plan.status), pending = tables.tasks.filter(row => row.source?.type === 'care_plan' && row.source.id === plan.id && !row.deletedAt && ['pending', 'in_progress'].includes(row.status));
      content.append(el('section', { class: 'card stack' }, el('h4', {}, plan.name), el('dl', { class: 'detail-grid' }, pair('hw.typeId', catalog(tables, plan.typeId)), pair('hw.status', t('a.plan.' + plan.status)),
        pair('hw.startDate', date(ctx, plan.startDate)), pair('hw.plannedEndDate', date(ctx, plan.plannedEndDate)), pair('hw.veterinarianContactId', contactLink(ctx, plan.veterinarianContactId))),
        ...['medication', 'doseInstructions', 'routeInstructions', 'frequencyInstructions', 'notes'].map(key => text('hw.' + key, plan[key])),
        el('p', { class: 'muted' }, t('hw.instructionsHelp')), pending.length ? el('p', {}, t('hw.pendingCount', { count: new Intl.NumberFormat(root.core.i18n.language).format(pending.length) })) : null,
        open ? el('div', { class: 'actions' }, action('hw.editPlan', () => forms.plan(ctx, animal, plan)), action('hw.scheduleTask', () => root.modules.tasks.editor(ctx, { animal, plan }))) : null));
    }
    content.append(el('h4', {}, t('hw.tasks')), root.modules.tasks.render(ctx, animal)); return content;
  }
  root.modules.healthWorkflow = Object.freeze({ render, record: (...args) => root.modules.healthForms.record(...args), plan: (...args) => root.modules.healthForms.plan(...args) });
}(window.RescueManager));
