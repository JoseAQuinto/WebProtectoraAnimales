(function () {
  'use strict';
  const root = window.RescueManager, t = (...args) => root.core.i18n.t(...args);
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
    };
    return t(specific[error.name] || root.core.errors.messageKey(error));
  }
  function form(title, fields, values, onSave, command = {}) {
    const origin = document.activeElement, controls = new Map(), errors = el('div', { role: 'alert', class: 'form-errors', tabindex: '-1' });
    let dirty = false, busy = false, closed = false, operationId = root.utils.ids.uuidV4();
    const dialog = el('dialog', { 'aria-labelledby': 'dialog-title' });
    const body = el('form', { method: 'dialog' }, el('h2', { id: 'dialog-title' }, title), errors);
    const close = () => { if (busy || (dirty && !confirm(t('ui.unsaved')))) return; dialog.close(); };
    for (const field of fields) {
      const id = 'field-' + field.key, label = el('label', { for: id }, t('field.' + field.key) + (field.required ? ' *' : ''));
      let control;
      if (field.options) {
        control = el('select', { id, name: field.key, required: !!field.required });
        if (!field.required) control.append(el('option', { value: '' }, t('ui.unknown')));
        field.options.forEach(option => control.append(el('option', { value: option.value }, option.label)));
      } else control = el(field.type === 'textarea' ? 'textarea' : 'input', { id, name: field.key,
        type: field.type === 'textarea' ? null : field.type || 'text', required: !!field.required,
        maxlength: field.maxLength || (field.type === 'textarea' ? 20000 : 200), min: field.min, max: field.max, step: field.step });
      control.value = values[field.key] ?? field.default ?? '';
      if (field.type === 'checkbox') control.checked = values[field.key] ?? field.default ?? false;
      control.addEventListener('input', () => { dirty = true; dialog.dataset.dirty = 'true'; operationId = root.utils.ids.uuidV4(); });
      controls.set(field.key, { field, control });
      body.append(el('div', { class: 'field' }, label, control, field.help ? el('small', {}, t(field.help)) : null));
    }
    const save = el('button', { type: 'submit', class: 'button' }, t('common.save'));
    body.append(el('div', { class: 'actions' }, button(t('common.cancel'), close, true), save));
    body.addEventListener('submit', async event => {
      event.preventDefault(); if (busy) return;
      const input = {};
      for (const [key, { field, control }] of controls) {
        let value = field.type === 'checkbox' ? control.checked : control.value;
        if (typeof value === 'string' && field.type !== 'textarea') value = value.trim();
        input[key] = value === '' && !field.required && !field.keepEmpty ? null : field.numeric ? Number(value) : value;
      }
      busy = true; save.disabled = true; save.textContent = t('common.saving'); errors.replaceChildren();
      try { await onSave(input, { ...command, operationId }); dirty = false; dialog.close(); }
      catch (error) {
        errors.append(el('p', {}, message(error)));
        for (const detail of (error.details || []).slice(0, 12)) {
          const key = detail.path.split('.')[0];
          if (controls.has(key)) { controls.get(key).control.setAttribute('aria-invalid', 'true'); errors.append(el('p', {}, t('field.' + key))); }
        }
        errors.focus();
      } finally { busy = false; save.disabled = false; save.textContent = t('common.save'); }
    });
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog.addEventListener('close', () => { if (closed) return; closed = true; dialog.remove(); (origin?.isConnected ? origin : document.getElementById('main'))?.focus(); });
    dialog.append(body); document.body.append(dialog); dialog.showModal();
    return dialog;
  }
  function download(blob, name) {
    const url = URL.createObjectURL(blob), anchor = el('a', { href: url, download: name });
    document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  root.components.ui = Object.freeze({ el, button, form, message, download });
}());
