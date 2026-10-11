/**
 * Export Controller Module
 * Manages package export workflows, validation, and confirmation modals
 */

export class ExportController {
  constructor(options = {}) {
    this.onExportStart = options.onExportStart || null;
    this.onExportError = options.onExportError || null;
  }

  /**
   * Validate if export can proceed
   * @param {Set<string>} selectedTypes
   * @param {Map<string, *>} selectedMembers
   * @param {Map<string, Set<string>>} selectedDestructiveMembers
   * @returns {{ canExport: boolean, totalRetrieveCount: number, totalDestructiveCount: number }}
   */
  validateSelections(selectedTypes, selectedMembers, selectedDestructiveMembers) {
    let totalRetrieveCount = 0;
    let totalDestructiveCount = 0;

    for (const [type, selection] of selectedMembers.entries()) {
      if (selection === '*') {
        totalRetrieveCount++;
      } else if (selection instanceof Set) {
        totalRetrieveCount += selection.size;
      } else if (Array.isArray(selection)) {
        totalRetrieveCount += selection.length;
      }
    }

    for (const [, set] of selectedDestructiveMembers.entries()) {
      if (set instanceof Set) {
        totalDestructiveCount += set.size;
      }
    }

    const canExport = selectedTypes.size > 0 && (totalRetrieveCount > 0 || totalDestructiveCount > 0);
    return { canExport, totalRetrieveCount, totalDestructiveCount };
  }

  /**
   * Prepare payload for background service worker export
   * @param {Set<string>} selectedTypes
   * @param {Map<string, *>} selectedMembers
   * @param {Map<string, Set<string>>} selectedDestructiveMembers
   * @returns {Array} List of type objects with members
   */
  buildExportPayload(selectedTypes, selectedMembers, selectedDestructiveMembers) {
    const payload = [];

    for (const typeXmlName of selectedTypes) {
      const selection = selectedMembers.get(typeXmlName);
      let members = [];

      if (selection === '*') {
        members = ['*'];
      } else if (selection instanceof Set) {
        members = Array.from(selection);
      } else if (Array.isArray(selection)) {
        members = selection;
      }

      if (members.length > 0) {
        payload.push({
          name: typeXmlName,
          members: members
        });
      }
    }

    return payload;
  }
}
