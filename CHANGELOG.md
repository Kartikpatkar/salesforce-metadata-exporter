# Changelog

All notable changes to the Salesforce Metadata Exporter will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- _No unreleased changes._

## [1.1.0] - 2026-06-03

### Added

#### 🗑️ `destructiveChanges.xml` Generation
- **Dual-manifest export**: Each metadata member row now has a **trash icon** button. Clicking it marks the component for deletion rather than retrieval.
- **Preview tab switcher**: The package preview panel now has two tabs — `📄 package.xml` (retrieve) and `🗑️ destructiveChanges.xml` (deletion manifest). Switching between tabs renders the respective XML live.
- **ZIP injection**: When exporting, if any members are marked for deletion, the downloaded ZIP automatically includes `destructiveChanges.xml` alongside `package.xml` (placed in the same folder, e.g. `unpackaged/`). No manual file creation needed.
- **Row state classes**: Member rows display a blue border when selected for retrieval (`retrieve-selected`) and a red border when marked for deletion (`destructive-selected`). Mutually exclusive — a member cannot be in both states.
- **Persistent destructive state**: Destructive selections are saved to `chrome.storage.local` and restored on extension re-open.
- **`handleMemberDestructiveClick`**: New handler manages toggling the destructive state, removing the member from the retrieval set, and syncing row CSS.

#### 🛡️ Destructive Export Safety Guards
- **Info banner**: When the `🗑️ destructiveChanges.xml` tab is active, a blue informational banner clearly explains: *"This manifest does not delete anything automatically — deploy the ZIP to apply."*
- **Amber warning badge**: Appears above the Export button whenever any members are marked for deletion, showing the count: *"Includes N member(s) marked for deletion — deploy the ZIP to apply."*
- **Confirmation modal** (`⚠️ Confirm Export with Deletions`): If the user clicks Export while destructive members exist, a modal appears listing every member marked for deletion (with metadata type badges), and reiterating that the export itself is read-only. The user must explicitly click **Continue Export** to proceed.
- Both banner and modal fully support dark mode.

#### 💾 Saved Selection Presets (Preset Manager)
- **Save named presets**: Users can save their current metadata type + member selections as a named preset.
- **Load presets**: A dropdown lists all saved presets; selecting one restores the full selection state.
- **Delete presets**: Remove individual presets from the manager.
- **Toggle visibility**: A **Presets** button in the metadata toolbar shows/hides the preset manager panel inline.
- Presets are stored in `chrome.storage.local` under `userPresets` and survive extension restarts.
- Full dark mode support for the preset manager panel.

#### 🔍 Global Metadata Search
- **Search across all member names**: A new search mode (`Members` radio button) searches within all already-expanded metadata types simultaneously, instead of just filtering metadata type names.
- Results highlight matching types and filter member lists in real time.

#### ⏹️ Stop Export Button
- The **Export Metadata** button becomes a **Stop Export** button (`⏹ Stop Export`) once an export begins.
- Clicking it sends a `CANCEL_EXPORT` message to the background service worker and stops the polling loop.
- The button reverts and UI resets when the export is cancelled or completes.

#### 🗂️ Profile & Permission Set Downsizing
- New **Profile & Permission Set Downsizing** settings panel in the Org/Profile modal.
- When enabled, the exported ZIP strips unwanted sub-sections from `.profile` and `.permissionset` XML files before download (e.g. classAccesses, fieldPermissions, objectPermissions, etc.).
- Each sub-section is independently toggleable (Keep/Strip).
- Setting persists in `chrome.storage.local` under `profileDownsizeSettings`.

### Changed

- **`renderMembers()`**: Each member is now wrapped in a `div.member-row` (flex container) instead of a bare `label`. The label and the delete button sit side-by-side inside the row.
- **`filterMembers()`**: Updated to filter `.member-row` elements (with `.member-label` fallback for backwards compatibility).
- **`selectAllMembers()`**: Clears any destructive selections that would overlap with newly retrieved members; updates row classes.
- **`clearMembers()`**: Clears **both** retrieve and destructive selections for the type; resets all row classes.
- **`handleMemberSelection()`**: On checkbox check, automatically clears any existing destructive mark for that member and syncs row CSS classes.
- **`updatePackagePreview()`**: Extended to support both the package and destructive preview tabs. Persists `destructiveChangesXmlContent` to `chrome.storage.local` in background on every update.
- **`updateExportButtonState()`**: Now enables the Export button when destructive-only members are selected (no retrieve types required).
- **`startExport()`**: Split into `startExport()` (entry point + confirmation gate) and `doStartExport()` (actual export logic).
- **`ZipHandler.downloadZip()`**: Now chains `injectDestructiveChangesIfEnabled()` → `downsizeZipIfEnabled()` → download.

### Fixed

- Export button no longer gets stuck in a disabled state if the first metadata type is added via the trash (destructive) path.


## [1.0.3] - 2026-04-09

### Added
- **Toast notifications** - Replaced alert-style messages with top-right toast notifications for info/success/error feedback
- **Persistent export progress toast** - Export progress now stays visible while in progress, with the message updating as polling continues
- **Export timeout setting** - Added an "Export Timeout (Minutes)" setting in the org/profile modal (defaults to 30, configurable)
- **SVG icon sprite** - Extracted inline SVGs into a shared sprite (`app/assets/icons.svg`) and referenced them via `<use>` for a more modular UI

### Changed
- **Export progress UI** - Removed the inline export status/progress section and moved progress messaging entirely to toasts
- **Startup selection behavior** - On extension open, restored metadata type selections default to wildcard members (`*`) so package preview/export always has a valid member selection context

### Fixed
- **Manifest icon mappings** - Corrected icon size mappings so Chrome uses the proper 16/32/48/128 assets
- **Dark mode theme toggle icon visibility** - Ensured the moon/sun icons display correctly
- **Member search input visibility** - Fixed member search text color in light mode
- Removed unused `alarms` permission (export status is polled via UI messages)
- Removed orphaned export progress/status CSS after migrating to toast-only progress

## [1.0.2] - 2026-04-08

### Fixed
- **Export timeout for large enterprise orgs** - Increased timeout from 5 minutes to 30 minutes to accommodate large Salesforce orgs with thousands of metadata components
  - Frontend polling timeout extended from 60 attempts (5 min) to 360 attempts (30 min)
  - Service worker timeout extended from 10 minutes to 30 minutes
- **Simultaneous popup connection issue** - Fixed issue where opening multiple extension popups from different orgs would all connect to the first org
  - Each popup now checks ONLY its own tab's Salesforce session
  - Disabled cache and fallback checking when popup opens to prevent cross-org contamination
  - Added explicit early return when priority tab is checked to prevent fallback to stored sessions
- **Package.xml upload member display** - Fixed issue where uploaded package.xml with specific members showed "*" (all) instead of the actual member list
  - Preview now correctly shows specific members (e.g., Account, Contact, Opportunity)
  - Member badges display correct count for uploaded selections
  - Member checkboxes are properly pre-selected when expanding metadata types
  - Export uses correct specific members from uploaded package.xml

### Added
- **Package.xml Upload Feature** - Upload existing package.xml files to auto-select metadata types and members
  - New "Upload" button in package preview section
  - Automatic parsing and validation of package.xml files
  - Auto-selection of metadata types found in uploaded package.xml
  - Support for wildcard (*) and specific member selections
  - Auto-expansion of metadata types with specific members for easy verification
  - Smart handling of metadata types not available in current org with informative messages
- **Clipboard Paste Feature** - Paste package.xml content directly from clipboard
  - New "Paste" button in package preview section
  - Reads package.xml content from system clipboard
  - Same validation and auto-selection capabilities as file upload
  - Handles permission errors gracefully
  - Shows appropriate error messages for invalid XML or empty clipboard
- **Elapsed time display** - Progress messages now show elapsed time after 1 minute (e.g., "Processing... (5m 23s elapsed)") to provide better feedback during long-running exports
- **Improved timeout error message** - More descriptive error message that includes elapsed time and suggests possible solutions when timeout occurs
- **Priority tab detection** - Extension now prioritizes checking the tab that opened the popup, ensuring correct org connection in multi-tab scenarios
- **Forced fresh session checks on popup open** - Cache is now bypassed when opening the popup to ensure accurate org detection
- **PackageXMLParser library** - New utility class for parsing and validating Salesforce package.xml files

### Changed
- **UI Reorganization** - Improved package.xml action buttons layout
  - Moved Upload, Paste, and Copy buttons to package preview section header
  - Grouped all package.xml operations together for better UX
  - Responsive design - button text hides on smaller screens, icons remain visible
  - Consistent purple theme with hover effects across all action buttons
- Enhanced user experience for large org exports with better progress visibility
- Aligned frontend and backend timeout limits to prevent premature failures
- Improved session detection logic to support multiple simultaneous popup instances with complete isolation

## [1.0.1] - 2026-01-23

### Added
- **Dark theme toggle** - Complete dark/light mode switching with localStorage persistence
- Theme toggle button with sun/moon icons in header
- Comprehensive dark mode styles for all UI components
- **Privacy Policy** (PRIVACY.md) - Added comprehensive privacy policy document for Chrome Web Store compliance
- **Contributing Guidelines** (CONTRIBUTING.md) - Created contribution guidelines with code style, testing, and security practices
- Footer year auto-update functionality

### Changed
- **CSS Architecture** - Modularized monolithic CSS into 13 focused files:
  - `base.css` - Reset, body, container, utilities
  - `header.css` - Header section and auth buttons
  - `forms.css` - Search inputs and clear buttons
  - `buttons.css` - All button variants
  - `layout.css` - Page layout and grid
  - `metadata.css` - Metadata types and members
  - `preview.css` - Package XML preview
  - `export.css` - Export section and progress
  - `modal.css` - Modal dialogs
  - `footer.css` - Footer section
  - `theme.css` - Dark theme styles
  - `responsive.css` - Media queries
  - `animations.css` - Keyframe animations
- Renamed `css/` folder to `styles/` for better clarity
- Implemented `@import` structure in index.css for cleaner HTML
- **README.md** - Completely modernized with professional format, badges, comprehensive documentation
- **Removed Font Awesome CDN** - Replaced with inline SVG icons for Chrome Web Store compliance (no remote code)
- Restored `cookies` permission (required for Salesforce session extraction)

### Removed
- Unused permissions: `scripting`, `tabs` (optimized for Chrome Web Store review)
- Font Awesome CDN dependency
- Duplicate legacy CSS code from index.css

### Fixed
- Session extraction when manually connecting to Salesforce org

## [1.0.0] - 2026-01-22

### Added
- Initial release of Salesforce Metadata Exporter
- **Salesforce Authentication**
  - Session-based authentication (no credentials stored)
  - Support for Production and Sandbox environments
  - Automatic session validation
  - Manual OAuth2 login flow
- **Metadata Selection**
  - Support for 150+ Salesforce metadata types
  - Real-time metadata search and filtering
  - Quick-select presets (Common, All, Deployable)
  - Expandable metadata types with member selection
  - Search within metadata members
  - Badge indicators showing selected member counts
  - Auto-select parent when members are selected
- **Export Functionality**
  - Generate package.xml with selected metadata
  - Export via Salesforce Metadata API (SOAP)
  - Download as ZIP file with timestamp
  - Progress tracking with visual feedback
  - Export status polling with error handling
- **User Interface**
  - Clean, modern responsive design
  - Organization info display (name, instance, user)
  - Real-time package.xml preview with copy-to-clipboard
  - Export progress bar with status messages
  - Modal notifications for errors and confirmations
  - Mobile-responsive layout
- **Architecture**
  - Chrome Extension Manifest V3
  - Service Worker for background operations
  - Content script for session detection
  - Modular JavaScript architecture
  - Comprehensive error handling and logging

### Technical Details
- **APIs Used**
  - Salesforce Metadata API v59.0 (SOAP)
  - Salesforce Tooling API (REST)
- **Permissions**
  - `storage` - Save user preferences and session data
  - `downloads` - Download ZIP files
  - `activeTab` - Detect Salesforce tabs
  - `cookies` - Extract session cookies
  - Export status polling is performed by the extension UI (no `alarms` permission)
- **Host Permissions**
  - `*.salesforce.com`
  - `*.force.com`
  - `*.cloudforce.com`
  - `*.visualforce.com`
  - `*.my.salesforce.com`

---

## Version History Summary

- **1.1.0** (Jun 2026) - destructiveChanges.xml, preset manager, global search, stop export, profile downsizing
- **1.0.3** (Apr 2026) - Toast-based UX, export timeout setting, SVG sprite icons
- **1.0.2** (Apr 2026) - Large org timeout fix + progress improvements
- **1.0.1** (Jan 2026) - Dark theme, modular CSS, Chrome Web Store prep
- **1.0.0** (Jan 2026) - Initial release

---

[Unreleased]: https://github.com/Kartikpatkar/salesforce-metadata-exporter/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/Kartikpatkar/salesforce-metadata-exporter/compare/v1.0.3...v1.1.0
[1.0.3]: https://github.com/Kartikpatkar/salesforce-metadata-exporter/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/Kartikpatkar/salesforce-metadata-exporter/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/Kartikpatkar/salesforce-metadata-exporter/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/Kartikpatkar/salesforce-metadata-exporter/releases/tag/v1.0.0
