const chalk = require('chalk');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(require('os').homedir(), '.yagt', 'config.json');

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) return {};
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

function saveConfig(cfg) {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

function getApiKey() {
  const cfg = loadConfig();
  return cfg.openaiApiKey || process.env.OPENAI_API_KEY;
}

async function callOpenAI(messages, model = 'gpt-4o-mini') {
  const key = getApiKey();
  if (!key) {
    throw new Error('No OpenAI API key. Run "yagt config --api-key <key>" or set OPENAI_API_KEY');
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model, messages, temperature: 0.7 })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error: ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

async function generateCommitMessage(diff, context = '') {
  const prompt = `You are a senior developer writing a concise, conventional commit message.

Git diff:
${diff}

${context ? `Additional context: ${context}` : ''}

Write a commit message following conventional commits format (type(scope): description).
Return ONLY the commit message, nothing else.`;

  return await callOpenAI([{ role: 'user', content: prompt }]);
}

async function summarizeRepo(cwd) {
  const files = execSync('git ls-files', { cwd, encoding: 'utf-8' }).trim().split('\n').slice(0, 50);
  const readme = files.find(f => f.toLowerCase() === 'readme.md');
  let readmeContent = '';
  if (readme) {
    readmeContent = fs.readFileSync(path.join(cwd, readme), 'utf-8').slice(0, 2000);
  }

  const log = execSync('git log --oneline -20', { cwd, encoding: 'utf-8' }).trim();

  const prompt = `Summarize this repository in 3-4 sentences. Mention what it does, the tech stack, and current status.

README excerpt:
${readmeContent}

Recent commits:
${log}

File structure (top 50 files):
${files.join(', ')}`;

  return await callOpenAI([{ role: 'user', content: prompt }]);
}

async function analyzeIssue(title, body = '') {
  const prompt = `Analyze this GitHub issue and provide:
1. A brief summary (1 sentence)
2. Severity (low/medium/high/critical)
3. Suggested labels
4. Possible solution approach

Title: ${title}
Body: ${body}`;

  return await callOpenAI([{ role: 'user', content: prompt }]);
}

async function reviewCode(diff) {
  const prompt = `Review this code diff as a senior engineer. Provide:
1. Overall assessment (safe / needs attention / blocking issues)
2. Key findings (bugs, performance, security, style)
3. Suggestions for improvement

Diff:
${diff}`;

  return await callOpenAI([{ role: 'user', content: prompt }]);
}

async function suggestBranchName(context) {
  const prompt = `Suggest a concise git branch name (kebab-case) for this work: ${context}
Return ONLY the branch name, no explanation.`;
  return await callOpenAI([{ role: 'user', content: prompt }]);
}

async function explainCommand(gitCommand) {
  const prompt = `Explain what this git command does in simple terms: ${gitCommand}
Keep it under 3 sentences.`;
  return await callOpenAI([{ role: 'user', content: prompt }]);
}

module.exports = {
  loadConfig,
  saveConfig,
  getApiKey,
  callOpenAI,
  generateCommitMessage,
  summarizeRepo,
  analyzeIssue,
  reviewCode,
  suggestBranchName,
  explainCommand
};
