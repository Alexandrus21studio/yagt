const https = require('https');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const CONFIG_PATH = path.join(os.homedir(), '.yagt', 'config.json');

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) return {};
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')); } catch { return {}; }
}

function saveConfig(cfg) {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

function getNimKey() {
  const cfg = loadConfig();
  return cfg.nimApiKey || process.env.NVIDIA_API_KEY;
}

function getGithubToken() {
  const cfg = loadConfig();
  return cfg.githubToken || process.env.GITHUB_TOKEN;
}

function getNimModel() {
  const cfg = loadConfig();
  return cfg.nimModel || 'meta/llama-3.3-70b-instruct';
}

async function callNIM(messages, options = {}) {
  const key = getNimKey();
  if (!key) throw new Error('No NVIDIA API key. Run "yagt config --nim-key <key>" or set NVIDIA_API_KEY');

  const model = options.model || getNimModel();
  const body = JSON.stringify({
    model,
    messages,
    max_tokens: options.maxTokens || 1024,
    temperature: options.temperature ?? 0.3,
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'integrate.api.nvidia.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) reject(new Error(parsed.error.message || JSON.stringify(parsed.error)));
          else resolve(parsed.choices?.[0]?.message?.content ?? '');
        } catch { reject(new Error('Failed to parse NIM response')); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function generateCommitMessage(diff) {
  return callNIM([{
    role: 'user',
    content: `Write a concise conventional commit message (type(scope): description) for this diff. Return ONLY the commit message.\n\nDiff:\n${diff.slice(0, 4000)}`
  }], { maxTokens: 100, temperature: 0.2 });
}

async function summarizeRepo(cwd) {
  const files = execSync('git ls-files', { cwd, encoding: 'utf-8' }).trim().split('\n').slice(0, 50);
  const readmeFile = files.find(f => /^readme\.md$/i.test(f));
  let readme = '';
  if (readmeFile) {
    try { readme = fs.readFileSync(path.join(cwd, readmeFile), 'utf-8').slice(0, 2000); } catch { }
  }
  const log = execSync('git log --oneline -15', { cwd, encoding: 'utf-8' }).trim();
  return callNIM([{
    role: 'user',
    content: `Summarize this repository in 3-4 sentences. Cover what it does, tech stack, and activity.\n\nFiles: ${files.join(', ')}\n\nREADME:\n${readme}\n\nRecent commits:\n${log}`
  }], { maxTokens: 256 });
}

async function analyzeIssue(title, body = '', readme = '', commits = '') {
  return callNIM([{
    role: 'user',
    content: `Analyze this GitHub issue. Give: (1) brief summary, (2) severity low/medium/high, (3) suggested labels, (4) fix approach.\n\nTitle: ${title}\nBody: ${body}\n\nContext:\nREADME: ${readme.slice(0, 1000)}\nRecent commits: ${commits.slice(0, 500)}`
  }], { maxTokens: 512 });
}

async function reviewCode(diff) {
  return callNIM([{
    role: 'user',
    content: `Review this code diff as a senior engineer:\n1. Overall assessment\n2. Bugs, security issues, performance problems\n3. Suggestions\n\nDiff:\n${diff.slice(0, 4000)}`
  }], { maxTokens: 800 });
}

async function suggestBranchName(context) {
  const result = await callNIM([{
    role: 'user',
    content: `Suggest a concise git branch name (kebab-case, max 40 chars) for: ${context}\nReturn ONLY the branch name.`
  }], { maxTokens: 30, temperature: 0.2 });
  return result.trim().replace(/['"` ]/g, '');
}

async function explainCommand(gitCommand) {
  return callNIM([{
    role: 'user',
    content: `Explain what this git command does in 2-3 plain sentences: ${gitCommand}`
  }], { maxTokens: 150 });
}

async function askAboutRepo(question, context) {
  return callNIM([
    { role: 'system', content: `You are an expert developer assistant. Answer questions about GitHub repositories concisely.\n\n${context}` },
    { role: 'user', content: question }
  ], { maxTokens: 800 });
}

module.exports = {
  loadConfig, saveConfig,
  getNimKey, getGithubToken, getNimModel,
  callNIM,
  generateCommitMessage, summarizeRepo, analyzeIssue,
  reviewCode, suggestBranchName, explainCommand, askAboutRepo,
};
