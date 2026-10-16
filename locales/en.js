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
(function(root){
  'use strict';
  const labels={back:'Back to animals',help:'Animals, their care and their full history in one place.',new:'Register an animal',edit:'Edit record',open:'Open',notFound:'This animal is not available.',emptySection:'No records to show.',photo:'Photo',noPhoto:'No photo',photoError:'The photo could not be verified.',setPhoto:'Add or replace photo',photoHelp:'JPEG, PNG or WebP. Up to 15 MiB and 40 megapixels. A resized photo and thumbnail will be stored.',removePhoto:'Remove photo',removePhotoConfirm:'Remove the current photo? Its stored files are preserved in the history and backups.',code:'Code',name:'Name',species:'Species',breed:'Breed',sex:'Sex',birthDate:'Birth date',birthPrecision:'Birth date precision',microchip:'Microchip',size:'Size',color:'Colour',sterilization:'Sterilisation',location:'Location',shelter:'Shelter location',externalLocation:'External location description',lastWeight:'Latest weight',weights:'Weight history',weight:'Weight',grams:'Grams',addWeight:'Record weight',editWeight:'Edit weight',date:'Date',title:'Title',type:'Type',state:'Status',status:'Care status',changeLocation:'Move animal',reason:'Reason',fosterEndReason:'Reason for closing the foster stay (if applicable)',availability:'Adoption availability',setAvailability:'Change availability',exit:'Record departure or death',reenter:'Register a new entry',archive:'Archive',trash:'Move to trash',restore:'Restore record',description:'Description',character:'Character',behavior:'Behaviour',specialNeeds:'Special needs',notes:'Notes',actions:'Actions',recordHelp:'Archived and trashed records retain their history. Complete current care and resolve pending tasks before archiving.',sections:'Animal record sections',carePlans:'Care plans',tasks:'Tasks',contact:'Contact',start:'Start',end:'End',adoptions:'Adoptions',return:'Return date',amount:'Amount',event:'Event',search:'Search name, code, microchip or notes',mode:'Record visibility',active:'Current records',all:'All records',sort:'Sort by',createdAt:'Date created',previous:'Previous',next:'Next',page:'Page {page} of {pages} · {count} animals'};
  const enums={tab:{info:'Information',health:'Health and tasks',foster:'Foster stays',adoption:'Adoption',expenses:'Financial movements',documents:'Documents',history:'History'},status:{under_care:'Under care',adopted:'Adopted',deceased:'Deceased',other_exit:'Other departure'},availability:{available:'Available',unavailable:'Unavailable',reserved:'Reserved'},location:{shelter:'Shelter',foster:'Foster home',temporary_external:'Temporary external location'},sex:{male:'Male',female:'Female',unknown:'Unknown'},precision:{exact:'Exact',estimated:'Estimated',unknown:'Unknown'},sterilization:{yes:'Yes',no:'No',unknown:'Unknown'},plan:{planned:'Planned',active:'Active',completed:'Completed',cancelled:'Cancelled'},task:{pending:'Pending',in_progress:'In progress',completed:'Completed',cancelled:'Cancelled'},application:{pending:'Pending',under_review:'Under review',approved:'Approved',rejected:'Rejected',completed:'Completed',cancelled:'Cancelled'},finance:{posted:'Posted',voided:'Voided'},vet:{vaccination:'Vaccination',deworming:'Deworming',checkup:'Check-up',sterilization:'Sterilisation',surgery:'Surgery',test:'Test',diagnosis:'Diagnosis',disease:'Disease',allergy:'Allergy',medication_administration:'Medication administration',other:'Other'},event:{entry:'Entry',return:'Return',checkup:'Check-up',vaccination:'Vaccination',deworming:'Deworming',treatment:'Treatment',sterilization:'Sterilisation',foster_start:'Foster stay started',foster_end:'Foster stay ended',application:'Adoption application',reservation:'Reservation',adoption:'Adoption',transfer:'Transfer',deceased:'Death',document:'Document'}};
  const additions=Object.fromEntries(Object.entries(labels).map(([key,value])=>['a.'+key,value]));for(const[kind,values]of Object.entries(enums))for(const[key,value]of Object.entries(values))additions['a.'+kind+'.'+key]=value;
  root.locales.en=Object.freeze({...root.locales.en,...additions,'nav.animals':'Animals','nav.contacts':'Contacts','nav.fosters':'Foster homes','nav.volunteers':'Volunteers','errors.possibleDuplicate':'Review possible duplicates and explicitly confirm before saving.','errors.mergeConflict':'Review conflicting fields and existing profiles before merging.','errors.invalidState':'This action is not available in the current state. Refresh and review the related records.','errors.fileOrValue':'Review the selected file or value. The changes have not been saved.','errors.businessRule':'Review the animal’s current care, related records, dates and pending tasks before continuing.','errors.assetBudget':'The dataset would exceed its 64 MiB embedded file limit. Archived and trashed files count towards this limit.','errors.assetIntegrity':'The file failed its integrity checks. It has not been opened.'});
}(window.RescueManager));
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
    'ui.readOnly':'This tab is read only. Another tab may have write control.','ui.readOnlyReload':'If you just reloaded or reopened this page, control returns automatically when the previous session expires (about 15 seconds).','ui.takeControl':'Take write control','ui.takeControlConfirm':'Give this tab write control? Other tabs will become read only.',
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

(function (root) {
  'use strict';
  root.locales.en = Object.freeze({ ...root.locales.en,
    'nav.contacts':'Contacts','nav.fosters':'Foster families','nav.volunteers':'Volunteers',
    'p.contacts':'Your central address book','p.contactsHelp':'Keep each person or organization in one contact, with all their roles and profiles.',
    'p.fosters':'Foster families','p.fostersHelp':'Capacity and occupancy come from profiles and open foster stays. Availability applies to new placements.',
    'p.volunteers':'Volunteers and hours','p.volunteersHelp':'Contact details stay in the address book. Totals come from activity records within the selected period.',
    'p.newContact':'New contact','p.editContact':'Edit contact','p.newFoster':'New foster profile','p.editFoster':'Edit foster profile',
    'p.newVolunteer':'New volunteer profile','p.editVolunteer':'Edit volunteer profile','p.open':'Open record','p.edit':'Edit','p.search':'Search by name, email or phone',
    'p.searchPeople':'Find an existing contact','p.chooseContact':'Choose an existing contact','p.chooseHelp':'Select someone from the address book first. Create a contact if they are not already listed.',
    'p.select':'Use this contact','p.back':'Previous','p.next':'Next','p.page':'Page {page} of {pages} · {count} records','p.empty':'There are no records yet.',
    'p.noMatches':'No records match these filters.','p.clear':'Clear filters','p.all':'All','p.role':'Role','p.roles':'Roles','p.type':'Type','p.name':'Name',
    'p.type.person':'Person','p.type.organization':'Organization','p.role.adopter':'Adopter','p.role.foster':'Foster family','p.role.volunteer':'Volunteer',
    'p.role.donor':'Donor','p.role.veterinarian':'Veterinarian','p.role.supplier':'Supplier','p.role.collaborator':'Collaborator',
    'p.state':'Records','p.active':'Active','p.archived':'Archived','p.trash':'Trash','p.inactive':'Inactive','p.allRecords':'Active and archived',
    'p.email':'Email','p.address':'Address','p.notes':'Notes','p.phones':'Phones','p.phone':'Phone number','p.phoneLabel':'Phone label','p.addPhone':'Add phone',
    'p.removePhone':'Remove phone','p.noValue':'Not specified','p.required':'Fields marked * are required.','p.roleLocked':'Roles used by profiles are retained. Edit the profile to change its availability or status.',
    'p.duplicates':'Check these possible matches','p.nameMatch':'Matching name only','p.possibleMatch':'Matching email or phone','p.match.name':'Name','p.match.email':'Email','p.match.phone':'Phone',
    'p.matchReason':'Matching data','p.duplicateHelp':'A name alone does not establish that these are the same person. Review the contact details before deciding.',
    'p.confirmDuplicate':'I reviewed these matches and want to save a separate contact.','p.confirmDuplicateNeeded':'Review the matching contacts and confirm if this is a separate contact.',
    'p.archive':'Archive contact','p.unarchive':'Return to active contacts','p.sendTrash':'Move contact to trash','p.restore':'Restore contact',
    'p.archiveConfirm':'Archive {name}? Their history and relationships will be retained.','p.unarchiveConfirm':'Return {name} to the active address book?',
    'p.trashConfirm':'Move {name} to trash? You can restore the contact later.','p.restoreConfirm':'Restore {name} from trash?',
    'p.related':'Related records','p.relatedCount':'{count} related records','p.relatedHelp':'This contact has related records. Archive it to retain those relationships.',
    'p.merge':'Compare and merge','p.mergeTitle':'Compare contacts before merging','p.mergeHelp':'Choose the contact to keep, resolve every different field and review the combined roles and phones.',
    'p.keep':'Keep this contact','p.mergeOther':'Contact to merge into it','p.useKeep':'Use retained value','p.useMerge':'Use other value','p.combineNotes':'Combine notes',
    'p.field':'Field','p.retained':'Retained contact','p.other':'Other contact','p.resolution':'Value to retain','p.mergeRoles':'Combined roles','p.mergePhones':'Combined phones',
    'p.mergeHistory':'Operational relationships move to the retained contact. Financial, donation and stock history keeps its original reference and resolves to the retained person.',
    'p.mergeConflict':'Both contacts have the same kind of profile. These contacts cannot currently be merged; review their foster or volunteer profiles first.',
    'p.mergeConfirm':'I reviewed the comparison and want to merge these contacts.','p.applyMerge':'Merge contacts','p.confirmNeeded':'Review and confirm this action first.',
    'p.fosterProfile':'Foster profile','p.volunteerProfile':'Volunteer profile','p.capacity':'Total capacity','p.occupancy':'Current occupancy','p.free':'Free places',
    'p.occupancyValue':'{occupied} occupied / {capacity} places · {free} free','p.overCapacity':'Capacity exceeded with recorded exceptions','p.species':'Accepted species',
    'p.sizes':'Accepted sizes','p.availability':'Availability','p.availability.available':'Available','p.availability.unavailable':'Unavailable','p.availability.conditional':'Conditional',
    'p.restrictions':'Conditions or restrictions','p.currentAnimals':'Current animals','p.stayHistory':'Foster stay history','p.animal':'Animal','p.start':'Start date','p.end':'End date',
    'p.openStay':'Open stay','p.reason':'End reason','p.exception':'Recorded exception','p.stayDateHelp':'The end date is the day the animal changed location; intervals include the start and exclude the end.',
    'p.functions':'Functions','p.specialties':'Specialties','p.status':'Status','p.volunteerAvailability':'Availability details','p.hours':'Activity and hours',
    'p.logHours':'Record activity','p.editHours':'Edit activity record','p.activity':'Activity','p.date':'Date','p.durationMinutes':'Duration in minutes',
    'p.minutesHelp':'Enter whole minutes, between 1 and 1440 (24 hours).','p.duration':'{hours} h {minutes} min','p.total':'Total time','p.entries':'Activity records',
    'p.period':'Activity period','p.from':'From','p.to':'To','p.periodError':'The end date must not be before the start date.','p.periodTotals':'{duration} across {count} activity records',
    'p.trashHours':'Move activity to trash','p.restoreHours':'Restore activity','p.trashHoursConfirm':'Move this activity record to trash? It will stop contributing to totals.',
    'p.restoreHoursConfirm':'Restore this activity record and include it in totals again?','p.hoursTrashHelp':'Trashed records do not count towards totals.',
    'p.error.state':'The current record or related history does not allow this change. Review the record and its related profiles before trying again.',
    'p.error.input':'Review the values and selected records. Changes have not been saved.','p.saved':'Changes saved.',
    'p.sort':'Sort by name','p.ascending':'A to Z','p.descending':'Z to A','p.contactDetails':'Contact details','p.actions':'Actions',
    'p.profileExists':'This contact already has that profile. Open the existing contact to edit it.','p.availableContacts':'Available contacts',
    'p.durationColumn':'Duration','p.confirmAction':'Confirm action'
  });
}(window.RescueManager));

(function (root) {
  'use strict';
  root.locales.en = Object.freeze({ ...root.locales.en,
    'af.entry':'Register animal entry','af.reentry':'Register a new entry','af.edit':'Edit animal details','af.weight':'Record weight',
    'af.name':'Name','af.species':'Species','af.size':'Size','af.sex':'Sex','af.sex.male':'Male','af.sex.female':'Female','af.sex.unknown':'Unknown',
    'af.more':'Additional animal details','af.birth':'Birth and age','af.birthKind':'Known birth information','af.birthKind.unknown':'Unknown',
    'af.birthKind.exact':'Exact birth date','af.birthKind.estimated_date':'Estimated birth date','af.birthKind.estimated_age':'Estimated age at a reference date',
    'af.birthDate':'Birth date','af.estimatedAgeMonths':'Estimated age in whole months','af.estimatedAgeReferenceDate':'Age reference date',
    'af.breed':'Breed','af.color':'Color','af.microchip':'Microchip or identifier','af.sterilization':'Sterilization status',
    'af.sterilization.yes':'Yes','af.sterilization.no':'No','af.sterilization.unknown':'Unknown','af.sterilizationDate':'Sterilization date',
    'af.code':'Optional manual code','af.codeHelp':'Leave empty for an automatic code. The A-number format is reserved for the automatic sequence. An assigned code cannot be edited.',
    'af.description':'Description','af.character':'Character','af.behavior':'Behavior','af.specialNeeds':'Special needs','af.notes':'Animal notes',
    'af.entryDate':'Entry date','af.entryReason':'Entry reason','af.origin':'Origin or previous location','af.episodeNotes':'Entry notes',
    'af.locationKind':'Initial location','af.location.shelter':'Shelter location','af.location.temporary_external':'Temporary external location',
    'af.locationId':'Shelter location','af.externalDescription':'Describe the temporary external location','af.availability':'Availability for adoption',
    'af.availability.available':'Available','af.availability.unavailable':'Unavailable','af.availabilityHelp':'Select adoption availability explicitly. Location does not determine it.',
    'af.grams':'Weight in grams','af.gramsHelp':'Use a positive whole number of grams (for example 12500 for 12.5 kg). The current weight derives from dated measurements.',
    'af.date':'Date','af.measurementNotes':'Measurement notes','af.archive':'Archive animal','af.trash':'Move animal to trash','af.restore':'Restore animal',
    'af.dispositionConfirm':'I reviewed the record and want to apply this action.','af.archiveHelp':'The animal leaves operational lists; its episodes, documents and history are retained. Current care and pending tasks must be resolved first.',
    'af.trashHelp':'This is reversible logical deletion. Related history is retained. Current care and pending tasks must be resolved first.',
    'af.restoreHelp':'Restore this animal from archive or trash. This does not reopen episodes or change its current management situation.',
    'af.exit':'Record departure or death','af.exitMode':'What happened?','af.choose':'Choose an option','af.exitMode.death':'Death',
    'af.exitMode.transfer':'Transfer to another organization','af.exitMode.other':'Other documented departure','af.reason':'Reason',
    'af.departureDetails':'Departure and related records','af.fosterEndReason':'Reason for ending the open foster stay','af.reservationClosureReason':'Reason for closing the active reservation',
    'af.applicationClosureReason':'Reason for closing the open applications','af.taskDecision':'Decision for this pending task',
    'af.task.keep':'Keep this task pending','af.task.cancel':'Cancel this task with a reason','af.taskReason':'Task cancellation reason',
    'af.tasksHelp':'Decide individually which pending tasks still apply. Kept tasks retain their current status. Cancelled tasks require a reason.',
    'af.exitConfirm':'I reviewed the date, reasons, related closures and every pending task, and want to record this event.',
    'af.exitHelp':'The event closes the current episode and any open foster stay, reservation and applications together. All history is retained. Tasks follow your explicit decisions.',
    'af.entryUnavailable':'Restore the animal first. Adopted animals return through the adoption return workflow; deceased animals require a historical correction.',
    'af.saved':'Changes saved.','af.invalidCode':'Choose a manual code outside the reserved A-number format, or leave the field empty.',
    'af.taskReasonRequired':'Enter a cancellation reason for every task you chose to cancel.','af.confirmRequired':'Review and confirm the action first.'
  });
}(window.RescueManager));

(function (root) {
  'use strict';
  root.locales.en = Object.freeze({ ...root.locales.en,
    'nav.documents':'Documents',
    'd.title':'Title','d.type':'Document type','d.date':'Date','d.notes':'Notes','d.additional':'Additional information',
    'd.externalName':'External file name','d.location':'Where the external file is kept','d.fileType':'File format or type',
    'd.originalFile':'Select the original file to record its hash (optional)','d.file':'File',
    'd.externalHelp':'This file is outside the application. Its content is not included in backups; keep the original file too.',
    'd.hashHelp':'The file is read to calculate a SHA-256 hash. Its content is not stored. Maximum 128 MiB for hash comparison.',
    'd.fileHelp':'PDF, JPEG, PNG, WebP or UTF-8 TXT, up to 8 MiB. The application stores and backs up the file. Documents are downloaded without embedding active content.',
    'd.edit':'Edit document','d.newExternal':'New external reference','d.newEmbedded':'Add embedded document',
    'd.preserve':'The file, relationships and history are retained. You can restore archived or trashed documents.',
    'd.compare':'Compare selected external file','d.compareHelp':'Select the original file again to compare its hash. This does not update the reference or store the file.',
    'd.noOriginalHash':'This reference has no original hash to compare. The selected file was not stored.',
    'd.matches':'The selected file matches the recorded original hash.','d.differs':'The selected file differs from the recorded original hash. Check which original file you need.',
    'd.links':'Linked records','d.unlink':'Remove link','d.noLinks':'This document has no linked records.',
    'd.linkType':'Record type','d.linkTarget':'Record to link','d.link':'Link document','d.linkExisting':'Choose an existing document',
    'd.external':'External reference','d.embedded':'Embedded file','d.noNotes':'No notes','d.download':'Download file',
    'd.archive':'Archive document','d.unarchive':'Return document to active records','d.restore':'Restore document','d.trash':'Trash',
    'd.active':'Active','d.archived':'Archived','d.open':'Open document','d.actions':'Actions','d.mode':'Storage mode','d.state':'Records',
    'd.previous':'Previous','d.next':'Next','d.empty':'No documents match these filters.','d.page':'Page {page} of {pages} · {count} documents',
    'd.help':'Keep small files in the application or record a reference to files stored separately. Links let you reuse one document across records.',
    'd.budget':'Embedded files: {used} MiB of {limit} MiB. Replacing a photo keeps earlier resources; files are not removed automatically.',
    'd.search':'Search by title, notes or external file name','d.all':'Active and archived','d.allModes':'All storage modes',
    'r.title':'Local recovery','r.help':'Earlier datasets remain in this browser profile. Before recovering one, create and reselect a verified backup of the current revision. Recovery validates and prepares a separate dataset and preserves the current one.',
    'r.recover':'Review recovery','r.unnamed':'Dataset without an organisation','r.retired':'Earlier dataset','r.staging':'Interrupted preparation','r.records':'{count} records · {bytes} embedded bytes','r.incomplete':'This preparation is not active. It is never activated automatically. The earlier active data are preserved.','r.empty':'No earlier datasets or interrupted preparations are available here.'
  });
}(window.RescueManager));
