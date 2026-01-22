# � Salesforce Metadata Exporter – Package XML Generator & Metadata Explorer

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/Version-1.0.0-blue.svg)](#)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green.svg?logo=google-chrome)](#)
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
* Selections persist across sessions using Chrome Storage

---

### 📦 Smart `package.xml` Generator

* Generates **valid Salesforce `package.xml`**
* Supports:
  * Full wildcard deployment (`<members>*</members>`)
  * Partial deployments (specific components only)
* Live **package.xml preview** with syntax highlighting
* Automatically updates as selections change
* Configurable Salesforce **API version** (v59.0)
* One-click **copy to clipboard** with visual feedback
* Export metadata as **downloadable ZIP package**
* Real-time export progress tracking

---

### 🎨 Clean & Developer-Friendly UI

* Modern two-column layout:
  * Left: Metadata Types Selection
  * Right: Package XML Preview
* Responsive design
* **Dark / Light theme toggle** with persistent preferences
* Clean footer with social links
* Toast notifications for actions and errors
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

> Beautiful, modern interface with vibrant gradients and clear typography

### 🌑 Dark Mode

> Eye-friendly dark theme perfect for late-night deployments

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
   * Browse available metadata types
   * Click to expand and view components
   * Select individual components or use wildcards

4. **Preview Package XML**
   * View the generated package.xml in real-time
   * Copy to clipboard or download

5. **Export Metadata**
   * Click "Export Metadata as ZIP"
   * Monitor progress
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
✅ Export progress tracking
✅ Persistent selections (Chrome Storage)
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
| `storage` | Save user's metadata type selections and theme preference |
| `downloads` | Trigger ZIP file download |
| `activeTab` | Access current Salesforce tab for org detection |
| `tabs` | Query and manage tabs for opening extension |
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

## 🧠 Author

**Built with ❤️ by Salesforce Developers, for Salesforce Developers**

Connect:
* 🌐 GitHub: [Your GitHub Profile]
* 💼 LinkedIn: [Your LinkedIn]
* 🏔️ Trailhead: [Your Trailhead Profile]

---

## 📜 License

This project is licensed under the **MIT License** — free to use, modify, and distribute.

See [LICENSE](LICENSE) file for details.

---

> **Salesforce Metadata Exporter** — because deployments should be precise, fast, and stress-free 🚀

---

**Status**: ✅ Production Ready  
**Last Updated**: January 2026