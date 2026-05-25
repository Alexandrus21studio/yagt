# yagt-cli — Yet Another Git Tool

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.0-blue" />
  <img src="https://img.shields.io/badge/license-MIT-green" />
  <img src="https://img.shields.io/badge/AI-powered-orange" />
</p>

**yagt** is an AI-powered GitHub alternative. This monorepo contains the CLI and the Web GUI.

- **CLI** (`packages/cli`) — AI-powered git client
- **Web** (`packages/web`) — Next.js web GUI → [Live on Vercel](https://yagt.vercel.app)

---

## 🚀 Features

### CLI
- **AI commit messages** — `yagt commit --ai`
- **AI branch names** — `yagt branch --ai "fix login bug"`
- **AI code review** — `yagt diff --ai`
- **AI repo summary** — `yagt summary`
- **AI explain** — `yagt explain "git rebase -i"`
- All standard git operations

### Web GUI
- **Dashboard** — AI daily summary, activity feed, repos
- **Repository Browser** — File tree, README, commits, AI summary
- **Issues** — AI severity badges, AI summaries
- **Pull Requests** — AI review status
- **AI Assistant** — Chat about any repo
- **GitHub OAuth** — Sign in with GitHub

---

## 📦 Installation

```bash
git clone https://github.com/Alexandrus21studio/yagt-cli.git
cd yagt-cli

# CLI only
cd packages/cli
npm install -g .

# Web only
cd packages/web
npm install
npm run dev
```

---

## 🛠️ CLI Usage

```bash
yagt init my-project
yagt add .
yagt commit --ai
yagt diff --ai
yagt summary
yagt explain "git cherry-pick"
```

---

## 🌐 Web GUI

**Live:** [https://yagt.vercel.app](https://yagt.vercel.app)

```bash
cd packages/web
npm install
npm run dev        # localhost:3000
```

---

## 🏗️ Project Structure

```
yagt-cli/
├── packages/
│   ├── cli/          # Node.js CLI tool
│   │   └── src/
│   │       ├── index.js
│   │       └── ai.js
│   └── web/          # Next.js web application
│       └── src/
│           ├── app/
│           ├── components/
│           └── lib/
├── package.json
└── README.md
```

---

## 📝 License

MIT — Alexandrus21 Studio
