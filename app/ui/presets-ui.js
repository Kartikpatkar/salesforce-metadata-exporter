/**
 * Presets Management UI Module
 */

async function loadPresets() {
  if (!orgInfo || !orgInfo.instanceUrl) return;
  try {
    await presetsManager.loadPresets(orgInfo.instanceUrl);
    populatePresetDropdown();
  } catch (error) {
    console.error('[Presets] Failed to load presets:', error);
  }
}

function populatePresetDropdown() {
  if (!elements.presetDropdown) return;
  presetsManager.populateDropdown(elements.presetDropdown);
  if (elements.deletePresetBtn) {
    elements.deletePresetBtn.style.display = 'none';
  }
}

async function applyUserPreset(name) {
  if (!name || !presetsManager.currentPresets[name]) {
    if (elements.deletePresetBtn) elements.deletePresetBtn.style.display = 'none';
    return;
  }
  
  if (elements.deletePresetBtn) elements.deletePresetBtn.style.display = 'inline-block';
  const preset = presetsManager.currentPresets[name];
  
  selectedMetadataTypes.clear();
  selectedMembers.clear();
  
  elements.metadataCheckboxes.forEach(checkbox => {
    checkbox.checked = false;
    const container = checkbox.closest('.metadata-type-container');
    const badge = container?.querySelector('.member-count-badge');
    if (badge) {
      badge.textContent = '0';
      badge.classList.add('hidden');
    }
    const membersContainer = container?.querySelector('.members-container');
    if (membersContainer) {
      membersContainer.innerHTML = '';
      membersContainer.classList.add('hidden');
    }
    const arrow = container?.querySelector('.expand-arrow');
    if (arrow) arrow.textContent = '▶';
  });
  
  const typesToSelect = preset.types || [];
  typesToSelect.forEach(type => {
    const checkbox = Array.from(elements.metadataCheckboxes).find(cb => cb.value === type);
    if (checkbox) {
      checkbox.checked = true;
      selectedMetadataTypes.add(type);
      
      const members = preset.members?.[type] || '*';
      if (members === '*') {
        selectedMembers.set(type, '*');
      } else if (Array.isArray(members)) {
        selectedMembers.set(type, new Set(members));
      } else {
        selectedMembers.set(type, '*');
      }
      
      if (typeof updateMemberCountBadge === 'function') updateMemberCountBadge(type);
      updateRenderedMemberCheckboxes(type);
    }
  });
  
  if (typeof filterMetadataTypes === 'function') filterMetadataTypes();
  if (typeof updateAllCategoryBadges === 'function') updateAllCategoryBadges();
  
  if (typeof updateExportButtonState === 'function') updateExportButtonState();
  if (typeof updatePackagePreview === 'function') updatePackagePreview();
  if (typeof saveSelections === 'function') saveSelections();
  
  showSuccess(`Preset "${name}" applied!`);
}

function updateRenderedMemberCheckboxes(metadataType) {
  const membersListContainer = document.getElementById(`members-list-${metadataType}`);
  if (!membersListContainer) return;
  
  const checkboxes = membersListContainer.querySelectorAll('.member-checkbox');
  const selection = selectedMembers.get(metadataType);
  
  checkboxes.forEach(cb => {
    if (selection === '*') {
      cb.checked = true;
    } else if (selection instanceof Set && selection.has(cb.value)) {
      cb.checked = true;
    } else if (Array.isArray(selection) && selection.includes(cb.value)) {
      cb.checked = true;
    } else {
      cb.checked = false;
    }
  });
}

async function saveUserPreset(name) {
  try {
    await presetsManager.savePreset(name, orgInfo?.instanceUrl, selectedMetadataTypes, selectedMembers);
    populatePresetDropdown();
    if (elements.presetDropdown) elements.presetDropdown.value = name.trim();
    if (elements.deletePresetBtn) elements.deletePresetBtn.style.display = 'inline-block';
    
    if (elements.presetNameInputContainer) elements.presetNameInputContainer.classList.add('hidden');
    if (elements.presetNameInput) elements.presetNameInput.value = '';
    
    showSuccess(`Preset "${name.trim()}" saved!`);
  } catch (error) {
    console.error('[Presets] Failed to save preset:', error);
    showError(error.message || 'Failed to save preset.');
  }
}

async function deleteUserPreset() {
  if (!elements.presetDropdown) return;
  const name = elements.presetDropdown.value;
  if (!name || !presetsManager.currentPresets[name]) return;
  
  if (!confirm(`Are you sure you want to delete the preset "${name}"?`)) {
    return;
  }
  
  try {
    await presetsManager.deletePreset(name, orgInfo?.instanceUrl);
    populatePresetDropdown();
    showSuccess(`Preset "${name}" deleted.`);
  } catch (error) {
    console.error('[Presets] Failed to delete preset:', error);
    showError('Failed to delete preset.');
  }
}
