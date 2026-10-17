(function (root) {
  'use strict';
  const ui = root.components.ui, el = ui.el, t = (key, values) => root.core.i18n.t(key, values), service = root.services.adoptions;
  const field = (key, extra = {}) => ({ key, labelKey: 'aw.' + key, ...extra });
  const note = key => field(key, { type: 'textarea', keepEmpty: true, maxLength: 20000 });
  const reason = key => field(key, { required: true, maxLength: 200 });
  const blank = () => ({ value: '', label: t('aw.choose') });
  const options = (values, prefix) => values.map(value => ({ value, label: t(prefix + value) }));
  const today = ctx => root.utils.dates.today(ctx.snapshot.tables.organizationSettings[0].timeZone);
  const allowed = ctx => typeof ctx.canWrite === 'function' ? ctx.canWrite() : ctx.canWrite === undefined ? root.services.context.status().canWrite : !!ctx.canWrite;
  const fail = key => { throw new root.core.errors.AppError(key); };
  const control = (dialog, key) => dialog.querySelector('[name="' + key + '"]');
  function show(dialog, key, visible, required = false) {
    const input = control(dialog, key); input.closest('.field').hidden = !visible; input.required = visible && required;
    const label = input.closest('.field').querySelector('label');
    label.textContent = label.textContent.replace(/ \*$/, '') + (visible && required ? ' *' : '');
  }
  function nextDay(value) {
    let year = Number(value.slice(0, 4)), month = Number(value.slice(5, 7)), day = Number(value.slice(8));
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const days = month === 2 ? (leap ? 29 : 28) : [4, 6, 9, 11].includes(month) ? 30 : 31;
    if (++day > days) { day = 1; if (++month > 12) { month = 1; year++; } }
    return String(year).padStart(4, '0') + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
  }
  function calendar(ctx, key, minimum, extra = {}) { return field(key, { type: 'date', required: true, min: minimum, max: today(ctx), ...extra }); }
  function availability() { return field('availability', { required: true, options: [blank(), ...options(['available', 'unavailable'], 'aw.availability.')] }); }
  function confirmation() { return field('confirmed', { type: 'checkbox', required: true }); }
  function open(ctx, animal, title, fields, values, save, help) {
    if (!allowed(ctx)) return ui.dialog(t('common.readOnly'), el('p', {}, t('ui.readOnly')));
    const revision = ctx.snapshot.globalRevision;
    const dialog = ui.form(t(title), fields, values, async (input, command) => {
      if (fields.some(item => item.key === 'confirmed') && !input.confirmed) fail('aw.confirmRequired');
      await save(input, command); ctx.notify?.(t('aw.saved')); await ctx.refresh();
    }, { expectedRevision: revision });
    dialog.querySelector('h2').after(el('p', {}, animal.name), help ? el('p', { class: 'muted' }, t(help)) : el('span'));
    return dialog;
  }
  function application(ctx, animal) {
    const contacts = root.services.contacts.list(ctx.snapshot.tables).filter(row => !row.archivedAt && !row.deletedAt && !row.mergedIntoContactId);
    if (!contacts.length) return ui.dialog(t('aw.new'), [el('p', {}, t('aw.noContacts')), el('a', { href: '#contacts' }, t('nav.contacts'))]);
    const choices = contacts.map(row => ({ value: row.id, label: row.name + ' · ' + t('p.type.' + row.type) +
      (row.email || row.phones[0]?.original ? ' · ' + (row.email || row.phones[0].original) : '') +
      (row.roles.length ? ' · ' + row.roles.map(role => t('p.role.' + role)).join(', ') : '') }));
    return open(ctx, animal, 'aw.new', [field('contactId', { required: true, options: [blank(), ...choices], help: 'aw.contactHelp' }),
      calendar(ctx, 'applicationDate'), note('interviewNotes'), note('notes')], { applicationDate: today(ctx), contactId: '' },
    (input, command) => service.createApplication({ animalId: animal.id, ...input }, command));
  }
  function review(ctx, animal, application) {
    return open(ctx, animal, 'aw.review', [note('interviewNotes')], application,
      (input, command) => service.review({ applicationId: application.id, interviewNotes: input.interviewNotes }, command), 'aw.reviewHelp');
  }
  function approve(ctx, animal, application) {
    return open(ctx, animal, 'aw.approve', [calendar(ctx, 'approvalDate', application.applicationDate)], { approvalDate: today(ctx) },
      (input, command) => service.approve({ applicationId: application.id, approvalDate: input.approvalDate }, command), 'aw.approveHelp');
  }
  function closeApplication(ctx, animal, application, mode) {
    const reservation = ctx.snapshot.tables.reservations.find(row => row.applicationId === application.id && row.status === 'active');
    const minimum = [application.applicationDate, reservation?.reservationDate].filter(Boolean).sort().at(-1);
    const fields = [calendar(ctx, 'date', minimum), reason('reason')];
    if (reservation) fields.push(reason('reservationClosureReason'), availability());
    fields.push(confirmation());
    return open(ctx, animal, 'aw.' + mode, fields, { date: today(ctx), availability: '', confirmed: false }, (input, command) => {
      const intent = { applicationId: application.id, date: input.date, reason: input.reason };
      if (reservation) Object.assign(intent, { reservationClosureReason: input.reservationClosureReason, availability: input.availability });
      return service[mode](intent, command);
    }, reservation ? 'aw.closeApplicationReservedHelp' : 'aw.closeApplicationHelp');
  }
  function reserve(ctx, animal, application) {
    const dialog = open(ctx, animal, 'aw.reserve', [calendar(ctx, 'reservationDate', application.approvalDate),
      field('expiresOn', { type: 'date', min: application.approvalDate, help: 'aw.expiryHelp' }), confirmation()],
    { reservationDate: today(ctx), confirmed: false }, (input, command) => service.reserve({ applicationId: application.id,
      reservationDate: input.reservationDate, expiresOn: input.expiresOn }, command), 'aw.reserveHelp');
    const on = control(dialog, 'reservationDate'), expires = control(dialog, 'expiresOn'); if (!on) return dialog;
    on.addEventListener('input', () => { expires.min = on.value || application.approvalDate; }); expires.min = on.value; return dialog;
  }
  function closeReservation(ctx, animal, reservation, mode) {
    const minimum = mode === 'expired' ? nextDay(reservation.expiresOn) : reservation.reservationDate;
    return open(ctx, animal, 'aw.reservation.' + mode, [calendar(ctx, 'date', minimum), reason('reason'), availability(), confirmation()],
      { date: today(ctx), availability: '', confirmed: false }, (input, command) => service.closeReservation({ reservationId: reservation.id,
        status: mode, date: input.date, reason: input.reason, availability: input.availability }, command), 'aw.closeReservationHelp');
  }
  function complete(ctx, animal, application) {
    const tables = ctx.snapshot.tables, pending = tables.tasks.filter(row => row.animalId === animal.id && ['pending', 'in_progress'].includes(row.status));
    const foster = tables.fosterStays.find(row => row.animalId === animal.id && !row.endDate);
    const reservation = tables.reservations.find(row => row.animalId === animal.id && row.status === 'active');
    const others = tables.adoptionApplications.filter(row => row.animalId === animal.id && row.id !== application.id && ['pending', 'under_review', 'approved'].includes(row.status));
    const episode = tables.stayEpisodes.find(row => row.animalId === animal.id && !row.exitDate);
    const minimum = [application.approvalDate, episode?.entryDate, foster?.startDate, reservation?.reservationDate].filter(Boolean).sort().at(-1);
    const categories = tables.catalogOptions.filter(row => row.kind === 'finance_income' && row.active && !row.archivedAt && !row.deletedAt);
    const fields = [calendar(ctx, 'adoptionDate', minimum), note('notes')];
    if (foster) fields.push(reason('fosterEndReason'));
    if (reservation) fields.push(reason('reservationClosureReason'));
    if (others.length) fields.push(reason('otherApplicationsReason'));
    pending.forEach((task, index) => fields.push(field('taskDecision' + index, { labelKey: 'aw.taskDecision', required: true,
      options: [blank(), ...options(['keep', 'cancel'], 'aw.task.')] }), field('taskReason' + index, { labelKey: 'aw.taskReason', maxLength: 200 })));
    if (categories.length) fields.push(field('recordFee', { type: 'checkbox', sectionKey: 'aw.feeSection' }),
      field('categoryId', { options: categories.map(row => ({ value: row.id, label: root.services.catalogs.label(row) })), sectionKey: 'aw.feeSection' }),
      field('concept', { maxLength: 200, sectionKey: 'aw.feeSection' }), field('amount', { maxLength: 30, sectionKey: 'aw.feeSection' }),
      field('decimalSeparator', { required: true, options: [{ value: '.', label: t('aw.decimalDot') }, { value: ',', label: t('aw.decimalComma') }], sectionKey: 'aw.feeSection' }));
    fields.push(confirmation());
    const dialog = open(ctx, animal, 'aw.complete', fields, { adoptionDate: today(ctx), recordFee: false, decimalSeparator: root.core.i18n.language === 'es' ? ',' : '.', confirmed: false }, async (input, command) => {
      const intent = { applicationId: application.id, adoptionDate: input.adoptionDate, notes: input.notes, taskDecisions: { keep: [], cancel: [] } };
      for (const key of ['fosterEndReason', 'reservationClosureReason', 'otherApplicationsReason']) if (input[key]) intent[key] = input[key];
      pending.forEach((task, index) => {
        if (input['taskDecision' + index] === 'keep') intent.taskDecisions.keep.push(task.id);
        else if (input['taskDecision' + index] === 'cancel' && input['taskReason' + index]) intent.taskDecisions.cancel.push({ id: task.id, reason: input['taskReason' + index] });
        else fail('aw.taskReasonRequired');
      });
      if (input.recordFee) {
        let amountMinor;
        try { amountMinor = root.utils.money.parse(input.amount, tables.organizationSettings[0].currencyCode, { decimalSeparator: input.decimalSeparator }); }
        catch (_) { throw new root.core.errors.AppError('aw.invalidFee', [{ path: 'amount' }]); }
        if (amountMinor <= 0) fail('aw.positiveFee');
        intent.fee = { categoryId: input.categoryId, concept: input.concept, amountMinor };
      }
      await service.complete(intent, command);
    }, 'aw.completeHelp');
    if (!control(dialog, 'adoptionDate')) return dialog;
    if (others.length) control(dialog, 'otherApplicationsReason').closest('.field').prepend(el('div', { class: 'muted' }, el('p', {}, t('aw.otherApplications', { count: others.length })),
      el('ul', {}, others.map(row => el('li', {}, root.services.contacts.resolve(tables, row.contactId)?.name || t('ui.unknown'))))));
    pending.forEach((task, index) => {
      const decision = control(dialog, 'taskDecision' + index), cancellation = control(dialog, 'taskReason' + index);
      decision.closest('.field').prepend(el('p', {}, task.title + ' · ' + task.dueDate));
      decision.setAttribute('aria-label', t('aw.taskDecision') + ' · ' + task.title); cancellation.setAttribute('aria-label', t('aw.taskReason') + ' · ' + task.title);
      const paint = () => show(dialog, 'taskReason' + index, decision.value === 'cancel', true); decision.addEventListener('change', paint); paint();
    });
    if (categories.length) {
      const fee = control(dialog, 'recordFee'), paint = () => { for (const key of ['categoryId', 'concept', 'amount', 'decimalSeparator']) show(dialog, key, fee.checked, true); };
      fee.closest('.field').after(el('p', { class: 'muted' }, t('aw.feeHelp', { currency: tables.organizationSettings[0].currencyCode, precision: root.utils.money.currencies[tables.organizationSettings[0].currencyCode] })));
      fee.addEventListener('change', paint); paint();
    }
    return dialog;
  }
  function returnAdoption(ctx, animal, adoption) {
    const locations = ctx.snapshot.tables.locations.filter(row => row.active && !row.archivedAt && !row.deletedAt).map(row => ({ value: row.id, label: row.name }));
    const dialog = open(ctx, animal, 'aw.return', [calendar(ctx, 'returnDate', adoption.adoptionDate), reason('reason'),
      field('locationKind', { required: true, options: [blank(), ...options(['shelter', 'temporary_external'], 'aw.location.')] }),
      field('locationId', { options: locations }), field('externalDescription', { type: 'textarea', maxLength: 2000 }), availability(), confirmation()],
    { returnDate: today(ctx), locationKind: '', availability: '', confirmed: false }, (input, command) => service.returnAdoption({ adoptionId: adoption.id,
      returnDate: input.returnDate, reason: input.reason, availability: input.availability, location: input.locationKind === 'shelter' ?
        { kind: 'shelter', id: input.locationId } : { kind: 'temporary_external', description: input.externalDescription } }, command), 'aw.returnHelp');
    const kind = control(dialog, 'locationKind'); if (!kind) return dialog;
    const paint = () => { show(dialog, 'locationId', kind.value === 'shelter', true); show(dialog, 'externalDescription', kind.value === 'temporary_external', true); };
    kind.addEventListener('change', paint); paint(); return dialog;
  }
  root.modules.adoptionForms = Object.freeze({ application, review, approve, closeApplication, reserve, closeReservation, complete, returnAdoption });
}(window.RescueManager));
