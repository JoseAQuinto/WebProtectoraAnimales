(function (root) {
  'use strict';
  const c = root.services.context, resources = root.services.assetFiles;
  function editable(h, row) {
    if (row.deletedAt || row.archivedAt) h.fail('InvalidStateError', 'Restore the record before changing its photograph');
    return row;
  }
  function log(h, type, id) {
    return h.insert('activityLog', h.create('activityLog', { operation: 'update', occurredAt: h.now,
      operationId: h.operationId, target: { type, id }, summaryParameters: { field: type === 'animal' ? 'photo' : 'logo' } }));
  }
  async function set(animalId, file, command) {
    const prepared = await root.utils.images.prepare(file);
    return c.execute('photos.set', { animalId, photo: resources.identity(prepared.photo), thumbnail: resources.identity(prepared.thumbnail) }, (data, h) => {
      const animal = editable(h, h.find('animals', animalId));
      resources.budget(data, prepared.photo.byteLength + prepared.thumbnail.byteLength);
      const photo = resources.asset(h, prepared.photo, 'photo'), thumbnail = resources.asset(h, prepared.thumbnail, 'thumbnail', photo.id);
      return { changes: [h.insert('assets', photo), h.insert('assets', thumbnail), h.replace('animals',
        h.edit('animals', animal, { photoAssetId: photo.id, thumbnailAssetId: thumbnail.id })), log(h, 'animal', animal.id)],
        result: { animalId: animal.id, photoAssetId: photo.id, thumbnailAssetId: thumbnail.id } };
    }, command);
  }
  function remove(animalId, command) {
    return c.execute('photos.remove', { animalId }, (data, h) => {
      const animal = editable(h, h.find('animals', animalId));
      if (!animal.photoAssetId && !animal.thumbnailAssetId) h.fail('InvalidStateError', 'The animal has no photograph');
      // Keep old resources: another row, a historic reference or a recovery path may still need them.
      return { changes: [h.replace('animals', h.edit('animals', animal, { photoAssetId: null, thumbnailAssetId: null })),
        log(h, 'animal', animal.id)], result: { animalId: animal.id } };
    }, command);
  }
  async function setOrganizationLogo(file, command) {
    const prepared = (await root.utils.images.prepare(file)).photo;
    return c.execute('photos.setOrganizationLogo', { file: resources.identity(prepared) }, (data, h) => {
      const organization = data.organizationSettings[0];
      if (!organization) h.fail('InvalidStateError', 'Create an organization first');
      resources.budget(data, prepared.byteLength);
      const logo = resources.asset(h, prepared, 'logo');
      return { changes: [h.insert('assets', logo), h.replace('organizationSettings', h.edit('organizationSettings', organization, { logoAssetId: logo.id })),
        log(h, 'organization_settings', organization.id)], result: { logoAssetId: logo.id } };
    }, command);
  }
  async function read(assetId) {
    const value = await resources.readAsset(assetId);
    if (!value.mime.startsWith('image/')) { const error = new Error('Only a validated image can be previewed'); error.name = 'InvalidInputError'; throw error; }
    return value;
  }
  function removeOrganizationLogo(command) {
    return c.execute('photos.removeOrganizationLogo', {}, (data,h) => {
      const organization=data.organizationSettings[0];
      if(!organization?.logoAssetId)h.fail('InvalidStateError','The organization has no logo');
      return {changes:[h.replace('organizationSettings',h.edit('organizationSettings',organization,{logoAssetId:null})),
        log(h,'organization_settings',organization.id)],result:{id:organization.id}};
    },command);
  }
  root.services.photos = Object.freeze({ set, remove, read, setOrganizationLogo, removeOrganizationLogo });
}(window.RescueManager));
