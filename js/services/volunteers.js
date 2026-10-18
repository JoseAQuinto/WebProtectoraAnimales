(function (root) {
  'use strict';
  const c = root.services.context;
  const profileFields = ['availability', 'functionIds', 'specialties', 'status', 'notes'];
  const hourFields = ['date', 'activity', 'durationMinutes', 'notes'];
  function only(input, allowed, h) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !allowed.includes(key))) h.fail('InvalidInputError', 'Unexpected volunteer input');
  }
  function functions(h, ids) {
    if (ids === undefined) return;
    if (!Array.isArray(ids)) h.fail('InvalidInputError', 'Volunteer functions must be a list');
    ids.forEach(id => {
      const option = h.find('catalogOptions', id);
      if (option.kind !== 'volunteer_function' || !option.active || option.deletedAt || option.archivedAt) h.fail('InvalidInputError', 'Select active volunteer functions');
    });
  }
  function log(h, operation, type, id) {
    return h.insert('activityLog', h.create('activityLog', { operation, occurredAt: h.now, operationId: h.operationId, target: { type, id }, summaryParameters: {} }));
  }
  // The person's phone and email stay on the central contact; the profile only adds volunteering data.
  function buildCreate(data, h, input) {
      only(input, ['contactId', ...profileFields], h); functions(h, input.functionIds);
      if (data.volunteerProfiles.some(row => row.contactId === input.contactId)) h.fail('InvalidStateError', 'This contact already has a volunteer profile');
      const role = root.services.contacts.withRole(h, h.find('contacts', input.contactId), 'volunteer');
      const profile = h.create('volunteerProfiles', input), changes = [h.insert('volunteerProfiles', profile), log(h, 'create', 'volunteer_profile', profile.id)];
      if (role) changes.push(role);
      return { changes, result: { id: profile.id } };
  }
  function createProfile(input, command) {
    return c.execute('volunteers.createProfile', input, (data, h) => buildCreate(data, h, input), command);
  }
  function buildUpdate(data, h, id, patch) {
      only(patch, profileFields, h);
      const previous = h.find('volunteerProfiles', id);
      if (previous.deletedAt || previous.archivedAt) h.fail('InvalidStateError', 'Restore the volunteer profile before editing it');
      if (patch.functionIds) functions(h, patch.functionIds.filter(value => !previous.functionIds.includes(value)));
      const profile = h.edit('volunteerProfiles', previous, patch);
      return { changes: [h.replace('volunteerProfiles', profile), log(h, patch.status && patch.status !== previous.status ? 'state_change' : 'update', 'volunteer_profile', id)], result: { id } };
  }
  function updateProfile(id, patch, command) {
    return c.execute('volunteers.updateProfile', { id, patch }, (data, h) => buildUpdate(data, h, id, patch), command);
  }
  function hoursProfile(h, id) {
    const profile = h.find('volunteerProfiles', id);
    if (profile.deletedAt) h.fail('InvalidStateError', 'The volunteer profile is in the trash');
    return profile;
  }
  // Hours may be recorded for an inactive volunteer: they document past activity, not availability.
  function logHours(input, command) {
    return c.execute('volunteers.logHours', input, (data, h) => {
      only(input, ['volunteerProfileId', ...hourFields], h); hoursProfile(h, input.volunteerProfileId);
      const entry = h.create('volunteerHours', input);
      return { changes: [h.insert('volunteerHours', entry), log(h, 'create', 'volunteer_hours', entry.id)], result: { id: entry.id } };
    }, command);
  }
  function editHours(id, patch, command) {
    return c.execute('volunteers.editHours', { id, patch }, (data, h) => {
      only(patch, hourFields, h);
      const previous = h.find('volunteerHours', id);
      if (previous.deletedAt) h.fail('InvalidStateError', 'Restore the entry before editing it');
      hoursProfile(h, previous.volunteerProfileId);
      return { changes: [h.replace('volunteerHours', h.edit('volunteerHours', previous, patch)), log(h, 'update', 'volunteer_hours', id)], result: { id } };
    }, command);
  }
  function setHoursTrash(id, trashed, command) {
    return c.execute(trashed ? 'volunteers.trashHours' : 'volunteers.restoreHours', { id }, (data, h) => {
      const previous = h.find('volunteerHours', id);
      if (!!previous.deletedAt === trashed) h.fail('InvalidStateError', trashed ? 'The entry is already in the trash' : 'The entry is not in the trash');
      return { changes: [h.replace('volunteerHours', h.edit('volunteerHours', previous, { deletedAt: trashed ? h.now : null })), log(h, trashed ? 'trash' : 'restore', 'volunteer_hours', id)], result: { id } };
    }, command);
  }
  // Totals always derive from the stored entries; nothing is cached on the profile.
  function totals(tables, filters = {}) {
    const rows = tables.volunteerHours.filter(row => !row.deletedAt && (!filters.volunteerProfileId || row.volunteerProfileId === filters.volunteerProfileId) &&
      (!filters.from || row.date >= filters.from) && (!filters.to || row.date <= filters.to));
    const byVolunteer = new Map();
    rows.forEach(row => { const value = byVolunteer.get(row.volunteerProfileId) || { volunteerProfileId: row.volunteerProfileId, minutes: 0, entries: 0 };
      value.minutes += row.durationMinutes; value.entries++; byVolunteer.set(row.volunteerProfileId, value); });
    return { minutes: rows.reduce((sum, row) => sum + row.durationMinutes, 0), entries: rows.length,
      byVolunteer: [...byVolunteer.values()].sort((a, b) => b.minutes - a.minutes || a.volunteerProfileId.localeCompare(b.volunteerProfileId)) };
  }
  function list(tables, filters = {}) {
    return tables.volunteerProfiles.filter(row => !row.deletedAt && (filters.includeArchived || !row.archivedAt) &&
      (!filters.status || row.status === filters.status) && (!filters.functionId || row.functionIds.includes(filters.functionId)))
      .map(profile => ({ profile, contact: root.services.contacts.resolve(tables, profile.contactId) }))
      .sort((a, b) => (a.contact?.name || '').localeCompare(b.contact?.name || '') || a.profile.id.localeCompare(b.profile.id));
  }
  root.services.volunteers = Object.freeze({ createProfile, updateProfile, logHours, editHours,
    trashHours: (id, command) => setHoursTrash(id, true, command), restoreHours: (id, command) => setHoursTrash(id, false, command), totals, list });
  root.services.volunteerCommands = Object.freeze({ create: buildCreate, update: buildUpdate });
}(window.RescueManager));
