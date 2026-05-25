# yagt — Yet Another Git Tool

<p align="center">
  <img src="https://img.shields.io/npm/v/yagt?color=blue&label=npm" />
  <img src="https://img.shields.io/badge/license-MIT-green" />
  <img src="https://img.shields.io/badge/AI-NVIDIA%20NIMs-76b900" />
  <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen" />
</p>

**yagt** is a GitHub CLI with AI built in. Browse repos, manage issues and pull requests, run git operations, and get AI-powered insights — all from the terminal. AI runs on [NVIDIA NIMs](https://build.nvidia.com).

---

## Install

```bash
npm install -g yagt
```

Or run without installing:

```bash
npx yagt --help
```

---

## GitHub commands

```bash
# Clone by owner/repo shorthand
yagt clone vercel/next.js
yagt clone vercel/next.js --ssh
yagt clone vercel/next.js --depth 1

# Explore a repository
yagt repo vercel/next.js
yagt repo vercel/next.js --files
yagt repo vercel/next.js --commits

# Issues
yagt issue --list vercel/next.js
yagt issue 1234 vercel/next.js
yagt issue 1234 vercel/next.js --ai      # AI analysis
yagt issue --new vercel/next.js          # create issue

# Pull requests
yagt pr --list vercel/next.js
yagt pr 5678 vercel/next.js
yagt pr 5678 vercel/next.js --ai         # AI review

# Search
yagt search "react state management" --sort stars --limit 10

# Star / fork
yagt star vercel/next.js
yagt star vercel/next.js --unstar
yagt fork vercel/next.js

# Open in browser
yagt open vercel/next.js
yagt open vercel/next.js --issues
yagt open vercel/next.js --pulls

# Who am I
yagt whoami
yagt rate-limit
```

> All commands that take `[owner/repo]` fall back to the current directory's git remote automatically.

---

## Git commands

```bash
yagt init my-project
yagt status
yagt add                         # interactive file picker
yagt add src/ README.md
yagt commit                      # interactive conventional commit
yagt commit --ai                 # AI-generated commit message
yagt push
yagt pull
yagt log
yagt log --graph --oneline
yagt branch feature/auth
yagt branch --ai "add oauth login"   # AI-suggested branch name
yagt checkout main
yagt diff
yagt diff --ai                   # AI code review
yagt stash
yagt stash --pop
yagt merge feature/auth
yagt undo                        # soft reset last commit
yagt undo --hard
```

---

## AI commands

Powered by NVIDIA NIMs (`deepseek-ai/deepseek-v4-flash` by default).

```bash
yagt commit --ai                 # generate commit message from staged diff
yagt diff --ai                   # review local changes
yagt pr 42 owner/repo --ai       # review a pull request
yagt issue 7 owner/repo --ai     # analyze an issue
yagt summary                     # summarize the current repo
yagt explain "git rebase -i"     # explain any git command
yagt ask "why does auth fail?"   # ask anything about the repo
```

---

## Setup

```bash
# GitHub token — required for private repos, issues, PRs, starring, forking
yagt config --github-token ghp_...

# NVIDIA NIM API key — required for AI features
yagt config --nim-key nvapi-...

# Change AI model
yagt config --model nvidia/llama-3.1-nemotron-70b-instruct

# View current config
yagt config --show
```

Get a GitHub token at [github.com/settings/tokens](https://github.com/settings/tokens) (needs `repo` and `user` scopes).  
Get a NIM key at [build.nvidia.com](https://build.nvidia.com).

You can also use environment variables instead of storing keys:

```bash
export GITHUB_TOKEN=ghp_...
export NVIDIA_API_KEY=nvapi-...
```

---

## Project structure

```
yagt/
├── packages/
│   ├── cli/              # This package — published to npm as "yagt"
│   │   └── src/
│   │       ├── index.js  # All commands
│   │       ├── ai.js     # NVIDIA NIMs client
│   │       └── github.js # GitHub API client
│   └── web/              # Next.js web interface
├── .github/
│   └── workflows/
│       └── publish-cli.yml
└── README.md
```

---

## License

MIT — Alexandrus21 Studio
