/**
 * Salesforce Metadata Exporter - Main App Controller
 * 
 * RESPONSIBILITIES:
 * - Display detected Salesforce org information
 * - Handle metadata type selection via checkboxes and presets
 * - Generate and preview package.xml
 * - Coordinate with background service worker for metadata export
 * - Update UI with export progress and handle errors
 * 
 * IMPORTANT: This module runs in the extension page context and communicates
 * with the background service worker via Chrome messaging API.
 * Authentication is handled by SalesforceConnector in the background worker.
 */

import { PackageXMLGenerator } from '../lib/package-xml-generator.js';

// ========================================
// DOM ELEMENT REFERENCES
// ========================================

const elements = {
  // Org info elements
  orgStatus: document.getElementById('org-status'),
  orgDetails: document.getElementById('org-details'),
  orgUrl: document.getElementById('org-url'),
  orgInstance: document.getElementById('org-instance'),
  orgId: document.getElementById('org-id'),
  apiVersion: document.getElementById('api-version'),
  
  // Auth controls (to be added to HTML)
  loginBtn: document.getElementById('login-btn'),
  loginSandboxBtn: document.getElementById('login-sandbox-btn'),
  switchOrgBtn: document.getElementById('switch-org-btn'),
  
  // Metadata selection
  metadataCheckboxes: document.querySelectorAll('#metadata-types input[type="checkbox"]'),
  presetApex: document.getElementById('preset-apex'),
  presetObjectModel: document.getElementById('preset-object-model'),
  presetDeclarative: document.getElementById('preset-declarative'),
  presetSecurity: document.getElementById('preset-security'),
  presetClear: document.getElementById('preset-clear'),
  
  // Package preview
  togglePreview: document.getElementById('toggle-preview'),
  packagePreview: document.getElementById('package-preview'),
  
  // Export controls
  exportBtn: document.getElementById('export-btn'),
  exportStatus: document.getElementById('export-status'),
  statusMessage: document.getElementById('status-message'),
  exportProgress: document.getElementById('export-progress'),
  errorMessage: document.getElementById('error-message')
};

// ========================================
// STATE MANAGEMENT
// ========================================

let orgInfo = null;
let selectedMetadataTypes = new Set();
let exportInProgress = false;

// ========================================
// INITIALIZATION
// ========================================

/**
 * Initialize app when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', async () => {
  await initializeApp();
  attachEventListeners();
});

/**
 * Initialize app state and check Salesforce authentication
 */
async function initializeApp() {
  try {
    // Check Salesforce authentication via background worker
    await detectSalesforceOrg();
    
    // Load previously selected metadata types from chrome.storage
    await loadSavedSelections();
    
  } catch (error) {
    console.error('[App] Failed to initialize:', error);
    showError('Failed to initialize extension.');
  }
}

// ========================================
// SALESFORCE AUTHENTICATION
// ========================================

/**
 * Detect and display Salesforce org information via SalesforceConnector
 * 
 * FLOW:
 * 1. Send CHECK_SF_AUTH message to background worker
 * 2. Background worker uses SalesforceConnector to check auth
 * 3. Update UI with org details
 */
async function detectSalesforceOrg() {
  console.log('[App] Checking Salesforce authentication...');
  
  try {
    // Request auth check from background worker
    const response = await chrome.runtime.sendMessage({
      type: 'CHECK_SF_AUTH',
      payload: { skipCache: false }
    });
    
    if (response.success && response.org.isAuthenticated) {
      displayOrgInfo(response.org);
    } else {
      displayOrgInfo(null);
      showInfo('Not connected to Salesforce. Click "Login to Production" or "Login to Sandbox".');
    }
    
  } catch (error) {
    console.error('[App] Failed to check auth:', error);
    displayOrgInfo(null);
    showError('Failed to check Salesforce authentication.');
  }
}

/**
 * Handle login to Salesforce production
 */
async function loginToProduction() {
  try {
    showInfo('Opening Salesforce login...');
    const response = await chrome.runtime.sendMessage({
      type: 'SF_LOGIN',
      payload: { useSandbox: false }
    });
    
    if (response.success && response.org.isAuthenticated) {
      displayOrgInfo(response.org);
      hideError();
    } else {
      showError('Login failed. Please try again.');
    }
  } catch (error) {
    console.error('[App] Login failed:', error);
    showError('Login failed: ' + error.message);
  }
}

/**
 * Handle login to Salesforce sandbox
 */
async function loginToSandbox() {
  try {
    showInfo('Opening Salesforce sandbox login...');
    const response = await chrome.runtime.sendMessage({
      type: 'SF_LOGIN',
      payload: { useSandbox: true }
    });
    
    if (response.success && response.org.isAuthenticated) {
      displayOrgInfo(response.org);
      hideError();
    } else {
      showError('Sandbox login failed. Please try again.');
    }
  } catch (error) {
    console.error('[App] Sandbox login failed:', error);
    showError('Sandbox login failed: ' + error.message);
  }
}

/**
 * Handle switching to a different Salesforce org
 */
async function switchOrg() {
  try {
    const confirmed = confirm('This will clear your current session. Continue?');
    if (!confirmed) return;
    
    await chrome.runtime.sendMessage({ type: 'SF_SWITCH_ORG' });
    displayOrgInfo(null);
    showInfo('Session cleared. Please log in again.');
  } catch (error) {
    console.error('[App] Switch org failed:', error);
    showError('Failed to switch org: ' + error.message);
  }
}

/**
 * Extract instance name from Salesforce URL
 * @param {string} url - Salesforce URL
 * @returns {string} Instance name
 */
function extractInstanceFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    
    // Pattern: na123.salesforce.com or my.salesforce.com
    const match = hostname.match(/^([a-z]{2}\d+|[^.]+)\./i);
    return match ? match[1].toUpperCase() : 'Unknown';
  } catch {
    return 'Unknown';
  }
}

/**
 * Display org information in the UI
 * @param {Object} org - Org object from SalesforceConnector
 */
function displayOrgInfo(org) {
  if (!org || !org.isAuthenticated) {
    elements.orgStatus.textContent = '⚠️ Not connected to Salesforce';
    elements.orgDetails.classList.add('hidden');
    elements.exportBtn.disabled = true;
    
    // Show login buttons if they exist
    if (elements.loginBtn) elements.loginBtn.style.display = 'inline-block';
    if (elements.loginSandboxBtn) elements.loginSandboxBtn.style.display = 'inline-block';
    if (elements.switchOrgBtn) elements.switchOrgBtn.style.display = 'none';
    
    return;
  }
  
  orgInfo = {
    url: org.instanceUrl,
    instance: extractInstanceFromUrl(org.instanceUrl),
    orgId: 'Connected', // Org ID not available from connector
    apiVersion: '59.0',
    sessionId: org.sessionId,
    isSandbox: org.isSandbox
  };
  
  elements.orgStatus.textContent = `✅ Connected to Salesforce ${org.isSandbox ? '(Sandbox)' : '(Production)'}`;
  elements.orgUrl.textContent = org.instanceUrl;
  elements.orgInstance.textContent = orgInfo.instance;
  elements.orgId.textContent = org.isSandbox ? 'Sandbox Org' : 'Production Org';
  elements.apiVersion.textContent = orgInfo.apiVersion;
  
  elements.orgDetails.classList.remove('hidden');
  
  // Hide login buttons, show switch org button
  if (elements.loginBtn) elements.loginBtn.style.display = 'none';
  if (elements.loginSandboxBtn) elements.loginSandboxBtn.style.display = 'none';
  if (elements.switchOrgBtn) elements.switchOrgBtn.style.display = 'inline-block';
  
  updateExportButtonState();
}

// ========================================
// METADATA SELECTION
// ========================================

/**
 * Load previously saved metadata selections from storage
 */
async function loadSavedSelections() {
  try {
    const result = await chrome.storage.local.get('selectedMetadataTypes');
    
    if (result.selectedMetadataTypes) {
      selectedMetadataTypes = new Set(result.selectedMetadataTypes);
      
      // Update checkboxes
      elements.metadataCheckboxes.forEach(checkbox => {
        if (selectedMetadataTypes.has(checkbox.value)) {
          checkbox.checked = true;
        }
      });
      
      updateExportButtonState();
      console.log('[App] Loaded saved selections:', selectedMetadataTypes);
    }
  } catch (error) {
    console.error('[App] Failed to load selections:', error);
  }
}

/**
 * Save current metadata selections to storage
 */
async function saveSelections() {
  try {
    await chrome.storage.local.set({
      selectedMetadataTypes: Array.from(selectedMetadataTypes)
    });
    console.log('[App] Saved selections');
  } catch (error) {
    console.error('[App] Failed to save selections:', error);
  }
}

/**
 * Handle metadata checkbox changes
 */
function handleMetadataSelection(event) {
  const checkbox = event.target;
  const metadataType = checkbox.value;
  
  if (checkbox.checked) {
    selectedMetadataTypes.add(metadataType);
  } else {
    selectedMetadataTypes.delete(metadataType);
  }
  
  updateExportButtonState();
  updatePackagePreview();
  saveSelections();
}

/**
 * Apply preset metadata selections
 * @param {string} presetName - Name of the preset (apex, object-model, declarative, security)
 */
function applyPreset(presetName) {
  // Clear all checkboxes first
  clearAllSelections();
  
  // Define preset configurations
  const presets = {
    apex: ['ApexClass', 'ApexTrigger'],
    'object-model': ['CustomObject', 'CustomField', 'RecordType'],
    declarative: ['ValidationRule', 'Layout', 'Flow', 'CustomMetadata'],
    security: ['PermissionSet']
  };
  
  const typesToSelect = presets[presetName] || [];
  
  // Check matching checkboxes
  elements.metadataCheckboxes.forEach(checkbox => {
    if (typesToSelect.includes(checkbox.value)) {
      checkbox.checked = true;
      selectedMetadataTypes.add(checkbox.value);
    }
  });
  
  updateExportButtonState();
  updatePackagePreview();
  saveSelections();
}

/**
 * Clear all metadata selections
 */
function clearAllSelections() {
  selectedMetadataTypes.clear();
  elements.metadataCheckboxes.forEach(checkbox => {
    checkbox.checked = false;
  });
  
  updateExportButtonState();
  updatePackagePreview();
  saveSelections();
}

// ========================================
// PACKAGE.XML GENERATION
// ========================================

/**
 * Update package.xml preview based on selected metadata types
 */
function updatePackagePreview() {
  if (selectedMetadataTypes.size === 0 || !orgInfo) {
    elements.packagePreview.querySelector('code').textContent = 
      '<!-- Select metadata types to preview package.xml -->';
    return;
  }
  
  try {
    const generator = new PackageXMLGenerator(orgInfo.apiVersion);
    const packageXML = generator.generate(Array.from(selectedMetadataTypes));
    
    elements.packagePreview.querySelector('code').textContent = packageXML;
  } catch (error) {
    console.error('[App] Failed to generate package.xml:', error);
    elements.packagePreview.querySelector('code').textContent = 
      `<!-- Error generating package.xml: ${error.message} -->`;
  }
}

/**
 * Toggle package.xml preview visibility
 */
function togglePreview() {
  const isHidden = elements.packagePreview.classList.contains('hidden');
  
  if (isHidden) {
    elements.packagePreview.classList.remove('hidden');
    elements.togglePreview.textContent = 'Hide Preview';
    updatePackagePreview();
  } else {
    elements.packagePreview.classList.add('hidden');
    elements.togglePreview.textContent = 'Show Preview';
  }
}

// ========================================
// EXPORT WORKFLOW
// ========================================

/**
 * Initiate metadata export process
 * 
 * FLOW:
 * 1. Validate selections and org info
 * 2. Generate package.xml
 * 3. Send retrieve request to Salesforce Metadata API via background worker
 * 4. Poll for retrieve status
 * 5. Download ZIP when ready
 */
async function startExport() {
  if (exportInProgress || selectedMetadataTypes.size === 0 || !orgInfo) {
    return;
  }
  
  try {
    exportInProgress = true;
    showExportProgress('Preparing metadata export...');
    
    // TODO: Send message to background service worker to initiate export
    // The background worker will:
    // 1. Create package.xml
    // 2. Call Salesforce Metadata API retrieve()
    // 3. Poll retrieveRequest status
    // 4. Trigger download of ZIP file
    
    console.log('[App] Starting metadata export...', {
      types: Array.from(selectedMetadataTypes),
      orgInfo
    });
    
    // STUB: Simulate export process
    // REMOVE IN PRODUCTION
    await simulateExportProcess();
    
  } catch (error) {
    console.error('[App] Export failed:', error);
    showError(`Export failed: ${error.message}`);
  } finally {
    exportInProgress = false;
    hideExportProgress();
  }
}

/**
 * Show export progress UI
 * @param {string} message - Status message to display
 * @param {number} progress - Progress value (0-100)
 */
function showExportProgress(message, progress = 0) {
  elements.exportStatus.classList.remove('hidden');
  elements.statusMessage.textContent = message;
  elements.exportProgress.value = progress;
  elements.exportBtn.disabled = true;
  elements.errorMessage.classList.add('hidden');
}

/**
 * Hide export progress UI
 */
function hideExportProgress() {
  elements.exportStatus.classList.add('hidden');
  updateExportButtonState();
}

/**
 * Display error message
 * @param {string} message - Error message to display
 */
function showError(message) {
  elements.errorMessage.textContent = message;
  elements.errorMessage.classList.remove('hidden');
}

/**
 * Hide error message
 */
function hideError() {
  elements.errorMessage.classList.add('hidden');
}

/**
 * Show informational message (same as error but less alarming)
 */
function showInfo(message) {
  elements.errorMessage.textContent = message;
  elements.errorMessage.classList.remove('hidden');
}

/**
 * Update export button enabled/disabled state
 */
function updateExportButtonState() {
  const canExport = 
    orgInfo !== null && 
    selectedMetadataTypes.size > 0 && 
    !exportInProgress;
  
  elements.exportBtn.disabled = !canExport;
}

// ========================================
// EVENT LISTENERS
// ========================================

/**
 * Attach all event listeners
 */
function attachEventListeners() {
  // Auth buttons
  if (elements.loginBtn) {
    elements.loginBtn.addEventListener('click', loginToProduction);
  }
  if (elements.loginSandboxBtn) {
    elements.loginSandboxBtn.addEventListener('click', loginToSandbox);
  }
  if (elements.switchOrgBtn) {
    elements.switchOrgBtn.addEventListener('click', switchOrg);
  }
  
  // Metadata selection
  elements.metadataCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', handleMetadataSelection);
  });
  
  // Preset buttons
  elements.presetApex.addEventListener('click', () => applyPreset('apex'));
  elements.presetObjectModel.addEventListener('click', () => applyPreset('object-model'));
  elements.presetDeclarative.addEventListener('click', () => applyPreset('declarative'));
  elements.presetSecurity.addEventListener('click', () => applyPreset('security'));
  elements.presetClear.addEventListener('click', clearAllSelections);
  
  // Package preview toggle
  elements.togglePreview.addEventListener('click', togglePreview);
  
  // Export button
  elements.exportBtn.addEventListener('click', startExport);
  
  // Listen for messages from background worker (export progress updates, auth changes)
  chrome.runtime.onMessage.addListener(handleBackgroundMessage);
}

/**
 * Handle messages from background service worker
 * @param {Object} message - Message object
 */
function handleBackgroundMessage(message) {
  console.log('[App] Received message from background:', message);
  
  switch (message.type) {
    case 'AUTH_CHANGED':
      // Auth state changed, update UI
      if (message.payload.isAuthenticated) {
        displayOrgInfo(message.payload);
      } else {
        displayOrgInfo(null);
      }
      break;
    
    case 'EXPORT_PROGRESS':
      showExportProgress(message.status, message.progress);
      break;
    
    case 'EXPORT_COMPLETE':
      showExportProgress('✅ Export complete! Downloading...', 100);
      setTimeout(hideExportProgress, 2000);
      break;
    
    case 'EXPORT_ERROR':
      showError(message.error);
      hideExportProgress();
      break;
    
    default:
      console.warn('[App] Unknown message type:', message.type);
  }
}

// ========================================
// DEVELOPMENT HELPERS (REMOVE IN PRODUCTION)
// ========================================

/**
 * STUB: Simulate export process for testing
 */
async function simulateExportProcess() {
  const steps = [
    { message: 'Generating package.xml...', progress: 20 },
    { message: 'Calling Metadata API retrieve()...', progress: 40 },
    { message: 'Polling retrieve status...', progress: 60 },
    { message: 'Processing metadata...', progress: 80 },
    { message: 'Preparing download...', progress: 95 }
  ];
  
  for (const step of steps) {
    showExportProgress(step.message, step.progress);
    await new Promise(resolve => setTimeout(resolve, 800));
  }
  
  showExportProgress('✅ Export complete!', 100);
  await new Promise(resolve => setTimeout(resolve, 1500));
}
