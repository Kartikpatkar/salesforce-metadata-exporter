/**
 * Org Detector Utility
 * 
 * RESPONSIBILITIES:
 * - Extract Salesforce org information from current page
 * - Detect org URL, instance, org ID, and API version
 * - Parse Salesforce page structure (Classic, Lightning, Visualforce)
 * 
 * USAGE:
 * const detector = new OrgDetector();
 * const orgInfo = await detector.detectOrg();
 * 
 * OUTPUT:
 * {
 *   url: 'https://example.salesforce.com',
 *   instance: 'NA123',
 *   orgId: '00D000000000000EAA',
 *   apiVersion: '59.0',
 *   sessionId: 'session_id_value' (optional)
 * }
 */

export class OrgDetector {
  constructor() {
    this.defaultApiVersion = '59.0';
  }
  
  /**
   * Detect org information from current page
   * @returns {Promise<Object>} Org information object
   */
  async detectOrg() {
    try {
      const orgInfo = {
        url: this.extractOrgUrl(),
        instance: this.extractInstance(),
        orgId: await this.extractOrgId(),
        apiVersion: this.extractApiVersion(),
        sessionId: null // Will be set separately by content script
      };
      
      console.log('[Org Detector] Detected org:', orgInfo);
      return orgInfo;
      
    } catch (error) {
      console.error('[Org Detector] Failed to detect org:', error);
      throw new Error(`Could not detect Salesforce org: ${error.message}`);
    }
  }
  
  /**
   * Extract org base URL
   * @returns {string} Org URL (e.g., https://example.salesforce.com)
   */
  extractOrgUrl() {
    const url = new URL(window.location.href);
    return `${url.protocol}//${url.hostname}`;
  }
  
  /**
   * Extract Salesforce instance name
   * 
   * EXAMPLES:
   * - na123.salesforce.com -> NA123
   * - cs45.salesforce.com -> CS45
   * - example.my.salesforce.com -> example
   * 
   * @returns {string} Instance name
   */
  extractInstance() {
    const hostname = window.location.hostname;
    
    // Pattern 1: Standard instance (na123.salesforce.com)
    const standardMatch = hostname.match(/^([a-z]{2}\d+)\./i);
    if (standardMatch) {
      return standardMatch[1].toUpperCase();
    }
    
    // Pattern 2: My Domain (example.my.salesforce.com)
    const myDomainMatch = hostname.match(/^([^.]+)\./);
    if (myDomainMatch) {
      return myDomainMatch[1];
    }
    
    // Fallback
    return 'unknown';
  }
  
  /**
   * Extract Salesforce Org ID
   * 
   * STRATEGIES:
   * 1. Look for org ID in meta tags
   * 2. Parse from Aura/LWC context
   * 3. Extract from page source (API calls)
   * 
   * @returns {Promise<string>} 15 or 18 character org ID
   */
  async extractOrgId() {
    // TODO: Implement org ID extraction
    // This is complex and varies by Salesforce UI type
    
    // Strategy 1: Check meta tags
    const metaOrgId = this.getMetaOrgId();
    if (metaOrgId) {
      return metaOrgId;
    }
    
    // Strategy 2: Parse from Aura config
    const auraOrgId = this.getAuraOrgId();
    if (auraOrgId) {
      return auraOrgId;
    }
    
    // Strategy 3: Try to extract from API calls (complex)
    // This would require monitoring network requests
    
    // Fallback: Return placeholder
    console.warn('[Org Detector] Could not extract org ID, using placeholder');
    return '00D000000000000EAA'; // 15-char placeholder
  }
  
  /**
   * Extract org ID from meta tags
   * @returns {string|null} Org ID or null
   */
  getMetaOrgId() {
    const metaTag = document.querySelector('meta[name="salesforce-org-id"]');
    return metaTag ? metaTag.content : null;
  }
  
  /**
   * Extract org ID from Aura framework config
   * @returns {string|null} Org ID or null
   */
  getAuraOrgId() {
    const auraConfig = document.querySelector('script[data-aura-config]');
    if (auraConfig) {
      try {
        const config = JSON.parse(auraConfig.textContent);
        return config.orgId || null;
      } catch (e) {
        console.warn('[Org Detector] Failed to parse Aura config:', e);
      }
    }
    return null;
  }
  
  /**
   * Extract Salesforce API version
   * 
   * STRATEGIES:
   * 1. Check page source for API version references
   * 2. Use latest known version as fallback
   * 
   * @returns {string} API version (e.g., "59.0")
   */
  extractApiVersion() {
    // TODO: Implement API version detection
    // Look for version in page source, scripts, or API calls
    
    // Strategy 1: Check for API version in scripts
    const scripts = document.querySelectorAll('script[src*="/resource/"]');
    for (const script of scripts) {
      const versionMatch = script.src.match(/\/(\d+\.\d+)\//);
      if (versionMatch) {
        return versionMatch[1];
      }
    }
    
    // Strategy 2: Check Aura config
    const auraConfig = document.querySelector('script[data-aura-config]');
    if (auraConfig) {
      try {
        const config = JSON.parse(auraConfig.textContent);
        if (config.apiVersion) {
          return config.apiVersion;
        }
      } catch (e) {
        console.warn('[Org Detector] Failed to parse Aura config for API version:', e);
      }
    }
    
    // Fallback: Use default version
    console.log('[Org Detector] Using default API version:', this.defaultApiVersion);
    return this.defaultApiVersion;
  }
  
  /**
   * Detect Salesforce UI type
   * @returns {string} UI type: 'lightning', 'classic', or 'visualforce'
   */
  detectUIType() {
    const url = window.location.href;
    
    if (url.includes('/lightning/') || url.includes('lightning.force.com')) {
      return 'lightning';
    }
    
    if (url.includes('/apex/') || url.includes('visual.force.com')) {
      return 'visualforce';
    }
    
    return 'classic';
  }
  
  /**
   * Validate detected org info
   * @param {Object} orgInfo - Org info object
   * @returns {boolean} True if valid
   */
  validateOrgInfo(orgInfo) {
    return (
      orgInfo &&
      orgInfo.url &&
      orgInfo.instance &&
      orgInfo.orgId &&
      orgInfo.apiVersion
    );
  }
}
