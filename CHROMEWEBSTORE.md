# Chrome Web Store Listing — Salesforce Metadata Exporter

> Last Updated: 2026-06-03

## Store Listing

**Extension Name** [REQUIRED]
Salesforce Metadata Exporter

**Short Description** [REQUIRED]
Export Salesforce metadata (Apex, objects, layouts) as a ZIP file with one click. Supports package.xml upload and paste.

**Detailed Description** [REQUIRED]
🚀 What is Salesforce Metadata Exporter?

Salesforce Metadata Exporter is a lightweight Chrome extension that allows Salesforce developers and technical admins to export Salesforce metadata configuration files directly from a logged-in org into a downloadable ZIP file using the Metadata API.

It is designed for quick audits, reviews, backups of configuration, and development workflows — without needing CLI tools or complex setups.

✅ What This Extension Does

With a single click, you can export Salesforce metadata such as:
• Custom Objects & Fields
• Validation Rules & Record Types
• Page Layouts & Compact Layouts
• Apex Classes & Triggers
• Aura & Lightning Web Components (LWC)
• Permission Sets & Profiles
• Custom Metadata Types
• Flows (metadata definitions only)

You can select what to export using a simple checkbox-based interface or use built-in presets.

🔥 Key Features:
• Upload package.xml — Automatically check metadata types and members from an existing package file.
• Paste package.xml — Paste package XML content directly from your clipboard to auto-select types.
• Configurable Timeout — Customize the export timeout limit to support large enterprise orgs.
• Real-time Progress — View the status, elapsed time, and download completion status in real-time.
• Reliable Sessions — Automatically detects Salesforce instances and active browser cookies.

🔐 Safe by Design
• Metadata only — No business or customer data records are ever accessed or exported.
• No credentials stored — Uses your existing active Salesforce browser session cookies.
• Local execution — All exports happen locally in your browser; no external servers or remote endpoints are involved.

👨‍💻 Who Is This For?
• Salesforce Developers
• Salesforce Architects
• Release Managers
• Technical Admins / Consultants

If you need a fast way to export Salesforce configuration without setting up Salesforce CLI or ANT, this tool is for you.

---
Found a bug or have a suggestion? Get in touch at kartikkp.assets@gmail.com or open an issue at https://github.com/Kartikpatkar/salesforce-metadata-exporter.

**Category** [REQUIRED]
Developer Tools

**Single Purpose** [REQUIRED]
Exports Salesforce metadata configurations into a downloadable ZIP file using the Metadata API.

**Primary Language** [REQUIRED]
English

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ✅ Ready | `icons/icon128.png` |
| Screenshot 1 [REQUIRED] | 1280×800 or 640×400 | ✅ Ready | `screenshots/light-theme-main-page.png` |
| Screenshot 2 [RECOMMENDED] | 1280×800 or 640×400 | ✅ Ready | `screenshots/dark-theme-main-page.png` |
| Screenshot 3 [RECOMMENDED] | 1280×800 or 640×400 | ✅ Ready | `screenshots/light-theme-profile-page.png` |
| Small Promo Tile [RECOMMENDED] | 440×280 | ⬜ Not created | *Needs to be generated for promotion* |

### Screenshot Notes
• Screenshot 1: Shows the main dashboard in Light Mode with metadata types selected and the `package.xml` XML preview.
• Screenshot 2: Shows the main dashboard in Dark Mode, highlighting the clean developer-friendly dark theme.
• Screenshot 3: Shows the active Org Details modal showing the connected URL, instance, and customizable export settings.

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `storage` | permissions | Used to save user's selected metadata types and custom timeout settings locally across browser sessions. |
| `downloads` | permissions | Required to trigger the browser download of the compiled metadata ZIP file once Salesforce API processing finishes. |
| `activeTab` | permissions | Allows the extension to extract the URL of the tab where the action was clicked to identify the target Salesforce org context. |
| `cookies` | permissions | Used to query active session cookies ('sid') from the Salesforce domain in order to authenticate API requests directly. |
| `https://*.salesforce.com/*` | host_permissions | Allows the background script to make SOAP/REST web requests to the user's active Salesforce domain for metadata querying. |
| `https://*.lightning.force.com/*` | host_permissions | Same as above. |
| `https://*.my.salesforce.com/*` | host_permissions | Same as above. |
| `https://*.visual.force.com/*` | host_permissions | Same as above. |
| `https://*.force.com/*` | host_permissions | Same as above. |
| `https://*.salesforce-setup.com/*` | host_permissions | Same as above. |
| `https://*.my.salesforce-setup.com/*` | host_permissions | Same as above. |
| `https://login.salesforce.com/*` | host_permissions | Allows login session monitoring during authentication flows. |
| `https://test.salesforce.com/*` | host_permissions | Allows sandbox login session monitoring during authentication flows. |

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy

**Privacy Policy URL**
`PRIVACY.md` (Live version should be hosted at a public URL, such as GitHub Pages or project website)

## Distribution

**Visibility**: Public
**Regions**: All regions
**Pricing**: Free

## Developer Info

**Publisher Name**
Kartik Patkar

**Contact Email**
kartikkp.assets@gmail.com

**Support URL / Email**
https://github.com/Kartikpatkar/salesforce-metadata-exporter/issues

**Homepage URL**
https://github.com/Kartikpatkar/salesforce-metadata-exporter

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.0.3 | 2026-06-03 | Added package.xml upload/paste, timeouts, and export progress. | Published |
| 1.0.0 | 2026-05-15 | Initial release with core ZIP export functionality. | Published |
