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

(function (root) {
  'use strict';
  root.locales.en = Object.freeze({ ...root.locales.en,
    'fw.title': 'Foster stays', 'fw.assign': 'Assign foster home', 'fw.endStay': 'End foster stay',
    'fw.manageProfiles': 'Manage foster profiles', 'fw.profile': 'Existing foster profile', 'fw.choose': 'Choose an option',
    'fw.profileOption': '{name} · {occupied} of {capacity} places occupied', 'fw.startDate': 'Start date', 'fw.endDate': 'End date',
    'fw.notes': 'Stay notes', 'fw.confirmException': 'I confirm this placement as a documented exception',
    'fw.exceptionReason': 'Exception reason', 'fw.exceptionHelp': 'Explain why this placement is being recorded despite the warnings. Up to 200 characters.',
    'fw.assignHelp': 'Choose an existing foster home and review its current occupancy and conditions. Adoption availability remains unchanged.',
    'fw.noProfiles': 'There are no active foster profiles attached to active contacts. Select an existing contact in Foster homes and create its profile first.',
    'fw.chooseProfile': 'Choose an existing foster profile before saving.', 'fw.exceptionRequired': 'Confirm the exception and give a reason. No changes have been saved.',
    'fw.exceptionWarning': 'This placement needs an explicit exception:', 'fw.warningAvailability': 'This profile is not currently marked available.',
    'fw.warningCapacity': 'The profile has no free places within its declared capacity.', 'fw.warningSpecies': 'This animal’s species is not in the accepted list.',
    'fw.warningUnknownSize': 'The animal’s size is unknown, so compatibility cannot be confirmed.', 'fw.warningSize': 'This animal’s size is not in the accepted list.',
    'fw.compatible': 'The profile is available and fits the recorded capacity, species and size. Review its written restrictions as well.',
    'fw.occupancy': 'Current occupancy', 'fw.occupancyValue': '{occupied} of {capacity} places occupied · {free} free',
    'fw.availability': 'Availability for new placements', 'fw.availability.available': 'Available', 'fw.availability.unavailable': 'Unavailable', 'fw.availability.conditional': 'Conditional',
    'fw.species': 'Accepted species', 'fw.sizes': 'Accepted sizes', 'fw.restrictions': 'Restrictions', 'fw.profileNotes': 'Profile notes',
    'fw.noneAccepted': 'None declared', 'fw.currentAnimals': 'Animals currently hosted', 'fw.noCurrentAnimals': 'No animals currently hosted.',
    'fw.noNotes': 'None recorded', 'fw.ongoing': 'Ongoing', 'fw.saved': 'Foster stay saved.',
    'fw.endReason': 'Reason for ending the stay', 'fw.destination': 'Destination after this stay', 'fw.destination.shelter': 'Shelter',
    'fw.destination.temporary_external': 'Temporary external location', 'fw.shelter': 'Shelter location', 'fw.externalDescription': 'Describe the temporary external location',
    'fw.endSummary': '{animal} has stayed with {contact} since {date}.',
    'fw.endHelp': 'The stay history is preserved. Choose the actual destination; adoption availability and any reservation remain unchanged.',
    'fw.chooseDestination': 'Choose a shelter or temporary external destination before saving.',
    'fw.intervalHelp': 'The start date is included; the end date is the day the location changes and is excluded from the stay’s duration.',
    'fw.inactiveAnimal': 'New foster placements and endings are available for active animals under care. Previous stays remain visible.',
    'fw.invalidOpenStays': 'More than one open foster stay was found. Review data integrity before recording another transition.',
    'fw.currentStay': 'Current foster home', 'fw.history': 'Stay history', 'fw.empty': 'No foster stays have been recorded for this animal.',
    'fw.contact': 'Foster contact', 'fw.noException': 'No exception'
  });
}(window.RescueManager));

/* Integration fragment: merge these keys into locales/en.js; do not load separately. */
(function(root){
  'use strict';
  root.locales.en=Object.freeze({...root.locales.en,...{
  'aw.applications': 'Adoption applications', 'aw.help': 'Approval, reservation and adoption are separate steps. Existing records and their history are preserved.',
  'aw.new': 'New application', 'aw.contactId': 'Existing contact', 'aw.contactHelp': 'Choose a contact from the central address book. The adopter role is added when the application is saved.',
  'aw.noContacts': 'Create or restore an active contact in the address book, then return to create the application.', 'aw.choose': 'Choose an option',
  'aw.applicationDate': 'Application date', 'aw.interviewNotes': 'Interview notes', 'aw.notes': 'Notes', 'aw.review': 'Record interview / review',
  'aw.reviewHelp': 'This saves the interview notes and marks the application as under review. It does not approve or reserve the animal.',
  'aw.approve': 'Approve application', 'aw.approvalDate': 'Approval date', 'aw.approveHelp': 'Approval does not create a reservation or complete an adoption.',
  'aw.reject': 'Reject application', 'aw.cancel': 'Cancel application', 'aw.date': 'Date of the change', 'aw.reason': 'Reason',
  'aw.closeApplicationHelp': 'The application will be closed with this reason. Its interview, approval and other history remain available.',
  'aw.closeApplicationReservedHelp': 'This closes the application and its active reservation together. Choose the availability that the animal will have afterwards.',
  'aw.reserve': 'Reserve for this applicant', 'aw.reservationDate': 'Reservation date', 'aw.expiresOn': 'Valid through (optional)',
  'aw.expiryHelp': 'A reservation remains valid through its expiry date. Expiry must be recorded explicitly from the following day; nothing closes automatically.',
  'aw.reserveHelp': 'This creates an active reservation for this applicant and marks the animal as reserved. It does not complete adoption.',
  'aw.reservation.cancelled': 'Cancel reservation', 'aw.reservation.expired': 'Record reservation expiry',
  'aw.closeReservationHelp': 'This closes the reservation and sets the availability you choose. The approved application remains open; no adoption is created.',
  'aw.availability': 'Availability after this change', 'aw.availability.available': 'Available for adoption', 'aw.availability.unavailable': 'Unavailable for adoption',
  'aw.confirmed': 'I have reviewed and confirm the consequences described above', 'aw.confirmRequired': 'Review the consequences and select the confirmation before saving. Nothing has been saved.',
  'aw.complete': 'Complete adoption', 'aw.adoptionDate': 'Adoption date', 'aw.completeHelp': 'This creates the adoption, closes the current episode and any open foster stay/reservation, and cancels the other open applications with your reasons. Review every pending task and confirm. All changes are saved together.',
  'aw.fosterEndReason': 'Reason for ending the open foster stay', 'aw.reservationClosureReason': 'Reason for closing the active reservation',
  'aw.otherApplicationsReason': 'Reason for cancelling the other open applications', 'aw.otherApplications': 'Other applications to close: {count}',
  'aw.taskDecision': 'Decision for this pending task', 'aw.taskReason': 'Reason for cancelling this task', 'aw.task.keep': 'Keep as pending follow-up',
  'aw.task.cancel': 'Cancel with a reason', 'aw.taskReasonRequired': 'Choose whether to keep or cancel every task. Each cancellation needs its own reason. Nothing has been saved.',
  'aw.feeSection': 'Optional adoption income', 'aw.recordFee': 'Record an adoption fee as income in the same operation', 'aw.categoryId': 'Income category',
  'aw.concept': 'Income description', 'aw.amount': 'Amount', 'aw.decimalSeparator': 'Decimal separator', 'aw.decimalDot': 'Dot (e.g. 12.50)', 'aw.decimalComma': 'Comma (e.g. 12,50)',
  'aw.feeHelp': 'Organization currency: {currency}. Up to {precision} decimal places; no thousands separators. Leave the fee option unchecked to create no financial movement.',
  'aw.positiveFee': 'The adoption fee must be positive. Nothing has been saved.', 'aw.invalidFee': 'Enter a positive amount using the selected decimal separator and the currency precision, without thousands separators. Nothing has been saved.',
  'aw.return': 'Record adoption return', 'aw.returnDate': 'Return date', 'aw.returnReason': 'Return reason',
  'aw.returnHelp': 'This preserves the adoption and closes it with a return date/reason, creates a new stay episode and puts the animal under care at the location and availability you choose. Closed applications and reservations remain closed.',
  'aw.locationKind': 'Current location after return', 'aw.location.shelter': 'Shelter', 'aw.location.temporary_external': 'Temporary external location',
  'aw.locationId': 'Shelter location', 'aw.externalDescription': 'Describe the temporary external location', 'aw.saved': 'The adoption workflow change has been saved.',
  'aw.empty': 'No records to show.', 'aw.notSpecified': 'Not specified', 'aw.restoreFirst': 'Restore this animal before recording a new workflow change.',
  'aw.filter': 'Application status', 'aw.allStates': 'All statuses', 'aw.previous': 'Previous', 'aw.next': 'Next', 'aw.page': 'Page {page} of {pages} · {count} applications',
  'aw.details': 'Interview, notes and closure details', 'aw.closureReason': 'Closure reason', 'aw.otherReservation': 'Close the reservation for the other applicant before completing this adoption.',
  'aw.contactUnavailable': 'The contact is archived or in trash. Restore the contact before approving, reserving or completing adoption.',
  'aw.reservations': 'Reservations', 'aw.status': 'Status', 'aw.closedOn': 'Closed on', 'aw.reservationStatus.active': 'Active',
  'aw.reservationStatus.cancelled': 'Cancelled', 'aw.reservationStatus.expired': 'Expired', 'aw.reservationStatus.fulfilled': 'Fulfilled by adoption',
  'aw.adoptions': 'Completed adoptions and returns', 'aw.historyHelp': 'Each adoption is a historical fact. A return creates a new episode and does not erase the earlier adoption.',
  'aw.recordedFee': 'Related financial movement', 'aw.documents': 'Documents linked to this adoption'
  }});
}(window.RescueManager));

(function(root){
  'use strict';
  const labels={title:'Title',dueDate:'Due date',typeId:'Task type',priority:'Priority',animalId:'Animal',contactId:'Contact',responsibleVolunteerId:'Responsible volunteer',dueLocalTime:'Local time (optional)',timeZone:'Time zone',description:'Description',notes:'Notes',status:'Status',date:'Performed or cancelled on',reason:'Cancellation reason',confirmed:'I confirm this action and date.',confirmRequired:'Review and confirm the action before continuing.',more:'More details',new:'New task',edit:'Edit task',complete:'Mark as performed',cancelTask:'Cancel task',clinical:'Record performed health act',needsAnimal:'Choose an animal in the task before recording the performed health act.',timeHelp:'If a time is set without a time zone, the organisation time zone is used. Calendar dates remain unchanged.',noAutomatic:'A due date does not perform an act or administer medication. There are no guaranteed notifications while the application is closed.',help:'Lists, agenda and calendar use the same task records. Complete or cancel each task explicitly.',open:'Open task',empty:'No tasks match these filters.',actions:'Actions',page:'Page {page} of {pages} · {count} tasks',search:'Search title, description or notes',openTasks:'Open tasks',all:'All',list:'List and agenda',calendar:'Calendar',calendarHelp:'Use the same filters as the list. Scroll horizontally on narrow screens or switch to the list. Up to three tasks are shown per day; open all to see the rest.',previousMonth:'Previous month',nextMonth:'Next month',month:'Month',from:'From date',to:'To date',mode:'View',today:'Today',moreTasks:'Open all {count} tasks'};
  const values={priority:{low:'Low',medium:'Medium',high:'High',urgent:'Urgent'},urgency:{overdue:'Overdue',today:'Today',next_week:'Next seven days',later:'Later',closed:'Closed'},day:{mon:'Mon',tue:'Tue',wed:'Wed',thu:'Thu',fri:'Fri',sat:'Sat',sun:'Sun'}};
  const additions=Object.fromEntries(Object.entries(labels).map(([key,value])=>['q.'+key,value]));for(const[kind,entries]of Object.entries(values))for(const[key,value]of Object.entries(entries))additions['q.'+kind+'.'+key]=value;
  root.locales.en=Object.freeze({...root.locales.en,...additions,'q.inactive':'Inactive','q.reviewAssignedVolunteer':'The assigned volunteer is no longer active. Select another volunteer or explicitly clear the assignment before saving.','nav.tasks':'Tasks and calendar'});
}(window.RescueManager));

(function (root) {
  'use strict';
  root.locales.en = Object.freeze({ ...root.locales.en,
    'hw.title': 'Health and care', 'hw.record': 'Record performed health act', 'hw.newPlan': 'Create care plan', 'hw.editPlan': 'Edit care plan',
    'hw.help': 'Performed acts, care instructions and scheduled tasks use the same animal history. Reaching a scheduled date does not record an act as performed.',
    'hw.activeAnimalRequired': 'Restore the animal to an active record before adding health acts or care plans.',
    'hw.type': 'Performed act type', 'hw.date': 'Performed date', 'hw.recordTitle': 'Title or reason', 'hw.description': 'Description', 'hw.results': 'Results', 'hw.notes': 'Notes',
    'hw.more': 'Professional, related plan and additional details', 'hw.veterinarianContactId': 'Existing veterinarian contact', 'hw.clinicContactId': 'Existing clinic organization',
    'hw.carePlanId': 'Related open care plan', 'hw.nextReviewTaskId': 'Existing next review task',
    'hw.nextTaskHelp': 'Select a task already scheduled for this animal. No new appointment is created here.',
    'hw.taskOption': '{title} · {date}', 'hw.conditionState': 'Disease or allergy status', 'hw.condition.unknown': 'Unknown / not recorded',
    'hw.condition.active': 'Active', 'hw.condition.resolved': 'Resolved', 'hw.resolvedOn': 'Resolution date, if known',
    'hw.expenses': 'Related expense', 'hw.expenseMode': 'Expense action', 'hw.expenseMode.none': 'No related expense',
    'hw.expenseMode.new': 'Create one new expense', 'hw.expenseMode.existing': 'Link an existing expense',
    'hw.expenseMovementId': 'Existing posted expense for this animal', 'hw.choose': 'Choose an option', 'hw.expenseOption': '{date} · {concept} · {amount}',
    'hw.existingExpenseHelp': 'Select the invoice already recorded for this animal. Linking it to another act does not create or add another expense.',
    'hw.expenseCategoryId': 'Expense category', 'hw.expenseConcept': 'Expense description', 'hw.expenseAmount': 'Expense amount',
    'hw.decimalSeparator': 'Decimal separator for this amount', 'hw.separator.dot': 'Dot (.)', 'hw.separator.comma': 'Comma (,)',
    'hw.expenseContactId': 'Existing expense contact', 'hw.expenseNotes': 'Expense notes',
    'hw.amountHelp': 'New expenses use {currency}, with up to {precision} decimal places and no thousands separators. The expense date is the performed date.',
    'hw.completePlan': 'Complete the selected care plan after this act',
    'hw.completePlanHelp': 'Explicitly closes the plan. Other pending tasks must first be completed or cancelled separately.',
    'hw.performedConfirmed': 'I confirm that this scheduled act was performed on the date entered',
    'hw.performedHelp': 'The clinical record and this task completion are saved together.', 'hw.performTask': 'Confirm performed health task',
    'hw.performTaskHelp': 'Document the actual act. Saving confirms this scheduled task as completed; it does not create a second task.',
    'hw.recordHelp': 'Enter an act that has already occurred. This form does not schedule or recommend treatment.',
    'hw.confirmPerformed': 'Confirm that the act was performed before completing the task.',
    'hw.pendingPlanTasks': 'Resolve the other pending tasks before completing this plan. No changes have been saved.',
    'hw.amountRequired': 'Enter the amount of the new expense.', 'hw.expenseRequired': 'Choose the existing expense to link.',
    'hw.planSelected': 'Selected plan: {name}', 'hw.pendingPlanHelp': 'The plan cannot close while these tasks are pending. Complete or cancel each task explicitly:',
    'hw.canCompletePlan': 'No other pending tasks prevent an explicit completion of this plan.',
    'hw.name': 'Plan name', 'hw.typeId': 'Plan type', 'hw.startDate': 'Plan start date', 'hw.plannedEndDate': 'Planned end date, if known',
    'hw.status': 'Plan status', 'hw.medication': 'Medication, if applicable', 'hw.instructions': 'Instructions supplied by the professional',
    'hw.doseInstructions': 'Dose instructions', 'hw.routeInstructions': 'Route instructions', 'hw.frequencyInstructions': 'Frequency instructions',
    'hw.instructionsHelp': 'Record instructions supplied by the user or veterinary professional. The application does not calculate doses, recommend treatments or administer anything automatically.',
    'hw.closeConfirmed': 'I confirm closing or cancelling this plan', 'hw.confirmClose': 'Confirm the plan closure or cancellation.',
    'hw.saved': 'Health information saved.', 'hw.unknown': 'Not recorded', 'hw.empty': 'No performed health acts have been recorded.',
    'hw.linkedExpense': '{concept} · {amount} · {status}', 'hw.noExpense': 'No linked expense', 'hw.linkedTasks': 'Related tasks',
    'hw.activeConditions': 'Diseases and allergies recorded as active', 'hw.performedHistory': 'Performed health history', 'hw.actions': 'Actions',
    'hw.openRecord': 'Open health record', 'hw.sharedInvoiceHelp': 'An invoice may be linked to several acts. These rows must not be added together as independent expenses; financial totals count each movement once.',
    'hw.plans': 'Care plans', 'hw.emptyPlans': 'No care plans have been recorded.', 'hw.pendingCount': '{count} pending plan tasks',
    'hw.scheduleTask': 'Schedule one plan task', 'hw.tasks': 'Tasks and calendar'
  });
}(window.RescueManager));

(function (root) {
  'use strict';
  root.locales.en = Object.freeze({ ...root.locales.en,
    'f.amountInvalid':'Enter the amount with the selected decimal separator and currency precision, without thousands separators.',
    'nav.finance': 'Finances', 'f.create': 'Record income or expense', 'f.correct': 'Correct with a replacement', 'f.void': 'Void movement',
    'f.date': 'Movement date', 'f.direction': 'Direction', 'f.direction.income': 'Income', 'f.direction.expense': 'Expense', 'f.categoryId': 'Category',
    'f.concept': 'Description', 'f.amount': 'Amount', 'f.decimalSeparator': 'Decimal separator', 'f.separator.dot': 'Dot (.)', 'f.separator.comma': 'Comma (,)',
    'f.animalId': 'Existing animal', 'f.contactId': 'Existing contact', 'f.notes': 'Notes', 'f.reason': 'Reason for correction or voiding',
    'f.correctionDate': 'Correction date', 'f.voidDate': 'Voiding date', 'f.confirmed': 'I confirm the change and its effects on the linked records',
    'f.choose': 'Choose an option', 'f.inactive': 'Inactive: review the selection',
    'f.amountHelp': 'Working currency: {currency}. Enter up to {precision} decimals using the selected separator, without thousands separators. Amounts must be positive.',
    'f.manualHelp': 'This creates one financial movement. It does not create a donation, health act, adoption or stock movement. Record those facts in their own module.',
    'f.correctionHelp': 'The original is voided and preserved. One replacement of the same direction is created, and linked records are reassigned together. Review inactive categories or contacts before saving.',
    'f.originalSummary': 'Original: {concept} · {amount}', 'f.amountPositive': 'Enter an amount greater than zero.',
    'f.confirmRequired': 'Confirm the correction or voiding before saving.',
    'f.voidHelp': 'Voiding preserves this movement and excludes it from financial totals. A linked monetary donation is also voided. Clinical facts, adoptions and physical stock movements are preserved; no stock is automatically returned.',
    'f.saved': 'Financial operation saved.', 'f.source': 'Source', 'f.source.manual': 'Manual financial entry', 'f.source.donation': 'Donation',
    'f.source.veterinary_record': 'Performed health act', 'f.source.adoption': 'Adoption', 'f.source.inventory_movement': 'Stock movement',
    'f.sourceDescription': '{type}: {description}', 'f.status': 'Status', 'f.original': 'View corrected original: {concept} · {amount}',
    'f.replacement': 'View replacement: {concept} · {amount}', 'f.relatedRecords': 'Linked business records',
    'f.relatedHelp': 'These references share this financial movement. Opening or correcting the movement does not repeat the original business operation.',
    'f.from': 'From date, inclusive', 'f.to': 'To date, inclusive', 'f.search': 'Search description, notes, contact, animal or category',
    'f.all': 'All', 'f.periodError': 'The end date must be on or after the start date.',
    'f.total.income': 'Filtered income', 'f.total.expense': 'Filtered expenses', 'f.total.balance': 'Filtered balance',
    'f.totalsHelp': 'Totals use all matching movements across every page and exclude voided entries. Direction, category, contact and animal filters also affect the balance. Showing only voided entries gives zero financial totals.',
    'f.empty': 'No movements match these filters.', 'f.open': 'Open movement', 'f.actions': 'Actions', 'f.page': 'Page {page} of {pages} · {count} movements',
    'f.help': 'Income and expenses in the organization’s working currency. Corrections preserve the original record. This register does not provide tax accounting or donation certification.'
  });
}(window.RescueManager));

(function (root) {
  'use strict';
  root.locales.en = Object.freeze({ ...root.locales.en,
    'nav.donations': 'Donations',
    'dn.help': 'Record monetary and material donations. A monetary donation creates exactly one income; a material donation can add stock without counting as money.',
    'dn.newMonetary': 'Record monetary donation', 'dn.newMaterial': 'Record material donation', 'dn.void': 'Void donation',
    'dn.date': 'Donation date', 'dn.donorContactId': 'Existing donor contact', 'dn.categoryId': 'Income category', 'dn.concept': 'Income description',
    'dn.amount': 'Amount', 'dn.decimalSeparator': 'Decimal separator', 'dn.separator.dot': 'Dot (.)', 'dn.separator.comma': 'Comma (,)',
    'dn.notes': 'Notes', 'dn.reason': 'Reason for voiding', 'dn.voidDate': 'Voiding date', 'dn.confirmed': 'I confirm the void and its effects on the linked records',
    'dn.confirmRequired': 'Confirm the void before saving.',
    'dn.type': 'Type', 'dn.type.monetary': 'Monetary', 'dn.type.material': 'Material',
    'dn.status': 'Status', 'dn.status.recorded': 'Recorded', 'dn.status.voided': 'Voided',
    'dn.donor': 'Donor', 'dn.summary': 'Description', 'dn.value': 'Amount or value',
    'dn.income': 'Related income', 'dn.lines': 'Material lines', 'dn.noLines': 'No material lines recorded.',
    'dn.lineCount': '{count} lines', 'dn.materialTypeId': 'Material type', 'dn.description': 'Description', 'dn.quantity': 'Quantity',
    'dn.quantityPrecision': 'Decimal places', 'dn.unitId': 'Unit', 'dn.inventoryItemId': 'Add to inventory item (optional)',
    'dn.estimatedValueMinor': 'Estimated value (optional)', 'dn.estimatedValue': 'Estimated value (not income): {value}', 'dn.estimatedNone': 'No estimated value',
    'dn.amountHelp': 'Working currency: {currency}. Enter up to {precision} decimals using the selected separator, without thousands separators. Amounts must be positive.',
    'dn.monetaryHelp': 'This creates the donation and exactly one income in the same save. The amount comes from that income; there is no second editable figure.',
    'dn.materialHelp': 'Record one or more lines. Selecting an inventory item creates one stock movement per line; the estimated value is never counted as monetary income.',
    'dn.quantityHelp': 'Whole or decimal quantity using the line’s decimal places and the selected separator.',
    'dn.estimatedHelp': 'Optional, in the working currency. It is informational and never added to financial income.',
    'dn.addLine': 'Add line', 'dn.removeLine': 'Remove', 'dn.lineRequired': 'A material donation needs at least one line.', 'dn.lineInvalid': 'Review each line: material type, description, positive quantity and unit.',
    'dn.voidHelp': 'Voiding preserves the donation. A monetary donation also voids its income; a material donation creates one compensating stock adjustment per incorporated line. Original records are kept.',
    'dn.search': 'Search notes, concept or donor', 'dn.from': 'From date, inclusive', 'dn.to': 'To date, inclusive', 'dn.all': 'All', 'dn.periodError': 'The end date must be on or after the start date.',
    'dn.empty': 'No donations match these filters.', 'dn.open': 'Open donation', 'dn.actions': 'Actions', 'dn.page': 'Page {page} of {pages} · {count} donations',
    'dn.saved': 'Donation saved.', 'dn.linkedIncome': '{concept} · {amount} · {status}', 'dn.linkedItem': 'Inventory item', 'dn.stockMovement': 'Stock movement', 'dn.noStock': 'Not added to inventory',
    'dn.choose': 'Choose an option', 'dn.inactive': 'Inactive: review the selection', 'dn.openContact': 'Open contact',
    'nav.inventory': 'Inventory',
    'iv.help': 'Items, stock movements and minimum levels. Stock derives from recorded movements; corrections use compensating movements and keep the original trail.',
    'iv.newItem': 'New inventory item', 'iv.archive': 'Archive item', 'iv.recordMovement': 'Record movement',
    'iv.name': 'Item name', 'iv.categoryId': 'Category', 'iv.unitId': 'Unit', 'iv.quantityPrecision': 'Decimal places (0–3)',
    'iv.minimumStockScaled': 'Minimum stock', 'iv.supplierContactId': 'Existing supplier contact', 'iv.notes': 'Notes',
    'iv.stock': 'Available stock', 'iv.minimum': 'Minimum', 'iv.status': 'Status', 'iv.status.active': 'Active', 'iv.status.archived': 'Archived',
    'iv.belowMinimum': 'Below minimum', 'iv.atMinimum': 'At minimum', 'iv.ok': 'Above minimum', 'iv.category': 'Category', 'iv.unit': 'Unit',
    'iv.search': 'Search by item name or notes', 'iv.filterStatus': 'Status', 'iv.level': 'Stock level', 'iv.all': 'All', 'iv.open': 'Open item', 'iv.actions': 'Actions',
    'iv.page': 'Page {page} of {pages} · {count} items', 'iv.empty': 'No inventory items match these filters.',
    'iv.movements': 'Stock movements', 'iv.movementType': 'Movement type', 'iv.movementType.opening_balance': 'Opening balance', 'iv.movementType.purchase': 'Purchase',
    'iv.movementType.donation': 'Donation', 'iv.movementType.consumption': 'Consumption', 'iv.movementType.return': 'Return', 'iv.movementType.adjustment': 'Adjustment',
    'iv.date': 'Movement date', 'iv.quantity': 'Quantity', 'iv.direction': 'Direction', 'iv.direction.in': 'In (+ stock)', 'iv.direction.out': 'Out (− stock)',
    'iv.reason': 'Reason', 'iv.contactId': 'Existing contact', 'iv.expenseMovementId': 'Linked expense (purchase only)', 'iv.movementNotes': 'Notes',
    'iv.decimalSeparator': 'Decimal separator', 'iv.separator.dot': 'Dot (.)', 'iv.separator.comma': 'Comma (,)',
    'iv.quantityHelp': 'This item uses {precision} decimal places. Enter the quantity with the selected separator. Purchases and opening balances add stock; consumption subtracts it.',
    'iv.moveHelp': 'A purchase may link one existing posted expense; no new expense is created here. Donations are recorded in the Donations module. Stock can never become negative.',
    'iv.compensate': 'Compensate with an adjustment', 'iv.compensateReason': 'Reason', 'iv.compensateDate': 'Adjustment date',
    'iv.compensateHelp': 'Creates the exact opposite movement as an adjustment, linked to the original. It is used to correct a mistaken movement while keeping the trail.',
    'iv.compensateConfirm': 'I reviewed the movement and want to record its compensation.', 'iv.confirmRequired': 'Confirm the compensation before saving.',
    'iv.archiveConfirm': 'Archive {name}? Stock movements and history are kept; no new ordinary movements can be added to an archived item.',
    'iv.confirmed': 'I reviewed the item and want to archive it.', 'iv.choose': 'Choose an option',
    'iv.saved': 'Inventory saved.', 'iv.quantityPositive': 'Enter a quantity greater than zero.', 'iv.signRequired': 'Choose an in or out direction for this movement.',
    'iv.expenseOnlyPurchase': 'An expense can only be linked to a purchase.', 'iv.supplier': 'Supplier', 'iv.movementDate': 'Date', 'iv.delta': 'Change',
    'iv.compensated': 'Compensated', 'iv.donationSource': 'From material donation', 'iv.item': 'Item', 'iv.stockSummary': 'Stock summary',
    'iv.minimumHelp': 'Minimum stock uses the item’s unit and decimal places. Enter 0 for no minimum.',
    'iv.precisionHelp': 'Whole items use 0 decimal places; quantities with fractions use up to 3.',
    'iv.unitHelp': 'Units and categories must be active options.'
  });
}(window.RescueManager));

(function (root) {
  'use strict';
  root.locales.en = Object.freeze({ ...root.locales.en,
    'nav.reports': 'Reports',
    'rp.help': 'Figures derive from the current records and the chosen period. Location and adoption availability can overlap; current census values are not mutually exclusive.',
    'rp.from': 'From date, inclusive', 'rp.to': 'To date, inclusive', 'rp.periodError': 'The end date must be on or after the start date.',
    'rp.census.title': 'Current situation', 'rp.underCare': 'Animals under care', 'rp.inShelter': 'In the shelter', 'rp.inFoster': 'In foster care', 'rp.available': 'Available for adoption', 'rp.reserved': 'Reserved',
    'rp.finances.title': 'Finances and donations in the period', 'rp.income': 'Income', 'rp.expense': 'Expenses', 'rp.balance': 'Balance', 'rp.veterinaryExpenses': 'Veterinary expenses', 'rp.monetaryDonations': 'Monetary donations', 'rp.materialDonations': 'Material donations',
    'rp.entriesAdoptions.title': 'Entries and adoptions per month', 'rp.entriesAdoptionsHelp': 'Entries count stay episodes started in the period, including returns. Adoptions count completed adoptions; a later return does not erase the fact.',
    'rp.entries': 'Entries', 'rp.adoptions': 'Adoptions',
    'rp.incomeExpense.title': 'Income and expenses per month',
    'rp.distribution.title': 'Current distribution', 'rp.dimension': 'Group', 'rp.records': 'Records', 'rp.species': 'By species', 'rp.sex': 'By sex', 'rp.age': 'By age band', 'rp.availability': 'By adoption availability', 'rp.situation': 'By care situation',
    'rp.age.under_1': 'Under 1 year', 'rp.age.1_to_3': '1 to 3 years', 'rp.age.4_to_7': '4 to 7 years', 'rp.age.8_plus': '8 years or more', 'rp.age.unknown': 'Unknown',
    'rp.timeToAdoption.title': 'Time until adoption', 'rp.averageDays': 'Average {days} days across {cases} closed episodes', 'rp.noCases': 'No episodes closed by adoption yet.',
    'rp.costs.title': 'Costs per animal', 'rp.costsByAnimal': 'Expenses linked to an animal', 'rp.animal': 'Animal', 'rp.total': 'Total', 'rp.generalExpenses': 'General expenses without an animal', 'rp.costsHelp': 'General expenses are shown separately and are not distributed among animals by a hidden formula.',
    'rp.empty': 'No records to show.', 'rp.value': 'Value'
  });
}(window.RescueManager));

(function(root){'use strict';root.locales.en=Object.freeze({...root.locales.en,
'rp.month':'Month','rp.year':'Year','rp.annual':'Annual evolution','rp.currentHelp':'Current records as of {date}; changing the period does not reconstruct a past census.',
'rp.materialHelp':'{count} material lines; estimated value {value}. This value is not cash income.',
'rp.adoptionTimeHelp':'Adoptions in the selected period, linked to episodes closed by adoption. Days are rounded to the nearest whole day. Returns preserve the original case; animals not yet adopted are excluded.',
'rp.ageHelp':'Administrative bands in completed years, not veterinary classifications. Estimated ages advance from their recorded reference date; unknown ages remain unknown.',
'rp.chartHelp':'Chart: latest twelve months of the chosen period. The table and downloads include the full selected period. Green: first series; amber: second series.',
'rp.rangeError':'The report cannot be calculated. Select valid dates covering at most 100 years and check that financial totals fit safe integers.',
'rp.page':'Page {page} of {pages} · {count} rows','rp.downloadCsv':'Download table CSV','rp.separator':'CSV separator','rp.comma':'Comma','rp.semicolon':'Semicolon','rp.excel':'Include UTF-8 BOM for spreadsheet applications',
'rp.json':'Download report JSON','rp.meanDays':'Average days','rp.exportHelp':'Downloads contain all rows of each report for the selected period. Currency values use a decimal point without grouping. CSV protects potentially executable text; spreadsheets can change protections or types when saving. JSON preserves report values. These downloads contain no files and are not a full backup. Printing covers visible table pages.'
});}(window.RescueManager));
(function(r){r.locales.en=Object.freeze({...r.locales.en,'dn.amountInvalid':'Enter a positive amount using the selected decimal separator and currency precision.','dn.totalOverflow':'Estimated total exceeds the safe integer limit.'});}(window.RescueManager));

(function(r){r.locales.en=Object.freeze({...r.locales.en,
 'nav.search':'Global search','gs.query':'Search animals and contacts','gs.start':'Enter a name, animal code, microchip, phone or email.',
 'gs.help':'Names ignore accents and case. Phone and microchip comparisons use their normalized text; original values are preserved. Results open the corresponding record.',
 'gs.count':'{count} results','gs.empty':'No matching records.','gs.includeInactive':'Include archived records and trash',
 'hi.source':'Source record','hi.openSource':'Open source record','hi.missing':'The source record is not available in this dataset.',
 'hi.sourceCurrent':'This is the current source record. The history keeps each recorded transition; its date and state can differ from the current source.',
 'hi.type':'Event type','hi.factDate':'Date of the fact','hi.recorded':'Recorded on','hi.corrected':'Corrected or voided',
 'hi.includeCorrected':'Include corrected and voided versions','hi.page':'Page {page} of {pages} · {count} events',
 'hi.help':'Facts are ordered by their calendar date, then by the time they were recorded. Recorded times use the organization time zone. Open a source to consult its details. Superseded or voided versions are hidden by default.',
 'hi.entry.first_entry':'First entry','hi.entry.return':'Return','hi.entry.other':'Other entry',
 'hi.exit.adoption':'Adoption','hi.exit.deceased':'Death','hi.exit.transfer':'Transfer','hi.exit.other':'Other exit'
});}(window.RescueManager));