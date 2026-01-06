/**
 * Salesforce Metadata Exporter - Content Script
 * 
 * NOTE: This content script is largely unused in the current implementation
 * because the SalesforceConnector in the background worker handles all
 * authentication via the Chrome cookies API directly.
 * 
 * This file is kept as a placeholder for future features that may require
 * direct interaction with Salesforce pages (e.g., DOM manipulation,
 * page-specific feature detection).
 * 
 * ORIGINAL RESPONSIBILITIES (now handled by SalesforceConnector):
 * - ✅ Detect if current page is a Salesforce org
 * - ✅ Extract org information (URL, instance, org ID, API version)
 * - ✅ Extract session ID from cookies
 * - ✅ Validate session via API
 * 
 * All of the above are now handled by:
 * - utils/salesforce-connector.js (background worker)
 */

console.log('[Content Script] Loaded on:', window.location.href);
console.log('[Content Script] SalesforceConnector handles authentication - this script is minimal');

// Minimal listener for future extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Content Script] Received message:', message.type);
  
  switch (message.type) {
    case 'PING':
      // Simple ping test
      sendResponse({ success: true, url: window.location.href });
      break;
    
    default:
      console.log('[Content Script] Unknown message type:', message.type);
      sendResponse({ success: false, error: 'Unknown message type' });
  }
  
  return false; // Synchronous response
});

  // Set up message listener for popup requests
  chrome.runtime.onMessage.addListener(handleMessage);
}

// ========================================
// SALESFORCE PAGE DETECTION
// ========================================

/**
 * Check if current page is a valid Salesforce org page
 * @returns {boolean} True if Salesforce page
 */
function isSalesforcePage() {
  const hostname = window.location.hostname;
  
  // Check if domain matches known Salesforce patterns
  const salesforcePatterns = [
    /\.salesforce\.com$/,
    /\.force\.com$/,
    /\.my\.salesforce\.com$/,
    /\.lightning\.force\.com$/,
    /\.visual\.force\.com$/
  ];
  
  return salesforcePatterns.some(pattern => pattern.test(hostname));
}

// ========================================
// MESSAGE HANDLING
// ========================================

/**
 * Handle messages from popup or background script
 * @param {Object} message - Message object
 * @param {Object} sender - Message sender
 * @param {Function} sendResponse - Response callback
 */
function handleMessage(message, sender, sendResponse) {
  console.log('[Content Script] Received message:', message.type);
  
  switch (message.type) {
    case 'GET_ORG_INFO':
      handleGetOrgInfo(sendResponse);
      return true; // Keep channel open for async response
    
    case 'GET_SESSION_ID':
      handleGetSessionId(sendResponse);
      return true;
    
    default:
      console.warn('[Content Script] Unknown message type:', message.type);
      sendResponse({ success: false, error: 'Unknown message type' });
      return false;
  }
}

/**
 * Handle GET_ORG_INFO request from popup
 * 
 * Extracts and returns:
 * - Org URL
 * - Instance (e.g., NA123, CS45)
 * - Org ID (15 or 18 character ID)
 * - API version
 * - Session ID (if available)
 * 
 * @param {Function} sendResponse - Response callback
 */
async function handleGetOrgInfo(sendResponse) {
  try {
    console.log('[Content Script] Extracting org info...');
    
    // TODO: Use OrgDetector utility to extract org info
    const detector = new OrgDetector();
    const orgInfo = await detector.detectOrg();
    
    console.log('[Content Script] Org info extracted:', orgInfo);
    sendResponse({ success: true, orgInfo });
    
  } catch (error) {
    console.error('[Content Script] Failed to get org info:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle GET_SESSION_ID request
 * 
 * SECURITY: Session ID is extracted from:
 * 1. Cookie (name: "sid")
 * 2. DOM elements (Aura/LWC framework data)
 * 3. Meta tags
 * 
 * Session ID is NEVER stored, only returned on request.
 * 
 * @param {Function} sendResponse - Response callback
 */
async function handleGetSessionId(sendResponse) {
  try {
    console.log('[Content Script] Extracting session ID...');
    
    const sessionId = await extractSessionId();
    
    if (!sessionId) {
      throw new Error('No Salesforce session found. Please log in to Salesforce.');
    }
    
    console.log('[Content Script] Session ID extracted (length:', sessionId.length + ')');
    sendResponse({ success: true, sessionId });
    
  } catch (error) {
    console.error('[Content Script] Failed to get session ID:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// ========================================
// ORG INFO EXTRACTION
// ========================================

/**
 * Extract session ID from Salesforce page
 * 
 * IMPLEMENTATION NOTES:
 * - Salesforce Classic: Check cookies
 * - Lightning Experience: Check window context or DOM
 * - Visual force: Check cookies or page context
 * 
 * @returns {Promise<string|null>} Session ID or null
 */
async function extractSessionId() {
  // TODO: Implement session extraction logic
  // This is a stub - actual implementation will vary by Salesforce UI type
  
  // Strategy 1: Try cookies
  const cookieSessionId = getCookieValue('sid');
  if (cookieSessionId) {
    console.log('[Content Script] Session ID found in cookie');
    return cookieSessionId;
  }
  
  // Strategy 2: Try DOM (Lightning Experience)
  const domSessionId = extractSessionFromDOM();
  if (domSessionId) {
    console.log('[Content Script] Session ID found in DOM');
    return domSessionId;
  }
  
  // Strategy 3: Try injecting script to access window context
  // NOTE: This requires careful implementation to avoid CSP violations
  const windowSessionId = await extractSessionFromWindow();
  if (windowSessionId) {
    console.log('[Content Script] Session ID found in window context');
    return windowSessionId;
  }
  
  console.warn('[Content Script] No session ID found');
  return null;
}

/**
 * Get cookie value by name
 * @param {string} name - Cookie name
 * @returns {string|null} Cookie value or null
 */
function getCookieValue(name) {
  const cookies = document.cookie.split(';');
  
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.trim().split('=');
    if (cookieName === name) {
      return cookieValue;
    }
  }
  
  return null;
}

/**
 * Extract session ID from DOM elements
 * 
 * Looks for:
 * - Aura framework data attributes
 * - LWC context data
 * - Hidden form fields
 * 
 * @returns {string|null} Session ID or null
 */
function extractSessionFromDOM() {
  // TODO: Implement DOM extraction
  // Example: Look for specific meta tags or data attributes
  
  // Check for Aura config
  const auraConfig = document.querySelector('script[data-aura-config]');
  if (auraConfig) {
    try {
      const config = JSON.parse(auraConfig.textContent);
      if (config.token) {
        return config.token;
      }
    } catch (e) {
      console.warn('[Content Script] Failed to parse Aura config:', e);
    }
  }
  
  // Check for hidden input fields (Visualforce pages)
  const sessionInput = document.querySelector('input[name="com.salesforce.visualforce.ViewState"]');
  if (sessionInput) {
    // Note: ViewState is not the session ID, but might contain it
    // This is a placeholder - actual implementation needed
  }
  
  return null;
}

/**
 * Extract session ID from window context via script injection
 * 
 * SECURITY WARNING: This requires careful CSP handling
 * Content scripts cannot directly access page's JavaScript context,
 * so we need to inject a script and use DOM events for communication.
 * 
 * @returns {Promise<string|null>} Session ID or null
 */
async function extractSessionFromWindow() {
  // TODO: Implement window context extraction
  // This is complex and requires injecting a script into the page
  
  return new Promise((resolve) => {
    // Create a unique event name
    const eventName = 'salesforce-session-extract-' + Date.now();
    
    // Listen for response from injected script
    const listener = (event) => {
      if (event.detail && event.detail.sessionId) {
        document.removeEventListener(eventName, listener);
        resolve(event.detail.sessionId);
      }
    };
    
    document.addEventListener(eventName, listener);
    
    // Inject script to access window context
    const script = document.createElement('script');
    script.textContent = `
      (function() {
        try {
          // Try accessing Salesforce global objects
          // NOTE: These are implementation-specific and may change
          let sessionId = null;
          
          // Lightning Experience
          if (window.$A && window.$A.getToken) {
            sessionId = window.$A.getToken();
          }
          
          // Classic or other contexts
          if (!sessionId && window.sforce && window.sforce.connection && window.sforce.connection.sessionId) {
            sessionId = window.sforce.connection.sessionId;
          }
          
          // Dispatch event with result
          document.dispatchEvent(new CustomEvent('${eventName}', {
            detail: { sessionId }
          }));
          
        } catch (error) {
          console.error('Failed to extract session from window:', error);
          document.dispatchEvent(new CustomEvent('${eventName}', {
            detail: { sessionId: null }
          }));
        }
      })();
    `;
    
    document.documentElement.appendChild(script);
    script.remove();
    
    // Timeout after 2 seconds
    setTimeout(() => {
      document.removeEventListener(eventName, listener);
      resolve(null);
    }, 2000);
  });
}

// ========================================
// DEVELOPMENT HELPERS
// ========================================

/**
 * Log current page info for debugging
 */
function logPageInfo() {
  console.log('[Content Script] Page Info:', {
    url: window.location.href,
    hostname: window.location.hostname,
    pathname: window.location.pathname,
    cookies: document.cookie.split(';').map(c => c.trim().split('=')[0])
  });
}

// Call for debugging (remove in production)
if (process.env.NODE_ENV === 'development') {
  logPageInfo();
}

console.log('[Content Script] Ready');
