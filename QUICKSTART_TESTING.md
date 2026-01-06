# 🚀 Quick Start Guide - Testing the SalesforceConnector Integration

## Load the Extension

1. **Open Chrome Extensions Page**:
   ```
   chrome://extensions/
   ```

2. **Enable Developer Mode**:
   - Toggle "Developer mode" in top-right corner

3. **Load Unpacked Extension**:
   - Click "Load unpacked"
   - Select the `salesforce-metadata-exporter` folder
   - Extension should appear in list

4. **Pin Extension** (Optional):
   - Click the puzzle piece icon in Chrome toolbar
   - Pin "Salesforce Metadata Exporter"

---

## Test Authentication Flow

### Test 1: Login to Production

1. **Click Extension Icon**:
   - Extension opens in new tab

2. **Initial State**:
   - Should see: "⚠️ Not connected to Salesforce"
   - Should see: "Login to Production" and "Login to Sandbox" buttons
   - Export button should be disabled

3. **Click "Login to Production"**:
   - New tab opens to `https://login.salesforce.com`
   - Enter your Salesforce credentials
   - After login, you'll be redirected to your Salesforce org

4. **Expected Result**:
   - Login tab closes automatically
   - Extension tab shows: "✅ Connected to Salesforce (Production)"
   - Org details displayed (URL, instance, etc.)
   - "Switch Org" button visible
   - Login buttons hidden

### Test 2: Login to Sandbox

1. **If Already Connected**:
   - Click "Switch Org" first
   - Confirm the prompt

2. **Click "Login to Sandbox"**:
   - New tab opens to `https://test.salesforce.com`
   - Enter sandbox credentials
   - After login, redirected to sandbox org

3. **Expected Result**:
   - Login tab closes
   - Extension shows: "✅ Connected to Salesforce (Sandbox)"
   - Org ID shows: "Sandbox Org"

### Test 3: Automatic Detection (Already Logged In)

1. **Prerequisites**:
   - Already logged into Salesforce in another tab
   - Close extension tab if open

2. **Open Extension Again**:
   - Click extension icon

3. **Expected Result**:
   - **Immediately** shows connected state (no login needed)
   - Org info populated
   - Export functionality ready

---

## Debugging

### Check Background Worker Console

1. Go to `chrome://extensions/`
2. Find "Salesforce Metadata Exporter"
3. Click "service worker" (blue link)
4. Console opens with background logs

**Look for these logs**:
```
[SalesforceConnector] Checking Salesforce auth...
[SalesforceConnector] Cookies for .salesforce.com: 12
[SalesforceConnector] Selected session cookie: sid
[Service Worker] Auth change: Connected
```

### Check App Console

1. Extension tab is already open
2. Right-click on page → "Inspect"
3. Console shows app logs

**Look for these logs**:
```
[App] Checking Salesforce authentication...
[App] Received message from background: { type: 'AUTH_CHANGED', ... }
```

### Common Issues

#### Issue: "Not connected" even after login
**Cause**: Session cookie not being set or read properly

**Fix**:
1. Check background console for cookie logs
2. Verify session cookie exists: DevTools → Application → Cookies
3. Look for cookie named `sid` or similar

#### Issue: Login opens but doesn't detect
**Cause**: REST API validation failing

**Fix**:
1. Check background console for API validation logs
2. Check Network tab for `/services/data/v59.0/limits` call
3. Verify response is 200 OK

#### Issue: Permission errors
**Cause**: Extension doesn't have required permissions

**Fix**:
1. Remove extension from `chrome://extensions/`
2. Reload extension
3. Accept all permission prompts

---

## Testing Metadata Selection (Without Export)

While metadata export isn't implemented yet, you can test the UI:

1. **Connect to Salesforce** (using login flow above)

2. **Select Metadata Types**:
   - Click individual checkboxes
   - Try preset buttons:
     - "Apex Only"
     - "Object Model"
     - "Declarative Config"
     - "Security Basics"

3. **Show Preview**:
   - Click "Show Preview" button
   - Should see generated `package.xml`
   - Verify XML contains selected metadata types

4. **Export Button**:
   - Should be **enabled** when:
     - ✅ Connected to org
     - ✅ At least one metadata type selected
   - Should be **disabled** when:
     - ❌ Not connected
     - ❌ No metadata selected

---

## Expected Console Output (Successful Flow)

### Background Worker:
```
[Service Worker] Activated
[Service Worker] Extension icon clicked
[Service Worker] Opened extension in new tab
[Service Worker] Received message: CHECK_SF_AUTH
[SalesforceConnector] Checking Salesforce auth...
[SalesforceConnector] Scanning for Salesforce tabs...
[SalesforceConnector] Cookies for .salesforce.com: 12
[SalesforceConnector] Selected session cookie: sid
[SalesforceConnector] Found authenticated session in tab: https://...my.salesforce.com
[Service Worker] Auth change: Connected
```

### App:
```
[App] Checking Salesforce authentication...
[App] Received message from background: { success: true, org: { isAuthenticated: true, ... } }
[App] Loaded saved selections: Set(0)
```

---

## Next Steps After Testing

Once authentication is working correctly:

1. ✅ Authentication is solid - powered by your proven SalesforceConnector
2. 📦 Implement Metadata API calls in `lib/salesforce-api.js`
3. 🔄 Wire up export workflow in background worker
4. 📥 Test end-to-end: Login → Select → Export → Download

---

## Quick Reference: Message Types

### App → Background:
- `CHECK_SF_AUTH` - Check authentication status
- `SF_LOGIN` - Initiate login (with `useSandbox` flag)
- `SF_SWITCH_ORG` - Clear session and switch orgs
- `START_EXPORT` - Start metadata export (not yet implemented)

### Background → App:
- `AUTH_CHANGED` - Auth state changed (auto-broadcast)
- `EXPORT_PROGRESS` - Export progress update (future)
- `EXPORT_COMPLETE` - Export finished (future)
- `EXPORT_ERROR` - Export failed (future)

---

## Success Checklist

- [ ] Extension loads without errors
- [ ] Login to Production works
- [ ] Login to Sandbox works
- [ ] Automatic detection works (when already logged in)
- [ ] Switch Org clears session correctly
- [ ] UI updates correctly (login buttons show/hide)
- [ ] Org details display correctly
- [ ] Metadata selection works
- [ ] Package.xml preview generates correctly
- [ ] Export button enables/disables correctly

---

Happy testing! 🎉

If everything works, you're ready to implement the Metadata API integration next!
