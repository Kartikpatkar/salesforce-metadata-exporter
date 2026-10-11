/**
 * Salesforce Metadata Exporter - Main App Controller
 */

import { PackageXMLGenerator } from '../lib/package-xml-generator.js';
import { groupMetadataTypes, CATEGORY_DEFINITIONS } from './modules/categories.js';
import { PresetsManager } from './modules/presets-manager.js';
import { highlightXml, updatePreviewTabBadges } from './modules/xml-highlighter.js';
import { ExportController } from './modules/export-controller.js';
import { ExportHistory } from './modules/export-history.js';
import { GitHubConnector } from './modules/github-connector.js';
import { ZipHandler } from '../lib/zip-handler.js';

// Expose modules and services globally on window
window.PackageXMLGenerator = PackageXMLGenerator;
window.groupMetadataTypes = groupMetadataTypes;
window.CATEGORY_DEFINITIONS = CATEGORY_DEFINITIONS;
window.highlightXml = highlightXml;
window.updatePreviewTabBadges = updatePreviewTabBadges;
window.ZipHandler = ZipHandler;

window.presetsManager = new PresetsManager();
window.exportController = new ExportController();
window.exportHistory = new ExportHistory();
window.githubConnector = new GitHubConnector();

// GLOBAL STATE MANAGEMENT ON WINDOW
window.orgInfo = null;
window.selectedMetadataTypes = new Set();
window.isGitHubPushInProgress = false;
window.selectedMembers = new Map();
window.selectedDestructiveMembers = new Map();
window.membersCache = new Map();
const MAX_MEMBERS_CACHE_SIZE = 50;

window.setMembersCache = function(metadataType, members) {
  if (window.membersCache.has(metadataType)) window.membersCache.delete(metadataType);
  else if (window.membersCache.size >= MAX_MEMBERS_CACHE_SIZE) window.membersCache.delete(window.membersCache.keys().next().value);
  window.membersCache.set(metadataType, members);
};

window.exportInProgress = false;
const DEFAULT_EXPORT_TIMEOUT_MINUTES = 30;

window.updateExportButtonState = function() {
  const hasDestructive = window.selectedDestructiveMembers.size > 0;
  const canExport = window.orgInfo !== null && (window.selectedMetadataTypes.size > 0 || hasDestructive);
  if (elements.exportBtn) elements.exportBtn.disabled = !canExport;
  if (elements.pushGithubBtn) elements.pushGithubBtn.disabled = !canExport;
};

window.loadSavedSelections = async function() {
  try {
    const result = await chrome.storage.local.get(['selectedMetadataTypes', 'savedSelectedMembers', 'savedDestructiveMembers']);
    if (result.selectedMetadataTypes) window.selectedMetadataTypes = new Set(result.selectedMetadataTypes);
    
    window.selectedMembers.clear();
    if (result.savedSelectedMembers) {
      for (const [type, val] of Object.entries(result.savedSelectedMembers)) {
        window.selectedMembers.set(type, Array.isArray(val) ? new Set(val) : val);
      }
    } else {
      window.selectedMetadataTypes.forEach(type => window.selectedMembers.set(type, '*'));
    }
    
    window.selectedDestructiveMembers.clear();
    if (result.savedDestructiveMembers) {
      for (const [type, val] of Object.entries(result.savedDestructiveMembers)) {
        if (Array.isArray(val) && val.length > 0) window.selectedDestructiveMembers.set(type, new Set(val));
      }
    }
    
    elements.metadataCheckboxes.forEach(checkbox => {
      if (window.selectedMetadataTypes.has(checkbox.value)) checkbox.checked = true;
    });

    window.selectedMetadataTypes.forEach(type => window.updateMemberCountBadge(type));
    window.selectedDestructiveMembers.forEach((val, type) => window.updateMemberCountBadge(type));
    if (typeof updateAllCategoryBadges === 'function') updateAllCategoryBadges();
    
    window.updateExportButtonState();
    if (typeof updatePackagePreview === 'function') updatePackagePreview();
  } catch (error) {
    console.error('[App] Failed to load selections:', error);
  }
};

window.saveSelections = async function() {
  try {
    const serializedMembers = {};
    for (const [type, val] of window.selectedMembers.entries()) serializedMembers[type] = val instanceof Set ? Array.from(val) : val;
    const serializedDestructive = {};
    for (const [type, val] of window.selectedDestructiveMembers.entries()) if (val instanceof Set) serializedDestructive[type] = Array.from(val);
    
    await chrome.storage.local.set({
      selectedMetadataTypes: Array.from(window.selectedMetadataTypes),
      savedSelectedMembers: serializedMembers,
      savedDestructiveMembers: serializedDestructive
    });
  } catch (error) {
    console.error('[App] Failed to save selections:', error);
  }
};

window.handleMetadataSelection = function(e, typeObj) {
  const checkbox = e.target;
  const metadataType = checkbox.value;

  if (checkbox.checked) {
    window.selectedMetadataTypes.add(metadataType);
    if (!window.selectedMembers.has(metadataType)) window.selectedMembers.set(metadataType, '*');
  } else {
    window.selectedMetadataTypes.delete(metadataType);
    window.selectedMembers.delete(metadataType);
    window.selectedDestructiveMembers.delete(metadataType);
  }

  window.saveSelections();
  window.updateExportButtonState();
  if (typeof updatePackagePreview === 'function') updatePackagePreview();
};

window.updateMemberCountBadge = function(metadataType) {
  const container = document.querySelector(`.metadata-type-container [value="${metadataType}"]`)?.closest('.metadata-type-container');
  if (!container) return;
  const badge = container.querySelector('.member-count-badge');
  if (!badge) return;

  const retrieveVal = window.selectedMembers.get(metadataType);
  const destructiveSet = window.selectedDestructiveMembers.get(metadataType);

  if (retrieveVal === '*') {
    badge.textContent = 'All';
    badge.classList.remove('hidden');
  } else if (retrieveVal instanceof Set && retrieveVal.size > 0) {
    badge.textContent = retrieveVal.size;
    badge.classList.remove('hidden');
  } else if (destructiveSet && destructiveSet.size > 0) {
    badge.textContent = `del:${destructiveSet.size}`;
    badge.classList.remove('hidden');
  } else {
    badge.textContent = '0';
    badge.classList.add('hidden');
  }
};

async function startExport() {
  if (!window.orgInfo) return;

  // STOP/CANCEL IF EXPORT IN PROGRESS
  if (window.exportInProgress) {
    try {
      await chrome.runtime.sendMessage({ type: 'CANCEL_EXPORT' });
    } catch (e) {
      console.warn('[App] Cancel export error:', e);
    }
    window.exportInProgress = false;
    if (typeof hideExportProgress === 'function') hideExportProgress();
    showInfo('Export cancelled by user.');
    return;
  }

  try {
    window.exportInProgress = true;
    showExportProgress('Initiating export...', 10);

    const typesWithMembers = Array.from(window.selectedMetadataTypes).map(type => {
      const members = window.selectedMembers.get(type);
      let memberArray = members === '*' ? ['*'] : (Array.isArray(members) ? members : (members instanceof Set ? Array.from(members) : ['*']));
      return { name: type, members: memberArray };
    });

    const response = await chrome.runtime.sendMessage({ type: 'START_EXPORT', payload: { orgInfo: window.orgInfo, typesWithMembers } });
    if (!response.success) throw new Error(response.error || 'Failed to start export');

    let totalMemberCount = 0;
    typesWithMembers.forEach(t => { totalMemberCount += t.members.length; });
    await window.exportHistory.logExport({
      exportType: 'zip', instanceUrl: window.orgInfo?.instance || window.orgInfo?.url || 'Salesforce',
      typeCount: window.selectedMetadataTypes.size, memberCount: totalMemberCount, destructiveCount: window.selectedDestructiveMembers.size
    });

    await pollExportStatus();
  } catch (err) {
    window.exportInProgress = false;
    hideExportProgress();
    showError('Export failed: ' + err.message);
  }
}

async function pollExportStatus() {
  const startTime = Date.now();
  while (window.exportInProgress) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    if (!window.exportInProgress) return;
    
    const response = await chrome.runtime.sendMessage({ type: 'GET_EXPORT_STATUS' });
    if (!response.success) throw new Error(response.error || 'Failed to poll status');
    
    const { status, progress } = response;
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    showExportProgress(getChecklistMessage(status, elapsedSeconds), progress || 50);
    
    if (status === 'Succeeded') {
      window.exportInProgress = false;
      showExportProgress(getChecklistMessage('Succeeded', elapsedSeconds), 100);
      return;
    }
    if (status === 'Failed') {
      window.exportInProgress = false;
      showExportProgress(getChecklistMessage('Failed', elapsedSeconds), 100);
      throw new Error('Export failed on server');
    }
  }
}

function attachEventListeners() {
  if (elements.loginBtn) elements.loginBtn.addEventListener('click', loginToProduction);
  if (elements.loginSandboxBtn) elements.loginSandboxBtn.addEventListener('click', loginToSandbox);
  if (elements.switchOrgBtn) elements.switchOrgBtn.addEventListener('click', switchOrg);

  if (elements.profileBtn) elements.profileBtn.addEventListener('click', openOrgModal);
  if (elements.modalClose) elements.modalClose.addEventListener('click', closeOrgModal);
  if (elements.modalOverlay) elements.modalOverlay.addEventListener('click', closeOrgModal);

  if (elements.metadataSearch) elements.metadataSearch.addEventListener('input', filterMetadataTypes);
  if (elements.presetSelectAll) elements.presetSelectAll.addEventListener('click', selectAllMetadata);
  if (elements.presetClear) elements.presetClear.addEventListener('click', clearAllSelections);
  if (elements.presetRefresh) elements.presetRefresh.addEventListener('click', () => loadMetadataTypes(true));

  if (elements.tabPackage) elements.tabPackage.addEventListener('click', () => switchPreviewTab('package'));
  if (elements.tabDestructive) elements.tabDestructive.addEventListener('click', () => switchPreviewTab('destructive'));

  if (elements.githubBtn) elements.githubBtn.addEventListener('click', openGitHubModal);
  if (elements.githubLoginBtn) elements.githubLoginBtn.addEventListener('click', handleGitHubDeviceLogin);
  if (elements.githubModalClose) elements.githubModalClose.addEventListener('click', closeGitHubModal);
  if (elements.githubModalOverlay) elements.githubModalOverlay.addEventListener('click', closeGitHubModal);
  if (elements.githubVerifyTokenBtn) elements.githubVerifyTokenBtn.addEventListener('click', verifyAndLoadGitHubDetails);
  if (elements.githubRepoSelect) elements.githubRepoSelect.addEventListener('change', handleRepoSelectChange);
  if (elements.githubBranchSelect) elements.githubBranchSelect.addEventListener('change', handleBranchSelectChange);
  if (elements.githubCreateBranchBtn) elements.githubCreateBranchBtn.addEventListener('click', handleCreateNewBranch);
  if (elements.githubSaveSettingsBtn) elements.githubSaveSettingsBtn.addEventListener('click', saveGitHubSettings);
  if (elements.pushGithubBtn) elements.pushGithubBtn.addEventListener('click', handlePushToGitHub);

  if (elements.historyBtn) elements.historyBtn.addEventListener('click', openExportHistoryModal);
  if (elements.exportHistoryClose) elements.exportHistoryClose.addEventListener('click', closeExportHistoryModal);
  if (elements.exportHistoryOverlay) elements.exportHistoryOverlay.addEventListener('click', closeExportHistoryModal);
  if (elements.clearHistoryBtn) elements.clearHistoryBtn.addEventListener('click', clearExportHistory);

  if (elements.presetDropdown) elements.presetDropdown.addEventListener('change', (e) => applyUserPreset(e.target.value));
  if (elements.savePresetBtn) elements.savePresetBtn.addEventListener('click', () => {
    if (elements.presetNameInputContainer) elements.presetNameInputContainer.classList.toggle('hidden');
  });
  if (elements.presetSaveConfirm) elements.presetSaveConfirm.addEventListener('click', () => {
    if (elements.presetNameInput) saveUserPreset(elements.presetNameInput.value);
  });
  if (elements.presetSaveCancel) elements.presetSaveCancel.addEventListener('click', () => {
    if (elements.presetNameInputContainer) elements.presetNameInputContainer.classList.add('hidden');
  });
  if (elements.deletePresetBtn) elements.deletePresetBtn.addEventListener('click', deleteUserPreset);

  if (elements.exportBtn) elements.exportBtn.addEventListener('click', startExport);
  chrome.runtime.onMessage.addListener(handleBackgroundMessage);
}

function handleBackgroundMessage(message) {
  console.log('[App] Received message from background:', message);
  switch (message.type) {
    case 'AUTH_CHANGED':
      if (message.payload.isAuthenticated) displayOrgInfo(message.payload);
      else displayOrgInfo(null);
      break;
    case 'EXPORT_PROGRESS':
      showExportProgress(message.status || getChecklistMessage('InProgress', 0), message.progress, window.isGitHubPushInProgress);
      break;
    case 'EXPORT_COMPLETE':
      if (!window.isGitHubPushInProgress) showExportProgress('Export complete!', 100, false);
      break;
    case 'EXPORT_ERROR':
      hideExportProgress();
      if (message.error !== 'Export cancelled by user') showError(message.error);
      break;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[App] Salesforce Metadata Exporter loaded.');
  attachEventListeners();
  if (typeof detectSalesforceOrg === 'function') await detectSalesforceOrg();
});
