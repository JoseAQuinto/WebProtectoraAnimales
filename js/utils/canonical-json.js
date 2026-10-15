(function () {
  'use strict';
  const dangerous = new Set(['__proto__', 'constructor', 'prototype']);
  function validUnicode(text) {
    for (let index = 0; index < text.length; index++) {
      const unit = text.charCodeAt(index);
      if (unit >= 0xd800 && unit <= 0xdbff) {
        const next = text.charCodeAt(++index);
        if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      } else if (unit >= 0xdc00 && unit <= 0xdfff) return false;
    }
    return true;
  }
  function canonicalize(value) {
    const stack = new Set();
    function visit(item, depth) {
      if (depth > 40) throw new RangeError('JSON nesting exceeds 40');
      if (item === null) return 'null';
      if (typeof item === 'boolean') return item ? 'true' : 'false';
      if (typeof item === 'string') {
        if (!validUnicode(item)) throw new TypeError('Invalid Unicode string');
        return JSON.stringify(item);
      }
      if (typeof item === 'number') {
        if (!Number.isFinite(item) || (Number.isInteger(item) && !Number.isSafeInteger(item))) throw new TypeError('Unsafe JSON number');
        return JSON.stringify(item);
      }
      if (typeof item !== 'object') throw new TypeError('Unsupported JSON value');
      if (stack.has(item)) throw new TypeError('Cyclic JSON value');
      stack.add(item);
      let result;
      if (Object.getOwnPropertySymbols(item).length) throw new TypeError('Symbol JSON keys are unsupported');
      if (Array.isArray(item)) {
        if (Object.getOwnPropertyNames(item).length !== item.length + 1) throw new TypeError('Sparse or decorated JSON array');
        const entries = [];
        for (let index = 0; index < item.length; index++) {
          const descriptor = Object.getOwnPropertyDescriptor(item, String(index));
          if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) throw new TypeError('JSON accessors are unsupported');
          entries.push(visit(descriptor.value, depth + 1));
        }
        result = '[' + entries.join(',') + ']';
      } else {
        const prototype = Object.getPrototypeOf(item);
        if (prototype !== null && Object.getPrototypeOf(prototype) !== null) throw new TypeError('Expected plain JSON object');
        const entries = Object.keys(item).sort().map(key => {
          if (dangerous.has(key) || !validUnicode(key)) throw new TypeError('Invalid JSON key');
          const descriptor = Object.getOwnPropertyDescriptor(item, key);
          if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) throw new TypeError('JSON accessors are unsupported');
          return JSON.stringify(key) + ':' + visit(descriptor.value, depth + 1);
        });
        result = '{' + entries.join(',') + '}';
      }
      stack.delete(item);
      return result;
    }
    return visit(value, 0);
  }
  window.RescueManager.utils.canonicalJson = Object.freeze({ stringify: canonicalize });
}());
