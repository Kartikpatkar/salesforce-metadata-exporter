/**
 * Export History Table Modal UI Module
 */

async function openExportHistoryModal() {
  if (!elements.exportHistoryModal) return;
  elements.exportHistoryModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  const history = await exportHistory.getHistory();
  if (elements.exportHistoryList) {
    elements.exportHistoryList.innerHTML = '';
    if (history.length === 0) {
      elements.exportHistoryList.innerHTML = '<tr><td colspan="4" style="color: var(--text-muted); text-align: center; padding: 20px;">No export history recorded yet</td></tr>';
      return;
    }

    history.forEach(item => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid var(--border-color)';
      const dateStr = new Date(item.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
      const isGitHub = item.exportType === 'github' || (item.instanceUrl && item.instanceUrl.includes('/'));

      const badgeHtml = isGitHub
        ? `<span style="background: rgba(36, 41, 46, 0.2); color: var(--text-primary); border: 1px solid var(--border-color); padding: 3px 8px; border-radius: 12px; font-weight: 600; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><use href="assets/icons.svg#icon-github"></use></svg> GitHub</span>`
        : `<span style="background: rgba(46, 160, 67, 0.15); color: #2ea043; border: 1px solid rgba(46, 160, 67, 0.3); padding: 3px 8px; border-radius: 12px; font-weight: 600; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="assets/icons.svg#icon-download"></use></svg> ZIP</span>`;

      tr.innerHTML = `
        <td style="padding: 10px 14px; white-space: nowrap; color: var(--text-muted); font-size: 0.8125rem;">${dateStr}</td>
        <td style="padding: 10px 14px;">${badgeHtml}</td>
        <td style="padding: 10px 14px; color: var(--text-primary); font-weight: 500; font-family: monospace; font-size: 0.8125rem;">${item.instanceUrl || 'Salesforce Org'}</td>
        <td style="padding: 10px 14px; text-align: center; color: var(--text-secondary);">
          <strong>${item.typeCount}</strong> types (${item.memberCount} items)
          ${item.destructiveCount > 0 ? `<span style="color: var(--brand-danger); margin-left: 4px;">(${item.destructiveCount} del)</span>` : ''}
        </td>
      `;
      elements.exportHistoryList.appendChild(tr);
    });
  }
}

function closeExportHistoryModal() {
  if (!elements.exportHistoryModal) return;
  elements.exportHistoryModal.classList.add('hidden');
  document.body.style.overflow = '';
}

async function clearExportHistory() {
  const confirmed = confirm('Are you sure you want to clear all export history?');
  if (confirmed) {
    await exportHistory.clearHistory();
    await openExportHistoryModal();
    showSuccess('Export history cleared.');
  }
}
