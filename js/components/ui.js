(function () {
  'use strict';
  const root = window.RescueManager, t = (...args) => root.core.i18n.t(...args);
  let pending = 0;
  function el(tag, attributes = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attributes)) {
      if (key === 'on') Object.entries(value).forEach(([event, handler]) => node.addEventListener(event, handler));
      else if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (value !== false && value !== null && value !== undefined) node.setAttribute(key, value === true ? '' : String(value));
    }
    children.flat().forEach(child => { if (child !== null && child !== undefined && typeof child !== 'boolean') node.append(child instanceof Node ? child : document.createTextNode(String(child))); });
    return node;
  }
  const button = (label, action, secondary = false) => el('button', { type: 'button', class: secondary ? 'button secondary' : 'button', on: { click: action } }, label);
  // Every error shown to the user passes here, so it is also the single diagnostics hook.
  function message(error) {
    root.services.diagnostics?.record('ui', error);
    const specific = {
      ValidationError: 'errors.validation', BackupValidationError: 'errors.invalidBackup', IntegrityError: 'errors.invalidBackup',
      VerifiedBackupRequiredError: 'errors.verifyFirst', ConfirmationRequiredError: 'errors.confirmRestore',
      ImmutableMovementError: 'errors.immutable', RecordNotFoundError: 'errors.revisionConflict',
      DatabaseBlockedError: 'errors.blocked', DatasetNotValidatedError: 'errors.invalidBackup'
      ,PossibleDuplicateError: 'errors.possibleDuplicate', MergeConflictError: 'errors.mergeConflict',
      InvalidInputError: 'errors.validation', InvalidStateError: 'errors.invalidState', BusinessRuleError: 'errors.businessRule',
      AssetBudgetError: 'errors.assetBudget', AssetIntegrityError: 'errors.assetIntegrity',
      RangeError: 'errors.fileOrValue', TypeError: 'errors.fileOrValue'
    };
    return t(specific[error.name] || root.core.errors.messageKey(error));
  }
  // Plain-language reason for a native constraint failure, shown next to the field instead of the browser's own wording.
  function invalidText(control) {
    const validity = control.validity;
    if (validity.valueMissing) return t(control.type === 'checkbox' ? 'ui.error.check' : control.tagName === 'SELECT' ? 'ui.error.choose' : 'ui.error.required');
    if (validity.typeMismatch && control.type === 'email') return t('ui.error.email');
    if (validity.badInput) return t('ui.error.number');
    if (validity.rangeUnderflow) return t('ui.error.min', { value: control.min });
    if (validity.rangeOverflow) return t('ui.error.max', { value: control.max });
    if (validity.stepMismatch) return t('ui.error.step');
    if (validity.tooLong) return t('ui.error.tooLong', { value: control.maxLength });
    return t('ui.error.check.value');
  }
  function fieldError(control, text) {
    const holder = control.closest('.field') || control.parentElement;
    let note = holder.querySelector(':scope > .field-error');
    if (!text) { note?.remove(); control.removeAttribute('aria-invalid'); return; }
    if (!note) { note = el('p', { class: 'field-error', id: (control.id || 'control-' + root.utils.ids.uuidV4()) + '-error' }); holder.append(note); }
    note.textContent = text; control.setAttribute('aria-invalid', 'true');
    control.setAttribute('aria-describedby', [control.getAttribute('aria-describedby'), note.id].filter((value, index, all) => value && all.indexOf(value) === index).join(' '));
  }
  // Checkbox group used by forms in place of <select multiple>: every option is visible and needs no keyboard modifier.
  function checkboxGroup(id, name, options, selected, legend) {
    const group = el('fieldset', { class: 'checkbox-group', id },
      el('legend', {}, legend),
      el('div', { class: 'checkbox-options' }, options.map((option, index) => {
        const optionId = id + '-' + index;
        return el('div', { class: 'checkbox-option' }, el('input', { type: 'checkbox', id: optionId, name, value: option.value, checked: (selected || []).includes(option.value) }), el('label', { for: optionId }, option.label));
      })));
    Object.defineProperty(group, 'values', { get: () => Array.from(group.querySelectorAll('input:checked'), input => input.value) });
    return group;
  }
  // Dropdown with checkboxes for list filters. Shows what is selected and lets each value be removed without a keyboard modifier.
  function choices(options) {
    const { id, label, items, selected = [], onChange, allText = t('ui.choices.all') } = options;
    const summaryText = el('span', { class: 'choices-value' }), labelId = id + '-label';
    const summary = el('summary', { class: 'choices-toggle', 'aria-labelledby': labelId + ' ' + id + '-value' }, summaryText);
    summaryText.id = id + '-value';
    const boxes = items.map(([value, text], index) => el('input', { type: 'checkbox', id: id + '-' + index, value, checked: selected.includes(value) }));
    const clear = button(t('ui.choices.clear'), () => { boxes.forEach(box => { box.checked = false; }); changed(); }, true);
    const panel = el('div', { class: 'choices-panel' },
      el('fieldset', {}, el('legend', { class: 'sr-only' }, label),
        el('div', { class: 'choices-list' }, boxes.map((box, index) => el('div', { class: 'checkbox-option' }, box, el('label', { for: box.id }, items[index][1]))))),
      el('div', { class: 'choices-footer' }, clear, button(t('ui.choices.done'), () => { details.open = false; summary.focus(); })));
    const details = el('details', { class: 'choices', id }, summary, panel);
    const container = el('div', { class: 'field choices-field' }, el('span', { class: 'label', id: labelId }, label), details);
    function paint() {
      const chosen = boxes.filter(box => box.checked).map(box => items[boxes.indexOf(box)][1]);
      summaryText.textContent = !chosen.length ? allText : chosen.length <= 2 ? chosen.join(', ') : t('ui.choices.count', { count: chosen.length });
      details.classList.toggle('has-value', chosen.length > 0); clear.disabled = !chosen.length;
    }
    function changed() { paint(); onChange(boxes.filter(box => box.checked).map(box => box.value)); }
    boxes.forEach(box => box.addEventListener('change', changed));
    details.addEventListener('keydown', event => { if (event.key === 'Escape' && details.open) { event.stopPropagation(); details.open = false; summary.focus(); } });
    container.setValues = values => { boxes.forEach(box => { box.checked = values.includes(box.value); }); paint(); };
    paint(); return container;
  }
  // On phones tables become one card per row; each cell carries its column name so the card stays readable.
  function labelTable(table) {
    const heads = Array.from(table.querySelectorAll(':scope > thead > tr:last-child > th'), cell => cell.textContent.trim());
    if (!heads.length || heads.length < 2) return;
    table.classList.add('responsive-table');
    for (const row of table.querySelectorAll(':scope > tbody > tr')) Array.from(row.children).forEach((cell, index) => { if (heads[index] && !cell.hasAttribute('colspan')) cell.dataset.label = heads[index]; });
  }
  new MutationObserver(records => {
    const tables = new Set();
    for (const record of records) for (const node of record.addedNodes) if (node.nodeType === 1) {
      const owner = node.closest('table'); if (owner) tables.add(owner);
      node.querySelectorAll('table').forEach(table => tables.add(table));
    }
    tables.forEach(labelTable);
  }).observe(document.documentElement, { childList: true, subtree: true });
  // A single listener closes any open filter dropdown when the user clicks or taps elsewhere.
  document.addEventListener('click', event => {
    document.querySelectorAll('details.choices[open]').forEach(details => { if (!details.contains(event.target)) details.open = false; });
  });
  function form(title, fields, values, onSave, command = {}, options = {}) {
    const origin = document.activeElement, controls = new Map(), errors = el('div', { role: 'alert', class: 'form-errors', tabindex: '-1' });
    let dirty = false, busy = false, closed = false, operationId = root.utils.ids.uuidV4();
    const suffix = document.querySelector('dialog[open]') ? '-' + root.utils.ids.uuidV4() : '';
    const titleId = 'dialog-title' + suffix;
    const dialog = el('dialog', { 'aria-labelledby': titleId });
    const body = el('form', { method: 'dialog' }, el('h2', { id: titleId }, title), errors,
      fields.some(field => field.required && field.type !== 'checkbox') ? el('p', { class: 'form-note' }, t('ui.requiredNote')) : null);
    const groups = new Map();
    const close = () => { if (busy || (dirty && !confirm(t('ui.unsaved')))) return; dialog.close(); };
    for (const field of fields) {
      const id = 'field-' + field.key + suffix, labelKey = field.labelKey || 'field.' + field.key;
      const label = el('label', { for: id }, t(labelKey) + (field.required ? ' *' : ''));
      let control;
      if (field.type === 'multiselect') control = checkboxGroup(id, field.key, field.options, values[field.key] ?? field.default, t(labelKey));
      else if (field.options) {
        control = el('select', { id, name: field.key, required: !!field.required, multiple: field.type === 'multiselect' });
        if (!field.required && field.type !== 'multiselect') control.append(el('option', { value: '' }, t('ui.unknown')));
        else if (field.required && !field.options.some(option => option.value === '') && (values[field.key] ?? field.default) == null) control.append(el('option', { value: '' }, t('ui.choose')));
        field.options.forEach(option => control.append(el('option', { value: option.value }, option.label)));
      } else control = el(field.type === 'textarea' ? 'textarea' : 'input', { id, name: field.key,
        type: field.type === 'textarea' ? null : field.type || 'text', required: !!field.required,
        maxlength: field.maxLength || (field.type === 'textarea' ? 20000 : 200), min: field.min, max: field.max, step: field.step, accept: field.accept });
      const initial = values[field.key] ?? field.default;
      if (field.type !== 'file' && field.type !== 'multiselect') control.value = initial ?? '';
      if (field.type === 'checkbox') control.checked = values[field.key] ?? field.default ?? false;
      const changed = () => { dirty = true; dialog.dataset.dirty = 'true'; operationId = root.utils.ids.uuidV4(); };
      control.addEventListener('input', changed); control.addEventListener('change', changed);
      controls.set(field.key, { field, control, labelKey });
      let parent = body;
      if (field.sectionKey || field.advancedKey) {
        const key = field.advancedKey || field.sectionKey;
        if (!groups.has(key)) {
          const group = field.advancedKey ? el('details', { class: 'form-section' }, el('summary', {}, t(key))) : el('section', { class: 'form-section' }, el('h3', {}, t(key)));
          body.append(group); groups.set(key, group);
        }
        parent = groups.get(key);
      }
      control.addEventListener('invalid', () => { const details = control.closest('details'); if (details) details.open = true; });
      const help = field.help ? el('small', { id: id + '-help' }, t(field.help)) : null;
      if (help) control.setAttribute('aria-describedby', help.id);
      parent.append(field.type === 'multiselect' ? el('div', { class: 'field' }, control, help)
        : el('div', { class: field.type === 'checkbox' ? 'field field-check' : 'field' }, field.type === 'checkbox' ? [control, label] : [label, control], help));
    }
    // Native constraints stay active (modules add their own controls), but the reason is written in plain words next to the field.
    body.addEventListener('invalid', event => {
      // The message is shown under the field, so the browser's own bubble (in the browser's language) is suppressed.
      const control = event.target; event.preventDefault(); fieldError(control, invalidText(control));
      clearTimeout(focusTimer); focusTimer = setTimeout(() => { const first = body.querySelector('[aria-invalid=true]'); first?.focus(); first?.scrollIntoView({ block: 'center' }); }, 0);
    }, true);
    let focusTimer = null;
    const clearError = event => { const control = event.target; if (!control.matches?.('input,select,textarea')) return; fieldError(control, ''); };
    body.addEventListener('input', clearError, true); body.addEventListener('change', clearError, true);
    const saveLabel = options.submitLabel || t('common.save'), save = el('button', { type: 'submit', class: 'button' }, saveLabel);
    body.append(el('div', { class: 'actions form-actions' }, button(options.cancelLabel || t('common.cancel'), close, true), save));
    body.addEventListener('submit', async event => {
      event.preventDefault(); if (busy) return;
      busy = true; pending++; save.disabled = true; save.textContent = t('common.saving'); errors.replaceChildren();
      try {
        const input = {};
        for (const [key, { field, control }] of controls) {
          let value = field.type === 'checkbox' ? control.checked : field.type === 'file' ? control.files[0] || null :
            field.type === 'multiselect' ? control.values : control.value;
          if (typeof value === 'string' && field.type !== 'textarea') value = value.trim();
          value = value === '' && !field.required && !field.keepEmpty ? null : field.numeric && value !== '' ? Number(value) : value;
          input[key] = field.parse ? field.parse(value) : value;
          control.disabled = true;
        }
        await onSave(input, { ...command, operationId }); dirty = false; dialog.close();
      }
      catch (error) {
        errors.append(el('p', {}, message(error)));
        const flagged = [];
        for (const detail of (Array.isArray(error.details) ? error.details : []).slice(0, 12)) {
          const key = String(detail.path || '').split('.')[0];
          if (controls.has(key) && !flagged.includes(key)) { const item = controls.get(key); flagged.push(key); fieldError(item.control, t('ui.error.check.value')); const details = item.control.closest('details'); if (details) details.open = true; }
        }
        if (flagged.length) errors.append(el('p', {}, t('ui.error.review', { fields: flagged.map(key => t(controls.get(key).labelKey)).join(', ') })));
        errors.focus();
      } finally { busy = false; pending--; controls.forEach(item => { item.control.disabled = false; }); save.disabled = false; save.textContent = saveLabel; }
    });
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog.addEventListener('close', () => { if (closed) return; closed = true; dialog.remove(); (origin?.isConnected ? origin : document.getElementById('main'))?.focus(); });
    dialog.append(body); document.body.append(dialog); dialog.showModal();
    return dialog;
  }
  function dialog(title, children, options = {}) {
    const origin = document.activeElement, id = 'detail-' + root.utils.ids.uuidV4();
    const modal = el('dialog', { 'aria-labelledby': id, class: options.wide ? 'detail-dialog' : '' });
    const close = () => { if (!options.beforeClose || options.beforeClose() !== false) modal.close(); };
    modal.append(el('div', { class: 'dialog-body' }, el('div', { class: 'page-heading' }, el('h2', { id }, title), button(t('common.close'), close, true)), ...(Array.isArray(children) ? children : [children])));
    modal.addEventListener('cancel', event => { event.preventDefault(); close(); });
    modal.addEventListener('close', () => { modal.remove(); options.onClose?.(); (origin?.isConnected ? origin : document.getElementById('main'))?.focus(); });
    document.body.append(modal); modal.showModal(); return modal;
  }
  function download(blob, name) {
    const url = URL.createObjectURL(blob), anchor = el('a', { href: url, download: name });
    document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  root.components.ui = Object.freeze({ el, button, form, dialog, message, download, choices, get busy() { return pending > 0; } });
}());
