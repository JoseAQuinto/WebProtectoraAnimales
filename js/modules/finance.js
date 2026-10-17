(function (root) {
  'use strict';
  const ui = root.components.ui, el = ui.el, service = root.services.finance, t = (key, values) => root.core.i18n.t(key, values);
  const view = { search: '', from: '', to: '', direction: '', categoryId: '', animalId: '', contactId: '', status: '', page: 1 };
  const active = row => !row.deletedAt && !row.archivedAt && !row.mergedIntoContactId;
  const writable = ctx => typeof ctx.canWrite === 'function' ? ctx.canWrite() : ctx.canWrite === undefined ? root.services.context.status().canWrite : !!ctx.canWrite;
  const field = (key, extra = {}) => ({ key, labelKey: 'f.' + key, ...extra });
  const number = value => new Intl.NumberFormat(root.core.i18n.language).format(value);
  const money = (row, amount = row.amountMinor) => root.utils.money.format(amount, row.currencyCode, { locale: root.core.i18n.language });
  const today = ctx => root.utils.dates.today(ctx.snapshot.tables.organizationSettings[0].timeZone);
  const contact = (tables, id) => root.services.contacts.resolve(tables, id);
  const catalog = (tables, id) => { const row = tables.catalogOptions.find(item => item.id === id); return row ? root.services.catalogs.label(row) : t('ui.unknown'); };
  function date(ctx, value) {
    if (!value) return t('ui.unknown'); const format = ctx.snapshot.tables.organizationSettings[0].dateFormat;
    return format === 'day_first' ? value.slice(8) + '/' + value.slice(5, 7) + '/' + value.slice(0, 4) : format === 'month_first' ? value.slice(5, 7) + '/' + value.slice(8) + '/' + value.slice(0, 4) : value;
  }
  async function saved(ctx) { ctx.notify?.(t('f.saved')); await ctx.refresh(); }
  function allow(ctx) { if (writable(ctx)) return true; ui.dialog(t('common.readOnly'), el('p', {}, t('ui.readOnly'))); return false; }
  function decimal(amount, currency, separator) {
    const precision = root.utils.money.currencies[currency], digits = String(amount).padStart(precision + 1, '0');
    return precision ? digits.slice(0, -precision) + separator + digits.slice(-precision) : digits;
  }
  function source(tables, row) {
    if (!row.source) return t('f.source.manual');
    const names = { donation: 'donations', veterinary_record: 'veterinaryRecords', adoption: 'adoptions', inventory_movement: 'inventoryMovements' };
    const target = tables[names[row.source.type]]?.find(item => item.id === row.source.id);
    let description = target?.title || target?.concept || target?.adoptionDate || target?.date || '';
    if (row.source.type === 'inventory_movement' && target) description = tables.inventoryItems.find(item => item.id === target.itemId)?.name || description;
    return t('f.sourceDescription', { type: t('f.source.' + row.source.type), description: description || t('ui.unknown') });
  }
  function editor(ctx, row) {
    if (!allow(ctx)) return;
    const snapshot = ctx.snapshot, tables = snapshot.tables, organization = tables.organizationSettings[0], separator = root.core.i18n.language === 'es' ? ',' : '.';
    const options = (rows, label) => rows.map(item => ({ value: item.id, label: label(item) + (!active(item) ? ' · ' + t('f.inactive') : '') }));
    const categories = tables.catalogOptions.filter(item => ['finance_income', 'finance_expense'].includes(item.kind) && ((active(item) && item.active) || item.id === row?.categoryId));
    const fields = [field('direction', { required: true, options: (row ? [row.direction] : ['', 'income', 'expense']).map(value => ({ value, label: t(value ? 'f.direction.' + value : 'f.choose') })) }),
      field('date', { required: true, type: 'date', max: today(ctx) }), field('categoryId', { required: true, options: [{ value: '', label: t('f.choose') }] }),
      field('concept', { required: true, maxLength: 200 }), field('amount', { required: true, maxLength: 32 }),
      field('decimalSeparator', { required: true, options: [{ value: '.', label: t('f.separator.dot') }, { value: ',', label: t('f.separator.comma') }] }),
      field('animalId', { options: options(tables.animals.filter(item => active(item) || item.id === row?.animalId), item => item.code + ' · ' + item.name) }),
      field('contactId', { options: options(tables.contacts.filter(item => active(item) || item.id === row?.contactId), item => item.name) }),
      field('notes', { type: 'textarea', keepEmpty: true })];
    if (row) fields.push(field('reason', { required: true, maxLength: 200 }), field('correctionDate', { required: true, type: 'date', max: today(ctx) }), field('confirmed', { type: 'checkbox', required: true }));
    const dialog = ui.form(t(row ? 'f.correct' : 'f.create'), fields, row ? { ...row, amount: decimal(row.amountMinor, organization.currencyCode, separator), decimalSeparator: separator, correctionDate: today(ctx), confirmed: false } :
      { direction: '', date: today(ctx), decimalSeparator: separator, notes: '' }, async (input, command) => {
      let amountMinor;
      try{amountMinor=root.utils.money.parse(input.amount,organization.currencyCode,{decimalSeparator:input.decimalSeparator});}
      catch(_){throw new root.core.errors.AppError('f.amountInvalid',[{path:'amount'}]);}
      if (amountMinor <= 0) throw new root.core.errors.AppError('f.amountPositive',[{path:'amount'}]);
      const values = { date: input.date, categoryId: input.categoryId, concept: input.concept, amountMinor, animalId: input.animalId, contactId: input.contactId, notes: input.notes };
      if (row) {
        if (!input.confirmed) throw new root.core.errors.AppError('f.confirmRequired');
        await service.correct(row.id, values, { reason: input.reason, date: input.correctionDate }, command);
      } else await service.create({ ...values, direction: input.direction }, command);
      await saved(ctx);
    }, { expectedRevision: snapshot.globalRevision });
    const direction = dialog.querySelector('[name="direction"]'), category = dialog.querySelector('[name="categoryId"]'), amount = dialog.querySelector('[name="amount"]'), decimalControl = dialog.querySelector('[name="decimalSeparator"]');
    let previousSeparator = separator;
    function paintCategory(initial) {
      const selected = initial ? row?.categoryId : null;
      category.replaceChildren(el('option', { value: '' }, t('f.choose')), ...categories.filter(item => item.kind === 'finance_' + direction.value).map(item =>
        el('option', { value: item.id }, root.services.catalogs.label(item) + ((!active(item) || !item.active) ? ' · ' + t('f.inactive') : ''))));
      category.value = selected || '';
    }
    direction.addEventListener('change', () => paintCategory(false)); paintCategory(true);
    decimalControl.addEventListener('change', () => { if (amount.value && !amount.value.includes(decimalControl.value)) amount.value = amount.value.replace(previousSeparator, decimalControl.value); previousSeparator = decimalControl.value; });
    dialog.querySelector('h2').after(el('p', { class: 'muted' }, t('f.amountHelp', { currency: organization.currencyCode, precision: root.utils.money.currencies[organization.currencyCode] })),
      el('p', { class: 'muted' }, t(row ? 'f.correctionHelp' : 'f.manualHelp')));
    if (row) dialog.querySelector('h2').after(el('p', {}, t('f.originalSummary', { concept: row.concept, amount: money(row) })), el('p', { class: 'muted' }, source(tables, row)));
    return dialog;
  }
  function voidMovement(ctx, row) {
    if (!allow(ctx)) return;
    const dialog = ui.form(t('f.void'), [field('reason', { required: true, maxLength: 200 }), field('voidDate', { required: true, type: 'date', max: today(ctx) }), field('confirmed', { type: 'checkbox', required: true })],
      { voidDate: today(ctx), confirmed: false }, async (input, command) => {
        if (!input.confirmed) throw new root.core.errors.AppError('f.confirmRequired');
        await service.void(row.id, { reason: input.reason, date: input.voidDate }, command); await saved(ctx);
      }, { expectedRevision: ctx.snapshot.globalRevision });
    dialog.querySelector('h2').after(
        el('p', {}, t('f.originalSummary', { concept: row.concept, amount: money(row) })), el('p', { class: 'notice warning' }, t('f.voidHelp')));
    return dialog;
  }
  function detail(ctx, row) {
    const tables = ctx.snapshot.tables, animal = tables.animals.find(item => item.id === row.animalId), person = contact(tables, row.contactId);
    const pair = (key, value) => el('div', {}, el('dt', {}, t(key)), el('dd', { class: 'preserve-lines' }, value ?? t('ui.unknown')));
    const links = el('div', { class: 'stack' }), related = tables.financialMovements.filter(item => item.id === row.correctsMovementId || item.id === row.replacementMovementId);
    const content = [el('dl', { class: 'detail-grid' }, pair('f.date', date(ctx, row.date)), pair('f.direction', t('f.direction.' + row.direction)), pair('f.categoryId', catalog(tables, row.categoryId)),
      pair('f.amount', money(row)), pair('f.status', t('a.finance.' + row.status)), pair('f.source', source(tables, row)),
      pair('f.animalId', animal ? el('a', { href: '#animals/' + animal.id }, animal.code + ' · ' + animal.name) : null),
      pair('f.contactId', person ? ui.button(person.name, () => root.modules.people.openContact(person.id, { context: ctx }), true) : null),
      pair('f.notes', row.notes || null), pair('f.voidDate', row.voidedOn ? date(ctx, row.voidedOn) : null), pair('f.reason', row.voidReason)), links];
    let modal;
    related.forEach(item => links.append(ui.button(t(item.id === row.correctsMovementId ? 'f.original' : 'f.replacement', { concept: item.concept, amount: money(item) }), () => { modal.close(); detail(ctx, item); }, true)));
    const references = [
      ...tables.veterinaryRecords.filter(item => item.expenseMovementId === row.id).map(item => t('f.sourceDescription', { type: t('f.source.veterinary_record'), description: item.title })),
      ...tables.donations.filter(item => item.financialMovementId === row.id).map(item => t('f.sourceDescription', { type: t('f.source.donation'), description: date(ctx, item.date) })),
      ...tables.adoptions.filter(item => item.financialMovementId === row.id).map(item => t('f.sourceDescription', { type: t('f.source.adoption'), description: date(ctx, item.adoptionDate) })),
      ...tables.inventoryMovements.filter(item => item.expenseMovementId === row.id).map(item => t('f.sourceDescription', { type: t('f.source.inventory_movement'), description: tables.inventoryItems.find(value => value.id === item.itemId)?.name || t('ui.unknown') }))];
    if (references.length) content.push(el('section', {}, el('h3', {}, t('f.relatedRecords')), el('ul', {}, references.map(value => el('li', {}, value))), el('p', { class: 'muted' }, t('f.relatedHelp'))));
    if (row.status === 'posted') {
      const actions = el('div', { class: 'actions' });
      for (const [key, work] of [['f.correct', () => editor(ctx, row)], ['f.void', () => voidMovement(ctx, row)]]) {
        const button = ui.button(t(key), () => { modal.close(); work(); }, true); button.disabled = !writable(ctx); actions.append(button);
      }
      content.push(actions);
    }
    modal = ui.dialog(row.concept, content, { wide: true });
    modal.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', () => modal.close())); return modal;
  }
  function render(ctx) {
    const tables = ctx.snapshot.tables, currencyCode = tables.organizationSettings[0].currencyCode;
    const results = el('div'), filters = el('div', { class: 'people-filters' });
    const label = (key, control) => { const id = 'finance-filter-' + root.utils.ids.uuidV4(); control.id = id; return el('div', { class: 'field' }, el('label', { for: id }, t('f.' + key)), control); };
    function rows() {
      const query = root.utils.strings.normalizeSearch(view.search);
      return tables.financialMovements.filter(row => (!view.from || row.date >= view.from) && (!view.to || row.date <= view.to) &&
        ['direction', 'categoryId', 'animalId', 'status'].every(key => !view[key] || row[key] === view[key]) && (!view.contactId || contact(tables, row.contactId)?.id === view.contactId) &&
        (!query || root.utils.strings.normalizeSearch([row.concept, row.notes, contact(tables, row.contactId)?.name, tables.animals.find(item => item.id === row.animalId)?.name, catalog(tables, row.categoryId)].join(' ')).includes(query)))
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    }
    function paint() {
      if (view.from && view.to && view.from > view.to) { results.replaceChildren(el('p', { role: 'alert' }, t('f.periodError'))); return; }
      const filtered = rows(); let totals;
      try { totals = service.totals(filtered); } catch (error) { results.replaceChildren(el('p', { role: 'alert' }, ui.message(error))); return; }
      const pages = Math.max(1, Math.ceil(filtered.length / 20)); view.page = Math.min(view.page, pages);
      const previous = ui.button(t('a.previous'), () => { view.page--; paint(); }, true), next = ui.button(t('a.next'), () => { view.page++; paint(); }, true);
      previous.disabled = view.page <= 1; next.disabled = view.page >= pages;
      const summary = el('div', { class: 'metric-grid' }, ...[['income', totals.incomeMinor], ['expense', totals.expenseMinor], ['balance', totals.balanceMinor]].map(([key, amount]) =>
        el('section', { class: 'card' }, el('h2', {}, t('f.total.' + key)), el('p', { class: 'metric-value' }, money({ amountMinor: amount, currencyCode })))));
      const table = filtered.length ? el('div', { class: 'table-wrap' }, el('table', {}, el('thead', {}, el('tr', {}, ['f.date', 'f.direction', 'f.concept', 'f.categoryId', 'f.amount', 'f.status', 'f.contactId', 'f.actions'].map(key => el('th', { scope: 'col' }, t(key))))),
        el('tbody', {}, filtered.slice((view.page - 1) * 20, view.page * 20).map(row => el('tr', {}, [date(ctx, row.date), t('f.direction.' + row.direction), row.concept, catalog(tables, row.categoryId), money(row), t('a.finance.' + row.status), contact(tables, row.contactId)?.name || t('ui.unknown'), ui.button(t('f.open'), () => detail(ctx, row), true)].map(value => el('td', {}, value))))))) : el('p', { class: 'muted' }, t('f.empty'));
      results.replaceChildren(summary, el('p', { class: 'muted' }, t('f.totalsHelp')), table,
        el('div', { class: 'actions' }, previous, el('span', {}, t('f.page', { page: number(view.page), pages: number(pages), count: number(filtered.length) })), next));
    }
    let timer;
    const search = el('input', { type: 'search', value: view.search, maxlength: 200 });
    search.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { if (search.isConnected) { view.search = search.value; view.page = 1; paint(); } }, 180); }); filters.append(label('search', search));
    const groups = { direction: ['income', 'expense'].map(value => [value, t('f.direction.' + value)]), categoryId: tables.catalogOptions.filter(row => ['finance_income', 'finance_expense'].includes(row.kind)).map(row => [row.id, root.services.catalogs.label(row)]),
      animalId: tables.animals.map(row => [row.id, row.code + ' · ' + row.name]), contactId: tables.contacts.filter(row => !row.mergedIntoContactId).map(row => [row.id, row.name]), status: ['posted', 'voided'].map(value => [value, t('a.finance.' + value)]) };
    for (const [key, options] of Object.entries(groups)) {
      const select = el('select', {}, el('option', { value: '' }, t('f.all')), options.map(([value, text]) => el('option', { value }, text))); select.value = view[key];
      select.addEventListener('change', () => { view[key] = select.value; view.page = 1; paint(); }); filters.append(label(key, select));
    }
    for (const key of ['from', 'to']) { const input = el('input', { type: 'date', value: view[key] }); input.addEventListener('change', () => { view[key] = input.value; view.page = 1; paint(); }); filters.append(label(key, input)); }
    const create = ui.button(t('f.create'), () => editor(ctx)); create.disabled = !writable(ctx); paint();
    return [el('header', { class: 'page-heading' }, el('div', {}, el('h1', {}, t('nav.finance')), el('p', { class: 'muted' }, t('f.help'))), create),
      !writable(ctx) ? el('p', { class: 'notice' }, t('ui.readOnly')) : null, el('section', { class: 'card stack' }, filters, results)];
  }
  root.modules.finance = Object.freeze({ render });
}(window.RescueManager));
