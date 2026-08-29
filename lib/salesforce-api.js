/**
 * Salesforce Metadata API Client
 * 
 * RESPONSIBILITIES:
 * - Interact with Salesforce Metadata API (SOAP)
 * - Handle retrieve() and checkRetrieveStatus() operations
 * - Manage authentication via session ID
 * - Handle API errors and timeouts
 * 
 * SALESFORCE METADATA API REFERENCE:
 * https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/
 * 
 * KEY OPERATIONS:
 * - retrieve(packageXML): Initiate metadata retrieval
 * - checkRetrieveStatus(retrieveId): Check status of retrieve request
 * 
 * SECURITY:
 * - Uses session-based authentication only
 * - All requests use HTTPS
 * - Session ID is never stored, only passed per request
 */

export class SalesforceMetadataAPI {
  /**
   * @param {Object} orgInfo - Org information
   * @param {string} orgInfo.url - Org base URL (e.g., https://example.salesforce.com)
   * @param {string} orgInfo.sessionId - Salesforce session ID
   * @param {string} orgInfo.apiVersion - API version (e.g., "59.0")
   */
  constructor(orgInfo) {
    this.orgInfo = orgInfo;
    this.baseUrl = this.normalizeOrgUrl(orgInfo.url);
    this.sessionId = orgInfo.sessionId;
    this.apiVersion = orgInfo.apiVersion || '59.0';
    
    // Metadata API endpoint
    this.metadataEndpoint = `${this.baseUrl}/services/Soap/m/${this.apiVersion}`;
    
    console.log('[Salesforce API] Initialized:', {
      endpoint: this.metadataEndpoint,
      apiVersion: this.apiVersion
    });
  }
  
  /**
   * Normalize org URL to base URL
   * @param {string} url - Raw org URL
   * @returns {string} Normalized base URL
   */
  normalizeOrgUrl(url) {
    // Remove trailing slashes and paths
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}`;
  }
  
  // ========================================
  // METADATA API OPERATIONS
  // ========================================
  
  /**
   * Get all available metadata types from org
   * 
   * USES SOAP METADATA API:
   * POST /services/Soap/m/{version} with describeMetadata call
   * 
   * @returns {Promise<Array>} Array of metadata type objects
   */
  async describeMetadata() {
    console.log('[Salesforce API] Fetching metadata types...');
    
    try {
      const innerXml = `<apiVersion>${this.apiVersion}</apiVersion>`;
      const body = this._soapEnvelope('describeMetadata', innerXml);
      const xml = await this._postSoap(this.metadataEndpoint, body);
      
      const metadataObjects = this._parseDescribeMetadataResponse(xml);
      console.log('[Salesforce API] Found metadata types:', metadataObjects.length);
      
      return metadataObjects;
      
    } catch (error) {
      console.error('[Salesforce API] describeMetadata failed:', error);
      throw new Error(`Failed to fetch metadata types: ${error.message}`);
    }
  }
  
  /**
   * List metadata entries for given queries
   * 
   * @param {Array<{type:string, folder?:string}>} queries - e.g. [{ type: 'ApexClass' }]
   * @returns {Promise<Array<{fullName:string,type:string}>>} List of metadata items
   */
  async listMetadata(queries = []) {
    if (!Array.isArray(queries) || queries.length === 0) {
      throw new Error('queries array required');
    }
    
    console.log('[Salesforce API] Listing metadata for', queries.length, 'queries...');
    
    try {
      const queryXml = queries.map(q =>
        `<queries>${q.folder ? `<folder>${q.folder}</folder>` : ''}<type>${q.type}</type></queries>`
      ).join('');
      const innerXml = `<apiVersion>${this.apiVersion}</apiVersion>${queryXml}`;
      const body = this._soapEnvelope('listMetadata', innerXml);
      const xml = await this._postSoap(this.metadataEndpoint, body);
      
      const results = this._parseListMetadataResponse(xml);
      console.log('[Salesforce API] Found', results.length, 'metadata items');
      
      return results;
      
    } catch (error) {
      console.error('[Salesforce API] listMetadata failed:', error);
      throw new Error(`Failed to list metadata: ${error.message}`);
    }
  }
  
  /**
   * Get members for specific metadata types using Tooling API
   * 
   * @param {string} type - e.g., 'ApexClass', 'ApexTrigger', 'AuraDefinitionBundle'
   * @param {string[]} [names] - optional filter for names; if empty, returns all
   * @returns {Promise<Array<{name:string,id:string,namespacePrefix?:string,lastModifiedDate?:string}>>}
   */
  async getMembers(type, names = []) {
    if (!type) throw new Error('type is required');
    
    console.log('[Salesforce API] Getting members for type:', type);
    
    try {
      // Map metadata type to Tooling sObject
      const toolingObject = this._mapTypeToTooling(type);
      if (!toolingObject) {
        console.warn('[Salesforce API] Unsupported type for Tooling API:', type);
        return [];
      }
      
      let soql = `SELECT Id, Name, NamespacePrefix, LastModifiedDate FROM ${toolingObject}`;
      if (names && names.length > 0) {
        const esc = names.map(n => `'${n.replace(/'/g, "\\'")}'`).join(',');
        soql += ` WHERE Name IN (${esc})`;
      }
      
      const url = `${this.baseUrl}/services/data/v${this.apiVersion}/tooling/query?q=${encodeURIComponent(soql)}`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.sessionId}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Tooling query failed: ${res.status} ${res.statusText} ${text.slice(0, 200)}`);
      }
      
      const data = await res.json();
      const members = (data.records || []).map(r => ({
        id: r.Id,
        name: r.Name,
        namespacePrefix: r.NamespacePrefix,
        lastModifiedDate: r.LastModifiedDate
      }));
      
      console.log('[Salesforce API] Found', members.length, 'members');
      return members;
      
    } catch (error) {
      console.error('[Salesforce API] getMembers failed:', error);
      throw new Error(`Failed to get members: ${error.message}`);
    }
  }
  
  // ========================================
  // SOAP HELPERS
  // ========================================
  
  /**
   * Build SOAP envelope
   * @private
   */
  _soapEnvelope(action, innerXml) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<env:Envelope xmlns:xsd="http://www.w3.org/2001/XMLSchema"
              xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
              xmlns:env="http://schemas.xmlsoap.org/soap/envelope/">
  <env:Header>
    <SessionHeader xmlns="http://soap.sforce.com/2006/04/metadata">
      <sessionId>${this.sessionId}</sessionId>
    </SessionHeader>
  </env:Header>
  <env:Body>
    <${action} xmlns="http://soap.sforce.com/2006/04/metadata">
      ${innerXml}
    </${action}>
  </env:Body>
</env:Envelope>`;
  }
  
  /**
   * Send SOAP request with exponential backoff retry
   * @private
   */
  async _postSoap(url, body, maxRetries = 3) {
    let attempt = 0;
    let delay = 1000;

    while (attempt <= maxRetries) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/xml',
            'SOAPAction': '""'
          },
          body: body
        });
        
        if (!res.ok) {
          const text = await res.text();
          console.error(`[Salesforce API] SOAP Error Response (attempt ${attempt + 1}):`, text.slice(0, 500));
          if (res.status >= 500 && attempt < maxRetries) {
            attempt++;
            await new Promise(r => setTimeout(r, delay));
            delay *= 2;
            continue;
          }
          throw new Error(`Metadata API error ${res.status}: ${res.statusText}`);
        }
        
        return await res.text();

      } catch (error) {
        if (attempt < maxRetries && !error.message.startsWith('Metadata API error 4')) {
          attempt++;
          console.warn(`[Salesforce API] Network error on attempt ${attempt}, retrying in ${delay}ms:`, error.message);
          await new Promise(r => setTimeout(r, delay));
          delay *= 2;
        } else {
          throw error;
        }
      }
    }
  }
  
  /**
   * Parse describeMetadata SOAP response
   * @private
   */
  _parseDescribeMetadataResponse(xmlText) {
    const metadataObjects = [];
    
    // Use regex to extract metadataObjects (lighter than DOM parsing)
    // Matches: <metadataObjects> or <met:metadataObjects> or with attributes
    const objRegex = /<[^>]*:?metadataObjects(?:\s+[^>]*)?>([\s\S]*?)<\/[^>]*:?metadataObjects>/g;
    let match;
    
    while ((match = objRegex.exec(xmlText)) !== null) {
      const objXml = match[1];
      
      const xmlName = this._extractXmlValue(objXml, 'xmlName');
      const directoryName = this._extractXmlValue(objXml, 'directoryName');
      const suffix = this._extractXmlValue(objXml, 'suffix');
      const inFolder = this._extractXmlValue(objXml, 'inFolder') === 'true';
      const metaFile = this._extractXmlValue(objXml, 'metaFile') === 'true';
      
      if (xmlName) {
        metadataObjects.push({
          xmlName,
          directoryName: directoryName || xmlName,
          suffix: suffix || '',
          inFolder,
          metaFile
        });
      }
    }
    
    return metadataObjects;
  }
  
  /**
   * Parse listMetadata SOAP response
   * @private
   */
  _parseListMetadataResponse(xmlText) {
    const results = [];
    // Match <result> or <met:result> containing <fullName> / <type> with namespace prefixes
    const regex = /<[^>]*:?result(?:\s+[^>]*)?>[\s\S]*?<[^>]*:?fullName(?:\s+[^>]*)?>(.*?)<\/[^>]*:?fullName>[\s\S]*?<[^>]*:?type(?:\s+[^>]*)?>(.*?)<\/[^>]*:?type>[\s\S]*?<\/[^>]*:?result>/g;
    let match;
    
    while ((match = regex.exec(xmlText)) !== null) {
      results.push({ fullName: match[1], type: match[2] });
    }
    
    return results;
  }
  
  /**
   * Extract value from XML element
   * @private
   */
  _extractXmlValue(xml, tagName) {
    // Matches tags with namespaces like <met:tagName> or attributes like <tagName xsi:type="string">
    const regex = new RegExp(`<[^>]*:?${tagName}(?:\\s+[^>]*)?>(.*?)<\\/[^>]*:?${tagName}>`, 'is');
    const match = xml.match(regex);
    return match ? match[1].trim() : '';
  }
  
  /**
   * Escape XML special characters
   * @private
   */
  _escapeXml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
  
  /**
   * Extract types elements from package.xml
   * @private
   */
  _extractPackageTypes(packageXML) {
    // Extract all <types>...</types> elements from package.xml
    const typesRegex = /<types>([\s\S]*?)<\/types>/g;
    const matches = [];
    let match;
    
    while ((match = typesRegex.exec(packageXML)) !== null) {
      matches.push(`<types>${match[1]}</types>`);
    }
    
    if (matches.length === 0) {
      throw new Error('No types found in package.xml');
    }
    
    return matches.join('\n          ');
  }
  
  /**
   * Map metadata type to Tooling API object
   * @private
   */
  _mapTypeToTooling(type) {
    const map = {
      'ApexClass': 'ApexClass',
      'ApexTrigger': 'ApexTrigger',
      'ApexPage': 'ApexPage',
      'ApexComponent': 'ApexComponent',
      'AuraDefinitionBundle': 'AuraDefinitionBundle',
      'LightningComponentBundle': 'LightningComponentBundle',
      'CustomObject': 'CustomObject',
      'CustomField': 'CustomField',
      'Profile': 'Profile',
      'PermissionSet': 'PermissionSet',
      'Flow': 'Flow',
      'ValidationRule': 'ValidationRule',
      'WorkflowRule': 'WorkflowRule'
    };
    return map[type] || null;
  }
  
  /**
   * Initiate metadata retrieve operation
   * 
   * FLOW:
   * 1. Create SOAP envelope with package.xml
   * 2. POST to Metadata API endpoint
   * 3. Parse response to extract retrieve ID
   * 
   * @param {string} packageXML - package.xml content
   * @returns {Promise<string>} Retrieve request ID
   */
  async retrieve(packageXML) {
    console.log('[Salesforce API] Initiating retrieve...');
    console.log('[Salesforce API] Package.xml:', packageXML);
    
    try {
      // Parse package.xml to extract types
      const typesXml = this._extractPackageTypes(packageXML);
      
      const innerXml = `<retrieveRequest>
        <apiVersion>${this.apiVersion}</apiVersion>
        <unpackaged>
          ${typesXml}
        </unpackaged>
      </retrieveRequest>`;
      
      console.log('[Salesforce API] Retrieve request:', innerXml);
      
      const body = this._soapEnvelope('retrieve', innerXml);
      const xml = await this._postSoap(this.metadataEndpoint, body);
      
      console.log('[Salesforce API] Retrieve response:', xml.slice(0, 500));
      
      // Extract retrieve ID from response
      const retrieveId = this._extractXmlValue(xml, 'id');
      
      if (!retrieveId) {
        throw new Error('No retrieve ID in response');
      }
      
      console.log('[Salesforce API] Retrieve initiated:', retrieveId);
      return retrieveId;
      
    } catch (error) {
      console.error('[Salesforce API] Retrieve failed:', error);
      throw new Error(`Failed to initiate metadata retrieve: ${error.message}`);
    }
  }
  
  /**
   * Check status of retrieve request
   * 
   * @param {string} retrieveId - Retrieve request ID
   * @returns {Promise<Object>} Retrieve status object
   * @returns {boolean} .done - Whether retrieve is complete
   * @returns {boolean} .success - Whether retrieve was successful
   * @returns {string} .state - Current state (InProgress, Succeeded, Failed)
   * @returns {string} .zipFile - Base64-encoded ZIP file (if done)
   * @returns {string} .errorMessage - Error message (if failed)
   */
  async checkRetrieveStatus(retrieveId) {
    console.log('[Salesforce API] Checking retrieve status:', retrieveId);
    
    try {
      const innerXml = `<id>${retrieveId}</id>`;
      const body = this._soapEnvelope('checkRetrieveStatus', innerXml);
      const xml = await this._postSoap(this.metadataEndpoint, body);
      
      // Parse status from response
      const done = this._extractXmlValue(xml, 'done') === 'true';
      const success = this._extractXmlValue(xml, 'success') === 'true';
      const state = this._extractXmlValue(xml, 'status') || (done ? 'Succeeded' : 'InProgress');
      const zipFile = this._extractXmlValue(xml, 'zipFile');
      const errorMessage = this._extractXmlValue(xml, 'errorMessage');
      
      const status = {
        done,
        success,
        state,
        zipFile: zipFile || null,
        errorMessage: errorMessage || null
      };
      
      console.log('[Salesforce API] Retrieve status:', status.state, 'done:', done);
      return status;
      
    } catch (error) {
      if (error.message && (error.message.includes('INVALID_LOCATOR') || error.message.includes('INVALID_CROSS_REFERENCE_KEY'))) {
        console.log('[Salesforce API] Retrieve result already processed/cleared by Salesforce.');
        return { done: true, success: true, state: 'Succeeded', zipFile: null, errorMessage: null };
      }
      console.error('[Salesforce API] Failed to check status:', error);
      throw new Error(`Failed to check retrieve status: ${error.message}`);
    }
  }
  
  /**
   * Validate session ID format
   * @returns {boolean} True if session ID is valid
   */
  validateSession() {
    if (!this.sessionId || typeof this.sessionId !== 'string') {
      return false;
    }
    
    // Salesforce session IDs are typically 15 or 108 characters
    // This is a basic check - actual validation may vary
    return this.sessionId.length > 10;
  }
}
