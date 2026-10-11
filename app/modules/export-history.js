/**
 * Export History Module
 * Stores and manages history of metadata exports in chrome.storage.local
 */

export class ExportHistory {
  constructor(maxEntries = 20) {
    this.maxEntries = maxEntries;
    this.storageKey = 'sf_export_history';
  }

  /**
   * Log a new export entry
   * @param {Object} entry - { instanceUrl, typeCount, memberCount, destructiveCount, timestamp }
   * @returns {Promise<Array>} Updated history list
   */
  async logExport(entry) {
    const history = await this.getHistory();
    const newEntry = {
      id: `exp_${Date.now()}`,
      instanceUrl: entry.instanceUrl || 'Salesforce',
      typeCount: entry.typeCount || 0,
      memberCount: entry.memberCount || 0,
      destructiveCount: entry.destructiveCount || 0,
      timestamp: entry.timestamp || Date.now()
    };

    history.unshift(newEntry);
    if (history.length > this.maxEntries) {
      history.pop();
    }

    await chrome.storage.local.set({ [this.storageKey]: history });
    return history;
  }

  /**
   * Get all logged exports
   * @returns {Promise<Array>}
   */
  async getHistory() {
    try {
      const result = await chrome.storage.local.get(this.storageKey);
      return Array.isArray(result[this.storageKey]) ? result[this.storageKey] : [];
    } catch (e) {
      console.error('[ExportHistory] Failed to load history:', e);
      return [];
    }
  }

  /**
   * Clear all export history
   * @returns {Promise<void>}
   */
  async clearHistory() {
    await chrome.storage.local.remove(this.storageKey);
  }
}
