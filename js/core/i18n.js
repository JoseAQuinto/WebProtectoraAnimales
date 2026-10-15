(function () {
  'use strict';
  const root = window.RescueManager;
  let language = 'en';
  const listeners = new Set();
  const owns = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  function translate(key, parameters = {}) {
    const current = root.locales[language];
    let template = owns(current, key) ? current[key] : (owns(root.locales.en, key) ? root.locales.en[key] : undefined);
    if (template === undefined) {
      if (root.config.appVersion.includes('-dev')) console.warn('Missing translation:', key);
      template = current['errors.missingTranslation'];
    }
    if (typeof template === 'object') {
      const count = parameters.count;
      if (!Number.isFinite(count)) throw new TypeError('A finite count is required');
      const category = new Intl.PluralRules(language).select(count);
      template = template[category] || template.other;
    }
    return template.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (match, name) =>
      owns(parameters, name) ? String(parameters[name]) : match);
  }
  root.core.i18n = Object.freeze({
    t: translate,
    get language() { return language; },
    setLanguage(value) {
      if (!owns(root.locales, value)) throw new RangeError('Unsupported language');
      language = value;
      for (const listener of listeners) listener(value);
    },
    subscribe(listener) {
      if (typeof listener !== 'function') throw new TypeError('Expected a listener');
      listeners.add(listener); return () => listeners.delete(listener);
    }
  });
}());
