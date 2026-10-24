(function (root) {
  'use strict';
  const ui = root.components.ui, el = ui.el, button = ui.button;
  const t = (key, values) => root.core.i18n.t(key, values), contacts = root.services.contacts;
  const views = {}, pageSize = 20;
  let context, fieldSequence = 0;
  const data = () => context.snapshot.tables;
  const writable = () => root.services.context.status().canWrite;
  const command = () => ({ expectedRevision: context.snapshot.globalRevision });
  const empty = value => value === null || value === undefined || value === '' ? t('p.noValue') : value;
  const number = value => new Intl.NumberFormat(root.core.i18n.language).format(value);
  const names = values => values.length ? values.join(', ') : t('p.noValue');
  const roles = values => names(values.map(value => t('p.role.' + value)));
  const text = (value, className) => el('p', { class: className || 'people-text' }, empty(value));
  const duration = minutes => t('p.duration', { hours: number(Math.floor(minutes / 60)), minutes: number(minutes % 60) });
  function date(value) {
    if (!value) return t('p.noValue');
    const preference = data().organizationSettings[0].dateFormat;
    return preference === 'day_first' ? value.slice(8) + '/' + value.slice(5, 7) + '/' + value.slice(0, 4) :
      preference === 'month_first' ? value.slice(5, 7) + '/' + value.slice(8) + '/' + value.slice(0, 4) : value;
  }
  const today = () => root.utils.dates.today(data().organizationSettings[0].timeZone);
  function catalog(kind, selected = []) {
    return data().catalogOptions.filter(row => row.kind === kind && ((!row.deletedAt && !row.archivedAt && row.active) || selected.includes(row.id)))
      .sort((a, b) => a.sortOrder - b.sortOrder).map(row => ({ value: row.id, label: root.services.catalogs.label(row) }));
  }
  const catalogNames = ids => names(ids.map(id => { const row = data().catalogOptions.find(item => item.id === id); return row ? root.services.catalogs.label(row) : t('p.noValue'); }));
  const phones = row => names(row.phones.map(phone => phone.label ? phone.label + ': ' + phone.original : phone.original));
  function action(key, callback, secondary = false) { const control = button(t(key), callback, secondary); control.disabled = !writable(); return control; }
  function label(key, control, help) {
    if (!control.id) control.id = 'people-field-' + (++fieldSequence);
    return el('div', { class: 'field' }, el('label', { for: control.id }, t(key)), control, help ? el('small', {}, t(help)) : null);
  }
  function select(key, options, value, changed) {
    const control = el('select', {}, options.map(item => el('option', { value: item.value }, item.label)));
    control.value = value || ''; control.addEventListener('change', () => changed(control.value));
    return label(key, control);
  }
  const enumOptions = (items, prefix) => items.map(value => ({ value, label: t(prefix + value) }));
  const allOptions = (items, prefix) => [{ value: '', label: t('p.all') }, ...enumOptions(items, prefix)];
  function table(headers, rows) {
    return el('div', { class: 'table-wrap' }, el('table', {}, el('thead', {}, el('tr', {}, headers.map(key => el('th', { scope: 'col' }, t(key))))), el('tbody', {}, rows)));
  }
  const cell = value => el('td', {}, value);
  const detail = (key, value) => el('div', {}, el('dt', {}, t(key)), el('dd', { class: 'people-text' }, empty(value)));
  function paginated(rows, state, draw, repaint) {
    const pages = Math.max(1, Math.ceil(rows.length / pageSize)); state.page = Math.min(state.page || 1, pages);
    const previous = button(t('p.back'), () => { state.page--; repaint(); }, true), next = button(t('p.next'), () => { state.page++; repaint(); }, true);
    previous.disabled = state.page <= 1; next.disabled = state.page >= pages;
    return el('div', { class: 'stack' }, rows.length ? draw(rows.slice((state.page - 1) * pageSize, state.page * pageSize)) : text(t(state.filtered ? 'p.noMatches' : 'p.empty'), 'muted'),
      el('nav', { class: 'actions pager', 'aria-label': t('p.page', { page: number(state.page), pages: number(pages), count: number(rows.length) }) }, previous,
        el('span', { role: 'status' }, t('p.page', { page: number(state.page), pages: number(pages), count: number(rows.length) })), next));
  }
  function searchField(state, repaint, key = 'p.search') {
    const input = el('input', { type: 'search', maxlength: 200 }); input.value = state.search || '';
    let timer;
    input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { state.search = input.value; state.page = 1; repaint(); }, 180); });
    input.addEventListener('search', () => { clearTimeout(timer); state.search = input.value; state.page = 1; repaint(); });
    return label(key, input);
  }
  function periodFields(state, repaint) {
    return ['from', 'to'].map(key => { const input = el('input', { type: 'date' }); input.value = state[key] || '';
      input.addEventListener('change', () => { state[key] = input.value; state.page = 1; repaint(); }); return label('p.' + key, input); });
  }
  function errorText(error) {
    const keys = { PossibleDuplicateError: 'p.confirmDuplicateNeeded', MergeConflictError: 'p.mergeConflict', InvalidStateError: 'p.error.state', InvalidInputError: 'p.error.input' };
    return keys[error.name] ? t(keys[error.name]) : ui.message(error);
  }
  async function saved(after) { context.notify?.(t('p.saved')); await context.refresh(); after?.(); }
  function confirmAction(titleKey, messageKey, values, work, after) {
    const captured = command(), operationId = root.utils.ids.uuidV4(), errors = el('div', { class: 'form-errors', role: 'alert', tabindex: '-1' });
    let busy = false;
    const apply = action('p.confirmAction', async () => {
      if (busy) return; busy = true; apply.disabled = true; errors.replaceChildren();
      try { await work({ ...captured, operationId }); dialog.close(); await saved(after); }
      catch (error) { errors.replaceChildren(text(errorText(error))); errors.focus(); }
      finally { busy = false; apply.disabled = !writable(); }
    });
    const dialog = ui.dialog(t(titleKey), [text(t(messageKey, values)), errors, apply], { beforeClose: () => !busy });
  }
  function chooseContact(onSelect, options = {}) {
    const state = { page: 1, search: '' }, results = el('div'), repaint = () => {
      const rows = contacts.list(data(), { search: state.search }).filter(row => !options.excludeId || row.id !== options.excludeId);
      state.filtered = !!state.search;
      results.replaceChildren(paginated(rows, state, entries => table(['p.name','p.email','p.phones','p.actions'], entries.map(row => el('tr', {},
        el('th', { scope: 'row' }, row.name), cell(empty(row.email)), cell(phones(row)), cell(button(t('p.select'), () => { dialog.close(); onSelect(row); }))))), repaint));
    };
    const create = options.allowCreate === false ? null : action('p.newContact', () => { dialog.close(); contactEditor(null, onSelect); }, true);
    const dialog = ui.dialog(t('p.chooseContact'), [text(t('p.chooseHelp')), searchField(state, repaint, 'p.searchPeople'), results, create], { wide: true });
    repaint();
  }
  function editProfile(kind, contact, profile, after) {
    const foster = kind === 'foster', service = foster ? root.services.fosters : root.services.volunteers;
    if (!profile && data()[foster ? 'fosterProfiles' : 'volunteerProfiles'].some(row => row.contactId === contact.id)) {
      ui.dialog(t('p.profileExists'), text(t('p.profileExists'))); return;
    }
    const notes = { key: 'notes', labelKey: 'p.notes', type: 'textarea', keepEmpty: true };
    const fields = foster ? [
      { key: 'totalCapacity', labelKey: 'p.capacity', type: 'number', numeric: true, required: true, min: 0, max: 10000, step: 1 },
      { key: 'availability', labelKey: 'p.availability', options: enumOptions(root.domain.enums.fosterAvailability, 'p.availability.'), required: true },
      { key: 'acceptedSpeciesIds', labelKey: 'p.species', type: 'multiselect', options: catalog('species', profile?.acceptedSpeciesIds) },
      { key: 'acceptedSizeIds', labelKey: 'p.sizes', type: 'multiselect', options: catalog('size', profile?.acceptedSizeIds) },
      { key: 'restrictions', labelKey: 'p.restrictions', type: 'textarea', keepEmpty: true }, notes
    ] : [
      { key: 'status', labelKey: 'p.status', options: enumOptions(root.domain.enums.profileStatus, 'p.status.'), required: true },
      { key: 'availability', labelKey: 'p.volunteerAvailability', type: 'textarea', keepEmpty: true },
      { key: 'functionIds', labelKey: 'p.functions', type: 'multiselect', options: catalog('volunteer_function', profile?.functionIds) },
      { key: 'specialties', labelKey: 'p.specialties', type: 'textarea', keepEmpty: true }, notes
    ];
    ui.form(t(foster ? (profile ? 'p.editFoster' : 'p.newFoster') : (profile ? 'p.editVolunteer' : 'p.newVolunteer')), fields,
      profile || (foster ? { totalCapacity: 0, availability: 'unavailable', acceptedSpeciesIds: [], acceptedSizeIds: [] } : { status: 'active', functionIds: [] }),
      async (input, cmd) => { if (profile) await service.updateProfile(profile.id, input, cmd); else await service.createProfile({ contactId: contact.id, ...input }, cmd); await saved(); if (after) setTimeout(after, 0); }, command());
  }
  function editHours(profile, entry, after) {
    ui.form(t(entry ? 'p.editHours' : 'p.logHours'), [
      { key: 'date', labelKey: 'p.date', type: 'date', required: true, max: today() },
      { key: 'activity', labelKey: 'p.activity', required: true, maxLength: 200 },
      { key: 'durationMinutes', labelKey: 'p.durationMinutes', type: 'number', numeric: true, required: true, min: 1, max: 1440, step: 1, help: 'p.minutesHelp' },
      { key: 'notes', labelKey: 'p.notes', type: 'textarea', keepEmpty: true }
    ], entry || { date: today(), durationMinutes: 60 }, async (input, cmd) => {
      if (entry) await root.services.volunteers.editHours(entry.id, input, cmd); else await root.services.volunteers.logHours({ volunteerProfileId: profile.id, ...input }, cmd);
      await saved(); if (after) setTimeout(after, 0);
    }, command());
  }
  function hoursDialog(profileId, contactName, initial = {}) {
    const profile = data().volunteerProfiles.find(row => row.id === profileId), state = { page: 1, from: initial.from || '', to: initial.to || '', trash: false }, results = el('div');
    const reopen = () => hoursDialog(profileId, contactName, state);
    const repaint = () => {
      if (state.from && state.to && state.to < state.from) { results.replaceChildren(el('p', { role: 'alert' }, t('p.periodError'))); return; }
      const totals = root.services.volunteers.totals(data(), { ...state, volunteerProfileId: profileId });
      const rows = data().volunteerHours.filter(row => row.volunteerProfileId === profileId && !!row.deletedAt === state.trash && (!state.from || row.date >= state.from) && (!state.to || row.date <= state.to)).sort((a, b) => b.date.localeCompare(a.date));
      state.filtered = !!(state.from || state.to || state.trash);
      results.replaceChildren(text(t('p.periodTotals', { duration: duration(totals.minutes), count: number(totals.entries) })),
        paginated(rows, state, entries => table(['p.date','p.activity','p.durationColumn','p.notes','p.actions'], entries.map(row => el('tr', {},
          cell(date(row.date)), el('th', { scope: 'row' }, row.activity), cell(duration(row.durationMinutes)), cell(text(row.notes)),
          cell(el('div', { class: 'actions' }, row.deletedAt ? null : action('p.edit', () => { dialog.close(); editHours(profile, row, reopen); }, true),
            action(row.deletedAt ? 'p.restoreHours' : 'p.trashHours', () => { dialog.close(); confirmAction(row.deletedAt ? 'p.restoreHours' : 'p.trashHours', row.deletedAt ? 'p.restoreHoursConfirm' : 'p.trashHoursConfirm', {},
              cmd => row.deletedAt ? root.services.volunteers.restoreHours(row.id, cmd) : root.services.volunteers.trashHours(row.id, cmd), reopen); }, true)))))), repaint));
    };
    const mode = select('p.state', [{ value: 'active', label: t('p.active') }, { value: 'trash', label: t('p.trash') }], 'active', value => { state.trash = value === 'trash'; state.page = 1; repaint(); });
    const dialog = ui.dialog(t('p.hours') + ' · ' + contactName, [el('div', { class: 'people-filters' }, ...periodFields(state, repaint), mode), text(t('p.hoursTrashHelp'), 'muted'), results,
      action('p.logHours', () => { dialog.close(); editHours(profile, null, reopen); })], { wide: true }); repaint();
  }
  function fosterSection(contact, profile, close) {
    const occupancy = root.services.fosters.occupancy(data(), profile.id);
    const stays = data().fosterStays.filter(row => row.fosterProfileId === profile.id).sort((a, b) => b.startDate.localeCompare(a.startDate));
    const animalName = id => { const animal = data().animals.find(row => row.id === id); return animal ? animal.name + ' · ' + animal.code : t('p.noValue'); };
    return el('section', { class: 'stack' }, el('h3', {}, t('p.fosterProfile')), el('dl', { class: 'people-details' },
      detail('p.availability', t('p.availability.' + profile.availability)), detail('p.occupancy', t('p.occupancyValue', Object.fromEntries(Object.entries(occupancy).map(([key, value]) => [key, typeof value === 'number' ? number(value) : value])))),
      detail('p.species', catalogNames(profile.acceptedSpeciesIds)), detail('p.sizes', catalogNames(profile.acceptedSizeIds)), detail('p.restrictions', profile.restrictions), detail('p.notes', profile.notes)),
      occupancy.overCapacity ? el('p', { class: 'notice warning' }, t('p.overCapacity')) : null,
      el('div', {}, el('h3', {}, t('p.currentAnimals')), text(names(occupancy.animalIds.map(animalName)))),
      el('details', {}, el('summary', {}, t('p.stayHistory')), text(t('p.stayDateHelp'), 'muted'),
        stays.length ? table(['p.animal','p.start','p.end','p.reason','p.exception'], stays.map(stay => el('tr', {}, el('th', { scope: 'row' }, animalName(stay.animalId)), cell(date(stay.startDate)), cell(stay.endDate ? date(stay.endDate) : t('p.openStay')), cell(empty(stay.endReason)), cell(empty(stay.exceptionReason))))) : text(t('p.empty'), 'muted')),
      !profile.deletedAt && !profile.archivedAt && !contact.deletedAt ? action('p.editFoster', () => { close(); editProfile('foster', contact, profile, () => openContact(contact.id)); }, true) : null);
  }
  function volunteerSection(contact, profile, close) {
    const totals = root.services.volunteers.totals(data(), { volunteerProfileId: profile.id });
    return el('section', { class: 'stack' }, el('h3', {}, t('p.volunteerProfile')), el('dl', { class: 'people-details' },
      detail('p.status', t('p.status.' + profile.status)), detail('p.volunteerAvailability', profile.availability), detail('p.functions', catalogNames(profile.functionIds)), detail('p.specialties', profile.specialties), detail('p.notes', profile.notes),
      detail('p.total', t('p.periodTotals', { duration: duration(totals.minutes), count: number(totals.entries) }))),
      el('div', { class: 'actions' }, !profile.deletedAt && !profile.archivedAt && !contact.deletedAt ? action('p.editVolunteer', () => { close(); editProfile('volunteer', contact, profile, () => openContact(contact.id)); }, true) : null,
        button(t('p.hours'), () => { close(); hoursDialog(profile.id, contact.name); }, true)));
  }
  function openContact(id, options = {}) {
    if (options.context) context = options.context;
    const row = data().contacts.find(item => item.id === id); if (!row || row.mergedIntoContactId) return;
    const foster = data().fosterProfiles.find(item => item.contactId === id), volunteer = data().volunteerProfiles.find(item => item.contactId === id);
    const references = contacts.references(data(), id), close = () => dialog.close();
    const actions = el('div', { class: 'actions' });
    const stateAction = (key, messageKey, method) => action(key, () => { close(); confirmAction(key, messageKey, { name: row.name }, cmd => contacts[method](id, cmd), () => openContact(id)); }, true);
    if (row.deletedAt) actions.append(stateAction('p.restore','p.restoreConfirm','restore'));
    else {
      actions.append(action('p.editContact', () => { close(); contactEditor(row); }),
        stateAction(row.archivedAt ? 'p.unarchive' : 'p.archive', row.archivedAt ? 'p.unarchiveConfirm' : 'p.archiveConfirm', row.archivedAt ? 'unarchive' : 'archive'),
        action('p.merge', () => { close(); chooseContact(other => mergeDialog(row.id, other.id), { excludeId: id, allowCreate: false }); }, true));
      if (!references.length) actions.append(stateAction('p.sendTrash','p.trashConfirm','trash'));
      if (!foster && !row.archivedAt) actions.append(action('p.newFoster', () => { close(); editProfile('foster', row, null, () => openContact(id)); }, true));
      if (!volunteer && !row.archivedAt) actions.append(action('p.newVolunteer', () => { close(); editProfile('volunteer', row, null, () => openContact(id)); }, true));
    }
    const counts = new Map(); references.forEach(ref => counts.set(ref.table, (counts.get(ref.table) || 0) + 1));
    const documents = context.documents?.({ entityType: 'contact', entityId: id });
    const dialog = ui.dialog(row.name, [el('p', { class: 'badge' }, t(row.deletedAt ? 'p.trash' : row.archivedAt ? 'p.archived' : 'p.active')), actions,
      el('section', {}, el('h3', {}, t('p.contactDetails')), el('dl', { class: 'people-details' }, detail('p.type', t('p.type.' + row.type)), detail('p.roles', roles(row.roles)), detail('p.phones', phones(row)), detail('p.email', row.email), detail('p.address', row.address), detail('p.notes', row.notes))),
      foster ? fosterSection(row, foster, close) : null, volunteer ? volunteerSection(row, volunteer, close) : null,
      references.length ? el('section', {}, el('h3', {}, t('p.related')), text(t('p.relatedHelp'), 'muted'), el('ul', {}, [...counts].map(([key, count]) => el('li', {}, t('table.' + key) + ': ' + number(count))))) : null,
      ...(Array.isArray(documents) ? documents : documents ? [documents] : [])], { wide: true });
  }
  // Contacts need a structured phone editor and a reviewable duplicate decision, rather than an opaque phone string.
  function contactEditor(previous, onSelected) {
    const values = previous || { type: 'person', name: '', email: '', address: '', notes: '', phones: [], roles: [] };
    const captured = command(), controls = new Map(), phoneRows = [], roleControls = [], duplicateArea = el('section', { class: 'people-duplicates', 'aria-live': 'polite' });
    const errors = el('div', { class: 'form-errors', role: 'alert', tabindex: '-1' }), body = el('form', {}, text(t('p.required'), 'muted'), errors);
    let operationId = root.utils.ids.uuidV4(), dirty = false, busy = false, timer;
    const duplicateConfirmed = el('input', { type: 'checkbox' });
    const changed = () => { dirty = true; dialog.dataset.dirty = 'true'; operationId = root.utils.ids.uuidV4(); duplicateConfirmed.checked = false;
      clearTimeout(timer); timer = setTimeout(reviewDuplicates, 180); };
    function field(key, type, required, maxLength) {
      const input = type === 'select' ? el('select', {}, enumOptions(root.domain.enums.contactType, 'p.type.').map(option => el('option', { value: option.value }, option.label))) :
        el(type === 'textarea' ? 'textarea' : 'input', { type: type === 'textarea' ? null : type, required: !!required, maxlength: maxLength });
      input.name = key; input.required = !!required; input.value = values[key] || ''; controls.set(key, input); input.addEventListener('input', changed); input.addEventListener('change', changed);
      const group = label('p.' + key, input); if (required) group.firstElementChild.append(' *'); body.append(group);
    }
    field('type','select',true); field('name','text',true,120); field('email','email',false,254);
    const phoneArea = el('div', { class: 'stack' }), addPhone = button(t('p.addPhone'), () => { appendPhone({ label: '', original: '' }); changed(); });
    function appendPhone(phone) {
      if (phoneRows.length >= 10) return;
      const labelInput = el('input', { type: 'text', maxlength: 40 }), original = el('input', { type: 'tel', maxlength: 50, required: true });
      labelInput.value = phone.label; original.value = phone.original;
      const item = { label: labelInput, original }, remove = button(t('p.removePhone'), () => { phoneRows.splice(phoneRows.indexOf(item), 1); row.remove(); addPhone.disabled = phoneRows.length >= 10; changed(); }, true);
      const row = el('div', { class: 'people-phone-row' }, label('p.phoneLabel', labelInput), label('p.phone', original), remove); item.row = row;
      labelInput.addEventListener('input', changed); original.addEventListener('input', changed); phoneRows.push(item); phoneArea.append(row); addPhone.disabled = phoneRows.length >= 10;
    }
    values.phones.forEach(appendPhone);
    body.append(el('fieldset', { class: 'people-fieldset' }, el('legend', {}, t('p.phones')), phoneArea, addPhone));
    const roleGroup = el('fieldset', { class: 'people-fieldset' }, el('legend', {}, t('p.roles')));
    const locked = new Set(previous ? ['foster','volunteer'].filter(role => data()[role === 'foster' ? 'fosterProfiles' : 'volunteerProfiles'].some(profile => profile.contactId === previous.id)) : []);
    root.domain.enums.contactRole.forEach(role => { const input = el('input', { type: 'checkbox', value: role }); input.checked = values.roles.includes(role); input.disabled = locked.has(role);
      input.addEventListener('change', changed); roleControls.push(input); roleGroup.append(label('p.role.' + role, input)); });
    if (locked.size) roleGroup.append(text(t('p.roleLocked'), 'muted')); body.append(roleGroup);
    field('address','textarea',false,2000); field('notes','textarea',false,20000);
    const inputValue = () => ({ type: controls.get('type').value, name: controls.get('name').value.trim(), email: controls.get('email').value.trim() || null,
      address: controls.get('address').value || null, notes: controls.get('notes').value, phones: phoneRows.map(item => ({ label: item.label.value.trim(), original: item.original.value.trim() })), roles: roleControls.filter(input => input.checked).map(input => input.value) });
    function reviewDuplicates() {
      const matches = contacts.findDuplicates(data(), inputValue(), { excludeId: previous?.id }); duplicateArea.replaceChildren();
      if (!matches.length) return;
      duplicateArea.append(el('h3', {}, t('p.duplicates')), text(t('p.duplicateHelp'), 'muted'), table(['p.name','p.email','p.phones','p.matchReason','p.actions'], matches.map(match => {
        const row = data().contacts.find(contact => contact.id === match.contactId);
        return el('tr', {}, el('th', { scope: 'row' }, row.name), cell(empty(row.email)), cell(phones(row)), cell(el('div', {}, text(t(match.strength === 'possible' ? 'p.possibleMatch' : 'p.nameMatch')), text(names(match.reasons.map(reason => t('p.match.' + reason)))))),
          cell(button(t(onSelected ? 'p.select' : 'p.open'), () => { if (!dirty || confirm(t('ui.unsaved'))) { dirty = false; dialog.close(); if (onSelected) onSelected(row); else openContact(row.id); } }, true)));
      })));
      if (matches.some(match => match.strength === 'possible')) duplicateArea.append(label('p.confirmDuplicate', duplicateConfirmed));
    }
    duplicateConfirmed.addEventListener('change', () => { dirty = true; dialog.dataset.dirty = 'true'; operationId = root.utils.ids.uuidV4(); });
    const save = el('button', { type: 'submit', class: 'button' }, t('common.save')); save.disabled = !writable();
    body.append(duplicateArea, el('div', { class: 'actions' }, button(t('common.cancel'), () => { if (!busy && (!dirty || confirm(t('ui.unsaved')))) dialog.close(); }, true), save));
    body.addEventListener('submit', async event => {
      event.preventDefault(); if (busy) return; clearTimeout(timer); reviewDuplicates(); errors.replaceChildren();
      const input = inputValue(), possible = contacts.findDuplicates(data(), input, { excludeId: previous?.id }).some(match => match.strength === 'possible');
      if (possible && !duplicateConfirmed.checked) { errors.append(text(t('p.confirmDuplicateNeeded'))); duplicateConfirmed.focus(); return; }
      busy = true; save.textContent = t('common.saving'); const disabled = [...body.elements].map(control => [control, control.disabled]); disabled.forEach(([control]) => { control.disabled = true; });
      try { const result = previous ? await contacts.update(previous.id, input, { confirmDuplicates: duplicateConfirmed.checked }, { ...captured, operationId }) : await contacts.create(input, { confirmDuplicates: duplicateConfirmed.checked }, { ...captured, operationId });
        dirty = false; dialog.close(); await saved(() => onSelected ? onSelected(data().contacts.find(row => row.id === result.result.id)) : openContact(result.result.id)); }
      catch (error) { errors.append(text(errorText(error))); const details = Array.isArray(error.details) ? error.details : [];
        details.slice(0, 12).forEach(item => { const key = item.path.split('.')[0], control = controls.get(key); if (control) { control.setAttribute('aria-invalid','true'); errors.append(text(t('p.' + key))); } }); errors.focus(); }
      finally { busy = false; disabled.forEach(([control, value]) => { control.disabled = value; }); save.textContent = t('common.save'); }
    });
    const dialog = ui.dialog(t(previous ? 'p.editContact' : 'p.newContact'), body, { wide: true, beforeClose: () => !busy && (!dirty || confirm(t('ui.unsaved'))), onClose: () => clearTimeout(timer) }); reviewDuplicates();
  }
  function mergeDialog(firstId, secondId) {
    const options = [firstId, secondId].map(id => data().contacts.find(row => row.id === id)), captured = command(), errors = el('div', { class: 'form-errors', role: 'alert', tabindex: '-1' }), comparison = el('div');
    let keepId = firstId, resolution = {}, busy = false, dirty = false, operationId = root.utils.ids.uuidV4();
    const changed = () => { dirty = true; dialog.dataset.dirty = 'true'; confirmation.checked = false; operationId = root.utils.ids.uuidV4(); };
    const confirmation = el('input', { type: 'checkbox', required: true }), form = el('form', {}, text(t('p.mergeHelp')));
    const keepSelector = select('p.keep', options.map(row => ({ value: row.id, label: row.name })), keepId, value => { keepId = value; changed(); repaint(); });
    const apply = el('button', { type: 'submit', class: 'button' }, t('p.applyMerge'));
    function repaint() {
      resolution = {}; const keep = options.find(row => row.id === keepId), other = options.find(row => row.id !== keepId);
      const conflict = ['fosterProfiles','volunteerProfiles'].some(key => data()[key].some(row => row.contactId === keep.id) && data()[key].some(row => row.contactId === other.id));
      const rows = ['type','name','email','address','notes'].map(key => {
        const same = (keep[key] || null) === (other[key] || null), shown = value => key === 'type' ? t('p.type.' + value) : empty(value);
        const field = same ? text(shown(keep[key])) : select('p.resolution', [{ value: '', label: t('p.noValue') }, { value: 'keep', label: t('p.useKeep') }, { value: 'merge', label: t('p.useMerge') }, ...(key === 'notes' ? [{ value: 'combine', label: t('p.combineNotes') }] : [])], '', value => { resolution[key] = value; changed(); });
        if (!same) field.querySelector('select').required = true;
        return el('tr', {}, el('th', { scope: 'row' }, t('p.' + key)), cell(text(shown(keep[key]))), cell(text(shown(other[key]))), cell(field));
      });
      const phoneMap = new Map(); [...keep.phones, ...other.phones].forEach(phone => { if (!phoneMap.has(phone.normalized)) phoneMap.set(phone.normalized, phone); });
      const unitedPhones = [...phoneMap.values()];
      comparison.replaceChildren(table(['p.field','p.retained','p.other','p.resolution'], rows), el('dl', { class: 'people-details' }, detail('p.mergeRoles', roles(root.domain.enums.contactRole.filter(role => keep.roles.includes(role) || other.roles.includes(role)))), detail('p.mergePhones', phones({ phones: unitedPhones }))),
        text(t('p.mergeHistory')), conflict ? el('p', { class: 'notice warning' }, t('p.mergeConflict')) : null);
      apply.disabled = conflict || !writable();
    }
    confirmation.addEventListener('change', () => { dirty = true; dialog.dataset.dirty = 'true'; operationId = root.utils.ids.uuidV4(); });
    form.append(keepSelector, comparison, label('p.mergeConfirm', confirmation), errors, el('div', { class: 'actions' }, button(t('common.cancel'), () => { if (!busy && (!dirty || confirm(t('ui.unsaved')))) dialog.close(); }, true), apply));
    form.addEventListener('submit', async event => { event.preventDefault(); if (busy) return; errors.replaceChildren();
      if (!confirmation.checked) { errors.append(text(t('p.confirmNeeded'))); confirmation.focus(); return; }
      busy = true; const disabled = [...form.elements].map(control => [control, control.disabled]); disabled.forEach(([control]) => { control.disabled = true; });
      try { await contacts.merge({ keepId, mergeId: options.find(row => row.id !== keepId).id, resolution, confirmed: true }, { ...captured, operationId }); dirty = false; dialog.close(); await saved(() => openContact(keepId)); }
      catch (error) { errors.append(text(errorText(error))); errors.focus(); }
      finally { busy = false; disabled.forEach(([control, value]) => { control.disabled = value; }); }
    });
    const dialog = ui.dialog(t('p.mergeTitle'), form, { wide: true, beforeClose: () => !busy && (!dirty || confirm(t('ui.unsaved'))) }); repaint();
  }
  function render(page, supplied) {
    context = supplied;
    const state = views[page] || (views[page] = { search: '', page: 1, role: '', type: '', mode: 'active', status: '', availability: '', functionId: '', speciesId: '', sizeId: '', sort: 'asc', from: '', to: '' });
    const results = el('div'), filterArea = el('div', { class: 'people-filters' }), titleKey = 'p.' + page;
    const repaint = () => {
      state.filtered = !!(state.search || state.role || state.type || state.mode !== 'active' || state.status || state.availability || state.functionId || state.speciesId || state.sizeId || state.from || state.to);
      let rows = contacts.list(data(), { search: state.search, role: state.role, includeArchived: state.mode !== 'active', trash: state.mode === 'trash' });
      if (state.mode === 'archived') rows = rows.filter(row => row.archivedAt);
      if (state.type) rows = rows.filter(row => row.type === state.type);
      if (state.sort === 'desc') rows.reverse();
      if (page === 'contacts') results.replaceChildren(paginated(rows, state, entries => table(['p.name','p.type','p.roles','p.email','p.phones','p.actions'], entries.map(row => el('tr', {},
        el('th', { scope: 'row' }, row.name, row.archivedAt ? el('span', { class: 'badge' }, t('p.archived')) : null), cell(t('p.type.' + row.type)), cell(roles(row.roles)), cell(empty(row.email)), cell(phones(row)), cell(button(t('p.open'), () => openContact(row.id), true))))), repaint));
      else if (page === 'fosters') {
        const profiles = rows.map(contact => ({ contact, profile: data().fosterProfiles.find(row => row.contactId === contact.id && !row.deletedAt && !row.archivedAt) })).filter(row => row.profile && (!state.availability || row.profile.availability === state.availability) && (!state.speciesId || row.profile.acceptedSpeciesIds.includes(state.speciesId)) && (!state.sizeId || row.profile.acceptedSizeIds.includes(state.sizeId)));
        results.replaceChildren(paginated(profiles, state, entries => table(['p.name','p.availability','p.occupancy','p.species','p.sizes','p.actions'], entries.map(({contact, profile}) => { const occupancy = root.services.fosters.occupancy(data(), profile.id);
          return el('tr', {}, el('th', { scope: 'row' }, contact.name), cell(t('p.availability.' + profile.availability)), cell(t('p.occupancyValue', { occupied: number(occupancy.occupied), capacity: number(occupancy.capacity), free: number(occupancy.free) })), cell(catalogNames(profile.acceptedSpeciesIds)), cell(catalogNames(profile.acceptedSizeIds)), cell(button(t('p.open'), () => openContact(contact.id), true))); })), repaint));
      } else {
        if (state.from && state.to && state.to < state.from) { results.replaceChildren(el('p', { role: 'alert' }, t('p.periodError'))); return; }
        const ids = new Set(rows.map(row => row.id)), profiles = root.services.volunteers.list(data(), { status: state.status, functionId: state.functionId }).filter(row => row.contact && ids.has(row.contact.id));
        if (state.sort === 'desc') profiles.reverse();
        const totals = root.services.volunteers.totals(data(), state), minutes = new Map(totals.byVolunteer.map(row => [row.volunteerProfileId, row.minutes])), shownIds = new Set(profiles.map(row => row.profile.id));
        const shownTotals = totals.byVolunteer.filter(row => shownIds.has(row.volunteerProfileId));
        results.replaceChildren(text(t('p.periodTotals', { duration: duration(shownTotals.reduce((sum, row) => sum + row.minutes, 0)), count: number(shownTotals.reduce((sum, row) => sum + row.entries, 0)) })),
          paginated(profiles, state, entries => table(['p.name','p.status','p.functions','p.total','p.actions'], entries.map(({contact, profile}) => el('tr', {},
            el('th', { scope: 'row' }, contact.name), cell(t('p.status.' + profile.status)), cell(catalogNames(profile.functionIds)), cell(duration(minutes.get(profile.id) || 0)),
            cell(el('div', { class: 'actions' }, button(t('p.open'), () => openContact(contact.id), true), button(t('p.hours'), () => hoursDialog(profile.id, contact.name, state), true)))))), repaint));
      }
    };
    const changed = key => value => { state[key] = value; state.page = 1; repaint(); };
    filterArea.append(searchField(state, repaint), select('p.state', enumOptions(['active','archived','allRecords',...(page === 'contacts' ? ['trash'] : [])], 'p.').map(item => ({ ...item, value: item.value === 'allRecords' ? 'all' : item.value })), state.mode, changed('mode')));
    if (page === 'contacts') filterArea.append(select('p.role', allOptions(root.domain.enums.contactRole, 'p.role.'), state.role, changed('role')), select('p.type', allOptions(root.domain.enums.contactType, 'p.type.'), state.type, changed('type')));
    if (page === 'fosters') filterArea.append(select('p.availability', allOptions(root.domain.enums.fosterAvailability, 'p.availability.'), state.availability, changed('availability')),
      select('p.species', [{ value: '', label: t('p.all') }, ...catalog('species')], state.speciesId, changed('speciesId')), select('p.sizes', [{ value: '', label: t('p.all') }, ...catalog('size')], state.sizeId, changed('sizeId')));
    if (page === 'volunteers') filterArea.append(select('p.status', allOptions(root.domain.enums.profileStatus, 'p.status.'), state.status, changed('status')), select('p.functions', [{ value: '', label: t('p.all') }, ...catalog('volunteer_function')], state.functionId, changed('functionId')), ...periodFields(state, repaint));
    filterArea.append(select('p.sort', [{ value: 'asc', label: t('p.ascending') }, { value: 'desc', label: t('p.descending') }], state.sort, changed('sort')));
    const clear = button(t('p.clear'), () => { delete views[page]; context.refresh(); }, true);
    const create = action(page === 'contacts' ? 'p.newContact' : page === 'fosters' ? 'p.newFoster' : 'p.newVolunteer', () => {
      if (page === 'contacts') contactEditor(null); else chooseContact(contact => editProfile(page === 'fosters' ? 'foster' : 'volunteer', contact, null, () => openContact(contact.id)));
    });
    repaint();
    return [el('header', { class: 'page-heading' }, el('div', {}, el('h1', {}, t(titleKey)), text(t(titleKey + 'Help'), 'muted')), create), el('section', { class: 'card stack' }, filterArea, el('div', { class: 'actions' }, clear), results)];
  }
  root.modules.people = Object.freeze({ render, openContact });
}(window.RescueManager));
