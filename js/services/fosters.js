(function (root) {
  'use strict';
  const c = root.services.context, l = root.services.lifecycle;
  function assign(input, command) {
    return c.execute('foster.assign', input, (data, h) => {
      const animal = l.underCare(h, h.find('animals', input.animalId)), episode = l.openEpisode(data, h, animal.id);
      const profile = l.active(h, h.find('fosterProfiles', input.fosterProfileId)), contact = l.active(h, h.find('contacts', profile.contactId));
      if (!contact.roles.includes('foster')) l.fail(h, 'The selected contact must have the foster role');
      if (data.fosterStays.some(row => row.animalId === animal.id && !row.endDate)) l.fail(h, 'The animal already has an open foster stay');
      const startDate = l.date(h, input.startDate, episode.entryDate);
      const occupied = data.fosterStays.filter(row => row.fosterProfileId === profile.id && !row.endDate).length;
      const exception = profile.availability !== 'available' || occupied >= profile.totalCapacity ||
        !profile.acceptedSpeciesIds.includes(animal.speciesId) || !animal.sizeId || !profile.acceptedSizeIds.includes(animal.sizeId);
      if (exception && input.confirmException !== true) l.fail(h, 'Confirm the foster capacity or compatibility exception explicitly');
      const exceptionReason = exception ? l.reason(h, input.exceptionReason) : (input.exceptionReason || null);
      const stay = h.create('fosterStays', { animalId: animal.id, episodeId: episode.id, fosterProfileId: profile.id,
        startDate, exceptionReason, notes: input.notes || '' });
      const updated = h.edit('animals', animal, { locationKind: 'foster', locationId: null, externalLocationDescription: null });
      const changes = [h.insert('fosterStays', stay), h.replace('animals', updated)];
      l.event(h, changes, animal.id, 'foster_start', startDate, { type: 'foster_stay', id: stay.id }, exceptionReason ? { reason: exceptionReason } : {});
      l.log(h, changes, 'state_change', animal.id, 'foster.assign');
      return { changes, result: { animalId: animal.id, fosterStayId: stay.id } };
    }, command);
  }
  function end(input, command) {
    return c.execute('foster.end', input, (data, h) => {
      const stay = h.find('fosterStays', input.fosterStayId);
      if (stay.endDate) l.fail(h, 'The foster stay is already closed');
      const animal = l.underCare(h, h.find('animals', stay.animalId)), changes = [];
      const on = l.date(h, input.endDate, stay.startDate), location = l.destination(h, input.location);
      l.closeFoster(data, h, changes, animal, on, input.endReason);
      changes.push(h.replace('animals', h.edit('animals', animal, location)));
      l.log(h, changes, 'state_change', animal.id, 'foster.end');
      return { changes, result: { animalId: animal.id, fosterStayId: stay.id } };
    }, command);
  }
  root.services.fosters = Object.freeze({ assign, end });
}(window.RescueManager));
