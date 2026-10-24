(function (root) {
  'use strict';
  const ui = root.components.ui, el = ui.el, button = ui.button;
  const t = (key, values) => root.core.i18n.t(key, values), service = root.services.donations;
  const view = { search: '', type: '', from: '', to: '', status: '', page: 1 };
  const active = row => !row.deletedAt && !row.archivedAt && !row.mergedIntoContactId;
  const writable = ctx => typeof ctx.canWrite === 'function' ? ctx.canWrite() : ctx.canWrite === undefined ? root.services.context.status().canWrite : !!ctx.canWrite;
  const field = (key, extra = {}) => ({ key, labelKey: 'dn.' + key, ...extra });
  const number = value => new Intl.NumberFormat(root.core.i18n.language).format(value);
  const money = (amountMinor, currencyCode) => root.utils.money.format(amountMinor, currencyCode, { locale: root.core.i18n.language });
  const contact = (tables, id) => root.services.contacts.resolve(tables, id);
  const catalog = (tables, id) => { const row = tables.catalogOptions.find(item => item.id === id); return row ? root.services.catalogs.label(row) : t('ui.unknown'); };
  const today = ctx => root.utils.dates.today(ctx.snapshot.tables.organizationSettings[0].timeZone);
  const separator = () => root.core.i18n.language === 'es' ? ',' : '.';
  function date(ctx, value) {
    if (!value) return t('ui.unknown'); const format = ctx.snapshot.tables.organizationSettings[0].dateFormat;
    return format === 'day_first' ? value.slice(8) + '/' + value.slice(5, 7) + '/' + value.slice(0, 4) : format === 'month_first' ? value.slice(5, 7) + '/' + value.slice(8) + '/' + value.slice(0, 4) : value;
  }
  function income(tables, donation) { return donation.financialMovementId ? tables.financialMovements.find(row => row.id === donation.financialMovementId) : null; }
  function lines(tables, donation) { return tables.donationLines.filter(row => row.donationId === donation.id); }
  async function saved(ctx) { ctx.notify?.(t('dn.saved')); await ctx.refresh(); }
  function allow(ctx) { if (writable(ctx)) return true; ui.dialog(t('common.readOnly'), el('p', {}, t('ui.readOnly'))); return false; }
  function options(rows, label, inactive) { return rows.map(item => ({ value: item.id, label: label(item) + ((inactive && !inactive(item)) ? ' · ' + t('dn.inactive') : '') })); }

  function monetaryEditor(ctx) {
    if (!allow(ctx)) return;
    const tables = ctx.snapshot.tables, organization = tables.organizationSettings[0], sep = separator();
    const categories = tables.catalogOptions.filter(row => row.kind === 'finance_income' && row.active && !row.deletedAt && !row.archivedAt);
    const fields = [field('date', { required: true, type: 'date', max: today(ctx) }),
      field('donorContactId', { options: options(tables.contacts.filter(row => active(row)), row => row.name) }),
      field('categoryId', { required: true, options: [{ value: '', label: t('dn.choose') }] }),
      field('concept', { required: true, maxLength: 200 }), field('amount', { required: true, maxLength: 32 }),
      field('decimalSeparator', { required: true, options: [{ value: '.', label: t('dn.separator.dot') }, { value: ',', label: t('dn.separator.comma') }] }),
      field('notes', { type: 'textarea', keepEmpty: true })];
    const dialog = ui.form(t('dn.newMonetary'), fields, { date: today(ctx), decimalSeparator: sep, notes: '' }, async (input, command) => {
      let amountMinor;
      try { amountMinor = root.utils.money.parse(input.amount, organization.currencyCode, { decimalSeparator: input.decimalSeparator }); }
      catch (_) { throw new root.core.errors.AppError('dn.amountInvalid', [{ path: 'amount' }]); }
      if (amountMinor <= 0) throw new root.core.errors.AppError('dn.amountInvalid', [{ path: 'amount' }]);
      await service.createMonetary({ date: input.date, donorContactId: input.donorContactId, categoryId: input.categoryId, concept: input.concept, amountMinor, notes: input.notes }, command);
      await saved(ctx);
    }, { expectedRevision: ctx.snapshot.globalRevision });
    const category = dialog.querySelector('[name="categoryId"]');
    category.replaceChildren(el('option', { value: '' }, t('dn.choose')), ...categories.map(row => el('option', { value: row.id }, root.services.catalogs.label(row))));
    dialog.querySelector('h2').after(el('p', { class: 'muted' }, t('dn.monetaryHelp')),
      el('p', { class: 'muted' }, t('dn.amountHelp', { currency: organization.currencyCode, precision: root.utils.money.currencies[organization.currencyCode] })));
    return dialog;
  }

  function materialEditor(ctx) {
    if (!allow(ctx)) return;
    const tables = ctx.snapshot.tables, organization = tables.organizationSettings[0], sep = separator();
    const errors = el('div', { class: 'form-errors', role: 'alert', tabindex: '-1' });
    const body = el('form', {}, el('p', { class: 'muted' }, t('dn.materialHelp')));
    let busy = false, dirty = false, operationId = root.utils.ids.uuidV4();
    const captured = { expectedRevision: ctx.snapshot.globalRevision };
    const changed = () => { dirty = true; dialog.dataset.dirty = 'true'; operationId = root.utils.ids.uuidV4(); };
    let sequence = 0;
    function label(key, control, helpKey) {
      if (!control.id) control.id = 'donation-field-' + (++sequence);
      const wrapper = el('div', { class: 'field' }, el('label', { for: control.id }, t(key)), control, helpKey ? el('small', {}, t(helpKey)) : null);
      return wrapper;
    }
    const dateInput = el('input', { type: 'date', required: true, max: today(ctx) }); dateInput.value = today(ctx);
    const donorSelect = el('select', {}, el('option', { value: '' }, t('dn.choose')), ...tables.contacts.filter(row => active(row)).map(row => el('option', { value: row.id }, row.name)));
    const notesInput = el('textarea', { maxlength: 20000 });
    const decimalSelect = el('select', {}, el('option', { value: '.' }, t('dn.separator.dot')), el('option', { value: ',' }, t('dn.separator.comma'))); decimalSelect.value = sep;
    const lineArea = el('div', { class: 'stack' }), addLine = button(t('dn.addLine'), () => {if(lineRows.length<1000){appendLine();changed();}});
    dateInput.addEventListener('input', changed); donorSelect.addEventListener('change', changed); notesInput.addEventListener('input', changed); decimalSelect.addEventListener('change', changed);
    const materialTypes = tables.catalogOptions.filter(row => row.kind === 'material_type' && row.active && !row.deletedAt && !row.archivedAt);
    const units = tables.catalogOptions.filter(row => row.kind === 'unit' && row.active && !row.deletedAt && !row.archivedAt);
    const items = tables.inventoryItems.filter(row => row.status === 'active' && !row.deletedAt && !row.archivedAt);
    const lineRows = [];
    function appendLine() {
      const materialSelect = el('select', { required: true }, el('option', { value: '' }, t('dn.choose')), ...materialTypes.map(row => el('option', { value: row.id }, root.services.catalogs.label(row))));
      const description = el('input', { type: 'text', required: true, maxlength: 200 });
      const quantity = el('input', { type: 'text', required: true, maxlength: 32 });
      const precision = el('select', { required: true }, ['0', '1', '2', '3'].map(value => el('option', { value }, value))); precision.value = '0';
      const unit = el('select', { required: true }, el('option', { value: '' }, t('dn.choose')), ...units.map(row => el('option', { value: row.id }, root.services.catalogs.label(row))));
      const item = el('select', {}, el('option', { value: '' }, t('dn.noStock')), ...items.map(row => el('option', { value: row.id }, row.name)));
      const estimated = el('input', { type: 'text', maxlength: 32 });
      const itemChanged = () => { const target = items.find(row => row.id === item.value); if (target) { precision.value = String(target.quantityPrecision); unit.value = target.unitId; } };
      item.addEventListener('change', () => { itemChanged(); changed(); });
      [materialSelect, description, quantity, precision, unit, estimated].forEach(control => { control.addEventListener('input', changed); control.addEventListener('change', changed); });
      const record = { materialSelect, description, quantity, precision, unit, item, estimated };
      const remove = button(t('dn.removeLine'), () => { lineRows.splice(lineRows.indexOf(record), 1); row.remove();addLine.disabled=false; changed(); }, true);
      const row = el('div', { class: 'donation-line-row' },
        el('div', { class: 'people-filters' }, label('dn.materialTypeId', materialSelect), label('dn.description', description),
          label('dn.quantity', quantity), label('dn.quantityPrecision', precision), label('dn.unitId', unit),
          label('dn.inventoryItemId', item), label('dn.estimatedValueMinor', estimated, 'dn.estimatedHelp')),
        remove);
      record.row = row; lineRows.push(record); lineArea.append(row);addLine.disabled=lineRows.length>=1000;
    }
    function collectLines() {
      if (!lineRows.length) throw new root.core.errors.AppError('dn.lineRequired');
      const result = [];
      for (const line of lineRows) {
        const precisionValue = Number(line.precision.value);
        let quantityScaled, estimatedValueMinor = null;
        try { quantityScaled = root.utils.quantities.parse(line.quantity.value, precisionValue, { decimalSeparator: decimalSelect.value }); }
        catch (_) { line.quantity.setAttribute('aria-invalid','true');line.quantity.focus();throw new root.core.errors.AppError('dn.lineInvalid'); }
        if (quantityScaled <= 0) {line.quantity.setAttribute('aria-invalid','true');throw new root.core.errors.AppError('dn.lineInvalid');}
        if (line.estimated.value) {
          try { estimatedValueMinor = root.utils.money.parse(line.estimated.value, organization.currencyCode, { decimalSeparator: decimalSelect.value }); }
          catch (_) { line.estimated.setAttribute('aria-invalid','true');throw new root.core.errors.AppError('dn.lineInvalid'); }
        }
        result.push({ materialTypeId: line.materialSelect.value, description: line.description.value.trim(), quantityScaled, quantityPrecision: precisionValue, unitId: line.unit.value, inventoryItemId: line.item.value || null, estimatedValueMinor });
      }
      return result;
    }
    body.append(label('dn.date', dateInput), label('dn.donorContactId', donorSelect),
      el('fieldset', { class: 'people-fieldset' }, el('legend', {}, t('dn.lines')), el('p', { class: 'muted' }, t('dn.quantityHelp')),
        label('dn.decimalSeparator', decimalSelect), lineArea, addLine),
      label('dn.notes', notesInput), errors,
      el('div', { class: 'actions' }, button(t('common.cancel'), () => { if (!busy && (!dirty || confirm(t('ui.unsaved')))) dialog.close(); }, true),
        el('button', { type: 'submit', class: 'button' }, t('common.save'))));
    body.addEventListener('submit', async event => {
      event.preventDefault(); if (busy) return; errors.replaceChildren(); busy = true;
      const save = body.querySelector('button[type="submit"]'); save.textContent = t('common.saving');
      const disabled = [...body.elements].map(control => [control, control.disabled]); disabled.forEach(([control]) => { control.disabled = true; });
      try {
        await service.createMaterial({ date: dateInput.value, donorContactId: donorSelect.value || null, notes: notesInput.value, lines: collectLines() }, { ...captured, operationId });
        dirty = false; dialog.close(); await saved(ctx);
      } catch (error) {
        errors.append(el('p', {}, ui.message(error))); errors.focus();
      } finally {
        busy = false; disabled.forEach(([control, value]) => { control.disabled = value; }); save.textContent = t('common.save');
      }
    });
    appendLine();
    const dialog = ui.dialog(t('dn.newMaterial'), body, { wide: true, beforeClose: () => !busy && (!dirty || confirm(t('ui.unsaved'))) });
    return dialog;
  }

  function voidDonation(ctx, donation) {
    if (!allow(ctx)) return;
    const fields = [field('reason', { required: true, maxLength: 200 }), field('voidDate', { required: true, type: 'date', max: today(ctx) }), field('confirmed', { type: 'checkbox', required: true })];
    const dialog = ui.form(t('dn.void'), fields, { voidDate: today(ctx), confirmed: false }, async (input, command) => {
      if (!input.confirmed) throw new root.core.errors.AppError('dn.confirmRequired');
      await service.void(donation.id, { reason: input.reason, date: input.voidDate }, command); await saved(ctx);
    }, { expectedRevision: ctx.snapshot.globalRevision });
    dialog.querySelector('h2').after(el('p', {}, date(ctx, donation.date) + ' · ' + t('dn.type.' + donation.type)), el('p', { class: 'notice warning' }, t('dn.voidHelp')));
    return dialog;
  }

  function detail(ctx, donation) {
    const tables = ctx.snapshot.tables, donor = contact(tables, donation.donorContactId), movement = income(tables, donation);
    const pair = (key, value) => el('div', {}, el('dt', {}, t(key)), el('dd', { class: 'preserve-lines' }, value ?? t('ui.unknown')));
    const sections = [el('p', { class: 'badge' }, t('dn.type.' + donation.type) + ' · ' + t('dn.status.' + donation.status)),
      el('dl', { class: 'detail-grid' }, pair('dn.date', date(ctx, donation.date)),
        pair('dn.donor', donor ? ui.button(donor.name, () => { modal.close(); root.modules.people.openContact(donor.id, { context: ctx }); }, true) : null),
        pair('dn.notes', donation.notes || null), pair('dn.reason', donation.voidReason || null))];
    if (donation.type === 'monetary' && movement) {
      sections.push(el('section', {}, el('h3', {}, t('dn.income')), el('p', {}, t('dn.linkedIncome', { concept: movement.concept, amount: money(movement.amountMinor, movement.currencyCode), status: t('a.finance.' + movement.status) })), el('p', { class: 'muted' }, t('dn.monetaryHelp'))));
    }
    if (donation.type === 'material') {
      const rows = lines(tables, donation);
      const content = rows.length ? el('div', { class: 'table-wrap' }, el('table', {}, el('thead', {}, el('tr', {}, ['dn.materialTypeId', 'dn.description', 'dn.quantity', 'dn.unitId', 'dn.linkedItem', 'dn.estimatedValueMinor'].map(key => el('th', { scope: 'col' }, t(key))))),
        el('tbody', {}, rows.map(line => {
          const item = line.inventoryItemId ? tables.inventoryItems.find(row => row.id === line.inventoryItemId) : null;
          return el('tr', {}, el('td', {}, catalog(tables, line.materialTypeId)), el('td', {}, line.description),
            el('td', {}, root.utils.quantities.format(line.quantityScaled, line.quantityPrecision, { locale: root.core.i18n.language })),
            el('td', {}, catalog(tables, line.unitId)), el('td', {}, item ? item.name : t('dn.noStock')),
            el('td', {}, line.estimatedValueMinor != null ? money(line.estimatedValueMinor, organizationCurrency(ctx)) : t('dn.estimatedNone')));
        })))) : el('p', { class: 'muted' }, t('dn.noLines'));
      sections.push(el('section', {}, el('h3', {}, t('dn.lines')), content, el('p', { class: 'muted' }, t('dn.materialHelp'))));
    }
    if (donation.status === 'recorded') {
      const action = button(t('dn.void'), () => { modal.close(); voidDonation(ctx, donation); }, true); action.disabled = !writable(ctx);
      sections.push(el('div', { class: 'actions' }, action));
    }
    const modal = ui.dialog(t('dn.type.' + donation.type) + ' · ' + date(ctx, donation.date), sections, { wide: true });
    modal.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', () => modal.close()));
    return modal;
  }
  function organizationCurrency(ctx) { return ctx.snapshot.tables.organizationSettings[0].currencyCode; }

  function render(ctx) {
    const tables = ctx.snapshot.tables, results = el('div'), filters = el('div', { class: 'people-filters' });
    const lineText=new Map();for(const line of tables.donationLines)lineText.set(line.donationId,(lineText.get(line.donationId)||'')+' '+line.description);
    const label = (key, control) => { const id = 'donation-filter-' + root.utils.ids.uuidV4(); control.id = id; return el('div', { class: 'field' }, el('label', { for: id }, t('dn.' + key)), control); };
    function rows() {
      const query = root.utils.strings.normalizeSearch(view.search);
      return tables.donations.filter(row => (!view.type || row.type === view.type) && (!view.status || row.status === view.status) &&
        (!view.from || row.date >= view.from) && (!view.to || row.date <= view.to) && (!query || root.utils.strings.normalizeSearch(
          [row.notes, income(tables, row)?.concept, contact(tables, row.donorContactId)?.name,lineText.get(row.id)].join(' ')).includes(query)))
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    }
    function summary(donation) {
      if (donation.type === 'monetary') { const m = income(tables, donation); return m ? m.concept : t('ui.unknown'); }
      const ls = lines(tables, donation); return ls.length ? t('dn.lineCount', { count: number(ls.length) }) : t('ui.unknown');
    }
    function value(donation) {
      if (donation.type === 'monetary') { const m = income(tables, donation); return m ? money(m.amountMinor, m.currencyCode) : t('ui.unknown'); }
      const ls=lines(tables,donation),estimated=ls.filter(row=>row.estimatedValueMinor!==null),total=estimated.reduce((sum,row)=>sum+BigInt(row.estimatedValueMinor),0n);
      if(total>BigInt(Number.MAX_SAFE_INTEGER))return t('dn.totalOverflow');
      return estimated.length ? t('dn.estimatedValue', { value: money(Number(total), organizationCurrency(ctx)) }) : t('dn.estimatedNone');
    }
    function paint() {
      if (view.from && view.to && view.from > view.to) { results.replaceChildren(el('p', { role: 'alert' }, t('dn.periodError'))); return; }
      const filtered = rows(); const pages = Math.max(1, Math.ceil(filtered.length / 20)); view.page = Math.min(view.page, pages);
      const previous = button(t('a.previous'), () => { view.page--; paint(); }, true), next = button(t('a.next'), () => { view.page++; paint(); }, true);
      previous.disabled = view.page <= 1; next.disabled = view.page >= pages;
      const table = filtered.length ? el('div', { class: 'table-wrap' }, el('table', {}, el('thead', {}, el('tr', {}, ['dn.date', 'dn.type', 'dn.donor', 'dn.summary', 'dn.value', 'dn.status', 'dn.actions'].map(key => el('th', { scope: 'col' }, t(key))))),
        el('tbody', {}, filtered.slice((view.page - 1) * 20, view.page * 20).map(row => el('tr', {}, [date(ctx, row.date), t('dn.type.' + row.type), contact(tables, row.donorContactId)?.name || t('ui.unknown'), summary(row), value(row), t('dn.status.' + row.status), button(t('dn.open'), () => detail(ctx, row), true)].map(value => el('td', {}, value))))))) : el('p', { class: 'muted' }, t('dn.empty'));
      results.replaceChildren(table, el('div', { class: 'actions pager' }, previous, el('span', {}, t('dn.page', { page: number(view.page), pages: number(pages), count: number(filtered.length) })), next));
    }
    let timer;
    const search = el('input', { type: 'search', value: view.search, maxlength: 200 });
    search.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { if (search.isConnected) { view.search = search.value; view.page = 1; paint(); } }, 180); }); filters.append(label('search', search));
    const groups = { type: [['', t('dn.all')], ['monetary', t('dn.type.monetary')], ['material', t('dn.type.material')]], status: [['', t('dn.all')], ['recorded', t('dn.status.recorded')], ['voided', t('dn.status.voided')]] };
    for (const [key, list] of Object.entries(groups)) {
      const select = el('select', {}, list.map(([value, text]) => el('option', { value }, text))); select.value = view[key];
      select.addEventListener('change', () => { view[key] = select.value; view.page = 1; paint(); }); filters.append(label(key, select));
    }
    for (const key of ['from', 'to']) { const input = el('input', { type: 'date', value: view[key] }); input.addEventListener('change', () => { view[key] = input.value; view.page = 1; paint(); }); filters.append(label(key, input)); }
    const createMonetary = button(t('dn.newMonetary'), () => monetaryEditor(ctx)); const createMaterial = button(t('dn.newMaterial'), () => materialEditor(ctx));
    createMonetary.disabled = !writable(ctx); createMaterial.disabled = !writable(ctx);
    paint();
    return [el('header', { class: 'page-heading' }, el('div', {}, el('h1', {}, t('nav.donations')), el('p', { class: 'muted' }, t('dn.help'))), el('div', { class: 'actions' }, createMonetary, createMaterial)),
      el('section', { class: 'card stack' }, filters, results)];
  }
  root.modules.donations = Object.freeze({ render });
}(window.RescueManager));
