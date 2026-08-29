/**
 * GitHub Integration & Direct Push UI Module
 */

let githubConfig = { token: '', owner: '', repo: '', branch: '', targetFolder: 'src', commitNote: '' };

function updateGitHubSyncDisplay() {
  const el = document.getElementById('github-last-synced-val');
  if (el) el.textContent = githubConfig.lastSynced ? new Date(githubConfig.lastSynced).toLocaleString() : 'Never';
}

async function loadGitHubSettings() {
  const result = await chrome.storage.local.get(['githubConfig', 'githubOrgConfigs']);
  const globalConfig = result.githubConfig || {}, orgConfigs = result.githubOrgConfigs || {}, orgKey = orgInfo?.instance || 'default', orgSpecific = orgConfigs[orgKey] || {};

  let tFolder = orgSpecific.targetFolder || globalConfig.targetFolder || 'src';
  if (tFolder === 'force-app/main/default') tFolder = 'src'; // Migrate old default
  
  githubConfig = {
    token: orgSpecific.token || globalConfig.token || '', owner: orgSpecific.owner || globalConfig.owner || '',
    repo: orgSpecific.repo || globalConfig.repo || '', branch: orgSpecific.branch || globalConfig.branch || '',
    targetFolder: tFolder,
    commitNote: orgSpecific.commitNote || '', lastSynced: orgSpecific.lastSynced || null
  };

  if (githubConfig.token) {
    githubConnector.setToken(githubConfig.token);
    if (elements.githubPatInput) elements.githubPatInput.value = githubConfig.token;
    if (elements.githubTargetFolder) elements.githubTargetFolder.value = githubConfig.targetFolder || 'src';
  }
  updateGitHubSyncDisplay();
}

async function handleGitHubDeviceLogin() {
  try {
    chrome.tabs.create({ url: 'https://github.com/settings/tokens/new?description=Salesforce+Metadata+Exporter&scopes=repo' });
    showInfo('Opened GitHub token creation page with "repo" scope pre-filled.');
  } catch (err) { showError('Failed to open GitHub token page: ' + err.message); }
}

async function openGitHubModal() {
  if (!elements.githubModal) return;
  elements.githubModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  await loadGitHubSettings();
  if (githubConfig.token) await verifyAndLoadGitHubDetails();
}

function closeGitHubModal() {
  if (!elements.githubModal) return;
  elements.githubModal.classList.add('hidden');
  document.body.style.overflow = '';
}

async function verifyAndLoadGitHubDetails() {
  const token = (elements.githubPatInput?.value || '').trim();
  if (!token) return showError('Please enter a GitHub Personal Access Token.');

  try {
    if (elements.githubTokenStatus) elements.githubTokenStatus.textContent = 'Verifying token...';
    const user = await githubConnector.verifyToken(token);
    if (elements.githubTokenStatus) {
      elements.githubTokenStatus.textContent = `Connected as ${user.login} (${user.scopes || 'repo scope'})`;
      elements.githubTokenStatus.style.color = 'var(--brand-success)';
    }

    const repos = await githubConnector.fetchUserRepos();
    if (elements.githubRepoSelect) {
      elements.githubRepoSelect.disabled = false;
      elements.githubRepoSelect.innerHTML = '<option value="">-- Select Repository --</option>';
      repos.forEach(r => {
        const opt = document.createElement('option');
        opt.value = `${r.owner}/${r.name}`;
        opt.textContent = `${r.fullName} ${r.private ? '🔒' : ''}`;
        if (githubConfig.owner && githubConfig.repo && r.owner === githubConfig.owner && r.name === githubConfig.repo) opt.selected = true;
        elements.githubRepoSelect.appendChild(opt);
      });
      if (elements.githubRepoSelect.value) await handleRepoSelectChange();
    }
    showSuccess(`GitHub token verified! Authenticated as ${user.login}`);
  } catch (err) {
    if (elements.githubTokenStatus) {
      elements.githubTokenStatus.textContent = 'Verification failed: ' + err.message;
      elements.githubTokenStatus.style.color = 'var(--brand-danger)';
    }
    showError('GitHub verification failed: ' + err.message);
  }
}

async function handleRepoSelectChange() {
  const val = elements.githubRepoSelect?.value;
  if (!val) {
    if (elements.githubBranchSelect) elements.githubBranchSelect.disabled = true;
    return;
  }

  const [owner, repo] = val.split('/');
  try {
    let branches = await githubConnector.fetchBranches(owner, repo);
    if (elements.githubBranchSelect) {
      elements.githubBranchSelect.disabled = false;
      elements.githubBranchSelect.innerHTML = '<option value="">-- Select Branch --</option>';
      if (!branches || branches.length === 0) branches = [{ name: 'main', sha: '' }];

      let selectedAny = false;
      branches.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.name; opt.dataset.sha = b.sha; opt.textContent = b.name;
        if (githubConfig.branch && githubConfig.branch === b.name) { opt.selected = true; selectedAny = true; }
        elements.githubBranchSelect.appendChild(opt);
      });

      if (!selectedAny && elements.githubBranchSelect.options.length > 1) {
        const mainOpt = Array.from(elements.githubBranchSelect.options).find(o => o.value === 'main' || o.value === 'master') || elements.githubBranchSelect.options[1];
        if (mainOpt) mainOpt.selected = true;
      }

      const createOpt = document.createElement('option');
      createOpt.value = '__CREATE_NEW__'; createOpt.textContent = '+ Create New Branch...';
      elements.githubBranchSelect.appendChild(createOpt);
    }
  } catch (err) { showError('Failed to fetch branches: ' + err.message); }
}

async function handleBranchSelectChange() {
  const val = elements.githubBranchSelect?.value;
  if (elements.githubNewBranchContainer) {
    if (val === '__CREATE_NEW__') elements.githubNewBranchContainer.classList.remove('hidden');
    else elements.githubNewBranchContainer.classList.add('hidden');
  }
}

async function handleCreateNewBranch() {
  const repoVal = elements.githubRepoSelect?.value, newBranchName = (elements.githubNewBranchInput?.value || '').trim();
  if (!repoVal || !newBranchName) return showError('Please select a repository and enter a branch name.');

  const [owner, repo] = repoVal.split('/'), firstBranchOpt = elements.githubBranchSelect?.querySelector('option[data-sha]'), baseSha = firstBranchOpt ? firstBranchOpt.dataset.sha : null;
  if (!baseSha) return showError('Could not find base commit to branch off.');

  try {
    await githubConnector.createBranch(owner, repo, newBranchName, baseSha);
    showSuccess(`Branch '${newBranchName}' created successfully!`);
    await handleRepoSelectChange();
    if (elements.githubBranchSelect) elements.githubBranchSelect.value = newBranchName;
    if (elements.githubNewBranchContainer) elements.githubNewBranchContainer.classList.add('hidden');
  } catch (err) { showError('Failed to create branch: ' + err.message); }
}

async function saveGitHubSettings() {
  const repoVal = elements.githubRepoSelect?.value, branchVal = elements.githubBranchSelect?.value;
  const token = (elements.githubPatInput?.value || '').trim(), targetFolder = (elements.githubTargetFolder?.value || '').trim();

  if (!token || !repoVal || !branchVal || branchVal === '__CREATE_NEW__') {
    return showError('Please verify token, select a repository, and select a target branch.');
  }

  const [owner, repo] = repoVal.split('/'), orgKey = orgInfo?.instance || 'default';
  githubConfig = { ...githubConfig, token, owner, repo, branch: branchVal, targetFolder };

  const result = await chrome.storage.local.get('githubOrgConfigs'), orgConfigs = result.githubOrgConfigs || {};
  orgConfigs[orgKey] = { ...githubConfig };

  await chrome.storage.local.set({ githubConfig: { token, targetFolder }, githubOrgConfigs: orgConfigs });
  githubConnector.setToken(token);
  updateGitHubSyncDisplay();
  closeGitHubModal();
  showSuccess(`Saved GitHub settings for ${orgKey}! (${owner}/${repo}:${branchVal})`);
}

function promptCommitMessage(defaultMsg, destText) {
  return new Promise((resolve, reject) => {
    if (!elements.githubCommitPromptModal) return resolve(defaultMsg);

    if (elements.githubCommitPromptDestText) elements.githubCommitPromptDestText.textContent = destText;
    if (elements.githubCommitPromptInput) elements.githubCommitPromptInput.value = defaultMsg;
    elements.githubCommitPromptModal.classList.remove('hidden');

    const cleanup = () => {
      elements.githubCommitPromptModal.classList.add('hidden');
      if (elements.githubCommitPromptConfirm) elements.githubCommitPromptConfirm.onclick = null;
      if (elements.githubCommitPromptCancel) elements.githubCommitPromptCancel.onclick = null;
      if (elements.githubCommitPromptClose) elements.githubCommitPromptClose.onclick = null;
      if (elements.githubCommitPromptOverlay) elements.githubCommitPromptOverlay.onclick = null;
    };

    if (elements.githubCommitPromptConfirm) {
      elements.githubCommitPromptConfirm.onclick = () => {
        const msg = (elements.githubCommitPromptInput?.value || '').trim() || defaultMsg;
        cleanup(); resolve(msg);
      };
    }

    const cancelHandler = () => { cleanup(); reject(new Error('Push cancelled by user')); };
    if (elements.githubCommitPromptCancel) elements.githubCommitPromptCancel.onclick = cancelHandler;
    if (elements.githubCommitPromptClose) elements.githubCommitPromptClose.onclick = cancelHandler;
    if (elements.githubCommitPromptOverlay) elements.githubCommitPromptOverlay.onclick = cancelHandler;
  });
}

async function handlePushToGitHub() {
  if (!orgInfo) return;
  await loadGitHubSettings();
  if (!githubConfig.token || !githubConfig.owner || !githubConfig.repo || !githubConfig.branch) {
    showInfo('Please configure your GitHub repository settings first.');
    await openGitHubModal();
    return;
  }

  const defaultTitle = `Salesforce Metadata Backup (${orgInfo.instance || orgInfo.url}) - ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;
  const destText = `${githubConfig.owner}/${githubConfig.repo}:${githubConfig.branch}`;
  let finalCommitTitle = defaultTitle;

  try { finalCommitTitle = await promptCommitMessage(defaultTitle, destText); }
  catch (cancelErr) { return showInfo('Push to GitHub cancelled.'); }

  try {
    isGitHubPushInProgress = true; exportInProgress = true; updateExportButtonState();
    if (elements.pushGithubBtn) { elements.pushGithubBtn.disabled = true; elements.pushGithubBtn.innerHTML = '<span>Pushing...</span>'; }
    const startTime = Date.now();
    showExportProgress(getGitHubChecklistMessage('retrieve', 0), 10, true);

    const typesWithMembers = Array.from(selectedMetadataTypes).map(type => {
      const members = selectedMembers.get(type);
      let memberArray = members === '*' ? ['*'] : (Array.isArray(members) ? members : (members instanceof Set ? Array.from(members) : ['*']));
      return { name: type, members: memberArray };
    });

    const response = await chrome.runtime.sendMessage({ type: 'START_EXPORT', payload: { orgInfo, typesWithMembers, skipDownload: true } });
    if (!response.success) throw new Error(response.error || 'Failed to retrieve metadata');

    const zipBase64 = await new Promise((resolve, reject) => {
      const timer = setInterval(async () => {
        try {
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          showExportProgress(getGitHubChecklistMessage('retrieve', elapsed), 40, true);
          const statusRes = await chrome.runtime.sendMessage({ type: 'GET_EXPORT_STATUS' });
          if (statusRes && statusRes.done) {
            clearInterval(timer);
            if (statusRes.success && statusRes.zipFile) resolve(statusRes.zipFile);
            else reject(new Error(statusRes.message || 'Salesforce retrieve failed'));
          }
        } catch (e) { clearInterval(timer); reject(e); }
      }, 3000);
    });

    showExportProgress(getGitHubChecklistMessage('unpack', Math.floor((Date.now() - startTime) / 1000)), 70, true);
    const files = await (new ZipHandler()).extractZipFiles(zipBase64);

    showExportProgress(getGitHubChecklistMessage('commit', Math.floor((Date.now() - startTime) / 1000), files.length), 85, true);
    const commitResult = await githubConnector.commitFiles(githubConfig.owner, githubConfig.repo, githubConfig.branch, githubConfig.targetFolder, files, finalCommitTitle);

    exportInProgress = false; updateExportButtonState();
    showExportProgress(getGitHubChecklistMessage('done', Math.floor((Date.now() - startTime) / 1000), files.length), 100, true);

    githubConfig.lastSynced = new Date().toISOString();
    const result = await chrome.storage.local.get('githubOrgConfigs'), orgConfigs = result.githubOrgConfigs || {};
    orgConfigs[orgInfo?.instance || 'default'] = { ...githubConfig };
    await chrome.storage.local.set({ githubOrgConfigs: orgConfigs });

    updateGitHubSyncDisplay(); showSuccess(`Successfully pushed ${files.length} file(s) to GitHub!`);
    console.log('[GitHub] Commit successful:', commitResult.htmlUrl);

    await exportHistory.logExport({
      exportType: 'github', instanceUrl: `${githubConfig.owner}/${githubConfig.repo} (${githubConfig.branch})`,
      typeCount: selectedMetadataTypes.size, memberCount: files.length, destructiveCount: selectedDestructiveMembers.size
    });
  } catch (err) {
    exportInProgress = false; updateExportButtonState(); hideExportProgress();
    showError('GitHub push failed: ' + err.message);
  } finally {
    isGitHubPushInProgress = false;
    if (elements.pushGithubBtn) {
      elements.pushGithubBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><use href="assets/icons.svg#icon-github"></use></svg><span>Push to GitHub</span>';
    }
  }
}
