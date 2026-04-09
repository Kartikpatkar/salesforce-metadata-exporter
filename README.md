# ⚡ Salesforce Metadata Exporter – Package XML Generator & Metadata Explorer

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/Version-1.0.2-blue.svg)](#)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green.svg?logo=google-chrome)](https://chromewebstore.google.com/detail/mnkhginjgjbcmnfkcfnjbhpgnjfmeibd)
[![Salesforce](https://img.shields.io/badge/Salesforce-Metadata%20API-00A1E0.svg)](#)

> **Tagline**: *Explore, select, and export Salesforce metadata with precision — visually, securely, and effortlessly.*

---

## ✨ Overview

**Salesforce Metadata Exporter** is a modern, developer-focused **Chrome Extension** that helps you **browse Salesforce org metadata, generate deployment-ready `package.xml` files, and export metadata as ZIP packages** without manual XML writing or external tools.

Built for Salesforce developers and administrators who frequently work with:

* Metadata deployments
* Partial deployments
* CI/CD preparation
* Sandbox → Production releases
* Multi-org environments
* Metadata backup and migration

The extension focuses on **accuracy, speed, and clarity**, using **Salesforce Tooling API and Metadata API** directly — no scraping, no middleware, no credential storage.

---

## 🚀 Key Features

### 🔐 Salesforce Org Detection & Authentication

* Automatically detects the **currently active Salesforce org**
* Supports:
  * Production
  * Sandbox
  * Developer Edition
  * Scratch Orgs
* Uses existing Salesforce browser session
* No OAuth setup
* No credentials stored
* Real-time connection status indicator
* Easy org switching

---

### 🧩 Metadata Type Explorer

* Displays a searchable list of Salesforce **metadata types**
* Dynamically loads metadata types from the connected org
* Intelligent fallback to default metadata list if API discovery fails
* Quick search and filter capabilities
* Commonly supported types include:
  * ApexClass
  * ApexTrigger
  * ApexPage
  * ApexComponent
  * CustomObject
  * CustomField
  * Layout
  * Profile
  * PermissionSet
  * Flow
  * CustomMetadata
  * CustomLabel
  * Workflow
  * ValidationRule
  * RecordType
  * And many more...

---

### 📂 Metadata Component Viewer

* Click any metadata type to view **actual components present in the org**
* Uses the **correct Salesforce API per metadata type**:
  * **Tooling API** for Apex metadata
  * **Metadata API (`listMetadata`)** for configuration metadata
* Displays real-time component count with badges
* Search within components for quick filtering
* Expandable/collapsible component lists
* Gracefully handles:
  * Empty metadata
  * Unsupported metadata types
  * API errors

---

### ☑️ Fine-Grained Selection

* Select **individual metadata components** or use wildcards
* "Select All" / "Clear All" support per metadata type
* Global preset filters:
  * Select All Metadata
  * Clear All Selections
* Search within metadata components
* Visual member count badges
* Selected metadata types persist across sessions using Chrome Storage
* On extension open, selected types default to **all members** (`*`) for consistent preview/export behavior

---

### 📦 Smart `package.xml` Generator

* Generates **valid Salesforce `package.xml`**
* **Import existing package.xml** with multiple options:
  * **Upload from file** - Select package.xml file from disk
  * **Paste from clipboard** - Copy package.xml content and paste directly
  * Automatic parsing and validation
  * Smart handling of metadata types not available in current org
  * Preserves wildcard (*) and specific member selections
  * Auto-expands types with specific members for verification
* Supports:
  * Full wildcard deployment (`<members>*</members>`)
  * Partial deployments (specific components only)
* Live **package.xml preview** with syntax highlighting
* **Copy to clipboard** with one click
* Automatically updates as selections change
* Configurable Salesforce **API version** (v59.0)
* One-click **copy to clipboard** with visual feedback
* Export metadata as **downloadable ZIP package**
* Export progress shown via a **persistent toast** that stays visible and updates during long exports (includes elapsed time)
* Export timeout is configurable in the **Org/Profile modal** (default: 30 minutes)

---

### 🎨 Clean & Developer-Friendly UI

* Modern two-column layout:
  * Left: Metadata Types Selection
  * Right: Package XML Preview
* Responsive design
* **Dark / Light theme toggle** with persistent preferences
* Clean footer with social links
* Toast notifications for actions, errors, and export progress (no blocking alert popups)
* Designed for daily Salesforce development workflows
* Smooth animations and transitions

---

### 🌓 Theme Support

* **Light Mode**: Clean, modern interface with gradient backgrounds
* **Dark Mode**: Eye-friendly dark theme for extended sessions
* Instant theme switching
* Theme preference saved automatically
* All components fully styled for both modes

---

## 📸 Screenshots

### 🔷 Light Mode

![Light Mode - Editor Page](/screenshots/light-theme.png)

### 🌑 Dark Mode

![Dark Mode - Editor Page](/screenshots/dark-theme.png)

---

## 🛠 Built With

* **HTML, CSS, JavaScript (Vanilla ES Modules)**
* Chrome Extensions API (**Manifest V3**)
* Salesforce **Tooling API**
* Salesforce **Metadata API (SOAP)**
* **Modular CSS Architecture** (12 separate stylesheets)
* Service Worker for background operations
* Content scripts for session extraction
* Message-driven architecture

---

## 📦 Installation

### 🌐 Install from Chrome Web Store (Recommended)

**[📥 Get it on Chrome Web Store](https://chromewebstore.google.com/detail/mnkhginjgjbcmnfkcfnjbhpgnjfmeibd)**

1. Click the link above or visit the Chrome Web Store
2. Click **"Add to Chrome"**
3. Confirm the installation
4. Navigate to any Salesforce org and click the extension icon

---

### 🔧 Load Extension Manually (Developer Mode)

1. **Clone or Download this Repository**
   ```bash
   git clone <repository-url>
   cd salesforce-metadata-exporter
   ```

2. **Open Chrome Extensions Page**
   ```
   chrome://extensions/
   ```

3. **Enable Developer Mode**
   * Toggle **Developer mode** (top-right corner)

4. **Click "Load unpacked"**
   * Select the project root folder (contains `manifest.json`)

5. **Done 🎉**
   * Navigate to any Salesforce org
   * Click the extension icon to open the exporter

> ✅ Works with existing Salesforce login
> ✅ No external servers
> ✅ No data stored outside the browser
> ✅ Supports multiple orgs

---

## 🎯 How to Use

1. **Login to Salesforce**
   * Open any Salesforce org in Chrome
   * Login as you normally would

2. **Open the Extension**
   * Click the extension icon
   * Click "Login to Production" or "Login to Sandbox"

3. **Select Metadata Types**
   * **Option A: Manual Selection**
     * Browse available metadata types
     * Click to expand and view components
     * Select individual components or use wildcards
     * Use "Select All" / "Clear" buttons for quick actions
   * **Option B: Import from existing package.xml** 📤
     * **Upload**: Click "Upload" button in preview section → Select package.xml file
     * **Paste**: Copy package.xml content → Click "Paste" button
     * Components will be auto-selected based on the content
     * Review and modify selections as needed

4. **Preview Package XML**
   * View the generated package.xml in real-time
   * Click "Copy" button to copy to clipboard

5. **Export Metadata**
   * Click "Export Metadata as ZIP"
  * Monitor progress in the top-right persistent toast (updates + elapsed time)
  * Optional: adjust **Export Timeout (Minutes)** in the Org/Profile modal if needed
   * Download completes automatically

---

## 🧪 Current Capabilities

✅ Salesforce org auto-detection
✅ Production and Sandbox support
✅ Metadata type discovery
✅ Metadata component listing (Tooling API + Metadata API)
✅ Individual member selection
✅ Partial & full `package.xml` generation
✅ Live XML preview with syntax highlighting
✅ Copy to clipboard functionality
✅ **ZIP export with Metadata API retrieve()**
✅ Export progress tracking via persistent updating toast
✅ Saved metadata type selections (members default to `*` on open)
✅ Dark / light theme toggle
✅ Clear search buttons
✅ Member count badges
✅ Responsive design
✅ Modern modular CSS architecture

---

## 🛣️ Roadmap (Planned Enhancements)

* 📦 Enhanced ZIP content preview
* 🧨 `destructiveChanges.xml` generation
* 👤 Profile & PermissionSet sub-component selection
* 🔍 Advanced metadata search across types
* 🔄 Org-to-org metadata comparison
* 💾 Saved package presets
* 📊 Metadata dependency visualization
* 🏷️ Custom metadata type grouping
* ⚡ Batch export optimization
* 🔔 Export completion notifications

---

## 🔐 Security & Privacy

### Security Principles

1. **No Credential Storage**: Never stores username, password, or security tokens
2. **Session-Based Auth**: Uses existing logged-in session only
3. **Manual Trigger**: All exports require explicit user action
4. **Minimal Permissions**: Only requests necessary Chrome permissions
5. **HTTPS Only**: All Salesforce API calls use HTTPS
6. **No External Servers**: All processing happens client-side
7. **Open Source**: Full transparency, audit-friendly code

### Chrome Permissions

| Permission | Justification |
|------------|---------------|
| `storage` | Save user preferences (theme, selections, export timeout) |
| `downloads` | Trigger ZIP file download |
| `activeTab` | Access current Salesforce tab for org detection |
| `cookies` | Extract Salesforce session cookies for authenticated API calls |
| Host permissions (`*.salesforce.com`) | Communicate with Salesforce APIs |

---

## 🤝 Contributing

Contributions, bug reports, and feature requests are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please keep changes modular and follow the existing code structure.

---

## 📚 Resources

### Project Documentation

* [CHANGELOG](CHANGELOG.md) - Version history and release notes
* [CONTRIBUTING](CONTRIBUTING.md) - Contribution guidelines
* [PRIVACY](PRIVACY.md) - Privacy policy

### Salesforce Documentation

* [Metadata API Developer Guide](https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/)
* [Tooling API Developer Guide](https://developer.salesforce.com/docs/atlas.en-us.api_tooling.meta/api_tooling/)
* [package.xml Reference](https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_package_xml.htm)
* [Metadata Types Coverage](https://developer.salesforce.com/docs/metadata-coverage)

### Chrome Extension Documentation

* [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
* [Chrome Extensions API](https://developer.chrome.com/docs/extensions/reference/)
* [Service Workers in Extensions](https://developer.chrome.com/docs/extensions/mv3/service_workers/)

---

## 🤝 Contributing

Contributions, bug reports, and feature requests are welcome!

* Fork the repository
* Create a feature branch
* Submit a pull request

Please keep changes modular and follow the existing code structure.

---

## 🧠 Author

Built by **Kartik Patkar**
Salesforce Developer • Chrome Extension Builder

---

## 📜 License

This project is licensed under the **MIT License** — free to use, modify, and distribute.

---

> **Salesforce Metadata Exporter** — because deployments should be precise, fast, and stress-free 🚀

---