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
  
  // Auth controls
  loginBtn: document.getElementById('login-btn'),
  loginSandboxBtn: document.getElementById('login-sandbox-btn'),
  switchOrgBtn: document.getElementById('switch-org-btn'),
  profileBtn: document.getElementById('profile-btn'),
  themeToggle: document.getElementById('theme-toggle'),
  
  // Modal elements
  orgModal: document.getElementById('org-modal'),
  modalOverlay: document.getElementById('modal-overlay'),
  modalClose: document.getElementById('modal-close'),
  
  // Metadata selection
  metadataCheckboxes: document.querySelectorAll('#metadata-types input[type="checkbox"]'),
  metadataSearch: document.getElementById('metadata-search'),
  presetSelectAll: document.getElementById('preset-select-all'),
  presetClear: document.getElementById('preset-clear'),
  uploadPackageBtn: document.getElementById('upload-package-btn'),
  packageFileInput: document.getElementById('package-file-input'),
  
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
// Store selected members per metadata type
// Structure: Map<metadataType, Set<memberName> | '*'>
// '*' means all members (wildcard)
let selectedMembers = new Map();
// Cache for fetched members to avoid repeated API calls
let membersCache = new Map();
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
    // Load theme preference
    loadThemePreference();
    
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
// MODAL FUNCTIONS
// ========================================

/**
 * Open org details modal
 */
function openOrgModal() {
  elements.orgModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

/**
 * Close org details modal
 */
function closeOrgModal() {
  elements.orgModal.classList.add('hidden');
  document.body.style.overflow = '';
}

/**
 * Copy package.xml to clipboard
 */
async function copyPackageToClipboard() {
  const packageCode = elements.packagePreview.querySelector('code');
  const packageXML = packageCode.textContent;
  
  // Don't copy if it's the placeholder text
  if (packageXML.includes('<!--') || packageXML.trim().length === 0) {
    showError('No package.xml to copy. Please select metadata types first.');
    return;
  }
  
  try {
    await navigator.clipboard.writeText(packageXML);
    
    // Clear any error messages
    hideError();
    
    // Visual feedback
    const copyBtn = document.getElementById('copy-package-btn');
    const copyText = copyBtn.querySelector('.copy-text');
    const originalText = copyText.textContent;
    
    copyBtn.classList.add('copied');
    copyText.textContent = 'Copied!';
    
    // Reset after 2 seconds
    setTimeout(() => {
      copyBtn.classList.remove('copied');
      copyText.textContent = originalText;
    }, 2000);
    
    console.log('[App] Package.xml copied to clipboard');
  } catch (error) {
    console.error('[App] Failed to copy to clipboard:', error);
    showError('Failed to copy to clipboard');
  }
}

// ========================================
// SALESFORCE AUTHENTICATION
// ========================================

/**
 * Detect and display Salesforce org information via SalesforceConnector
 * 
 * FLOW:
 * 1. Extension icon clicked from a Salesforce tab
 * 2. Service worker stores that tab ID as 'sourceTabId'
 * 3. Service worker opens this extension page in a new tab
 * 4. This function sends CHECK_SF_AUTH to service worker
 * 5. Service worker retrieves sourceTabId and checks that tab's session
 * 6. Update UI with org details from the source tab
 */
async function detectSalesforceOrg() {
  console.log('[App] Checking Salesforce authentication...');
  
  try {
    // Request auth check from background worker
    // The service worker will use the sourceTabId (the tab that was active when icon was clicked)
    // IMPORTANT: Always skipCache when opening popup to ensure fresh check of current tab
    const response = await chrome.runtime.sendMessage({
      type: 'CHECK_SF_AUTH',
      payload: { 
        skipCache: true // Force fresh check to prevent cached session from different org
      }
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
async function displayOrgInfo(org) {
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
    instanceUrl: org.instanceUrl, // Required by SalesforceMembers
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
  
  // Load dynamic metadata types from org
  await loadMetadataTypes();
}

// ========================================
// METADATA TYPES LOADING
// ========================================

/**
 * Load available metadata types from the connected org
 */
async function loadMetadataTypes() {
  console.log('[App] Loading metadata types from org...');
  
  try {
    // Show loading state
    const metadataSection = document.getElementById('metadata-types');
    metadataSection.innerHTML = '<p style="text-align: center; padding: 20px;">Loading metadata types...</p>';
    
    // Request metadata types from background worker
    const response = await chrome.runtime.sendMessage({
      type: 'GET_METADATA_TYPES',
      payload: { orgInfo }
    });
    
    if (response.success && response.metadataTypes) {
      renderMetadataTypes(response.metadataTypes);
      await loadSavedSelections();
    } else {
      throw new Error(response.error || 'Failed to load metadata types');
    }
    
  } catch (error) {
    console.error('[App] Failed to load metadata types:', error);
    showError('Failed to load metadata types: ' + error.message);
    
    // Fallback to empty state
    const metadataSection = document.getElementById('metadata-types');
    metadataSection.innerHTML = '<p style="color: #c23934;">Failed to load metadata types. Please refresh.</p>';
  }
}

/**
 * Render metadata type checkboxes dynamically
 * @param {Array} metadataTypes - Array of metadata type objects from describeMetadata
 */
function renderMetadataTypes(metadataTypes) {
  console.log('[App] Rendering metadata types:', metadataTypes.length);
  console.log('[App] First 10 metadata types:', metadataTypes.slice(0, 10).map(t => t.xmlName));
  
  const metadataSection = document.getElementById('metadata-types');
  metadataSection.innerHTML = ''; // Clear loading state
  
  if (metadataTypes.length === 0) {
    metadataSection.innerHTML = '<p>No metadata types available</p>';
    return;
  }
  
  // Create expandable item for each metadata type
  metadataTypes.forEach(type => {
    const container = document.createElement('div');
    container.className = 'metadata-type-container';
    
    // Main checkbox label with expand arrow
    const mainLabel = document.createElement('label');
    mainLabel.className = 'metadata-type-label';
    
    // Expand/collapse arrow
    const arrow = document.createElement('span');
    arrow.className = 'expand-arrow';
    arrow.textContent = '▶';
    arrow.title = 'Click to view members';
    
    // Checkbox for the type
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = type.xmlName;
    checkbox.className = 'metadata-type-checkbox';
    checkbox.addEventListener('change', (e) => handleMetadataSelection(e, type));
    
    // Type name
    const typeName = document.createElement('span');
    typeName.className = 'metadata-type-name';
    typeName.textContent = type.xmlName;
    
    // Member count badge (will be populated when expanded)
    const badge = document.createElement('span');
    badge.className = 'member-count-badge hidden';
    badge.textContent = '0';
    
    mainLabel.appendChild(arrow);
    mainLabel.appendChild(checkbox);
    mainLabel.appendChild(typeName);
    mainLabel.appendChild(badge);
    
    // Members container (initially hidden)
    const membersContainer = document.createElement('div');
    membersContainer.className = 'members-container hidden';
    membersContainer.id = `members-${type.xmlName}`;
    
    // Arrow click to expand/collapse
    arrow.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      await toggleMembersView(type.xmlName, arrow, membersContainer, badge);
    });
    
    container.appendChild(mainLabel);
    container.appendChild(membersContainer);
    metadataSection.appendChild(container);
  });
  
  // Update checkbox references
  elements.metadataCheckboxes = document.querySelectorAll('.metadata-type-checkbox');
  
  console.log('[App] Rendered metadata type checkboxes:', elements.metadataCheckboxes.length);
  console.log('[App] Sample checkbox values:', Array.from(elements.metadataCheckboxes).slice(0, 10).map(cb => cb.value));
}

/**
 * Toggle members view for a metadata type
 */
async function toggleMembersView(metadataType, arrow, membersContainer, badge) {
  const isExpanded = !membersContainer.classList.contains('hidden');
  
  if (isExpanded) {
    // Collapse
    membersContainer.classList.add('hidden');
    arrow.textContent = '▶';
  } else {
    // Expand
    arrow.textContent = '▼';
    membersContainer.classList.remove('hidden');
    
    // Load members if not already loaded
    if (!membersCache.has(metadataType)) {
      await loadMembers(metadataType, membersContainer, badge);
    }
  }
}

/**
 * Load members for a metadata type
 */
async function loadMembers(metadataType, membersContainer, badge) {
  membersContainer.innerHTML = '<p class="loading-members">Loading members...</p>';
  
  try {
    // Request members from background worker
    const response = await chrome.runtime.sendMessage({
      type: 'GET_METADATA_MEMBERS',
      payload: { orgInfo, metadataType }
    });
    
    if (response.success && response.members) {
      const members = response.members;
      membersCache.set(metadataType, members);
      
      // Update badge
      badge.textContent = members.length;
      badge.classList.remove('hidden');
      
      renderMembers(metadataType, members, membersContainer);
    } else {
      throw new Error(response.error || 'Failed to load members');
    }
  } catch (error) {
    console.error('[App] Failed to load members for', metadataType, error);
    membersContainer.innerHTML = `<p class="error-members">Failed to load members: ${error.message}</p>`;
  }
}

/**
 * Filter members list based on search input
 */
function filterMembers(metadataType, searchTerm) {
  const membersList = document.getElementById(`members-list-${metadataType}`);
  if (!membersList) return;
  
  const term = searchTerm.toLowerCase().trim();
  const labels = membersList.querySelectorAll('.member-label');
  
  labels.forEach(label => {
    const memberName = label.textContent.toLowerCase();
    if (memberName.includes(term)) {
      label.style.display = 'flex';
    } else {
      label.style.display = 'none';
    }
  });
}

/**
 * Render member checkboxes for a metadata type
 */
function renderMembers(metadataType, members, membersContainer) {
  membersContainer.innerHTML = '';
  
  if (members.length === 0) {
    membersContainer.innerHTML = '<p class="no-members">No members found</p>';
    return;
  }
  
  // Add member controls
  const controls = document.createElement('div');
  controls.className = 'member-controls';
  
  const selectAllBtn = document.createElement('button');
  selectAllBtn.className = 'member-btn';
  selectAllBtn.textContent = 'All';
  selectAllBtn.addEventListener('click', () => selectAllMembers(metadataType));
  
  const clearBtn = document.createElement('button');
  clearBtn.className = 'member-btn secondary';
  clearBtn.textContent = 'None';
  clearBtn.addEventListener('click', () => clearMembers(metadataType));
  
  // Member search container with clear button
  const searchContainer = document.createElement('div');
  searchContainer.className = 'member-search-container';
  searchContainer.style.position = 'relative';
  searchContainer.style.flex = '1';
  
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'member-search';
  searchInput.id = `member-search-${metadataType}`;
  searchInput.placeholder = 'Filter members...';
  searchInput.addEventListener('input', (e) => {
    filterMembers(metadataType, e.target.value);
    toggleMemberClearButton(metadataType);
  });
  
  const clearSearchBtn = document.createElement('button');
  clearSearchBtn.className = 'clear-search-btn hidden';
  clearSearchBtn.id = `clear-member-search-${metadataType}`;
  clearSearchBtn.title = 'Clear search';
  clearSearchBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>`;
  clearSearchBtn.addEventListener('click', () => clearMemberSearch(metadataType));
  
  searchContainer.appendChild(searchInput);
  searchContainer.appendChild(clearSearchBtn);
  
  controls.appendChild(selectAllBtn);
  controls.appendChild(clearBtn);
  controls.appendChild(searchContainer);
  
  // Member list
  const membersList = document.createElement('div');
  membersList.className = 'members-list';
  membersList.id = `members-list-${metadataType}`;
  
  members.forEach(member => {
    const label = document.createElement('label');
    label.className = 'member-label';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = member.fullName;
    checkbox.className = 'member-checkbox';
    checkbox.dataset.metadataType = metadataType;
    checkbox.addEventListener('change', (e) => handleMemberSelection(e, metadataType));
    
    // Check if this member is already selected
    const selectedMembersList = selectedMembers.get(metadataType);
    if (selectedMembersList === '*') {
      // All members selected
      checkbox.checked = true;
    } else if (Array.isArray(selectedMembersList) && selectedMembersList.includes(member.fullName)) {
      // From package.xml upload
      checkbox.checked = true;
    } else if (selectedMembersList instanceof Set && selectedMembersList.has(member.fullName)) {
      // From manual selection
      checkbox.checked = true;
    }
    
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(member.fullName));
    membersList.appendChild(label);
  });
  
  membersContainer.appendChild(controls);
  membersContainer.appendChild(membersList);
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
/**
 * Handle metadata type selection
 * @param {Event} event - Change event
 * @param {Object} type - Metadata type object
 */
function handleMetadataSelection(event, type) {
  const checkbox = event.target;
  const metadataType = checkbox.value;
  
  if (checkbox.checked) {
    selectedMetadataTypes.add(metadataType);
    // Default to wildcard when first selected
    selectedMembers.set(metadataType, '*');
  } else {
    selectedMetadataTypes.delete(metadataType);
    selectedMembers.delete(metadataType);
  }
  
  updateExportButtonState();
  updatePackagePreview();
  saveSelections();
}

/**
 * Update the member count badge for a metadata type
 */
function updateMemberCountBadge(metadataType) {
  const container = document.querySelector(`#members-${metadataType}`);
  if (!container) return;
  
  const badge = container.closest('.metadata-type-container')?.querySelector('.member-count-badge');
  if (!badge) return;
  
  const members = selectedMembers.get(metadataType);
  
  if (members === '*') {
    badge.textContent = '*';
    badge.classList.remove('hidden');
  } else if (Array.isArray(members) && members.length > 0) {
    // From package.xml upload
    badge.textContent = members.length;
    badge.classList.remove('hidden');
  } else if (members instanceof Set && members.size > 0) {
    // From manual selection
    badge.textContent = members.size;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

/**
 * Handle member selection within a metadata type
 */
function handleMemberSelection(event, metadataType) {
  const checkbox = event.target;
  const memberName = checkbox.value;
  
  // Auto-select metadata type if not already selected
  if (!selectedMetadataTypes.has(metadataType)) {
    selectedMetadataTypes.add(metadataType);
    // Find and check the metadata type checkbox
    const metadataCheckbox = document.querySelector(`input.metadata-type-checkbox[value="${metadataType}"]`);
    if (metadataCheckbox) {
      metadataCheckbox.checked = true;
    }
  }
  
  let members = selectedMembers.get(metadataType);
  
  // Convert from wildcard to Set if needed
  if (members === '*' || !members) {
    members = new Set();
    selectedMembers.set(metadataType, members);
  }
  
  // Ensure members is a Set
  if (!(members instanceof Set)) {
    members = new Set(members);
    selectedMembers.set(metadataType, members);
  }
  
  if (checkbox.checked) {
    members.add(memberName);
  } else {
    members.delete(memberName);
  }
  
  // If no members selected, deselect metadata type and remove from map
  if (members.size === 0) {
    selectedMetadataTypes.delete(metadataType);
    selectedMembers.delete(metadataType);
    // Uncheck the metadata type checkbox
    const metadataCheckbox = document.querySelector(`input.metadata-type-checkbox[value="${metadataType}"]`);
    if (metadataCheckbox) {
      metadataCheckbox.checked = false;
    }
  }
  
  console.log(`[App] Member selection for ${metadataType}:`, members instanceof Set ? Array.from(members) : members);
  
  updateMemberCountBadge(metadataType);
  updateExportButtonState();
  updatePackagePreview();
  saveSelections();
}

/**
 * Select all members for a metadata type
 */
function selectAllMembers(metadataType) {
  const membersList = document.getElementById(`members-list-${metadataType}`);
  const checkboxes = membersList.querySelectorAll('.member-checkbox');
  
  const members = new Set();
  checkboxes.forEach(cb => {
    // Only select visible members (not filtered out)
    const label = cb.closest('.member-label');
    if (label && label.style.display !== 'none') {
      cb.checked = true;
      members.add(cb.value);
    }
  });
  
  selectedMembers.set(metadataType, members);
  updateMemberCountBadge(metadataType);
  updatePackagePreview();
  saveSelections();
}

/**
 * Clear all members for a metadata type
 */
function clearMembers(metadataType) {
  const membersList = document.getElementById(`members-list-${metadataType}`);
  const checkboxes = membersList.querySelectorAll('.member-checkbox');
  
  checkboxes.forEach(cb => {
    cb.checked = false;
  });
  
  selectedMembers.set(metadataType, '*');
  updateMemberCountBadge(metadataType);
  updatePackagePreview();
  saveSelections();
}

/**
 * Use wildcard for a metadata type
 */
function useWildcard(metadataType) {
  const membersList = document.getElementById(`members-list-${metadataType}`);
  const checkboxes = membersList.querySelectorAll('.member-checkbox');
  
  checkboxes.forEach(cb => {
    cb.checked = false;
  });
  
  selectedMembers.set(metadataType, '*');
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
 * Filter metadata types based on search input
 */
function filterMetadataTypes() {
  const searchTerm = elements.metadataSearch.value.toLowerCase().trim();
  const metadataContainer = document.getElementById('metadata-types');
  const containers = metadataContainer.querySelectorAll('.metadata-type-container');
  
  containers.forEach(container => {
    const typeNameElement = container.querySelector('.metadata-type-name');
    if (typeNameElement) {
      const metadataTypeName = typeNameElement.textContent.toLowerCase();
      if (metadataTypeName.includes(searchTerm)) {
        container.style.display = 'block';
      } else {
        container.style.display = 'none';
      }
    }
  });
}

/**
 * Toggle visibility of clear search button based on input value
 */
function toggleClearButton() {
  const clearBtn = document.getElementById('clear-metadata-search');
  if (clearBtn) {
    if (elements.metadataSearch.value.length > 0) {
      clearBtn.classList.remove('hidden');
    } else {
      clearBtn.classList.add('hidden');
    }
  }
}

/**
 * Clear metadata search input and show all metadata types
 */
function clearMetadataSearch() {
  elements.metadataSearch.value = '';
  elements.metadataSearch.focus();
  filterMetadataTypes();
  toggleClearButton();
}

/**
 * Toggle visibility of member search clear button
 */
function toggleMemberClearButton(metadataType) {
  const searchInput = document.getElementById(`member-search-${metadataType}`);
  const clearBtn = document.getElementById(`clear-member-search-${metadataType}`);
  if (clearBtn && searchInput) {
    if (searchInput.value.length > 0) {
      clearBtn.classList.remove('hidden');
    } else {
      clearBtn.classList.add('hidden');
    }
  }
}

/**
 * Clear member search input and show all members
 */
function clearMemberSearch(metadataType) {
  const searchInput = document.getElementById(`member-search-${metadataType}`);
  if (searchInput) {
    searchInput.value = '';
    searchInput.focus();
    filterMembers(metadataType, '');
    toggleMemberClearButton(metadataType);
  }
}


/**
 * Select all metadata types
 */
function selectAllMetadata() {
  selectedMetadataTypes.clear();
  
  // Query checkboxes directly to ensure we get all current checkboxes
  const checkboxes = document.querySelectorAll('#metadata-types input[type="checkbox"]');
  
  console.log('[App] Select All: Found', checkboxes.length, 'checkboxes');
  
  checkboxes.forEach(checkbox => {
    // Only select visible checkboxes (based on search filter)
    const label = checkbox.closest('label');
    if (label && label.style.display !== 'none') {
      checkbox.checked = true;
      selectedMetadataTypes.add(checkbox.value);
    }
  });
  
  console.log('[App] Selected all metadata types:', selectedMetadataTypes.size);
  console.log('[App] Selected types:', Array.from(selectedMetadataTypes).slice(0, 10));
  
  updateExportButtonState();
  updatePackagePreview();
  saveSelections();
}

/**
 * Clear all metadata selections
 */
function clearAllSelections() {
  selectedMetadataTypes.clear();
  
  // Query checkboxes directly
  const checkboxes = document.querySelectorAll('#metadata-types input[type="checkbox"]');
  
  checkboxes.forEach(checkbox => {
    checkbox.checked = false;
  });
  
  console.log('[App] Cleared all selections');
  
  updateExportButtonState();
  updatePackagePreview();
  saveSelections();
}

// ========================================
// PACKAGE.XML UPLOAD
// ========================================

/**
 * Handle package.xml file upload
 * Parses the uploaded file and auto-selects the metadata types and members
 */
async function handlePackageUpload(event) {
  const file = event.target.files[0];
  
  if (!file) {
    return;
  }
  
  console.log('[App] Uploaded file:', file.name, file.size, 'bytes');
  
  try {
    // Read file content
    const fileContent = await readFileAsText(file);
    
    // Validate package.xml
    if (!PackageXMLParser.isValidPackageXML(fileContent)) {
      showError('Invalid package.xml file. Please upload a valid Salesforce package.xml file.');
      return;
    }
    
    // Parse package.xml
    const parsed = PackageXMLParser.parse(fileContent);
    console.log('[App] Parsed package.xml:', parsed);
    
    // Show summary
    const summary = PackageXMLParser.getSummary(parsed);
    console.log('[App] Package summary:\n' + summary);
    
    // Auto-select metadata types and members
    await applyPackageSelections(parsed);
    
    // Show success message
    showInfo(`✅ Package.xml loaded successfully!\n${parsed.types.length} metadata types selected.`);
    
    // Reset file input so the same file can be uploaded again
    event.target.value = '';
    
  } catch (error) {
    console.error('[App] Failed to parse package.xml:', error);
    showError('Failed to parse package.xml: ' + error.message);
  }
}

/**
 * Read file as text
 * @param {File} file - File object
 * @returns {Promise<string>} File content as text
 */
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Apply selections from parsed package.xml
 * @param {Object} parsed - Parsed package.xml result
 */
async function applyPackageSelections(parsed) {
  console.log('[App] Applying package selections...');
  
  // Clear current selections
  clearAllSelections();
  
  // Get all available metadata types (checkboxes currently in the DOM)
  const availableTypes = new Set();
  const checkboxes = document.querySelectorAll('#metadata-types input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    availableTypes.add(checkbox.value);
  });
  
  console.log('[App] Available metadata types:', availableTypes.size);
  
  let selectedCount = 0;
  let skippedCount = 0;
  const skippedTypes = [];
  
  parsed.types.forEach(({ name, members }) => {
    // Check if this metadata type exists in the current org
    if (!availableTypes.has(name)) {
      console.warn('[App] Metadata type not available in this org:', name);
      skippedTypes.push(name);
      skippedCount++;
      return;
    }
    
    // Select the metadata type
    selectedMetadataTypes.add(name);
    
    // Find and check the checkbox
    const checkbox = document.querySelector(`#metadata-types input[value="${name}"]`);
    if (checkbox) {
      checkbox.checked = true;
      selectedCount++;
    }
    
    // Handle members
    if (members.includes('*')) {
      // Wildcard - select all members
      selectedMembers.set(name, '*');
      console.log(`[App] Selected all members for ${name}`);
    } else {
      // Specific members
      selectedMembers.set(name, members);
      console.log(`[App] Selected ${members.length} specific members for ${name}:`, members.slice(0, 5));
    }
  });
  
  console.log(`[App] Applied selections: ${selectedCount} types, skipped ${skippedCount} types`);
  
  if (skippedTypes.length > 0) {
    console.warn('[App] Skipped types (not available in org):', skippedTypes);
    showInfo(`⚠️ Note: ${skippedCount} metadata types from package.xml are not available in this org.\n\nSkipped: ${skippedTypes.slice(0, 5).join(', ')}${skippedTypes.length > 5 ? '...' : ''}`);
  }
  
  // Update UI
  updateExportButtonState();
  updatePackagePreview();
  saveSelections();
  
  // Expand metadata types with specific members
  parsed.types.forEach(({ name, members }) => {
    if (availableTypes.has(name) && !members.includes('*')) {
      // Find the expand button and trigger expansion to show selected members
      const expandBtn = document.querySelector(`button[data-metadata-type="${name}"]`);
      if (expandBtn && !expandBtn.classList.contains('expanded')) {
        // Auto-expand to show the selected members
        expandBtn.click();
      }
    }
  });
}

// ========================================
// PACKAGE.XML GENERATION
// ========================================

/**
 * Update package.xml preview based on selected metadata types
 */
function updatePackagePreview() {
  console.log('[App] Updating package preview. Selected types:', selectedMetadataTypes.size);
  
  if (selectedMetadataTypes.size === 0 || !orgInfo) {
    elements.packagePreview.querySelector('code').textContent = 
      '<!-- Select metadata types to preview package.xml -->';
    return;
  }
  
  try {
    const generator = new PackageXMLGenerator(orgInfo.apiVersion);
    
    // Build types with members
    const typesWithMembers = Array.from(selectedMetadataTypes).map(type => {
      const members = selectedMembers.get(type);
      
      // Handle different member formats (wildcard, array, or Set)
      let memberArray;
      if (members === '*') {
        memberArray = ['*'];
      } else if (Array.isArray(members)) {
        memberArray = members; // From package.xml upload
      } else if (members instanceof Set) {
        memberArray = Array.from(members); // From manual selection
      } else {
        memberArray = ['*']; // Default fallback
      }
      
      console.log(`[App] Type: ${type}, Members:`, memberArray);
      
      return {
        name: type,
        members: memberArray
      };
    });
    
    console.log('[App] Generating package.xml for types:', typesWithMembers.length);
    console.log('[App] Full typesWithMembers:', JSON.stringify(typesWithMembers, null, 2));
    
    const packageXML = generator.generateWithMembers(typesWithMembers);
    
    elements.packagePreview.querySelector('code').textContent = packageXML;
    console.log('[App] Package.xml generated successfully. Length:', packageXML.length);
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
    
    // Send message to background service worker to initiate export
    console.log('[App] Starting metadata export...', {
      types: Array.from(selectedMetadataTypes),
      orgInfo
    });
    
    // Build types with members (same as preview)
    const typesWithMembers = Array.from(selectedMetadataTypes).map(type => {
      const members = selectedMembers.get(type);
      
      // Handle different member formats (wildcard, array, or Set)
      let memberArray;
      if (members === '*') {
        memberArray = ['*'];
      } else if (Array.isArray(members)) {
        memberArray = members; // From package.xml upload
      } else if (members instanceof Set) {
        memberArray = Array.from(members); // From manual selection
      } else {
        memberArray = ['*']; // Default fallback
      }
      
      return {
        name: type,
        members: memberArray
      };
    });
    
    console.log('[App] Exporting types with members:', JSON.stringify(typesWithMembers, null, 2));
    
    const response = await chrome.runtime.sendMessage({
      type: 'START_EXPORT',
      payload: {
        orgInfo,
        typesWithMembers
      }
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Export failed');
    }
    
    console.log('[App] Export initiated:', response.retrieveId);
    showExportProgress('Export in progress...', 50);
    
    // Poll for export status
    await pollExportStatus();
    
  } catch (error) {
    console.error('[App] Export failed:', error);
    showError(`Export failed: ${error.message}`);
  } finally {
    exportInProgress = false;
    hideExportProgress();
  }
}

/**
 * Poll export status until complete
 */
async function pollExportStatus() {
  const maxAttempts = 360; // 30 minutes (5 seconds * 360) - needed for large enterprise orgs
  let attempts = 0;
  const startTime = Date.now();
  
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    
    const response = await chrome.runtime.sendMessage({
      type: 'GET_EXPORT_STATUS'
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to get export status');
    }
    
    const { status, progress, message } = response;
    
    // Add elapsed time to progress message for long-running exports
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    let progressMessage = message || 'Processing...';
    
    // Show elapsed time after 1 minute for user awareness
    if (elapsedSeconds > 60) {
      const minutes = Math.floor(elapsedSeconds / 60);
      const seconds = elapsedSeconds % 60;
      progressMessage += ` (${minutes}m ${seconds}s elapsed)`;
    }
    
    showExportProgress(progressMessage, progress || 50);
    
    if (status === 'Succeeded') {
      showExportProgress('✅ Export complete! Download started.', 100);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return;
    }
    
    if (status === 'Failed') {
      throw new Error('Export failed on server');
    }
    
    attempts++;
  }
  
  const elapsedMinutes = Math.round((Date.now() - startTime) / 60000);
  throw new Error(`Export timed out after ${elapsedMinutes} minutes. Large orgs may require longer processing time. Please try again or contact support.`);
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
  
  // Profile button and modal
  if (elements.profileBtn) {
    elements.profileBtn.addEventListener('click', openOrgModal);
  }
  if (elements.modalClose) {
    elements.modalClose.addEventListener('click', closeOrgModal);
  }
  if (elements.modalOverlay) {
    elements.modalOverlay.addEventListener('click', closeOrgModal);
  }
  
  // Theme toggle
  if (elements.themeToggle) {
    elements.themeToggle.addEventListener('click', toggleTheme);
  }
  
  // Copy package.xml button
  const copyPackageBtn = document.getElementById('copy-package-btn');
  if (copyPackageBtn) {
    copyPackageBtn.addEventListener('click', copyPackageToClipboard);
  }
  
  // Metadata selection
  elements.metadataCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', handleMetadataSelection);
  });
  
  // Search bar
  if (elements.metadataSearch) {
    elements.metadataSearch.addEventListener('input', filterMetadataTypes);
    elements.metadataSearch.addEventListener('input', toggleClearButton);
  }
  
  // Clear search button
  const clearMetadataSearchBtn = document.getElementById('clear-metadata-search');
  if (clearMetadataSearchBtn) {
    clearMetadataSearchBtn.addEventListener('click', clearMetadataSearch);
  }
  
  // Preset buttons
  if (elements.presetSelectAll) {
    elements.presetSelectAll.addEventListener('click', selectAllMetadata);
  }
  if (elements.presetClear) {
    elements.presetClear.addEventListener('click', clearAllSelections);
  }
  
  // Upload package.xml button
  if (elements.uploadPackageBtn) {
    elements.uploadPackageBtn.addEventListener('click', () => {
      elements.packageFileInput.click();
    });
  }
  if (elements.packageFileInput) {
    elements.packageFileInput.addEventListener('change', handlePackageUpload);
  }
  
  // Package preview toggle
  if (elements.togglePreview) {
    elements.togglePreview.addEventListener('click', togglePreview);
  }
  
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

// ========================================
// THEME MANAGEMENT
// ========================================

/**
 * Load theme preference from localStorage
 */
function loadThemePreference() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
  }
}

/**
 * Toggle between light and dark theme
 */
function toggleTheme() {
  const isDark = document.body.classList.toggle('dark-theme');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  
  console.log('[App] Theme toggled:', isDark ? 'dark' : 'light');
}

// ========================================
// FOOTER INITIALIZATION
// ========================================

/**
 * Set current year in footer copyright
 */
function initializeFooter() {
  const currentYearElement = document.getElementById('currentYear');
  if (currentYearElement) {
    currentYearElement.textContent = new Date().getFullYear();
  }
}

// Initialize footer when DOM is loaded
initializeFooter();
