(function (root) {
  'use strict';
  // ISO currency codes map to the number of minor-unit decimal places.
  const currencies = Object.freeze({ EUR: 2, USD: 2, GBP: 2, CAD: 2, AUD: 2, MXN: 2, JPY: 0, KWD: 3 });
  function precision(currency) {
    if (typeof currency !== 'string' || !Object.prototype.hasOwnProperty.call(currencies, currency)) {
      throw new RangeError('Unsupported currency');
    }
    return currencies[currency];
  }
  function parse(text, currency, options) {
    return root.utils.quantities.parse(text, precision(currency), options);
  }
  function format(amountMinor, currency, options = {}) {
    return root.utils.quantities.format(amountMinor, precision(currency), {
      locale: options.locale || 'en', useGrouping: options.useGrouping !== false, currency
    });
  }

  root.utils.money = Object.freeze({ currencies, parse, format });
}(window.RescueManager));
