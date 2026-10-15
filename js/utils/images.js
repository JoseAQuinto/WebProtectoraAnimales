(function () {
  'use strict';
  const root = window.RescueManager;
  async function decode(blob) {
    if (typeof createImageBitmap === 'function') return createImageBitmap(blob, { imageOrientation: 'from-image' });
    if (typeof Image === 'undefined') throw new Error('Image decoding unavailable');
    const image = new Image(), url = URL.createObjectURL(blob);
    try {
      await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new TypeError('Image could not be decoded')); image.src = url; });
      return image;
    } finally { URL.revokeObjectURL(url); }
  }
  async function verify(blob, metadata) {
    const image = await decode(blob);
    try {
      const width = image.width || image.naturalWidth, height = image.height || image.naturalHeight;
      if (!width || !height || width * height > root.config.limits.photoPixels) throw new RangeError('Image dimensions exceed limit');
      // Decoders may apply EXIF orientation when reading an incorporated JPEG.
      if (!((width === metadata.width && height === metadata.height) ||
          (width === metadata.height && height === metadata.width))) throw new TypeError('Decoded image dimensions do not match metadata');
      return { width, height };
    } finally { if (typeof image.close === 'function') image.close(); }
  }
  function canvasBlob(canvas, quality) {
    return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Image encoding failed')), 'image/webp', quality));
  }
  async function render(image, maximumSide, originalName, suffix) {
    const canvas = document.createElement('canvas'), context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas unavailable');
    let size = maximumSide, blob;
    for (let attempt = 0; attempt < 5; attempt++) {
      const ratio = Math.min(1, size / Math.max(image.width, image.height));
      canvas.width = Math.max(1, Math.round(image.width * ratio));
      canvas.height = Math.max(1, Math.round(image.height * ratio));
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      blob = await canvasBlob(canvas, Math.max(0.55, 0.86 - attempt * 0.08));
      if (blob.size <= 1024 * 1024) break;
      size = Math.floor(size * 0.8);
    }
    if (!blob || blob.size > 1024 * 1024) throw new RangeError('Optimized image still exceeds 1 MiB');
    const bytes = new Uint8Array(await blob.arrayBuffer()), info = root.utils.files.inspect(bytes);
    const extension = { 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg' }[info.mime];
    const stem = originalName.replace(/\.[^.]*$/, '').slice(0, 220) || 'image';
    return { originalName: stem + '-' + suffix + '.' + extension, mime: info.mime,
      byteLength: bytes.length, sha256: await root.utils.integrity.sha256(bytes),
      blob: new Blob([bytes], { type: info.mime }), width: info.width, height: info.height };
  }
  async function prepare(file) {
    if (!(file instanceof Blob) || !file.size || file.size > root.config.limits.photoInputBytes) throw new RangeError('Photo input exceeds 15 MiB');
    const info = root.utils.files.inspect(new Uint8Array(await file.arrayBuffer()), file.type || undefined);
    if (!info.mime.startsWith('image/')) throw new TypeError('Expected JPEG, PNG or WebP photo');
    root.utils.files.validateName(file.name, info.mime);
    const image = await decode(file);
    try {
      if (!image.width || !image.height || image.width * image.height > root.config.limits.photoPixels) throw new RangeError('Photo input exceeds 40 megapixels');
      const photo = await render(image, 1600, file.name, 'photo');
      const thumbnail = await render(image, 320, file.name, 'thumbnail');
      return { photo, thumbnail };
    } finally { if (typeof image.close === 'function') image.close(); }
  }
  root.utils.images = Object.freeze({ prepare, verify });
}());
