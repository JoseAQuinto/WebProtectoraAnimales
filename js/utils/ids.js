(function (root) {
  'use strict';

  // uuidV4(): cryptographic UUID; unavailable cryptography is a hard failure.
  function uuidV4() {
    const api = window.crypto;
    if (api && typeof api.randomUUID === 'function') return api.randomUUID();
    if (!api || typeof api.getRandomValues !== 'function') {
      throw new Error('Cryptographic random generation is unavailable');
    }
    const bytes = api.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0'));
    return hex.slice(0, 4).join('') + '-' + hex.slice(4, 6).join('') + '-' +
      hex.slice(6, 8).join('') + '-' + hex.slice(8, 10).join('') + '-' + hex.slice(10).join('');
  }

  function isUuidV4(value) {
    return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  root.utils.ids = Object.freeze({ uuidV4, isUuidV4 });
}(window.RescueManager));
