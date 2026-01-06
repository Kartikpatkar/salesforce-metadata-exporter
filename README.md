# 🚀 Salesforce Metadata Exporter

A **Chrome Extension** (Manifest V3) that allows users to export Salesforce **metadata only** (not data records) as a downloadable ZIP file using the Salesforce Metadata API.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Manifest](https://img.shields.io/badge/manifest-v3-green)
![Chrome](https://img.shields.io/badge/chrome-88+-brightgreen)

---

## 🎯 Project Overview

This extension enables Salesforce administrators and developers to quickly export metadata (Apex classes, custom objects, flows, etc.) from any Salesforce org they're logged into, without requiring API credentials or external tools.

### ✅ Key Features

- **Org Detection**: Automatically detects logged-in Salesforce org
- **Metadata Selection**: Choose specific metadata types via checkboxes
- **Preset Filters**: Quick selection presets (Apex Only, Object Model, etc.)
- **package.xml Preview**: Review generated package.xml before export
- **Safe Export**: Uses existing session (no credential storage)
- **ZIP Download**: Download metadata as a standard Salesforce ZIP package

### 🚫 What This Extension Does NOT Do

- Export data records (no accounts, contacts, opportunities, etc.)
- Store Salesforce credentials
- Run scheduled/background exports
- Scrape Salesforce UI
- Upload to external servers

---

## 📁 Project Structure

```
salesforce-metadata-exporter/
├── manifest.json              # Chrome Extension manifest (Manifest V3)
├── app/
│   ├── index.html            # Main extension app page
│   ├── index.css             # App styles (full-page design)
│   └── index.js              # App controller logic
├── background/
│   └── service-worker.js     # Background service worker (export orchestration)
├── content/
│   └── content-script.js     # Salesforce page detection & session extraction
├── lib/
│   ├── salesforce-api.js     # Salesforce Metadata API client (SOAP)
│   ├── package-xml-generator.js  # package.xml builder
│   ├── org-detector.js       # Org information extractor
│   └── zip-handler.js        # ZIP file download handler
├── icons/
│   ├── icon16.png            # 16x16 toolbar icon
│   ├── icon48.png            # 48x48 management icon
│   ├── icon128.png           # 128x128 web store icon
│   └── README.md             # Icon design guidelines
├── LICENSE
└── README.md
```

---

## 🛠️ Development Setup

### Prerequisites

- **Chrome Browser**: Version 88 or higher
- **Node.js** (optional): For future build tooling
- **Salesforce Org**: Developer org or sandbox for testing

### Installation (Development Mode)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd salesforce-metadata-exporter
   ```

2. **Create placeholder icons** (required for extension to load)
   ```bash
   cd icons
   # Use ImageMagick:
   convert -size 16x16 xc:#0070D2 icon16.png
   convert -size 48x48 xc:#0070D2 icon48.png
   convert -size 128x128 xc:#0070D2 icon128.png
   
   # Or use Python (see icons/README.md for details)
   ```

3. **Load extension in Chrome**
   - Open Chrome and navigate to: `chrome://extensions/`
   - Enable **Developer mode** (toggle in top-right)
   - Click **Load unpacked**
   - Select the `salesforce-metadata-exporter` folder

4. **Verify installation**
   - Extension icon should appear in Chrome toolbar
   - Click icon to see popup (will show error if not on Salesforce page)

---

## 🧪 Testing

### Manual Testing Workflow

1. **Navigate to a Salesforce org**
   - Log into any Salesforce org (Developer Edition, Sandbox, or Production)
   - Go to any Salesforce page (Setup, Object Manager, etc.)

2. **Open extension popup**
   - Click the extension icon in Chrome toolbar
   - Verify org information is detected and displayed

3. **Select metadata types**
   - Check desired metadata types (e.g., ApexClass, CustomObject)
   - Try preset buttons (Apex Only, Object Model, etc.)

4. **Preview package.xml**
   - Click "Show Preview" to view generated package.xml
   - Verify XML structure is correct

5. **Export metadata**
   - Click "Export Metadata" button
   - Monitor progress indicators
   - Verify ZIP file downloads successfully

### Test Cases

- [ ] Org detection on Lightning Experience page
- [ ] Org detection on Salesforce Classic page
- [ ] Org detection on Visualforce page
- [ ] Session ID extraction
- [ ] Metadata type selection persistence
- [ ] package.xml generation correctness
- [ ] Metadata API retrieve call
- [ ] Retrieve status polling
- [ ] ZIP file download
- [ ] Error handling (invalid session, API errors)

---

## 🏗️ Architecture

### Component Responsibilities

| Component | Responsibility | Technology |
|-----------|---------------|------------|
| **index.js** | UI controller, user interaction | ES Modules, Chrome APIs |
| **service-worker.js** | Tab management, export orchestration, API polling | Service Worker, chrome.alarms |
| **content-script.js** | Org detection, session extraction | Content Script, DOM APIs |
| **salesforce-api.js** | Metadata API SOAP client | Fetch API, XML parsing |
| **package-xml-generator.js** | Generate package.xml | XML generation |
| **org-detector.js** | Extract org metadata | DOM parsing |
| **zip-handler.js** | Process and download ZIP | Chrome Downloads API |

### Data Flow

```
1. User clicks extension icon
   ↓
2. Extension opens in new tab (app/index.html)
   ↓
3. App queries for Salesforce tabs
   ↓
4. App → Content Script: "GET_ORG_INFO"
   ↓
5. Content Script extracts org info + session ID
   ↓
6. App displays org info, user selects metadata types
   ↓
7. User clicks "Export" → App → Service Worker: "START_EXPORT"
   ↓
8. Service Worker:
   - Generates package.xml
   - Calls Metadata API retrieve()
   - Starts polling with chrome.alarms
   ↓
9. Service Worker polls retrieve status every 5 seconds
   ↓
10. When complete: Downloads ZIP via chrome.downloads API
    ↓
11. User receives ZIP file in Downloads folder
```

---

## 🔐 Security & Privacy

### Security Principles

1. **No Credential Storage**: Never stores username, password, or security tokens
2. **Session-Based Auth**: Uses existing logged-in session only
3. **Manual Trigger**: All exports require explicit user action (no automation)
4. **Minimal Permissions**: Only requests necessary Chrome permissions
5. **HTTPS Only**: All Salesforce API calls use HTTPS
6. **No External Servers**: All processing happens client-side

### Chrome Permissions

| Permission | Justification |
|------------|---------------|
| `storage` | Save user's metadata type selections |
| `downloads` | Trigger ZIP file download |
| `activeTab` | Access current Salesforce tab for org detection |
| `tabs` | Query and manage tabs for opening extension in new tab |
| Host permissions (`*.salesforce.com`) | Communicate with Salesforce Metadata API |

### Data Handling

- **Session ID**: Extracted on-demand, never persisted
- **Org Info**: Cached in chrome.storage.local (cleared on tab close)
- **Metadata ZIP**: Downloaded directly to user's machine, never uploaded

---

## 🚧 Current Status

### ✅ Completed (Phase 1 - MVP Setup)

- [x] Project structure created
- [x] Manifest V3 configuration
- [x] Popup UI (HTML/CSS/JS)
- [x] Background service worker stub
- [x] Content script stub
- [x] Utility modules (API, generator, detector, ZIP handler)
- [x] Icon placeholders and documentation

### 🔄 In Progress

- [ ] Implement session ID extraction (content-script.js)
- [ ] Implement Salesforce Metadata API SOAP calls
- [ ] Implement retrieve status polling
- [ ] Integrate ZIP download functionality
- [ ] Error handling and user feedback

### 📋 Upcoming (Phase 2)

- [ ] Production icon design
- [ ] Comprehensive error messages
- [ ] Unit tests
- [ ] Performance optimization
- [ ] Chrome Web Store listing preparation

---

## 📝 Development Notes

### TODO Markers

The codebase uses `TODO:` comments to mark areas requiring implementation:

```bash
# Find all TODOs:
grep -r "TODO:" --include="*.js"
```

### Key Implementation Areas

1. **Session Extraction** ([content/content-script.js](content/content-script.js))
   - Extract session ID from cookies or DOM
   - Handle different Salesforce UI types (Lightning, Classic, Visualforce)

2. **Metadata API Client** ([lib/salesforce-api.js](lib/salesforce-api.js))
   - Build SOAP envelopes for retrieve() and checkRetrieveStatus()
   - Parse SOAP responses (XML)
   - Handle API errors

3. **Polling Logic** ([background/service-worker.js](background/service-worker.js))
   - Use chrome.alarms for periodic status checks
   - Handle timeout scenarios
   - Clean up after completion/failure

4. **ZIP Processing** ([lib/zip-handler.js](lib/zip-handler.js))
   - Decode Base64 ZIP content
   - Trigger Chrome download
   - Validate ZIP integrity

---

## 🤝 Contributing

### Code Style

- **ES Modules**: Use `import/export` syntax
- **Comments**: Explain Salesforce-specific logic
- **Error Handling**: Defensive programming, handle all edge cases
- **Naming**: Clear, descriptive variable/function names

### Pull Request Process

1. Create feature branch from `main`
2. Implement changes with comprehensive comments
3. Test manually in Chrome with real Salesforce org
4. Update README if adding new features
5. Submit PR with detailed description

---

## 📚 Resources

### Salesforce Documentation

- [Metadata API Developer Guide](https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/)
- [package.xml Reference](https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_package_xml.htm)
- [Metadata Types Coverage](https://developer.salesforce.com/docs/metadata-coverage)

### Chrome Extension Documentation

- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Chrome Extensions API](https://developer.chrome.com/docs/extensions/reference/)
- [Service Workers in Extensions](https://developer.chrome.com/docs/extensions/mv3/service_workers/)

---

## 📄 License

See [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built for Salesforce administrators and developers
- Follows Chrome Web Store best practices
- Respects Salesforce API guidelines and rate limits

---

**Status**: 🏗️ In Development (MVP Phase 1)  
**Last Updated**: January 2026