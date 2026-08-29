/**
 * DOM Elements Selector Registry Module
 * Uses ES getters to dynamically fetch DOM nodes on demand.
 */

const elements = {
  // Org info elements
  get orgStatus() { return document.getElementById('org-status'); },
  get orgDetails() { return document.getElementById('org-details'); },
  get orgUrl() { return document.getElementById('org-url'); },
  get orgInstance() { return document.getElementById('org-instance'); },
  get orgId() { return document.getElementById('org-id'); },
  get apiVersion() { return document.getElementById('api-version'); },
  
  // Auth controls
  get loginBtn() { return document.getElementById('login-btn'); },
  get loginSandboxBtn() { return document.getElementById('login-sandbox-btn'); },
  get switchOrgBtn() { return document.getElementById('switch-org-btn'); },
  get profileBtn() { return document.getElementById('profile-btn'); },
  get themeToggle() { return document.getElementById('theme-toggle'); },
  
  // Modal elements
  get orgModal() { return document.getElementById('org-modal'); },
  get modalOverlay() { return document.getElementById('modal-overlay'); },
  get modalClose() { return document.getElementById('modal-close'); },
  get exportTimeoutMinutesInput() { return document.getElementById('export-timeout-minutes'); },
  
  // Metadata selection
  get metadataCheckboxes() { return document.querySelectorAll('#metadata-types input[type="checkbox"]'); },
  get metadataSearch() { return document.getElementById('metadata-search'); },
  get presetSelectAll() { return document.getElementById('preset-select-all'); },
  get presetClear() { return document.getElementById('preset-clear'); },
  get presetRefresh() { return document.getElementById('preset-refresh'); },
  
  // Presets elements
  get presetToggleManager() { return document.getElementById('preset-toggle-manager'); },
  get presetManagerContainer() { return document.getElementById('preset-manager-container'); },
  get presetDropdown() { return document.getElementById('preset-dropdown'); },
  get deletePresetBtn() { return document.getElementById('delete-preset-btn'); },
  get savePresetBtn() { return document.getElementById('save-preset-btn'); },
  get presetNameInputContainer() { return document.getElementById('preset-name-input-container'); },
  get presetNameInput() { return document.getElementById('preset-name-input'); },
  get presetSaveConfirm() { return document.getElementById('preset-save-confirm'); },
  get presetSaveCancel() { return document.getElementById('preset-save-cancel'); },

  // Search mode elements
  get searchModeTypes() { return document.getElementById('search-mode-types'); },
  get searchModeMembers() { return document.getElementById('search-mode-members'); },
  get cliCompatibleOnly() { return document.getElementById('cli-compatible-only'); },
  get preloadMembersBtn() { return document.getElementById('preload-members-btn'); },

  // Profile downsizing elements
  get profileDownsizeEnable() { return document.getElementById('profile-downsize-enable'); },
  get profileDownsizeOptions() { return document.getElementById('profile-downsize-options'); },
  
  get uploadPackageBtn() { return document.getElementById('upload-package-btn'); },
  get packageFileInput() { return document.getElementById('package-file-input'); },
  get pastePackageBtn() { return document.getElementById('paste-package-btn'); },
  
  // Package preview
  get packagePreview() { return document.getElementById('package-preview'); },
  get tabPackage() { return document.getElementById('tab-package'); },
  get tabDestructive() { return document.getElementById('tab-destructive'); },
  get destructiveInfoBanner() { return document.getElementById('destructive-info-banner'); },
  
  // Export controls
  get exportBtn() { return document.getElementById('export-btn'); },
  get destructiveExportWarning() { return document.getElementById('destructive-export-warning'); },
  get destructiveExportWarningText() { return document.getElementById('destructive-export-warning-text'); },
  
  // Destructive confirmation modal
  get destructiveConfirmModal() { return document.getElementById('destructive-confirm-modal'); },
  get destructiveConfirmOverlay() { return document.getElementById('destructive-confirm-overlay'); },
  get destructiveConfirmCount() { return document.getElementById('destructive-confirm-count'); },
  get destructiveConfirmList() { return document.getElementById('destructive-confirm-list'); },
  get destructiveConfirmCancel() { return document.getElementById('destructive-confirm-cancel'); },
  get destructiveConfirmProceed() { return document.getElementById('destructive-confirm-proceed'); },

  // Preset JSON Import/Export
  get exportPresetsBtn() { return document.getElementById('export-presets-btn'); },
  get importPresetsBtn() { return document.getElementById('import-presets-btn'); },
  get presetFileInput() { return document.getElementById('preset-file-input'); },

  // Export History modal
  get historyBtn() { return document.getElementById('history-btn'); },
  get exportHistoryModal() { return document.getElementById('export-history-modal'); },
  get exportHistoryOverlay() { return document.getElementById('export-history-overlay'); },
  get exportHistoryClose() { return document.getElementById('export-history-close'); },
  get exportHistoryList() { return document.getElementById('export-history-list'); },
  get clearHistoryBtn() { return document.getElementById('clear-history-btn'); },

  // GitHub integration elements
  get githubBtn() { return document.getElementById('github-btn'); },
  get pushGithubBtn() { return document.getElementById('push-github-btn'); },
  get githubModal() { return document.getElementById('github-modal'); },
  get githubModalOverlay() { return document.getElementById('github-modal-overlay'); },
  get githubModalClose() { return document.getElementById('github-modal-close'); },
  get githubLoginBtn() { return document.getElementById('github-login-btn'); },
  get githubPatInput() { return document.getElementById('github-pat-input'); },
  get githubVerifyTokenBtn() { return document.getElementById('github-verify-token-btn'); },
  get githubTokenStatus() { return document.getElementById('github-token-status'); },
  get githubRepoSelect() { return document.getElementById('github-repo-select'); },
  get githubBranchSelect() { return document.getElementById('github-branch-select'); },
  get githubNewBranchContainer() { return document.getElementById('github-new-branch-container'); },
  get githubNewBranchInput() { return document.getElementById('github-new-branch-input'); },
  get githubCreateBranchBtn() { return document.getElementById('github-create-branch-btn'); },
  get githubTargetFolder() { return document.getElementById('github-target-folder'); },
  get githubCommitNoteInput() { return document.getElementById('github-commit-note'); },
  get githubSaveSettingsBtn() { return document.getElementById('github-save-settings-btn'); },

  // Commit message prompt modal
  get githubCommitPromptModal() { return document.getElementById('github-commit-prompt-modal'); },
  get githubCommitPromptOverlay() { return document.getElementById('github-commit-prompt-overlay'); },
  get githubCommitPromptClose() { return document.getElementById('github-commit-prompt-close'); },
  get githubCommitPromptDestText() { return document.getElementById('github-commit-dest-text'); },
  get githubCommitRepoSelect() { return document.getElementById('github-commit-repo-select'); },
  get githubCommitBranchSelect() { return document.getElementById('github-commit-branch-select'); },
  get githubCommitPromptInput() { return document.getElementById('github-commit-prompt-input'); },
  get githubCommitPromptCancel() { return document.getElementById('github-commit-prompt-cancel'); },
  get githubCommitPromptConfirm() { return document.getElementById('github-commit-prompt-confirm'); }
};
