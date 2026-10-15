(function (root) {
  'use strict';
  function text(value) {
    if (typeof value !== 'string') throw new TypeError('Identifiers and text must remain strings');
    return value;
  }
  // Return comparison values; callers retain the original user text separately.
  function normalizeSearch(value) {
    return text(value).normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().trim().replace(/\s+/g, ' ');
  }
  function normalizeEmail(value) { return text(value).trim().toLowerCase(); }
  function normalizeMicrochip(value) { return text(value).normalize('NFKC').trim().replace(/[\s-]/g, '').toUpperCase(); }
  function normalizePhone(value) {
    let source = text(value).trim();
    if (!source) return '';
    const extension = source.match(/(?:ext\.?|extension|extensión|x|#)\s*(\d{1,10})\s*$/i);
    let suffix = '';
    if (extension) { suffix = 'x' + extension[1]; source = source.slice(0, extension.index).trim(); }
    if (!/^\+?[\d\s().-]+$/.test(source)) throw new RangeError('Invalid telephone characters');
    source = source.replace(/[\s().-]/g, '');
    if (!/^\+?\d+$/.test(source)) throw new RangeError('A telephone must contain digits');
    if (source.startsWith('00')) source = '+' + source.slice(2);
    if (source === '+') throw new RangeError('A telephone must contain digits');
    return source + suffix;
  }

  root.utils.strings = Object.freeze({ normalizeSearch, normalizeEmail, normalizePhone, normalizeMicrochip });
}(window.RescueManager));
