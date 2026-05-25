#!/usr/bin/env node
'use strict';

const blessed = require('blessed');
const gh = require('./github');

// ── Screen ───────────────────────────────────────────────────────────────────

const screen = blessed.screen({
  smartCSR: true,
  title: 'yagt',
  fullUnicode: true,
  dockBorders: false,
  autoPadding: false,
});

// ── Palette (Claude-inspired) ─────────────────────────────────────────────────

const C = {
  pageBg:      '#1a1a2e',   // deep dark blue-navy (Claude's dark bg)
  headerBg:    '#16213e',   // slightly lighter header
  panelBg:     '#1a1a2e',
  cardBg:      '#16213e',   // card/item bg
  border:      '#2d2d5e',   // subtle purple border
  accent:      '#c084fc',   // Claude purple
  accentDim:   '#7c3aed',
  tabActive:   '#c084fc',   // active tab label
  tabInactive: '#64648a',   // inactive tab label
  text:        '#e2e8f0',
  textMuted:   '#94a3b8',
  textDim:     '#475569',
  green:       '#4ade80',
  red:         '#f87171',
  yellow:      '#fbbf24',
  blue:        '#60a5fa',
  purple:      '#c084fc',
  divider:     '#2d2d5e',
};

// ── State ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'repos',   label: 'Repos',        icon: '⬡' },
  { id: 'issues',  label: 'Issues',        icon: '◎' },
  { id: 'prs',     label: 'Pull Requests', icon: '⑂' },
  { id: 'commits', label: 'Commits',       icon: '◈' },
  { id: 'ai',      label: 'AI Chat',       icon: '✦' },
];

let activeTab = 0;
let listData = { repos: [], issues: [], prs: [], commits: [] };
let chatMessages = [];
let loading = false;
let currentRepo = null;
let ghUser = null;

try { currentRepo = gh.resolveRepo(null); } catch { /* not in git repo */ }

// ── Root container ────────────────────────────────────────────────────────────

const root = blessed.box({
  parent: screen,
  top: 0, left: 0, right: 0, bottom: 0,
  style: { bg: C.pageBg },
});

// ── Top bar ───────────────────────────────────────────────────────────────────

const topBar = blessed.box({
  parent: root,
  top: 0, left: 0, right: 0, height: 1,
  style: { bg: C.headerBg, fg: C.textMuted },
  tags: true,
});

// ── Tab strip ─────────────────────────────────────────────────────────────────

const tabStrip = blessed.box({
  parent: root,
  top: 1, left: 0, right: 0, height: 2,
  style: { bg: C.headerBg },
  tags: true,
});

// Underline separator
const tabUnderline = blessed.box({
  parent: root,
  top: 3, left: 0, right: 0, height: 1,
  style: { bg: C.divider },
  tags: true,
  content: '',
});

// ── Content pane ──────────────────────────────────────────────────────────────

const pane = blessed.box({
  parent: root,
  top: 4, left: 0, right: 0, bottom: 2,
  style: { bg: C.pageBg },
  tags: true,
});

const listWidget = blessed.list({
  parent: pane,
  top: 0, left: 2, right: 2, bottom: 0,
  style: {
    bg: C.pageBg,
    fg: C.text,
    selected: { bg: C.accentDim, fg: '#ffffff', bold: true },
  },
  keys: true,
  vi: true,
  mouse: true,
  tags: true,
  scrollbar: {
    ch: ' ',
    track: { bg: C.divider },
    style: { bg: C.accentDim },
  },
});

// ── Bottom status bar ─────────────────────────────────────────────────────────

const statusBar = blessed.box({
  parent: root,
  bottom: 0, left: 0, right: 0, height: 2,
  style: { bg: C.headerBg, fg: C.textDim },
  tags: true,
});

// ── Detail overlay ────────────────────────────────────────────────────────────

const overlay = blessed.box({
  parent: screen,
  top: 2, left: 4, right: 4, bottom: 2,
  border: { type: 'line' },
  style: {
    bg: C.cardBg,
    fg: C.text,
    border: { fg: C.accent },
    label: { fg: C.accent, bold: true },
  },
  label: '  Detail  ',
  tags: true,
  scrollable: true,
  alwaysScroll: true,
  mouse: true,
  keys: true,
  vi: true,
  padding: { left: 2, right: 2, top: 1, bottom: 1 },
  hidden: true,
});

// ── Render: top bar ────────────────────────────────────────────────────────────

function renderTopBar() {
  const repoStr = currentRepo
    ? `{bold}{${C.accent}-fg}${currentRepo.owner}/{currentRepo.name}{/}`
    : `{${C.textDim}-fg}no repo{/}`;
  const userStr = ghUser
    ? `{${C.textMuted}-fg}${ghUser.login}{/}`
    : `{${C.textDim}-fg}not signed in{/}`;
  topBar.setContent(
    ` {bold}{${C.accent}-fg}yagt{/} {${C.textDim}-fg}·{/} ${repoStr}{${C.textDim}-fg}                                                             {|}${userStr}  {/}`
  );
}

// ── Render: tab strip ─────────────────────────────────────────────────────────

function renderTabs() {
  // Line 0 of tabStrip: tab labels (row top:0)
  // Line 1: underline only under active tab

  const labels = TABS.map((t, i) => {
    const active = i === activeTab;
    if (active) {
      return `  {bold}{${C.tabActive}-fg}${t.icon}  ${t.label}{/}  `;
    }
    return `  {${C.tabInactive}-fg}${t.icon}  ${t.label}{/}  `;
  }).join(`{${C.divider}-fg}│{/}`);

  tabStrip.setContent(`\n ${labels}`);

  // Highlight the underline strip under active tab
  tabUnderline.style.bg = C.divider;
  tabUnderline.setContent('');
}

// ── Render: status bar ────────────────────────────────────────────────────────

function renderStatus(msg) {
  const activeId = TABS[activeTab].id;
  const hints = activeId === 'ai'
    ? `{bold}{${C.accent}-fg}Enter{/}{${C.textDim}-fg}  send message{/}   {bold}{${C.accent}-fg}c{/}{${C.textDim}-fg}  clear chat{/}   {bold}{${C.accent}-fg}g{/}{${C.textDim}-fg}  set repo{/}   {bold}{${C.accent}-fg}q{/}{${C.textDim}-fg}  quit{/}`
    : `{bold}{${C.accent}-fg}Tab{/}{${C.textDim}-fg}  switch{/}   {bold}{${C.accent}-fg}↑↓{/}{${C.textDim}-fg}  navigate{/}   {bold}{${C.accent}-fg}Enter{/}{${C.textDim}-fg}  open{/}   {bold}{${C.accent}-fg}/{/}{${C.textDim}-fg}  search{/}   {bold}{${C.accent}-fg}r{/}{${C.textDim}-fg}  refresh{/}   {bold}{${C.accent}-fg}g{/}{${C.textDim}-fg}  repo{/}   {bold}{${C.accent}-fg}q{/}{${C.textDim}-fg}  quit{/}`;

  if (msg) {
    statusBar.setContent(`\n  {${C.green}-fg}${msg}{/}`);
  } else {
    statusBar.setContent(`\n  ${hints}`);
  }
}

function flash(msg, ms = 2500) {
  renderStatus(msg);
  screen.render();
  setTimeout(() => { renderStatus(); screen.render(); }, ms);
}

// ── Data loading ───────────────────────────────────────────────────────────────

async function loadUser() {
  try {
    if (!gh.getToken()) return;
    ghUser = await gh.getAuthUser();
    if (!ghUser?.login) { ghUser = null; return; }
    renderTopBar();
    screen.render();
  } catch { /* ignore */ }
}

async function loadTab(idx) {
  if (loading) return;
  loading = true;

  const id = TABS[idx].id;

  if (id === 'ai') {
    loading = false;
    renderAITab();
    return;
  }

  listWidget.setItems([`  {${C.textDim}-fg}Loading…{/}`]);
  screen.render();

  try {
    if (id === 'repos') {
      if (gh.getToken()) {
        const data = await gh.listUserRepos(60);
        listData.repos = Array.isArray(data) ? data : [];
      } else {
        const data = await gh.searchRepos('stars:>5000 pushed:>2024-01-01', 'stars', 40);
        listData.repos = Array.isArray(data?.items) ? data.items : [];
      }
      const rows = listData.repos.map((r, i) => {
        const num = `{${C.textDim}-fg}${String(i + 1).padStart(3)}{/}`;
        const vis = r.private ? `{${C.yellow}-fg}⚡{/}` : `{${C.green}-fg}●{/}`;
        const name = `{bold}{${C.blue}-fg}${r.full_name}{/}`;
        const lang = r.language ? `{${C.purple}-fg}${r.language}{/}` : '';
        const stars = `{${C.yellow}-fg}★ ${r.stargazers_count ?? 0}{/}`;
        const desc = r.description ? `{${C.textMuted}-fg}  ${r.description.slice(0, 55)}{/}` : '';
        return `  ${num}  ${vis} ${name}  ${lang}  ${stars}${desc}`;
      });
      listWidget.setItems(rows.length ? rows : [`  {${C.textDim}-fg}No repositories found.{/}`]);

    } else if (id === 'issues') {
      if (!currentRepo) { listWidget.setItems([`  {${C.yellow}-fg}No repo set — press {bold}g{/} to set owner/repo.{/}`]); return; }
      const data = await gh.getIssues(currentRepo.owner, currentRepo.name, 'open', 60);
      listData.issues = Array.isArray(data) ? data : [];
      const rows = listData.issues.map((issue) => {
        const num = `{${C.textDim}-fg}#${String(issue.number).padEnd(5)}{/}`;
        const state = `{${C.green}-fg}●{/}`;
        const title = `{bold}${issue.title.slice(0, 60)}{/}`;
        const author = `{${C.textMuted}-fg}${issue.user.login}{/}`;
        const comments = issue.comments ? `{${C.textDim}-fg}  💬 ${issue.comments}{/}` : '';
        return `  ${num}  ${state}  ${title}  ${author}${comments}`;
      });
      listWidget.setItems(rows.length ? rows : [`  {${C.green}-fg}No open issues — all clear!{/}`]);

    } else if (id === 'prs') {
      if (!currentRepo) { listWidget.setItems([`  {${C.yellow}-fg}No repo set — press {bold}g{/} to set owner/repo.{/}`]); return; }
      const data = await gh.getPulls(currentRepo.owner, currentRepo.name, 'open', 60);
      listData.prs = Array.isArray(data) ? data : [];
      const rows = listData.prs.map((pr) => {
        const num = `{${C.textDim}-fg}#${String(pr.number).padEnd(5)}{/}`;
        const icon = pr.draft ? `{${C.textDim}-fg}◌{/}` : `{${C.green}-fg}⑂{/}`;
        const title = `{bold}${pr.title.slice(0, 58)}{/}`;
        const branch = `{${C.textDim}-fg}${pr.head.ref} → ${pr.base.ref}{/}`;
        const author = `{${C.textMuted}-fg}${pr.user.login}{/}`;
        return `  ${num}  ${icon}  ${title}  ${branch}  ${author}`;
      });
      listWidget.setItems(rows.length ? rows : [`  {${C.green}-fg}No open pull requests.{/}`]);

    } else if (id === 'commits') {
      if (!currentRepo) { listWidget.setItems([`  {${C.yellow}-fg}No repo set — press {bold}g{/} to set owner/repo.{/}`]); return; }
      const data = await gh.getCommits(currentRepo.owner, currentRepo.name, 50);
      listData.commits = Array.isArray(data) ? data : [];
      const rows = listData.commits.map((c) => {
        const sha = `{${C.accent}-fg}${c.sha.slice(0, 7)}{/}`;
        const msg = `{bold}${c.commit.message.split('\n')[0].slice(0, 58)}{/}`;
        const author = `{${C.textMuted}-fg}${c.commit.author.name}{/}`;
        const date = `{${C.textDim}-fg}${new Date(c.commit.author.date).toLocaleDateString()}{/}`;
        return `  ${sha}  ${msg}  ${author}  ${date}`;
      });
      listWidget.setItems(rows.length ? rows : [`  {${C.textDim}-fg}No commits found.{/}`]);
    }
  } catch (err) {
    listWidget.setItems([`  {${C.red}-fg}Error: ${err.message}{/}`]);
  } finally {
    loading = false;
    listWidget.select(0);
    screen.render();
  }
}

// ── AI tab ────────────────────────────────────────────────────────────────────

function renderAITab() {
  const lines = [];

  if (chatMessages.length === 0) {
    lines.push('');
    lines.push(`  {bold}{${C.accent}-fg}✦  yagt AI{/}`);
    lines.push(`  {${C.textDim}-fg}Powered by NVIDIA NIMs · ${currentRepo ? `Context: ${currentRepo.owner}/${currentRepo.name}` : 'No repo set — press g'}{/}`);
    lines.push('');
    lines.push(`  {${C.divider}-fg}${'─'.repeat(60)}{/}`);
    lines.push('');
    lines.push(`  {${C.textMuted}-fg}Press {bold}Enter{/} or {bold}/{/} to send a message.{/}`);
    lines.push('');
    lines.push(`  {${C.textDim}-fg}Try asking:{/}`);
    [
      '"Explain the architecture of this repo"',
      '"What are the main dependencies?"',
      '"Summarize recent activity"',
      '"How do I contribute to this project?"',
    ].forEach(s => lines.push(`  {${C.accentDim}-fg}›{/} {${C.textMuted}-fg}${s}{/}`));
  } else {
    chatMessages.forEach((m, i) => {
      lines.push('');
      if (m.role === 'user') {
        lines.push(`  {${C.textDim}-fg}${'─'.repeat(60)}{/}`);
        lines.push(`  {bold}{${C.blue}-fg}You{/}`);
        lines.push('');
        m.content.split('\n').forEach(l => lines.push(`  {${C.text}-fg}${l}{/}`));
      } else {
        lines.push(`  {bold}{${C.accent}-fg}✦ AI{/}`);
        lines.push('');
        m.content.split('\n').forEach(l => {
          if (l.startsWith('```') || l.startsWith('    ')) {
            lines.push(`  {${C.yellow}-fg}${l}{/}`);
          } else if (l.startsWith('##') || l.startsWith('**')) {
            lines.push(`  {bold}{${C.text}-fg}${l.replace(/\*\*/g, '')}{/}`);
          } else if (l.startsWith('- ') || l.startsWith('* ')) {
            lines.push(`  {${C.accentDim}-fg}›{/} {${C.text}-fg}${l.slice(2)}{/}`);
          } else {
            lines.push(`  {${C.text}-fg}${l}{/}`);
          }
        });
      }
    });
    lines.push('');
    lines.push(`  {${C.textDim}-fg}Press {bold}Enter{/} to send another message.{/}`);
  }

  listWidget.setItems(lines);
  listWidget.select(Math.max(0, lines.length - 1));
  screen.render();
}

async function sendAIMessage(msg) {
  if (!msg?.trim()) return;
  chatMessages.push({ role: 'user', content: msg.trim() });
  chatMessages.push({ role: 'assistant', content: '…thinking' });
  renderAITab();
  renderStatus(`{${C.accent}-fg}AI is thinking…{/}`);
  screen.render();

  try {
    const cfg = gh.loadConfig();
    const nimKey = cfg.nimKey || process.env.NVIDIA_API_KEY;
    if (!nimKey) {
      chatMessages[chatMessages.length - 1].content =
        'NVIDIA API key not configured.\nRun: yagt config --nim-key <key>';
      renderAITab();
      renderStatus();
      return;
    }

    let context = currentRepo ? `Repository: ${currentRepo.owner}/${currentRepo.name}\n` : '';
    if (currentRepo) {
      try {
        const [repoData, readme] = await Promise.all([
          gh.getRepo(currentRepo.owner, currentRepo.name),
          gh.getReadme(currentRepo.owner, currentRepo.name),
        ]);
        if (repoData?.description) context += `Description: ${repoData.description}\n`;
        if (repoData?.language) context += `Language: ${repoData.language}\n`;
        if (readme) context += `\nREADME:\n${readme.slice(0, 2000)}\n`;
      } catch { /* best effort */ }
    }

    const systemMsg = context
      ? `You are an AI assistant for GitHub repositories.\n\n${context}`
      : 'You are a helpful GitHub AI assistant.';

    const history = chatMessages.slice(0, -1).map(m => ({ role: m.role, content: m.content }));

    const https = require('https');
    const payload = JSON.stringify({
      model: cfg.model || 'deepseek-ai/deepseek-v4-flash',
      messages: [{ role: 'system', content: systemMsg }, ...history],
      max_tokens: 800,
      temperature: 0.3,
    });

    const answer = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'integrate.api.nvidia.com',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${nimKey}`,
          'Content-Length': Buffer.byteLength(payload),
        },
      }, (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(d);
            resolve(parsed.choices?.[0]?.message?.content ?? 'No response.');
          } catch { reject(new Error('Invalid response')); }
        });
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });

    chatMessages[chatMessages.length - 1].content = answer;
  } catch (err) {
    chatMessages[chatMessages.length - 1].content = `Error: ${err.message}`;
  }

  renderAITab();
  renderStatus();
  screen.render();
}

// ── Detail overlay ────────────────────────────────────────────────────────────

async function openDetail() {
  const idx = listWidget.selected;
  let lines = [];

  try {
    const id = TABS[activeTab].id;

    if (id === 'repos' && listData.repos[idx]) {
      const r = listData.repos[idx];
      lines = [
        `{bold}{${C.blue}-fg}${r.full_name}{/}`,
        '',
        r.description ? `{${C.textMuted}-fg}${r.description}{/}` : `{${C.textDim}-fg}No description{/}`,
        '',
        `{${C.textDim}-fg}Language{/}  {bold}${r.language ?? 'N/A'}{/}`,
        `{${C.textDim}-fg}Stars    {/}  {bold}{${C.yellow}-fg}★ ${r.stargazers_count ?? 0}{/}`,
        `{${C.textDim}-fg}Forks    {/}  {bold}${r.forks_count ?? 0}{/}`,
        `{${C.textDim}-fg}Issues   {/}  {bold}${r.open_issues_count ?? 0}{/}`,
        `{${C.textDim}-fg}Visibility{/} {bold}${r.private ? 'Private' : 'Public'}{/}`,
        '',
        `{${C.accent}-fg}${r.html_url}{/}`,
        '',
        `{${C.textDim}-fg}Press {bold}g{/} to set as active repo  ·  {bold}Esc{/} to close{/}`,
      ];
      overlay._pendingRepo = { owner: r.owner?.login ?? r.full_name.split('/')[0], name: r.name };

    } else if (id === 'issues' && listData.issues[idx]) {
      const issue = listData.issues[idx];
      const comments = await gh.getIssueComments(currentRepo.owner, currentRepo.name, issue.number).catch(() => []);
      const labelStr = issue.labels?.map(l => `{#${l.color}-fg}[${l.name}]{/}`).join(' ') ?? '';
      lines = [
        `{bold}#${issue.number}  ${issue.title}{/}`,
        `{${C.green}-fg}● open{/}  {${C.textMuted}-fg}by ${issue.user.login}{/}  ${labelStr}`,
        '',
        issue.body?.slice(0, 800) ?? `{${C.textDim}-fg}No description{/}`,
        '',
        `{${C.textDim}-fg}─── ${comments.length} comment(s) ───{/}`,
        ...comments.slice(0, 3).flatMap(c => [
          '',
          `{bold}{${C.blue}-fg}${c.user.login}{/}`,
          c.body.slice(0, 250),
        ]),
        '',
        `{${C.textDim}-fg}Esc to close{/}`,
      ];

    } else if (id === 'prs' && listData.prs[idx]) {
      const pr = listData.prs[idx];
      const stateColor = pr.merged_at ? C.purple : pr.state === 'open' ? C.green : C.red;
      const stateLabel = pr.merged_at ? 'merged' : pr.state;
      lines = [
        `{bold}#${pr.number}  ${pr.title}{/}`,
        `{${stateColor}-fg}● ${stateLabel}{/}  {${C.textDim}-fg}${pr.head.ref} → ${pr.base.ref}{/}  {${C.textMuted}-fg}by ${pr.user.login}{/}`,
        '',
        pr.body?.slice(0, 600) ?? `{${C.textDim}-fg}No description{/}`,
        '',
        `{${C.accent}-fg}${pr.html_url}{/}`,
        '',
        `{${C.textDim}-fg}Esc to close{/}`,
      ];

    } else if (id === 'commits' && listData.commits[idx]) {
      const c = listData.commits[idx];
      lines = [
        `{bold}{${C.accent}-fg}${c.sha.slice(0, 12)}{/}`,
        '',
        `{bold}${c.commit.message}{/}`,
        '',
        `{${C.textDim}-fg}Author {/} ${c.commit.author.name} <${c.commit.author.email}>`,
        `{${C.textDim}-fg}Date   {/} ${new Date(c.commit.author.date).toLocaleString()}`,
        '',
        c.html_url ? `{${C.accent}-fg}${c.html_url}{/}` : '',
        '',
        `{${C.textDim}-fg}Esc to close{/}`,
      ].filter(l => l !== undefined);
    } else {
      return;
    }
  } catch (err) {
    lines = [`{${C.red}-fg}Error: ${err.message}{/}`];
  }

  overlay.setContent(lines.join('\n'));
  overlay.show();
  overlay.focus();
  screen.render();
}

overlay.key(['escape', 'q'], () => {
  overlay.hide();
  listWidget.focus();
  screen.render();
});

// ── Set repo prompt ───────────────────────────────────────────────────────────

function promptSetRepo(defaultVal) {
  const def = defaultVal ?? (currentRepo ? `${currentRepo.owner}/${currentRepo.name}` : '');
  const p = blessed.prompt({
    parent: screen,
    top: 'center', left: 'center', width: 52, height: 8,
    border: { type: 'line' },
    style: {
      bg: C.cardBg, fg: C.text,
      border: { fg: C.accent },
      label: { fg: C.accent, bold: true },
    },
    label: '  Set repository  ',
    tags: true,
  });
  p.input('{grey-fg}owner/repo (e.g. torvalds/linux){/}', def, (err, value) => {
    if (!err && value?.trim()) {
      const parts = value.trim().split('/');
      if (parts.length === 2 && parts[0] && parts[1]) {
        currentRepo = { owner: parts[0], name: parts[1] };
        renderTopBar();
        loadTab(activeTab);
        flash(`Repo set to ${currentRepo.owner}/${currentRepo.name}`);
      } else {
        flash('{red-fg}Invalid format — use owner/repo{/}');
      }
    }
    listWidget.focus();
    screen.render();
  });
}

// ── Search / filter prompt ────────────────────────────────────────────────────

function promptSearch() {
  const id = TABS[activeTab].id;

  if (id === 'ai') {
    const p = blessed.prompt({
      parent: screen,
      top: 'center', left: 'center', width: 60, height: 8,
      border: { type: 'line' },
      style: {
        bg: C.cardBg, fg: C.text,
        border: { fg: C.accent },
        label: { fg: C.accent, bold: true },
      },
      label: '  ✦ Ask AI  ',
      tags: true,
    });
    p.input('{grey-fg}Type your message…{/}', '', async (err, value) => {
      listWidget.focus();
      screen.render();
      if (!err && value?.trim()) await sendAIMessage(value);
    });
    return;
  }

  const p = blessed.prompt({
    parent: screen,
    top: 'center', left: 'center', width: 52, height: 8,
    border: { type: 'line' },
    style: {
      bg: C.cardBg, fg: C.text,
      border: { fg: C.accent },
      label: { fg: C.accent, bold: true },
    },
    label: '  Search  ',
    tags: true,
  });

  const placeholder = id === 'repos' ? '{grey-fg}Search GitHub repositories…{/}' : '{grey-fg}Filter…{/}';
  p.input(placeholder, '', async (err, value) => {
    listWidget.focus();
    if (!err && value?.trim()) {
      if (id === 'repos') {
        loading = true;
        listWidget.setItems([`  {${C.textDim}-fg}Searching GitHub…{/}`]);
        screen.render();
        try {
          const res = await gh.searchRepos(value.trim(), 'stars', 40);
          listData.repos = Array.isArray(res?.items) ? res.items : [];
          const rows = listData.repos.map((r) => {
            const stars = `{${C.yellow}-fg}★ ${r.stargazers_count ?? 0}{/}`;
            const lang = r.language ? `{${C.purple}-fg}${r.language}{/}` : '';
            return `  {bold}{${C.blue}-fg}${r.full_name}{/}  ${lang}  ${stars}  {${C.textMuted}-fg}${(r.description ?? '').slice(0, 50)}{/}`;
          });
          listWidget.setItems(rows.length ? rows : [`  {${C.textDim}-fg}No results for "${value}"{/}`]);
          listWidget.select(0);
        } catch (e) {
          listWidget.setItems([`  {${C.red}-fg}Search failed: ${e.message}{/}`]);
        } finally {
          loading = false;
        }
      } else {
        flash(`Filter: "${value}" (refresh with r to clear)`);
      }
    }
    screen.render();
  });
}

// ── Tab switching ─────────────────────────────────────────────────────────────

async function switchTab(idx) {
  activeTab = ((idx % TABS.length) + TABS.length) % TABS.length;
  renderTabs();
  renderStatus();
  screen.render();
  await loadTab(activeTab);
}

// ── Key bindings ──────────────────────────────────────────────────────────────

screen.key(['q', 'C-c'], () => {
  screen.destroy();
  process.stdout.write('\x1b[?1049l'); // restore alternate screen
  process.exit(0);
});

screen.key('tab', () => switchTab(activeTab + 1));
screen.key('S-tab', () => switchTab(activeTab - 1));
for (let i = 1; i <= TABS.length; i++) screen.key(String(i), () => switchTab(i - 1));

screen.key(['/', 'i'], () => promptSearch());
screen.key('g', () => {
  if (!overlay.hidden) {
    const repo = overlay._pendingRepo;
    overlay.hide();
    listWidget.focus();
    if (repo) { currentRepo = repo; renderTopBar(); loadTab(activeTab); flash(`Repo set to ${repo.owner}/${repo.name}`); return; }
  }
  promptSetRepo();
});
screen.key('r', () => loadTab(activeTab));
screen.key('c', () => { if (TABS[activeTab].id === 'ai') { chatMessages = []; renderAITab(); } });
screen.key('escape', () => {
  if (!overlay.hidden) { overlay.hide(); listWidget.focus(); screen.render(); }
});
screen.key('enter', () => {
  const id = TABS[activeTab].id;
  if (id === 'ai') { promptSearch(); return; }
  openDetail();
});
listWidget.key('enter', () => {
  const id = TABS[activeTab].id;
  if (id === 'ai') { promptSearch(); return; }
  openDetail();
});

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  renderTopBar();
  renderTabs();
  renderStatus();
  screen.render();
  listWidget.focus();
  await Promise.all([loadUser(), loadTab(0)]);
}

init().catch(() => {});
