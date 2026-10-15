(function () {
  'use strict';
  window.RescueManager.config = Object.freeze({
    appVersion: '0.2.0-dev', dbName: 'animal-rescue-manager', dbVersion: 2,
    schemaVersion: 1, backupFormatVersion: 1,
    limits: Object.freeze({ embeddedAssetBytes: 64 * 1024 * 1024,
      backupBytes: 128 * 1024 * 1024, documentBytes: 8 * 1024 * 1024,
      photoInputBytes: 15 * 1024 * 1024, photoPixels: 40000000,
      csvBytes: 10 * 1024 * 1024, csvRows: 10000 })
  });
}());
