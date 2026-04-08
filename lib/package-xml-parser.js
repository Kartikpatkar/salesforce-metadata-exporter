/**
 * PackageXMLParser - Parse package.xml files and extract metadata types and members
 * 
 * @class PackageXMLParser
 * @description Provides functionality to parse Salesforce package.xml files
 * and extract metadata type selections including specific members
 */
class PackageXMLParser {
  /**
   * Parse package.xml content and extract metadata types with members
   * @param {string} xmlContent - The package.xml file content
   * @returns {Object} Parsed result with types array and apiVersion
   * @example
   * const result = PackageXMLParser.parse(xmlContent);
   * // Returns: { types: [{name: 'ApexClass', members: ['*']}, ...], apiVersion: '59.0' }
   */
  static parse(xmlContent) {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

      // Check for parsing errors
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        throw new Error('Invalid XML: ' + parserError.textContent);
      }

      // Extract API version
      const versionNode = xmlDoc.querySelector('Package > version');
      const apiVersion = versionNode ? versionNode.textContent.trim() : '59.0';

      // Extract metadata types
      const typeNodes = xmlDoc.querySelectorAll('Package > types');
      const types = [];

      typeNodes.forEach(typeNode => {
        const nameNode = typeNode.querySelector('name');
        if (!nameNode) return;

        const typeName = nameNode.textContent.trim();
        const memberNodes = typeNode.querySelectorAll('members');
        const members = [];

        memberNodes.forEach(memberNode => {
          const memberName = memberNode.textContent.trim();
          if (memberName) {
            members.push(memberName);
          }
        });

        if (typeName && members.length > 0) {
          types.push({
            name: typeName,
            members: members
          });
        }
      });

      console.log(`[PackageXMLParser] Parsed ${types.length} metadata types from package.xml`);
      
      return {
        types: types,
        apiVersion: apiVersion
      };

    } catch (error) {
      console.error('[PackageXMLParser] Parse error:', error);
      throw new Error('Failed to parse package.xml: ' + error.message);
    }
  }

  /**
   * Validate if the content is a valid Salesforce package.xml
   * @param {string} xmlContent - The XML content to validate
   * @returns {boolean} True if valid package.xml
   */
  static isValidPackageXML(xmlContent) {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

      // Check for parsing errors
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) return false;

      // Check for required Package root element
      const packageNode = xmlDoc.querySelector('Package');
      if (!packageNode) return false;

      // Check namespace (optional but common)
      const xmlns = packageNode.getAttribute('xmlns');
      if (xmlns && !xmlns.includes('soap.sforce.com/2006/04/metadata')) {
        console.warn('[PackageXMLParser] Unexpected xmlns:', xmlns);
      }

      // Must have at least one types element
      const typeNodes = xmlDoc.querySelectorAll('Package > types');
      if (typeNodes.length === 0) {
        console.warn('[PackageXMLParser] No types elements found');
        return false;
      }

      return true;

    } catch (error) {
      console.error('[PackageXMLParser] Validation error:', error);
      return false;
    }
  }

  /**
   * Get a summary of metadata types from parsed result
   * @param {Object} parsedResult - Result from parse() method
   * @returns {string} Human-readable summary
   */
  static getSummary(parsedResult) {
    const { types, apiVersion } = parsedResult;
    const totalTypes = types.length;
    const totalMembers = types.reduce((sum, type) => {
      // Count non-wildcard members
      const nonWildcardMembers = type.members.filter(m => m !== '*').length;
      return sum + nonWildcardMembers;
    }, 0);
    const wildcardTypes = types.filter(type => type.members.includes('*')).length;

    return `API Version: ${apiVersion}\n` +
           `Metadata Types: ${totalTypes}\n` +
           `Wildcard Types (*): ${wildcardTypes}\n` +
           `Specific Members: ${totalMembers}`;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PackageXMLParser;
}
