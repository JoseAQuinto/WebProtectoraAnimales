'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

function load(crypto = webcrypto) {
  const window = { RescueManager: { utils: {} }, crypto };
  const context = vm.createContext({ window, Intl, Date, Uint8Array });
  for (const file of ['ids', 'dates', 'quantities', 'money', 'strings']) {
    const filename = path.resolve(__dirname, '../../js/utils/' + file + '.js');
    vm.runInContext(fs.readFileSync(filename, 'utf8'), context, { filename });
  }
  return window.RescueManager.utils;
}
const utils = load();

test('UUIDs have cryptographic v4 format and distinct generated values', () => {
  const values = new Set(Array.from({ length: 1000 }, () => utils.ids.uuidV4()));
  assert.equal(values.size, 1000);
  for (const value of values) assert.equal(utils.ids.isUuidV4(value), true);
  assert.equal(utils.ids.isUuidV4('00000000-0000-1000-8000-000000000000'), false);
  assert.equal(utils.ids.isUuidV4('00000000-0000-4000-7000-000000000000'), false);
  assert.equal(utils.ids.isUuidV4(null), false);
});

test('UUID fallback sets version and variant bits, and never silently loses cryptography', () => {
  const fallback = load({ getRandomValues(bytes) { bytes.fill(255); return bytes; } });
  assert.equal(fallback.ids.uuidV4(), 'ffffffff-ffff-4fff-bfff-ffffffffffff');
  assert.throws(() => load({}).ids.uuidV4(), /unavailable/);
  assert.throws(() => load(null).ids.uuidV4(), /unavailable/);
});

test('calendar validation handles Gregorian leap centuries and rejects rollover/ambiguity', () => {
  for (const value of ['0001-01-01', '0099-12-31', '2000-02-29', '2024-02-29', '9999-12-31']) {
    assert.equal(utils.dates.isValid(value), true, value);
  }
  for (const value of ['0000-01-01', '1900-02-29', '2023-02-29', '2026-04-31',
    '2026-00-01', '2026-13-01', '2026-01-00', '2026-1-01', '03/04/2026', '2026-01-01T00:00:00Z', null]) {
    assert.equal(utils.dates.isValid(value), false, String(value));
  }
});

test('half-open durations use calendar days across leap days, DST and early years', () => {
  assert.equal(utils.dates.daysBetween('2026-10-15', '2026-10-15'), 0);
  assert.equal(utils.dates.daysBetween('2024-02-28', '2024-03-01'), 2);
  assert.equal(utils.dates.daysBetween('1900-02-28', '1900-03-01'), 1);
  assert.equal(utils.dates.daysBetween('2000-02-28', '2000-03-01'), 2);
  assert.equal(utils.dates.daysBetween('2026-03-28', '2026-03-30'), 2);
  assert.equal(utils.dates.daysBetween('0099-12-31', '0100-01-01'), 1);
  assert.equal(utils.dates.daysBetween('0001-01-01', '9999-12-31'), 3652058);
  assert.throws(() => utils.dates.daysBetween('2026-10-16', '2026-10-15'), /precedes/);
  assert.throws(() => utils.dates.compare('2026-02-30', '2026-03-01'), /Invalid/);
});

test('age clamps month anniversaries, including leap births, without persisting an age', () => {
  assert.equal(utils.dates.ageMonthsOn('2024-02-29', '2025-02-28'), 12);
  assert.equal(utils.dates.ageMonthsOn('2024-02-29', '2025-02-27'), 11);
  assert.equal(utils.dates.ageMonthsOn('2026-01-31', '2026-02-28'), 1);
  assert.equal(utils.dates.ageMonthsOn('2026-01-31', '2026-03-30'), 1);
  const age = utils.dates.ageOn('2024-02-29', '2026-10-15');
  assert.equal(age.years, 2); assert.equal(age.months, 7); assert.equal(age.totalMonths, 31);
  assert.throws(() => utils.dates.ageOn('2026-10-16', '2026-10-15'), /follows/);
});

test('today uses the organization zone at an explicit instant', () => {
  const instant = Date.UTC(2026, 9, 15, 23, 30);
  assert.equal(utils.dates.today('Europe/Madrid', instant), '2026-10-16');
  assert.equal(utils.dates.today('America/Los_Angeles', instant), '2026-10-15');
  assert.throws(() => utils.dates.today('', instant), /time zone/);
  assert.throws(() => utils.dates.today('Not/AZone', instant));
  assert.throws(() => utils.dates.today('Europe/Madrid', '2026-10-15'), /timestamp/);
  assert.throws(() => utils.dates.today('UTC', -62167219200000), /calendar range/);
});

test('all eight currencies parse exact minor units, with zero/two/three decimal places', () => {
  for (const currency of ['EUR', 'USD', 'GBP', 'CAD', 'AUD', 'MXN']) {
    assert.equal(utils.money.parse('10.05', currency), 1005);
    assert.equal(utils.money.parse('10,5', currency, { decimalSeparator: ',' }), 1050);
    assert.equal(utils.money.parse('0', currency), 0);
  }
  assert.equal(utils.money.parse('100', 'JPY'), 100);
  assert.equal(utils.money.parse('0.001', 'KWD'), 1);
  assert.equal(utils.money.parse('10.005', 'KWD'), 10005);
  assert.equal(utils.money.parse('00001.20', 'EUR'), 120);
  assert.equal(utils.money.parse('-0.01', 'EUR', { allowNegative: true }), -1);
  assert.equal(Object.is(utils.money.parse('-0', 'EUR', { allowNegative: true }), -0), false);
});

test('money rejects ambiguous separators, grouping, excess decimals, numeric coercion and unsupported currencies', () => {
  for (const input of ['1,23', '1,234.56', '1.234,56', '1 234', '1e3', '+1', '-1', '.5', '1.', '1.001', '', 'NaN', 'Infinity']) {
    assert.throws(() => utils.money.parse(input, 'EUR'), /Invalid|ambiguous/, input);
  }
  assert.throws(() => utils.money.parse('1.0', 'JPY'), /Invalid/);
  assert.throws(() => utils.money.parse(1.23, 'EUR'), /text/);
  assert.throws(() => utils.money.parse('1', 'eur'), /Unsupported/);
  assert.throws(() => utils.money.parse('1', '__proto__'), /Unsupported/);
  assert.throws(() => utils.money.parse('1', { toString() { return 'EUR'; } }), /Unsupported/);
  assert.throws(() => utils.money.parse('1', 'EUR', { decimalSeparator: ';' }), /separator/);
});

test('money preserves the safe-integer boundary and fractional digits when formatted', () => {
  assert.equal(utils.money.parse('90071992547409.91', 'EUR'), Number.MAX_SAFE_INTEGER);
  assert.equal(utils.money.parse('9007199254740.991', 'KWD'), Number.MAX_SAFE_INTEGER);
  assert.throws(() => utils.money.parse('90071992547409.92', 'EUR'), /safe integer/);
  assert.throws(() => utils.money.parse('9007199254740.992', 'KWD'), /safe integer/);
  assert.equal(utils.money.format(101, 'USD', { locale: 'en-US' }), '$1.01');
  assert.equal(utils.money.format(-1, 'USD', { locale: 'en-US' }), '-$0.01');
  assert.match(utils.money.format(Number.MAX_SAFE_INTEGER, 'EUR', { locale: 'en-US' }), /90,071,992,547,409\.91/);
  assert.match(utils.money.format(Number.MAX_SAFE_INTEGER, 'KWD', { locale: 'en-US' }), /9,007,199,254,740\.991/);
  assert.equal(utils.money.format(100, 'JPY', { locale: 'en-US' }), '¥100');
  assert.throws(() => utils.money.format(1.5, 'EUR'), /safe scaled integer/);
});

test('scaled quantities remain exact and reject unsupported precision and stock-like negative input by default', () => {
  assert.equal(utils.quantities.parse('1.005', 3), 1005);
  assert.equal(utils.quantities.parse('12', 0), 12);
  assert.equal(utils.quantities.parse('12.30', 2), 1230);
  assert.equal(utils.quantities.parse('-0.5', 3, { allowNegative: true }), -500);
  assert.equal(utils.quantities.format(1005, 3, { locale: 'es-ES' }), '1,005');
  assert.equal(utils.quantities.format(-1, 3, { locale: 'en-US' }), '-0.001');
  assert.equal(utils.quantities.parse('9007199254740991', 0), Number.MAX_SAFE_INTEGER);
  assert.throws(() => utils.quantities.parse('9007199254740992', 0), /safe integer/);
  for (const precision of [-1, 4, 1.5, NaN]) assert.throws(() => utils.quantities.parse('1', precision), /Precision/);
  assert.throws(() => utils.quantities.parse('0.001', 2), /Invalid/);
  assert.throws(() => utils.quantities.parse('-1', 0), /Invalid/);
});

test('localized fractions remain exact with non-Latin digits', () => {
  const formatted = utils.money.format(105, 'USD', { locale: 'ar-EG' });
  assert.match(formatted, /١٫٠٥/);
});

test('search normalization finds accents and decomposed Unicode without changing originals', () => {
  const original = '  ÁNGEL\t PeÑa  ';
  assert.equal(utils.strings.normalizeSearch(original), 'angel pena');
  assert.equal(utils.strings.normalizeSearch('Cafe\u0301'), 'cafe');
  assert.equal(original, '  ÁNGEL\t PeÑa  ');
  assert.equal(utils.strings.normalizeEmail(' Example@MAIL.test '), 'example@mail.test');
});

test('phone normalization preserves significant zeros, explicit country prefixes and extensions', () => {
  assert.equal(utils.strings.normalizePhone('+34 (060) 001-020'), '+34060001020');
  assert.equal(utils.strings.normalizePhone('0034 060 001 020'), '+34060001020');
  assert.equal(utils.strings.normalizePhone('0123 0045'), '01230045');
  assert.equal(utils.strings.normalizePhone('+1 (555) 012-0000 ext. 007'), '+15550120000x007');
  assert.equal(utils.strings.normalizePhone(''), '');
  assert.throws(() => utils.strings.normalizePhone('12+34'), /Invalid/);
  assert.throws(() => utils.strings.normalizePhone('call me'), /Invalid/);
  assert.throws(() => utils.strings.normalizePhone(123456), /strings/);
});

test('microchips retain leading zeros and alternative alphanumeric formats', () => {
  const original = ' 000-123 ab/45 ';
  assert.equal(utils.strings.normalizeMicrochip(original), '000123AB/45');
  assert.equal(utils.strings.normalizeMicrochip('０００１２３'), '000123');
  assert.equal(original, ' 000-123 ab/45 ');
  assert.throws(() => utils.strings.normalizeMicrochip(123), /strings/);
});
