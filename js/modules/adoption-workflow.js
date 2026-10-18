(function (root) {
  'use strict';
  const ui = root.components.ui, el = ui.el, t = (key, values) => root.core.i18n.t(key, values), forms = root.modules.adoptionForms;
  const pageSize = 10, views = new Map();
  const empty = () => el('p', { class: 'muted' }, t('aw.empty'));
  function render(ctx, animal, focus = null) {
    const tables = ctx.snapshot.tables, section = el('div', { class: 'stack adoption-workflow' });
    const active = !animal.archivedAt && !animal.deletedAt, underCare = active && animal.managementStatus === 'under_care';
    const canWrite = () => typeof ctx.canWrite === 'function' ? ctx.canWrite() : ctx.canWrite === undefined ? root.services.context.status().canWrite : !!ctx.canWrite;
    const today = root.utils.dates.today(tables.organizationSettings[0].timeZone);
    const date = value => {
      if (!value) return t('aw.notSpecified');
      const format = tables.organizationSettings[0].dateFormat;
      return format === 'day_first' ? value.slice(8) + '/' + value.slice(5, 7) + '/' + value.slice(0, 4) :
        format === 'month_first' ? value.slice(5, 7) + '/' + value.slice(8) + '/' + value.slice(0, 4) : value;
    };
    const action = (key, work) => { const button = ui.button(t(key), work, true); button.disabled = !canWrite(); return button; };
    const contact = id => {
      const row = root.services.contacts.resolve(tables, id);
      return row ? ui.button(row.name, () => root.modules.people.openContact(row.id, { context: ctx }), true) : t('ui.unknown');
    };
    const contactActive = id => { const row = root.services.contacts.resolve(tables, id); return row && !row.archivedAt && !row.deletedAt && !row.mergedIntoContactId; };
    const text = (key, value) => el('div', {}, el('dt', {}, t(key)), el('dd', { class: 'preserve-lines' }, value || t('aw.notSpecified')));
    const activeReservation = tables.reservations.find(row => row.animalId === animal.id && row.status === 'active');
    const applications = tables.adoptionApplications.filter(row => row.animalId === animal.id).sort((a, b) => b.applicationDate.localeCompare(a.applicationDate) || b.createdAt.localeCompare(a.createdAt));
    const heading = el('div', { class: 'page-heading' }, el('div', {}, el('h2', {}, t('aw.applications')), el('p', { class: 'muted' }, t('aw.help'))));
    if (underCare && !focus) heading.append(action('aw.new', () => forms.application(ctx, animal)));
    if (!focus || focus.type === 'application') section.append(heading);
    if (!active) section.append(el('p', { class: 'muted' }, t('aw.restoreFirst')));
    const currentView = views.get(animal.id) || { status: '', page: 1 }; views.set(animal.id, currentView);
    const filterId = 'adoption-filter-' + root.utils.ids.uuidV4();
    const filter = el('select', { id: filterId }, el('option', { value: '' }, t('aw.allStates')),
      root.domain.enums.applicationStatus.map(value => el('option', { value }, t('a.application.' + value))));
    filter.value = currentView.status;
    const results = el('div', { class: 'stack' });
    function applicationCard(application) {
      const actions = el('div', { class: 'actions' }), eligible = contactActive(application.contactId);
      const open = ['pending', 'under_review', 'approved'].includes(application.status);
      if (underCare && open) {
        if (['pending', 'under_review'].includes(application.status)) {
          actions.append(action('aw.review', () => forms.review(ctx, animal, application)));
          if (eligible) actions.append(action('aw.approve', () => forms.approve(ctx, animal, application)));
        }
        if (application.status === 'approved' && eligible) {
          if (!activeReservation) actions.append(action('aw.reserve', () => forms.reserve(ctx, animal, application)));
          if (!activeReservation || activeReservation.applicationId === application.id) actions.append(action('aw.complete', () => forms.complete(ctx, animal, application)));
          else actions.append(el('p', { class: 'muted' }, t('aw.otherReservation')));
        }
        actions.append(action('aw.reject', () => forms.closeApplication(ctx, animal, application, 'reject')),
          action('aw.cancel', () => forms.closeApplication(ctx, animal, application, 'cancel')));
      }
      const body = el('details', {}, el('summary', {}, t('aw.details')), el('dl', { class: 'detail-grid' },
        text('aw.approvalDate', application.approvalDate ? date(application.approvalDate) : null), text('aw.interviewNotes', application.interviewNotes),
        text('aw.notes', application.notes), text('aw.closureReason', application.closureReason)));
      return el('article', { class: 'card stack' }, el('div', { class: 'page-heading' }, el('h3', {}, contact(application.contactId)),
        el('p', {}, t('a.application.' + application.status) + ' · ' + date(application.applicationDate))),
      !eligible && open ? el('p', { class: 'muted' }, t('aw.contactUnavailable')) : null, body, actions);
    }
    function paint() {
      const rows = applications.filter(row => focus ? focus.type === 'application' && row.id === focus.id : !currentView.status || row.status === currentView.status), pages = Math.max(1, Math.ceil(rows.length / pageSize));
      if (focus) currentView.page = 1;
      currentView.page = Math.min(currentView.page, pages);
      const previous = ui.button(t('aw.previous'), () => { currentView.page--; paint(); }, true), next = ui.button(t('aw.next'), () => { currentView.page++; paint(); }, true);
      previous.disabled = currentView.page <= 1; next.disabled = currentView.page >= pages;
      results.replaceChildren(...(rows.length ? rows.slice((currentView.page - 1) * pageSize, currentView.page * pageSize).map(applicationCard) : [empty()]),
        el('div', { class: 'actions' }, previous, el('span', {}, t('aw.page', { page: currentView.page, pages, count: rows.length })), next));
    }
    filter.addEventListener('change', () => { currentView.status = filter.value; currentView.page = 1; paint(); });
    if (!focus || focus.type === 'application') { if (!focus) section.append(el('div', { class: 'field' }, el('label', { for: filterId }, t('aw.filter')), filter)); section.append(results); paint(); }
    if (!focus || focus.type === 'reservation') section.append(el('h2', {}, t('aw.reservations')), el('p', { class: 'muted' }, t('aw.expiryHelp')));
    const reservations = tables.reservations.filter(row => row.animalId === animal.id && (!focus || focus.type === 'reservation' && row.id === focus.id)).sort((a, b) => b.reservationDate.localeCompare(a.reservationDate));
    if (!reservations.length && (!focus || focus.type === 'reservation')) section.append(empty());
    for (const reservation of reservations) {
      const application = applications.find(row => row.id === reservation.applicationId), actions = el('div', { class: 'actions' });
      if (underCare && reservation.status === 'active') {
        actions.append(action('aw.reservation.cancelled', () => forms.closeReservation(ctx, animal, reservation, 'cancelled')));
        if (reservation.expiresOn && today > reservation.expiresOn) actions.append(action('aw.reservation.expired', () => forms.closeReservation(ctx, animal, reservation, 'expired')));
      }
      section.append(el('article', { class: 'card stack' }, el('h3', {}, application ? contact(application.contactId) : t('ui.unknown')),
        el('dl', { class: 'detail-grid' }, text('aw.status', t('aw.reservationStatus.' + reservation.status)), text('aw.reservationDate', date(reservation.reservationDate)),
          text('aw.expiresOn', reservation.expiresOn ? date(reservation.expiresOn) : null), text('aw.closedOn', reservation.closedOn ? date(reservation.closedOn) : null), text('aw.closureReason', reservation.closureReason)), actions));
    }
    if (!focus || focus.type === 'adoption') section.append(el('h2', {}, t('aw.adoptions')), el('p', { class: 'muted' }, t('aw.historyHelp')));
    const adoptions = tables.adoptions.filter(row => row.animalId === animal.id && (!focus || focus.type === 'adoption' && row.id === focus.id)).sort((a, b) => b.adoptionDate.localeCompare(a.adoptionDate));
    if (!adoptions.length && (!focus || focus.type === 'adoption')) section.append(empty());
    for (const adoption of adoptions) {
      const movement = tables.financialMovements.find(row => row.id === adoption.financialMovementId);
      const card = el('article', { class: 'card stack' }, el('h3', {}, contact(adoption.adopterContactId)), el('dl', { class: 'detail-grid' },
        text('aw.adoptionDate', date(adoption.adoptionDate)), text('aw.returnDate', adoption.returnDate ? date(adoption.returnDate) : null), text('aw.returnReason', adoption.returnReason),
        text('aw.notes', adoption.notes), text('aw.recordedFee', movement ? root.utils.money.format(movement.amountMinor, movement.currencyCode, { locale: root.core.i18n.language }) + ' · ' + t('a.finance.' + movement.status) : null)));
      if (active && animal.managementStatus === 'adopted' && !adoption.returnDate) card.append(action('aw.return', () => forms.returnAdoption(ctx, animal, adoption)));
      if (ctx.documents) {
        const documents = el('details', {}, el('summary', {}, t('aw.documents'))); let loaded = false;
        documents.addEventListener('toggle', () => { if (documents.open && !loaded) { loaded = true; documents.append(ctx.documents({ entityType: 'adoption', entityId: adoption.id })); } }); card.append(documents);
      }
      section.append(card);
    }
    return section;
  }
  root.modules.adoptionWorkflow = Object.freeze({ render });
}(window.RescueManager));
