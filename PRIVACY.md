# 🔒 Privacy Policy – Salesforce Metadata Exporter

*Last updated: April 2026*

**Salesforce Metadata Exporter** is built with **developer privacy, security, and transparency** as core principles.
The extension is designed to work **entirely within your browser** and **only with your existing Salesforce session**.

We believe that **your Salesforce data should remain under your control at all times**.

---

## 🛡️ What This Extension Does

**Salesforce Metadata Exporter** helps Salesforce developers and administrators to:

* Detect the currently active Salesforce org
* Browse Salesforce metadata types and components
* Generate accurate `package.xml` files for deployments
* Export metadata as downloadable ZIP packages
* Prepare partial or full deployment packages visually

All logic and processing happen **locally in your browser**, using Salesforce's **official APIs** (Tooling API and Metadata API).

---

## 🔐 Data Collection

Salesforce Metadata Exporter **does not collect, store, transmit, or sell any personal data**.

Specifically:

* ❌ No analytics or tracking
* ❌ No user profiling
* ❌ No advertising
* ❌ No external servers or middleware
* ❌ No data sent to third-party services
* ❌ No telemetry or crash reporting

The extension **does not log, store, or export your Salesforce metadata** to any external location.

---

## 🔑 Salesforce Authentication & Access

The extension uses your **existing Salesforce browser session** to function.

Important details:

* ✔ Uses Salesforce session cookies already present in your browser
* ✔ Does **not** require OAuth setup or connected app configuration
* ✔ Does **not** store usernames or passwords
* ✔ Session identifiers may be stored **temporarily** during an active export workflow and cleared when the export completes or is cancelled
* ✔ Does **not** store access tokens or refresh tokens
* ✔ Does **not** bypass Salesforce security mechanisms
* ✔ Session extraction happens on-demand only when you use the extension

All Salesforce API requests are made **directly from your browser to Salesforce** over HTTPS.

---

## 💾 Local Storage Usage

The extension uses Chrome's **local storage** only for **non-sensitive preferences**, such as:

* Selected metadata types
* Selected metadata components
* Salesforce API version preference
* UI preferences (dark/light theme, layout state)
* Export timeout preference (minutes)
* Last connected org information (instance URL, org type)

During an active export, the extension may also store **temporary export state** locally (e.g., retrieve job ID and org context needed to continue polling) and removes it after the export completes or is cancelled.

This data:

* Is stored **locally in your browser**
* Is **never sent outside the browser**
* Can be cleared at any time via Chrome extension settings or by clearing browser data
* Is **not synced** across devices

**No Salesforce credentials or sensitive business data is permanently stored.**

---

## 📦 Metadata Export & Downloads

When you export metadata:

* The extension uses the **Salesforce Metadata API** to retrieve metadata
* Downloaded ZIP files are created **locally in your browser**
* ZIP files are saved **directly to your local Downloads folder**
* **No metadata is uploaded to external servers**
* **No metadata is cached or stored** after the download completes

The extension acts as a **client-side bridge** between you and your Salesforce org.

---

## 🧱 Network & Remote Code Policy

Salesforce Metadata Exporter:

* ❌ Does not load remote scripts
* ❌ Does not execute third-party code from external sources
* ❌ Does not embed trackers or analytics libraries
* ❌ Does not use Content Delivery Networks (CDNs) for runtime code
* ✔ UI assets (including icons) are bundled with the extension (no external icon CDNs)

All HTML, CSS, JavaScript, and assets are:

* Bundled with the extension
* Executed locally
* Fully auditable in the source code

This ensures a **secure, predictable, and transparent execution environment**.

---

## 🔒 Permissions Explanation

The extension requests **only the minimum permissions required** to function:

### **`storage`**

Used to store non-sensitive user preferences:
- Metadata type selections
- Component selections
- Theme preference (dark/light mode)
- UI state
- Export timeout setting

### **`downloads`**

Used to trigger ZIP file downloads containing exported metadata.

### **`activeTab`**

Used to detect the currently active Salesforce org and extract session information.

### **`cookies`**

Used to read Salesforce session cookies so the extension can authenticate API calls using your existing logged-in session.

### **Host permissions (Salesforce domains)**

Used only to:

* Detect Salesforce org context
* Call Salesforce Tooling API and Metadata API
* Validate active Salesforce sessions
* Extract org information

Salesforce domains include (but may not be limited to):

* `*.salesforce.com`, `*.my.salesforce.com`
* `*.lightning.force.com`
* `*.visual.force.com`
* `*.force.com`
* `*.salesforce-setup.com`, `*.my.salesforce-setup.com`
* `login.salesforce.com`, `test.salesforce.com`

**No permission is used to:**

* Read browsing history
* Access non-Salesforce websites
* Track user behavior
* Monitor your activity

---

## 🧪 Offline & Local-Only Processing

* Metadata selection, package generation, and previews are handled locally
* Generated `package.xml` files are created entirely in-browser
* No metadata is uploaded or shared with external services
* Export processing happens in the browser's service worker

The extension does **not function as a proxy, data exporter, or cloud service**.

---

## 🛡️ Security Best Practices

We follow Chrome Extension security best practices:

* **Manifest V3** for enhanced security
* **Content Security Policy** to prevent XSS attacks
* **No `eval()` or unsafe JavaScript**
* **HTTPS-only** communication with Salesforce
* **No inline scripts** in HTML
* **Minimal permissions** (principle of least privilege)

---

## 🔄 Data Retention

The extension **does not retain any data** beyond your active browser session, except:

* User preferences (stored in Chrome local storage)
* These preferences can be cleared at any time

**Session data is not intended to be retained beyond what is required to complete an active export.** Temporary export state is cleared when the export finishes or is cancelled.

---

## 🌍 Third-Party Services

This extension:

* ❌ Does not use third-party analytics (Google Analytics, etc.)
* ❌ Does not use error tracking services (Sentry, etc.)
* ❌ Does not use A/B testing services
* ✔ Only communicates with **Salesforce APIs** that you're already logged into

The extension does not load remote runtime code (scripts/styles/icons) from third-party CDNs.

---

## ✅ GDPR & Compliance

This extension is designed to be **GDPR-compliant** by:

* Not collecting personal data
* Not tracking users
* Processing all data locally
* Giving users full control over their data
* Not transferring data outside the browser

**You retain full ownership and control of your Salesforce metadata at all times.**

---

## 📝 Changes to This Privacy Policy

We may update this privacy policy from time to time. Any changes will be:

* Reflected in this document
* Updated with a new "Last updated" date
* Communicated through the extension's update notes (if significant)

We encourage you to review this policy periodically.

---

## 📬 Contact

If you have any questions, concerns, or feedback regarding this privacy policy, feel free to reach out:

* **👨‍💻 Developer:** Salesforce Community
* **🐙 GitHub:** [Repository URL]
* **📧 Email:** [Your Email]
* **💼 LinkedIn:** [Your LinkedIn]

---

Thank you for using **Salesforce Metadata Exporter** 🚀  
Your **Salesforce data, security, and trust** are always respected.

---

## 📜 Legal

This extension is provided "as-is" without warranty of any kind. Use at your own discretion.

**Salesforce Metadata Exporter** is an independent tool and is not affiliated with, endorsed by, or sponsored by Salesforce.com, Inc.

---
