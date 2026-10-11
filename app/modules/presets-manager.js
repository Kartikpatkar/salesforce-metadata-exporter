/**
 * Presets Manager Module
 * Handles loading, saving, deleting, and serializing metadata presets
 */

export class PresetsManager {
  constructor(options = {}) {
    this.currentPresets = {};
    this.onPresetChange = options.onPresetChange || null;
  }

  /**
   * Load presets for a given org instance
   * @param {string} instanceUrl
   * @returns {Promise<Object>}
   */
  async loadPresets(instanceUrl) {
    if (!instanceUrl) return {};
    const key = `metadataPresets_${instanceUrl}`;
    try {
      const result = await chrome.storage.local.get(key);
      this.currentPresets = result[key] || {};
      return this.currentPresets;
    } catch (e) {
      console.error('[PresetsManager] Failed to load presets:', e);
      this.currentPresets = {};
      return {};
    }
  }

  /**
   * Save a new preset
   * @param {string} name - Preset name
   * @param {string} instanceUrl - Org instance URL
   * @param {Set<string>} selectedTypes - Selected metadata type names
   * @param {Map<string, *>} selectedMembers - Selected members map
   * @returns {Promise<Object>}
   */
  async savePreset(name, instanceUrl, selectedTypes, selectedMembers) {
    const trimmedName = (name || '').trim();
    if (!trimmedName) throw new Error('Preset name cannot be empty.');
    if (!selectedTypes || selectedTypes.size === 0) throw new Error('Select metadata types before saving a preset.');
    if (!instanceUrl) throw new Error('No active Salesforce session.');

    const serializedMembers = {};
    for (const [type, selection] of selectedMembers.entries()) {
      if (selection === '*') {
        serializedMembers[type] = '*';
      } else if (selection instanceof Set) {
        serializedMembers[type] = Array.from(selection);
      } else if (Array.isArray(selection)) {
        serializedMembers[type] = selection;
      }
    }

    const newPreset = {
      types: Array.from(selectedTypes),
      members: serializedMembers,
      createdAt: Date.now()
    };

    this.currentPresets[trimmedName] = newPreset;
    const key = `metadataPresets_${instanceUrl}`;
    await chrome.storage.local.set({ [key]: this.currentPresets });

    return newPreset;
  }

  /**
   * Delete a preset
   * @param {string} name - Preset name
   * @param {string} instanceUrl - Org instance URL
   * @returns {Promise<void>}
   */
  async deletePreset(name, instanceUrl) {
    if (!name || !this.currentPresets[name] || !instanceUrl) return;
    delete this.currentPresets[name];
    const key = `metadataPresets_${instanceUrl}`;
    await chrome.storage.local.set({ [key]: this.currentPresets });
  }

  /**
   * Export all presets to a downloadable JSON file
   */
  exportPresetsToJSON() {
    const jsonStr = JSON.stringify(this.currentPresets, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sf-metadata-presets-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Import presets from a JSON string and save to storage
   * @param {string} jsonString
   * @param {string} instanceUrl
   * @returns {Promise<number>} Count of imported presets
   */
  async importPresetsFromJSON(jsonString, instanceUrl) {
    if (!instanceUrl) throw new Error('No active Salesforce session.');
    const parsed = JSON.parse(jsonString);
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Invalid presets JSON format.');
    }

    let count = 0;
    for (const [name, preset] of Object.entries(parsed)) {
      if (preset && Array.isArray(preset.types)) {
        this.currentPresets[name] = {
          types: preset.types,
          members: preset.members || {},
          createdAt: preset.createdAt || Date.now()
        };
        count++;
      }
    }

    if (count > 0) {
      const key = `metadataPresets_${instanceUrl}`;
      await chrome.storage.local.set({ [key]: this.currentPresets });
    }

    return count;
  }

  /**
   * Populate HTML select element with presets
   * @param {HTMLSelectElement} dropdownEl
   */
  populateDropdown(dropdownEl) {
    if (!dropdownEl) return;
    dropdownEl.innerHTML = '<option value="">-- Apply Preset --</option>';
    const presetNames = Object.keys(this.currentPresets).sort();
    presetNames.forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      dropdownEl.appendChild(option);
    });
  }
}
