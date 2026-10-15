(function () {
  'use strict';
  const root = window.RescueManager;
  function inputOnly(input, allowed, h) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !allowed.includes(key))) h.fail('InvalidInputError', 'Unexpected inventory input');
  }
  function usableItem(h, id) {
    const item = h.find('inventoryItems', id);
    if (item.deletedAt || item.archivedAt || item.status !== 'active') h.fail('InvalidStateError', 'Select an active inventory item');
    return item;
  }
  function log(h, operation, type, id, reason) {
    return h.insert('activityLog', h.create('activityLog', { operation, occurredAt: h.now, operationId: h.operationId,
      target: { type, id }, summaryParameters: reason ? { reason } : {} }));
  }
  function createItem(input, command) {
    return root.services.context.execute('inventory.createItem', input, (data, h) => {
      inputOnly(input, ['name', 'categoryId', 'unitId', 'quantityPrecision', 'minimumStockScaled', 'supplierContactId', 'notes'], h);
      for (const [field, kind] of [['categoryId', 'inventory_category'], ['unitId', 'unit']]) {
        const option = h.find('catalogOptions', input[field]);
        if (!option.active || option.deletedAt || option.archivedAt || option.kind !== kind) h.fail('InvalidInputError', 'Select an active inventory category and unit');
      }
      const item = h.create('inventoryItems', input);
      return { changes: [h.insert('inventoryItems', item), log(h, 'create', 'inventory_item', item.id)], result: { id: item.id } };
    }, command);
  }
  function buildMovement(data, h, input, source) {
    inputOnly(input, ['itemId', 'date', 'type', 'deltaScaled', 'reason', 'contactId', 'expenseMovementId', 'notes'], h);
    usableItem(h, input.itemId);
    if (input.contactId) {
      const contact = h.find('contacts', input.contactId);
      if (contact.deletedAt || contact.mergedIntoContactId) h.fail('InvalidInputError', 'Select an available contact');
    }
    if (input.expenseMovementId) {
      const expense = h.find('financialMovements', input.expenseMovementId);
      if (expense.direction !== 'expense' || expense.status !== 'posted') h.fail('InvalidInputError', 'Select a posted expense');
      if (input.type !== 'purchase') h.fail('InvalidInputError', 'Only purchases can link an expense');
    }
    return h.create('inventoryMovements', { ...input, ...(source || {}) });
  }
  function move(input, command) {
    return root.services.context.execute('inventory.move', input, (data, h) => {
      if (input.type === 'donation') h.fail('InvalidInputError', 'Create stock donations through Donations');
      const movement = buildMovement(data, h, input, { originKey: 'inventory:' + h.operationId });
      return { changes: [h.insert('inventoryMovements', movement), log(h, 'create', 'inventory_movement', movement.id)], result: { id: movement.id } };
    }, command);
  }
  function compensate(id, input, command) {
    return root.services.context.execute('inventory.compensate', { id, input }, (data, h) => {
      inputOnly(input, ['reason', 'date'], h);
      const previous = h.find('inventoryMovements', id);
      if (previous.donationLineId) h.fail('InvalidStateError', 'Void the material donation to compensate its lines together');
      if (data.inventoryMovements.some(row => row.compensatesMovementId === id)) h.fail('InvalidStateError', 'This movement was already compensated');
      const movement = h.create('inventoryMovements', { itemId: previous.itemId, date: input.date || h.today,
        type: 'adjustment', deltaScaled: -previous.deltaScaled, reason: input.reason,
        compensatesMovementId: id, originKey: 'compensation:' + id });
      return { changes: [h.insert('inventoryMovements', movement), log(h, 'correct', 'inventory_movement', id, input.reason)], result: { id: movement.id } };
    }, command);
  }
  function archive(id, command) {
    return root.services.context.execute('inventory.archive', { id }, (data, h) => {
      const previous = usableItem(h, id);
      const item = h.edit('inventoryItems', previous, { status: 'archived', archivedAt: h.now });
      return { changes: [h.replace('inventoryItems', item), log(h, 'archive', 'inventory_item', id)], result: { id } };
    }, command);
  }
  function stock(tables, itemId) {
    const item = tables.inventoryItems.find(row => row.id === itemId);
    if (!item) throw new RangeError('Unknown inventory item');
    const total = tables.inventoryMovements.filter(row => row.itemId === itemId).reduce((sum, row) => sum + BigInt(row.deltaScaled), 0n);
    if (total < 0n || total > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError('Invalid stock balance');
    const quantityScaled = Number(total);
    return { quantityScaled, quantityPrecision: item.quantityPrecision, unitId: item.unitId,
      minimumStockScaled: item.minimumStockScaled, belowMinimum: quantityScaled < item.minimumStockScaled,
      atMinimum: quantityScaled === item.minimumStockScaled };
  }
  root.services.inventory = Object.freeze({ createItem, move, compensate, archive, stock, buildMovement });
}());
