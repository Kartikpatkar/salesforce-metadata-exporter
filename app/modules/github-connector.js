/**
 * GitHub Connector Module
 * Interacts with GitHub REST API for auth verification, repo/branch management,
 * and multi-file atomic commits using the Git Trees & Blobs API.
 */

export class GitHubConnector {
  constructor(token = null) {
    this.token = token;
    this.baseUrl = 'https://api.github.com';
  }

  /**
   * Set API Token
   * @param {string} token
   */
  setToken(token) {
    this.token = (token || '').trim();
  }

  /**
   * Headers helper
   */
  _getHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };
  }

  /**
   * Verify token and user identity
   * @returns {Promise<Object>} User profile object
   */
  async verifyToken(token) {
    const t = token || this.token;
    if (!t) throw new Error('GitHub token is required.');

    const res = await fetch(`${this.baseUrl}/user`, {
      headers: {
        'Authorization': `Bearer ${t}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!res.ok) {
      if (res.status === 401) throw new Error('Invalid or expired GitHub token.');
      throw new Error(`GitHub API error (${res.status}): ${res.statusText}`);
    }

    const scopes = res.headers.get('X-OAuth-Scopes') || '';
    const userData = await res.json();
    userData.scopes = scopes;

    this.token = t;
    return userData;
  }

  /**
   * Fetch repositories accessible to the user
   * @returns {Promise<Array>} List of repository objects
   */
  async fetchUserRepos() {
    if (!this.token) throw new Error('GitHub token not configured.');

    const res = await fetch(`${this.baseUrl}/user/repos?per_page=100&sort=updated`, {
      headers: this._getHeaders()
    });

    if (!res.ok) throw new Error(`Failed to fetch repositories (${res.status})`);
    const repos = await res.json();
    return repos.map(r => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      owner: r.owner.login,
      defaultBranch: r.default_branch,
      private: r.private
    }));
  }

  /**
   * Fetch branches for a repository
   * @param {string} owner
   * @param {string} repo
   * @returns {Promise<Array>} List of branch names
   */
  async fetchBranches(owner, repo) {
    if (!this.token) throw new Error('GitHub token not configured.');

    const res = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/branches?per_page=100`, {
      headers: this._getHeaders()
    });

    if (!res.ok) throw new Error(`Failed to fetch branches (${res.status})`);
    const branches = await res.json();
    return branches.map(b => ({
      name: b.name,
      sha: b.commit.sha
    }));
  }

  /**
   * Create a new branch from a base SHA
   * @param {string} owner
   * @param {string} repo
   * @param {string} newBranchName
   * @param {string} baseSha
   * @returns {Promise<Object>} Ref response
   */
  async createBranch(owner, repo, newBranchName, baseSha) {
    const cleanName = newBranchName.replace(/^refs\/heads\//, '').trim();
    const res = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      headers: this._getHeaders(),
      body: JSON.stringify({
        ref: `refs/heads/${cleanName}`,
        sha: baseSha
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to create branch ${cleanName}`);
    }

    return await res.json();
  }

  /**
   * Create a Git Blob (for files > 100KB or binary assets)
   * @param {string} owner
   * @param {string} repo
   * @param {string} content - Raw content or base64
   * @param {string} encoding - 'utf-8' or 'base64'
   * @returns {Promise<string>} Blob SHA
   */
  async createBlob(owner, repo, content, encoding = 'utf-8') {
    let finalContent = content;
    let finalEncoding = encoding;

    if (encoding === 'utf-8' && typeof content === 'string') {
      try {
        const encoder = new TextEncoder();
        const bytes = encoder.encode(content);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        finalContent = btoa(binary);
        finalEncoding = 'base64';
      } catch (e) {
        // Fallback to raw content if conversion fails
      }
    }

    const res = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/git/blobs`, {
      method: 'POST',
      headers: this._getHeaders(),
      body: JSON.stringify({ content: finalContent, encoding: finalEncoding })
    });

    if (!res.ok) throw new Error(`Failed to create blob (${res.status})`);
    const data = await res.json();
    return data.sha;
  }

  /**
   * Commit multiple files in 1 atomic Git Trees API call
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} branch - Target branch
   * @param {string} targetFolder - Root prefix (e.g. 'force-app/main/default' or '')
   * @param {Array<{path: string, content: string, isBinary?: boolean, delete?: boolean}>} files
   * @param {string} commitMessage
   * @returns {Promise<Object>} Commit result ({ commitSha, htmlUrl })
   */
  async commitFiles(owner, repo, branch, targetFolder, files, commitMessage = 'Salesforce Metadata Export') {
    if (!this.token) throw new Error('GitHub token not configured.');

    // 1. Get latest commit SHA on target branch
    let refRes = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
      headers: this._getHeaders()
    });

    // Handle empty repository / missing branch fallback (404 Not Found or 409 Conflict)
    if (refRes.status === 404 || refRes.status === 409) {
      const initRes = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/contents/README.md`, {
        method: 'PUT',
        headers: this._getHeaders(),
        body: JSON.stringify({
          message: 'Initialize repository for Salesforce Backup',
          content: btoa('# Salesforce Metadata Backup Repository\nCreated via Salesforce Metadata Exporter.')
        })
      });
      if (!initRes.ok) {
        const initErr = await initRes.json().catch(() => ({}));
        throw new Error(initErr.message || `Failed to initialize empty repository (${initRes.status})`);
      }
      refRes = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
        headers: this._getHeaders()
      });
    }

    if (!refRes.ok) throw new Error(`Failed to read branch ${branch} (${refRes.status})`);
    const refData = await refRes.json();
    const parentCommitSha = refData.object.sha;

    // Get base tree SHA
    const commitRes = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/git/commits/${parentCommitSha}`, {
      headers: this._getHeaders()
    });
    if (!commitRes.ok) throw new Error(`Failed to read commit ${parentCommitSha}`);
    const commitData = await commitRes.json();
    const baseTreeSha = commitData.tree.sha;

    // 2. Build tree items
    const treeItems = [];
    const effectiveFolder = (targetFolder && targetFolder.trim() && targetFolder.trim() !== '.' && targetFolder.trim() !== '/') 
      ? targetFolder.trim() 
      : 'force-app/main/default';
    const prefix = `${effectiveFolder.replace(/\/+$/, '')}/`;

    for (const f of files) {
      // Strip leading 'unpackaged/' if present from Salesforce retrieve ZIP
      let cleanPath = f.path.replace(/^\/+/, '').replace(/^unpackaged\//i, '');
      const fullPath = prefix ? `${prefix}${cleanPath}` : cleanPath;

      if (f.delete) {
        // Instruct GitHub Git Trees API to delete this file
        treeItems.push({
          path: fullPath,
          mode: '100644',
          type: 'blob',
          sha: null
        });
        continue;
      }

      // If file is binary or large (>100KB), upload as Blob SHA
      if (f.isBinary || (f.content && f.content.length > 100000)) {
        const encoding = f.isBinary ? 'base64' : 'utf-8';
        const blobSha = await this.createBlob(owner, repo, f.content, encoding);
        treeItems.push({
          path: fullPath,
          mode: '100644',
          type: 'blob',
          sha: blobSha
        });
      } else {
        // Small text file inline
        treeItems.push({
          path: fullPath,
          mode: '100644',
          type: 'blob',
          content: f.content || ''
        });
      }
    }

    // 3. Create Tree
    const treeRes = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/git/trees`, {
      method: 'POST',
      headers: this._getHeaders(),
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: treeItems
      })
    });

    if (!treeRes.ok) {
      const errData = await treeRes.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to create Git Tree (${treeRes.status})`);
    }
    const treeData = await treeRes.json();

    // 4. Create Commit
    const newCommitRes = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/git/commits`, {
      method: 'POST',
      headers: this._getHeaders(),
      body: JSON.stringify({
        message: commitMessage,
        tree: treeData.sha,
        parents: [parentCommitSha]
      })
    });

    if (!newCommitRes.ok) throw new Error(`Failed to create commit (${newCommitRes.status})`);
    const newCommitData = await newCommitRes.json();

    // 5. Update branch reference
    const updateRefRes = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
      method: 'PATCH',
      headers: this._getHeaders(),
      body: JSON.stringify({
        sha: newCommitData.sha,
        force: false
      })
    });

    if (!updateRefRes.ok) {
      if (updateRefRes.status === 403) {
        throw new Error(`Branch '${branch}' is protected. Please select or create a non-protected branch.`);
      }
      throw new Error(`Failed to update branch ${branch} (${updateRefRes.status})`);
    }

    return {
      commitSha: newCommitData.sha,
      htmlUrl: `https://github.com/${owner}/${repo}/commit/${newCommitData.sha}`
    };
  }
}
