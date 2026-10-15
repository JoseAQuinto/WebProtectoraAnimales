(function () {
  'use strict';
  const root = window.RescueManager;
  function inputOnly(input, allowed, h) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !allowed.includes(key))) h.fail('InvalidInputError', 'Unexpected donation input');
  }
  function donor(input, h) {
    if (input.donorContactId) {
      const contact = h.find('contacts', input.donorContactId);
      if (contact.deletedAt || contact.archivedAt || contact.mergedIntoContactId) h.fail('InvalidInputError', 'Select an available donor');
    }
  }
  function log(h, operation, id, reason) {
    return h.insert('activityLog', h.create('activityLog', { operation, occurredAt: h.now, operationId: h.operationId,
      target: { type: 'donation', id }, summaryParameters: reason ? { reason } : {} }));
  }
  function createMonetary(input, command) {
    return root.services.context.execute('donations.createMonetary', input, (data, h) => {
      inputOnly(input, ['date', 'donorContactId', 'categoryId', 'concept', 'amountMinor', 'notes'], h); donor(input, h);
      const donationId = root.utils.ids.uuidV4();
      const movement = root.services.finance.buildMovement(data, h, { direction: 'income', date: input.date,
        categoryId: input.categoryId, concept: input.concept, amountMinor: input.amountMinor,
        contactId: input.donorContactId || null, notes: input.notes || '' },
      { source: { type: 'donation', id: donationId }, originKey: 'donation:' + donationId });
      const donation = h.create('donations', { id: donationId, date: input.date, donorContactId: input.donorContactId || null,
        type: 'monetary', financialMovementId: movement.id, notes: input.notes || '' });
      return { changes: [h.insert('donations', donation), h.insert('financialMovements', movement), log(h, 'create', donation.id)],
        result: { id: donation.id, financialMovementId: movement.id } };
    }, command);
  }
  function createMaterial(input, command) {
    return root.services.context.execute('donations.createMaterial', input, (data, h) => {
      inputOnly(input, ['date', 'donorContactId', 'notes', 'lines'], h); donor(input, h);
      if (!Array.isArray(input.lines) || !input.lines.length || input.lines.length > 1000) h.fail('InvalidInputError', 'A material donation requires 1–1000 lines');
      const donation = h.create('donations', { date: input.date, donorContactId: input.donorContactId || null,
        type: 'material', notes: input.notes || '' });
      const changes = [h.insert('donations', donation)], lineIds = [];
      for (const inputLine of input.lines) {
        inputOnly(inputLine, ['materialTypeId', 'description', 'quantityScaled', 'quantityPrecision', 'unitId', 'inventoryItemId', 'estimatedValueMinor'], h);
        for (const [field, kind] of [['materialTypeId', 'material_type'], ['unitId', 'unit']]) {
          const option = h.find('catalogOptions', inputLine[field]);
          if (!option.active || option.deletedAt || option.archivedAt || option.kind !== kind) h.fail('InvalidInputError', 'Select active material types and units');
        }
        const lineId = root.utils.ids.uuidV4(); let movement = null;
        if (inputLine.inventoryItemId) movement = root.services.inventory.buildMovement(data, h, {
          itemId: inputLine.inventoryItemId, date: input.date, type: 'donation', deltaScaled: inputLine.quantityScaled,
          reason: inputLine.description, contactId: input.donorContactId || null
        }, { donationLineId: lineId, originKey: 'donation-line:' + lineId });
        const line = h.create('donationLines', { ...inputLine, id: lineId, donationId: donation.id,
          inventoryMovementId: movement ? movement.id : null });
        changes.push(h.insert('donationLines', line));
        if (movement) changes.push(h.insert('inventoryMovements', movement));
        lineIds.push(line.id);
      }
      changes.push(log(h, 'create', donation.id));
      return { changes, result: { id: donation.id, lineIds } };
    }, command);
  }
  function voidDonation(id, input, command) {
    return root.services.context.execute('donations.void', { id, input }, (data, h) => {
      inputOnly(input, ['reason', 'date'], h);
      const previous = h.find('donations', id);
      if (previous.status !== 'recorded') h.fail('InvalidStateError', 'Only a recorded donation can be voided');
      const date = input.date || h.today;
      if (!root.utils.dates.isValid(date) || date < previous.date || date > h.today) h.fail('InvalidInputError', 'Void date must be between the donation and today');
      const donation = h.edit('donations', previous, { status: 'voided', voidReason: input.reason });
      const changes = [h.replace('donations', donation)];
      if (previous.type === 'monetary') {
        const movement = h.find('financialMovements', previous.financialMovementId);
        if (movement.status !== 'posted') h.fail('InvalidStateError', 'The donation income is already voided');
        changes.push(h.replace('financialMovements', h.edit('financialMovements', movement, {
          status: 'voided', voidReason: input.reason, voidedOn: date
        })));
      } else for (const line of data.donationLines.filter(row => row.donationId === id && row.inventoryMovementId)) {
        const movement = h.find('inventoryMovements', line.inventoryMovementId);
        if (data.inventoryMovements.some(row => row.compensatesMovementId === movement.id)) h.fail('InvalidStateError', 'A donation line was already compensated');
        const compensation = h.create('inventoryMovements', { itemId: movement.itemId, date, type: 'adjustment',
          deltaScaled: -movement.deltaScaled, reason: input.reason, compensatesMovementId: movement.id,
          originKey: 'donation-void:' + line.id });
        changes.push(h.insert('inventoryMovements', compensation));
      }
      changes.push(log(h, 'void', id, input.reason));
      return { changes, result: { id } };
    }, command);
  }
  root.services.donations = Object.freeze({ createMonetary, createMaterial, void: voidDonation });
}());
