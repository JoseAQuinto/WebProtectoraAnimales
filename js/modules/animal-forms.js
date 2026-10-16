(function (root) {
  'use strict';
  const ui = root.components.ui, el = ui.el, t = (key, values) => root.core.i18n.t(key, values);
  const revision = ctx => ({ expectedRevision: ctx.snapshot.globalRevision });
  const today = ctx => root.utils.dates.today(ctx.snapshot.tables.organizationSettings[0].timeZone);
  const options = (values, prefix) => values.map(value => ({ value, label: t(prefix + value) }));
  const field = (key, labelKey, extra = {}) => ({ key, labelKey, ...extra });
  const note = (key, labelKey, extra = {}) => field(key, labelKey, { type: 'textarea', keepEmpty: true, ...extra });
  const fail = key => { throw new root.core.errors.AppError(key); };
  function allowed(ctx) { return typeof ctx.canWrite === 'function' ? ctx.canWrite() : ctx.canWrite === undefined ? root.services.context.status().canWrite : !!ctx.canWrite; }
  function readOnly(ctx) { return allowed(ctx) ? null : ui.dialog(t('common.readOnly'), el('p', {}, t('ui.readOnly'))); }
  async function saved(ctx, id) { ctx.notify?.(t('af.saved')); await ctx.refresh(); if (ctx.afterSave) setTimeout(() => ctx.afterSave(id), 0); }
  function catalog(ctx, kind, selected) {
    return ctx.snapshot.tables.catalogOptions.filter(row => row.kind === kind && ((!row.deletedAt && !row.archivedAt && row.active) || row.id === selected))
      .sort((a, b) => a.sortOrder - b.sortOrder).map(row => ({ value: row.id, label: root.services.catalogs.label(row) }));
  }
  function birthKind(animal) { return !animal || animal.birthPrecision === 'unknown' ? 'unknown' : animal.birthPrecision === 'exact' ? 'exact' : animal.birthDate ? 'estimated_date' : 'estimated_age'; }
  function profileFields(ctx, animal) {
    const advanced = { advancedKey: 'af.more' }, calendar = { type: 'date', max: today(ctx), ...advanced };
    return [field('name','af.name',{ required: true, maxLength: 120 }), field('speciesId','af.species',{ required: true, options: catalog(ctx,'species',animal?.speciesId) }),
      field('sex','af.sex',{ required: true, options: options(root.domain.enums.sex,'af.sex.'), ...advanced }),
      field('sizeId','af.size',{ options: catalog(ctx,'size',animal?.sizeId), ...advanced }), field('breed','af.breed',{ maxLength: 120, ...advanced }),
      field('color','af.color',{ maxLength: 120, ...advanced }), field('microchipOriginal','af.microchip',{ maxLength: 100, ...advanced }),
      field('birthKind','af.birthKind',{ required: true, options: options(['unknown','exact','estimated_date','estimated_age'],'af.birthKind.'), ...advanced }),
      field('birthDate','af.birthDate',calendar), field('estimatedAgeMonths','af.estimatedAgeMonths',{ type: 'number', numeric: true, min: 0, max: 12000, step: 1, ...advanced }),
      field('estimatedAgeReferenceDate','af.estimatedAgeReferenceDate',calendar),
      field('sterilizationStatus','af.sterilization',{ required: true, options: options(root.domain.enums.sterilizationStatus,'af.sterilization.'), ...advanced }),
      field('sterilizationDate','af.sterilizationDate',calendar), ...['description','character','behavior','specialNeeds','notes'].map(key => note(key,'af.'+key,advanced))];
  }
  function profileInput(input) {
    const value = { ...input }; delete value.birthKind;
    value.birthPrecision = input.birthKind === 'unknown' ? 'unknown' : input.birthKind === 'exact' ? 'exact' : 'estimated';
    if (input.birthKind === 'unknown' || input.birthKind === 'estimated_age') value.birthDate = null;
    if (input.birthKind !== 'estimated_age') { value.estimatedAgeMonths = null; value.estimatedAgeReferenceDate = null; }
    if (input.sterilizationStatus !== 'yes') value.sterilizationDate = null;
    return value;
  }
  function control(dialog, key) { return dialog.querySelector('[name="' + key + '"]'); }
  function visible(dialog, key, shown, required = false) { const input = control(dialog,key); if (!input) return; input.closest('.field').hidden = !shown; input.required = shown && required; }
  function bindProfile(dialog) {
    const repaint = () => {
      const kind = control(dialog,'birthKind').value;
      visible(dialog,'birthDate',kind === 'exact' || kind === 'estimated_date',true);
      visible(dialog,'estimatedAgeMonths',kind === 'estimated_age',true); visible(dialog,'estimatedAgeReferenceDate',kind === 'estimated_age',true);
      visible(dialog,'sterilizationDate',control(dialog,'sterilizationStatus').value === 'yes');
    };
    control(dialog,'birthKind').addEventListener('change',repaint); control(dialog,'sterilizationStatus').addEventListener('change',repaint); repaint();
  }
  function locationFields(ctx) {
    const places = ctx.snapshot.tables.locations.filter(row => !row.deletedAt && !row.archivedAt && row.active).map(row => ({ value: row.id, label: row.name }));
    return [field('locationKind','af.locationKind',{ required: true, options: options(['shelter','temporary_external'],'af.location.') }),
      field('locationId','af.locationId',{ options: places }), field('externalDescription','af.externalDescription',{ type: 'textarea', maxLength: 2000 })];
  }
  function bindLocation(dialog) {
    const repaint = () => { const shelter = control(dialog,'locationKind').value === 'shelter'; visible(dialog,'locationId',shelter,true); visible(dialog,'externalDescription',!shelter,true); };
    control(dialog,'locationKind').addEventListener('change',repaint); repaint();
  }
  function entry(ctx, animal) {
    const blocked = readOnly(ctx); if (blocked) return blocked;
    if (animal && (animal.archivedAt || animal.deletedAt || animal.managementStatus !== 'other_exit')) return ui.dialog(t('af.reentry'),el('p',{},t('af.entryUnavailable')));
    const details = animal ? [] : profileFields(ctx);
    if (!animal) details.push(field('code','af.code',{ maxLength: 40, help: 'af.codeHelp', advancedKey: 'af.more' }));
    const fields = [...details.filter(item=>!item.advancedKey), field('date','af.entryDate',{ required: true, type: 'date', max: today(ctx) }), field('entryReason','af.entryReason',{ required: true, maxLength: 200 }),
      ...locationFields(ctx), field('availability','af.availability',{ required: true, options: options(['available','unavailable'],'af.availability.'), help: 'af.availabilityHelp' }),
      ...details.filter(item=>item.advancedKey), note('originDescription','af.origin',{ maxLength: 2000, advancedKey:'af.more' }), note('episodeNotes','af.episodeNotes',{advancedKey:'af.more'})];
    const places = ctx.snapshot.tables.locations.filter(row => !row.deletedAt && !row.archivedAt && row.active);
    const values = { sex: 'unknown', birthKind: 'unknown', sterilizationStatus: 'unknown', date: today(ctx), availability: '', locationKind: places.length ? 'shelter' : 'temporary_external', locationId: places[0]?.id };
    // A blank first option makes this a deliberate availability decision rather than a default inferred from location.
    fields.find(item => item.key === 'availability').options.unshift({ value: '', label: t('af.choose') });
    const dialog = ui.form(t(animal ? 'af.reentry' : 'af.entry'), fields, values, async (input, cmd) => {
      const intent = { date: input.date, entryReason: input.entryReason, originDescription: input.originDescription, notes: input.episodeNotes,
        availability: input.availability, location: input.locationKind === 'shelter' ? { kind: 'shelter', id: input.locationId } : { kind: 'temporary_external', description: input.externalDescription } };
      if (animal) intent.animalId = animal.id;
      else {
        const profile = Object.fromEntries(details.map(item => [item.key,input[item.key]]));
        if (profile.code && /^a-\d+$/i.test(profile.code)) fail('af.invalidCode'); intent.animal = profileInput(profile);
      }
      const result = await root.services.animals.registerEntry(intent,cmd); await saved(ctx,result.result.animalId);
    },revision(ctx));
    bindLocation(dialog); if (!animal) bindProfile(dialog); else dialog.querySelector('h2').after(el('p',{},animal.name)); return dialog;
  }
  function edit(ctx, animal) {
    const blocked = readOnly(ctx); if (blocked) return blocked;
    const dialog = ui.form(t('af.edit'), profileFields(ctx,animal), { ...animal, birthKind: birthKind(animal) }, async (input, cmd) => {
      const patch=profileInput(input);
      // Retain historical inactive catalogue choices unless the user changes them.
      if(patch.speciesId===animal.speciesId)delete patch.speciesId;
      if(patch.sizeId===animal.sizeId)delete patch.sizeId;
      await root.services.animals.update({ animalId: animal.id, patch },cmd); await saved(ctx,animal.id);
    },revision(ctx)); dialog.querySelector('h2').after(el('p',{},animal.name)); bindProfile(dialog); return dialog;
  }
  function weight(ctx, animal) {
    const blocked = readOnly(ctx); if (blocked) return blocked;
    const dialog = ui.form(t('af.weight'), [field('date','af.date',{ type: 'date', required: true, max: today(ctx) }),
      field('grams','af.grams',{ type: 'number', numeric: true, required: true, min: 1, max: Number.MAX_SAFE_INTEGER, step: 1, help: 'af.gramsHelp' }), note('notes','af.measurementNotes')],
    { date: today(ctx) }, async (input,cmd) => { await root.services.weights.record({ animalId: animal.id,...input },cmd); await saved(ctx,animal.id); },revision(ctx));
    dialog.querySelector('h2').after(el('p',{},animal.name)); return dialog;
  }
  function disposition(ctx, animal, mode) {
    const blocked = readOnly(ctx); if (blocked) return blocked;
    if (!['archive','trash','restore'].includes(mode)) throw new TypeError('Unknown animal disposition');
    const dialog = ui.form(t('af.'+mode), [field('confirmed','af.dispositionConfirm',{ type: 'checkbox', required: true })], { confirmed: false }, async (input,cmd) => {
      if (!input.confirmed) fail('af.confirmRequired'); await root.services.animals[mode](animal.id,cmd); await saved(ctx,animal.id);
    },revision(ctx));
    dialog.querySelector('h2').after(el('p',{},animal.name),el('p',{},t('af.'+mode+'Help'))); return dialog;
  }
  function exit(ctx, animal) {
    const blocked = readOnly(ctx); if (blocked) return blocked;
    const tables = ctx.snapshot.tables, pending = tables.tasks.filter(row => row.animalId === animal.id && ['pending','in_progress'].includes(row.status));
    const foster = tables.fosterStays.filter(row => row.animalId === animal.id && !row.endDate), reservations = tables.reservations.filter(row => row.animalId === animal.id && row.status === 'active');
    const applications = tables.adoptionApplications.filter(row => row.animalId === animal.id && ['pending','under_review','approved'].includes(row.status));
    const episode = tables.stayEpisodes.find(row => row.animalId === animal.id && !row.exitDate);
    const minimum = [episode?.entryDate,...foster.map(row=>row.startDate),...reservations.map(row=>row.reservationDate)].filter(Boolean).sort().at(-1);
    const modes = animal.managementStatus === 'under_care' ? ['death','transfer','other'] : ['death'];
    const fields = [field('mode','af.exitMode',{ required: true, options: [{ value: '', label: t('af.choose') },...options(modes,'af.exitMode.')] }),
      field('date','af.date',{ required: true, type: 'date', min: minimum, max: today(ctx) }),field('reason','af.reason',{ required: true,maxLength:200 })];
    if (foster.length) fields.push(field('fosterEndReason','af.fosterEndReason',{ required:true,maxLength:200 }));
    if (reservations.length) fields.push(field('reservationClosureReason','af.reservationClosureReason',{ required:true,maxLength:200 }));
    if (applications.length) fields.push(field('applicationClosureReason','af.applicationClosureReason',{ required:true,maxLength:200 }));
    pending.forEach((task,index) => fields.push(field('taskDecision'+index,'af.taskDecision',{ required:true,options:[{value:'',label:t('af.choose')},...options(['keep','cancel'],'af.task.')] }),field('taskReason'+index,'af.taskReason',{maxLength:200})));
    fields.push(field('confirmed','af.exitConfirm',{ type:'checkbox',required:true }));
    const dialog = ui.form(t('af.exit'), fields, { date:today(ctx),mode:'',confirmed:false }, async (input,cmd) => {
      if (!input.confirmed) fail('af.confirmRequired'); const taskDecisions = {keep:[],cancel:[]};
      pending.forEach((task,index) => { if (input['taskDecision'+index] === 'keep') taskDecisions.keep.push(task.id);
        else { if (!input['taskReason'+index]) fail('af.taskReasonRequired'); taskDecisions.cancel.push({id:task.id,reason:input['taskReason'+index]}); } });
      const intent = { animalId:animal.id,date:input.date,reason:input.reason,taskDecisions };
      ['fosterEndReason','reservationClosureReason','applicationClosureReason'].forEach(key=>{if(input[key])intent[key]=input[key];});
      if(input.mode==='death')await root.services.animals.recordDeath(intent,cmd);else await root.services.animals.recordExit({...intent,exitReason:input.mode},cmd);
      await saved(ctx,animal.id);
    },revision(ctx));
    dialog.querySelector('h2').after(el('p',{},animal.name),el('p',{},t('af.exitHelp')),pending.length?el('p',{},t('af.tasksHelp')):el('span'));
    pending.forEach((task,index) => { const decision=control(dialog,'taskDecision'+index),reason=control(dialog,'taskReason'+index);
      decision.closest('.field').prepend(el('p',{class:'muted'},task.title));
      const repaint=()=>visible(dialog,'taskReason'+index,decision.value==='cancel',true);decision.addEventListener('change',repaint);repaint();
      reason.setAttribute('aria-label',t('af.taskReason')+' · '+task.title);
    }); return dialog;
  }
  root.modules.animalForms = Object.freeze({ entry, edit, weight, disposition, exit });
}(window.RescueManager));
