/**
 * Toast Notification & Progress Checklist UI Module
 */

let progressToast = null;

function showSuccess(message) {
  showToast('Success', message, 'success');
}

function showError(message) {
  showToast('Error', message, 'error');
}

function showInfo(message) {
  showToast('Info', message, 'info');
}

/**
 * Generate step-by-step checklist message for metadata export progress
 */
function getChecklistMessage(status, elapsedSeconds) {
  const timeStr = elapsedSeconds > 0 
    ? ` (${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s)`
    : '';

  const types = Array.from(window.selectedMetadataTypes || []);
  const displayLimit = 3;
  const displayTypes = types.slice(0, displayLimit).join(', ');
  const remainingCount = types.length - displayLimit;
  const typesSubtitle = types.length > 0
    ? `\n\nRetrieving: ${displayTypes}${remainingCount > 0 ? ` and ${remainingCount} more` : ''}`
    : '';

  let step1 = '✓ Prepared package.xml';
  let step2 = '✓ Initiated retrieve request';
  let step3 = '○ Compiling & packaging metadata';
  let step4 = '○ Downloading ZIP file';

  if (status === 'Preparing') {
    step1 = '● Preparing package.xml';
    step2 = '○ Initiating retrieve request';
  } else if (status === 'Initiating') {
    step1 = '✓ Prepared package.xml';
    step2 = '● Initiating retrieve request';
  } else if (status === 'Pending') {
    step3 = `● Queued on Salesforce server${timeStr}`;
  } else if (status === 'InProgress') {
    step3 = `● Compiling & packaging metadata${timeStr}`;
  } else if (status === 'Succeeded') {
    step3 = '✓ Compiling & packaging metadata';
    step4 = '✓ Downloaded ZIP file';
  } else if (status === 'Failed') {
    step3 = '❌ Failed on Salesforce server';
  }

  return `${step1}\n${step2}\n${step3}\n${step4}${typesSubtitle}`;
}

/**
 * Generate step-by-step checklist message for GitHub push progress
 */
function getGitHubChecklistMessage(step, elapsedSeconds = 0, fileCount = 0) {
  const timeStr = elapsedSeconds > 0 
    ? ` (${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s)`
    : '';

  const ownerRepoBranch = `${window.githubConfig?.owner || ''}/${window.githubConfig?.repo || ''}:${window.githubConfig?.branch || ''}`;

  let step1 = '✓ Prepared package.xml';
  let step2 = '✓ Retreived metadata payload';
  let step3 = '✓ Unpacked XML components';
  let step4 = `✓ Pushed to GitHub (${ownerRepoBranch})`;

  if (step === 'retrieve') {
    step1 = '✓ Prepared package.xml';
    step2 = `● Retreiving metadata from Salesforce${timeStr}`;
    step3 = '○ Unpacking XML components';
    step4 = `○ Committing to GitHub (${ownerRepoBranch})`;
  } else if (step === 'unpack') {
    step1 = '✓ Prepared package.xml';
    step2 = '✓ Retreived metadata payload';
    step3 = '● Unpacking XML components';
    step4 = `○ Committing to GitHub (${ownerRepoBranch})`;
  } else if (step === 'commit') {
    step1 = '✓ Prepared package.xml';
    step2 = '✓ Retreived metadata payload';
    step3 = `✓ Unpacked ${fileCount || ''} XML components`;
    step4 = `● Committing ${fileCount || ''} file(s) to GitHub (${ownerRepoBranch})${timeStr}`;
  } else if (step === 'done') {
    step1 = '✓ Prepared package.xml';
    step2 = '✓ Retreived metadata payload';
    step3 = `✓ Unpacked ${fileCount || ''} XML components`;
    step4 = `✓ Pushed ${fileCount || ''} file(s) to GitHub (${ownerRepoBranch})`;
  }

  return `${step1}\n${step2}\n${step3}\n${step4}`;
}

/**
 * Show export progress via toast notification
 */
function showExportProgress(message, progress = 0, isGitHubPush = false) {
  if (progress === 100) {
    if (progressToast) {
      updateToast(progressToast, isGitHubPush ? 'GitHub Push Complete' : 'Export Complete', message, 'success');
      dismissToast(progressToast, 2500);
      progressToast = null;
    } else {
      showSuccess(message);
    }
  } else {
    if (!progressToast) {
      progressToast = showToast(isGitHubPush ? 'GitHub Push Progress' : 'Export Progress', message, 'info', true);
    } else {
      updateToast(progressToast, isGitHubPush ? 'GitHub Push Progress' : 'Export Progress', message);
    }
  }
  
  if (isGitHubPush || window.isGitHubPushInProgress) {
    if (elements.pushGithubBtn) {
      elements.pushGithubBtn.disabled = true;
      if (progress === 100) {
        elements.pushGithubBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><use href="assets/icons.svg#icon-github"></use></svg><span>Push to GitHub</span>';
      } else {
        elements.pushGithubBtn.innerHTML = `<span>Pushing (${progress}%)...</span>`;
      }
    }
    return;
  }

  if (progress === 100) {
    if (elements.exportBtn) {
      elements.exportBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="assets/icons.svg#icon-download"></use></svg><span>Export Metadata</span>';
      elements.exportBtn.classList.remove('cancel-btn');
    }
    if (typeof updateExportButtonState === 'function') updateExportButtonState();
  } else {
    if (elements.exportBtn) {
      elements.exportBtn.innerHTML = 'Stop Export';
      elements.exportBtn.classList.add('cancel-btn');
      elements.exportBtn.disabled = false;
    }
  }
}

/**
 * Hide export progress (reset state)
 */
function hideExportProgress() {
  if (progressToast) {
    dismissToast(progressToast);
    progressToast = null;
  }
  if (elements.exportBtn) {
    elements.exportBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="assets/icons.svg#icon-download"></use></svg><span>Export Metadata</span>';
    elements.exportBtn.classList.remove('cancel-btn');
  }
  if (typeof updateExportButtonState === 'function') updateExportButtonState();
}
