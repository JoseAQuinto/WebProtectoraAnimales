(function () {
  'use strict';
  const root = window.RescueManager;
  function bytes(value) {
    if (typeof value === 'string') {
      // Canonical JSON rejects malformed Unicode before reaching this layer.
      return new TextEncoder().encode(value);
    }
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    throw new TypeError('Expected text or binary bytes');
  }
  async function sha256(value, options) {
    const input = typeof Blob !== 'undefined' && value instanceof Blob ? new Uint8Array(await value.arrayBuffer()) : bytes(value);
    if (!(options && options.forceFallback) && window.crypto && window.crypto.subtle) {
      try {
        const hash = new Uint8Array(await window.crypto.subtle.digest('SHA-256', input));
        return Array.from(hash, part => part.toString(16).padStart(2, '0')).join('');
      } catch (error) {
        // Some file origins expose subtle but deny its use. The bundled implementation
        // computes the same algorithm; there is no weaker checksum fallback.
        if (!root.vendor || typeof root.vendor.sha256 !== 'function') throw error;
      }
    }
    if (!root.vendor || typeof root.vendor.sha256 !== 'function') throw new Error('SHA-256 implementation unavailable');
    return root.vendor.sha256(input);
  }
  function isHash(value) { return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value); }
  root.utils.integrity = Object.freeze({ sha256, isHash });
}());
