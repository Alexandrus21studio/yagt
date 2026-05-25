# yagt — Yet Another Git Tool

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.0-blue" />
  <img src="https://img.shields.io/badge/license-MIT-green" />
  <img src="https://img.shields.io/badge/AI-powered-orange" />
</p>

**yagt** is an AI-powered GitHub alternative with a modern web GUI and a developer-friendly CLI. It wraps git with intelligent features like AI commit message generation, automated code review, repository summaries, and issue analysis.

---

## 🚀 Features

### CLI (`@yagt/cli`)
- **AI commit messages** — `yagt commit --ai` generates conventional commit messages from your diff
- **AI branch names** — `yagt branch --ai "fix login bug"` suggests clean branch names
- **AI code review** — `yagt diff --ai` reviews your changes before push
- **AI repo summary** — `yagt summary` analyzes the entire repository
- **AI explain** — `yagt explain "git rebase -i"` explains any git command
- All standard git operations with beautiful CLI output (init, add, commit, push, pull, clone, log, branch, stash, merge, etc.)

### Web GUI (`@yagt/web`)
- **Dashboard** — Overview of repositories, activity feed, AI daily summary
- **Repository browser** — File tree, README viewer, commit history, AI repo summary panel
- **Issues** — Issue list with AI severity badges and AI-generated summaries
- **Pull Requests** — PR list with AI review status (safe / attention / blocking)
- **AI Assistant** — Chat interface to ask questions about any repository

---

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/Alexandrus21studio/yagt.git
cd yagt

# Install dependencies
npm install

# Link the CLI globally
npm link -w packages/cli

# Configure AI (optional — uses OpenAI)
yagt config --api-key YOUR_OPENAI_KEY
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

## 🌐 Web GUI

```bash
# Start the web interface
npm run web

# Or from the workspace root
cd packages/web && npm run dev
```

The web GUI runs on `http://localhost:3000` by default.

---

## 🏗️ Project Structure

```
yagt/
├── packages/
│   ├── cli/          # Node.js CLI tool
│   │   └── src/
│   │       ├── index.js    # CLI commands
│   │       └── ai.js       # AI integrations
│   └── web/          # Next.js web application
│       └── src/
│           ├── app/        # Next.js App Router
│           └── components/ # Shared UI components
├── package.json      # Workspace root
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
