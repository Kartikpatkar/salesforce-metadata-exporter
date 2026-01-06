/**
 * Package XML Generator
 * 
 * RESPONSIBILITIES:
 * - Generate valid package.xml files for Salesforce Metadata API
 * - Support wildcard (*) for metadata types
 * - Handle API version specification
 * - Validate metadata type names
 * 
 * PACKAGE.XML FORMAT:
 * <?xml version="1.0" encoding="UTF-8"?>
 * <Package xmlns="http://soap.sforce.com/2006/04/metadata">
 *   <types>
 *     <members>*</members>
 *     <name>ApexClass</name>
 *   </types>
 *   <version>59.0</version>
 * </Package>
 * 
 * REFERENCE:
 * https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_package_xml.htm
 */

export class PackageXMLGenerator {
  /**
   * @param {string} apiVersion - Salesforce API version (e.g., "59.0")
   */
  constructor(apiVersion = '59.0') {
    this.apiVersion = apiVersion;
    
    // Valid Salesforce metadata types
    // This is a subset - full list at https://developer.salesforce.com/docs/metadata-coverage
    this.validMetadataTypes = new Set([
      'ApexClass',
      'ApexTrigger',
      'ApexPage',
      'ApexComponent',
      'CustomObject',
      'CustomField',
      'CustomTab',
      'CustomApplication',
      'Layout',
      'ValidationRule',
      'RecordType',
      'Flow',
      'PermissionSet',
      'Profile',
      'CustomMetadata',
      'CustomLabel',
      'StaticResource',
      'EmailTemplate',
      'Report',
      'Dashboard',
      'AuraDefinitionBundle',
      'LightningComponentBundle',
      'CustomSite',
      'WorkflowRule',
      'WorkflowAlert',
      'Queue',
      'Group'
    ]);
  }
  
  /**
   * Generate package.xml from metadata types
   * 
   * @param {string[]} metadataTypes - Array of metadata type names
   * @param {Object} options - Generation options
   * @param {boolean} options.useWildcard - Use wildcard (*) for members (default: true)
   * @param {string[]} options.specificMembers - Specific member names (if not using wildcard)
   * @returns {string} package.xml content
   */
  generate(metadataTypes, options = {}) {
    const { useWildcard = true, specificMembers = [] } = options;
    
    // Validate metadata types
    const validTypes = this.validateMetadataTypes(metadataTypes);
    
    if (validTypes.length === 0) {
      throw new Error('No valid metadata types provided');
    }
    
    // Build XML
    const typesXML = validTypes.map(type => this.buildTypeElement(type, useWildcard, specificMembers));
    
    return this.buildPackageXML(typesXML);
  }
  
  /**
   * Validate metadata type names
   * @param {string[]} types - Metadata type names
   * @returns {string[]} Valid metadata types
   */
  validateMetadataTypes(types) {
    const valid = [];
    const invalid = [];
    
    for (const type of types) {
      if (this.validMetadataTypes.has(type)) {
        valid.push(type);
      } else {
        invalid.push(type);
      }
    }
    
    if (invalid.length > 0) {
      console.warn('[PackageXML Generator] Invalid metadata types:', invalid);
    }
    
    return valid;
  }
  
  /**
   * Build <types> element for a metadata type
   * @param {string} typeName - Metadata type name
   * @param {boolean} useWildcard - Use wildcard (*)
   * @param {string[]} members - Specific members (if not using wildcard)
   * @returns {string} <types> element XML
   */
  buildTypeElement(typeName, useWildcard, members) {
    const memberElements = useWildcard 
      ? '    <members>*</members>'
      : members.map(m => `    <members>${this.escapeXML(m)}</members>`).join('\n');
    
    return `  <types>
${memberElements}
    <name>${typeName}</name>
  </types>`;
  }
  
  /**
   * Build complete package.xml
   * @param {string[]} typesElements - Array of <types> element strings
   * @returns {string} Complete package.xml
   */
  buildPackageXML(typesElements) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
${typesElements.join('\n')}
  <version>${this.apiVersion}</version>
</Package>`;
  }
  
  /**
   * Escape XML special characters
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  escapeXML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
  
  /**
   * Add a new valid metadata type (for extensibility)
   * @param {string} typeName - Metadata type name
   */
  addValidMetadataType(typeName) {
    this.validMetadataTypes.add(typeName);
  }
  
  /**
   * Get list of all valid metadata types
   * @returns {string[]} Array of valid metadata type names
   */
  getValidMetadataTypes() {
    return Array.from(this.validMetadataTypes).sort();
  }
}
