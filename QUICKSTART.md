# 🚀 Quick Start Guide

## Get the Extension Running in 5 Minutes

### Step 1: Create Icon Placeholders (1 minute)

The extension needs icon files to load. Choose ONE method:

#### Option A: Using ImageMagick (recommended for macOS/Linux)
```bash
cd icons
convert -size 16x16 xc:#0070D2 icon16.png
convert -size 48x48 xc:#0070D2 icon48.png
convert -size 128x128 xc:#0070D2 icon128.png
```

#### Option B: Using Python
```bash
cd icons
python3 << 'EOF'
from PIL import Image
color = (0, 112, 210)  # Salesforce blue
Image.new('RGB', (16, 16), color).save('icon16.png')
Image.new('RGB', (48, 48), color).save('icon48.png')
Image.new('RGB', (128, 128), color).save('icon128.png')
print("Icons created!")
EOF
```

#### Option C: Manual (any platform)
1. Download any 3 small images from the internet
2. Rename them to: `icon16.png`, `icon48.png`, `icon128.png`
3. Place them in the `icons/` folder

### Step 2: Load Extension in Chrome (2 minutes)

1. Open Chrome and go to: `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Navigate to and select: `salesforce-metadata-exporter` folder
5. Click **Select** or **Open**

✅ You should see "Salesforce Metadata Exporter" in your extensions list!

### Step 3: Test the Extension (2 minutes)

1. **Log into a Salesforce org**
   - If you don't have one, create a free Developer Edition: https://developer.salesforce.com/signup

2. **Open the extension**
   - Click the extension icon in Chrome toolbar (or find it in the extensions menu)
   - Extension opens in a new tab

3. **What you'll see**:
   - Full-page app interface
   - "Detecting Salesforce org..." message (will detect if you have Salesforce tabs open)
   - (Currently shows mock data - real implementation pending)

---

## Current State ⚠️

This is a **Phase 1 MVP skeleton**. The UI works, but core functionality is stubbed:

### ✅ What Works Now
- Extension loads in Chrome
- Extension opens in new tab when icon is clicked
- Full-page UI displays correctly
- Metadata type selection works
- package.xml preview generates (mock data)
- UI animations and styling
- Responsive design for different screen sizes

### 🔄 What's Stubbed (Not Yet Implemented)
- Real Salesforce session detection
- Actual Metadata API calls
- Retrieve status polling
- ZIP file download

See [DEVELOPMENT.md](DEVELOPMENT.md) for implementation roadmap.

---

## Next Steps for Developers

### Immediate Implementation Priorities

1. **Session Extraction** ([content/content-script.js](content/content-script.js))
   - Extract session ID from Salesforce page
   - Test on Lightning Experience and Classic UI

2. **Metadata API Client** ([lib/salesforce-api.js](lib/salesforce-api.js))
   - Implement SOAP request builders
   - Test with real Salesforce API

3. **Service Worker Polling** ([background/service-worker.js](background/service-worker.js))
   - Implement chrome.alarms polling
   - Handle retrieve status checking

4. **App-to-Content Communication** ([app/index.js](app/index.js))
   - Implement tab querying and messaging
   - Get org info from Salesforce tabs

### Recommended Development Workflow

```bash
# 1. Make changes to code
# 2. Reload extension in Chrome
#    - Go to chrome://extensions/
#    - Click refresh icon on "Salesforce Metadata Exporter"
# 3. Test on Salesforce org
# 4. Check Chrome DevTools console for errors
#    - Right-click extension popup → Inspect
#    - Or: chrome://extensions/ → Service Worker → Inspect
```

---

## Troubleshooting

### Extension doesn't open when clicking icon
- **Error**: Nothing happens when clicking extension icon
- **Fix**: Check Chrome DevTools console in service worker
  - Go to chrome://extensions/
  - Click "Service Worker" link
  - Check console for errors

### "Detecting org..." stuck
- **Expected**: Session extraction not yet implemented
- **Current behavior**: Shows mock data or error if no Salesforce tabs are open

### Service worker errors
- **Check**: chrome://extensions/ → Service Worker → Inspect
- **View logs**: Look for `[Service Worker]` prefix in console

### App page is blank
- **Check**: Right-click on page → Inspect → Console
- **Look for**: JavaScript errors or module loading issues

### Service worker errors
- **Check**: chrome://extensions/ → Service Worker → Inspect
- **View logs**: Look for `[Service Worker]` prefix in console

---

## app/index.js](app/index

### Core Files You'll Edit Most

| File | Purpose | Start Here If... |
|------|---------|------------------|
| [popup/popup.js](popup/popup.js) | UI logic | You want to change UI behavior |
| [content/content-script.js](content/content-script.js) | Session extraction | You want to detect Salesforce org |
| [background/service-worker.js](background/service-worker.js) | Export orchestration | You want to implement API calls |
| [lib/salesforce-api.js](lib/salesforce-api.js) | Metadata API | You want to call Salesforce API |

### Supporting Files
app/index.html](app/index.html) | App page structure |
| [app/index.css](app/index.css) | App page
|------|---------|
| [lib/package-xml-generator.js](lib/package-xml-generator.js) | Generate package.xml |
| [lib/org-detector.js](lib/org-detector.js) | Extract org info |
| [lib/zip-handler.js](lib/zip-handler.js) | Download ZIP files |
| [popup/popup.html](popup/popup.html) | Popup structure |
| [popup/popup.css](popup/popup.css) | Popup styles |

---

## Helpful Commands

```bash
# Search for all TODO comments
grep -r "TODO:" --include="*.js" .

# View all JavaScript files
find . -name "*.js" -type f

# Check file structure
tree -I 'node_modules|.git'

# View manifest
cat manifest.json

# Check Chrome extension errors (from terminal)
# (This requires Chrome DevTools Protocol - advanced)
```

---

## Resources

### Essential Reading
1. [README.md](README.md) - Full project documentation
2. [DEVELOPMENT.md](DEVELOPMENT.md) - Implementation checklist
3. [icons/README.md](icons/README.md) - Icon design guide

### External Documentation
- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [Salesforce Metadata API](https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/)
- [Chrome Downloads API](https://developer.chrome.com/docs/extensions/reference/downloads/)

---

## Getting Help

### Debug Steps
1. Check Chrome DevTools console (popup inspector)
2. Check service worker console (chrome://extensions/)
3. Look for error messages in code comments
4. Search codebase for similar implementations

### Common Issues
- **Session not found**: Implement `extractSessionId()` in content script
- **API errors**: Check SOAP envelope format in salesforce-api.js
- **Download fails**: Verify chrome.downloads permission in manifest

---

**Ready to develop?** Start with implementing session extraction! 🚀

See [DEVELOPMENT.md](DEVELOPMENT.md) Phase 2 checklist for detailed implementation steps.
