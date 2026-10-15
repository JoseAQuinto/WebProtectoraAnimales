(function () {
  'use strict';
  if (window.RescueManager) throw new Error('RescueManager was initialized twice');
  window.RescueManager = {
    config: null, core: {}, utils: {}, domain: {}, storage: {}, services: {},
    components: {}, modules: {}, locales: {}
  };
}());
