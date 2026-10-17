(function (root) {
  'use strict';
  const ui = root.components.ui, el = ui.el, t = (key, values) => root.core.i18n.t(key, values);
  const active = row => row && !row.archivedAt && !row.deletedAt && !row.mergedIntoContactId;
  const writable = ctx => typeof ctx.canWrite === 'function' ? ctx.canWrite() : ctx.canWrite === undefined ? root.services.context.status().canWrite : !!ctx.canWrite;
  const today = ctx => root.utils.dates.today(ctx.snapshot.tables.organizationSettings[0].timeZone);
  const number = value => new Intl.NumberFormat(root.core.i18n.language).format(value);
  const field = (key, labelKey, extra = {}) => ({ key, labelKey, ...extra });
  const fail = key => { throw new root.core.errors.AppError(key); };
  function date(ctx, value) {
    if (!value) return t('fw.ongoing');
    const format = ctx.snapshot.tables.organizationSettings[0].dateFormat;
    return format === 'day_first' ? value.slice(8) + '/' + value.slice(5, 7) + '/' + value.slice(0, 4) :
      format === 'month_first' ? value.slice(5, 7) + '/' + value.slice(8) + '/' + value.slice(0, 4) : value;
  }
  function contactFor(tables, profile) { return profile && root.services.contacts.resolve(tables, profile.contactId); }
  function contactLink(ctx, contact) {
    return contact ? ui.button(contact.name, () => { if (!ui.busy) root.modules.people.openContact(contact.id, { context: ctx }); }, true) : t('ui.unknown');
  }
  function bindNavigation(dialog) {
    dialog.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', event => {
      event.preventDefault();
      if (ui.busy || (dialog.dataset.dirty === 'true' && !confirm(t('ui.unsaved')))) return;
      dialog.close(); window.location.hash = link.getAttribute('href');
    }));
  }
  function catalogNames(tables, ids) {
    return ids.length ? ids.map(id => {
      const row = tables.catalogOptions.find(item => item.id === id);
      return row ? root.services.catalogs.label(row) : t('ui.unknown');
    }).join(', ') : t('fw.noneAccepted');
  }
  // These warnings explain the service checks. Only fosters.assign authorizes an exception and commits it.
  function warnings(tables, animal, profile) {
    const occupancy = root.services.fosters.occupancy(tables, profile.id), keys = [];
    if (profile.availability !== 'available') keys.push('fw.warningAvailability');
    if (occupancy.occupied >= occupancy.capacity) keys.push('fw.warningCapacity');
    if (!profile.acceptedSpeciesIds.includes(animal.speciesId)) keys.push('fw.warningSpecies');
    if (!animal.sizeId) keys.push('fw.warningUnknownSize');
    else if (!profile.acceptedSizeIds.includes(animal.sizeId)) keys.push('fw.warningSize');
    return keys;
  }
  function profileDetails(ctx, tables, profile) {
    const occupancy = root.services.fosters.occupancy(tables, profile.id), contact = contactFor(tables, profile);
    const pair = (key, value) => el('div', {}, el('dt', {}, t(key)), el('dd', { class: 'preserve-lines' }, value || t('fw.noNotes')));
    return el('div', { class: 'stack' }, contactLink(ctx, contact),
      el('dl', { class: 'detail-grid' }, pair('fw.occupancy', t('fw.occupancyValue', { occupied: number(occupancy.occupied), capacity: number(occupancy.capacity), free: number(occupancy.free) })),
        pair('fw.availability', t('fw.availability.' + profile.availability)), pair('fw.species', catalogNames(tables, profile.acceptedSpeciesIds)),
        pair('fw.sizes', catalogNames(tables, profile.acceptedSizeIds)), pair('fw.restrictions', profile.restrictions), pair('fw.profileNotes', profile.notes)),
      occupancy.animalIds.length ? el('div', {}, el('h4', {}, t('fw.currentAnimals')), el('ul', {}, occupancy.animalIds.map(id => {
        const animal = tables.animals.find(row => row.id === id);
        return el('li', {}, animal ? el('a', { href: '#animals/' + animal.id }, animal.name) : t('ui.unknown'));
      }))) : el('p', { class: 'muted' }, t('fw.noCurrentAnimals')));
  }
  async function saved(ctx) { ctx.notify?.(t('fw.saved')); await ctx.refresh(); }
  function ensureWrite(ctx) {
    if (writable(ctx)) return true;
    ui.dialog(t('common.readOnly'), el('p', {}, t('ui.readOnly'))); return false;
  }
  function assign(ctx, animal) {
    if (!ensureWrite(ctx)) return;
    const snapshot = ctx.snapshot, tables = snapshot.tables, episode = tables.stayEpisodes.find(row => row.animalId === animal.id && !row.exitDate);
    const profiles = tables.fosterProfiles.filter(profile => {
      const contact = tables.contacts.find(row => row.id === profile.contactId);
      return active(profile) && active(contact) && contact.roles.includes('foster');
    }).sort((a, b) => contactFor(tables, a).name.localeCompare(contactFor(tables, b).name, root.core.i18n.language));
    if (!profiles.length) {
      const empty = ui.dialog(t('fw.assign'), el('div', { class: 'stack' }, el('p', {}, t('fw.noProfiles')), el('a', { href: '#fosters' }, t('fw.manageProfiles'))));
      bindNavigation(empty); return empty;
    }
    const dialog = ui.form(t('fw.assign'), [
      field('fosterProfileId', 'fw.profile', { required: true, options: [{ value: '', label: t('fw.choose') }, ...profiles.map(profile => {
        const occupancy = root.services.fosters.occupancy(tables, profile.id);
        return { value: profile.id, label: t('fw.profileOption', { name: contactFor(tables, profile).name, occupied: number(occupancy.occupied), capacity: number(occupancy.capacity) }) };
      })] }),
      field('startDate', 'fw.startDate', { type: 'date', required: true, min: episode?.entryDate, max: today(ctx) }),
      field('notes', 'fw.notes', { type: 'textarea', keepEmpty: true }),
      field('confirmException', 'fw.confirmException', { type: 'checkbox' }),
      field('exceptionReason', 'fw.exceptionReason', { maxLength: 200, help: 'fw.exceptionHelp' })
    ], { fosterProfileId: '', startDate: today(ctx), notes: '', confirmException: false }, async (input, command) => {
      const profile = profiles.find(row => row.id === input.fosterProfileId);
      if (!profile) fail('fw.chooseProfile');
      const exceptional = warnings(tables, animal, profile).length > 0;
      if (exceptional && (!input.confirmException || !input.exceptionReason)) fail('fw.exceptionRequired');
      const intent = { animalId: animal.id, fosterProfileId: profile.id, startDate: input.startDate, notes: input.notes };
      if (exceptional) { intent.confirmException = true; intent.exceptionReason = input.exceptionReason; }
      await root.services.fosters.assign(intent, command); await saved(ctx);
    }, { expectedRevision: snapshot.globalRevision });
    const profileControl = dialog.querySelector('[name="fosterProfileId"]'), confirmControl = dialog.querySelector('[name="confirmException"]'), reasonControl = dialog.querySelector('[name="exceptionReason"]');
    const information = el('section', { class: 'stack', 'aria-live': 'polite' });
    profileControl.closest('.field').after(information);
    dialog.querySelector('h2').after(el('p', {}, animal.name), el('p', { class: 'muted' }, t('fw.assignHelp')));
    function paint(reset) {
      const profile = profiles.find(row => row.id === profileControl.value), keys = profile ? warnings(tables, animal, profile) : [];
      if (reset) { confirmControl.checked = false; reasonControl.value = ''; }
      confirmControl.closest('.field').hidden = !keys.length; confirmControl.required = !!keys.length;
      reasonControl.closest('.field').hidden = !keys.length; reasonControl.required = !!keys.length;
      information.replaceChildren(...(profile ? [profileDetails(ctx, tables, profile), keys.length ? el('div', { class: 'notice warning' },
        el('p', {}, t('fw.exceptionWarning')), el('ul', {}, keys.map(key => el('li', {}, t(key))))) : el('p', { class: 'muted' }, t('fw.compatible'))] : []));
      bindNavigation(dialog);
    }
    profileControl.addEventListener('change', () => paint(true)); paint(false); return dialog;
  }
  function end(ctx, animal, stay) {
    if (!ensureWrite(ctx)) return;
    const snapshot = ctx.snapshot, tables = snapshot.tables, locations = tables.locations.filter(row => active(row) && row.active);
    const profile = tables.fosterProfiles.find(row => row.id === stay.fosterProfileId), contact = contactFor(tables, profile);
    const dialog = ui.form(t('fw.endStay'), [
      field('endDate', 'fw.endDate', { type: 'date', required: true, min: stay.startDate, max: today(ctx), help: 'fw.intervalHelp' }),
      field('endReason', 'fw.endReason', { required: true, maxLength: 200 }),
      field('kind', 'fw.destination', { required: true, options: [{ value: '', label: t('fw.choose') },
        { value: 'shelter', label: t('fw.destination.shelter') }, { value: 'temporary_external', label: t('fw.destination.temporary_external') }] }),
      field('locationId', 'fw.shelter', { options: locations.map(row => ({ value: row.id, label: row.name })) }),
      field('description', 'fw.externalDescription', { type: 'textarea', maxLength: 2000 })
    ], { endDate: today(ctx), kind: '' }, async (input, command) => {
      const location = input.kind === 'shelter' ? { kind: 'shelter', id: input.locationId } : { kind: 'temporary_external', description: input.description };
      if (!['shelter', 'temporary_external'].includes(input.kind)) fail('fw.chooseDestination');
      await root.services.fosters.end({ fosterStayId: stay.id, endDate: input.endDate, endReason: input.endReason, location }, command); await saved(ctx);
    }, { expectedRevision: snapshot.globalRevision });
    dialog.querySelector('h2').after(el('p', {}, t('fw.endSummary', { animal: animal.name, contact: contact?.name || t('ui.unknown'), date: date(ctx, stay.startDate) })), el('p', { class: 'muted' }, t('fw.endHelp')));
    const kind = dialog.querySelector('[name="kind"]'), location = dialog.querySelector('[name="locationId"]'), description = dialog.querySelector('[name="description"]');
    function paint() {
      const shelter = kind.value === 'shelter', external = kind.value === 'temporary_external';
      location.closest('.field').hidden = !shelter; location.required = shelter;
      description.closest('.field').hidden = !external; description.required = external;
    }
    kind.addEventListener('change', paint); paint(); return dialog;
  }
  function render(ctx, animal) {
    const tables = ctx.snapshot.tables, stays = tables.fosterStays.filter(row => row.animalId === animal.id).sort((a, b) => b.startDate.localeCompare(a.startDate) || b.createdAt.localeCompare(a.createdAt));
    const open = stays.filter(row => !row.endDate), eligible = active(animal) && animal.managementStatus === 'under_care';
    const content = el('div', { class: 'stack' }, el('h3', {}, t('fw.title')), el('p', { class: 'muted' }, t('fw.intervalHelp')));
    const actions = el('div', { class: 'actions' });
    if (eligible && open.length <= 1) {
      const control = ui.button(t(open.length ? 'fw.endStay' : 'fw.assign'), () => open.length ? end(ctx, animal, open[0]) : assign(ctx, animal));
      control.disabled = !writable(ctx); actions.append(control);
    }
    actions.append(el('a', { class: 'button secondary', href: '#fosters' }, t('fw.manageProfiles'))); content.append(actions);
    if (!writable(ctx)) content.append(el('p', { class: 'notice' }, t('ui.readOnly')));
    if (!eligible) content.append(el('p', { class: 'muted' }, t('fw.inactiveAnimal')));
    if (open.length > 1) content.append(el('p', { class: 'notice warning', role: 'alert' }, t('fw.invalidOpenStays')));
    if (open.length === 1) {
      const profile = tables.fosterProfiles.find(row => row.id === open[0].fosterProfileId);
      if (profile) content.append(el('section', { class: 'card stack' }, el('h4', {}, t('fw.currentStay')), profileDetails(ctx, tables, profile)));
    }
    content.append(el('h4', {}, t('fw.history')));
    if (!stays.length) content.append(el('p', { class: 'muted' }, t('fw.empty')));
    else content.append(el('div', { class: 'table-wrap' }, el('table', {}, el('thead', {}, el('tr', {},
      ['fw.contact', 'fw.startDate', 'fw.endDate', 'fw.endReason', 'fw.exceptionReason', 'fw.notes'].map(key => el('th', { scope: 'col' }, t(key))))),
    el('tbody', {}, stays.map(stay => {
      const profile = tables.fosterProfiles.find(row => row.id === stay.fosterProfileId);
      return el('tr', {}, [contactLink(ctx, contactFor(tables, profile)), date(ctx, stay.startDate), date(ctx, stay.endDate), stay.endReason || t('fw.noNotes'), stay.exceptionReason || t('fw.noException'), stay.notes || t('fw.noNotes')]
        .map(value => el('td', { class: 'preserve-lines' }, value)));
    })))));
    return content;
  }
  root.modules.fosterWorkflow = Object.freeze({ render });
}(window.RescueManager));
