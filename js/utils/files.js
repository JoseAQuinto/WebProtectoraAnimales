(function () {
  'use strict';
  const root = window.RescueManager;
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const extensions = Object.freeze({ 'application/pdf': ['pdf'], 'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'], 'image/webp': ['webp'], 'text/plain': ['txt'] });
  function byteView(value) {
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    throw new TypeError('Expected binary bytes');
  }
  function encodeBase64(value) {
    const bytes = byteView(value), pieces = [];
    // Bounded pieces avoid overflowing Function.apply or spreading large arrays.
    for (let start = 0; start < bytes.length; start += 12288) {
      let piece = '';
      const end = Math.min(start + 12288, bytes.length);
      for (let index = start; index < end; index += 3) {
        const first = bytes[index], second = bytes[index + 1], third = bytes[index + 2];
        piece += alphabet[first >> 2] + alphabet[((first & 3) << 4) | ((second || 0) >> 4)] +
          (index + 1 < end ? alphabet[((second & 15) << 2) | ((third || 0) >> 6)] : '=') +
          (index + 2 < end ? alphabet[third & 63] : '=');
      }
      pieces.push(piece);
    }
    return pieces.join('');
  }
  function decodedLength(value) {
    if (typeof value !== 'string' || value.length % 4 !== 0) throw new TypeError('Invalid standard Base64');
    if (!value.length) return 0;
    const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
    // A linear scan avoids regexp backtracking/stack growth on large backups.
    for (let index = 0; index < value.length - padding; index++) {
      const code = value.charCodeAt(index);
      if (!((code >= 65 && code <= 90) || (code >= 97 && code <= 122) ||
          (code >= 48 && code <= 57) || code === 43 || code === 47)) throw new TypeError('Invalid standard Base64');
    }
    const last = alphabet.indexOf(value[value.length - padding - 1]);
    if ((padding === 2 && (last & 15)) || (padding === 1 && (last & 3))) throw new TypeError('Non-canonical Base64 padding');
    return value.length / 4 * 3 - padding;
  }
  function decodeBase64(value, maximumBytes) {
    const size = decodedLength(value);
    if (maximumBytes !== undefined && (!Number.isSafeInteger(maximumBytes) || maximumBytes < 0 || size > maximumBytes)) throw new RangeError('Binary byte limit exceeded');
    const bytes = new Uint8Array(size);
    for (let index = 0, offset = 0; index < value.length; index += 4) {
      const number = (alphabet.indexOf(value[index]) << 18) | (alphabet.indexOf(value[index + 1]) << 12) |
        ((value[index + 2] === '=' ? 0 : alphabet.indexOf(value[index + 2])) << 6) |
        (value[index + 3] === '=' ? 0 : alphabet.indexOf(value[index + 3]));
      bytes[offset++] = (number >>> 16) & 255;
      if (offset < size) bytes[offset++] = (number >>> 8) & 255;
      if (offset < size) bytes[offset++] = number & 255;
    }
    return bytes;
  }
  function ascii(bytes, start, length) { return String.fromCharCode(...bytes.subarray(start, start + length)); }
  function inspect(value, declaredMime) {
    const bytes = byteView(value), view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let mime, width = null, height = null;
    if (bytes.length >= 33 && ascii(bytes, 0, 8) === '\x89PNG\r\n\x1a\n' && view.getUint32(8) === 13 && ascii(bytes, 12, 4) === 'IHDR') {
      mime = 'image/png'; width = view.getUint32(16); height = view.getUint32(20);
      let cursor = 8, ended = false;
      while (cursor + 12 <= bytes.length) {
        const size = view.getUint32(cursor), type = ascii(bytes, cursor + 4, 4);
        if (size > bytes.length - cursor - 12) break;
        cursor += size + 12;
        if (type === 'IEND') { ended = size === 0 && cursor === bytes.length; break; }
      }
      if (!ended) throw new TypeError('Incomplete PNG');
    } else if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) {
      mime = 'image/jpeg';
      if (bytes[bytes.length - 2] !== 255 || bytes[bytes.length - 1] !== 217) throw new TypeError('Incomplete JPEG');
      let cursor = 2;
      while (cursor + 4 <= bytes.length) {
        if (bytes[cursor++] !== 255) throw new TypeError('Malformed JPEG marker');
        while (bytes[cursor] === 255) cursor++;
        const marker = bytes[cursor++];
        if (marker === 218 || marker === 217) break;
        if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
        if (cursor + 2 > bytes.length) break;
        const length = view.getUint16(cursor);
        if (length < 2 || cursor + length > bytes.length) throw new TypeError('Invalid JPEG segment');
        if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker)) {
          if (length < 8) throw new TypeError('Invalid JPEG dimensions');
          height = view.getUint16(cursor + 3); width = view.getUint16(cursor + 5);
        }
        cursor += length;
      }
    } else if (bytes.length >= 30 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') {
      mime = 'image/webp';
      if (view.getUint32(4, true) + 8 !== bytes.length) throw new TypeError('Invalid WebP container length');
      const type = ascii(bytes, 12, 4);
      if (type === 'VP8X') {
        width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
        height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
      } else if (type === 'VP8L' && bytes[20] === 47) {
        const bits = view.getUint32(21, true); width = (bits & 16383) + 1; height = ((bits >>> 14) & 16383) + 1;
      } else if (type === 'VP8 ' && bytes[23] === 157 && bytes[24] === 1 && bytes[25] === 42) {
        width = view.getUint16(26, true) & 16383; height = view.getUint16(28, true) & 16383;
      }
    } else if (bytes.length >= 12 && /^%PDF-[12]\.\d/.test(ascii(bytes, 0, 8))) {
      mime = 'application/pdf';
      if (!/%%EOF[\s\0]*$/.test(ascii(bytes, Math.max(0, bytes.length - 1024), 1024))) throw new TypeError('Incomplete PDF');
    } else {
      let text;
      try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch (_) { throw new TypeError('Unsupported binary file'); }
      if (/[\x00-\x08\x0b\x0e-\x1f\x7f]/.test(text) || /^\s*(?:<!doctype\s+html|<html\b|<svg\b|<\?xml\b)/i.test(text)) throw new TypeError('Unsupported active or binary content');
      mime = 'text/plain';
    }
    if (mime.startsWith('image/') && (!width || !height || width * height > root.config.limits.photoPixels)) throw new RangeError('Invalid or excessive image dimensions');
    if (declaredMime !== undefined && declaredMime !== mime) throw new TypeError('MIME type does not match file contents');
    return Object.freeze({ mime, width, height });
  }
  function validateName(name, mime) {
    if (typeof name !== 'string' || !name.length || name.length > 255 || /[\x00-\x1f]/.test(name)) throw new TypeError('Invalid file name');
    const extension = name.toLowerCase().split('.').pop();
    if (!Object.prototype.hasOwnProperty.call(extensions, mime) || !extensions[mime].includes(extension)) throw new TypeError('File extension does not match allowed content');
  }
  async function readText(file, maximumBytes) {
    if (!(file instanceof Blob)) throw new TypeError('Expected selected file');
    if (file.size > maximumBytes) throw new RangeError('File size limit exceeded');
    return new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
  }
  async function prepareDocument(file) {
    if (!(file instanceof Blob) || !file.size || file.size > root.config.limits.documentBytes) throw new RangeError('Invalid document size');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const info = inspect(bytes, file.type || undefined);
    validateName(file.name, info.mime);
    const blob = new Blob([bytes], { type: info.mime });
    if (info.mime.startsWith('image/') && root.utils.images) await root.utils.images.verify(blob, info);
    return { originalName: file.name, mime: info.mime, byteLength: bytes.length,
      sha256: await root.utils.integrity.sha256(bytes), blob, width: info.width, height: info.height };
  }
  function download(blob, filename) {
    if (!(blob instanceof Blob)) throw new TypeError('Expected downloadable Blob');
    const url = URL.createObjectURL(blob), anchor = document.createElement('a');
    anchor.href = url; anchor.download = filename; anchor.hidden = true;
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    // This requests a download; browsers do not confirm a successful disk write.
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  root.utils.files = Object.freeze({ encodeBase64, decodeBase64, decodedLength, inspect, validateName, readText, prepareDocument, download });
}());
