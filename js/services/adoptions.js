(function (root) {
  'use strict';
  const c = root.services.context, l = root.services.lifecycle;
  function createApplication(input, command) {
    return c.execute('adoption.application.create', input, (data, h) => {
      const animal = l.underCare(h, h.find('animals', input.animalId)), contact = l.active(h, h.find('contacts', input.contactId));
      const on = l.date(h, input.applicationDate);
      const application = h.create('adoptionApplications', { animalId: animal.id, contactId: contact.id, applicationDate: on,
        interviewNotes: input.interviewNotes || '', notes: input.notes || '' });
      const changes = [h.insert('adoptionApplications', application)];
      if (!contact.roles.includes('adopter')) changes.push(h.replace('contacts', h.edit('contacts', contact, { roles: contact.roles.concat('adopter') })));
      l.event(h, changes, animal.id, 'application', on, { type: 'adoption_application', id: application.id }, { code: 'pending' });
      l.log(h, changes, 'create', animal.id, 'adoption.application.create');
      return { changes, result: { applicationId: application.id, animalId: animal.id } };
    }, command);
  }
  function review(input, command) {
    return c.execute('adoption.application.review', input, (data, h) => {
      const application = h.find('adoptionApplications', input.applicationId);
      l.underCare(h, h.find('animals', application.animalId));
      if (!['pending', 'under_review'].includes(application.status)) l.fail(h, 'Only a pending application can be reviewed');
      const patch = { status: 'under_review' }; if (input.interviewNotes !== undefined) patch.interviewNotes = input.interviewNotes;
      const changes = [h.replace('adoptionApplications', h.edit('adoptionApplications', application, patch))];
      l.event(h, changes, application.animalId, 'application', h.today, { type: 'adoption_application', id: application.id }, { code: 'under_review' });
      l.log(h, changes, 'state_change', application.animalId, 'adoption.application.review');
      return { changes, result: { applicationId: application.id } };
    }, command);
  }
  function approve(input, command) {
    return c.execute('adoption.application.approve', input, (data, h) => {
      const application = h.find('adoptionApplications', input.applicationId);
      l.underCare(h, h.find('animals', application.animalId)); l.active(h, h.find('contacts', application.contactId));
      if (!['pending', 'under_review'].includes(application.status)) l.fail(h, 'Only pending or reviewed applications can be approved');
      const on = l.date(h, input.approvalDate, application.applicationDate);
      const changes = [h.replace('adoptionApplications', h.edit('adoptionApplications', application, { status: 'approved', approvalDate: on }))];
      l.event(h, changes, application.animalId, 'application', on, { type: 'adoption_application', id: application.id }, { code: 'approved' });
      l.log(h, changes, 'state_change', application.animalId, 'adoption.application.approve');
      return { changes, result: { applicationId: application.id } };
    }, command);
  }
  function closeApplication(input, command, status) {
    return c.execute('adoption.application.' + status, input, (data, h) => {
      const application = h.find('adoptionApplications', input.applicationId), animal = l.underCare(h, h.find('animals', application.animalId));
      if (!['pending', 'under_review', 'approved'].includes(application.status)) l.fail(h, 'The application is already closed');
      const on = l.date(h, input.date, application.applicationDate), closureReason = l.reason(h, input.reason), changes = [];
      const reservation = data.reservations.find(row => row.applicationId === application.id && row.status === 'active');
      if (reservation) {
        l.closeReservations(data, h, changes, animal.id, on, input.reservationClosureReason, 'cancelled');
        changes.push(h.replace('animals', h.edit('animals', animal, { adoptionAvailability: l.availability(h, input.availability) })));
      }
      changes.push(h.replace('adoptionApplications', h.edit('adoptionApplications', application, { status, closureReason })));
      l.event(h, changes, animal.id, 'application', on, { type: 'adoption_application', id: application.id }, { code: status, reason: closureReason });
      l.log(h, changes, 'state_change', animal.id, 'adoption.application.' + status);
      return { changes, result: { applicationId: application.id, animalId: animal.id } };
    }, command);
  }
  function reserve(input, command) {
    return c.execute('adoption.reserve', input, (data, h) => {
      const application = h.find('adoptionApplications', input.applicationId), animal = l.underCare(h, h.find('animals', application.animalId));
      if (application.status !== 'approved') l.fail(h, 'Approve the application before reserving');
      l.active(h, h.find('contacts', application.contactId));
      if (data.reservations.some(row => row.animalId === animal.id && row.status === 'active')) l.fail(h, 'The animal already has an active reservation');
      const on = l.date(h, input.reservationDate, application.approvalDate);
      const reservation = h.create('reservations', { animalId: animal.id, applicationId: application.id, reservationDate: on, expiresOn: input.expiresOn || null });
      const changes = [h.insert('reservations', reservation), h.replace('animals', h.edit('animals', animal, { adoptionAvailability: 'reserved' }))];
      l.event(h, changes, animal.id, 'reservation', on, { type: 'reservation', id: reservation.id }, { code: 'active' });
      l.log(h, changes, 'state_change', animal.id, 'adoption.reserve');
      return { changes, result: { reservationId: reservation.id, animalId: animal.id } };
    }, command);
  }
  function closeReservation(input, command) {
    return c.execute('adoption.reservation.close', input, (data, h) => {
      const reservation = h.find('reservations', input.reservationId), animal = l.underCare(h, h.find('animals', reservation.animalId));
      if (reservation.status !== 'active' || !['cancelled', 'expired'].includes(input.status)) l.fail(h, 'Only an active reservation can be cancelled or expired');
      const on = l.date(h, input.date, reservation.reservationDate), why = l.reason(h, input.reason);
      if (input.status === 'expired' && (!reservation.expiresOn || on <= reservation.expiresOn)) l.fail(h, 'The reservation remains valid through its expiry date');
      const changes = [];
      l.closeReservations(data, h, changes, animal.id, on, why, input.status);
      changes.push(h.replace('animals', h.edit('animals', animal, { adoptionAvailability: l.availability(h, input.availability) })));
      l.log(h, changes, 'state_change', animal.id, 'adoption.reservation.close');
      return { changes, result: { reservationId: reservation.id, animalId: animal.id } };
    }, command);
  }
  function complete(input, command) {
    return c.execute('adoption.complete', input, (data, h) => {
      const application = h.find('adoptionApplications', input.applicationId), animal = l.underCare(h, h.find('animals', application.animalId));
      const contact = l.active(h, h.find('contacts', application.contactId)), episode = l.openEpisode(data, h, animal.id);
      if (application.status !== 'approved') l.fail(h, 'Approve the application before completing adoption');
      const reservation = data.reservations.find(row => row.animalId === animal.id && row.status === 'active');
      if (reservation && reservation.applicationId !== application.id) l.fail(h, 'Cancel the reservation for another applicant before completing this adoption');
      const on = l.date(h, input.adoptionDate, application.approvalDate); l.date(h, on, episode.entryDate);
      const adoptionId = root.utils.ids.uuidV4(), changes = [];
      let movement = null;
      if (input.fee) {
        l.option(h, input.fee.categoryId, 'finance_income');
        movement = h.create('financialMovements', { direction: 'income', date: on, categoryId: input.fee.categoryId,
          concept: input.fee.concept, amountMinor: input.fee.amountMinor, currencyCode: data.organizationSettings[0].currencyCode,
          animalId: animal.id, contactId: contact.id, source: { type: 'adoption', id: adoptionId }, originKey: 'adoption/' + adoptionId + '/income' });
        changes.push(h.insert('financialMovements', movement));
      }
      const adoption = h.create('adoptions', { id: adoptionId, animalId: animal.id, applicationId: application.id, adopterContactId: contact.id,
        episodeId: episode.id, adoptionDate: on, financialMovementId: movement ? movement.id : null, notes: input.notes || '' });
      changes.push(h.insert('adoptions', adoption),
        h.replace('stayEpisodes', h.edit('stayEpisodes', episode, { exitDate: on, exitReason: 'adoption', adoptionId })),
        h.replace('adoptionApplications', h.edit('adoptionApplications', application, { status: 'completed' })));
      l.closeFoster(data, h, changes, animal, on, input.fosterEndReason);
      l.closeReservations(data, h, changes, animal.id, on, input.reservationClosureReason, 'fulfilled');
      l.closeApplications(data, h, changes, animal.id, input.otherApplicationsReason, application.id);
      l.decideTasks(data, h, changes, animal.id, on, input.taskDecisions);
      changes.push(h.replace('animals', h.edit('animals', animal, { managementStatus: 'adopted', adoptionAvailability: 'unavailable',
        locationKind: null, locationId: null, externalLocationDescription: null })));
      l.event(h, changes, animal.id, 'adoption', on, { type: 'adoption', id: adoption.id });
      l.log(h, changes, 'state_change', animal.id, 'adoption.complete');
      return { changes, result: { animalId: animal.id, adoptionId: adoption.id, financialMovementId: movement ? movement.id : null } };
    }, command);
  }
  function returnAdoption(input, command) {
    return c.execute('adoption.return', input, (data, h) => {
      const adoption = h.find('adoptions', input.adoptionId), animal = l.active(h, h.find('animals', adoption.animalId));
      if (adoption.returnDate || animal.managementStatus !== 'adopted' || data.stayEpisodes.some(row => row.animalId === animal.id && !row.exitDate)) l.fail(h, 'The adoption cannot be returned through the normal workflow');
      const on = l.date(h, input.returnDate, adoption.adoptionDate), why = l.reason(h, input.reason), location = l.destination(h, input.location);
      const episode = h.create('stayEpisodes', { animalId: animal.id, entryDate: on, entryReason: why, entryType: 'return', returnedFromAdoptionId: adoption.id });
      const changes = [h.replace('adoptions', h.edit('adoptions', adoption, { returnDate: on, returnReason: why })), h.insert('stayEpisodes', episode),
        h.replace('animals', h.edit('animals', animal, Object.assign({}, location, { managementStatus: 'under_care', adoptionAvailability: l.availability(h, input.availability) })))];
      l.event(h, changes, animal.id, 'return', on, { type: 'stay_episode', id: episode.id }, { reason: why });
      l.log(h, changes, 'state_change', animal.id, 'adoption.return');
      return { changes, result: { animalId: animal.id, adoptionId: adoption.id, episodeId: episode.id } };
    }, command);
  }
  root.services.adoptions = Object.freeze({ createApplication, review, approve, reserve, closeReservation, complete, returnAdoption,
    reject: (input, command) => closeApplication(input, command, 'rejected'), cancel: (input, command) => closeApplication(input, command, 'cancelled') });
}(window.RescueManager));
