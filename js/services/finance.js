(function () {
  'use strict';
  const root = window.RescueManager;
  const fields = ['direction', 'date', 'categoryId', 'concept', 'amountMinor', 'currencyCode', 'animalId', 'contactId', 'notes'];
  function inputOnly(input, allowed, h) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !allowed.includes(key))) h.fail('InvalidInputError', 'Unexpected financial input');
  }
  function available(row, h) {
    if (row.deletedAt || row.archivedAt || row.mergedIntoContactId) h.fail('InvalidStateError', 'The selected record is unavailable');
    return row;
  }
  function log(h, operation, id, reason) {
    return h.insert('activityLog', h.create('activityLog', { operation, occurredAt: h.now, operationId: h.operationId,
      target: { type: 'financial_movement', id }, summaryParameters: reason ? { reason } : {} }));
  }
  function buildMovement(data, h, input, source) {
    inputOnly(input, fields, h);
    const organization = data.organizationSettings[0];
    if (!organization) h.fail('InvalidStateError', 'Organization configuration is required');
    const category = available(h.find('catalogOptions', input.categoryId), h);
    if (!category.active || category.kind !== 'finance_' + input.direction) h.fail('InvalidInputError', 'Select an active category matching income or expense');
    if (input.currencyCode !== undefined && input.currencyCode !== organization.currencyCode) h.fail('InvalidInputError', 'Movement currency must match the organization');
    if (input.animalId) available(h.find('animals', input.animalId), h);
    if (input.contactId) available(h.find('contacts', input.contactId), h);
    return h.create('financialMovements', { ...input, currencyCode: organization.currencyCode,
      ...(source ? { source: source.source, originKey: source.originKey } : {}) });
  }
  function create(input, command) {
    return root.services.context.execute('finance.create', input, (data, h) => {
      const record = buildMovement(data, h, input);
      return { changes: [h.insert('financialMovements', record), log(h, 'create', record.id)], result: { id: record.id } };
    }, command);
  }
  function voidMovement(id, input, command) {
    return root.services.context.execute('finance.void', { id, input }, (data, h) => {
      inputOnly(input, ['reason', 'date'], h);
      const previous = h.find('financialMovements', id);
      if (previous.status !== 'posted') h.fail('InvalidStateError', 'Only a posted movement can be voided');
      const replacement = h.edit('financialMovements', previous, { status: 'voided', voidReason: input.reason, voidedOn: input.date || h.today });
      const changes = [h.replace('financialMovements', replacement)];
      for (const donation of data.donations.filter(row => row.financialMovementId === id)) {
        changes.push(h.replace('donations', h.edit('donations', donation, { status: 'voided', voidReason: input.reason })));
      }
      changes.push(log(h, 'void', id, input.reason));
      return { changes, result: { id } };
    }, command);
  }
  function correct(id, input, correction, command) {
    return root.services.context.execute('finance.correct', { id, input, correction }, (data, h) => {
      inputOnly(input, fields.filter(field => field !== 'direction'), h);
      inputOnly(correction, ['reason', 'date'], h);
      const previous = h.find('financialMovements', id);
      if (previous.status !== 'posted' || previous.replacementMovementId) h.fail('InvalidStateError', 'Only an uncorrected posted movement can be corrected');
      const editable = Object.fromEntries(fields.map(field => [field, previous[field]]));
      const next = buildMovement(data, h, { ...editable, ...input }, previous.source ? {
        source: previous.source, originKey: 'correction:' + id + ':' + h.operationId
      } : null);
      const corrected = h.edit('financialMovements', previous, { status: 'voided', voidReason: correction.reason,
        voidedOn: correction.date || h.today, replacementMovementId: next.id });
      const replacement = h.create('financialMovements', { ...next, correctsMovementId: previous.id });
      const changes = [h.replace('financialMovements', corrected), h.insert('financialMovements', replacement)];
      const backlinks = [['donations', 'financialMovementId'], ['veterinaryRecords', 'expenseMovementId'],
        ['adoptions', 'financialMovementId'], ['inventoryMovements', 'expenseMovementId']];
      for (const [table, field] of backlinks) for (const row of data[table].filter(value => value[field] === id)) {
        const patch = { [field]: replacement.id };
        if (table === 'donations') { patch.date = replacement.date; patch.donorContactId = replacement.contactId; }
        changes.push(h.replace(table, h.edit(table, row, patch)));
      }
      changes.push(log(h, 'correct', id, correction.reason));
      return { changes, result: { id: replacement.id, correctsMovementId: id } };
    }, command);
  }
  function totals(records, options = {}) {
    const sums = { income: 0n, expense: 0n };
    for (const row of records) {
      if (row.status !== 'posted' || (options.from && row.date < options.from) || (options.to && row.date > options.to) ||
          (options.animalId && row.animalId !== options.animalId)) continue;
      if (!['income', 'expense'].includes(row.direction) || !Number.isSafeInteger(row.amountMinor) || row.amountMinor <= 0) throw new TypeError('Invalid financial record');
      sums[row.direction] += BigInt(row.amountMinor);
    }
    if (sums.income > BigInt(Number.MAX_SAFE_INTEGER) || sums.expense > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError('Financial total exceeds safe integer range');
    return { incomeMinor: Number(sums.income), expenseMinor: Number(sums.expense), balanceMinor: Number(sums.income - sums.expense) };
  }
  root.services.finance = Object.freeze({ create, void: voidMovement, correct, totals, buildMovement });
}());
