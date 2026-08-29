/**
 * GitHub API Module
 * Raw API wrappers for interacting with GitHub REST endpoints.
 */

export class GitHubAPI {
  constructor(token = null) {
    this.token = token;
    this.baseUrl = 'https://api.github.com';
  }

  setToken(token) {
    this.token = (token || '').trim();
  }

  _getHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };
  }

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
}
