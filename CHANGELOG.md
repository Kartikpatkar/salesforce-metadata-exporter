# Changelog

All notable changes to the Salesforce Metadata Exporter will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
  - `alarms` - Poll export status
- **Host Permissions**
  - `*.salesforce.com`
  - `*.force.com`
  - `*.cloudforce.com`
  - `*.visualforce.com`
  - `*.my.salesforce.com`

---

## Version History Summary

- **1.0.2** (Apr 2026) - Large org timeout fix + progress improvements
- **1.0.1** (Jan 2026) - Dark theme, modular CSS, Chrome Web Store prep
- **1.0.0** (Jan 2026) - Initial release

---

[1.0.2]: https://github.com/Kartikpatkar/salesforce-metadata-exporter/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/Kartikpatkar/salesforce-metadata-exporter/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/Kartikpatkar/salesforce-metadata-exporter/releases/tag/v1.0.0
