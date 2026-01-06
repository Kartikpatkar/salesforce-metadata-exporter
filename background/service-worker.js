/**
 * Salesforce Metadata Exporter - Background Service Worker
 * 
 * RESPONSIBILITIES:
 * - Open extension app in new tab when icon is clicked
 * - Manage Salesforce authentication via SalesforceConnector
 * - Coordinate metadata export workflow
 * - Manage communication between app and content scripts
 * - Handle Salesforce Metadata API requests (retrieve, checkStatus)
 * - Process and download ZIP files
 * - Manage long-running async operations (polling)
 * 
 * ARCHITECTURE:
 * - Service worker persists only during active operations
 * - Uses chrome.alarms for polling (not setInterval)
 * - All state stored in chrome.storage (not in-memory variables)
 * 
 * SECURITY:
 * - Never stores credentials
 * - Uses session ID from SalesforceConnector
 * - All API calls go through proper CORS with Salesforce domains
 */

import SalesforceConnector from '../utils/salesforce-connector.js';
import { SalesforceMetadataAPI } from '../lib/salesforce-api.js';
import { PackageXMLGenerator } from '../lib/package-xml-generator.js';
import { ZipHandler } from '../lib/zip-handler.js';

// ========================================
// SALESFORCE CONNECTOR INITIALIZATION
// ========================================

/**
 * Initialize Salesforce Connector
 */
const sfConnector = new SalesforceConnector({
  cacheTTL: 60000, // 60 seconds
  onAuthChange: (org) => {
    console.log('[Service Worker] Auth change:', org.isAuthenticated ? 'Connected' : 'Disconnected');
    // Notify any listening app instances
    chrome.runtime.sendMessage({
      type: 'AUTH_CHANGED',
      payload: org
    }).catch(() => {
      // No listeners, that's okay
    });
  }
});

// ========================================
// SERVICE WORKER LIFECYCLE
// ========================================

/**
 * Service worker installation
 */
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  self.skipWaiting(); // Activate immediately
});

/**
 * Service worker activation
 */
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activated');
  event.waitUntil(clients.claim()); // Take control of all pages
});

// ========================================
// EXTENSION ICON CLICK HANDLER
// ========================================

/**
 * Handle extension icon click - open app in new tab
 */
chrome.action.onClicked.addListener(async (tab) => {
  console.log('[Service Worker] Extension icon clicked');
  
  try {
    // Check if extension page is already open
    const extensionUrl = chrome.runtime.getURL('app/index.html');
    const tabs = await chrome.tabs.query({ url: extensionUrl });
    
    if (tabs.length > 0) {
      // Extension page already open, focus it
      await chrome.tabs.update(tabs[0].id, { active: true });
      await chrome.windows.update(tabs[0].windowId, { focused: true });
      console.log('[Service Worker] Focused existing extension tab');
    } else {
      // Open extension in new tab
      await chrome.tabs.create({ url: extensionUrl });
      console.log('[Service Worker] Opened extension in new tab');
    }
  } catch (error) {
    console.error('[Service Worker] Failed to open extension:', error);
  }
});

// ========================================
// MESSAGE HANDLING
// ========================================

/**
 * Handle messages from app and content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Service Worker] Received message:', message.type, message);
  
  // Route messages to appropriate handlers
  switch (message.type) {
    case 'CHECK_SF_AUTH':
      handleCheckAuth(message.payload, sendResponse);
      return true; // Keep channel open for async response
    
    case 'SF_LOGIN':
      handleLogin(message.payload, sendResponse);
      return true;
    
    case 'SF_SWITCH_ORG':
      handleSwitchOrg(sendResponse);
      return true;
    
    case 'START_EXPORT':
      handleStartExport(message.payload, sendResponse);
      return true; // Keep channel open for async response
    
    case 'GET_EXPORT_STATUS':
      handleGetExportStatus(sendResponse);
      return true;
    
    case 'CANCEL_EXPORT':
      handleCancelExport(sendResponse);
      return true;
    
    default:
      console.warn('[Service Worker] Unknown message type:', message.type);
      sendResponse({ success: false, error: 'Unknown message type' });
      return false;
  }
});

// ========================================
// SALESFORCE AUTHENTICATION HANDLERS
// ========================================

/**
 * Handle CHECK_SF_AUTH message - check current Salesforce authentication
 */
async function handleCheckAuth(payload = {}, sendResponse) {
  try {
    console.log('[Service Worker] Checking Salesforce auth...');
    const org = await sfConnector.checkAuth(payload);
    sendResponse({ success: true, org });
  } catch (error) {
    console.error('[Service Worker] Auth check failed:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle SF_LOGIN message - login to Salesforce
 */
async function handleLogin(payload = {}, sendResponse) {
  try {
    const useSandbox = payload.useSandbox || false;
    console.log('[Service Worker] Logging in to', useSandbox ? 'Sandbox' : 'Production');
    const org = await sfConnector.login(useSandbox);
    sendResponse({ success: true, org });
  } catch (error) {
    console.error('[Service Worker] Login failed:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle SF_SWITCH_ORG message - switch Salesforce org
 */
async function handleSwitchOrg(sendResponse) {
  try {
    console.log('[Service Worker] Switching org...');
    await sfConnector.switchOrg();
    sendResponse({ success: true });
  } catch (error) {
    console.error('[Service Worker] Switch org failed:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// ========================================
// EXPORT WORKFLOW ORCHESTRATION
// ========================================

/**
 * Handle START_EXPORT message from popup
 * 
 * FLOW:
 * 1. Validate payload (orgInfo, metadataTypes)
 * 2. Generate package.xml
 * 3. Call Salesforce Metadata API retrieve()
 * 4. Start polling for retrieve status
 * 5. Download ZIP when ready
 * 
 * @param {Object} payload - { orgInfo, metadataTypes }
 * @param {Function} sendResponse - Response callback
 */
async function handleStartExport(payload, sendResponse) {
  try {
    console.log('[Service Worker] Starting export workflow...', payload);
    
    const { orgInfo, metadataTypes } = payload;
    
    // Validate payload
    if (!orgInfo || !orgInfo.sessionId) {
      throw new Error('No Salesforce session found. Please refresh the page.');
    }
    
    if (!metadataTypes || metadataTypes.length === 0) {
      throw new Error('No metadata types selected');
    }
    
    // TODO: Step 1 - Generate package.xml
    const packageXML = generatePackageXML(metadataTypes, orgInfo.apiVersion);
    
    // TODO: Step 2 - Call Metadata API retrieve()
    const retrieveId = await initiateMetadataRetrieve(orgInfo, packageXML);
    
    // TODO: Step 3 - Store retrieve ID and start polling
    await storeExportState({
      retrieveId,
      orgInfo,
      status: 'InProgress',
      startTime: Date.now()
    });
    
    // Start polling alarm (every 5 seconds)
    chrome.alarms.create('pollRetrieveStatus', { periodInMinutes: 5 / 60 }); // 5 seconds
    
    sendResponse({ success: true, retrieveId });
    
    // Notify popup of progress
    notifyPopup('EXPORT_PROGRESS', { 
      status: 'Metadata retrieve initiated...', 
      progress: 30 
    });
    
  } catch (error) {
    console.error('[Service Worker] Export failed:', error);
    sendResponse({ success: false, error: error.message });
    notifyPopup('EXPORT_ERROR', { error: error.message });
  }
}

/**
 * Generate package.xml from metadata types
 * @param {string[]} metadataTypes - Array of metadata type names
 * @param {string} apiVersion - Salesforce API version
 * @returns {string} package.xml content
 */
function generatePackageXML(metadataTypes, apiVersion) {
  // TODO: Use PackageXMLGenerator module
  console.log('[Service Worker] Generating package.xml...', metadataTypes);
  
  const generator = new PackageXMLGenerator(apiVersion);
  return generator.generate(metadataTypes);
}

/**
 * Initiate Metadata API retrieve request
 * 
 * @param {Object} orgInfo - Org information including sessionId
 * @param {string} packageXML - package.xml content
 * @returns {Promise<string>} Retrieve request ID
 */
async function initiateMetadataRetrieve(orgInfo, packageXML) {
  // TODO: Use SalesforceMetadataAPI module
  console.log('[Service Worker] Calling Metadata API retrieve()...');
  
  const api = new SalesforceMetadataAPI(orgInfo);
  const retrieveId = await api.retrieve(packageXML);
  
  console.log('[Service Worker] Retrieve initiated:', retrieveId);
  return retrieveId;
}

/**
 * Store export state in chrome.storage for polling
 * @param {Object} state - Export state object
 */
async function storeExportState(state) {
  await chrome.storage.local.set({ exportState: state });
  console.log('[Service Worker] Stored export state:', state);
}

/**
 * Get current export state from storage
 * @returns {Promise<Object>} Export state
 */
async function getExportState() {
  const result = await chrome.storage.local.get('exportState');
  return result.exportState || null;
}

/**
 * Clear export state from storage
 */
async function clearExportState() {
  await chrome.storage.local.remove('exportState');
  console.log('[Service Worker] Cleared export state');
}

// ========================================
// POLLING MECHANISM
// ========================================

/**
 * Handle alarm events for polling retrieve status
 */
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'pollRetrieveStatus') {
    await pollRetrieveStatus();
  }
});

/**
 * Poll Salesforce Metadata API for retrieve status
 * 
 * FLOW:
 * 1. Get current export state from storage
 * 2. Call checkRetrieveStatus API
 * 3. If done, download ZIP and clear alarm
 * 4. If still in progress, continue polling
 * 5. Handle errors and timeouts
 */
async function pollRetrieveStatus() {
  try {
    const state = await getExportState();
    
    if (!state || !state.retrieveId) {
      console.warn('[Service Worker] No active export to poll');
      chrome.alarms.clear('pollRetrieveStatus');
      return;
    }
    
    console.log('[Service Worker] Polling retrieve status...', state.retrieveId);
    
    // TODO: Call Salesforce API to check status
    const api = new SalesforceMetadataAPI(state.orgInfo);
    const status = await api.checkRetrieveStatus(state.retrieveId);
    
    console.log('[Service Worker] Retrieve status:', status);
    
    // Update popup with progress
    notifyPopup('EXPORT_PROGRESS', { 
      status: `Retrieve status: ${status.state}`, 
      progress: status.state === 'InProgress' ? 60 : 90 
    });
    
    // Check if retrieve is complete
    if (status.done) {
      chrome.alarms.clear('pollRetrieveStatus');
      
      if (status.success) {
        await handleRetrieveComplete(status.zipFile, state);
      } else {
        throw new Error(status.errorMessage || 'Retrieve failed');
      }
    }
    
    // Check for timeout (max 10 minutes)
    const elapsed = Date.now() - state.startTime;
    if (elapsed > 10 * 60 * 1000) {
      chrome.alarms.clear('pollRetrieveStatus');
      throw new Error('Export timeout - retrieve took longer than 10 minutes');
    }
    
  } catch (error) {
    console.error('[Service Worker] Polling failed:', error);
    chrome.alarms.clear('pollRetrieveStatus');
    await clearExportState();
    notifyPopup('EXPORT_ERROR', { error: error.message });
  }
}

/**
 * Handle successful retrieve completion
 * @param {string} zipFileBase64 - Base64-encoded ZIP file
 * @param {Object} state - Current export state
 */
async function handleRetrieveComplete(zipFileBase64, state) {
  try {
    console.log('[Service Worker] Retrieve complete, processing ZIP...');
    
    // TODO: Use ZipHandler to process and download ZIP
    const zipHandler = new ZipHandler();
    await zipHandler.downloadZip(zipFileBase64, generateFilename(state.orgInfo));
    
    await clearExportState();
    
    notifyPopup('EXPORT_COMPLETE', { 
      message: 'Metadata exported successfully' 
    });
    
  } catch (error) {
    console.error('[Service Worker] Failed to download ZIP:', error);
    await clearExportState();
    notifyPopup('EXPORT_ERROR', { error: error.message });
  }
}

/**
 * Generate filename for downloaded ZIP
 * @param {Object} orgInfo - Org information
 * @returns {string} Filename
 */
function generateFilename(orgInfo) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const orgName = orgInfo.instance || 'salesforce';
  return `${orgName}_metadata_${timestamp}.zip`;
}

// ========================================
// STATUS QUERIES
// ========================================

/**
 * Handle GET_EXPORT_STATUS message
 * @param {Function} sendResponse - Response callback
 */
async function handleGetExportStatus(sendResponse) {
  try {
    const state = await getExportState();
    sendResponse({ success: true, state });
  } catch (error) {
    console.error('[Service Worker] Failed to get export status:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle CANCEL_EXPORT message
 * @param {Function} sendResponse - Response callback
 */
async function handleCancelExport(sendResponse) {
  try {
    chrome.alarms.clear('pollRetrieveStatus');
    await clearExportState();
    
    console.log('[Service Worker] Export cancelled');
    sendResponse({ success: true });
    
    notifyPopup('EXPORT_ERROR', { error: 'Export cancelled by user' });
    
  } catch (error) {
    console.error('[Service Worker] Failed to cancel export:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// ========================================
// COMMUNICATION HELPERS
// ========================================

/**
 * Send message to popup (if open)
 * @param {string} type - Message type
 * @param {Object} payload - Message payload
 */
async function notifyPopup(type, payload) {
  try {
    await chrome.runtime.sendMessage({ type, ...payload });
  } catch (error) {
    // Popup may be closed - this is expected
    console.log('[Service Worker] Could not notify popup (may be closed):', type);
  }
}

// ========================================
// ERROR HANDLING
// ========================================

/**
 * Global error handler for service worker
 */
self.addEventListener('error', (event) => {
  console.error('[Service Worker] Uncaught error:', event.error);
});

/**
 * Handle unhandled promise rejections
 */
self.addEventListener('unhandledrejection', (event) => {
  console.error('[Service Worker] Unhandled promise rejection:', event.reason);
});

console.log('[Service Worker] Loaded and ready');
