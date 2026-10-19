(function (root) {
  'use strict';
  const context = root.services.context;
  const profileFields = ['code', 'name', 'speciesId', 'breed', 'sex', 'birthDate', 'birthPrecision', 'estimatedAgeMonths',
    'estimatedAgeReferenceDate', 'sizeId', 'color', 'microchipOriginal', 'sterilizationStatus', 'sterilizationDate',
    'photoAssetId', 'thumbnailAssetId', 'description', 'character', 'behavior', 'specialNeeds', 'notes'];
  function fail(h, message) { h.fail('BusinessRuleError', message); }
  function date(h, value, minimum) {
    if (!root.utils.dates.isValid(value) || value > h.today || (minimum && value < minimum)) fail(h, 'The fact date is invalid or outside its allowed interval');
    return value;
  }
  function reason(h, value) {
    if (typeof value !== 'string' || !value.trim() || value !== value.trim() || value.length > 200) fail(h, 'An explicit reason of 1–200 characters is required');
    return value;
  }
  function active(h, record) { if (record.archivedAt || record.deletedAt || record.mergedIntoContactId) fail(h, 'Restore or select an active record before assigning it'); return record; }
  function underCare(h, animal) { active(h, animal); if (animal.managementStatus !== 'under_care') fail(h, 'The animal must be under care'); return animal; }
  function option(h, id, kind) { const value = active(h, h.find('catalogOptions', id)); if (!value.active || value.kind !== kind) fail(h, 'Select an active option of the correct catalog'); return value; }
  function destination(h, location) {
    if (!location || !['shelter', 'temporary_external'].includes(location.kind)) fail(h, 'Select a shelter or temporary external destination');
    if (location.kind === 'shelter') {
      const target = active(h, h.find('locations', location.id)); if (!target.active) fail(h, 'The destination is inactive');
      return { locationKind: 'shelter', locationId: target.id, externalLocationDescription: null };
    }
    if (typeof location.description !== 'string' || !location.description.trim() || location.description.length > 2000) fail(h, 'Describe the temporary external destination');
    return { locationKind: 'temporary_external', locationId: null, externalLocationDescription: location.description };
  }
  function availability(h, value) { if (!['available', 'unavailable'].includes(value)) fail(h, 'Choose available or unavailable explicitly'); return value; }
  function event(h, changes, animalId, type, eventDate, source, parameters = {}) {
    const row = h.create('animalEvents', { animalId, type, eventDate, recordedAt: h.now, source,
      originKey: h.operationId + '/' + type + '/' + source.id, parameters });
    changes.push(h.insert('animalEvents', row)); return row;
  }
  function log(h, changes, operation, animalId, code, extra = {}) {
    changes.push(h.insert('activityLog', h.create('activityLog', { operation, occurredAt: h.now, operationId: h.operationId,
      target: { type: 'animal', id: animalId }, summaryParameters: Object.assign({ code }, extra) })));
  }
  function openEpisode(data, h, animalId) {
    const episodes = data.stayEpisodes.filter(row => row.animalId === animalId && !row.exitDate);
    if (episodes.length !== 1) fail(h, 'The animal must have exactly one open episode');
    return episodes[0];
  }
  function closeFoster(data, h, changes, animal, endDate, endReason) {
    const stays = data.fosterStays.filter(row => row.animalId === animal.id && !row.endDate);
    stays.forEach(stay => {
      date(h, endDate, stay.startDate);
      const updated = h.edit('fosterStays', stay, { endDate, endReason: reason(h, endReason) });
      changes.push(h.replace('fosterStays', updated));
      event(h, changes, animal.id, 'foster_end', endDate, { type: 'foster_stay', id: stay.id }, { reason: endReason });
    });
  }
  function decideTasks(data, h, changes, animalId, on, decisions) {
    const pending = data.tasks.filter(task => task.animalId === animalId && ['pending', 'in_progress'].includes(task.status));
    if (!pending.length && !decisions) return;
    if (!decisions || !Array.isArray(decisions.keep) || !Array.isArray(decisions.cancel)) fail(h, 'Explicitly keep or cancel every pending task');
    const selected = new Set(), ids = new Set(pending.map(row => row.id));
    decisions.keep.forEach(id => { if (!ids.has(id) || selected.has(id)) fail(h, 'Task decisions are stale or duplicated'); selected.add(id); });
    decisions.cancel.forEach(item => {
      if (!item || !ids.has(item.id) || selected.has(item.id)) fail(h, 'Task decisions are stale or duplicated');
      selected.add(item.id); const task = pending.find(row => row.id === item.id);
      changes.push(h.replace('tasks', h.edit('tasks', task, { status: 'cancelled', cancelledOn: on, cancellationReason: reason(h, item.reason) })));
    });
    if (selected.size !== pending.length) fail(h, 'A decision is required for every pending task');
  }
  function closeApplications(data, h, changes, animalId, on, closureReason, exceptId) {
    const applications = data.adoptionApplications.filter(row => row.animalId === animalId && row.id !== exceptId && ['pending', 'under_review', 'approved'].includes(row.status));
    if (applications.length) reason(h, closureReason);
    applications.forEach(application => {
      date(h, on, application.approvalDate || application.applicationDate);
      changes.push(h.replace('adoptionApplications', h.edit('adoptionApplications', application, { status: 'cancelled', closureReason })));
      event(h, changes, animalId, 'application', on, { type: 'adoption_application', id: application.id }, { code: 'cancelled', reason: closureReason });
    });
  }
  function closeReservations(data, h, changes, animalId, on, closureReason, status) {
    data.reservations.filter(row => row.animalId === animalId && row.status === 'active').forEach(reservation => {
      date(h, on, reservation.reservationDate); reason(h, closureReason);
      changes.push(h.replace('reservations', h.edit('reservations', reservation, { status, closedOn: on, closureReason })));
      event(h, changes, animalId, 'reservation', on, { type: 'reservation', id: reservation.id }, { code: status, reason: closureReason });
    });
  }
  function profile(h, input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) fail(h, 'Animal details are required');
    const result = {};
    Object.keys(input).forEach(key => { if (!profileFields.includes(key)) fail(h, 'The animal field cannot be edited through this operation: ' + key); result[key] = input[key]; });
    return result;
  }
  function buildEntry(data, h, input, importing = false) {
      const changes = [], on = date(h, input.date), location = destination(h, input.location), selected = availability(h, input.availability);
      let animal;
      if (input.animalId) {
        animal = active(h, h.find('animals', input.animalId));
        if (['under_care', 'deceased', 'adopted'].includes(animal.managementStatus)) fail(h, 'Use the appropriate return or correction workflow for this animal');
        if (input.animal) fail(h, 'Edit profile details separately from an existing animal entry');
        animal = h.edit('animals', animal, Object.assign({}, location, { managementStatus: 'under_care', adoptionAvailability: selected }));
        changes.push(h.replace('animals', animal));
      } else {
        const details = profile(h, input.animal);
        option(h, details.speciesId, 'species'); if (details.sizeId) option(h, details.sizeId, 'size');
        // The A-<number> shape belongs to the transactional sequence; manual codes use any other text.
        if (details.code && /^a-\d+$/i.test(details.code) && !importing) fail(h, 'Codes in the A-number format are assigned automatically');
        if (!details.code) details.code = h.allocateAnimalCode();
        if (h.hasAnimalCode ? h.hasAnimalCode(details.code) : data.animals.some(row => row.code === details.code) || data.activityLog.some(row => row.summaryParameters.code === details.code)) fail(h, 'The animal code was already assigned and cannot be reused');
        animal = h.create('animals', Object.assign({}, details, location, { managementStatus: 'under_care', adoptionAvailability: selected }));
        changes.push(h.insert('animals', animal));
      }
      const episode = h.create('stayEpisodes', { animalId: animal.id, entryDate: on, entryReason: reason(h, input.entryReason),
        entryType: data.stayEpisodes.some(row => row.animalId === animal.id) ? 'other' : 'first_entry', originDescription: input.originDescription || '', notes: input.notes || '' });
      changes.push(h.insert('stayEpisodes', episode));
      event(h, changes, animal.id, 'entry', on, { type: 'stay_episode', id: episode.id });
      log(h, changes, 'create', animal.id, animal.code);
      return { changes, result: { animalId: animal.id, episodeId: episode.id } };
  }
  function registerEntry(input, command) {
    return context.execute('animal.entry', input, (data, h) => buildEntry(data, h, input), command);
  }
  function buildUpdate(data, h, input) {
      const previous = active(h, h.find('animals', input.animalId)), patch = profile(h, input.patch);
      if (patch.speciesId && patch.speciesId !== previous.speciesId) option(h, patch.speciesId, 'species');
      if (patch.sizeId && patch.sizeId !== previous.sizeId) option(h, patch.sizeId, 'size');
      if (patch.code && patch.code !== previous.code) fail(h, 'The assigned animal code is immutable');
      const updated = h.edit('animals', previous, patch), changes = [h.replace('animals', updated)];
      log(h, changes, 'update', previous.id, 'animal.update'); return { changes, result: { animalId: previous.id } };
  }
  function update(input, command) {
    return context.execute('animal.update', input, (data, h) => buildUpdate(data, h, input), command);
  }
  function changeLocation(input, command) {
    return context.execute('animal.location', input, (data, h) => {
      const animal = underCare(h, h.find('animals', input.animalId)), episode = openEpisode(data, h, animal.id), changes = [];
      const on = date(h, input.date, episode.entryDate), location = destination(h, input.location);
      closeFoster(data, h, changes, animal, on, input.fosterEndReason);
      changes.push(h.replace('animals', h.edit('animals', animal, location)));
      event(h, changes, animal.id, 'transfer', on, { type: 'animal', id: animal.id }, { reason: reason(h, input.reason) });
      log(h, changes, 'state_change', animal.id, 'animal.location'); return { changes, result: { animalId: animal.id } };
    }, command);
  }
  function setAvailability(input, command) {
    return context.execute('animal.availability', input, (data, h) => {
      const animal = underCare(h, h.find('animals', input.animalId));
      if (data.reservations.some(row => row.animalId === animal.id && row.status === 'active')) fail(h, 'Close the active reservation before changing availability');
      const updated = h.edit('animals', animal, { adoptionAvailability: availability(h, input.availability) }), changes = [h.replace('animals', updated)];
      log(h, changes, 'state_change', animal.id, 'animal.availability'); return { changes, result: { animalId: animal.id } };
    }, command);
  }
  function departure(input, command, deceased) {
    return context.execute(deceased ? 'animal.deceased' : 'animal.exit', input, (data, h) => {
      const animal = active(h, h.find('animals', input.animalId));
      if (deceased && animal.managementStatus === 'deceased') fail(h, 'The death is already recorded');
      if (!deceased) underCare(h, animal);
      const on = date(h, input.date), why = reason(h, input.reason), changes = [];
      const episode = data.stayEpisodes.find(row => row.animalId === animal.id && !row.exitDate);
      if (episode) {
        date(h, on, episode.entryDate);
        if (!deceased && !['transfer', 'other'].includes(input.exitReason)) fail(h, 'Choose a transfer or other exit explicitly');
        changes.push(h.replace('stayEpisodes', h.edit('stayEpisodes', episode, { exitDate: on, exitReason: deceased ? 'deceased' : input.exitReason })));
      }
      closeFoster(data, h, changes, animal, on, input.fosterEndReason || why);
      closeReservations(data, h, changes, animal.id, on, input.reservationClosureReason, 'cancelled');
      closeApplications(data, h, changes, animal.id, on, input.applicationClosureReason);
      decideTasks(data, h, changes, animal.id, on, input.taskDecisions);
      changes.push(h.replace('animals', h.edit('animals', animal, { managementStatus: deceased ? 'deceased' : 'other_exit',
        deceasedOn: deceased ? on : null, adoptionAvailability: 'unavailable', locationKind: null, locationId: null, externalLocationDescription: null })));
      event(h, changes, animal.id, deceased ? 'deceased' : 'transfer', on, { type: 'animal', id: animal.id }, { reason: why });
      log(h, changes, 'state_change', animal.id, deceased ? 'animal.deceased' : 'animal.exit');
      return { changes, result: { animalId: animal.id, episodeId: episode ? episode.id : null } };
    }, command);
  }
  function disposition(id, mode, command) {
    return context.execute('animal.' + mode, { id }, (data, h) => {
      const previous = h.find('animals', id);
      if (mode !== 'restore' && (previous.managementStatus === 'under_care' ||
          data.tasks.some(task => task.animalId === id && !task.deletedAt && ['pending','in_progress'].includes(task.status)))) {
        fail(h, 'Resolve current care and pending tasks before archiving or moving the animal to trash');
      }
      if (mode !== 'restore' && previous.deletedAt) fail(h, 'The animal is already in trash');
      const patch = mode === 'restore' ? { archivedAt: null, deletedAt: null } : mode === 'archive' ? { archivedAt: h.now } : { deletedAt: h.now };
      const updated = h.edit('animals', previous, patch), changes = [h.replace('animals', updated)];
      log(h, changes, mode, id, previous.code);
      return { changes, result: { animalId: id } };
    }, command);
  }
  root.services.lifecycle = Object.freeze({ fail, date, reason, active, underCare, option, destination, availability, event, log,
    openEpisode, closeFoster, decideTasks, closeApplications, closeReservations });
  root.services.animals = Object.freeze({ registerEntry, update, changeLocation, setAvailability,
    archive: (id, command) => disposition(id, 'archive', command), trash: (id, command) => disposition(id, 'trash', command), restore: (id, command) => disposition(id, 'restore', command),
    recordDeath: (input, command) => departure(input, command, true), recordExit: (input, command) => departure(input, command, false) });
  // Pure change builders shared by forms and reviewed imports; persistence remains in context/batches.
  root.services.animalCommands = Object.freeze({ entry: buildEntry, update: buildUpdate });
}(window.RescueManager));
