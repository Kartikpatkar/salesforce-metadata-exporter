/**
 * Salesforce Members Fetcher
 * Reusable module to fetch metadata type members from Salesforce orgs.
 * Automatically routes to Tooling API or Metadata API based on type.
 * 
 * Dependencies: salesforce-connector.js
 * 
 * @version 1.0.0
 * @author Kartik Patkar
 * @license MIT
 */

export class SalesforceMembers {
    /**
     * @param {Object} options
     * @param {string} [options.apiVersion='59.0'] - Salesforce API version
     * @param {Object} options.orgInfo - Org info with sessionId and instanceUrl
     */
    constructor(options = {}) {
        this.apiVersion = options.apiVersion || '59.0';
        this.orgInfo = options.orgInfo;
    }

    /**
     * Get members for a metadata type
     * @param {string} metadataType - Metadata type name (e.g., 'ApexClass', 'Report', 'Profile')
     * @returns {Promise<Array<{fullName: string}>>} Array of member objects
     */
    async getMembers(metadataType) {
        if (!metadataType) {
            throw new Error('metadataType is required');
        }

        if (!this.orgInfo || !this.orgInfo.sessionId || !this.orgInfo.instanceUrl) {
            throw new Error('Missing org info - please re-authenticate');
        }

        if (this.isToolingType(metadataType)) {
            console.log(`[SalesforceMembers] Fetching ${metadataType} via Tooling API`);
            return this._fetchViaToolingAPI(metadataType);
        } else {
            console.log(`[SalesforceMembers] Fetching ${metadataType} via Metadata API`);
            return this._fetchViaMetadataAPI(metadataType);
        }
    }

    /**
     * Check if a metadata type should use Tooling API
     * @param {string} type - Metadata type name
     * @returns {boolean} True if should use Tooling API
     */
    isToolingType(type) {
        // Only Apex and Lightning component types are reliably supported via Tooling API
        // All other metadata types should use Metadata API listMetadata
        return [
            'ApexClass',
            'ApexTrigger',
            'ApexComponent',
            'ApexPage',
            'LightningComponentBundle',
            'AuraDefinitionBundle'
        ].includes(type);
    }

    // ==================== PRIVATE METHODS ====================

    /**
     * Fetch members via Tooling API
     * @private
     */
    async _fetchViaToolingAPI(metadataType) {
        // Map metadata type to Tooling object
        const toolingObjectMap = {
            ApexClass: 'ApexClass',
            ApexTrigger: 'ApexTrigger',
            ApexComponent: 'ApexComponent',
            ApexPage: 'ApexPage',
            LightningComponentBundle: 'LightningComponentBundle',
            AuraDefinitionBundle: 'AuraDefinitionBundle'
        };

        const toolingObject = toolingObjectMap[metadataType];
        if (!toolingObject) {
            throw new Error(`Tooling API mapping not found for ${metadataType}`);
        }

        // LightningComponentBundle and AuraDefinitionBundle use DeveloperName, others use Name
        const fieldName = (metadataType === 'LightningComponentBundle' || metadataType === 'AuraDefinitionBundle') 
            ? 'DeveloperName' 
            : 'Name';

        const query = `SELECT ${fieldName} FROM ${toolingObject} ORDER BY ${fieldName}`;
        const url = `${this.orgInfo.instanceUrl}/services/data/v${this.apiVersion}/tooling/query/?q=${encodeURIComponent(query)}`;

        const res = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${this.orgInfo.sessionId}`,
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Tooling API error: HTTP ${res.status} - ${text.slice(0, 200)}`);
        }

        const data = await res.json();
        // Convert to {fullName: string} format
        return (data.records || []).map(r => ({ fullName: r[fieldName] }));
    }

    /**
     * Fetch members via Metadata API (SOAP listMetadata)
     * @private
     */
    async _fetchViaMetadataAPI(metadataType) {
        // Build SOAP envelope for listMetadata
        const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:met="http://soap.sforce.com/2006/04/metadata">
  <soapenv:Header>
    <met:SessionHeader>
      <met:sessionId>${this.orgInfo.sessionId}</met:sessionId>
    </met:SessionHeader>
  </soapenv:Header>
  <soapenv:Body>
    <met:listMetadata>
      <met:queries>
        <met:type>${metadataType}</met:type>
      </met:queries>
      <met:asOfVersion>${this.apiVersion}</met:asOfVersion>
    </met:listMetadata>
  </soapenv:Body>
</soapenv:Envelope>`;

        const url = `${this.orgInfo.instanceUrl}/services/Soap/m/${this.apiVersion}`;
        
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/xml',
                'SOAPAction': 'listMetadata'
            },
            body: soapBody
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Metadata API error: HTTP ${res.status} ${res.statusText} - ${text.slice(0, 200)}`);
        }

        const xmlText = await res.text();

        // Parse XML response to extract fullName values
        // Format: <fullName>ComponentName</fullName>
        const fullNameRegex = /<fullName>([^<]+)<\/fullName>/g;
        const members = [];
        let match;
        
        while ((match = fullNameRegex.exec(xmlText)) !== null) {
            const name = match[1].trim();
            if (name && !members.some(m => m.fullName === name)) {
                members.push({ fullName: name });
            }
        }

        return members;
    }
}
