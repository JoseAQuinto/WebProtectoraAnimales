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
  const profileFields = ['totalCapacity', 'acceptedSpeciesIds', 'acceptedSizeIds', 'availability', 'restrictions', 'notes'];
  function only(input, allowed, h) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !allowed.includes(key))) l.fail(h, 'Unexpected foster profile input');
  }
  function options(h, ids, kind) {
    if (ids !== undefined && !Array.isArray(ids)) l.fail(h, 'Accepted options must be a list');
    (ids || []).forEach(value => l.option(h, value, kind));
  }
  function openStays(data, profileId) { return data.fosterStays.filter(row => row.fosterProfileId === profileId && !row.endDate); }
  function occupancy(tables, profileId) {
    const profile = tables.fosterProfiles.find(row => row.id === profileId);
    const current = profile ? openStays(tables, profileId) : [];
    return { capacity: profile ? profile.totalCapacity : 0, occupied: current.length, free: profile ? Math.max(0, profile.totalCapacity - current.length) : 0,
      animalIds: current.map(row => row.animalId), overCapacity: !!profile && current.length > profile.totalCapacity };
  }
  function createProfile(input, command) {
    return c.execute('foster.createProfile', input, (data, h) => {
      only(input, ['contactId', ...profileFields], h);
      if (data.fosterProfiles.some(row => row.contactId === input.contactId)) l.fail(h, 'This contact already has a foster profile');
      options(h, input.acceptedSpeciesIds, 'species'); options(h, input.acceptedSizeIds, 'size');
      const contact = h.find('contacts', input.contactId), role = root.services.contacts.withRole(h, contact, 'foster');
      const profile = h.create('fosterProfiles', input), changes = [h.insert('fosterProfiles', profile)];
      if (role) changes.push(role);
      changes.push(h.insert('activityLog', h.create('activityLog', { operation: 'create', occurredAt: h.now, operationId: h.operationId, target: { type: 'foster_profile', id: profile.id }, summaryParameters: {} })));
      return { changes, result: { id: profile.id } };
    }, command);
  }
  // Availability only governs new placements; capacity and compatibility must still fit the animals already hosted.
  function updateProfile(id, patch, command) {
    return c.execute('foster.updateProfile', { id, patch }, (data, h) => {
      only(patch, profileFields, h);
      const previous = l.active(h, h.find('fosterProfiles', id));
      if (patch.acceptedSpeciesIds) options(h, patch.acceptedSpeciesIds.filter(value => !previous.acceptedSpeciesIds.includes(value)), 'species');
      if (patch.acceptedSizeIds) options(h, patch.acceptedSizeIds.filter(value => !previous.acceptedSizeIds.includes(value)), 'size');
      const profile = h.edit('fosterProfiles', previous, patch), regular = openStays(data, id).filter(stay => !stay.exceptionReason);
      const animals = regular.map(stay => h.find('animals', stay.animalId));
      if (regular.length > profile.totalCapacity ||
          animals.some(animal => !profile.acceptedSpeciesIds.includes(animal.speciesId) || !animal.sizeId || !profile.acceptedSizeIds.includes(animal.sizeId))) {
        l.fail(h, 'The current foster stays would no longer fit; end or review them before reducing capacity or compatibility');
      }
      return { changes: [h.replace('fosterProfiles', profile), h.insert('activityLog', h.create('activityLog', { operation: 'update', occurredAt: h.now,
        operationId: h.operationId, target: { type: 'foster_profile', id }, summaryParameters: {} }))], result: { id } };
    }, command);
  }
  root.services.fosters = Object.freeze({ assign, end, createProfile, updateProfile, occupancy });
}(window.RescueManager));
