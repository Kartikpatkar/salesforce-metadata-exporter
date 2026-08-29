/**
 * Salesforce Metadata Exporter - Content Script
 * 
 * Authentication is handled by SalesforceConnector in the background service worker
 * via the Chrome cookies API directly.
 */

console.log('[Content Script] Loaded on:', window.location.href);

// Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Content Script] Received message:', message.type);
  
  switch (message.type) {
    case 'PING':
      sendResponse({ success: true, url: window.location.href });
      break;
    
    case 'GET_PAGE_INFO':
      sendResponse({
        success: true,
        url: window.location.href,
        hostname: window.location.hostname,
        pathname: window.location.pathname
      });
      break;
    
    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }
  
  return false;
});

