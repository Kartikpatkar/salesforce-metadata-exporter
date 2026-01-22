# 🤝 Contributing to Salesforce Metadata Exporter

Thank you for your interest in contributing to **Salesforce Metadata Exporter**!
We welcome **bug reports, feature requests, performance improvements, UI/UX enhancements, and documentation updates**.

This project is a **developer-focused Chrome Extension** built around **Salesforce Metadata & Tooling APIs**, so **accuracy, security, and performance** are extremely important.

---

## 🧩 Ways to Contribute

### 🐞 Report Bugs

If you encounter a bug, please open an issue with:

* A clear description of the issue
* Steps to reproduce the problem
* Expected behavior vs actual behavior
* Salesforce org type (Prod / Sandbox / Dev / Scratch)
* Screenshots or screen recordings (if applicable)
* Chrome version and OS
* Browser console errors (if any)

This helps ensure issues are diagnosed and fixed correctly across org types.

---

### 💡 Suggest Enhancements

Have an idea to improve the extension?
Open a feature request issue and include:

* What problem it solves for Salesforce developers
* Why it improves deployment or metadata workflows
* Any Salesforce references (Tooling API, Metadata API, DX, etc.)
* Mockups, wireframes, or screenshots (optional but helpful)

We especially welcome ideas related to:

* Metadata exploration improvements
* Partial deployment workflows
* ZIP export optimization
* `destructiveChanges.xml` generation
* Performance optimizations for large orgs
* Better Profile / PermissionSet handling
* CI/CD–friendly enhancements
* Metadata dependency visualization
* Org-to-org comparison features

---

### 💻 Submit Code

We accept pull requests for:

* Bug fixes
* New features
* UI / UX improvements
* Performance optimizations
* Refactoring and cleanup
* Documentation improvements
* Test coverage improvements

⚠️ **Please follow the existing project structure and architecture.**

---

## 🚀 Getting Started

### Clone the Repository

```bash
git clone <repository-url>
cd salesforce-metadata-exporter
```

---

### Load the Extension in Chrome

1. Open Chrome and navigate to:
   ```
   chrome://extensions/
   ```

2. Enable **Developer Mode** (top-right corner)

3. Click **Load unpacked**

4. Select the project root folder (where `manifest.json` exists)

The extension will now be available in Chrome.

---

### Test with Salesforce

1. Navigate to any Salesforce org (Production, Sandbox, or Developer Edition)
2. Log in to the org
3. Click the extension icon
4. Click "Login to Production" or "Login to Sandbox"
5. Test metadata browsing, selection, and export

---

## ✅ Before Submitting a Pull Request

1. **Fork the repository** and create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Keep changes **focused and well-scoped**
   (avoid mixing refactors with new features).

3. **Test your changes locally**:
   * Connect to at least one Salesforce org
   * Test metadata loading for:
     * ApexClass (Tooling API)
     * CustomObject / Layout (Metadata API)
     * Flow, Profile, PermissionSet
   * Verify package.xml output
   * Test metadata ZIP export
   * Test dark and light themes
   * Ensure no console errors in service worker
   * Check Chrome DevTools for any warnings

4. **Update documentation** if needed:
   * Update README.md for new features
   * Add comments to complex code
   * Update PRIVACY.md if permissions change

5. **Submit a pull request** with:
   * A clear title and description
   * Screenshots for UI changes
   * References to related issues (e.g. `Closes #12`)
   * Explanation of testing performed

---

## 🧪 Testing Guidelines

If your change affects metadata retrieval or generation logic, please test with:

* **Small and large Salesforce orgs**
* **Multiple metadata types**
* **Partial and full deployments**
* **Switching between orgs**
* **Invalid or expired sessions**
* **Dark and light UI modes**
* **ZIP export functionality**
* **Export progress and error handling**

Avoid introducing API calls that:

* Increase rate-limit usage unnecessarily
* Duplicate existing metadata requests
* Retrieve unnecessary data

---

## 📚 Code Style Guide

### JavaScript

* Keep JavaScript **modular and readable**
* Use **ES Modules** (`import/export` syntax)
* Avoid inline scripts (Chrome Extension CSP compliance)
* Follow **Manifest V3 best practices**
* Use clear, Salesforce-consistent naming
* Handle async logic carefully (service worker lifecycle)
* Add JSDoc comments for complex functions
* Never log sensitive session data

### CSS

* Follow the **modular CSS architecture** (in `app/styles/`)
* Support **both light and dark themes**
* Use clear, semantic class names
* Avoid `!important` unless absolutely necessary
* Test responsive layouts (mobile/tablet)

### HTML

* Keep markup semantic and accessible
* Avoid inline styles
* Use proper ARIA labels where needed
* Ensure keyboard navigation works

---

## 🗂️ Project Structure

```
salesforce-metadata-exporter/
├── manifest.json           # Chrome Extension manifest
├── app/
│   ├── index.html         # Main UI
│   ├── index.css          # Main stylesheet with @imports
│   ├── index.js           # App controller
│   └── styles/            # Modular CSS
├── background/
│   └── service-worker.js  # Background operations
├── content/
│   └── content-script.js  # Org detection
├── lib/
│   ├── salesforce-api.js  # API client
│   ├── package-xml-generator.js
│   ├── org-detector.js
│   └── zip-handler.js
└── utils/
    └── salesforce-connector.js
```

When adding new features, maintain this structure and modularity.

---

## 🔒 Security Guidelines

* Do **not** store credentials or tokens persistently
* Do **not** introduce external servers or trackers
* Use only Salesforce APIs supported by the platform
* Keep permissions minimal and Salesforce-scoped
* All logic must run locally in the browser
* Never expose session IDs in logs or error messages
* Follow Chrome Extension security best practices

Security-related pull requests are reviewed carefully.

---

## 🎨 UI/UX Guidelines

* Maintain consistency with existing design
* Support **both dark and light themes**
* Keep interfaces clean and uncluttered
* Provide clear feedback for user actions
* Show progress indicators for long operations
* Handle errors gracefully with helpful messages
* Test with different screen sizes

---

## 📝 Commit Message Guidelines

Use clear, descriptive commit messages:

* ✅ `feat: Add member search for metadata types`
* ✅ `fix: Resolve session timeout error handling`
* ✅ `docs: Update README with new features`
* ✅ `style: Improve dark theme contrast`
* ✅ `refactor: Modularize CSS architecture`

Avoid vague messages like "fix bug" or "update code".

---

## 🙌 Code of Conduct

Please be respectful and inclusive.
We follow the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/) to maintain a welcoming and collaborative community.

Key principles:

* Be respectful and constructive
* Welcome newcomers
* Focus on what's best for the community
* Show empathy toward others

---

## 📬 Questions or Discussions?

* Open an issue for questions or ideas
* Check existing issues before creating duplicates
* Provide detailed context in discussions
* Be patient and respectful in conversations

---

## 🎯 Priority Areas for Contribution

We especially welcome contributions in:

* **Performance optimization** for large orgs with many metadata types
* **Error handling** improvements and better error messages
* **Testing** - automated tests, edge case coverage
* **Documentation** - inline code comments, user guides
* **Accessibility** improvements
* **Metadata coverage** - support for additional metadata types
* **Export features** - progress tracking, retry logic, validation

---

## ✨ Recognition

Contributors will be:

* Listed in release notes
* Credited in the README (if desired)
* Appreciated for making Salesforce development better for everyone

---

Thanks for contributing to **Salesforce Metadata Exporter** 🚀  
Your contributions help make Salesforce deployments faster, safer, and easier for everyone.

---
