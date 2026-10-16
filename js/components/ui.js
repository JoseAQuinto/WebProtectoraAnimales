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
  function message(error) {
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
  function form(title, fields, values, onSave, command = {}) {
    const origin = document.activeElement, controls = new Map(), errors = el('div', { role: 'alert', class: 'form-errors', tabindex: '-1' });
    let dirty = false, busy = false, closed = false, operationId = root.utils.ids.uuidV4();
    const suffix = document.querySelector('dialog[open]') ? '-' + root.utils.ids.uuidV4() : '';
    const titleId = 'dialog-title' + suffix;
    const dialog = el('dialog', { 'aria-labelledby': titleId });
    const body = el('form', { method: 'dialog' }, el('h2', { id: titleId }, title), errors);
    const groups = new Map();
    const close = () => { if (busy || (dirty && !confirm(t('ui.unsaved')))) return; dialog.close(); };
    for (const field of fields) {
      const id = 'field-' + field.key + suffix, labelKey = field.labelKey || 'field.' + field.key;
      const label = el('label', { for: id }, t(labelKey) + (field.required ? ' *' : ''));
      let control;
      if (field.options) {
        control = el('select', { id, name: field.key, required: !!field.required, multiple: field.type === 'multiselect' });
        if (!field.required && field.type !== 'multiselect') control.append(el('option', { value: '' }, t('ui.unknown')));
        field.options.forEach(option => control.append(el('option', { value: option.value }, option.label)));
      } else control = el(field.type === 'textarea' ? 'textarea' : 'input', { id, name: field.key,
        type: field.type === 'textarea' ? null : field.type || 'text', required: !!field.required,
        maxlength: field.maxLength || (field.type === 'textarea' ? 20000 : 200), min: field.min, max: field.max, step: field.step, accept: field.accept });
      const initial = values[field.key] ?? field.default;
      if (field.type === 'multiselect') Array.from(control.options).forEach(option => { option.selected = (initial || []).includes(option.value); });
      else if (field.type !== 'file') control.value = initial ?? '';
      if (field.type === 'checkbox') control.checked = values[field.key] ?? field.default ?? false;
      const changed = () => { dirty = true; dialog.dataset.dirty = 'true'; operationId = root.utils.ids.uuidV4(); control.removeAttribute('aria-invalid'); };
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
      parent.append(el('div', { class: 'field' }, label, control, field.help ? el('small', {}, t(field.help)) : null));
    }
    const save = el('button', { type: 'submit', class: 'button' }, t('common.save'));
    body.append(el('div', { class: 'actions' }, button(t('common.cancel'), close, true), save));
    body.addEventListener('submit', async event => {
      event.preventDefault(); if (busy) return;
      busy = true; pending++; save.disabled = true; save.textContent = t('common.saving'); errors.replaceChildren();
      try {
        const input = {};
        for (const [key, { field, control }] of controls) {
          let value = field.type === 'checkbox' ? control.checked : field.type === 'file' ? control.files[0] || null :
            field.type === 'multiselect' ? Array.from(control.selectedOptions).map(option => option.value) : control.value;
          if (typeof value === 'string' && field.type !== 'textarea') value = value.trim();
          value = value === '' && !field.required && !field.keepEmpty ? null : field.numeric && value !== '' ? Number(value) : value;
          input[key] = field.parse ? field.parse(value) : value;
          control.disabled = true;
        }
        await onSave(input, { ...command, operationId }); dirty = false; dialog.close();
      }
      catch (error) {
        errors.append(el('p', {}, message(error)));
        for (const detail of (Array.isArray(error.details) ? error.details : []).slice(0, 12)) {
          const key = detail.path.split('.')[0];
          if (controls.has(key)) { const item = controls.get(key); item.control.setAttribute('aria-invalid', 'true'); errors.append(el('p', {}, t(item.labelKey))); const details = item.control.closest('details'); if (details) details.open = true; }
        }
        errors.focus();
      } finally { busy = false; pending--; controls.forEach(item => { item.control.disabled = false; }); save.disabled = false; save.textContent = t('common.save'); }
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
  root.components.ui = Object.freeze({ el, button, form, dialog, message, download, get busy() { return pending > 0; } });
}());
