const https = require('https');
const os = require('os');
const path = require('path');
const fs = require('fs');

const CONFIG_PATH = path.join(os.homedir(), '.yagt', 'config.json');

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) return {};
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')); } catch { return {}; }
}

function getToken() {
  const cfg = loadConfig();
  return cfg.githubToken || process.env.GITHUB_TOKEN;
}

function ghRequest(endpoint, options = {}) {
  const token = getToken();
  return new Promise((resolve, reject) => {
    const body = options.body ? JSON.stringify(options.body) : undefined;
    const reqOpts = {
      hostname: 'api.github.com',
      path: endpoint,
      method: options.method || 'GET',
      headers: {
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'yagt-cli/0.2.0',
        ...(token ? { 'Authorization': `token ${token}` } : {}),
        ...(body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {}),
      }
    };

    const req = https.request(reqOpts, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function getRepo(owner, repo) {
  const r = await ghRequest(`/repos/${owner}/${repo}`);
  return r.data;
}

async function getRepoContents(owner, repo, p = '') {
  const r = await ghRequest(`/repos/${owner}/${repo}/contents/${p}`);
  return r.data;
}

async function getCommits(owner, repo, limit = 20) {
  const r = await ghRequest(`/repos/${owner}/${repo}/commits?per_page=${limit}`);
  return r.data;
}

async function getIssues(owner, repo, state = 'open', limit = 20) {
  const r = await ghRequest(`/repos/${owner}/${repo}/issues?state=${state}&per_page=${limit}`);
  return r.data;
}

async function getIssue(owner, repo, number) {
  const r = await ghRequest(`/repos/${owner}/${repo}/issues/${number}`);
  return r.data;
}

async function getIssueComments(owner, repo, number) {
  const r = await ghRequest(`/repos/${owner}/${repo}/issues/${number}/comments`);
  return r.data;
}

async function getPulls(owner, repo, state = 'open', limit = 20) {
  const r = await ghRequest(`/repos/${owner}/${repo}/pulls?state=${state}&per_page=${limit}`);
  return r.data;
}

async function getPull(owner, repo, number) {
  const r = await ghRequest(`/repos/${owner}/${repo}/pulls/${number}`);
  return r.data;
}

async function getReadme(owner, repo) {
  const r = await ghRequest(`/repos/${owner}/${repo}/readme`);
  if (r.data.content) return Buffer.from(r.data.content, 'base64').toString('utf-8');
  return null;
}

async function forkRepo(owner, repo) {
  const r = await ghRequest(`/repos/${owner}/${repo}/forks`, { method: 'POST' });
  return r.data;
}

async function starRepo(owner, repo) {
  const token = getToken();
  if (!token) throw new Error('GitHub token required to star repos.');
  const r = await ghRequest(`/user/starred/${owner}/${repo}`, { method: 'PUT', body: {} });
  return r.status === 204;
}

async function unstarRepo(owner, repo) {
  const r = await ghRequest(`/user/starred/${owner}/${repo}`, { method: 'DELETE' });
  return r.status === 204;
}

async function isStarred(owner, repo) {
  const r = await ghRequest(`/user/starred/${owner}/${repo}`);
  return r.status === 204;
}

async function searchRepos(query, sort = 'stars', limit = 10) {
  const q = encodeURIComponent(query);
  const r = await ghRequest(`/search/repositories?q=${q}&sort=${sort}&per_page=${limit}`);
  return r.data;
}

async function getAuthUser() {
  const r = await ghRequest('/user');
  return r.data;
}

async function getRateLimit() {
  const r = await ghRequest('/rate_limit');
  return r.data;
}

async function createIssue(owner, repo, title, body, labels = []) {
  const r = await ghRequest(`/repos/${owner}/${repo}/issues`, {
    method: 'POST',
    body: { title, body, labels }
  });
  return r.data;
}

async function listUserRepos(limit = 30) {
  const r = await ghRequest(`/user/repos?sort=updated&per_page=${limit}&type=all`);
  return r.data;
}

async function getBranches(owner, repo) {
  const r = await ghRequest(`/repos/${owner}/${repo}/branches?per_page=100`);
  return r.data;
}

async function createPullRequest(owner, repo, { title, body, head, base, draft = false }) {
  const r = await ghRequest(`/repos/${owner}/${repo}/pulls`, {
    method: 'POST',
    body: { title, body, head, base, draft },
  });
  return r.data;
}

async function updateIssueState(owner, repo, number, state) {
  const r = await ghRequest(`/repos/${owner}/${repo}/issues/${number}`, {
    method: 'PATCH',
    body: { state },
  });
  return r.data;
}

async function commentOnIssue(owner, repo, number, body) {
  const r = await ghRequest(`/repos/${owner}/${repo}/issues/${number}/comments`, {
    method: 'POST',
    body: { body },
  });
  return r.data;
}

async function mergePullRequest(owner, repo, number, mergeMethod = 'merge') {
  const r = await ghRequest(`/repos/${owner}/${repo}/pulls/${number}/merge`, {
    method: 'PUT',
    body: { merge_method: mergeMethod },
  });
  return r.data;
}

async function updatePullState(owner, repo, number, state) {
  const r = await ghRequest(`/repos/${owner}/${repo}/pulls/${number}`, {
    method: 'PATCH',
    body: { state },
  });
  return r.data;
}

async function createRepo({ name, description = '', isPrivate = false, autoInit = true }) {
  const r = await ghRequest('/user/repos', {
    method: 'POST',
    body: { name, description, private: isPrivate, auto_init: autoInit },
  });
  return r.data;
}

// Parse "owner/repo" or a GitHub URL into { owner, repo }
function parseRepoArg(arg) {
  if (!arg) return null;
  // Handle full GitHub URLs
  const urlMatch = arg.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
  if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2] };
  // Handle owner/repo
  const parts = arg.split('/');
  if (parts.length === 2) return { owner: parts[0], repo: parts[1] };
  return null;
}

// Resolve repo from arg or fall back to git remote
function resolveRepo(arg) {
  if (arg) {
    const parsed = parseRepoArg(arg);
    if (parsed) return parsed;
  }
  // Try to get from git remote
  try {
    const { execSync } = require('child_process');
    const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf-8', stdio: 'pipe' }).trim();
    const parsed = parseRepoArg(remoteUrl);
    if (parsed) return parsed;
  } catch { /* not a git repo or no remote */ }
  return null;
}

module.exports = {
  loadConfig, getToken,
  getRepo, getRepoContents, getCommits,
  getIssues, getIssue, getIssueComments, createIssue,
  updateIssueState, commentOnIssue,
  getPulls, getPull, createPullRequest, mergePullRequest, updatePullState,
  getBranches,
  getReadme, forkRepo,
  starRepo, unstarRepo, isStarred,
  searchRepos, getAuthUser, getRateLimit, listUserRepos,
  createRepo,
  parseRepoArg, resolveRepo,
};
