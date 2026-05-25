#!/usr/bin/env node

'use strict';

const { program } = require('commander');
const chalk = require('chalk');
const { execSync, spawn } = require('child_process');
const inquirer = require('inquirer');
const ora = require('ora');
const fs = require('fs');
const path = require('path');
const os = require('os');
const ai = require('./ai');
const gh = require('./github');

const YAGT_VERSION = '0.2.0';

// ── Helpers ─────────────────────────────────────────────────────────────────

function runGit(args, options = {}) {
  try {
    const result = execSync(`git ${args}`, {
      encoding: 'utf-8',
      stdio: options.silent ? 'pipe' : 'inherit',
      cwd: options.cwd || process.cwd()
    });
    return result ? result.trim() : '';
  } catch (err) {
    if (options.ignoreError) return '';
    console.error(chalk.red(`✖ git ${args.split(' ')[0]} failed`));
    if (!options.silent) process.exit(1);
    return '';
  }
}

function isGitRepo() {
  return fs.existsSync(path.join(process.cwd(), '.git'));
}

// ── Progress bar for git operations ──────────────────────────────────────────

function renderProgressBar(label, pct, extra = '') {
  const W = 24;
  const filled = Math.round((pct / 100) * W);
  const bar = chalk.hex('#7c3aed')('█'.repeat(filled)) + chalk.dim('░'.repeat(W - filled));
  const pctStr = chalk.bold(`${String(Math.round(pct)).padStart(3)}%`);
  const labelStr = chalk.cyan(label.padEnd(22));
  process.stderr.write(`\r  ${labelStr}  ${bar}  ${pctStr}  ${chalk.dim(extra)}    `);
}

function gitWithProgress(args, opts = {}) {
  return new Promise((resolve, reject) => {
    // --progress forces git to emit progress to stderr even when piped
    const gitArgs = (args + ' --progress').trim().split(/\s+/);
    const proc = spawn('git', gitArgs, {
      cwd: opts.cwd || process.cwd(),
      stdio: ['inherit', 'inherit', 'pipe'],
    });

    let lastLabel = '';
    let buf = '';

    proc.stderr.on('data', (chunk) => {
      buf += chunk.toString();
      // Process all complete lines (git uses \r for progress, \n for messages)
      const parts = buf.split(/[\r\n]/);
      buf = parts.pop() ?? '';

      for (const line of parts) {
        const clean = line.replace(/\x1b\[[0-9;]*m/g, '').trim();
        if (!clean) continue;

        // Match: "Receiving objects:  60% (60/100), 1.23 MiB | 2.34 MiB/s"
        const m = clean.match(/^([A-Za-z ]+?):\s+(\d+)%\s*\([\d/]+\)(?:,\s*(.+))?/);
        if (m) {
          const label = m[1].trim();
          const pct = parseInt(m[2]);
          const extra = m[3] ?? '';
          lastLabel = label;
          renderProgressBar(label, pct, extra);
        } else if (clean && !clean.startsWith('remote:') && !clean.includes('done')) {
          // Non-progress lines: print below
          if (lastLabel) { process.stderr.write('\n'); lastLabel = ''; }
          process.stderr.write(`  ${chalk.dim(clean)}\n`);
        }
      }
    });

    proc.on('close', (code) => {
      if (lastLabel) process.stderr.write('\n');
      if (code === 0) resolve();
      else reject(new Error(`git exited with code ${code}`));
    });

    proc.on('error', reject);
  });
}

function ensureRepo() {
  if (!isGitRepo()) {
    console.error(chalk.red('✖ Not a git repository. Run `yagt init` first.'));
    process.exit(1);
  }
}

function requireGithubToken() {
  const token = gh.getToken();
  if (!token) {
    console.error(chalk.red('✖ GitHub token required.'));
    console.error(chalk.dim('  Run: yagt config --github-token <token>'));
    console.error(chalk.dim('  Or set GITHUB_TOKEN environment variable'));
    process.exit(1);
  }
  return token;
}

function header() {
  console.log(chalk.bold.cyan('\nyagt') + chalk.dim(` v${YAGT_VERSION}`) + '\n');
}

function printRepo(repo) {
  console.log(chalk.bold(`${chalk.cyan(repo.full_name)}`));
  if (repo.description) console.log(chalk.dim(repo.description));
  const line2 = [
    repo.private ? chalk.yellow('⚡ Private') : chalk.green('● Public'),
    repo.language ? chalk.blue(repo.language) : null,
    `★ ${repo.stargazers_count.toLocaleString()}`,
    `⑂ ${repo.forks_count.toLocaleString()}`,
    `⚠ ${repo.open_issues_count} issues`,
  ].filter(Boolean).join(chalk.dim('  '));
  console.log(line2);
  if (repo.topics?.length) console.log(chalk.dim(repo.topics.map(t => `#${t}`).join(' ')));
  console.log(chalk.dim(`  ${repo.html_url}`));
}

function printIssue(issue) {
  const state = issue.state === 'open' ? chalk.green('● open') : chalk.red('✖ closed');
  console.log(`\n${chalk.bold(`#${issue.number}`)} ${issue.title} ${state}`);
  console.log(chalk.dim(`  by ${issue.user.login} · ${new Date(issue.created_at).toLocaleDateString()}`));
  if (issue.labels?.length) console.log('  ' + issue.labels.map(l => chalk.bgHex(`#${l.color}`).black(` ${l.name} `)).join(' '));
  if (issue.body) {
    const preview = issue.body.slice(0, 300).replace(/\n+/g, ' ');
    console.log('\n' + chalk.white(preview) + (issue.body.length > 300 ? chalk.dim('…') : ''));
  }
}

function printPR(pr) {
  const icon = pr.draft ? chalk.dim('◌') : pr.merged_at ? chalk.magenta('⑂') : pr.state === 'open' ? chalk.green('●') : chalk.red('✖');
  console.log(`\n${icon} ${chalk.bold(`#${pr.number}`)} ${pr.title}`);
  console.log(chalk.dim(`  ${pr.head.ref} → ${pr.base.ref} · by ${pr.user.login}`));
  if (pr.body) console.log(chalk.dim('  ' + pr.body.slice(0, 120).replace(/\n/g, ' ')));
}

// ── Git commands ─────────────────────────────────────────────────────────────

program
  .name('yagt')
  .description('AI-powered GitHub CLI — git + GitHub API + NVIDIA NIMs')
  .version(YAGT_VERSION, '-v, --version')
  .addHelpText('after', `
${chalk.bold('GitHub commands:')}
  yagt clone <owner/repo>        Clone a GitHub repo by shorthand
  yagt repo [owner/repo]         Show repository info
  yagt issue --list [owner/repo] List issues
  yagt issue <n> [owner/repo]    View an issue (--ai to analyze)
  yagt issue --new [owner/repo]  Create an issue
  yagt pr --list [owner/repo]    List pull requests
  yagt pr <n> [owner/repo]       View a PR
  yagt fork [owner/repo]         Fork a repository
  yagt star [owner/repo]         Star/unstar a repository
  yagt search <query>            Search GitHub repositories
  yagt open [owner/repo]         Open repo in browser

${chalk.bold('AI commands:')}
  yagt commit --ai               AI-generated commit message
  yagt diff --ai                 AI code review
  yagt ask "<question>"          Ask AI about the current repo
  yagt explain "<git command>"   Explain a git command
  yagt summary                   Summarize current repo with AI

${chalk.bold('Config:')}
  yagt config --github-token <t> Save GitHub token
  yagt config --nim-key <k>      Save NVIDIA NIM API key
  yagt config --show             Show current config
`);

program
  .command('init')
  .description('Initialize a new git repository')
  .argument('[directory]', 'directory to initialize')
  .action((directory) => {
    header();
    const target = directory || process.cwd();
    if (directory && !fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true });
    const spinner = ora('Initializing...').start();
    runGit('init', { cwd: target, silent: true });
    spinner.succeed(chalk.green(`Initialized ${chalk.bold(path.resolve(target))}`));
  });

program
  .command('status')
  .alias('st')
  .description('Show working tree status')
  .action(() => {
    ensureRepo();
    const status = runGit('status -sb', { silent: true, ignoreError: true });
    if (!status.trim()) { console.log(chalk.green('✔ Nothing to commit, working tree clean')); return; }
    console.log(chalk.bold('Status:\n'));
    console.log(status);
  });

program
  .command('add')
  .description('Stage files')
  .argument('[files...]', 'files to add (empty = interactive)')
  .action(async (files) => {
    ensureRepo();
    if (!files || files.length === 0) {
      const statusOutput = runGit('status --short', { silent: true, ignoreError: true });
      if (!statusOutput) { console.log(chalk.green('✔ Nothing to stage')); return; }
      const fileList = statusOutput.split('\n').filter(Boolean).map(line => ({
        name: line, value: line.substring(3),
      }));
      const { selected } = await inquirer.prompt([{
        type: 'checkbox', name: 'selected', message: 'Select files to stage:',
        choices: [{ name: chalk.bold('All files'), value: '.' }, new inquirer.Separator(), ...fileList]
      }]);
      if (!selected.length) { console.log(chalk.yellow('Nothing selected')); return; }
      const toStage = selected.includes('.') ? '.' : selected.join(' ');
      const spinner = ora('Staging...').start();
      runGit(`add ${toStage}`, { silent: true });
      spinner.succeed(chalk.green('Staged'));
    } else {
      const spinner = ora(`Adding ${files.join(', ')}...`).start();
      runGit(`add ${files.join(' ')}`, { silent: true });
      spinner.succeed(chalk.green('Added'));
    }
  });

program
  .command('commit')
  .alias('cm')
  .description('Record changes to the repository')
  .argument('[message]', 'commit message')
  .option('-m, --message <msg>', 'commit message')
  .option('-a, --all', 'stage all modified files')
  .option('--ai', 'generate commit message with AI')
  .action(async (msg, options) => {
    ensureRepo();
    let message = options.message || msg;

    if (options.ai || (!message && ai.getNimKey())) {
      const diff = runGit('diff --cached', { silent: true, ignoreError: true }) ||
        runGit('diff', { silent: true, ignoreError: true });
      if (!diff) { console.log(chalk.yellow('No changes to commit')); return; }
      const spinner = ora('AI generating commit message...').start();
      try {
        message = await ai.generateCommitMessage(diff);
        spinner.succeed(chalk.green('AI suggestion:'));
        console.log(chalk.cyan(`  ${message}\n`));
        const { ok } = await inquirer.prompt([{ type: 'confirm', name: 'ok', message: 'Use this?', default: true }]);
        if (!ok) {
          const { custom } = await inquirer.prompt([{ type: 'input', name: 'custom', message: 'Your message:', validate: v => v ? true : 'Required' }]);
          message = custom;
        }
      } catch (err) {
        spinner.fail(chalk.red(err.message));
        const { custom } = await inquirer.prompt([{ type: 'input', name: 'custom', message: 'Commit message:', validate: v => v ? true : 'Required' }]);
        message = custom;
      }
    }

    if (!message) {
      const { type, scope, desc } = await inquirer.prompt([
        { type: 'list', name: 'type', message: 'Type:', choices: ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore'] },
        { type: 'input', name: 'scope', message: 'Scope (optional):' },
        { type: 'input', name: 'desc', message: 'Description:', validate: v => v ? true : 'Required' },
      ]);
      message = `${type}${scope ? `(${scope})` : ''}: ${desc}`;
    }

    const allFlag = options.all ? '-a ' : '';
    const spinner = ora('Committing...').start();
    runGit(`commit ${allFlag}-m "${message.replace(/"/g, '\\"')}"`, { silent: true });
    const hash = runGit('rev-parse --short HEAD', { silent: true, ignoreError: true });
    spinner.succeed(`${chalk.yellow(hash)} ${message.split('\n')[0]}`);
  });

program
  .command('push')
  .description('Push to remote')
  .argument('[remote]', 'remote', 'origin')
  .argument('[branch]', 'branch')
  .option('-u, --upstream', 'set upstream tracking')
  .action(async (remote, branch, options) => {
    ensureRepo();
    const current = runGit('branch --show-current', { silent: true, ignoreError: true });
    const target = branch || current;
    console.log(chalk.bold(`\n  Pushing to ${chalk.cyan(remote + '/' + target)}...\n`));
    try {
      await gitWithProgress(`push ${options.upstream ? '-u ' : ''}${remote} ${target}`);
      console.log('\n  ' + chalk.green('✔') + chalk.bold(` Pushed → ${remote}/${target}`));
    } catch {
      console.log('\n  ' + chalk.red('✖ Push failed'));
      process.exit(1);
    }
  });

program
  .command('pull')
  .description('Pull from remote')
  .argument('[remote]', 'remote', 'origin')
  .argument('[branch]', 'branch')
  .action(async (remote, branch) => {
    ensureRepo();
    const current = runGit('branch --show-current', { silent: true, ignoreError: true });
    const target = branch || current;
    console.log(chalk.bold(`\n  Pulling from ${chalk.cyan(remote + '/' + target)}...\n`));
    try {
      await gitWithProgress(`pull ${remote} ${target}`);
      console.log('\n  ' + chalk.green('✔') + chalk.bold(' Pull complete'));
    } catch {
      console.log('\n  ' + chalk.red('✖ Pull failed'));
      process.exit(1);
    }
  });

// ── GitHub: clone ─────────────────────────────────────────────────────────────

program
  .command('clone')
  .description('Clone a repository (supports owner/repo shorthand)')
  .argument('<repo>', 'owner/repo, GitHub URL, or git URL')
  .argument('[directory]', 'target directory')
  .option('-b, --branch <branch>', 'clone specific branch')
  .option('--ssh', 'use SSH URL instead of HTTPS')
  .option('--depth <n>', 'shallow clone with depth')
  .action(async (repo, directory, options) => {
    header();
    let url = repo;

    // Convert owner/repo shorthand to URL
    const parsed = gh.parseRepoArg(repo);
    if (parsed && !repo.startsWith('http') && !repo.startsWith('git@')) {
      url = options.ssh
        ? `git@github.com:${parsed.owner}/${parsed.repo}.git`
        : `https://github.com/${parsed.owner}/${parsed.repo}.git`;
      console.log(chalk.dim(`→ ${url}`));
    }

    const branchFlag = options.branch ? `-b ${options.branch} ` : '';
    const depthFlag = options.depth ? `--depth ${options.depth} ` : '';
    const dirArg = directory ? ` ${directory}` : '';

    console.log(chalk.bold(`\n  Cloning ${chalk.cyan(url)}...\n`));
    try {
      await gitWithProgress(`clone ${branchFlag}${depthFlag}${url}${dirArg}`);
      const target = directory || (parsed ? parsed.repo : path.basename(url, '.git'));
      console.log('\n  ' + chalk.green('✔') + chalk.bold(' Clone complete'));
      console.log(chalk.dim(`  cd ${path.resolve(target)}`));
    } catch {
      console.log('\n  ' + chalk.red('✖ Clone failed'));
    }
  });

// ── GitHub: repo ──────────────────────────────────────────────────────────────

program
  .command('repo')
  .description('Show GitHub repository info')
  .argument('[repo]', 'owner/repo (default: current git remote)')
  .option('--files', 'list files in root directory')
  .option('--commits', 'show recent commits')
  .action(async (repoArg, options) => {
    header();
    const parsed = gh.resolveRepo(repoArg);
    if (!parsed) { console.error(chalk.red('Could not resolve repository. Pass owner/repo or run inside a git repo.')); process.exit(1); }
    const { owner, repo } = parsed;

    const spinner = ora(`Fetching ${owner}/${repo}...`).start();
    try {
      const repoData = await gh.getRepo(owner, repo);
      spinner.stop();
      printRepo(repoData);

      if (options.files) {
        console.log(chalk.bold('\nFiles:'));
        const contents = await gh.getRepoContents(owner, repo);
        if (Array.isArray(contents)) {
          contents.sort((a, b) => a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1)
            .forEach(f => console.log(`  ${f.type === 'dir' ? chalk.blue('📁') : '📄'} ${f.name}`));
        }
      }

      if (options.commits) {
        console.log(chalk.bold('\nRecent commits:'));
        const commits = await gh.getCommits(owner, repo, 10);
        if (Array.isArray(commits)) {
          commits.forEach(c => {
            const msg = c.commit.message.split('\n')[0];
            const sha = chalk.yellow(c.sha.slice(0, 7));
            const author = chalk.dim(c.commit.author.name);
            console.log(`  ${sha} ${msg} ${author}`);
          });
        }
      }
    } catch (err) {
      spinner.fail(chalk.red(err.message));
    }
  });

// ── GitHub: issue ─────────────────────────────────────────────────────────────

program
  .command('issue')
  .description('Browse and analyze GitHub issues')
  .argument('[number]', 'issue number (omit to list)')
  .argument('[repo]', 'owner/repo (default: current git remote)')
  .option('-l, --list', 'list open issues')
  .option('--closed', 'show closed issues')
  .option('--ai', 'analyze issue with AI')
  .option('--new', 'create a new issue')
  .option('--comment <text>', 'add a comment to the issue')
  .option('--close', 'close the issue')
  .option('--reopen', 'reopen the issue')
  .option('-n, --limit <n>', 'max issues to show', '20')
  .action(async (number, repoArg, options) => {
    header();
    // If number looks like owner/repo (contains /), treat it as repoArg
    if (number && number.includes('/') && !repoArg) { repoArg = number; number = undefined; }
    const parsed = gh.resolveRepo(repoArg);
    if (!parsed) { console.error(chalk.red('Could not resolve repository.')); process.exit(1); }
    const { owner, repo } = parsed;

    // Create new issue
    if (options.new) {
      requireGithubToken();
      const answers = await inquirer.prompt([
        { type: 'input', name: 'title', message: 'Issue title:', validate: v => v ? true : 'Required' },
        { type: 'input', name: 'body', message: 'Description (optional):' },
        { type: 'input', name: 'labels', message: 'Labels (comma-separated, optional):' },
      ]);
      const spinner = ora('Creating issue...').start();
      try {
        const labels = answers.labels ? answers.labels.split(',').map(l => l.trim()).filter(Boolean) : [];
        const issue = await gh.createIssue(owner, repo, answers.title, answers.body, labels);
        spinner.succeed(chalk.green(`Issue #${issue.number} created`));
        console.log(chalk.dim(`  ${issue.html_url}`));
      } catch (err) { spinner.fail(chalk.red(err.message)); }
      return;
    }

    // Close / reopen issue
    if (number && (options.close || options.reopen)) {
      requireGithubToken();
      const newState = options.close ? 'closed' : 'open';
      const spinner = ora(`${options.close ? 'Closing' : 'Reopening'} issue #${number}...`).start();
      try {
        const issue = await gh.updateIssueState(owner, repo, number, newState);
        spinner.succeed(chalk.green(`Issue #${issue.number} is now ${issue.state}`));
        console.log(chalk.dim(`  ${issue.html_url}`));
      } catch (err) { spinner.fail(chalk.red(err.message)); }
      return;
    }

    // Comment on issue
    if (number && options.comment) {
      requireGithubToken();
      const spinner = ora(`Adding comment to issue #${number}...`).start();
      try {
        const comment = await gh.commentOnIssue(owner, repo, number, options.comment);
        spinner.succeed(chalk.green(`Comment added to issue #${number}`));
        console.log(chalk.dim(`  ${comment.html_url}`));
      } catch (err) { spinner.fail(chalk.red(err.message)); }
      return;
    }

    // View specific issue
    if (number && !options.list) {
      const spinner = ora(`Fetching issue #${number}...`).start();
      try {
        const [issue, comments] = await Promise.all([
          gh.getIssue(owner, repo, number),
          gh.getIssueComments(owner, repo, number),
        ]);
        spinner.stop();
        printIssue(issue);

        if (comments.length) {
          console.log(chalk.bold(`\n  ${comments.length} comment(s):`));
          comments.slice(0, 5).forEach(c => {
            console.log(`\n  ${chalk.cyan(c.user.login)} · ${new Date(c.created_at).toLocaleDateString()}`);
            console.log('  ' + c.body.slice(0, 200).replace(/\n/g, '\n  '));
          });
        }

        if (options.ai) {
          console.log('\n');
          const nimSpinner = ora('AI analyzing issue...').start();
          try {
            let readme = '';
            let commits = '';
            try {
              readme = (await gh.getReadme(owner, repo)) ?? '';
              const cs = await gh.getCommits(owner, repo, 10);
              if (Array.isArray(cs)) commits = cs.map(c => c.commit.message.split('\n')[0]).join('\n');
            } catch { }
            const analysis = await ai.analyzeIssue(issue.title, issue.body || '', readme, commits);
            nimSpinner.succeed(chalk.green('AI Analysis:\n'));
            console.log(analysis);
          } catch (err) { nimSpinner.fail(chalk.red(err.message)); }
        }
      } catch (err) { spinner.fail(chalk.red(err.message)); }
      return;
    }

    // List issues
    const state = options.closed ? 'closed' : 'open';
    const spinner = ora(`Fetching ${state} issues for ${owner}/${repo}...`).start();
    try {
      const issues = await gh.getIssues(owner, repo, state, parseInt(options.limit));
      spinner.stop();
      if (!Array.isArray(issues) || !issues.length) { console.log(chalk.yellow(`No ${state} issues.`)); return; }
      console.log(chalk.bold(`\n${issues.length} ${state} issue(s) in ${owner}/${repo}:\n`));
      issues.forEach(i => {
        const labels = i.labels?.map(l => chalk.bgHex(`#${l.color}`).black(` ${l.name} `)).join(' ') ?? '';
        console.log(`  ${chalk.green('#' + i.number.toString().padEnd(5))} ${i.title} ${labels}`);
        console.log(chalk.dim(`         by ${i.user.login} · ${new Date(i.created_at).toLocaleDateString()}`));
      });
      console.log(`\n  Run ${chalk.cyan(`yagt issue <number> ${repoArg || owner + '/' + repo} --ai`)} to analyze with AI`);
    } catch (err) { spinner.fail(chalk.red(err.message)); }
  });

// ── GitHub: pr ────────────────────────────────────────────────────────────────

program
  .command('pr')
  .description('Browse GitHub pull requests')
  .argument('[number]', 'PR number (omit to list)')
  .argument('[repo]', 'owner/repo')
  .option('-l, --list', 'list open PRs')
  .option('--closed', 'show closed/merged PRs')
  .option('--ai', 'AI review the PR diff')
  .option('--new', 'create a new pull request')
  .option('--merge', 'merge the pull request')
  .option('--close', 'close the pull request')
  .option('--reopen', 'reopen the pull request')
  .option('-n, --limit <n>', 'max PRs', '20')
  .action(async (number, repoArg, options) => {
    header();
    if (number && number.includes('/') && !repoArg) { repoArg = number; number = undefined; }
    const parsed = gh.resolveRepo(repoArg);
    if (!parsed) { console.error(chalk.red('Could not resolve repository.')); process.exit(1); }
    const { owner, repo } = parsed;

    // Create new PR interactively
    if (options.new) {
      requireGithubToken();
      const spinner = ora('Fetching branches...').start();
      let branches = [];
      try {
        const data = await gh.getBranches(owner, repo);
        branches = Array.isArray(data) ? data.map(b => b.name) : [];
        spinner.stop();
      } catch { spinner.stop(); }

      let currentBranch = '';
      try { currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8', stdio: 'pipe' }).trim(); } catch { }

      const answers = await inquirer.prompt([
        { type: 'input', name: 'title', message: 'PR title:', validate: v => v ? true : 'Required' },
        { type: 'input', name: 'body', message: 'Description (optional):' },
        {
          type: 'list', name: 'head', message: 'Head branch (your changes):',
          choices: branches.length ? branches : [currentBranch || 'main'],
          default: currentBranch,
        },
        {
          type: 'list', name: 'base', message: 'Base branch (merge into):',
          choices: branches.length ? branches : ['main'],
          default: branches.includes('main') ? 'main' : branches[0],
        },
        { type: 'confirm', name: 'draft', message: 'Create as draft?', default: false },
      ]);

      const prSpinner = ora('Creating pull request...').start();
      try {
        const pr = await gh.createPullRequest(owner, repo, answers);
        prSpinner.succeed(chalk.green(`PR #${pr.number} created: ${pr.title}`));
        console.log(chalk.dim(`  ${pr.html_url}`));
      } catch (err) { prSpinner.fail(chalk.red(err.message)); }
      return;
    }

    // Merge PR
    if (number && options.merge) {
      requireGithubToken();
      const spinner = ora(`Merging PR #${number}...`).start();
      try {
        const result = await gh.mergePullRequest(owner, repo, number);
        spinner.succeed(chalk.green(result.message || `PR #${number} merged`));
      } catch (err) { spinner.fail(chalk.red(err.message)); }
      return;
    }

    // Close / reopen PR
    if (number && (options.close || options.reopen)) {
      requireGithubToken();
      const newState = options.close ? 'closed' : 'open';
      const spinner = ora(`${options.close ? 'Closing' : 'Reopening'} PR #${number}...`).start();
      try {
        const pr = await gh.updatePullState(owner, repo, number, newState);
        spinner.succeed(chalk.green(`PR #${pr.number} is now ${pr.state}`));
        console.log(chalk.dim(`  ${pr.html_url}`));
      } catch (err) { spinner.fail(chalk.red(err.message)); }
      return;
    }

    if (number && !options.list) {
      const spinner = ora(`Fetching PR #${number}...`).start();
      try {
        const pr = await gh.getPull(owner, repo, number);
        spinner.stop();
        printPR(pr);
        console.log(`\n  ${chalk.dim(pr.html_url)}`);
        console.log(chalk.dim(`  +${pr.additions} -${pr.deletions} in ${pr.changed_files} file(s)`));
        console.log(chalk.dim(`  ${pr.commits} commit(s) · ${pr.comments + pr.review_comments} comment(s)`));

        if (options.ai) {
          const nimSpinner = ora('AI reviewing PR...').start();
          try {
            // Fetch diff
            const diffData = await new Promise((resolve, reject) => {
              const { https: h } = require('https');
              const req = require('https').request({
                hostname: 'api.github.com',
                path: `/repos/${owner}/${repo}/pulls/${number}`,
                headers: {
                  'Accept': 'application/vnd.github.v3.diff',
                  'User-Agent': 'yagt-cli',
                  ...(gh.getToken() ? { 'Authorization': `token ${gh.getToken()}` } : {}),
                }
              }, (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(d)); });
              req.on('error', reject);
              req.end();
            });
            const review = await ai.reviewCode(diffData);
            nimSpinner.succeed(chalk.green('AI Review:\n'));
            console.log(review);
          } catch (err) { nimSpinner.fail(chalk.red(err.message)); }
        }
      } catch (err) { spinner.fail(chalk.red(err.message)); }
      return;
    }

    const state = options.closed ? 'closed' : 'open';
    const spinner = ora(`Fetching ${state} PRs...`).start();
    try {
      const prs = await gh.getPulls(owner, repo, state, parseInt(options.limit));
      spinner.stop();
      if (!Array.isArray(prs) || !prs.length) { console.log(chalk.yellow(`No ${state} PRs.`)); return; }
      console.log(chalk.bold(`\n${prs.length} ${state} PR(s) in ${owner}/${repo}:\n`));
      prs.forEach(p => printPR(p));
    } catch (err) { spinner.fail(chalk.red(err.message)); }
  });

// ── GitHub: search ────────────────────────────────────────────────────────────

program
  .command('search')
  .description('Search GitHub repositories')
  .argument('<query>', 'search query')
  .option('-n, --limit <n>', 'max results', '10')
  .option('--sort <field>', 'sort by: stars, forks, updated', 'stars')
  .action(async (query, options) => {
    header();
    const spinner = ora(`Searching for "${query}"...`).start();
    try {
      const result = await gh.searchRepos(query, options.sort, parseInt(options.limit));
      spinner.stop();
      if (!result.items?.length) { console.log(chalk.yellow('No results.')); return; }
      console.log(chalk.bold(`\n${result.total_count.toLocaleString()} results · showing ${result.items.length}:\n`));
      result.items.forEach((r, i) => {
        console.log(`${chalk.dim((i + 1).toString().padStart(2))}  ${chalk.cyan(r.full_name)}`);
        if (r.description) console.log(`    ${chalk.dim(r.description.slice(0, 80))}`);
        const meta = [
          r.language ? chalk.blue(r.language) : null,
          `★ ${r.stargazers_count.toLocaleString()}`,
          `⑂ ${r.forks_count.toLocaleString()}`,
        ].filter(Boolean).join('  ');
        console.log(`    ${meta}\n`);
      });
      console.log(chalk.dim(`Run: yagt clone <owner/repo>  or  yagt repo <owner/repo>`));
    } catch (err) { spinner.fail(chalk.red(err.message)); }
  });

// ── GitHub: fork ──────────────────────────────────────────────────────────────

program
  .command('fork')
  .description('Fork a GitHub repository')
  .argument('[repo]', 'owner/repo (default: current git remote)')
  .action(async (repoArg) => {
    header();
    requireGithubToken();
    const parsed = gh.resolveRepo(repoArg);
    if (!parsed) { console.error(chalk.red('Could not resolve repository.')); process.exit(1); }
    const { owner, repo } = parsed;

    const spinner = ora(`Forking ${owner}/${repo}...`).start();
    try {
      const fork = await gh.forkRepo(owner, repo);
      spinner.succeed(chalk.green(`Forked → ${fork.full_name}`));
      console.log(chalk.dim(`  ${fork.html_url}`));
      const { doClone } = await inquirer.prompt([{
        type: 'confirm', name: 'doClone', message: 'Clone your fork?', default: true
      }]);
      if (doClone) {
        const cloneSpinner = ora('Cloning fork...').start();
        runGit(`clone ${fork.clone_url}`, { silent: false });
        cloneSpinner.succeed(chalk.green(`Cloned ${fork.full_name}`));
      }
    } catch (err) { spinner.fail(chalk.red(err.message)); }
  });

// ── GitHub: star ──────────────────────────────────────────────────────────────

program
  .command('star')
  .description('Star or unstar a GitHub repository')
  .argument('[repo]', 'owner/repo (default: current git remote)')
  .option('--unstar', 'remove star')
  .action(async (repoArg, options) => {
    header();
    requireGithubToken();
    const parsed = gh.resolveRepo(repoArg);
    if (!parsed) { console.error(chalk.red('Could not resolve repository.')); process.exit(1); }
    const { owner, repo } = parsed;

    const spinner = ora(options.unstar ? `Unstarring ${owner}/${repo}...` : `Starring ${owner}/${repo}...`).start();
    try {
      if (options.unstar) {
        await gh.unstarRepo(owner, repo);
        spinner.succeed(chalk.yellow(`Unstarred ${owner}/${repo}`));
      } else {
        await gh.starRepo(owner, repo);
        spinner.succeed(chalk.green(`★ Starred ${owner}/${repo}`));
      }
    } catch (err) { spinner.fail(chalk.red(err.message)); }
  });

// ── GitHub: open ──────────────────────────────────────────────────────────────

program
  .command('open')
  .description('Open repository in browser')
  .argument('[repo]', 'owner/repo (default: current git remote)')
  .option('--issues', 'open issues page')
  .option('--pulls', 'open pull requests page')
  .option('--actions', 'open actions page')
  .action(async (repoArg, options) => {
    const parsed = gh.resolveRepo(repoArg);
    if (!parsed) { console.error(chalk.red('Could not resolve repository.')); process.exit(1); }
    const { owner, repo } = parsed;
    let url = `https://github.com/${owner}/${repo}`;
    if (options.issues) url += '/issues';
    else if (options.pulls) url += '/pulls';
    else if (options.actions) url += '/actions';

    const opener = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
    spawn(opener, [url], { detached: true, stdio: 'ignore' }).unref();
    console.log(chalk.green(`Opening ${url}`));
  });

// ── GitHub: whoami ────────────────────────────────────────────────────────────

program
  .command('whoami')
  .description('Show authenticated GitHub user')
  .action(async () => {
    header();
    const spinner = ora('Fetching user...').start();
    try {
      const user = await gh.getAuthUser();
      spinner.stop();
      if (!user.login) {
        console.log(chalk.red('✖ Not authenticated. ' + (user.message || '')));
        console.log(chalk.dim('  Run: yagt config --github-token <token>'));
        console.log(chalk.dim('  Or set GITHUB_TOKEN environment variable'));
        return;
      }
      console.log(`${chalk.bold(user.name || user.login)} ${chalk.dim('@' + user.login)}`);
      if (user.bio) console.log(chalk.dim(user.bio));
      console.log(`  ${chalk.yellow('★')} ${user.public_repos} repos  · ${user.followers} followers · ${user.following} following`);
    } catch (err) { spinner.fail(chalk.red(err.message)); }
  });

// ── AI commands ───────────────────────────────────────────────────────────────

program
  .command('ask')
  .description('Ask AI a question about the current repository')
  .argument('<question>', 'your question')
  .action(async (question) => {
    header();
    const spinner = ora('Thinking...').start();
    let context = '';

    if (isGitRepo()) {
      try {
        const files = runGit('ls-files', { silent: true, ignoreError: true }).split('\n').slice(0, 50).join(', ');
        const log = runGit('log --oneline -10', { silent: true, ignoreError: true });
        const readmeFiles = ['README.md', 'readme.md', 'README.txt'];
        let readme = '';
        for (const f of readmeFiles) {
          if (fs.existsSync(f)) { readme = fs.readFileSync(f, 'utf-8').slice(0, 2000); break; }
        }
        context = `Repository files: ${files}\nRecent commits:\n${log}${readme ? '\n\nREADME:\n' + readme : ''}`;
      } catch { }
    }

    try {
      const answer = await ai.askAboutRepo(question, context);
      spinner.succeed(chalk.green('Answer:\n'));
      console.log(answer);
    } catch (err) { spinner.fail(chalk.red(err.message)); }
  });

program
  .command('summary')
  .alias('sum')
  .description('AI summary of the current repository')
  .action(async () => {
    header();
    ensureRepo();
    const spinner = ora('Analyzing with AI...').start();
    try {
      const summary = await ai.summarizeRepo(process.cwd());
      spinner.succeed(chalk.green('Summary:\n'));
      console.log(summary);
    } catch (err) { spinner.fail(chalk.red(err.message)); }
  });

program
  .command('explain')
  .description('Explain a git command in plain English')
  .argument('<command...>', 'git command to explain')
  .action(async (cmdParts) => {
    const cmd = cmdParts.join(' ');
    const spinner = ora(`Explaining "${cmd}"...`).start();
    try {
      const explanation = await ai.explainCommand(cmd);
      spinner.succeed(chalk.green(`git ${cmd}:\n`));
      console.log(explanation);
    } catch (err) { spinner.fail(chalk.red(err.message)); }
  });

// ── Git extras ────────────────────────────────────────────────────────────────

program
  .command('log')
  .description('Show commit history')
  .option('-n, --number <count>', 'limit commits', '15')
  .option('--oneline', 'compact format')
  .option('--graph', 'show branch graph')
  .action((options) => {
    ensureRepo();
    const n = parseInt(options.number);
    if (options.oneline || options.graph) {
      const flags = [options.graph ? '--graph' : '', '--oneline', `--color=always`, `-${n}`].filter(Boolean).join(' ');
      runGit(`log ${flags}`, { silent: false });
    } else {
      const format = `--pretty=format:"%C(yellow)%h%Creset  %Cgreen%cr%Creset  %s  %Cblue<%an>%Creset"`;
      runGit(`log ${format} -${n} --color=always`, { silent: false });
    }
  });

program
  .command('branch')
  .alias('br')
  .description('List, create, or delete branches')
  .argument('[name]', 'branch name to create')
  .option('-d, --delete <branch>', 'delete branch')
  .option('-c, --checkout', 'checkout after creating')
  .option('--ai', 'generate branch name with AI from description')
  .action(async (name, options) => {
    ensureRepo();
    if (options.delete) {
      const spinner = ora(`Deleting ${options.delete}...`).start();
      runGit(`branch -D ${options.delete}`, { silent: true });
      spinner.succeed(chalk.green(`Deleted ${options.delete}`));
      return;
    }
    if (options.ai && name) {
      const spinner = ora('AI generating branch name...').start();
      try {
        name = await ai.suggestBranchName(name);
        spinner.succeed(chalk.green(`Suggested: ${chalk.yellow(name)}`));
        const { ok } = await inquirer.prompt([{ type: 'confirm', name: 'ok', message: 'Use this name?', default: true }]);
        if (!ok) {
          const { custom } = await inquirer.prompt([{ type: 'input', name: 'custom', message: 'Branch name:', validate: v => v ? true : 'Required' }]);
          name = custom;
        }
      } catch (err) { spinner.fail(chalk.red(err.message)); }
    }
    if (name) {
      const spinner = ora(`Creating branch ${name}...`).start();
      runGit(`branch ${name}`, { silent: true });
      spinner.succeed(chalk.green(`Created ${name}`));
      if (options.checkout) { runGit(`checkout ${name}`, { silent: true }); console.log(chalk.green(`→ Switched to ${name}`)); }
      return;
    }
    const branches = runGit('branch -a --color=always', { silent: true, ignoreError: true });
    console.log(branches);
  });

program
  .command('checkout')
  .alias('co')
  .description('Switch branches')
  .argument('<target>', 'branch, tag, or commit')
  .option('-b', 'create and checkout new branch')
  .action((target, options) => {
    ensureRepo();
    const spinner = ora(`Switching to ${target}...`).start();
    runGit(`checkout ${options.b ? '-b ' : ''}${target}`, { silent: true });
    spinner.succeed(chalk.green(`On ${target}`));
  });

program
  .command('diff')
  .description('Show changes')
  .argument('[files...]', 'specific files')
  .option('--staged', 'show staged changes')
  .option('--ai', 'AI review the diff')
  .action(async (files, options) => {
    ensureRepo();
    const fileArg = files.join(' ');
    const staged = options.staged ? '--cached ' : '';
    if (options.ai) {
      const diff = runGit(`diff ${staged}${fileArg}`, { silent: true, ignoreError: true });
      if (!diff) { console.log(chalk.yellow('No diff')); return; }
      const spinner = ora('AI reviewing...').start();
      try {
        const review = await ai.reviewCode(diff);
        spinner.succeed(chalk.green('AI Review:\n'));
        console.log(review);
      } catch (err) { spinner.fail(chalk.red(err.message)); }
      return;
    }
    runGit(`diff ${staged}${fileArg}`, { silent: false });
  });

program
  .command('stash')
  .description('Stash changes')
  .argument('[message]', 'stash description')
  .option('-l, --list', 'list stashes')
  .option('-p, --pop', 'pop latest stash')
  .option('-d, --drop', 'drop latest stash')
  .action((message, options) => {
    ensureRepo();
    if (options.list) { runGit('stash list', { silent: false }); return; }
    if (options.pop) { const s = ora('Popping stash...').start(); runGit('stash pop', { silent: true }); s.succeed(chalk.green('Stash applied')); return; }
    if (options.drop) { const s = ora('Dropping stash...').start(); runGit('stash drop', { silent: true }); s.succeed(chalk.yellow('Stash dropped')); return; }
    const s = ora('Stashing...').start();
    runGit(`stash push -m "${message || 'WIP'}"`, { silent: true });
    s.succeed(chalk.green('Changes stashed'));
  });

program
  .command('merge')
  .description('Merge a branch into current')
  .argument('<branch>', 'branch to merge')
  .action((branch) => {
    ensureRepo();
    const s = ora(`Merging ${branch}...`).start();
    runGit(`merge ${branch}`, { silent: false });
    s.succeed(chalk.green('Merge complete'));
  });

program
  .command('undo')
  .description('Undo last commit')
  .option('--hard', 'discard changes (destructive)')
  .action(async (options) => {
    ensureRepo();
    if (options.hard) {
      const { ok } = await inquirer.prompt([{ type: 'confirm', name: 'ok', message: chalk.red('Hard reset discards all changes. Continue?'), default: false }]);
      if (!ok) return;
    }
    const mode = options.hard ? '--hard' : '--soft';
    runGit(`reset ${mode} HEAD~1`, { silent: true });
    console.log(chalk.green(`✔ Last commit undone (${mode})`));
  });

// ── Rate limit ────────────────────────────────────────────────────────────────

program
  .command('rate-limit')
  .description('Show GitHub API rate limit status')
  .action(async () => {
    const spinner = ora('Checking rate limits...').start();
    try {
      const data = await gh.getRateLimit();
      spinner.stop();
      const core = data.rate || data.resources?.core;
      const remaining = core.remaining;
      const limit = core.limit;
      const reset = new Date(core.reset * 1000).toLocaleTimeString();
      const bar = '█'.repeat(Math.round((remaining / limit) * 20)).padEnd(20, '░');
      const color = remaining < 100 ? chalk.red : remaining < 500 ? chalk.yellow : chalk.green;
      console.log(`\n  ${color(bar)} ${chalk.bold(remaining)} / ${limit} remaining`);
      console.log(chalk.dim(`  Resets at ${reset}`));
      if (!gh.getToken()) console.log(chalk.yellow('\n  ⚠ No token — only 60 req/hr. Set with: yagt config --github-token <token>'));
    } catch (err) { spinner.fail(chalk.red(err.message)); }
  });

// ── Config ────────────────────────────────────────────────────────────────────

program
  .command('config')
  .description('Configure yagt')
  .option('--github-token <token>', 'save GitHub personal access token')
  .option('--nim-key <key>', 'save NVIDIA NIM API key')
  .option('--model <model>', 'set default AI model')
  .option('--show', 'show current configuration')
  .action((options) => {
    header();
    const cfg = ai.loadConfig();

    if (options.show) {
      console.log(chalk.bold('Configuration:'));
      console.log(`  GitHub token:  ${cfg.githubToken ? chalk.green(cfg.githubToken.slice(0, 12) + '…') : chalk.red('not set')}`);
      console.log(`  NIM API key:   ${cfg.nimApiKey ? chalk.green(cfg.nimApiKey.slice(0, 12) + '…') : chalk.red('not set')}`);
      console.log(`  AI model:      ${chalk.cyan(cfg.nimModel || 'deepseek-ai/deepseek-v4-flash')}`);
      console.log(chalk.dim(`  Config file: ${require('path').join(require('os').homedir(), '.yagt', 'config.json')}`));
      return;
    }

    let changed = false;
    if (options.githubToken) { cfg.githubToken = options.githubToken; changed = true; console.log(chalk.green('✔ GitHub token saved')); }
    if (options.nimKey) { cfg.nimApiKey = options.nimKey; changed = true; console.log(chalk.green('✔ NIM API key saved')); }
    if (options.model) { cfg.nimModel = options.model; changed = true; console.log(chalk.green(`✔ Model set to ${options.model}`)); }

    if (changed) { ai.saveConfig(cfg); return; }

    console.log('  --github-token <token>   Save GitHub token');
    console.log('  --nim-key <key>          Save NVIDIA NIM key');
    console.log('  --model <model>          Set AI model');
    console.log('  --show                   Show config');
  });

// ── Default: show help ────────────────────────────────────────────────────────

if (process.argv.length === 2) {
  header();
  program.help();
}

// ── Interactive TUI ───────────────────────────────────────────────────────────

program
  .command('ui')
  .description('Launch interactive tabbed TUI (Repos / Issues / PRs / Commits / AI)')
  .action(() => {
    require('./tui');
  });

// ── GitHub: new repo ──────────────────────────────────────────────────────────

program
  .command('new')
  .description('Create a new GitHub repository')
  .action(async () => {
    header();
    requireGithubToken();
    const answers = await inquirer.prompt([
      { type: 'input', name: 'name', message: 'Repository name:', validate: v => v ? true : 'Required' },
      { type: 'input', name: 'description', message: 'Description (optional):' },
      { type: 'list', name: 'visibility', message: 'Visibility:', choices: ['public', 'private'], default: 'public' },
      { type: 'confirm', name: 'autoInit', message: 'Initialize with README?', default: true },
      { type: 'confirm', name: 'clone', message: 'Clone locally after creating?', default: false },
    ]);
    const spinner = ora('Creating repository...').start();
    try {
      const newRepo = await gh.createRepo({
        name: answers.name,
        description: answers.description,
        isPrivate: answers.visibility === 'private',
        autoInit: answers.autoInit,
      });
      spinner.succeed(chalk.green(`Repository created: ${newRepo.full_name}`));
      console.log(chalk.dim(`  ${newRepo.html_url}`));
      if (answers.clone) {
        console.log('');
        const cloneSpinner = ora('Cloning...').start();
        try {
          execSync(`git clone ${newRepo.clone_url}`, { stdio: 'inherit' });
          cloneSpinner.succeed(chalk.green(`Cloned into ./${answers.name}`));
        } catch { cloneSpinner.fail(chalk.red('Clone failed. Clone manually:')); console.log(chalk.dim(`  git clone ${newRepo.clone_url}`)); }
      }
    } catch (err) { spinner.fail(chalk.red(err.message)); }
  });

program.parse(process.argv);
