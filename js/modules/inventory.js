(function (root) {
  'use strict';
  const ui = root.components.ui, el = ui.el, button = ui.button;
  const t = (key, values) => root.core.i18n.t(key, values), service = root.services.inventory;
  const view = { search: '', status: '', categoryId: '', page: 1 };
  const usable = row => !row.deletedAt && !row.archivedAt && row.status === 'active';
  const writable = ctx => typeof ctx.canWrite === 'function' ? ctx.canWrite() : ctx.canWrite === undefined ? root.services.context.status().canWrite : !!ctx.canWrite;
  const field = (key, extra = {}) => ({ key, labelKey: 'iv.' + key, ...extra });
  const number = value => new Intl.NumberFormat(root.core.i18n.language).format(value);
  const contact = (tables, id) => root.services.contacts.resolve(tables, id);
  const catalog = (tables, id) => { const row = tables.catalogOptions.find(item => item.id === id); return row ? root.services.catalogs.label(row) : t('ui.unknown'); };
  const today = ctx => root.utils.dates.today(ctx.snapshot.tables.organizationSettings[0].timeZone);
  const separator = () => root.core.i18n.language === 'es' ? ',' : '.';
  const quantity = (value, precision) => root.utils.quantities.format(value, precision, { locale: root.core.i18n.language });
  function date(ctx, value) {
    if (!value) return t('ui.unknown'); const format = ctx.snapshot.tables.organizationSettings[0].dateFormat;
    return format === 'day_first' ? value.slice(8) + '/' + value.slice(5, 7) + '/' + value.slice(0, 4) : format === 'month_first' ? value.slice(5, 7) + '/' + value.slice(8) + '/' + value.slice(0, 4) : value;
  }
  async function saved(ctx) { ctx.notify?.(t('iv.saved')); await ctx.refresh(); }
  function allow(ctx) { if (writable(ctx)) return true; ui.dialog(t('common.readOnly'), el('p', {}, t('ui.readOnly'))); return false; }
  function stock(ctx, item) { try { return service.stock(ctx.snapshot.tables, item.id); } catch (_) { return null; } }

  function itemEditor(ctx) {
    if (!allow(ctx)) return;
    const tables = ctx.snapshot.tables, sep = separator();
    const fields = [field('name', { required: true, maxLength: 120 }),
      field('categoryId', { required: true, options: [{ value: '', label: t('iv.choose') }, ...tables.catalogOptions.filter(row => row.kind === 'inventory_category' && row.active && !row.deletedAt && !row.archivedAt).map(row => ({ value: row.id, label: root.services.catalogs.label(row) }))] }),
      field('unitId', { required: true, options: [{ value: '', label: t('iv.choose') }, ...tables.catalogOptions.filter(row => row.kind === 'unit' && row.active && !row.deletedAt && !row.archivedAt).map(row => ({ value: row.id, label: root.services.catalogs.label(row) }))] }),
      field('quantityPrecision', { required: true, options: ['0', '1', '2', '3'].map(value => ({ value, label: value })) }),
      field('minimumStockScaled', { required: true, maxLength: 32 }),
      field('decimalSeparator', { required: true, options: [{ value: '.', label: t('iv.separator.dot') }, { value: ',', label: t('iv.separator.comma') }] }),
      field('supplierContactId', { options: tables.contacts.filter(row => !row.deletedAt && !row.archivedAt && !row.mergedIntoContactId).map(row => ({ value: row.id, label: row.name })) }),
      field('notes', { type: 'textarea', keepEmpty: true })];
    const dialog = ui.form(t('iv.newItem'), fields, { quantityPrecision: '0', minimumStockScaled: '0', decimalSeparator: sep, notes: '' }, async (input, command) => {
      const precision = Number(input.quantityPrecision);
      let minimumStockScaled;
      try { minimumStockScaled = root.utils.quantities.parse(input.minimumStockScaled || '0', precision, { decimalSeparator: input.decimalSeparator }); }
      catch (_) { throw new root.core.errors.AppError('iv.minimumHelp',[{path:'minimumStockScaled'}]); }
      await service.createItem({ name: input.name, categoryId: input.categoryId, unitId: input.unitId, quantityPrecision: precision, minimumStockScaled, supplierContactId: input.supplierContactId, notes: input.notes }, command);
      await saved(ctx);
    }, { expectedRevision: ctx.snapshot.globalRevision });
    dialog.querySelector('h2').after(el('p', { class: 'muted' }, t('iv.precisionHelp')), el('p', { class: 'muted' }, t('iv.minimumHelp')), el('p', { class: 'muted' }, t('iv.unitHelp')));
    return dialog;
  }

  function moveEditor(ctx, item) {
    if (!allow(ctx)) return;
    const tables = ctx.snapshot.tables, sep = separator();
    const types = [{ value: '', label: t('iv.choose') }, ...root.domain.enums.inventoryMovementType.filter(value => value !== 'donation').map(value => ({ value, label: t('iv.movementType.' + value) }))];
    const expenses = tables.financialMovements.filter(row => row.direction === 'expense' && row.status === 'posted');
    const fields = [field('movementType', { required: true, options: types }),
      field('date', { required: true, type: 'date', max: today(ctx) }), field('quantity', { required: true, maxLength: 32 }),
      field('direction', { required: true, options: [{ value: '', label: t('iv.choose') }, { value: 'in', label: t('iv.direction.in') }, { value: 'out', label: t('iv.direction.out') }] }),
      field('decimalSeparator', { required: true, options: [{ value: '.', label: t('iv.separator.dot') }, { value: ',', label: t('iv.separator.comma') }] }),
      field('reason', { required: true, maxLength: 200 }),
      field('contactId', { options: tables.contacts.filter(row => !row.deletedAt && !row.mergedIntoContactId).map(row => ({ value: row.id, label: row.name })) }),
      field('expenseMovementId', { options: expenses.map(row => ({ value: row.id, label: row.date + ' · ' + row.concept })) }),
      field('movementNotes', { type: 'textarea', keepEmpty: true })];
    const dialog = ui.form(t('iv.recordMovement'), fields, { date: today(ctx), decimalSeparator: sep }, async (input, command) => {
      let base;
      try { base = root.utils.quantities.parse(input.quantity, item.quantityPrecision, { decimalSeparator: input.decimalSeparator }); }
      catch (_) { throw new root.core.errors.AppError('iv.quantityHelp', [{ path: 'quantity' }]); }
      if (base <= 0) throw new root.core.errors.AppError('iv.quantityPositive', [{ path: 'quantity' }]);
      const type = input.movementType;
      let deltaScaled;
      if (['opening_balance', 'purchase'].includes(type)) deltaScaled = base;
      else if (type === 'consumption') deltaScaled = -base;
      else if (input.direction === 'in') deltaScaled = base;
      else if (input.direction === 'out') deltaScaled = -base;
      else throw new root.core.errors.AppError('iv.signRequired', [{ path: 'direction' }]);
      const expenseMovementId = type === 'purchase' ? input.expenseMovementId : null;
      await service.move({ itemId: item.id, date: input.date, type, deltaScaled, reason: input.reason, contactId: input.contactId, expenseMovementId, notes: input.movementNotes }, command);
      await saved(ctx);
    }, { expectedRevision: ctx.snapshot.globalRevision });
    dialog.querySelector('h2').after(el('p', {}, item.name), el('p', { class: 'muted' }, t('iv.quantityHelp', { precision: number(item.quantityPrecision) })), el('p', { class: 'muted' }, t('iv.moveHelp')));
    const type = dialog.querySelector('[name="movementType"]'), directionField = dialog.querySelector('[name="direction"]').closest('.field'), expenseField = dialog.querySelector('[name="expenseMovementId"]').closest('.field');
    function paintType() {
      const needsSign = ['return', 'adjustment'].includes(type.value);
      directionField.hidden = !needsSign; directionField.querySelector('select').required = needsSign;
      expenseField.hidden = type.value !== 'purchase';
    }
    type.addEventListener('change', paintType); paintType();
    return dialog;
  }

  function compensate(ctx, item, movement) {
    if (!allow(ctx)) return;
    const fields = [field('compensateReason', { required: true, maxLength: 200 }), field('compensateDate', { required: true, type: 'date', max: today(ctx) }), field('confirmed', { type: 'checkbox', required: true })];
    const dialog = ui.form(t('iv.compensate'), fields, { compensateDate: today(ctx), confirmed: false }, async (input, command) => {
      if (!input.confirmed) throw new root.core.errors.AppError('iv.confirmRequired');
      await service.compensate(movement.id, { reason: input.compensateReason, date: input.compensateDate }, command); await saved(ctx);
    }, { expectedRevision: ctx.snapshot.globalRevision });
    dialog.querySelector('h2').after(el('p', {}, item.name + ' · ' + date(ctx, movement.date) + ' · ' + quantity(movement.deltaScaled, item.quantityPrecision)), el('p', { class: 'muted' }, t('iv.compensateHelp')));
    return dialog;
  }

  function archiveItem(ctx, item) {
    if (!allow(ctx)) return;
    const fields = [field('confirmed', { type: 'checkbox', required: true })];
    const dialog = ui.form(t('iv.archive'), fields, { confirmed: false }, async (input, command) => {
      if (!input.confirmed) throw new root.core.errors.AppError('iv.confirmRequired');
      await service.archive(item.id, command); await saved(ctx);
    }, { expectedRevision: ctx.snapshot.globalRevision });
    dialog.querySelector('h2').after(el('p', {}, t('iv.archiveConfirm', { name: item.name })));
    return dialog;
  }

  function detail(ctx, item) {
    const tables = ctx.snapshot.tables, supplier = contact(tables, item.supplierContactId), stockRow = stock(ctx, item);
    const pair = (key, value) => el('div', {}, el('dt', {}, t(key)), el('dd', { class: 'preserve-lines' }, value ?? t('ui.unknown')));
    const movements = tables.inventoryMovements.filter(row => row.itemId === item.id).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    const compensated = id => tables.inventoryMovements.some(row => row.compensatesMovementId === id);
    let modal;
    const stockSummary = stockRow ? el('p', { class: 'badge' }, t('iv.stock') + ': ' + quantity(stockRow.quantityScaled, stockRow.quantityPrecision) + ' · ' + (stockRow.belowMinimum ? t('iv.belowMinimum') : stockRow.atMinimum ? t('iv.atMinimum') : t('iv.ok'))) : el('p', { class: 'muted' }, t('ui.unknown'));
    const sections = [el('p', { class: 'badge' }, t('iv.status.' + item.status)),
      el('dl', { class: 'detail-grid' }, pair('iv.name', item.name), pair('iv.categoryId', catalog(tables, item.categoryId)), pair('iv.unitId', catalog(tables, item.unitId)),
        pair('iv.quantityPrecision', number(item.quantityPrecision)), pair('iv.minimumStockScaled', quantity(item.minimumStockScaled, item.quantityPrecision)),
        pair('iv.supplier', supplier ? ui.button(supplier.name, () => { modal.close(); root.modules.people.openContact(supplier.id, { context: ctx }); }, true) : null), pair('iv.notes', item.notes || null)),
      el('section', {}, el('h3', {}, t('iv.stockSummary')), stockSummary)];
    const movementRows = movements.map(movement => {
      const line = movement.donationLineId ? tables.donationLines.find(row => row.id === movement.donationLineId) : null;
      const source = line ? tables.donations.find(row => row.id === line.donationId) : null;
      const isCompensated = compensated(movement.id);
      const actions = el('div', { class: 'actions' });
      if (usable(item) && !movement.donationLineId && !isCompensated) {
        const action = button(t('iv.compensate'), () => { modal.close(); compensate(ctx, item, movement); }, true); action.disabled = !writable(ctx); actions.append(action);
      }
      return el('tr', {}, el('td', {}, date(ctx, movement.date)), el('td', {}, t('iv.movementType.' + movement.type) + (source ? ' · ' + t('iv.donationSource') : '')),
        el('td', {}, quantity(movement.deltaScaled, item.quantityPrecision)), el('td', {}, movement.reason),
        el('td', {}, contact(tables, movement.contactId)?.name || t('ui.unknown')),
        el('td', {}, isCompensated ? t('iv.compensated') : actions));
    });
    sections.push(el('section', {}, el('h3', {}, t('iv.movements')),
      movements.length ? el('div', { class: 'table-wrap' }, el('table', {}, el('thead', {}, el('tr', {}, ['iv.movementDate', 'iv.movementType', 'iv.delta', 'iv.reason', 'iv.contactId', 'iv.actions'].map(key => el('th', { scope: 'col' }, t(key))))), el('tbody', {}, movementRows))) : el('p', { class: 'muted' }, t('iv.empty'))));
    if (usable(item)) {
      const actions = el('div', { class: 'actions' });
      for (const [key, work] of [['iv.recordMovement', () => moveEditor(ctx, item)], ['iv.archive', () => archiveItem(ctx, item)]]) {
        const action = button(t(key), () => { modal.close(); work(); }, true); action.disabled = !writable(ctx); actions.append(action);
      }
      sections.push(actions);
    }
    modal = ui.dialog(item.name, sections, { wide: true });
    modal.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', () => modal.close()));
    return modal;
  }

  function render(ctx) {
    const tables = ctx.snapshot.tables, results = el('div'), filters = el('div', { class: 'people-filters' });
    const label = (key, control) => { const id = 'inventory-filter-' + root.utils.ids.uuidV4(); control.id = id; return el('div', { class: 'field' }, el('label', { for: id }, t('iv.' + key)), control); };
    function rows() {
      const query = root.utils.strings.normalizeSearch(view.search);
      return tables.inventoryItems.filter(row => !row.deletedAt && (!view.status || row.status === view.status) && (!view.categoryId || row.categoryId === view.categoryId) &&
        (!query || root.utils.strings.normalizeSearch(row.name + ' ' + row.notes).includes(query)))
        .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
    }
    function paint() {
      const filtered = rows(); const pages = Math.max(1, Math.ceil(filtered.length / 20)); view.page = Math.min(view.page, pages);
      const previous = button(t('a.previous'), () => { view.page--; paint(); }, true), next = button(t('a.next'), () => { view.page++; paint(); }, true);
      previous.disabled = view.page <= 1; next.disabled = view.page >= pages;
      const body = filtered.length ? filtered.slice((view.page - 1) * 20, view.page * 20).map(item => {
        const row = stock(ctx, item);
        const level = row ? (row.belowMinimum ? el('span', { class: 'badge' }, t('iv.belowMinimum')) : row.atMinimum ? el('span', { class: 'badge' }, t('iv.atMinimum')) : t('iv.ok')) : t('ui.unknown');
        return el('tr', {}, el('th', { scope: 'row' }, button(item.name, () => detail(ctx, item), true)), el('td', {}, catalog(tables, item.categoryId)),
          el('td', {}, row ? quantity(row.quantityScaled, row.quantityPrecision) + ' · ' + catalog(tables, row.unitId) : t('ui.unknown')),
          el('td', {}, quantity(item.minimumStockScaled, item.quantityPrecision)), el('td', {}, t('iv.status.' + item.status)),
          el('td', {}, level), el('td', {}, button(t('iv.open'), () => detail(ctx, item), true)));
      }) : el('tr', {}, el('td', { colspan: 7 }, t('iv.empty')));
      results.replaceChildren(el('div', { class: 'table-wrap' }, el('table', {}, el('thead', {}, el('tr', {}, ['iv.name', 'iv.categoryId', 'iv.stock', 'iv.minimum', 'iv.status', 'iv.level', 'iv.actions'].map(key => el('th', { scope: 'col' }, t(key))))), el('tbody', {}, body))),
        el('div', { class: 'actions' }, previous, el('span', {}, t('iv.page', { page: number(view.page), pages: number(pages), count: number(filtered.length) })), next));
    }
    let timer;
    const search = el('input', { type: 'search', value: view.search, maxlength: 200 });
    search.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { if (search.isConnected) { view.search = search.value; view.page = 1; paint(); } }, 180); }); filters.append(label('search', search));
    const groups = { status: [['', t('iv.all')], ['active', t('iv.status.active')], ['archived', t('iv.status.archived')]], categoryId: [['', t('iv.all')], ...tables.catalogOptions.filter(row => row.kind === 'inventory_category').map(row => [row.id, root.services.catalogs.label(row)])] };
    for (const [key, list] of Object.entries(groups)) {
      const select = el('select', {}, list.map(([value, text]) => el('option', { value }, text))); select.value = view[key];
      select.addEventListener('change', () => { view[key] = select.value; view.page = 1; paint(); }); filters.append(label(key, select));
    }
    const create = button(t('iv.newItem'), () => itemEditor(ctx)); create.disabled = !writable(ctx);
    paint();
    return [el('header', { class: 'page-heading' }, el('div', {}, el('h1', {}, t('nav.inventory')), el('p', { class: 'muted' }, t('iv.help'))), create),
      el('section', { class: 'card stack' }, filters, results)];
  }
  root.modules.inventory = Object.freeze({ render, detail });
}(window.RescueManager));
