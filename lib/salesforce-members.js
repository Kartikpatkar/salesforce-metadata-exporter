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
     * Map folder-based metadata types to their folder type names
     */
    getFolderType(type) {
        const folderTypeMap = {
            'Report': 'ReportFolder',
            'Dashboard': 'DashboardFolder',
            'Document': 'DocumentFolder',
            'EmailTemplate': 'EmailFolder'
        };
        return folderTypeMap[type] || null;
    }

    /**
     * Fetch members via Metadata API (SOAP listMetadata)
     * Handles both flat types and folder-based types
     * @private
     */
    async _fetchViaMetadataAPI(metadataType) {
        const folderType = this.getFolderType(metadataType);
        
        if (folderType) {
            return this._fetchFolderMembers(metadataType, folderType);
        }

        return this._callListMetadata(metadataType);
    }

    /**
     * Fetch members for folder-based metadata types
     * @private
     */
    async _fetchFolderMembers(metadataType, folderType) {
        try {
            // 1. Fetch folders
            const folders = await this._callListMetadata(folderType);
            const folderNames = folders.map(f => f.fullName);
            
            // Include unfiled public folder for reports/dashboards
            if (metadataType === 'Report' && !folderNames.includes('unfiled$public')) {
                folderNames.push('unfiled$public');
            }
            if (metadataType === 'EmailTemplate' && !folderNames.includes('unfiled$public')) {
                folderNames.push('unfiled$public');
            }

            const members = [];

            // Add folder names themselves as members (standard Salesforce requirement)
            folderNames.forEach(fName => {
                if (fName && !members.some(m => m.fullName === fName)) {
                    members.push({ fullName: fName });
                }
            });

            // 2. Fetch components within each folder (in batches of 3 to respect SOAP limits)
            const batchSize = 3;
            for (let i = 0; i < folderNames.length; i += batchSize) {
                const batch = folderNames.slice(i, i + batchSize);
                const queriesXml = batch.map(f => `
                    <met:queries>
                        <met:type>${metadataType}</met:type>
                        <met:folder>${f}</met:folder>
                    </met:queries>
                `).join('');

                const folderMembers = await this._executeListMetadataQuery(queriesXml);
                folderMembers.forEach(m => {
                    if (m.fullName && !members.some(existing => existing.fullName === m.fullName)) {
                        members.push(m);
                    }
                });
            }

            return members;
        } catch (error) {
            console.warn(`[SalesforceMembers] Failed to fetch folder members for ${metadataType}:`, error);
            // Fallback to standard flat listMetadata query
            return this._callListMetadata(metadataType);
        }
    }

    /**
     * Call listMetadata for a single metadata type
     * @private
     */
    async _callListMetadata(metadataType) {
        const queryXml = `
          <met:queries>
            <met:type>${metadataType}</met:type>
          </met:queries>`;
        return this._executeListMetadataQuery(queryXml);
    }

    /**
     * Execute SOAP listMetadata request and parse fullNames
     * @private
     */
    async _executeListMetadataQuery(innerQueriesXml) {
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
      ${innerQueriesXml}
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
        const fullNameRegex = /<[^>]*:?fullName(?:\s+[^>]*)?>([^<]+)<\/[^>]*:?fullName>/g;
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
