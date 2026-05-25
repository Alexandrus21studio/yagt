# yagt — Yet Another Git Tool

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.0-blue" />
  <img src="https://img.shields.io/badge/license-MIT-green" />
  <img src="https://img.shields.io/badge/AI-powered-orange" />
</p>

**yagt** is an AI-powered git CLI. The web GUI lives in a separate repo: [`yagt-web`](https://github.com/Alexandrus21studio/yagt-web). It wraps git with intelligent features like AI commit message generation, automated code review, repository summaries, and issue analysis.

---

## 🚀 Features

### CLI (`@yagt/cli`)
- **AI commit messages** — `yagt commit --ai` generates conventional commit messages from your diff
- **AI branch names** — `yagt branch --ai "fix login bug"` suggests clean branch names
- **AI code review** — `yagt diff --ai` reviews your changes before push
- **AI repo summary** — `yagt summary` analyzes the entire repository
- **AI explain** — `yagt explain "git rebase -i"` explains any git command
- All standard git operations with beautiful CLI output (init, add, commit, push, pull, clone, log, branch, stash, merge, etc.)

### Web GUI ([`yagt-web`](https://github.com/Alexandrus21studio/yagt-web))
- **Dashboard** — Overview of repositories, activity feed, AI daily summary
- **Repository browser** — File tree, README viewer, commit history, AI repo summary panel
- **Issues** — Issue list with AI severity badges and AI-generated summaries
- **Pull Requests** — PR list with AI review status (safe / attention / blocking)
- **AI Assistant** — Chat interface to ask questions about any repository

---

## 📦 CLI Installation

```bash
# Clone the CLI repository
git clone https://github.com/Alexandrus21studio/yagt.git
cd yagt/packages/cli
npm install -g .

# Configure AI (optional — uses OpenAI)
yagt config --api-key YOUR_OPENAI_KEY
```

## 🌐 Web GUI

```bash
# Web app (separate repo)
git clone https://github.com/Alexandrus21studio/yagt-web.git
cd yagt-web
npm install
npm run dev
```

---

## 🛠️ CLI Usage

```bash
# Initialize a repo
yagt init my-project

# Stage and commit with AI-generated message
yagt add .
yagt commit --ai

# Get AI review of your diff
yagt diff --ai

# Generate repo summary
yagt summary

# Explain any git command
yagt explain "git cherry-pick"
```

---

## 🏗️ Project Structure

```
yagt/
├── packages/
│   └── cli/          # Node.js CLI tool
│       └── src/
│           ├── index.js    # CLI commands
│           └── ai.js       # AI integrations
├── package.json
└── README.md
```

---

## 🧠 AI Configuration

yagt uses OpenAI's API for AI features. Set your API key via:

```bash
yagt config --api-key sk-xxxxxxxx
```

Or set the environment variable:

```bash
export OPENAI_API_KEY=sk-xxxxxxxx
```

---

## 📝 License

MIT — Alexandrus21 Studio
