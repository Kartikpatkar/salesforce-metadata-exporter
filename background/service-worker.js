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
import { SalesforceMembers } from '../lib/salesforce-members.js';
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
 * IMPORTANT: The 'tab' parameter is the tab that was active when icon was clicked
 */
chrome.action.onClicked.addListener(async (tab) => {
  console.log('[Service Worker] Extension icon clicked from tab:', tab.id, tab.url);
  
  try {
    // Store the source tab ID (the tab that was active when icon was clicked)
    // This is needed because the extension opens in a new tab
    await chrome.storage.local.set({ sourceTabId: tab.id });
    console.log('[Service Worker] Stored source tab ID:', tab.id);
    
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
    
    case 'GET_METADATA_TYPES':
      handleGetMetadataTypes(message.payload, sendResponse);
      return true;
    
    case 'GET_METADATA_MEMBERS':
      handleGetMetadataMembers(message.payload, sendResponse);
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
    
    const options = { ...payload };
    
    // Get the source tab ID (the tab that was active when extension icon was clicked)
    const storage = await chrome.storage.local.get(['sourceTabId']);
    const sourceTabId = storage.sourceTabId;
    
    if (sourceTabId) {
      options.priorityTabId = sourceTabId;
      console.log('[Service Worker] Using source tab from icon click:', sourceTabId);
    } else if (payload.currentTabId) {
      // Fallback to currentTabId if provided
      options.priorityTabId = payload.currentTabId;
      console.log('[Service Worker] Using currentTabId from payload:', payload.currentTabId);
    }
    
    const org = await sfConnector.checkAuth(options);
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

/**
 * Handle GET_METADATA_TYPES message - get available metadata types from org
 */
async function handleGetMetadataTypes(payload, sendResponse) {
  try {
    console.log('[Service Worker] Fetching metadata types...');
    
    const { orgInfo } = payload;
    if (!orgInfo || !orgInfo.sessionId) {
      throw new Error('Not authenticated');
    }
    
    // Create API client instance
    const api = new SalesforceMetadataAPI(orgInfo);
    
    // Fetch metadata types
    const metadataTypes = await api.describeMetadata();
    
    // Sort alphabetically for better UX
    metadataTypes.sort((a, b) => a.xmlName.localeCompare(b.xmlName));
    
    console.log('[Service Worker] Retrieved metadata types:', metadataTypes.length);
    sendResponse({ success: true, metadataTypes });
    
  } catch (error) {
    console.error('[Service Worker] Get metadata types failed:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle GET_METADATA_MEMBERS message - get members for a specific metadata type
 */
async function handleGetMetadataMembers(payload, sendResponse) {
  try {
    console.log('[Service Worker] Fetching members for:', payload.metadataType);
    
    const { orgInfo, metadataType } = payload;
    if (!orgInfo || !orgInfo.sessionId) {
      throw new Error('Not authenticated');
    }
    
    // Create SalesforceMembers instance
    const membersFetcher = new SalesforceMembers({
      apiVersion: orgInfo.apiVersion || '59.0',
      orgInfo: orgInfo
    });
    
    // Fetch members for this metadata type
    const members = await membersFetcher.getMembers(metadataType);
    
    console.log('[Service Worker] Retrieved members:', members.length);
    sendResponse({ success: true, members });
    
  } catch (error) {
    console.error('[Service Worker] Get metadata members failed:', error);
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
    
    const { orgInfo, typesWithMembers } = payload;
    
    // Validate payload
    if (!orgInfo || !orgInfo.sessionId) {
      throw new Error('No Salesforce session found. Please refresh the page.');
    }
    
    if (!typesWithMembers || typesWithMembers.length === 0) {
      throw new Error('No metadata types selected');
    }
    
    // Step 1 - Generate package.xml
    const packageXML = generatePackageXML(typesWithMembers, orgInfo.apiVersion);
    
    // Step 2 - Call Metadata API retrieve()
    const retrieveId = await initiateMetadataRetrieve(orgInfo, packageXML);
    
    // Step 3 - Store retrieve ID and start polling
    await storeExportState({
      retrieveId,
      orgInfo,
      status: 'InProgress',
      startTime: Date.now(),
      downloaded: false  // Track if already downloaded
    });
    
    // Don't use alarm polling - let the UI poll via GET_EXPORT_STATUS
    // This prevents duplicate downloads from race conditions
    // chrome.alarms.create('pollRetrieveStatus', { periodInMinutes: 5 / 60 }); // 5 seconds
    
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
 * @param {Array} typesWithMembers - Array of {name, members} objects
 * @param {string} apiVersion - Salesforce API version
 * @returns {string} package.xml content
 */
function generatePackageXML(typesWithMembers, apiVersion) {
  console.log('[Service Worker] Generating package.xml...', typesWithMembers);
  
  const generator = new PackageXMLGenerator(apiVersion);
  const packageXML = generator.generateWithMembers(typesWithMembers);
  
  console.log('[Service Worker] Generated package.xml:', packageXML);
  
  return packageXML;
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
    
    // If already downloaded, stop polling
    if (state.downloaded) {
      console.log('[Service Worker] Export already downloaded, stopping poll');
      chrome.alarms.clear('pollRetrieveStatus');
      return;
    }
    
    console.log('[Service Worker] Polling retrieve status...', state.retrieveId);
    
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
      // CRITICAL: Clear alarm and mark downloaded FIRST to prevent race condition
      chrome.alarms.clear('pollRetrieveStatus');
      state.downloaded = true;
      await storeExportState(state);
      
      if (status.success) {
        await handleRetrieveComplete(status.zipFile, state);
      } else {
        throw new Error(status.errorMessage || 'Retrieve failed');
      }
    }
    
    // Check for timeout (max 30 minutes for large enterprise orgs)
    const elapsed = Date.now() - state.startTime;
    if (elapsed > 30 * 60 * 1000) {
      chrome.alarms.clear('pollRetrieveStatus');
      throw new Error('Export timeout - retrieve took longer than 30 minutes');
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
    
    // Use ZipHandler to process and download ZIP
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
 * Download ZIP file from base64 data
 * @param {string} zipFileBase64 - Base64-encoded ZIP data
 * @param {Object} state - Export state
 */
async function downloadZipFile(zipFileBase64, state) {
  try {
    console.log('[Service Worker] Processing ZIP for download...');
    
    const zipHandler = new ZipHandler();
    await zipHandler.downloadZip(zipFileBase64, generateFilename(state.orgInfo));
    
    console.log('[Service Worker] ZIP download triggered');
    
  } catch (error) {
    console.error('[Service Worker] Failed to download ZIP:', error);
    throw error;
  }
}

/**
 * Generate filename for downloaded ZIP
 * Format: INSTANCEORG-YYYY-mm-dd_HHMMss.zip
 * Example: na135-2026-01-22_143052.zip
 * @param {Object} orgInfo - Org information
 * @returns {string} Filename
 */
function generateFilename(orgInfo) {
  const now = new Date();
  
  // Format date as YYYY-mm-dd
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const date = `${year}-${month}-${day}`;
  
  // Format time as HHMMss
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const timestamp = `${hours}${minutes}${seconds}`;
  
  // Get instance name (e.g., na135, cs42) or organization ID
  const instance = orgInfo.instance || orgInfo.organizationId || 'salesforce';
  
  return `${instance}-${date}_${timestamp}.zip`;
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
    
    if (!state) {
      sendResponse({ success: true, status: 'NotStarted', progress: 0, message: 'No export in progress' });
      return;
    }
    
    // If already downloaded, don't check again
    if (state.downloaded) {
      sendResponse({ 
        success: true, 
        status: 'Succeeded',
        progress: 100,
        message: '✅ Export complete!',
        done: true
      });
      return;
    }
    
    // Check with Salesforce API
    const api = new SalesforceMetadataAPI(state.orgInfo);
    const retrieveStatus = await api.checkRetrieveStatus(state.retrieveId);
    
    // Update state with latest status
    state.status = retrieveStatus.state;
    state.done = retrieveStatus.done;
    
    // If complete, trigger download
    if (retrieveStatus.done && retrieveStatus.success && retrieveStatus.zipFile) {
      // Mark downloaded FIRST to prevent any race condition
      state.downloaded = true;
      await storeExportState(state);
      
      console.log('[Service Worker] Triggering download from GET_EXPORT_STATUS');
      await downloadZipFile(retrieveStatus.zipFile, state);
      await clearExportState();
    } else {
      await storeExportState(state);
    }
    
    const progress = retrieveStatus.done ? 100 : 60;
    const message = retrieveStatus.done 
      ? (retrieveStatus.success ? '✅ Export complete!' : '❌ Export failed')
      : 'Processing metadata...';
    
    sendResponse({ 
      success: true, 
      status: retrieveStatus.state,
      progress,
      message,
      done: retrieveStatus.done
    });
    
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
