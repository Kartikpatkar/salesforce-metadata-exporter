/**
 * Salesforce Authentication, Org Header, & Org Settings Modal UI Module
 */

async function detectSalesforceOrg() {
  console.log('[App] Checking Salesforce authentication...');
  try {
    const response = await chrome.runtime.sendMessage({ type: 'CHECK_SF_AUTH', payload: { skipCache: true } });
    if (response.success && response.org.isAuthenticated) displayOrgInfo(response.org);
    else {
      displayOrgInfo(null);
      showInfo('Not connected to Salesforce. Click "Login to Production" or "Login to Sandbox".');
    }
  } catch (error) {
    displayOrgInfo(null);
    showError('Failed to check Salesforce authentication.');
  }
}

async function loginToProduction() {
  try {
    showInfo('Opening Salesforce login...');
    const response = await chrome.runtime.sendMessage({ type: 'SF_LOGIN', payload: { useSandbox: false } });
    if (response.success && response.org.isAuthenticated) displayOrgInfo(response.org);
    else showError('Login failed. Please try again.');
  } catch (error) {
    showError('Login failed: ' + error.message);
  }
}

async function loginToSandbox() {
  try {
    showInfo('Opening Salesforce sandbox login...');
    const response = await chrome.runtime.sendMessage({ type: 'SF_LOGIN', payload: { useSandbox: true } });
    if (response.success && response.org.isAuthenticated) displayOrgInfo(response.org);
    else showError('Sandbox login failed. Please try again.');
  } catch (error) {
    showError('Sandbox login failed: ' + error.message);
  }
}

async function switchOrg() {
  try {
    if (!confirm('This will clear your current session. Continue?')) return;
    await chrome.runtime.sendMessage({ type: 'SF_SWITCH_ORG' });
    displayOrgInfo(null);
    showSuccess('Session cleared. Please log in again.');
  } catch (error) {
    showError('Failed to switch org: ' + error.message);
  }
}

function extractInstanceFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const match = urlObj.hostname.match(/^([a-z]{2}\d+|[^.]+)\./i);
    return match ? match[1].toUpperCase() : 'Unknown';
  } catch {
    return 'Unknown';
  }
}

async function displayOrgInfo(org) {
  if (!org || !org.isAuthenticated) {
    if (elements.orgStatus) elements.orgStatus.textContent = '⚠️ Not connected to Salesforce';
    if (elements.orgDetails) elements.orgDetails.classList.add('hidden');
    if (elements.exportBtn) elements.exportBtn.disabled = true;
    if (elements.loginBtn) elements.loginBtn.style.display = 'inline-block';
    if (elements.loginSandboxBtn) elements.loginSandboxBtn.style.display = 'inline-block';
    if (elements.switchOrgBtn) elements.switchOrgBtn.style.display = 'none';
    return;
  }
  
  const extractedOrgId = org.sessionId ? org.sessionId.split('!')[0] : 'Connected';
  orgInfo = {
    url: org.instanceUrl, instanceUrl: org.instanceUrl, instance: extractInstanceFromUrl(org.instanceUrl),
    orgId: extractedOrgId, apiVersion: '59.0', sessionId: org.sessionId, isSandbox: org.isSandbox
  };
  
  if (elements.orgStatus) elements.orgStatus.textContent = `✅ Connected to Salesforce ${org.isSandbox ? '(Sandbox)' : '(Production)'}`;
  if (elements.orgUrl) elements.orgUrl.textContent = org.instanceUrl;
  if (elements.orgInstance) elements.orgInstance.textContent = orgInfo.instance;
  if (elements.orgId) elements.orgId.textContent = `${orgInfo.orgId} (${org.isSandbox ? 'Sandbox' : 'Production'})`;
  if (elements.apiVersion) elements.apiVersion.textContent = orgInfo.apiVersion;
  if (elements.orgDetails) elements.orgDetails.classList.remove('hidden');
  if (elements.loginBtn) elements.loginBtn.style.display = 'none';
  if (elements.loginSandboxBtn) elements.loginSandboxBtn.style.display = 'none';
  if (elements.switchOrgBtn) elements.switchOrgBtn.style.display = 'inline-block';
  
  if (typeof updateExportButtonState === 'function') updateExportButtonState();
  if (typeof loadMetadataTypes === 'function') await loadMetadataTypes();
  if (typeof loadPresets === 'function') await loadPresets();
  if (typeof loadGitHubSettings === 'function') await loadGitHubSettings();
}

function openOrgModal() {
  if (!elements.orgModal) return;
  elements.orgModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeOrgModal() {
  if (!elements.orgModal) return;
  elements.orgModal.classList.add('hidden');
  document.body.style.overflow = '';
}

async function saveExportTimeoutSetting(minutes) {
  try {
    await chrome.storage.local.set({ exportTimeoutMinutes: minutes });
  } catch (err) {
    console.error('[Settings] Failed to save timeout:', err);
  }
}
