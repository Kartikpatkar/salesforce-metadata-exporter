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
  exportTimeoutMinutesInput: document.getElementById('export-timeout-minutes'),
  
  // Metadata selection
  metadataCheckboxes: document.querySelectorAll('#metadata-types input[type="checkbox"]'),
  metadataSearch: document.getElementById('metadata-search'),
  presetSelectAll: document.getElementById('preset-select-all'),
  presetClear: document.getElementById('preset-clear'),
  presetRefresh: document.getElementById('preset-refresh'),
  
  // Presets elements
  presetToggleManager: document.getElementById('preset-toggle-manager'),
  presetManagerContainer: document.getElementById('preset-manager-container'),
  presetDropdown: document.getElementById('preset-dropdown'),
  deletePresetBtn: document.getElementById('delete-preset-btn'),
  savePresetBtn: document.getElementById('save-preset-btn'),
  presetNameInputContainer: document.getElementById('preset-name-input-container'),
  presetNameInput: document.getElementById('preset-name-input'),
  presetSaveConfirm: document.getElementById('preset-save-confirm'),
  presetSaveCancel: document.getElementById('preset-save-cancel'),

  // Search mode elements
  searchModeTypes: document.getElementById('search-mode-types'),
  searchModeMembers: document.getElementById('search-mode-members'),
  cliCompatibleOnly: document.getElementById('cli-compatible-only'),
  preloadMembersBtn: document.getElementById('preload-members-btn'),

  // Profile downsizing elements
  profileDownsizeEnable: document.getElementById('profile-downsize-enable'),
  profileDownsizeOptions: document.getElementById('profile-downsize-options'),
  
  uploadPackageBtn: document.getElementById('upload-package-btn'),
  packageFileInput: document.getElementById('package-file-input'),
  pastePackageBtn: document.getElementById('paste-package-btn'),
  
  // Package preview
  packagePreview: document.getElementById('package-preview'),
  tabPackage: document.getElementById('tab-package'),
  tabDestructive: document.getElementById('tab-destructive'),
  destructiveInfoBanner: document.getElementById('destructive-info-banner'),
  
  // Export controls
  exportBtn: document.getElementById('export-btn'),
  destructiveExportWarning: document.getElementById('destructive-export-warning'),
  destructiveExportWarningText: document.getElementById('destructive-export-warning-text'),
  
  // Destructive confirmation modal
  destructiveConfirmModal: document.getElementById('destructive-confirm-modal'),
  destructiveConfirmOverlay: document.getElementById('destructive-confirm-overlay'),
  destructiveConfirmCount: document.getElementById('destructive-confirm-count'),
  destructiveConfirmList: document.getElementById('destructive-confirm-list'),
  destructiveConfirmCancel: document.getElementById('destructive-confirm-cancel'),
  destructiveConfirmProceed: document.getElementById('destructive-confirm-proceed')
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
// Store destructive selections per metadata type
// Structure: Map<metadataType, Set<memberName>>
let selectedDestructiveMembers = new Map();
// Active preview tab: 'package' or 'destructive'
let activePreviewTab = 'package';
// Cache for fetched members to avoid repeated API calls
let membersCache = new Map();
let exportInProgress = false;

// Export polling settings
const DEFAULT_EXPORT_TIMEOUT_MINUTES = 30;
let exportTimeoutMinutes = DEFAULT_EXPORT_TIMEOUT_MINUTES;

// Known CLI-safe metadata types
const CLI_SAFE_TYPES = new Set([
  "AcctMgrTargetSettings",
  "ActionLauncherItemDef",
  "ActionLinkGroupTemplate",
  "ActionPlanTemplate",
  "ActivationPlatform",
  "AdvAccountForecastSet",
  "AdvAcctForecastDimSource",
  "AdvAcctForecastPeriodGroup",
  "AIApplication",
  "AIApplicationConfig",
  "AnalyticSnapshot",
  "AnimationRule",
  "ApexClass",
  "ApexComponent",
  "ApexEmailNotifications",
  "ApexPage",
  "ApexTestSuite",
  "ApexTrigger",
  "ApplicationSubtypeDefinition",
  "AppMenu",
  "ApprovalProcess",
  "AssignmentRules",
  "Audience",
  "AuraDefinitionBundle",
  "AuthProvider",
  "AutoResponseRules",
  "BatchCalcJobDefinition",
  "BatchProcessJobDefinition",
  "BlacklistedConsumer",
  "BrandingSet",
  "BriefcaseDefinition",
  "BusinessProcessTypeDefinition",
  "CallCenter",
  "CallCenterRoutingMap",
  "CallCoachingMediaProvider",
  "CampaignInfluenceModel",
  "CanvasMetadata",
  "CaseSubjectParticle",
  "Certificate",
  "ChannelLayout",
  "ChatterExtension",
  "CleanDataService",
  "CMSConnectSource",
  "Community",
  "CommunityTemplateDefinition",
  "CommunityThemeDefinition",
  "ConnectedApp",
  "ContentAsset",
  "ConversationChannelDefinition",
  "ConversationMessageDefinition",
  "ConversationVendorInfo",
  "CorsWhitelistOrigin",
  "CspTrustedSite",
  "CustomApplication",
  "CustomApplicationComponent",
  "CustomFeedFilter",
  "CustomHelpMenuSection",
  "CustomIndex",
  "CustomLabels",
  "CustomMetadata",
  "CustomNotificationType",
  "CustomObject",
  "CustomObjectTranslation",
  "CustomPageWebLink",
  "CustomPermission",
  "CustomSite",
  "CustomTab",
  "Dashboard",
  "DataCalcInsightTemplate",
  "DataCategoryGroup",
  "DataConnectorIngestApi",
  "DataConnectorS3",
  "DataKitObjectTemplate",
  "DataPackageKitDefinition",
  "DataPackageKitObject",
  "DataSource",
  "DataSourceBundleDefinition",
  "DataSourceObject",
  "DataSourceTenant",
  "DataSrcDataModelFieldMap",
  "DataStreamDefinition",
  "DataStreamTemplate",
  "DataWeaveResource",
  "DecisionMatrixDefinition",
  "DecisionMatrixDefinitionVersion",
  "DecisionTable",
  "DecisionTableDatasetLink",
  "DelegateGroup",
  "DigitalExperienceBundle",
  "DigitalExperienceConfig",
  "Document",
  "DocumentCategory",
  "DocumentCategoryDocumentType",
  "DocumentGenerationSetting",
  "DocumentType",
  "DuplicateRule",
  "EclairGeoData",
  "EmailServicesFunction",
  "EmailTemplate",
  "EmbeddedServiceBranding",
  "EmbeddedServiceConfig",
  "EmbeddedServiceFlowConfig",
  "EmbeddedServiceMenuSettings",
  "EntitlementProcess",
  "EntitlementTemplate",
  "EscalationRules",
  "ESignatureConfig",
  "ESignatureEnvelopeConfig",
  "EventRelayConfig",
  "ExperienceBundle",
  "ExperiencePropertyTypeBundle",
  "ExplainabilityActionDefinition",
  "ExplainabilityActionVersion",
  "ExplainabilityMsgTemplate",
  "ExpressionSetDefinition",
  "ExpressionSetDefinitionVersion",
  "ExpressionSetMessageToken",
  "ExpressionSetObjectAlias",
  "ExternalAIModel",
  "ExternalClientApplication",
  "ExternalCredential",
  "ExternalDataConnector",
  "ExternalDataSource",
  "ExternalServiceRegistration",
  "ExtlClntAppConfigurablePolicies",
  "ExtlClntAppGlobalOauthSettings",
  "ExtlClntAppOauthConfigurablePolicies",
  "ExtlClntAppOauthSettings",
  "FieldRestrictionRule",
  "FieldSrcTrgtRelationship",
  "FlexiPage",
  "Flow",
  "FlowDefinition",
  "FlowTest",
  "ForecastingFilter",
  "ForecastingFilterCondition",
  "ForecastingSourceDefinition",
  "ForecastingType",
  "ForecastingTypeSource",
  "GatewayProviderPaymentMethodType",
  "GlobalValueSet",
  "GlobalValueSetTranslation",
  "Group",
  "HomePageComponent",
  "HomePageLayout",
  "Icon",
  "IframeWhiteListUrlSettings",
  "InboundNetworkConnection",
  "InstalledPackage",
  "IntegrationProviderDef",
  "InternalDataConnector",
  "IPAddressRange",
  "KeywordList",
  "Layout",
  "LeadConvertSettings",
  "Letterhead",
  "LightningComponentBundle",
  "LightningExperienceTheme",
  "LightningMessageChannel",
  "LightningOnboardingConfig",
  "LiveChatSensitiveDataRule",
  "ManagedContentType",
  "ManagedTopics",
  "MarketSegmentDefinition",
  "MatchingRules",
  "MessagingChannel",
  "MilestoneType",
  "MktCalcInsightObjectDef",
  "MktDataConnection",
  "MktDataConnectionSrcParam",
  "MktDatalakeSrcKeyQualifier",
  "MktDataTranObject",
  "MLDataDefinition",
  "MLPredictionDefinition",
  "MLRecommendationDefinition",
  "MobileApplicationDetail",
  "MobileSecurityAssignment",
  "MobileSecurityPolicy",
  "MobSecurityCertPinConfig",
  "ModerationRule",
  "MutingPermissionSet",
  "MyDomainDiscoverableLogin",
  "NamedCredential",
  "NavigationMenu",
  "Network",
  "NetworkBranding",
  "NotificationTypeConfig",
  "OauthCustomScope",
  "ObjectHierarchyRelationship",
  "ObjectSourceTargetMap",
  "OmniDataTransform",
  "OmniIntegrationProcedure",
  "OmniInteractionAccessConfig",
  "OmniInteractionConfig",
  "OmniScript",
  "OmniSupervisorConfig",
  "OmniUiCard",
  "OutboundNetworkConnection",
  "PathAssistant",
  "PaymentGatewayProvider",
  "PermissionSet",
  "PermissionSetGroup",
  "PersonAccountOwnerPowerUser",
  "PipelineInspMetricConfig",
  "PlatformCachePartition",
  "PlatformEventChannel",
  "PlatformEventChannelMember",
  "PlatformEventSubscriberConfig",
  "PortalDelegablePermissionSet",
  "PostTemplate",
  "PresenceDeclineReason",
  "PresenceUserConfig",
  "ProcessFlowMigration",
  "ProductSpecificationRecType",
  "ProductSpecificationType",
  "Profile",
  "ProfilePasswordPolicy",
  "ProfileSessionSetting",
  "Prompt",
  "Queue",
  "QueueRoutingConfig",
  "QuickAction",
  "RecAlrtDataSrcExpSetDef",
  "RecommendationStrategy",
  "RecordActionDeployment",
  "RecordAlertCategory",
  "RecordAlertDataSource",
  "RecordAlertTemplate",
  "RedirectWhitelistUrl",
  "RelationshipGraphDefinition",
  "RemoteSiteSetting",
  "Report",
  "ReportType",
  "RestrictionRule",
  "Role",
  "SalesAgreementSettings",
  "SamlSsoConfig",
  "SchedulingObjective",
  "SchedulingRule",
  "Scontrol",
  "SearchCustomization",
  "ServiceAISetupDefinition",
  "ServiceAISetupField",
  "ServiceChannel",
  "ServicePresenceStatus",
  "Settings",
  "SharingRules",
  "SharingSet",
  "SiteDotCom",
  "Skill",
  "SkillType",
  "StandardValueSet",
  "StandardValueSetTranslation",
  "StaticResource",
  "StreamingAppDataConnector",
  "SynonymDictionary",
  "TimelineObjectDefinition",
  "TimeSheetTemplate",
  "TopicsForObjects",
  "UserAccessPolicy",
  "UserCriteria",
  "UserProvisioningConfig",
  "Workflow"
]);

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

    // Load user settings
    await loadExportTimeoutSetting();
    await loadProfileDownsizeSettings();
    
    // Check Salesforce authentication via background worker
    await detectSalesforceOrg();
    
    // Load previously selected metadata types from chrome.storage
    await loadSavedSelections();
    
  } catch (error) {
    console.error('[App] Failed to initialize:', error);
    showError('Failed to initialize extension.');
  }
}

/**
 * Load export timeout setting from storage and update UI input.
 */
async function loadExportTimeoutSetting() {
  try {
    const result = await chrome.storage.local.get('exportTimeoutMinutes');
    const parsed = Number.parseInt(result.exportTimeoutMinutes, 10);
    exportTimeoutMinutes = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_EXPORT_TIMEOUT_MINUTES;

    if (elements.exportTimeoutMinutesInput) {
      elements.exportTimeoutMinutesInput.value = String(exportTimeoutMinutes);
    }
  } catch (error) {
    console.error('[App] Failed to load export timeout setting:', error);
    exportTimeoutMinutes = DEFAULT_EXPORT_TIMEOUT_MINUTES;
  }
}

/**
 * Save export timeout setting to storage.
 */
async function saveExportTimeoutSetting(minutes) {
  exportTimeoutMinutes = minutes;
  try {
    await chrome.storage.local.set({ exportTimeoutMinutes: minutes });
    console.log('[App] Saved export timeout setting:', minutes);
  } catch (error) {
    console.error('[App] Failed to save export timeout setting:', error);
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
    showSuccess('Package.xml copied to clipboard!');
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
    showSuccess('Session cleared. Please log in again.');
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
  
  // Load saved presets for this org
  await loadPresets();
}

// ========================================
// METADATA TYPES LOADING
// ========================================

/**
 * Load available metadata types from the connected org
 * @param {boolean} forceRefresh - If true, bypass local storage cache
 */
async function loadMetadataTypes(forceRefresh = false) {
  console.log(`[App] Loading metadata types from org (forceRefresh: ${forceRefresh})...`);
  
  try {
    // Show loading state
    const metadataSection = document.getElementById('metadata-types');
    metadataSection.innerHTML = '<p style="text-align: center; padding: 20px;">Loading metadata types...</p>';
    
    // Request metadata types from background worker
    const response = await chrome.runtime.sendMessage({
      type: 'GET_METADATA_TYPES',
      payload: { orgInfo, forceRefresh }
    });
    
    if (response.success && response.metadataTypes) {
      renderMetadataTypes(response.metadataTypes);
      await loadSavedSelections();
      if (forceRefresh) {
        showSuccess('Metadata types refreshed successfully!');
      }
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
  const rows = membersList.querySelectorAll('.member-row');
  
  // Fallback to labels if rows don't exist yet
  const targets = rows.length > 0 ? rows : membersList.querySelectorAll('.member-label');
  
  targets.forEach(el => {
    const memberName = el.textContent.toLowerCase();
    if (memberName.includes(term)) {
      el.style.display = 'flex';
    } else {
      el.style.display = 'none';
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
    const row = document.createElement('div');
    row.className = 'member-row';
    
    const label = document.createElement('label');
    label.className = 'member-label';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = member.fullName;
    checkbox.className = 'member-checkbox';
    checkbox.dataset.metadataType = metadataType;
    checkbox.addEventListener('change', (e) => handleMemberSelection(e, metadataType));
    
    // Check if this member is already selected for retrieval
    const selectedMembersList = selectedMembers.get(metadataType);
    let isRetrieveSelected = false;
    if (selectedMembersList === '*') {
      isRetrieveSelected = true;
    } else if (Array.isArray(selectedMembersList) && selectedMembersList.includes(member.fullName)) {
      isRetrieveSelected = true;
    } else if (selectedMembersList instanceof Set && selectedMembersList.has(member.fullName)) {
      isRetrieveSelected = true;
    }
    
    checkbox.checked = isRetrieveSelected;
    if (isRetrieveSelected) {
      row.classList.add('retrieve-selected');
    }
    
    // Check if this member is selected for deletion
    const destructiveSet = selectedDestructiveMembers.get(metadataType);
    const isDestructiveSelected = destructiveSet && destructiveSet.has(member.fullName);
    if (isDestructiveSelected) {
      row.classList.add('destructive-selected');
    }
    
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(member.fullName));
    
    // Create the trash button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'member-delete-btn';
    deleteBtn.title = 'Mark for deletion (destructiveChanges.xml)';
    deleteBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        <line x1="10" y1="11" x2="10" y2="17"></line>
        <line x1="14" y1="11" x2="14" y2="17"></line>
      </svg>
    `;
    deleteBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleMemberDestructiveClick(metadataType, member.fullName, row, checkbox);
    });
    
    row.appendChild(label);
    row.appendChild(deleteBtn);
    membersList.appendChild(row);
  });
  
  membersContainer.appendChild(controls);
  membersContainer.appendChild(membersList);
}

/**
 * Handle marking a member for deletion
 */
function handleMemberDestructiveClick(metadataType, memberName, row, checkbox) {
  // Auto-select metadata type if not already selected
  if (!selectedMetadataTypes.has(metadataType)) {
    selectedMetadataTypes.add(metadataType);
    const metadataCheckbox = document.querySelector(`input.metadata-type-checkbox[value="${metadataType}"]`);
    if (metadataCheckbox) {
      metadataCheckbox.checked = true;
    }
  }

  let destructiveSet = selectedDestructiveMembers.get(metadataType);
  if (!destructiveSet) {
    destructiveSet = new Set();
    selectedDestructiveMembers.set(metadataType, destructiveSet);
  }

  if (destructiveSet.has(memberName)) {
    // Already destructive, so unselect it completely
    destructiveSet.delete(memberName);
    row.classList.remove('destructive-selected');
    if (destructiveSet.size === 0) {
      selectedDestructiveMembers.delete(metadataType);
    }
  } else {
    // Select for destruction
    destructiveSet.add(memberName);
    row.classList.add('destructive-selected');
    
    // Remove from retrieval
    row.classList.remove('retrieve-selected');
    checkbox.checked = false;
    
    let retrieveSet = selectedMembers.get(metadataType);
    if (retrieveSet === '*') {
      const cached = membersCache.get(metadataType) || [];
      const newSet = new Set(cached.map(m => m.fullName));
      newSet.delete(memberName);
      selectedMembers.set(metadataType, newSet);
    } else if (retrieveSet instanceof Set) {
      retrieveSet.delete(memberName);
      if (retrieveSet.size === 0) {
        selectedMembers.delete(metadataType);
      }
    } else if (Array.isArray(retrieveSet)) {
      const index = retrieveSet.indexOf(memberName);
      if (index > -1) {
        retrieveSet.splice(index, 1);
      }
      if (retrieveSet.length === 0) {
        selectedMembers.delete(metadataType);
      }
    }
  }

  // If no members at all (neither retrieve nor destructive) are selected, deselect metadata type
  const retrieveSet = selectedMembers.get(metadataType);
  const updatedDestructiveSet = selectedDestructiveMembers.get(metadataType);
  
  const hasRetrieve = retrieveSet === '*' || 
                      (retrieveSet instanceof Set && retrieveSet.size > 0) || 
                      (Array.isArray(retrieveSet) && retrieveSet.length > 0);
  const hasDestructive = updatedDestructiveSet instanceof Set && updatedDestructiveSet.size > 0;
  
  if (!hasRetrieve && !hasDestructive) {
    selectedMetadataTypes.delete(metadataType);
    const metadataCheckbox = document.querySelector(`input.metadata-type-checkbox[value="${metadataType}"]`);
    if (metadataCheckbox) {
      metadataCheckbox.checked = false;
    }
  }

  updateMemberCountBadge(metadataType);
  updateExportButtonState();
  updateDestructiveWarningUI();
  updatePackagePreview();
  saveSelections();
}

// ========================================
// METADATA SELECTION
// ========================================

/**
 * Load previously saved metadata selections from storage
 */
async function loadSavedSelections() {
  try {
    const result = await chrome.storage.local.get(['selectedMetadataTypes', 'savedSelectedMembers', 'savedDestructiveMembers']);
    
    if (result.selectedMetadataTypes) {
      selectedMetadataTypes = new Set(result.selectedMetadataTypes);
    }
    
    selectedMembers.clear();
    if (result.savedSelectedMembers) {
      for (const [type, val] of Object.entries(result.savedSelectedMembers)) {
        selectedMembers.set(type, Array.isArray(val) ? new Set(val) : val);
      }
    } else {
      selectedMetadataTypes.forEach(type => {
        selectedMembers.set(type, '*');
      });
    }
    
    selectedDestructiveMembers.clear();
    if (result.savedDestructiveMembers) {
      for (const [type, val] of Object.entries(result.savedDestructiveMembers)) {
        if (Array.isArray(val) && val.length > 0) {
          selectedDestructiveMembers.set(type, new Set(val));
        }
      }
    }
    
    elements.metadataCheckboxes.forEach(checkbox => {
      if (selectedMetadataTypes.has(checkbox.value)) {
        checkbox.checked = true;
      }
    });

    selectedMetadataTypes.forEach(type => updateMemberCountBadge(type));
    selectedDestructiveMembers.forEach((val, type) => updateMemberCountBadge(type));
    
    updateExportButtonState();
    updateDestructiveWarningUI();
    updatePackagePreview();
    console.log('[App] Loaded saved retrieval & destructive selections.');
  } catch (error) {
    console.error('[App] Failed to load selections:', error);
  }
}

/**
 * Save current metadata selections to storage
 */
async function saveSelections() {
  try {
    const serializedMembers = {};
    for (const [type, val] of selectedMembers.entries()) {
      serializedMembers[type] = val instanceof Set ? Array.from(val) : val;
    }
    
    const serializedDestructive = {};
    for (const [type, val] of selectedDestructiveMembers.entries()) {
      if (val instanceof Set) {
        serializedDestructive[type] = Array.from(val);
      }
    }
    
    await chrome.storage.local.set({
      selectedMetadataTypes: Array.from(selectedMetadataTypes),
      savedSelectedMembers: serializedMembers,
      savedDestructiveMembers: serializedDestructive
    });
    console.log('[App] Saved selections (including destructive)');
  } catch (error) {
    console.error('[App] Failed to save selections:', error);
  }
}

// ========================================
// PRESETS MANAGER LOGIC
// ========================================

let currentPresets = {};

/**
 * Load saved presets for the current org
 */
async function loadPresets() {
  if (!orgInfo || !orgInfo.instanceUrl) return;
  const key = `metadataPresets_${orgInfo.instanceUrl}`;
  try {
    const result = await chrome.storage.local.get(key);
    currentPresets = result[key] || {};
    populatePresetDropdown();
  } catch (error) {
    console.error('[Presets] Failed to load presets:', error);
  }
}

/**
 * Populate the presets dropdown select options
 */
function populatePresetDropdown() {
  if (!elements.presetDropdown) return;
  
  elements.presetDropdown.innerHTML = '<option value="">-- Apply Preset --</option>';
  
  Object.keys(currentPresets).sort().forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    elements.presetDropdown.appendChild(option);
  });
  
  if (elements.deletePresetBtn) {
    elements.deletePresetBtn.style.display = 'none';
  }
}

/**
 * Apply the selected preset checkboxes and member selections
 */
async function applyUserPreset(name) {
  if (!name || !currentPresets[name]) {
    if (elements.deletePresetBtn) elements.deletePresetBtn.style.display = 'none';
    return;
  }
  
  if (elements.deletePresetBtn) elements.deletePresetBtn.style.display = 'inline-block';
  const preset = currentPresets[name];
  
  // Reset current selection
  selectedMetadataTypes.clear();
  selectedMembers.clear();
  
  // Clear checkboxes in UI
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
  
  // Apply preset selections
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
      
      updateMemberCountBadge(type);
      updateRenderedMemberCheckboxes(type);
    }
  });
  
  // Re-run search/filtering if active
  filterMetadataTypes();
  
  updateExportButtonState();
  updatePackagePreview();
  saveSelections();
  
  showSuccess(`Preset "${name}" applied!`);
}

/**
 * Update member checkboxes in the DOM if a list is already expanded
 */
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

/**
 * Save current selections under a preset name
 */
async function saveUserPreset(name) {
  name = name.trim();
  if (!name) {
    showError('Preset name cannot be empty.');
    return;
  }
  
  if (selectedMetadataTypes.size === 0) {
    showError('Select metadata types before saving a preset.');
    return;
  }
  
  if (!orgInfo || !orgInfo.instanceUrl) {
    showError('No active Salesforce session.');
    return;
  }
  
  // Serialize Set values to standard arrays for JSON storage compatibility
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
    types: Array.from(selectedMetadataTypes),
    members: serializedMembers,
    createdAt: Date.now()
  };
  
  const key = `metadataPresets_${orgInfo.instanceUrl}`;
  currentPresets[name] = newPreset;
  
  try {
    await chrome.storage.local.set({ [key]: currentPresets });
    populatePresetDropdown();
    if (elements.presetDropdown) elements.presetDropdown.value = name;
    if (elements.deletePresetBtn) elements.deletePresetBtn.style.display = 'inline-block';
    
    // Hide inline input
    if (elements.presetNameInputContainer) elements.presetNameInputContainer.classList.add('hidden');
    if (elements.presetNameInput) elements.presetNameInput.value = '';
    
    showSuccess(`Preset "${name}" saved!`);
  } catch (error) {
    console.error('[Presets] Failed to save preset:', error);
    showError('Failed to save preset.');
  }
}

/**
 * Delete the currently selected preset
 */
async function deleteUserPreset() {
  if (!elements.presetDropdown) return;
  const name = elements.presetDropdown.value;
  if (!name || !currentPresets[name]) return;
  
  if (!confirm(`Are you sure you want to delete the preset "${name}"?`)) {
    return;
  }
  
  delete currentPresets[name];
  const key = `metadataPresets_${orgInfo.instanceUrl}`;
  
  try {
    await chrome.storage.local.set({ [key]: currentPresets });
    populatePresetDropdown();
    showSuccess(`Preset "${name}" deleted.`);
  } catch (error) {
    console.error('[Presets] Failed to delete preset:', error);
    showError('Failed to delete preset.');
  }
}

// ========================================
// PROFILE DOWNSIZING LOGIC
// ========================================

/**
 * Load profile downsizing settings from chrome.storage.local
 */
async function loadProfileDownsizeSettings() {
  try {
    const result = await chrome.storage.local.get('profileDownsizeSettings');
    const settings = result.profileDownsizeSettings || {
      enabled: false,
      keepClassAccesses: true,
      keepFieldPermissions: true,
      keepObjectPermissions: true,
      keepPageAccesses: true,
      keepLayoutAssignments: true,
      keepRecordTypeVisibilities: true,
      keepTabVisibilities: true,
      keepUserPermissions: true
    };
    
    if (elements.profileDownsizeEnable) {
      elements.profileDownsizeEnable.checked = settings.enabled;
      toggleProfileDownsizeOptions(settings.enabled);
    }
    
    const options = [
      'classAccesses', 'fieldPermissions', 'objectPermissions', 'pageAccesses',
      'layoutAssignments', 'recordTypeVisibilities', 'tabVisibilities', 'userPermissions'
    ];
    
    options.forEach(opt => {
      const el = document.getElementById(`ds-${opt}`);
      if (el) {
        el.checked = settings[`keep${opt.charAt(0).toUpperCase() + opt.slice(1)}`] !== false;
      }
    });
  } catch (error) {
    console.error('[App] Failed to load profile downsize settings:', error);
  }
}

/**
 * Save profile downsizing settings to chrome.storage.local
 */
async function saveProfileDownsizeSettings() {
  try {
    const settings = {
      enabled: elements.profileDownsizeEnable ? elements.profileDownsizeEnable.checked : false,
      keepClassAccesses: document.getElementById('ds-classAccesses')?.checked !== false,
      keepFieldPermissions: document.getElementById('ds-fieldPermissions')?.checked !== false,
      keepObjectPermissions: document.getElementById('ds-objectPermissions')?.checked !== false,
      keepPageAccesses: document.getElementById('ds-pageAccesses')?.checked !== false,
      keepLayoutAssignments: document.getElementById('ds-layoutAssignments')?.checked !== false,
      keepRecordTypeVisibilities: document.getElementById('ds-recordTypeVisibilities')?.checked !== false,
      keepTabVisibilities: document.getElementById('ds-tabVisibilities')?.checked !== false,
      keepUserPermissions: document.getElementById('ds-userPermissions')?.checked !== false
    };
    
    await chrome.storage.local.set({ profileDownsizeSettings: settings });
    console.log('[App] Saved profile downsize settings:', settings);
  } catch (error) {
    console.error('[App] Failed to save profile downsize settings:', error);
  }
}

/**
 * Toggle the visibility of the profile downsizing options grid
 */
function toggleProfileDownsizeOptions(visible) {
  if (!elements.profileDownsizeOptions) return;
  if (visible) {
    elements.profileDownsizeOptions.classList.remove('hidden');
  } else {
    elements.profileDownsizeOptions.classList.add('hidden');
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
  const destructive = selectedDestructiveMembers.get(metadataType);
  
  let textParts = [];
  
  if (members === '*') {
    textParts.push('*');
  } else if (Array.isArray(members) && members.length > 0) {
    textParts.push(`${members.length} (+)`);
  } else if (members instanceof Set && members.size > 0) {
    textParts.push(`${members.size} (+)`);
  }
  
  if (destructive instanceof Set && destructive.size > 0) {
    textParts.push(`${destructive.size} (-)`);
  }
  
  if (textParts.length > 0) {
    badge.textContent = textParts.join(', ');
    badge.classList.remove('hidden');
    
    // Style badge color: red if only destructive, default purple/green otherwise
    if (destructive instanceof Set && destructive.size > 0 && (!members || (members instanceof Set && members.size === 0))) {
      badge.style.background = '#e53e3e';
    } else {
      badge.style.background = '';
    }
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
    // When checking for retrieval, clear any destructive mark on this member
    const destructiveSet = selectedDestructiveMembers.get(metadataType);
    if (destructiveSet && destructiveSet.has(memberName)) {
      destructiveSet.delete(memberName);
      if (destructiveSet.size === 0) {
        selectedDestructiveMembers.delete(metadataType);
      }
    }
  } else {
    members.delete(memberName);
  }
  
  // Sync row CSS classes for this member
  const membersList = document.getElementById(`members-list-${metadataType}`);
  if (membersList) {
    const rows = membersList.querySelectorAll('.member-row');
    rows.forEach(row => {
      const cb = row.querySelector('.member-checkbox');
      if (cb && cb.value === memberName) {
        const destructiveSet = selectedDestructiveMembers.get(metadataType);
        const isDestructive = destructiveSet && destructiveSet.has(memberName);
        row.classList.toggle('retrieve-selected', cb.checked && !isDestructive);
        row.classList.toggle('destructive-selected', isDestructive);
      }
    });
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
    const row = cb.closest('.member-row');
    const label = cb.closest('.member-label');
    const parentVisible = row ? row.style.display !== 'none' : (label && label.style.display !== 'none');
    if (parentVisible) {
      cb.checked = true;
      members.add(cb.value);
      // Clear any destructive mark and set retrieve-selected on the row
      if (row) {
        row.classList.remove('destructive-selected');
        row.classList.add('retrieve-selected');
      }
    }
  });
  
  // Remove destructive selections that now overlap with retrieve selections
  const destructiveSet = selectedDestructiveMembers.get(metadataType);
  if (destructiveSet) {
    members.forEach(name => destructiveSet.delete(name));
    if (destructiveSet.size === 0) {
      selectedDestructiveMembers.delete(metadataType);
    }
  }
  
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
    const row = cb.closest('.member-row');
    if (row) {
      row.classList.remove('retrieve-selected');
      row.classList.remove('destructive-selected');
    }
  });
  
  // Also clear destructive selections for this type
  selectedDestructiveMembers.delete(metadataType);
  selectedMembers.delete(metadataType);
  
  updateMemberCountBadge(metadataType);
  updateDestructiveWarningUI();
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
  const searchMode = elements.searchModeMembers && elements.searchModeMembers.checked ? 'members' : 'types';
  
  const metadataContainer = document.getElementById('metadata-types');
  const containers = metadataContainer.querySelectorAll('.metadata-type-container');
  
  if (elements.preloadMembersBtn) {
    if (searchMode === 'members' && searchTerm.length > 0) {
      elements.preloadMembersBtn.classList.remove('hidden');
    } else {
      elements.preloadMembersBtn.classList.add('hidden');
    }
  }

  containers.forEach(container => {
    const typeNameElement = container.querySelector('.metadata-type-name');
    if (!typeNameElement) return;
    
    const metadataTypeName = typeNameElement.textContent;
    const metadataTypeNameLower = metadataTypeName.toLowerCase();
    
    const membersContainer = container.querySelector('.members-container');
    const arrow = container.querySelector('.expand-arrow');
    
    if (searchMode === 'types' || !searchTerm) {
      let match = metadataTypeNameLower.includes(searchTerm);
      
      // Filter out CLI unsupported types if checkbox is checked
      if (elements.cliCompatibleOnly && elements.cliCompatibleOnly.checked && !CLI_SAFE_TYPES.has(metadataTypeName)) {
        match = false;
      }
      
      container.style.display = match ? 'block' : 'none';
      
      if (!searchTerm && membersContainer && arrow) {
        const membersList = container.querySelector('.members-list');
        if (membersList) {
          const labels = membersList.querySelectorAll('.member-label');
          labels.forEach(lbl => lbl.style.display = 'flex');
          const mSearch = container.querySelector('.member-search');
          if (mSearch) mSearch.value = '';
          const mClear = container.querySelector('.clear-search-btn');
          if (mClear) mClear.classList.add('hidden');
        }
      }
    } else {
      const cachedMembers = membersCache.get(metadataTypeName);
      
      if (cachedMembers) {
        const matchingMembers = cachedMembers.filter(m => m.fullName.toLowerCase().includes(searchTerm));
        
        if (matchingMembers.length > 0) {
          container.style.display = 'block';
          
          if (membersContainer && membersContainer.classList.contains('hidden')) {
            membersContainer.classList.remove('hidden');
            if (arrow) arrow.textContent = '▼';
          }
          
          if (membersContainer && membersContainer.innerHTML === '') {
            renderMembers(metadataTypeName, cachedMembers, membersContainer);
          }
          
          filterMembers(metadataTypeName, searchTerm);
          
          const mSearch = container.querySelector('.member-search');
          if (mSearch) {
            mSearch.value = searchTerm;
            toggleMemberClearButton(metadataTypeName);
          }
        } else {
          container.style.display = 'none';
        }
      } else {
        if (metadataTypeNameLower.includes(searchTerm)) {
          container.style.display = 'block';
        } else {
          container.style.display = 'none';
        }
      }
    }
  });
}

let preloadingMembers = false;

/**
 * Preload all members across all metadata types to enable complete global search
 */
async function preloadAllMembers() {
  if (preloadingMembers) return;
  preloadingMembers = true;
  
  if (elements.preloadMembersBtn) {
    elements.preloadMembersBtn.textContent = 'Loading...';
    elements.preloadMembersBtn.disabled = true;
  }
  
  showInfo('Preloading all metadata components to enable global search. This may take a moment...');
  
  try {
    const metadataContainer = document.getElementById('metadata-types');
    const containers = metadataContainer.querySelectorAll('.metadata-type-container');
    
    const batchSize = 5;
    const typesToLoad = [];
    
    containers.forEach(container => {
      const typeNameElement = container.querySelector('.metadata-type-name');
      if (typeNameElement) {
        const typeName = typeNameElement.textContent;
        if (!membersCache.has(typeName)) {
          typesToLoad.push(typeName);
        }
      }
    });
    
    let completed = 0;
    for (let i = 0; i < typesToLoad.length; i += batchSize) {
      const batch = typesToLoad.slice(i, i + batchSize);
      await Promise.all(batch.map(async (typeName) => {
        try {
          const response = await chrome.runtime.sendMessage({
            type: 'GET_METADATA_MEMBERS',
            payload: { orgInfo, metadataType: typeName }
          });
          if (response.success && response.members) {
            membersCache.set(typeName, response.members);
            
            const container = Array.from(containers).find(c => c.querySelector('.metadata-type-name')?.textContent === typeName);
            const badge = container?.querySelector('.member-count-badge');
            if (badge) {
              badge.textContent = response.members.length;
              badge.classList.remove('hidden');
            }
          }
        } catch (err) {
          console.error(`Failed to preload ${typeName}:`, err);
        }
      }));
      completed += batch.length;
      if (elements.preloadMembersBtn) {
        elements.preloadMembersBtn.textContent = `Loading (${Math.round((completed / typesToLoad.length) * 100)}%)`;
      }
    }
    
    filterMetadataTypes();
    showSuccess('All metadata components preloaded successfully!');
    
  } catch (error) {
    console.error('Error preloading members:', error);
    showError('Failed to preload all members.');
  } finally {
    preloadingMembers = false;
    if (elements.preloadMembersBtn) {
      elements.preloadMembersBtn.textContent = 'Preload All';
      elements.preloadMembersBtn.disabled = false;
      elements.preloadMembersBtn.classList.add('hidden');
    }
  }
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
    const container = checkbox.closest('.metadata-type-container');
    if (container && container.style.display !== 'none') {
      checkbox.checked = true;
      selectedMetadataTypes.add(checkbox.value);
      
      if (!selectedMembers.has(checkbox.value)) {
        selectedMembers.set(checkbox.value, '*');
        updateMemberCountBadge(checkbox.value);
      }
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
  // Clear retrieve state
  selectedMetadataTypes.clear();
  selectedMembers.clear();
  
  // Clear destructive state
  selectedDestructiveMembers.clear();
  chrome.storage.local.remove('destructiveChangesXmlContent');
  
  // Uncheck all metadata type checkboxes and reset all member row classes
  const checkboxes = document.querySelectorAll('#metadata-types input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    checkbox.checked = false;
  });
  
  // Reset member row visual states
  const memberRows = document.querySelectorAll('.member-row');
  memberRows.forEach(row => {
    row.classList.remove('retrieve-selected', 'destructive-selected');
    const cb = row.querySelector('.member-checkbox');
    if (cb) cb.checked = false;
  });
  
  console.log('[App] Cleared all selections (retrieve + destructive)');
  
  updateExportButtonState();
  updateDestructiveWarningUI();
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
    showSuccess(`Package.xml loaded successfully! ${parsed.types.length} metadata types selected.`);
    
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
 * Handle paste package.xml from clipboard
 * Reads XML content from clipboard and auto-selects metadata types and members
 */
async function handlePastePackage() {
  try {
    // Check if clipboard API is available
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      showError('Clipboard access is not supported in this browser.');
      return;
    }
    
    console.log('[App] Reading package.xml from clipboard...');
    
    // Read text from clipboard
    const clipboardText = await navigator.clipboard.readText();
    
    if (!clipboardText || clipboardText.trim() === '') {
      showError('Clipboard is empty. Please copy package.xml content first.');
      return;
    }
    
    // Validate package.xml
    if (!PackageXMLParser.isValidPackageXML(clipboardText)) {
      showError('Invalid package.xml content. Please copy valid Salesforce package.xml content.');
      return;
    }
    
    // Parse package.xml
    const parsed = PackageXMLParser.parse(clipboardText);
    console.log('[App] Parsed package.xml from clipboard:', parsed);
    
    // Show summary
    const summary = PackageXMLParser.getSummary(parsed);
    console.log('[App] Package summary:\n' + summary);
    
    // Auto-select metadata types and members
    await applyPackageSelections(parsed);
    
    // Show success message
    showSuccess(`Package.xml pasted successfully! ${parsed.types.length} metadata types selected.`);
    
  } catch (error) {
    console.error('[App] Failed to paste package.xml:', error);
    
    // Check for permission denied error
    if (error.name === 'NotAllowedError') {
      showError('Clipboard access denied. Please grant permission to access clipboard.');
    } else {
      showError('Failed to paste package.xml: ' + error.message);
    }
  }
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
 * Update the destructive export warning badge above the Export button.
 * Call this whenever selectedDestructiveMembers changes.
 */
function updateDestructiveWarningUI() {
  if (!elements.destructiveExportWarning || !elements.destructiveExportWarningText) return;
  
  let totalCount = 0;
  selectedDestructiveMembers.forEach(set => {
    if (set instanceof Set) totalCount += set.size;
  });
  
  if (totalCount > 0) {
    elements.destructiveExportWarning.classList.remove('hidden');
    elements.destructiveExportWarningText.innerHTML =
      `Includes <strong>${totalCount}</strong> member(s) marked for deletion — deploy the ZIP to apply`;
  } else {
    elements.destructiveExportWarning.classList.add('hidden');
  }
}

/**
 * Switch between package.xml and destructiveChanges.xml preview tabs
 * @param {'package'|'destructive'} tab
 */
function switchPreviewTab(tab) {
  activePreviewTab = tab;
  
  // Update tab active styles
  if (elements.tabPackage) {
    elements.tabPackage.classList.toggle('active', tab === 'package');
  }
  if (elements.tabDestructive) {
    elements.tabDestructive.classList.toggle('active', tab === 'destructive');
  }
  
  // Show/hide the info banner explaining this is export-only
  if (elements.destructiveInfoBanner) {
    if (tab === 'destructive') {
      elements.destructiveInfoBanner.classList.remove('hidden');
    } else {
      elements.destructiveInfoBanner.classList.add('hidden');
    }
  }
  
  updatePackagePreview();
}

/**
 * Simple, fast XML syntax highlighter
 * @param {string} xml - Raw XML string
 * @returns {string} HTML string with syntax highlighting classes
 */
function highlightXml(xml) {
  if (!xml) return '';
  let escaped = xml
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // Highlight comments
  escaped = escaped.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="xml-comment">$1</span>');

  // Highlight XML tags & attributes
  escaped = escaped.replace(/(&lt;\/?)([\w:-]+)([\s\S]*?)(\/?&gt;)/g, (match, open, tagName, attrs, close) => {
    const formattedAttrs = attrs.replace(/([\w:-]+)=(&quot;.*?&quot;)/g, '<span class="xml-attr-name">$1</span>=<span class="xml-attr-value">$2</span>');
    return `<span class="xml-tag">${open}<span class="xml-tag-name">${tagName}</span>${formattedAttrs}${close}</span>`;
  });

  return escaped;
}

/**
 * Update preview tab count badges
 */
function updatePreviewTabBadges() {
  const packageTypesCount = selectedMetadataTypes.size;
  let destructiveCount = 0;
  selectedDestructiveMembers.forEach(set => {
    if (set instanceof Set) destructiveCount += set.size;
  });

  if (elements.tabPackage) {
    elements.tabPackage.innerHTML = `📄 package.xml <span class="tab-count-badge">${packageTypesCount}</span>`;
  }
  if (elements.tabDestructive) {
    elements.tabDestructive.innerHTML = `🗑️ destructiveChanges.xml <span class="tab-count-badge">${destructiveCount}</span>`;
  }
}

/**
 * Update package.xml / destructiveChanges.xml preview based on the active tab and selections
 */
function updatePackagePreview() {
  console.log('[App] Updating package preview. Tab:', activePreviewTab, 'Selected types:', selectedMetadataTypes.size);
  
  updatePreviewTabBadges();
  const previewCode = elements.packagePreview.querySelector('code');
  
  if (activePreviewTab === 'destructive') {
    // --- Destructive changes tab ---
    if (selectedDestructiveMembers.size === 0 || !orgInfo) {
      previewCode.innerHTML = highlightXml('<!-- No members marked for deletion -->');
      chrome.storage.local.remove('destructiveChangesXmlContent');
      return;
    }
    
    try {
      const generator = new PackageXMLGenerator(orgInfo.apiVersion);
      
      const destructiveTypes = [];
      selectedDestructiveMembers.forEach((memberSet, type) => {
        if (memberSet instanceof Set && memberSet.size > 0) {
          destructiveTypes.push({
            name: type,
            members: Array.from(memberSet)
          });
        }
      });
      
      if (destructiveTypes.length === 0) {
        previewCode.innerHTML = highlightXml('<!-- No members marked for deletion -->');
        chrome.storage.local.remove('destructiveChangesXmlContent');
        return;
      }
      
      const destructiveXML = generator.generateWithMembers(destructiveTypes);
      previewCode.innerHTML = highlightXml(destructiveXML);
      
      // Persist for ZIP injection by the service worker
      chrome.storage.local.set({ destructiveChangesXmlContent: destructiveXML });
      console.log('[App] destructiveChanges.xml generated and saved to storage.');
    } catch (error) {
      console.error('[App] Failed to generate destructiveChanges.xml:', error);
      previewCode.innerHTML = highlightXml(`<!-- Error generating destructiveChanges.xml: ${error.message} -->`);
    }
    return;
  }
  
  // --- Package.xml tab (default) ---
  if (selectedMetadataTypes.size === 0 || !orgInfo) {
    previewCode.innerHTML = highlightXml('<!-- Select metadata types to preview package.xml -->');
    return;
  }
  
  // Collect only types that have retrieve selections
  const retrieveTypes = Array.from(selectedMetadataTypes).filter(type => {
    const members = selectedMembers.get(type);
    return members === '*' ||
           (members instanceof Set && members.size > 0) ||
           (Array.isArray(members) && members.length > 0);
  });
  
  if (retrieveTypes.length === 0) {
    previewCode.innerHTML = highlightXml('<!-- No members selected for retrieval. Use the destructiveChanges.xml tab to see deletion manifest. -->');
    return;
  }
  
  try {
    const generator = new PackageXMLGenerator(orgInfo.apiVersion);
    
    // Build types with members
    const typesWithMembers = retrieveTypes.map(type => {
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
    
    console.log('[App] Generating package.xml for types:', typesWithMembers.length);
    
    const packageXML = generator.generateWithMembers(typesWithMembers);
    previewCode.innerHTML = highlightXml(packageXML);
    console.log('[App] Package.xml generated successfully. Length:', packageXML.length);
    
    // Persist destructive xml whenever preview updates (in case tab not visited)
    if (selectedDestructiveMembers.size > 0 && orgInfo) {
      try {
        const destructiveGenerator = new PackageXMLGenerator(orgInfo.apiVersion);
        const destructiveTypes = [];
        selectedDestructiveMembers.forEach((memberSet, type) => {
          if (memberSet instanceof Set && memberSet.size > 0) {
            destructiveTypes.push({ name: type, members: Array.from(memberSet) });
          }
        });
        if (destructiveTypes.length > 0) {
          const destructiveXML = destructiveGenerator.generateWithMembers(destructiveTypes);
          chrome.storage.local.set({ destructiveChangesXmlContent: destructiveXML });
        } else {
          chrome.storage.local.remove('destructiveChangesXmlContent');
        }
      } catch (e) {
        console.warn('[App] Could not update destructive xml in background:', e);
      }
    } else {
      chrome.storage.local.remove('destructiveChangesXmlContent');
    }
  } catch (error) {
    console.error('[App] Failed to generate package.xml:', error);
    previewCode.innerHTML = highlightXml(`<!-- Error generating package.xml: ${error.message} -->`);
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
/**
 * Helper to build progress checklist message for toast notification
 * @param {string} status - Current status of export
 * @param {number} elapsedSeconds - Seconds since export started
 * @returns {string} Formatted checklist string
 */
function getChecklistMessage(status, elapsedSeconds) {
  const timeStr = elapsedSeconds > 0 
    ? ` (${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s)`
    : '';

  const types = Array.from(selectedMetadataTypes);
  const displayLimit = 3;
  const displayTypes = types.slice(0, displayLimit).join(', ');
  const remainingCount = types.length - displayLimit;
  const typesSubtitle = types.length > 0
    ? `\n\nRetrieving: ${displayTypes}${remainingCount > 0 ? ` and ${remainingCount} more` : ''}`
    : '';

  let step1 = '✓ Prepared package.xml';
  let step2 = '✓ Initiated retrieve request';
  let step3 = '○ Compiling & packaging metadata';
  let step4 = '○ Downloading ZIP file';

  if (status === 'Preparing') {
    step1 = '● Preparing package.xml';
    step2 = '○ Initiating retrieve request';
  } else if (status === 'Initiating') {
    step1 = '✓ Prepared package.xml';
    step2 = '● Initiating retrieve request';
  } else if (status === 'Pending') {
    step3 = `● Queued on Salesforce server${timeStr}`;
  } else if (status === 'InProgress') {
    step3 = `● Compiling & packaging metadata${timeStr}`;
  } else if (status === 'Succeeded') {
    step3 = '✓ Compiling & packaging metadata';
    step4 = '✓ Downloaded ZIP file';
  } else if (status === 'Failed') {
    step3 = '❌ Failed on Salesforce server';
  }

  return `${step1}\n${step2}\n${step3}\n${step4}${typesSubtitle}`;
}

/**
 * Cancel the active export process
 */
async function cancelExport() {
  try {
    const confirmed = confirm('Are you sure you want to stop the metadata export?');
    if (!confirmed) return;
    
    showExportProgress('Stopping export...', 50);
    
    const response = await chrome.runtime.sendMessage({
      type: 'CANCEL_EXPORT'
    });
    
    if (response.success) {
      exportInProgress = false;
      elements.exportBtn.innerHTML = '🚀 Export Metadata';
      elements.exportBtn.classList.remove('cancel-btn');
      hideExportProgress();
      showSuccess('Export stopped by user.');
    } else {
      throw new Error(response.error || 'Failed to cancel export');
    }
  } catch (error) {
    console.error('[App] Failed to cancel export:', error);
    showError('Failed to stop export: ' + error.message);
  }
}

async function startExport() {
  if (exportInProgress) {
    await cancelExport();
    return;
  }
  
  if (selectedMetadataTypes.size === 0 && selectedDestructiveMembers.size === 0) {
    return;
  }
  
  // If there are destructive members, show confirmation modal first
  if (selectedDestructiveMembers.size > 0) {
    showDestructiveConfirmModal();
    return;
  }
  
  await doStartExport();
}

/**
 * Show the destructive export confirmation modal and populate member list
 */
function showDestructiveConfirmModal() {
  if (!elements.destructiveConfirmModal) return;
  
  // Count total destructive members
  let totalCount = 0;
  selectedDestructiveMembers.forEach(set => {
    if (set instanceof Set) totalCount += set.size;
  });
  
  // Set the count
  if (elements.destructiveConfirmCount) {
    elements.destructiveConfirmCount.textContent = totalCount;
  }
  
  // Populate the member list (capped at 20 for readability)
  if (elements.destructiveConfirmList) {
    elements.destructiveConfirmList.innerHTML = '';
    let shown = 0;
    const MAX_SHOWN = 20;
    
    selectedDestructiveMembers.forEach((memberSet, type) => {
      if (!(memberSet instanceof Set)) return;
      memberSet.forEach(name => {
        if (shown >= MAX_SHOWN) return;
        const li = document.createElement('li');
        const badge = document.createElement('span');
        badge.className = 'list-type-badge';
        badge.textContent = type;
        li.appendChild(badge);
        li.appendChild(document.createTextNode(name));
        elements.destructiveConfirmList.appendChild(li);
        shown++;
      });
    });
    
    if (totalCount > MAX_SHOWN) {
      const li = document.createElement('li');
      li.style.fontStyle = 'italic';
      li.style.color = '#718096';
      li.textContent = `…and ${totalCount - MAX_SHOWN} more`;
      elements.destructiveConfirmList.appendChild(li);
    }
  }
  
  elements.destructiveConfirmModal.classList.remove('hidden');
}

/**
 * Hide the destructive export confirmation modal
 */
function hideDestructiveConfirmModal() {
  if (elements.destructiveConfirmModal) {
    elements.destructiveConfirmModal.classList.add('hidden');
  }
}

/**
 * The actual export logic (called after confirmation if needed)
 */
async function doStartExport() {
  if (!orgInfo) return;
  
  try {
    exportInProgress = true;
    showExportProgress(getChecklistMessage('Preparing', 0), 0);
    
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
    showExportProgress(getChecklistMessage('Pending', 0), 20);
    
    // Poll for export status
    await pollExportStatus();
    
  } catch (error) {
    console.error('[App] Export failed:', error);
    // Dismiss progress toast before showing error
    if (progressToast) {
      dismissToast(progressToast);
      progressToast = null;
    }
    // Only show error if the user didn't cancel it explicitly
    if (exportInProgress) {
      showError(`Export failed: ${error.message}`);
    }
  } finally {
    exportInProgress = false;
    elements.exportBtn.innerHTML = '🚀 Export Metadata';
    elements.exportBtn.classList.remove('cancel-btn');
    hideExportProgress();
  }
}

/**
 * Poll export status until complete
 */
async function pollExportStatus() {
  const pollIntervalMs = 5000;
  const timeoutMinutes = Number.isFinite(exportTimeoutMinutes) && exportTimeoutMinutes > 0
    ? exportTimeoutMinutes
    : DEFAULT_EXPORT_TIMEOUT_MINUTES;
  const maxAttempts = Math.max(1, Math.ceil((timeoutMinutes * 60 * 1000) / pollIntervalMs));
  let attempts = 0;
  const startTime = Date.now();
  
  while (attempts < maxAttempts) {
    if (!exportInProgress) return;
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    if (!exportInProgress) return;
    
    const response = await chrome.runtime.sendMessage({
      type: 'GET_EXPORT_STATUS'
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to get export status');
    }
    
    const { status, progress } = response;
    
    // Add elapsed time to progress message for long-running exports
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    const progressMessage = getChecklistMessage(status, elapsedSeconds);
    
    showExportProgress(progressMessage, progress || 50);
    
    if (status === 'Succeeded') {
      showExportProgress(getChecklistMessage('Succeeded', elapsedSeconds), 100);
      return;
    }
    
    if (status === 'Failed') {
      showExportProgress(getChecklistMessage('Failed', elapsedSeconds), 100);
      throw new Error('Export failed on server');
    }
    
    attempts++;
  }
  
  const elapsedMinutes = Math.round((Date.now() - startTime) / 60000);
  throw new Error(`Export timed out after ${elapsedMinutes} minutes. Large orgs may require longer processing time. Please try again or contact support.`);
}

// Track persistent export progress toast
let progressToast = null;

/**
 * Show export progress via toast notification
 * @param {string} message - Status message to display
 * @param {number} progress - Progress value (0-100)
 */
function showExportProgress(message, progress = 0) {
  if (progress === 100) {
    if (progressToast) {
      updateToast(progressToast, 'Export Complete', message, 'success');
      dismissToast(progressToast, 2500);
      progressToast = null;
    } else {
      showSuccess(message);
    }
  } else {
    if (!progressToast) {
      progressToast = showToast('Export Progress', message, 'info', true);
    } else {
      updateToast(progressToast, 'Export Progress', message);
    }
  }
  
  if (progress === 100) {
    elements.exportBtn.innerHTML = '🚀 Export Metadata';
    elements.exportBtn.classList.remove('cancel-btn');
    updateExportButtonState();
  } else {
    elements.exportBtn.innerHTML = '❌ Stop Export';
    elements.exportBtn.classList.add('cancel-btn');
    elements.exportBtn.disabled = false; // Keep it enabled so user can cancel!
  }
}

/**
 * Hide export progress (reset state)
 */
function hideExportProgress() {
  if (progressToast) {
    dismissToast(progressToast);
    progressToast = null;
  }
  updateExportButtonState();
}

/**
 * Display error message
 * @param {string} message - Error message to display
 */
/**
 * Show error message using toast notification
 * @param {string} message - Error message to display
 */
function showError(message) {
  showToast('Error', message, 'error');
}

/**
 * Show informational message using toast notification
 * @param {string} message - Info message to display
 */
function showInfo(message) {
  showToast('Info', message, 'info');
}

/**
 * Show success message using toast notification
 * @param {string} message - Success message to display
 */
function showSuccess(message) {
  showToast('Success', message, 'success');
}

/**
 * Update export button enabled/disabled state
 */
function updateExportButtonState() {
  const hasDestructive = selectedDestructiveMembers.size > 0;
  const canExport = 
    orgInfo !== null && 
    (selectedMetadataTypes.size > 0 || hasDestructive) && 
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

  // Settings: Export timeout (minutes)
  if (elements.exportTimeoutMinutesInput) {
    elements.exportTimeoutMinutesInput.addEventListener('change', async (e) => {
      const raw = Number.parseInt(e.target.value, 10);
      const clamped = Number.isFinite(raw)
        ? Math.min(240, Math.max(1, raw))
        : DEFAULT_EXPORT_TIMEOUT_MINUTES;

      e.target.value = String(clamped);
      await saveExportTimeoutSetting(clamped);
      showSuccess(`Export timeout set to ${clamped} minute${clamped === 1 ? '' : 's'}.`);
    });
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
  elements.searchModeTypes.addEventListener('change', () => {
    elements.metadataSearch.value = '';
    filterMetadataTypes();
  });
  
  elements.searchModeMembers.addEventListener('change', () => {
    elements.metadataSearch.value = '';
    filterMetadataTypes();
  });

  if (elements.cliCompatibleOnly) {
    elements.cliCompatibleOnly.addEventListener('change', filterMetadataTypes);
  }
  if (elements.preloadMembersBtn) {
    elements.preloadMembersBtn.addEventListener('click', preloadAllMembers);
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
  if (elements.presetRefresh) {
    elements.presetRefresh.addEventListener('click', () => loadMetadataTypes(true));
  }
  
  if (elements.presetToggleManager) {
    elements.presetToggleManager.addEventListener('click', () => {
      if (elements.presetManagerContainer) {
        elements.presetManagerContainer.classList.toggle('hidden');
      }
    });
  }
  
  // Presets Manager listeners
  if (elements.presetDropdown) {
    elements.presetDropdown.addEventListener('change', (e) => applyUserPreset(e.target.value));
  }
  if (elements.savePresetBtn) {
    elements.savePresetBtn.addEventListener('click', () => {
      if (elements.presetNameInputContainer) {
        elements.presetNameInputContainer.classList.toggle('hidden');
        if (!elements.presetNameInputContainer.classList.contains('hidden') && elements.presetNameInput) {
          elements.presetNameInput.focus();
        }
      }
    });
  }
  if (elements.presetSaveConfirm) {
    elements.presetSaveConfirm.addEventListener('click', () => {
      if (elements.presetNameInput) {
        saveUserPreset(elements.presetNameInput.value);
      }
    });
  }
  if (elements.presetSaveCancel) {
    elements.presetSaveCancel.addEventListener('click', () => {
      if (elements.presetNameInputContainer) elements.presetNameInputContainer.classList.add('hidden');
      if (elements.presetNameInput) elements.presetNameInput.value = '';
    });
  }
  if (elements.deletePresetBtn) {
    elements.deletePresetBtn.addEventListener('click', deleteUserPreset);
  }
  
  // Profile Downsizing Settings listeners
  if (elements.profileDownsizeEnable) {
    elements.profileDownsizeEnable.addEventListener('change', (e) => {
      toggleProfileDownsizeOptions(e.target.checked);
      saveProfileDownsizeSettings();
    });
  }
  
  const dsOptions = [
    'classAccesses', 'fieldPermissions', 'objectPermissions', 'pageAccesses',
    'layoutAssignments', 'recordTypeVisibilities', 'tabVisibilities', 'userPermissions'
  ];
  dsOptions.forEach(opt => {
    const el = document.getElementById(`ds-${opt}`);
    if (el) {
      el.addEventListener('change', saveProfileDownsizeSettings);
    }
  });
  
  // Upload package.xml button
  if (elements.uploadPackageBtn) {
    elements.uploadPackageBtn.addEventListener('click', () => {
      elements.packageFileInput.click();
    });
  }
  if (elements.packageFileInput) {
    elements.packageFileInput.addEventListener('change', handlePackageUpload);
  }
  
  // Paste package.xml from clipboard button
  if (elements.pastePackageBtn) {
    elements.pastePackageBtn.addEventListener('click', handlePastePackage);
  }
  
  // Preview tab switchers
  if (elements.tabPackage) {
    elements.tabPackage.addEventListener('click', () => switchPreviewTab('package'));
  }
  if (elements.tabDestructive) {
    elements.tabDestructive.addEventListener('click', () => switchPreviewTab('destructive'));
  }
  
  // Export button
  elements.exportBtn.addEventListener('click', startExport);
  
  // Destructive confirmation modal
  if (elements.destructiveConfirmCancel) {
    elements.destructiveConfirmCancel.addEventListener('click', hideDestructiveConfirmModal);
  }
  if (elements.destructiveConfirmOverlay) {
    elements.destructiveConfirmOverlay.addEventListener('click', hideDestructiveConfirmModal);
  }
  if (elements.destructiveConfirmProceed) {
    elements.destructiveConfirmProceed.addEventListener('click', async () => {
      hideDestructiveConfirmModal();
      await doStartExport();
    });
  }
  
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
      // Map progress values to checklist status
      let checklistStatus = 'Pending';
      if (message.progress <= 10) {
        checklistStatus = 'Preparing';
      } else if (message.progress <= 30) {
        checklistStatus = 'Initiating';
      }
      showExportProgress(getChecklistMessage(checklistStatus, 0), message.progress);
      break;
    
    case 'EXPORT_COMPLETE':
      showExportProgress('Export complete! Download started.', 100);
      break;
    
    case 'EXPORT_ERROR':
      if (progressToast) {
        dismissToast(progressToast);
        progressToast = null;
      }
      // Only show error if the user didn't cancel it explicitly
      if (message.error !== 'Export cancelled by user') {
        showError(message.error);
      }
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
