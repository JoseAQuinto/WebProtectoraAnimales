(function (root) {
  'use strict';
  const d = root.domain, strings = root.utils.strings;
  const fields = ['type', 'name', 'phones', 'email', 'address', 'roles', 'notes'];
  const resolvable = ['type', 'name', 'email', 'address', 'notes'];
  // Money and stock rows are immutable history: they keep pointing to the merged contact, which stays resolvable.
  const historical = new Set(['financialMovements', 'donations', 'inventoryMovements']);
  const uniqueProfiles = ['fosterProfiles', 'volunteerProfiles'];
  function only(input, allowed, h) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !allowed.includes(key))) h.fail('InvalidInputError', 'Unexpected contact input');
  }
  function phones(value, h) {
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value)) h.fail('InvalidInputError', 'Telephones must be a list');
    return value.map(phone => {
      only(phone, ['label', 'original'], h);
      if (typeof phone.original !== 'string' || !phoneKey(phone.original)) h.fail('InvalidInputError', 'Enter a valid telephone number');
      return { label: typeof phone.label === 'string' ? phone.label : '', original: phone.original };
    });
  }
  function log(h, operation, id, parameters = {}) {
    return h.insert('activityLog', h.create('activityLog', { operation, occurredAt: h.now, operationId: h.operationId,
      target: { type: 'contact', id }, summaryParameters: parameters }));
  }
  function available(h, contact) {
    if (contact.deletedAt || contact.mergedIntoContactId) h.fail('InvalidStateError', 'Select a contact that is not in the trash or merged');
    return contact;
  }
  function phoneKey(value) { try { return strings.normalizePhone(value); } catch (_) { return null; } }
  // Email or telephone matches block silent duplicates; a matching name alone is only a warning.
  function findDuplicates(tables, candidate, options = {}) {
    const email = candidate.email ? strings.normalizeEmail(candidate.email) : null;
    const numbers = new Set((candidate.phones || []).map(phone => phoneKey(phone.original || '')).filter(Boolean));
    const name = typeof candidate.name === 'string' && candidate.name.trim() ? strings.normalizeSearch(candidate.name) : null;
    return tables.contacts.filter(row => row.id !== options.excludeId && !row.deletedAt && !row.mergedIntoContactId).map(row => {
      const reasons = [];
      if (email && row.emailNormalized === email) reasons.push('email');
      if (row.phones.some(phone => numbers.has(phone.normalized))) reasons.push('phone');
      if (name && strings.normalizeSearch(row.name) === name) reasons.push('name');
      return { contactId: row.id, reasons, strength: reasons.some(reason => reason !== 'name') ? 'possible' : 'name_only' };
    }).filter(match => match.reasons.length).sort((a, b) => (a.strength === b.strength ? 0 : a.strength === 'possible' ? -1 : 1) || a.contactId.localeCompare(b.contactId));
  }
  function guardDuplicates(data, h, input, excludeId, confirmed) {
    if (confirmed !== undefined && typeof confirmed !== 'boolean') h.fail('InvalidInputError', 'Duplicate confirmation must be explicit');
    if (!confirmed && findDuplicates(data, input, { excludeId }).some(match => match.strength === 'possible')) h.fail('PossibleDuplicateError', 'A contact with the same email or telephone exists; select it or confirm a separate contact');
  }
  function create(input, options = {}, command) {
    return root.services.context.execute('contacts.create', { input, options }, (data, h) => {
      only(input, fields, h); only(options, ['confirmDuplicates'], h);
      const contact = h.create('contacts', { ...input, phones: phones(input.phones, h) });
      guardDuplicates(data, h, input, null, options.confirmDuplicates);
      return { changes: [h.insert('contacts', contact), log(h, 'create', contact.id)], result: { id: contact.id } };
    }, command);
  }
  function update(id, patch, options = {}, command) {
    return root.services.context.execute('contacts.update', { id, patch, options }, (data, h) => {
      only(patch, fields, h); only(options, ['confirmDuplicates'], h);
      const previous = available(h, h.find('contacts', id));
      const contact = h.edit('contacts', previous, patch.phones !== undefined ? { ...patch, phones: phones(patch.phones, h) } : patch);
      if (patch.email !== undefined || patch.phones !== undefined) guardDuplicates(data, h, { ...contact, name: null }, id, options.confirmDuplicates);
      return { changes: [h.replace('contacts', contact), log(h, 'update', id)], result: { id } };
    }, command);
  }
  // Every record that names this contact, found through the schemas so new relations are never missed.
  function references(tables, id) {
    const found = [];
    d.tableNames.forEach(table => Object.entries(d.schemas[table].fields).forEach(([field, spec]) => {
      if (spec.ref?.table !== 'contacts') return;
      tables[table].forEach(row => { if (row[field] === id && row.id !== id) found.push({ table, id: row.id, field }); });
    }));
    ['documentLinks', 'importIdentityMap'].forEach(table => tables[table].forEach(row => {
      if (row.entityType === 'contact' && row.entityId === id) found.push({ table, id: row.id, field: 'entityId' });
    }));
    return found;
  }
  function state(type, operation, patchFor) {
    return (id, command) => root.services.context.execute('contacts.' + type, { id }, (data, h) => {
      const previous = h.find('contacts', id), patch = patchFor(data, h, previous);
      return { changes: [h.replace('contacts', h.edit('contacts', previous, patch)), log(h, operation, id)], result: { id } };
    }, command);
  }
  const archive = state('archive', 'archive', (data, h, row) => { available(h, row); if (row.archivedAt) h.fail('InvalidStateError', 'The contact is already archived'); return { archivedAt: h.now }; });
  const unarchive = state('unarchive', 'restore', (data, h, row) => { available(h, row); if (!row.archivedAt) h.fail('InvalidStateError', 'The contact is not archived'); return { archivedAt: null }; });
  const trash = state('trash', 'trash', (data, h, row) => {
    available(h, row);
    if (references(data, row.id).length) h.fail('InvalidStateError', 'The contact has related records; archive it instead');
    return { deletedAt: h.now };
  });
  const restore = state('restore', 'restore', (data, h, row) => { if (!row.deletedAt || row.mergedIntoContactId) h.fail('InvalidStateError', 'The contact is not in the trash'); return { deletedAt: null }; });
  function merged(keep, other, resolution, h) {
    only(resolution, resolvable, h);
    const value = {};
    resolvable.forEach(field => {
      const same = root.utils.canonicalJson.stringify(keep[field] ?? null) === root.utils.canonicalJson.stringify(other[field] ?? null);
      const choice = resolution[field];
      if (same) { value[field] = keep[field]; return; }
      if (choice === 'combine' && field === 'notes') { value.notes = [keep.notes, other.notes].filter(Boolean).join('\n\n'); return; }
      if (!['keep', 'merge'].includes(choice)) h.fail('InvalidInputError', 'Choose which value to keep for every different field');
      value[field] = choice === 'keep' ? keep[field] : other[field];
    });
    const numbers = new Map();
    [...keep.phones, ...other.phones].forEach(phone => { if (!numbers.has(phone.normalized)) numbers.set(phone.normalized, { label: phone.label, original: phone.original }); });
    value.phones = [...numbers.values()];
    value.roles = d.enums.contactRole.filter(role => keep.roles.includes(role) || other.roles.includes(role));
    return value;
  }
  function merge(input, command) {
    return root.services.context.execute('contacts.merge', input, (data, h) => {
      only(input, ['keepId', 'mergeId', 'resolution', 'confirmed'], h);
      if (input.confirmed !== true) h.fail('ConfirmationRequiredError', 'Review the comparison and confirm the merge');
      if (input.keepId === input.mergeId) h.fail('InvalidInputError', 'Select two different contacts');
      const keep = available(h, h.find('contacts', input.keepId)), other = available(h, h.find('contacts', input.mergeId));
      uniqueProfiles.forEach(table => {
        if (data[table].some(row => row.contactId === keep.id) && data[table].some(row => row.contactId === other.id)) h.fail('MergeConflictError', 'Both contacts have a ' + (table === 'fosterProfiles' ? 'foster' : 'volunteer') + ' profile; keep only one before merging');
      });
      const patches = new Map();
      const patch = (table, row, values) => { const key = table + '/' + row.id; patches.set(key, { table, row, values: { ...(patches.get(key)?.values || {}), ...values } }); };
      references(data, other.id).forEach(ref => {
        if (historical.has(ref.table)) return;
        const row = data[ref.table].find(value => value.id === ref.id);
        if (ref.table === 'documentLinks' && data.documentLinks.some(link => link.documentId === row.documentId && link.entityType === 'contact' && link.entityId === keep.id)) return;
        patch(ref.table, row, { [ref.field]: keep.id });
      });
      const changes = [h.replace('contacts', h.edit('contacts', keep, merged(keep, other, input.resolution || {}, h))),
        h.replace('contacts', h.edit('contacts', other, { mergedIntoContactId: keep.id }))];
      patches.forEach(({ table, row, values }) => changes.push(h.replace(table, h.edit(table, row, values))));
      changes.push(log(h, 'merge', keep.id, { previousId: other.id, count: patches.size }));
      return { changes, result: { keepId: keep.id, mergedId: other.id, reassigned: patches.size } };
    }, command);
  }
  // Historical rows may name a merged contact; display and reports follow the chain to the surviving one.
  function resolve(tables, id) {
    let current = tables.contacts.find(row => row.id === id) || null;
    for (let hops = 0; current && current.mergedIntoContactId && hops < 50; hops++) current = tables.contacts.find(row => row.id === current.mergedIntoContactId) || null;
    return current;
  }
  function list(tables, filters = {}) {
    const query = typeof filters.search === 'string' && filters.search.trim() ? filters.search.trim() : null;
    const text = query && strings.normalizeSearch(query), email = query && strings.normalizeEmail(query), number = query && phoneKey(query);
    return tables.contacts.filter(row => !row.mergedIntoContactId && (filters.trash ? !!row.deletedAt : !row.deletedAt) &&
      (filters.includeArchived || filters.trash || !row.archivedAt) &&
      (!filters.role || (Array.isArray(filters.role) ? filters.role.some(role => row.roles.includes(role)) : row.roles.includes(filters.role))) &&
      (!query || strings.normalizeSearch(row.name).includes(text) || (row.emailNormalized || '').includes(email) ||
        (number && row.phones.some(phone => phone.normalized.includes(number)))))
      .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  }
  // Profiles live on the central contact: creating one grants its role in the same transaction.
  function withRole(h, contact, role) {
    available(h, contact);
    if (contact.roles.includes(role)) return null;
    return h.replace('contacts', h.edit('contacts', contact, { roles: d.enums.contactRole.filter(code => code === role || contact.roles.includes(code)) }));
  }
  root.services.contacts = Object.freeze({ create, update, archive, unarchive, trash, restore, merge, findDuplicates, references, resolve, list, withRole });
}(window.RescueManager));
