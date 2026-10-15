(function () {
  'use strict';
  window.RescueManager.locales.en = Object.freeze({
    'app.name': 'Rescue Manager',
    'app.development': 'In development — do not enter real data yet.',
    'common.save': 'Save', 'common.cancel': 'Cancel', 'common.close': 'Close',
    'common.loading': 'Loading…', 'common.saving': 'Saving…',
    'common.saved': 'Saved', 'common.readOnly': 'Read only',
    'errors.storageUnavailable': 'Local storage is unavailable. Your changes have not been saved. Check browser settings and keep your external backup.',
    'errors.quota': 'There is not enough browser storage. Your changes have not been saved. Keep the current data and check available space.',
    'errors.aborted': 'The operation was cancelled. No changes were saved.',
    'errors.futureVersion': 'These data require a newer compatible version. They have not been changed.',
    'errors.duplicate': 'A record with this identifier already exists. Review the conflict before continuing.',
    'errors.leaseLost': 'Another tab has write control. Reload the current data before editing.',
    'errors.revisionConflict': 'The data changed after you opened them. Reload and review your changes.',
    'errors.datasetChanged': 'The active dataset changed. Reload before continuing.',
    'errors.unexpected': 'The operation could not be completed. Your changes have not been confirmed. Review the local diagnostic.',
    'errors.missingTranslation': 'This text is not available in the selected language.',
    'records.count': { one: '{count} record', other: '{count} records' }
  });
}());
(function () {
  'use strict';
  const root = window.RescueManager;
  root.locales.en = Object.freeze({ ...root.locales.en,
    'nav.dashboard':'Overview','nav.backup':'Backups','nav.settings':'Settings','nav.help':'Help',
    'ui.language':'Language','ui.offline':'Offline · private','ui.menu':'Open menu','ui.skip':'Skip to content',
    'ui.development':'Development version. Use test data while acceptance checks and business modules are being completed.',
    'ui.noOrganization':'No organization data is accessible here','ui.noOrganizationHelp':'You may be using another browser, profile or folder. Create an organization with test data or restore a backup to continue.',
    'ui.createOrganization':'Create an organization','ui.restore':'Restore a backup','ui.unknown':'Not specified','ui.unsaved':'Discard your unsaved changes?',
    'ui.welcome':'Your shelter at a glance','ui.overviewHelp':'Figures are calculated from the current records. Location and adoption availability can overlap.',
    'ui.underCare':'Animals under care','ui.foster':'In foster care','ui.available':'Available for adoption','ui.contacts':'Contacts','ui.pendingTasks':'Pending tasks','ui.assets':'Embedded files',
    'ui.nextSteps':'Data protection is ready','ui.nextStepsHelp':'Create and verify an external backup before moving data to another computer. Business modules are being connected in the following development phases.',
    'ui.readOnly':'This tab is read only. Another tab may have write control.','ui.takeControl':'Take write control','ui.takeControlConfirm':'Give this tab write control? Other tabs will become read only.',
    'ui.backupTitle':'Your data, recoverable','ui.backupHelp':'Keep external copies. Browser storage can be removed by browser settings, another profile or storage cleanup.',
    'ui.createBackup':'Create backup','ui.createBackupHelp':'Includes records, history and embedded files. Referenced external files must be kept separately.',
    'ui.generateDownload':'Generate and download','ui.verifyBackup':'Verify a downloaded copy','ui.verifyHelp':'Select the downloaded JSON again to check its structure, hashes and relationships.',
    'ui.selectVerify':'Select a copy to verify','ui.selectRestore':'Select a copy to restore','ui.restoreHelp':'Review the summary first. Restoration prepares a separate dataset and preserves the previous data for local recovery.',
    'ui.backupGenerated':'The backup was generated and its download requested. Select the downloaded file to verify it; the browser cannot confirm that it was saved to disk.',
    'ui.backupVerified':'The selected copy passed integrity and relationship checks.','ui.beforeRestore':'Before replacing existing data, create and verify a backup of the current revision.',
    'ui.restoreSummary':'Review the replacement','ui.organization':'Organization','ui.backupDate':'Backup date','ui.files':'Embedded files','ui.externalFiles':'External file references','ui.module':'Module','ui.records':'Records',
    'ui.confirmReplacement':'I have reviewed the summary and want to replace the accessible data.','ui.applyRestore':'Replace with this copy','ui.preparing':'Preparing {completed} of {total} records…','ui.restored':'The backup was restored and checked. The previous dataset was preserved for local recovery.',
    'ui.lastBackup':'Recent backups','ui.noBackups':'No generated backup receipts for this dataset.','ui.generated':'Generated','ui.requested':'Download requested','ui.verified':'Verified by reselecting',
    'ui.settingsHelp':'Organization settings do not change the meaning of existing money or dates.','ui.editSettings':'Edit organization','ui.saved':'Changes saved.',
    'ui.helpTitle':'Working safely offline','ui.where':'Where your data is stored','ui.whereText':'Records and embedded files are stored in this browser profile, not beside index.html. Another browser, profile or folder may show different storage. Copying this application folder does not transfer your records. Move records using a verified backup and restoration.',
    'ui.copies':'External copies and updates','ui.copiesText':'Create a backup, select the downloaded copy to verify it and keep copies outside browser storage. Before updating, keep the previous application version and a verified backup. After updating, check records and restore the backup if the storage location changed. Private windows may not retain data.',
    'ui.privacy':'Local privacy','ui.privacyText':'The application sends no data. This version provides no login or encryption at rest. JSON backups have no password and contain personal data when your records do. Protect your computer and exported files. Extensions, operating system sync and personal folders follow your own environment settings.',
    'ui.external':'External documents','ui.externalText':'An external file reference stores only a description and optional hash. Its content is outside the application and is not included in backups. Keep the original file too.',
    'ui.limits':'Current development limits','ui.limitsText':'Business services and acceptance checks are still being completed. Desktop file access has been tested in Chrome, Edge and Firefox. A narrow browser window does not establish real phone or tablet compatibility. The commercial license remains pending review.',
    'ui.print':'Print this page','ui.busy':'Working…','ui.closeSummary':'Close summary',
    'field.name':'Name','field.language':'Language','field.currencyCode':'Currency','field.dateFormat':'Date display','field.timeZone':'Time zone','field.phone':'Phone','field.email':'Email','field.address':'Address',
    'format.iso':'Year-month-day','format.day_first':'Day/month/year','format.month_first':'Month/day/year',
    'errors.validation':'Review the fields and the related records. The operation was not saved.','errors.invalidBackup':'This copy is invalid or damaged. The current data has not been replaced.','errors.verifyFirst':'Create and verify a backup of the current data before replacing it.','errors.confirmRestore':'Review the summary and confirm replacement.','errors.immutable':'Existing amounts or units cannot be reinterpreted. Use a linked correction.','errors.blocked':'Close other tabs of this application, then try again.'
  });
  const tables = { organizationSettings:'Organization',catalogOptions:'Catalog options',locations:'Locations',animals:'Animals',stayEpisodes:'Stay episodes',weightMeasurements:'Weights',contacts:'Contacts',fosterProfiles:'Foster families',fosterStays:'Foster stays',adoptionApplications:'Adoption applications',reservations:'Reservations',adoptions:'Adoptions',volunteerProfiles:'Volunteers',volunteerHours:'Volunteer hours',veterinaryRecords:'Health records',carePlans:'Care plans',tasks:'Tasks',financialMovements:'Financial movements',donations:'Donations',donationLines:'Material lines',inventoryItems:'Inventory items',inventoryMovements:'Stock movements',assets:'Embedded assets',documents:'Documents',documentLinks:'Document links',animalEvents:'Animal history',activityLog:'Activity',importIdentityMap:'Import mappings' };
  const catalog = { species:{dog:'Dog',cat:'Cat',rabbit:'Rabbit',bird:'Bird',other:'Other'},size:{small:'Small',medium:'Medium',large:'Large',giant:'Giant'},finance_income:{donation:'Donation',membership:'Membership',adoption:'Adoption',event:'Event',grant:'Grant',other:'Other'},finance_expense:{veterinary:'Veterinary',medication:'Medication',food:'Food',facilities:'Facilities',transport:'Transport',supplies:'Supplies',maintenance:'Maintenance',other:'Other'},inventory_category:{food:'Food',medication:'Medication',hygiene:'Hygiene',veterinary:'Veterinary supplies',blankets:'Blankets',carriers:'Carriers',accessories:'Accessories',other:'Other'},document_type:{general:'General',medical:'Medical',adoption:'Adoption',invoice:'Invoice',identity:'Identity',other:'Other'},material_type:{food:'Food',medication:'Medication',equipment:'Equipment',other:'Other'},unit:{item:'Item',kg:'Kilogram',g:'Gram',litre:'Litre',ml:'Millilitre',pack:'Pack'},volunteer_function:{walking:'Walking',cleaning:'Cleaning',transport:'Transport',feeding:'Feeding',photography:'Photography',social_media:'Social media',events:'Events',veterinary_visits:'Veterinary visits'},task_type:{veterinary_visit:'Veterinary visit',vaccination:'Vaccination',medication:'Medication',interview:'Interview',call:'Call',transport:'Transport',purchase:'Purchase',cleaning:'Cleaning',adoption_followup:'Adoption follow-up',other:'Other'},care_plan_type:{treatment:'Treatment',vaccination:'Vaccination',deworming:'Deworming',care:'Care',other:'Other'} };
  const additions = Object.fromEntries(Object.entries(tables).map(([key,value]) => ['table.'+key,value]));
  for (const [kind, entries] of Object.entries(catalog)) for (const [code,label] of Object.entries(entries)) additions['catalog.'+kind+'.'+code] = label;
  root.locales.en = Object.freeze({ ...root.locales.en, ...additions });
}());
