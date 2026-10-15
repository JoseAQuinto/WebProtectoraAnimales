(function (root) {
  'use strict';
  const largest = String(Number.MAX_SAFE_INTEGER);
  function checkPrecision(precision) {
    if (!Number.isInteger(precision) || precision < 0 || precision > 3) {
      throw new RangeError('Precision must be an integer from 0 to 3');
    }
  }
  function parse(text, precision, options = {}) {
    checkPrecision(precision);
    if (typeof text !== 'string') throw new TypeError('Scaled values must be entered as text');
    const separator = options.decimalSeparator === undefined ? '.' : options.decimalSeparator;
    if (separator !== '.' && separator !== ',') throw new RangeError('Choose a dot or comma decimal separator');
    const source = text.trim();
    const separatorPattern = separator === '.' ? '\\.' : ',';
    const pattern = new RegExp('^' + (options.allowNegative === true ? '-?' : '') + '\\d+' +
      (precision ? '(?:' + separatorPattern + '\\d{1,' + precision + '})?' : '') + '$');
    if (!pattern.test(source)) throw new RangeError('Invalid or ambiguous scaled value');
    const negative = source.startsWith('-');
    const components = (negative ? source.slice(1) : source).split(separator);
    const digits = (components[0] + (components[1] || '').padEnd(precision, '0')).replace(/^0+(?=\d)/, '');
    if (digits.length > largest.length || (digits.length === largest.length && digits > largest)) {
      throw new RangeError('Value exceeds the safe integer range');
    }
    const value = Number(digits);
    return negative && value !== 0 ? -value : value;
  }
  function split(value, precision) {
    checkPrecision(precision);
    if (!Number.isSafeInteger(value)) throw new RangeError('Expected a safe scaled integer');
    const digits = String(Math.abs(value)).padStart(precision + 1, '0');
    return { negative: value < 0, whole: Number(precision ? digits.slice(0, -precision) : digits),
      fraction: precision ? digits.slice(-precision) : '' };
  }
  // Localize only an exact whole integer; insert fractional digits without float division.
  // Optional currency is used by money.format after that module validates its code.
  function format(value, precision, options = {}) {
    const amount = split(value, precision);
    const locale = options.locale || 'en';
    const settings = { useGrouping: options.useGrouping === true,
      minimumFractionDigits: precision, maximumFractionDigits: precision };
    if (options.currency) { settings.style = 'currency'; settings.currency = options.currency; }
    const integer = amount.negative ? (amount.whole === 0 ? -0 : -amount.whole) : amount.whole;
    const number = new Intl.NumberFormat(locale, settings);
    const digitFormatter = new Intl.NumberFormat(locale, { useGrouping: false, maximumFractionDigits: 0 });
    const fraction = Array.from(amount.fraction, digit => digitFormatter.format(Number(digit))).join('');
    return number.formatToParts(integer).map(part => part.type === 'fraction' ? fraction : part.value).join('');
  }

  root.utils.quantities = Object.freeze({ parse, split, format });
}(window.RescueManager));
