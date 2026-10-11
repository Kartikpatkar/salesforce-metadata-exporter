/**
 * Metadata Types Cards, Category Groupings, Search & Preview UI Module
 */

let activePreviewTab = 'package';
let searchDebounceTimer = null;

async function loadMetadataTypes(forceRefresh = false) {
  try {
    const metadataSection = document.getElementById('metadata-types');
    if (metadataSection) metadataSection.innerHTML = '<p style="text-align: center; padding: 20px;">Loading metadata types...</p>';
    const response = await chrome.runtime.sendMessage({ type: 'GET_METADATA_TYPES', payload: { orgInfo, forceRefresh } });
    if (response.success && response.metadataTypes) {
      renderMetadataTypes(response.metadataTypes);
      await loadSavedSelections();
      if (forceRefresh) showSuccess('Metadata types refreshed successfully!');
    } else throw new Error(response.error || 'Failed to load metadata types');
  } catch (error) {
    showError('Failed to load metadata types: ' + error.message);
  }
}

function renderMetadataTypes(metadataTypes) {
  const metadataSection = document.getElementById('metadata-types');
  if (!metadataSection) return;
  metadataSection.innerHTML = '';
  if (!metadataTypes || metadataTypes.length === 0) {
    metadataSection.innerHTML = '<p>No metadata types available</p>';
    return;
  }

  const grouped = groupMetadataTypes(metadataTypes);
  grouped.forEach(({ category, types }) => {
    if (types.length === 0) return;
    const groupEl = document.createElement('div');
    groupEl.className = 'category-group';
    groupEl.id = `cat-${category.id}`;

    const headerEl = document.createElement('div');
    headerEl.className = 'category-header';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'category-title-wrap';

    const arrow = document.createElement('span');
    arrow.className = 'category-toggle-arrow';
    arrow.textContent = '▶';

    const title = document.createElement('span');
    title.className = 'category-title';
    title.textContent = category.name;

    const badge = document.createElement('span');
    badge.className = 'category-badge';
    badge.id = `cat-badge-${category.id}`;
    badge.textContent = `0 / ${types.length}`;

    titleWrap.appendChild(arrow);
    titleWrap.appendChild(title);
    titleWrap.appendChild(badge);

    const actions = document.createElement('div');
    actions.className = 'category-actions';

    const selectAllBtn = document.createElement('button');
    selectAllBtn.type = 'button';
    selectAllBtn.className = 'category-select-btn select-all';
    selectAllBtn.textContent = 'Select All';
    selectAllBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleCategorySelection(category.id, types, true); });

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'category-select-btn clear';
    clearBtn.textContent = 'Clear';
    clearBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleCategorySelection(category.id, types, false); });

    actions.appendChild(selectAllBtn);
    actions.appendChild(clearBtn);
    headerEl.appendChild(titleWrap);
    headerEl.appendChild(actions);

    headerEl.addEventListener('click', () => { groupEl.classList.toggle('open'); });

    const bodyEl = document.createElement('div');
    bodyEl.className = 'category-body';

    types.forEach(type => {
      const container = document.createElement('div');
      container.className = 'metadata-type-container';
      container.dataset.category = category.id;

      const mainLabel = document.createElement('label');
      mainLabel.className = 'metadata-type-label';

      const typeArrow = document.createElement('span');
      typeArrow.className = 'expand-arrow';
      typeArrow.textContent = '▶';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = type.xmlName;
      checkbox.className = 'metadata-type-checkbox';
      checkbox.addEventListener('change', (e) => { handleMetadataSelection(e, type); updateCategoryBadge(category.id); });

      const typeName = document.createElement('span');
      typeName.className = 'metadata-type-name';
      typeName.textContent = type.xmlName;

      const typeBadge = document.createElement('span');
      typeBadge.className = 'member-count-badge hidden';
      typeBadge.textContent = '0';

      mainLabel.appendChild(typeArrow);
      mainLabel.appendChild(checkbox);
      mainLabel.appendChild(typeName);
      mainLabel.appendChild(typeBadge);

      const membersContainer = document.createElement('div');
      membersContainer.className = 'members-container hidden';
      membersContainer.id = `members-${type.xmlName}`;

      typeArrow.addEventListener('click', async (e) => {
        e.stopPropagation(); e.preventDefault();
        await toggleMembersView(type.xmlName, typeArrow, membersContainer, typeBadge);
      });

      container.appendChild(mainLabel);
      container.appendChild(membersContainer);
      bodyEl.appendChild(container);
    });

    groupEl.appendChild(headerEl);
    groupEl.appendChild(bodyEl);
    metadataSection.appendChild(groupEl);
  });
  updateAllCategoryBadges();
}

function toggleCategorySelection(categoryId, types, select) {
  types.forEach(type => {
    const typeName = type.xmlName || type.name || type;
    const checkbox = document.querySelector(`.metadata-type-checkbox[value="${typeName}"]`);
    if (checkbox) {
      if (select) {
        selectedMetadataTypes.add(typeName);
        if (!selectedMembers.has(typeName)) selectedMembers.set(typeName, '*');
        checkbox.checked = true;
      } else {
        selectedMetadataTypes.delete(typeName);
        selectedMembers.delete(typeName);
        checkbox.checked = false;
      }
    }
  });
  saveSelections();
  updatePackagePreview();
  updateExportButtonState();
  updateCategoryBadge(categoryId);
}

function updateCategoryBadge(categoryId) {
  const badge = document.getElementById(`cat-badge-${categoryId}`);
  const group = document.getElementById(`cat-${categoryId}`);
  if (!badge || !group) return;
  const checkboxes = group.querySelectorAll('.metadata-type-checkbox');
  const checked = group.querySelectorAll('.metadata-type-checkbox:checked');
  badge.textContent = `${checked.length} / ${checkboxes.length}`;
  if (checked.length > 0) badge.classList.add('has-selected');
  else badge.classList.remove('has-selected');
}

function updateAllCategoryBadges() {
  if (typeof CATEGORY_DEFINITIONS !== 'undefined') {
    CATEGORY_DEFINITIONS.forEach(cat => updateCategoryBadge(cat.id));
  }
}

function filterMetadataTypes() {
  if (!elements.metadataSearch) return;
  const searchTerm = elements.metadataSearch.value.toLowerCase().trim();
  const searchMode = elements.searchModeMembers && elements.searchModeMembers.checked ? 'members' : 'types';
  const metadataContainer = document.getElementById('metadata-types');
  if (!metadataContainer) return;

  const categoryGroups = metadataContainer.querySelectorAll('.category-group');
  const containers = metadataContainer.querySelectorAll('.metadata-type-container');

  containers.forEach(container => {
    const typeName = container.querySelector('.metadata-type-name')?.textContent || '';
    const match = typeName.toLowerCase().includes(searchTerm);
    container.style.display = match || !searchTerm ? 'block' : 'none';
  });

  categoryGroups.forEach(group => {
    const visible = group.querySelectorAll('.metadata-type-container[style*="display: block"]');
    group.style.display = visible.length > 0 || !searchTerm ? 'block' : 'none';
    if (searchTerm.length > 0 && visible.length > 0) group.classList.add('open');
  });
}

function clearMetadataSearch() {
  if (elements.metadataSearch) {
    elements.metadataSearch.value = '';
    filterMetadataTypes();
  }
}

function selectAllMetadata() {
  elements.metadataCheckboxes.forEach(cb => {
    cb.checked = true;
    selectedMetadataTypes.add(cb.value);
    if (!selectedMembers.has(cb.value)) selectedMembers.set(cb.value, '*');
  });
  saveSelections();
  updateAllCategoryBadges();
  updatePackagePreview();
  updateExportButtonState();
}

function clearAllSelections() {
  elements.metadataCheckboxes.forEach(cb => { cb.checked = false; });
  selectedMetadataTypes.clear();
  selectedMembers.clear();
  selectedDestructiveMembers.clear();
  saveSelections();
  updateAllCategoryBadges();
  updatePackagePreview();
  updateExportButtonState();
}

function switchPreviewTab(tabName) {
  activePreviewTab = tabName;
  if (elements.tabPackage && elements.tabDestructive) {
    if (tabName === 'package') {
      elements.tabPackage.classList.add('active');
      elements.tabDestructive.classList.remove('active');
    } else {
      elements.tabDestructive.classList.add('active');
      elements.tabPackage.classList.remove('active');
    }
  }
  updatePackagePreview();
}

function updatePackagePreview() {
  if (!elements.packagePreview) return;
  let destructiveCount = 0;
  selectedDestructiveMembers.forEach(set => { if (set instanceof Set) destructiveCount += set.size; });
  if (typeof updatePreviewTabBadges === 'function') updatePreviewTabBadges(elements, selectedMetadataTypes.size, destructiveCount);

  const previewCode = elements.packagePreview.querySelector('code');
  if (!previewCode) return;

  if (activePreviewTab === 'destructive') {
    if (selectedDestructiveMembers.size === 0 || !orgInfo) {
      previewCode.innerHTML = highlightXml('<!-- No members marked for deletion -->');
      return;
    }
    const generator = new PackageXMLGenerator(orgInfo.apiVersion);
    const destructiveTypes = [];
    selectedDestructiveMembers.forEach((memberSet, type) => {
      if (memberSet instanceof Set && memberSet.size > 0) destructiveTypes.push({ name: type, members: Array.from(memberSet) });
    });
    previewCode.innerHTML = highlightXml(generator.generateWithMembers(destructiveTypes));
    return;
  }

  if (selectedMetadataTypes.size === 0 || !orgInfo) {
    previewCode.innerHTML = highlightXml('<!-- Select metadata types to preview package.xml -->');
    return;
  }

  const retrieveTypes = Array.from(selectedMetadataTypes).map(type => {
    const members = selectedMembers.get(type);
    let memberArray = members === '*' ? ['*'] : (Array.isArray(members) ? members : (members instanceof Set ? Array.from(members) : ['*']));
    return { name: type, members: memberArray };
  });

  const generator = new PackageXMLGenerator(orgInfo.apiVersion);
  previewCode.innerHTML = highlightXml(generator.generateWithMembers(retrieveTypes));
}
