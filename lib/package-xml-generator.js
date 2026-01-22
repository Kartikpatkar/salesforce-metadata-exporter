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
    
    if (metadataTypes.length === 0) {
      throw new Error('No metadata types provided');
    }
    
    // Build XML - no validation needed since types come from describeMetadata API
    const typesXML = metadataTypes.map(type => this.buildTypeElement(type, useWildcard, specificMembers));
    
    return this.buildPackageXML(typesXML);
  }
  
  /**
   * Generate package.xml with specific members per type
   * 
   * @param {Array<{name: string, members: string[]}>} typesWithMembers - Array of types with their members
   * @returns {string} package.xml content
   */
  generateWithMembers(typesWithMembers) {
    if (typesWithMembers.length === 0) {
      throw new Error('No metadata types provided');
    }
    
    const typesXML = typesWithMembers.map(type => {
      const useWildcard = type.members.length === 1 && type.members[0] === '*';
      return this.buildTypeElement(type.name, useWildcard, type.members);
    });
    
    return this.buildPackageXML(typesXML);
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
