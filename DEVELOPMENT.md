# Development Checklist

This file tracks the implementation progress for the Salesforce Metadata Exporter Chrome Extension.

## 📋 Phase 1: MVP Setup ✅

- [x] Create project structure
- [x] Write manifest.json (Manifest V3)
- [x] Create popup UI (HTML/CSS/JS)
- [x] Stub background service worker
- [x] Stub content script
- [x] Create utility modules
  - [x] salesforce-api.js
  - [x] package-xml-generator.js
  - [x] org-detector.js
  - [x] zip-handler.js
- [x] Create icon placeholders
- [x] Write comprehensive README

## 📋 Phase 2: Core Implementation 🔄

### Content Script (content/content-script.js)
- [ ] Implement `extractSessionId()` function
  - [ ] Extract from cookies (Classic UI)
  - [ ] Extract from DOM (Lightning Experience)
  - [ ] Extract from window context (inject script)
  - [ ] Handle session expiration detection
- [ ] Test session extraction on different Salesforce UI types
  - [ ] Lightning Experience
  - [ ] Salesforce Classic
  - [ ] Visualforce pages
- [ ] Implement error handling for session extraction failures

### Salesforce API Client (lib/salesforce-api.js)
- [ ] Complete `buildRetrieveRequest()` SOAP envelope
- [ ] Complete `buildCheckStatusRequest()` SOAP envelope
- [ ] Implement `parseRetrieveResponse()` XML parsing
- [ ] Implement `parseStatusResponse()` XML parsing
- [ ] Add SOAP fault error handling
- [ ] Test with real Salesforce API
  - [ ] Successful retrieve
  - [ ] Failed retrieve (invalid session)
  - [ ] API timeout handling

### Background Service Worker (background/service-worker.js)
- [ ] Implement `initiateMetadataRetrieve()` function
- [ ] Set up chrome.alarms for polling
- [ ] Implement `pollRetrieveStatus()` logic
- [ ] Handle retrieve completion
- [ ] Handle retrieve failure
- [ ] Implement timeout logic (10-minute max)
- [ ] Test polling mechanism
- [ ] Test state persistence across service worker restarts

### Popup Controller (popup/popup.js)
- [ ] Implement `detectSalesforceOrg()` - call content script
- [ ] Implement `loadSavedSelections()` from chrome.storage
- [ ] Implement `saveSelections()` to chrome.storage
- [ ] Implement `startExport()` - send message to service worker
- [ ] Handle background messages (progress updates)
- [ ] Test UI state updates
- [ ] Remove development stubs

### ZIP Handler (lib/zip-handler.js)
- [ ] Test `base64ToArrayBuffer()` with real ZIP data
- [ ] Implement `validateZipHeader()` checks
- [ ] Test chrome.downloads.download() functionality
- [ ] Handle download failures/cancellations

### Package XML Generator (lib/package-xml-generator.js)
- [ ] Validate against real Salesforce API
- [ ] Add more metadata types to `validMetadataTypes`
- [ ] Test XML generation with various combinations

### Org Detector (lib/org-detector.js)
- [ ] Improve org ID extraction
- [ ] Improve API version detection
- [ ] Test on various Salesforce org types

## 📋 Phase 3: Testing & Polish

### Functional Testing
- [ ] End-to-end export test (Lightning Experience)
- [ ] End-to-end export test (Classic UI)
- [ ] Test all metadata type combinations
- [ ] Test preset buttons
- [ ] Test package.xml preview
- [ ] Test error scenarios
  - [ ] Not on Salesforce page
  - [ ] Session expired
  - [ ] No metadata selected
  - [ ] API rate limiting
  - [ ] Network failure
  - [ ] Invalid org

### UI/UX Testing
- [ ] Test popup responsiveness
- [ ] Test all button states
- [ ] Test progress indicators
- [ ] Test error message display
- [ ] Verify accessibility (keyboard navigation)
- [ ] Cross-browser testing (Chrome, Edge, Brave)

### Performance Testing
- [ ] Test with large metadata sets
- [ ] Test concurrent exports
- [ ] Monitor memory usage
- [ ] Check service worker lifecycle

### Security Review
- [ ] Verify no credential storage
- [ ] Verify HTTPS-only API calls
- [ ] Verify CSP compliance
- [ ] Review permissions (minimal set)
- [ ] Test session handling security

## 📋 Phase 4: Production Preparation

### Documentation
- [ ] Create user guide (how to use)
- [ ] Document known limitations
- [ ] Write troubleshooting guide
- [ ] Add FAQ section
- [ ] Create video demo

### Chrome Web Store Preparation
- [ ] Design production icons (16x16, 48x48, 128x128)
- [ ] Create promotional images (1400x560, 440x280)
- [ ] Write store description
- [ ] Create privacy policy document
- [ ] Prepare screenshots
- [ ] Set up developer account

### Code Quality
- [ ] Remove all TODO comments (or address them)
- [ ] Remove development stubs
- [ ] Add JSDoc comments to all functions
- [ ] Run linter (ESLint)
- [ ] Optimize bundle size
- [ ] Minify code (optional)

### Final Checks
- [ ] Version bump (1.0.0)
- [ ] Update LICENSE file
- [ ] Update CHANGELOG
- [ ] Final security audit
- [ ] Test on clean Chrome profile
- [ ] Test on different operating systems
  - [ ] macOS
  - [ ] Windows
  - [ ] Linux

## 📋 Phase 5: Deployment

### Chrome Web Store Submission
- [ ] Submit extension for review
- [ ] Respond to review feedback (if any)
- [ ] Publish extension
- [ ] Monitor reviews and ratings
- [ ] Set up support email

### Post-Launch
- [ ] Monitor error reports
- [ ] Track user feedback
- [ ] Plan feature roadmap
- [ ] Set up analytics (optional, privacy-respecting)

---

## 🎯 Next Immediate Steps

1. **Create placeholder icons** to allow extension to load
   ```bash
   cd icons
   # Use one of the methods in icons/README.md
   ```

2. **Load extension in Chrome** and verify it loads without errors
   - chrome://extensions/ → Load unpacked

3. **Start implementing session extraction**
   - Focus on content/content-script.js
   - Test on a real Salesforce org

4. **Implement SOAP API client**
   - Focus on lib/salesforce-api.js
   - Test with Salesforce Metadata API

---

**Last Updated**: January 2026  
**Current Phase**: Phase 2 - Core Implementation
