# Chrome Web Store Listing — Salesforce Metadata Exporter

> Last Updated: 2026-06-03 | Version: 1.1.0

## Store Listing

**Extension Name** [REQUIRED]
Salesforce Metadata Exporter

**Short Description** [REQUIRED]
Export Salesforce metadata as a ZIP. Supports package.xml, destructiveChanges.xml, presets, member search & profile downsizing.

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

You can select what to export using a simple checkbox-based interface, built-in presets, or import an existing package.xml file.

🔥 New in v1.1.0 — Major Update

🗑️ destructiveChanges.xml Generation
• Mark individual metadata members for deletion using the trash icon on each row.
• A live "destructiveChanges.xml" preview tab shows your deletion manifest in real time.
• When you export, the downloaded ZIP automatically contains both package.xml (retrieve) and destructiveChanges.xml (deletion manifest) — no manual file creation needed.
• Safety-first design: exporting does NOT delete anything from your org. The manifest only takes effect when the ZIP is deployed using Salesforce CLI, Ant Migration Tool, or Workbench.
• A confirmation dialog lists every member marked for deletion before export, so nothing happens by accident.

💾 Saved Selection Presets
• Save your current metadata selections as a named preset with one click.
• Load any saved preset to instantly restore types and members.
• Delete presets you no longer need.
• All presets are stored locally in your browser — nothing leaves your machine.

🔍 Global Member Search
• A new "Members" search mode lets you search across all loaded member lists simultaneously — not just metadata type names.
• Find any component across your entire selection in real time.

⏹ Stop Export
• Cancel a running export at any time using the Stop button — no need to close the extension.

🗂️ Profile & Permission Set Downsizing
• Strip unwanted sub-sections from .profile and .permissionset XML files before download (e.g. classAccesses, fieldPermissions, objectPermissions, layoutAssignments, and more).
• Each sub-section is independently configurable — keep only what you need.
• Reduces download sizes and prevents layout conflicts in deployments.

🔥 Core Features (All Versions)
• Upload package.xml — Automatically select metadata types and members from an existing package file.
• Paste package.xml — Paste package XML from your clipboard to auto-select types.
• Configurable Timeout — Customize the export timeout for large enterprise orgs (default: 30 minutes).
• Real-time Progress — View status, elapsed time, and download completion via persistent toast notifications.
• Dark / Light Theme — Full dark mode support for extended working sessions.
• Reliable Sessions — Auto-detects Salesforce instances and browser session cookies.

🔐 Safe by Design
• Metadata only — No business or customer data records are ever accessed or exported.
• No credentials stored — Uses your existing active Salesforce browser session.
• Local execution — All exports happen locally in your browser; no external servers involved.
• Read-only by default — destructiveChanges.xml is just a manifest file; nothing is deleted unless you explicitly deploy it.

⚠️ Important Notes
• This extension does NOT export Salesforce data records (Accounts, Contacts, etc.) — metadata configuration only.
• destructiveChanges.xml in the exported ZIP only deletes components when you deploy the package to a Salesforce org using a deployment tool.
• Salesforce login access is required.
• Metadata availability depends on your org permissions.

👨‍💻 Who Is This For?
• Salesforce Developers
• Salesforce Architects
• Release Managers
• Technical Admins / Consultants

If you need a fast way to export (or prepare deletion of) Salesforce configuration without setting up Salesforce CLI or ANT, this tool is for you.

⭐ Why Install Salesforce Metadata Exporter?
• One-click metadata export as a deployment-ready ZIP
• Generate destructiveChanges.xml for safe, auditable component deletion
• Save and reload named selection presets
• Upload or paste package.xml for faster workflows
• Search across all metadata members globally
• Strip oversized profile/permission set sections before download
• Configurable timeout for large enterprise orgs
• Stop export at any time
• Clear real-time progress notifications
• No setup or command line required
• Minimal permissions and Chrome Web Store–safe design
• Perfect for audits, troubleshooting, and pre/post deployment checks

🔹 Privacy Practices
This extension does not collect, store, or transmit personal data.
All operations are performed locally using the active Salesforce session in your browser.

---
Found a bug or have a suggestion? Open an issue at https://github.com/Kartikpatkar/salesforce-metadata-exporter or email kartikkp.assets@gmail.com

**Category** [REQUIRED]
Developer Tools

**Single Purpose** [REQUIRED]
Exports Salesforce metadata configurations into a downloadable ZIP file using the Metadata API, and generates destructiveChanges.xml manifests for safe component deletion.

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
• Screenshot 1: Shows the main dashboard in Light Mode with metadata types selected, member rows with trash icons, and the live `package.xml` preview.
• Screenshot 2: Shows the main dashboard in Dark Mode, highlighting the clean developer-friendly dark theme.
• Screenshot 3: Shows the active Org Details modal with connected org info, export timeout, and Profile & Permission Set Downsizing settings.

> **Tip**: Consider adding a new screenshot showing the `destructiveChanges.xml` tab and the confirmation modal for v1.1.0.

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `storage` | permissions | Used to save user's selected metadata types, named presets, destructive selections, and custom timeout settings locally across browser sessions. |
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
| 1.1.0 | 2026-06-03 | destructiveChanges.xml generation, preset manager, global member search, stop export, profile downsizing, safety confirmation modal. | Pending Publish |
| 1.0.3 | 2026-06-03 | Added package.xml upload/paste, configurable timeouts, and persistent export progress toasts. | Published |
| 1.0.0 | 2026-05-15 | Initial release with core ZIP export functionality. | Published |
