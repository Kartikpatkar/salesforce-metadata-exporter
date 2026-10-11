/**
 * Metadata Categories & Grouping Engine
 */

export const CATEGORY_DEFINITIONS = [
  {
    id: 'apex_code',
    name: 'Apex & Code',
    icon: '⚡',
    types: new Set([
      'ApexClass', 'ApexTrigger', 'ApexComponent', 'ApexPage',
      'LightningComponentBundle', 'AuraDefinitionBundle', 'StaticResource'
    ])
  },
  {
    id: 'objects_schema',
    name: 'Objects & Schema',
    icon: '🗄️',
    types: new Set([
      'CustomObject', 'CustomField', 'RecordType', 'StandardValueSet',
      'GlobalValueSet', 'ValidationRule', 'Index', 'BusinessProcess',
      'CompactLayout', 'FieldSet', 'CustomObjectTranslation'
    ])
  },
  {
    id: 'automation_flows',
    name: 'Automation & Flows',
    icon: '⚙️',
    types: new Set([
      'Flow', 'FlowDefinition', 'Workflow', 'WorkflowRule', 'AssignmentRule',
      'AutoResponseRule', 'EscalationRule', 'WorkflowAlert', 'WorkflowFieldUpdate',
      'WorkflowTask', 'WorkflowOutboundMessage'
    ])
  },
  {
    id: 'security_access',
    name: 'Security & Access',
    icon: '🔒',
    types: new Set([
      'Profile', 'PermissionSet', 'PermissionSetGroup', 'SharingRules',
      'Role', 'Group', 'MutingPermissionSet', 'CustomPermission',
      'SharingCriteriaRule', 'SharingOwnerRule'
    ])
  },
  {
    id: 'ui_layouts',
    name: 'UI & Layouts',
    icon: '🎨',
    types: new Set([
      'CustomTab', 'CustomApplication', 'FlexiPage', 'Layout',
      'QuickAction', 'HomePageLayout', 'CustomPageWebLink', 'AppMenu',
      'CustomLabel'
    ])
  },
  {
    id: 'integration_apis',
    name: 'Integration & APIs',
    icon: '🌐',
    types: new Set([
      'NamedCredential', 'ExternalDataSource', 'RemoteSiteSetting',
      'ConnectedApp', 'ApexEmailHandler', 'CspTrustedSite', 'CorsWhitelistOrigin',
      'Certificate', 'AuthProvider'
    ])
  },
  {
    id: 'reports_dashboards',
    name: 'Reports & Dashboards',
    icon: '📊',
    types: new Set([
      'Report', 'Dashboard', 'ReportType', 'Document', 'EmailTemplate',
      'ReportFolder', 'DashboardFolder', 'EmailFolder', 'DocumentFolder'
    ])
  },
  {
    id: 'other_config',
    name: 'Other Configuration',
    icon: '📦',
    types: new Set() // Catch-all for remaining types
  }
];

/**
 * Get category ID for a given metadata type name
 * @param {string} typeName
 * @returns {Object} Category definition
 */
export function getCategoryForType(typeName) {
  for (const cat of CATEGORY_DEFINITIONS) {
    if (cat.types.has(typeName)) {
      return cat;
    }
  }
  // Return last catch-all category
  return CATEGORY_DEFINITIONS[CATEGORY_DEFINITIONS.length - 1];
}

/**
 * Group metadata types array into category buckets
 * @param {Array<Object>} metadataTypes - Array of {xmlName, ...} objects
 * @returns {Map<string, {category: Object, types: Array<Object>}>}
 */
export function groupMetadataTypes(metadataTypes) {
  const grouped = new Map();
  
  CATEGORY_DEFINITIONS.forEach(cat => {
    grouped.set(cat.id, { category: cat, types: [] });
  });

  metadataTypes.forEach(typeObj => {
    const typeName = typeObj.xmlName || typeObj.name || typeObj;
    const cat = getCategoryForType(typeName);
    grouped.get(cat.id).types.push(typeObj);
  });

  return grouped;
}
