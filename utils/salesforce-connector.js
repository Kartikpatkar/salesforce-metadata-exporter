/**
 * Salesforce Connector Module
 * A reusable Chrome Extension module for detecting and authenticating Salesforce orgs
 * 
 * @version 1.0.0
 * @author Kartik Patkar
 * @license MIT
 * 
 * FEATURES:
 * - Automatic org detection from browser tabs
 * - Cookie-based session validation
 * - Support for production and sandbox orgs
 * - Login flow with automatic redirect handling
 * - Smart caching with TTL
 * - Multi-window support
 * 
 * REQUIRED MANIFEST PERMISSIONS:
 * - tabs
 * - cookies
 * - storage
 * - scripting
 * 
 * REQUIRED HOST PERMISSIONS:
 * - https://*.salesforce.com/*
 * - https://*.force.com/*
 * - https://*.visual.force.com/*
 * - https://*.my.salesforce.com/*
 * - https://*.salesforce-setup.com/*
 * - https://*.my.salesforce-setup.com/*
 * - https://login.salesforce.com/*
 * - https://test.salesforce.com/*
 * 
 * USAGE EXAMPLE:
 * 
 * // Initialize connector
 * const sfConnector = new SalesforceConnector({
 *   cacheTTL: 60000, // Optional: Cache time in ms (default: 60s)
 *   onAuthChange: (org) => {
 *     if (org.isAuthenticated) {
 *       console.log('Connected to:', org.instanceUrl);
 *     } else {
 *       console.log('Not authenticated');
 *     }
 *   }
 * });
 * 
 * // Check current authentication
 * const org = await sfConnector.checkAuth();
 * 
 * // Login to production
 * const org = await sfConnector.login(false);
 * 
 * // Login to sandbox
 * const org = await sfConnector.login(true);
 * 
 * // Switch org (clears current session)
 * await sfConnector.switchOrg();
 * 
 * // Manual cache clear
 * sfConnector.clearCache();
 */

class SalesforceConnector {
    constructor(options = {}) {
        this.cacheTTL = options.cacheTTL || 60000; // 60 seconds default
        this.onAuthChange = options.onAuthChange || null;
        this._cache = { org: null, timestamp: 0 };
        this._contentScriptPath = options.contentScriptPath || 'content/content-script.js';
    }

    /**
     * Clear the authentication cache
     */
    clearCache() {
        this._cache = { org: null, timestamp: 0 };
        console.log('[SalesforceConnector] Auth cache cleared');
    }

    /**
     * Check current Salesforce org authentication
     * @param {Object} options - Optional configuration
     * @param {boolean} options.skipCache - Force fresh check, bypass cache
     * @param {boolean} options.currentWindowOnly - Only check tabs in current window
     * @param {number} options.recencyThreshold - Max age of tab in ms (default: 30000)
     * @param {number} options.priorityTabId - Tab ID to check first (e.g., the tab that opened the popup)
     * @returns {Promise<Object>} Org object with authentication status
     */
    async checkAuth(options = {}) {
        try {
            const skipCache = options.skipCache || false;
            const currentWindowOnly = options.currentWindowOnly !== false; // Default true
            const recencyThreshold = options.recencyThreshold || 30000; // 30 seconds
            const priorityTabId = options.priorityTabId; // Tab to check first

            // IMPORTANT: Skip cache when priorityTabId is provided
            // This ensures each popup checks its own tab's session instead of using cached session from another tab
            const shouldSkipCache = skipCache || priorityTabId;

            // Return cached org if still fresh and not skipping cache
            const now = Date.now();
            if (!shouldSkipCache && this._cache.org?.isAuthenticated && (now - this._cache.timestamp) < this.cacheTTL) {
                return this._cache.org;
            }

            // PRIORITY: Check the tab that opened the popup first (fixes simultaneous popup issue)
            if (priorityTabId) {
                console.log('[SalesforceConnector] Checking priority tab ID:', priorityTabId);
                try {
                    const priorityTab = await chrome.tabs.get(priorityTabId);
                    if (priorityTab && this._isSalesforceUrl(priorityTab.url)) {
                        const priorityHost = new URL(priorityTab.url).hostname;
                        if (!this._isLoginOrTestHost(priorityHost)) {
                            console.log('[SalesforceConnector] Priority tab is Salesforce:', priorityTab.url);
                            const result = await this._checkTabForSession(priorityTab);
                            if (result.isAuthenticated) {
                                console.log('[SalesforceConnector] Found session in priority tab:', result.instanceUrl);
                                // Update stored openerTabId to this tab
                                chrome.storage.local.set({ openerTabId: priorityTab.id });
                                this._cache = { org: result, timestamp: Date.now() };
                                this._notifyAuthChange(result);
                                return result;
                            } else {
                                console.log('[SalesforceConnector] Priority tab has no valid session');
                                // IMPORTANT: When a priority tab is specified, only check that tab
                                // Don't fall back to other tabs or stored openerTabId
                                // This ensures each popup checks its own tab's session
                                const notAuthResult = { isAuthenticated: false };
                                this._cache = { org: notAuthResult, timestamp: Date.now() };
                                this._notifyAuthChange(notAuthResult);
                                return notAuthResult;
                            }
                        } else {
                            console.log('[SalesforceConnector] Priority tab is login/test page, not authenticated');
                            const notAuthResult = { isAuthenticated: false };
                            this._cache = { org: notAuthResult, timestamp: Date.now() };
                            this._notifyAuthChange(notAuthResult);
                            return notAuthResult;
                        }
                    } else {
                        console.log('[SalesforceConnector] Priority tab is not a Salesforce URL');
                        const notAuthResult = { isAuthenticated: false };
                        this._cache = { org: notAuthResult, timestamp: Date.now() };
                        this._notifyAuthChange(notAuthResult);
                        return notAuthResult;
                    }
                } catch (e) {
                    console.log('[SalesforceConnector] Priority tab check failed:', e.message);
                    const notAuthResult = { isAuthenticated: false };
                    this._cache = { org: notAuthResult, timestamp: Date.now() };
                    this._notifyAuthChange(notAuthResult);
                    return notAuthResult;
                }
            }

            // Check if there's a stored opener tab (fallback)
            const storage = await chrome.storage.local.get(['openerTabId']);
            const openerTabId = storage.openerTabId;

            // If openerTabId is explicitly null, don't scan other tabs (user wants to login)
            if (openerTabId === null) {
                console.log('[SalesforceConnector] Opener tab explicitly cleared; not scanning other tabs');
                this._cache = { org: { isAuthenticated: false }, timestamp: Date.now() };
                return { isAuthenticated: false };
            }

            // Try opener tab first if it exists
            if (openerTabId) {
                console.log('[SalesforceConnector] Checking opener tab ID:', openerTabId);
                try {
                    const openerTab = await chrome.tabs.get(openerTabId);
                    if (openerTab && this._isSalesforceUrl(openerTab.url)) {
                        const openerHost = new URL(openerTab.url).hostname;
                        if (!this._isLoginOrTestHost(openerHost)) {
                            console.log('[SalesforceConnector] Opener tab is Salesforce:', openerTab.url);
                            const result = await this._checkTabForSession(openerTab);
                            if (result.isAuthenticated) {
                                console.log('[SalesforceConnector] Found session in opener tab:', result.instanceUrl);
                                this._cache = { org: result, timestamp: Date.now() };
                                this._notifyAuthChange(result);
                                return result;
                            }
                        } else {
                            console.log('[SalesforceConnector] Skipping login/test opener tab:', openerHost);
                        }
                    }
                } catch (e) {
                    console.log('[SalesforceConnector] Opener tab no longer exists:', e.message);
                }
            }

            // Scan for Salesforce tabs
            console.log('[SalesforceConnector] Scanning for Salesforce tabs...');
            const query = currentWindowOnly ? { currentWindow: true } : {};
            const tabs = await chrome.tabs.query(query);
            const salesforceTabs = tabs.filter(tab => this._isSalesforceUrl(tab.url));

            // Apply recency threshold if specified
            const recentSalesforceTabs = salesforceTabs.filter(tab => {
                const age = now - (tab.lastAccessed || 0);
                return age < recencyThreshold;
            });

            // Sort by last accessed time (most recent first)
            recentSalesforceTabs.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));

            for (const tab of recentSalesforceTabs) {
                const tabHost = new URL(tab.url).hostname;
                if (this._isLoginOrTestHost(tabHost)) {
                    console.log('[SalesforceConnector] Skipping login/test tab:', tabHost);
                    continue;
                }
                const result = await this._checkTabForSession(tab);
                if (result.isAuthenticated) {
                    console.log('[SalesforceConnector] Found authenticated session in tab:', result.instanceUrl);
                    // Update the opener tab ID to this authenticated tab
                    chrome.storage.local.set({ openerTabId: tab.id });
                    this._cache = { org: result, timestamp: Date.now() };
                    this._notifyAuthChange(result);
                    return result;
                }
            }

            // No authenticated org found
            const notAuthResult = { isAuthenticated: false };
            this._cache = { org: notAuthResult, timestamp: Date.now() };
            this._notifyAuthChange(notAuthResult);
            return notAuthResult;
        } catch (error) {
            console.error('[SalesforceConnector] Error detecting current org:', error);
            const errorResult = { isAuthenticated: false, error: error.message };
            this._notifyAuthChange(errorResult);
            return errorResult;
        }
    }

    /**
     * Login to Salesforce (opens login window)
     * @param {boolean} useSandbox - True for sandbox, false for production
     * @param {number} timeout - Timeout in ms (default: 60000)
     * @returns {Promise<Object>} Org object after successful login
     */
    async login(useSandbox = false, timeout = 60000) {
        try {
            const authUrl = useSandbox ? 'https://test.salesforce.com' : 'https://login.salesforce.com';
            const tab = await chrome.tabs.create({ url: authUrl });

            return new Promise((resolve, reject) => {
                const onUpdated = async (tabId, changeInfo, updatedTab) => {
                    if (tabId === tab.id && changeInfo.status === 'complete') {
                        try {
                            const url = new URL(updatedTab.url);
                            const isSalesforceUrl = url.hostname.endsWith('salesforce.com') ||
                                url.hostname.endsWith('force.com') ||
                                url.hostname.endsWith('salesforce-setup.com');

                            // Skip if still on login page
                            if (url.hostname === 'login.salesforce.com' || url.hostname === 'test.salesforce.com') {
                                return; // Still logging in
                            }

                            if (isSalesforceUrl) {
                                // User has been redirected to Salesforce org after login
                                console.log('[SalesforceConnector] Login redirect detected to:', url.hostname);

                                // Update opener tab ID to this new login tab and clear cache
                                await chrome.storage.local.set({ openerTabId: tabId });
                                this.clearCache();
                                console.log('[SalesforceConnector] Updated opener tab ID and cleared cache:', tabId);

                                // Give it a moment for the session to be established
                                setTimeout(async () => {
                                    const org = await this.checkAuth({ skipCache: true });
                                    if (org.isAuthenticated) {
                                        chrome.tabs.onUpdated.removeListener(onUpdated);
                                        chrome.tabs.remove(tabId);
                                        clearTimeout(timeoutHandle);
                                        resolve(org);
                                    } else {
                                        console.log('[SalesforceConnector] Session not established yet, continuing to listen...');
                                    }
                                }, 1000);
                            }
                        } catch (error) {
                            console.error('[SalesforceConnector] Error in tab update handler:', error);
                        }
                    }
                };

                chrome.tabs.onUpdated.addListener(onUpdated);

                // Set a timeout to clean up if authentication takes too long
                const timeoutHandle = setTimeout(() => {
                    chrome.tabs.onUpdated.removeListener(onUpdated);
                    reject(new Error('Authentication timed out'));
                }, timeout);
            });
        } catch (error) {
            console.error('[SalesforceConnector] Login failed:', error);
            throw error;
        }
    }

    /**
     * Switch org (clears current session and forces re-authentication)
     * @returns {Promise<void>}
     */
    async switchOrg() {
        console.log('[SalesforceConnector] Switching org - clearing current session');
        await chrome.storage.local.set({ openerTabId: null, currentOrg: null });
        this.clearCache();
        const notAuthResult = { isAuthenticated: false };
        this._notifyAuthChange(notAuthResult);
    }

    // ==================== PRIVATE METHODS ====================

    /**
     * Check if URL is a Salesforce URL
     * @private
     */
    _isSalesforceUrl(url) {
        if (!url || url.startsWith('chrome-extension://')) return false;
        return url.includes('salesforce.com') ||
               url.includes('force.com') ||
               url.includes('visual.force.com') ||
               url.includes('salesforce-setup.com');
    }

    /**
     * Check if hostname is a login or test host (should be skipped)
     * @private
     */
    _isLoginOrTestHost(hostname = '') {
        return hostname === 'login.salesforce.com' ||
               hostname === 'test.salesforce.com' ||
               hostname.startsWith('login.') ||
               hostname.startsWith('test.');
    }

    /**
     * Check a specific tab for valid Salesforce session
     * @private
     */
    async _checkTabForSession(tab) {
        try {
            if (!tab || !tab.url) {
                return { isAuthenticated: false };
            }

            const url = new URL(tab.url);
            const hostname = url.hostname;

            // Get all cookies for potential Salesforce domains
            const cookieDomains = [
                hostname,
                `.${hostname}`,
                '.salesforce.com',
                '.my.salesforce.com',
                '.force.com'
            ];

            const allCookies = [];
            for (const domain of cookieDomains) {
                try {
                    const cookies = await chrome.cookies.getAll({ domain });
                    console.log(`[SalesforceConnector] Cookies for ${domain}:`, cookies.length);
                    allCookies.push(...cookies);
                } catch (e) {
                    // Ignore cookie fetch errors
                }
            }

            if (allCookies.length === 0) {
                return { isAuthenticated: false };
            }

            // Find session cookies (prioritize 'sid')
            const sessionCookies = allCookies
                .filter(c => c.name && (
                    c.name === 'sid' ||
                    c.name.startsWith('sid_') ||
                    c.name.includes('sid') ||
                    c.name.endsWith('_sid')
                ))
                .sort((a, b) => this._scoreSessionCookie(b.name) - this._scoreSessionCookie(a.name));

            const validationFailures = [];

            for (const cookie of sessionCookies) {
                if (!cookie.value) continue;

                console.log('[SalesforceConnector] Selected session cookie:', cookie.name);

                // Determine if sandbox
                const isSandbox = hostname.includes('.sandbox.') ||
                                hostname.includes('--') ||
                                hostname.includes('.develop.') ||
                                hostname.includes('.scratch.');

                const apiBase = this._getApiBaseFromHostname(hostname, url.protocol);

                // Validate session via API
                const validation = await this._validateSessionViaApi(apiBase, cookie.value, tab.id);
                if (validation?.success) {
                    return {
                        isAuthenticated: true,
                        instanceUrl: apiBase,
                        sessionId: cookie.value,
                        isSandbox,
                        tabId: tab.id
                    };
                }

                console.warn('[SalesforceConnector] Session validation failed (API)', validation);
                validationFailures.push({ cookie: cookie.name, validation });
            }

            return { isAuthenticated: false, validationFailure: validationFailures };
        } catch (err) {
            console.log('[SalesforceConnector] Error checking tab:', err);
            return { isAuthenticated: false };
        }
    }

    /**
     * Score session cookie names (higher score = better)
     * @private
     */
    _scoreSessionCookie(name = '') {
        if (name === 'sid') return 3;
        if (name.startsWith('sid_')) return 2;
        if (name.includes('sid')) return 1;
        if (name.endsWith('_sid')) return 1;
        return 0;
    }

    /**
     * Get API base URL from hostname
     * @private
     */
    _getApiBaseFromHostname(hostname, protocol = 'https:') {
        if (!hostname) return null;
        
        // Transform lightning.force.com -> my.salesforce.com
        if (hostname.endsWith('.lightning.force.com')) {
            return `${protocol}//${hostname.replace('.lightning.force.com', '.my.salesforce.com')}`;
        }
        
        // Transform salesforce-setup.com -> salesforce.com (for Setup pages)
        if (hostname.includes('.salesforce-setup.com')) {
            return `${protocol}//${hostname.replace('.salesforce-setup.com', '.salesforce.com')}`;
        }
        
        return `${protocol}//${hostname}`;
    }

    /**
     * Validate session via Salesforce API
     * @private
     */
    async _validateSessionViaApi(apiBase, sessionId, tabId = null) {
        if (!apiBase || !sessionId) {
            return { success: false, error: 'Missing apiBase or sessionId' };
        }

        // Try REST API with Bearer token
        const url = `${apiBase}/services/data/v59.0/limits`;
        try {
            const res = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${sessionId}`,
                    'Content-Type': 'application/json'
                }
            });

            if (res.ok) {
                return { success: true, status: res.status };
            }

            const bodyText = await res.text();
            return {
                success: false,
                status: res.status,
                statusText: res.statusText,
                bodyPreview: bodyText.substring(0, 200)
            };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    /**
     * Notify auth change via callback
     * @private
     */
    _notifyAuthChange(org) {
        if (this.onAuthChange && typeof this.onAuthChange === 'function') {
            try {
                this.onAuthChange(org);
            } catch (e) {
                console.error('[SalesforceConnector] Error in onAuthChange callback:', e);
            }
        }
    }
}

// Export for both CommonJS and ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SalesforceConnector;
}

export default SalesforceConnector;
