# yagt — Yet Another Git Tool

<p align="center">
  <img src="https://img.shields.io/npm/v/yagt?color=blue&label=npm" />
  <img src="https://img.shields.io/badge/license-MIT-green" />
  <img src="https://img.shields.io/badge/AI-NVIDIA%20NIMs-76b900" />
  <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen" />
</p>

**yagt** is an AI-powered GitHub client for the terminal and web. Browse repos, create and manage issues and pull requests, run git operations with real-time progress, and get AI-powered insights — all from the terminal or a clean web UI. AI runs on [NVIDIA NIMs](https://build.nvidia.com).

---

## Install

```bash
npm install -g @alexandrus21/yagt
```

Or run without installing:

```bash
npx @alexandrus21/yagt --help
```

---

## Terminal UI (TUI)

Launch a full-screen, Claude-inspired terminal interface:

```bash
yagt ui
```

Features a tab strip with 5 panels:

| Key | Tab |
|-----|-----|
| `1` | ⬡ Repos — browse and switch active repo |
| `2` | ◎ Issues — list and read issues |
| `3` | ⑂ Pull Requests — list and read PRs |
| `4` | ◈ Commits — recent commit log |
| `5` | ✦ AI Chat — ask anything about the current repo |

Navigation: `Tab` cycles tabs · `Enter` opens item · `/` search · `g` set repo · `r` refresh · `q` quit

---

## GitHub commands

```bash
# Clone by owner/repo shorthand (with real-time progress bar)
yagt clone vercel/next.js
yagt clone vercel/next.js --ssh
yagt clone vercel/next.js --depth 1

# Create a new repository interactively
yagt new

# Explore a repository
yagt repo vercel/next.js
yagt repo vercel/next.js --files
yagt repo vercel/next.js --commits

# Issues — read and write
yagt issue --list vercel/next.js
yagt issue 1234 vercel/next.js
yagt issue 1234 vercel/next.js --ai          # AI analysis
yagt issue --new vercel/next.js              # create new issue (interactive)
yagt issue 1234 vercel/next.js --comment "text"  # post a comment
yagt issue 1234 vercel/next.js --close       # close the issue
yagt issue 1234 vercel/next.js --reopen      # reopen a closed issue

# Pull requests — read and write
yagt pr --list vercel/next.js
yagt pr 5678 vercel/next.js
yagt pr 5678 vercel/next.js --ai             # AI code review
yagt pr --new vercel/next.js                 # create new PR (interactive, picks branches)
yagt pr 5678 vercel/next.js --merge          # merge a PR
yagt pr 5678 vercel/next.js --close          # close a PR
yagt pr 5678 vercel/next.js --reopen         # reopen a PR

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

# Account info
yagt whoami
yagt rate-limit
```

> All commands that take `[owner/repo]` fall back to the current directory's git remote automatically.

---

## Git commands

Progress bars display during clone, push, and pull operations.

```bash
yagt init my-project
yagt status
yagt add                         # interactive file picker
yagt add src/ README.md
yagt commit                      # interactive conventional commit
yagt commit --ai                 # AI-generated commit message
yagt push                        # with real-time progress bar
yagt pull                        # with real-time progress bar
yagt log
yagt log --graph --oneline
yagt branch feature/auth
yagt branch --ai "add oauth login"   # AI-suggested branch name
yagt checkout main
yagt diff
yagt diff --ai                   # AI code review of local changes
yagt stash
yagt stash --pop
yagt merge feature/auth
yagt undo                        # soft reset last commit
yagt undo --hard
```

---

## AI commands

Powered by NVIDIA NIMs (`meta/llama-3.3-70b-instruct` by default — best balance of speed and quality).

```bash
yagt commit --ai                 # generate commit message from staged diff
yagt diff --ai                   # review local changes
yagt pr 42 owner/repo --ai       # review a pull request
yagt issue 7 owner/repo --ai     # analyze an issue
yagt summary                     # summarize the current repo
yagt explain "git rebase -i"     # explain any git command
yagt ask "why does auth fail?"   # ask anything about the repo
yagt ui                          # AI Chat tab in TUI
```

### NVIDIA NIMs model speed test

Tested May 2025 against `POST /v1/chat/completions` with a short prompt. Latency = time to first complete response.

| Model | Latency | Status |
|---|---|---|
| `meta/llama-3.2-3b-instruct` | 338ms | ✅ fastest |
| `mistralai/mistral-7b-instruct-v0.3` | 375ms | ✅ |
| `meta/llama-3.1-8b-instruct` | 380ms | ✅ |
| `mistralai/mixtral-8x7b-instruct-v0.1` | 732ms | ✅ |
| **`meta/llama-3.3-70b-instruct`** | **901ms** | ✅ **default — best quality/speed** |
| `deepseek-ai/deepseek-v4-flash` | 1741ms | ✅ slowest |
| `microsoft/phi-3-mini-128k-instruct` | — | ❌ not available |
| `qwen/qwen2-7b-instruct` | — | ❌ not available |
| `google/gemma-2-9b-it` | — | ❌ not available |
| `nvidia/llama-3.1-nemotron-70b-instruct` | — | ❌ not available |

To switch model:

```bash
yagt config --model meta/llama-3.2-3b-instruct   # fastest
yagt config --model meta/llama-3.3-70b-instruct   # default (best quality)
```

---

## Web UI

A full GitHub client in the browser. Run locally or deploy to Vercel.

```bash
cd packages/web
npm run dev
```

Features:
- Sign in with GitHub (Clerk OAuth)
- Dashboard: starred repos, recent activity, create new repo
- Repo browser: files, commits, issues, PRs with detail pages
- **Create issues** with title + markdown body
- **Create PRs** with branch selector (base/head), title, body, draft toggle
- **Issue detail**: markdown body, comments, close/reopen, add comment
- **PR detail**: file diff summary, comments, merge, close/reopen
- **AI Review**: one-click NIM-powered code review on any PR
- **AI Chat**: ask anything about a repo
- Fully responsive — mobile, tablet, desktop

---

## Setup

```bash
# GitHub token — required for private repos, issues, PRs, starring, forking
yagt config --github-token ghp_...

# NVIDIA NIM API key — required for AI features
yagt config --nim-key nvapi-...

# Change AI model
yagt config --model meta/llama-3.2-3b-instruct

# View current config
yagt config --show
```

Get a GitHub token at [github.com/settings/tokens](https://github.com/settings/tokens) (needs `repo` and `user` scopes).  
Get a NIM key at [build.nvidia.com](https://build.nvidia.com).

You can also use environment variables:

```bash
export GITHUB_TOKEN=ghp_...
export NVIDIA_API_KEY=nvapi-...
```

---

## Project structure

```
yagt/
├── packages/
│   ├── cli/              # Published to npm as "yagt"
│   │   └── src/
│   │       ├── index.js  # All commands + progress bars
│   │       ├── tui.js    # Full-screen blessed TUI
│   │       ├── ai.js     # NVIDIA NIMs client
│   │       └── github.js # GitHub API client
│   └── web/              # Next.js web interface (App Router)
│       └── src/app/
│           ├── page.tsx              # Dashboard
│           ├── repo/[owner]/[name]/  # Repo browser
│           │   ├── issues/           # Issue list + create
│           │   │   └── [number]/     # Issue detail + comments
│           │   ├── pulls/            # PR list + create
│           │   │   └── [number]/     # PR detail + merge
│           │   └── ...
│           └── api/
│               ├── github/[...path]/ # GitHub API proxy (Clerk auth)
│               └── ai/               # NIM endpoints
├── .github/workflows/
│   └── publish-cli.yml
└── README.md
```

---

## License

MIT — Alexandrus21 Studio
