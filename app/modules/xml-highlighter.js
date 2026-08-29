/**
 * XML Syntax Highlighter & Preview Tab Utilities
 */

/**
 * Simple, fast XML syntax highlighter
 * @param {string} xml - Raw XML string
 * @returns {string} HTML string with syntax highlighting classes
 */
export function highlightXml(xml) {
  if (!xml) return '';
  let escaped = xml
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // Highlight comments
  escaped = escaped.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="xml-comment">$1</span>');

  // Highlight XML tags & attributes
  escaped = escaped.replace(/(&lt;\/?)([\w:-]+)([\s\S]*?)(\/?&gt;)/g, (match, open, tagName, attrs, close) => {
    const formattedAttrs = attrs.replace(/([\w:-]+)=(&quot;.*?&quot;)/g, '<span class="xml-attr-name">$1</span>=<span class="xml-attr-value">$2</span>');
    return `<span class="xml-tag">${open}<span class="xml-tag-name">${tagName}</span>${formattedAttrs}${close}</span>`;
  });

  return escaped;
}

/**
 * Update preview tab count badges
 * @param {Object} tabs - DOM elements for tabPackage and tabDestructive
 * @param {number} packageCount - Number of package types
 * @param {number} destructiveCount - Number of destructive members
 */
export function updatePreviewTabBadges(tabs, packageCount, destructiveCount) {
  if (tabs.tabPackage) {
    tabs.tabPackage.innerHTML = `📄 package.xml <span class="tab-count-badge">${packageCount}</span>`;
  }
  if (tabs.tabDestructive) {
    tabs.tabDestructive.innerHTML = `🗑️ destructiveChanges.xml <span class="tab-count-badge">${destructiveCount}</span>`;
  }
}
