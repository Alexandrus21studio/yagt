#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const { execSync, spawn } = require('child_process');
const inquirer = require('inquirer');
const ora = require('ora');
const fs = require('fs');
const path = require('path');
const ai = require('./ai');

const YAGT_VERSION = '0.1.0';

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
    console.log(chalk.red(`✖ git ${args} failed`));
    process.exit(1);
  }
}

function isGitRepo(cwd) {
  return fs.existsSync(path.join(cwd || process.cwd(), '.git'));
}

function ensureRepo() {
  if (!isGitRepo()) {
    console.log(chalk.red('✖ Not a git repository. Run "yagt init" first.'));
    process.exit(1);
  }
}

function printHeader() {
  console.log(chalk.cyan.bold(`
╔═══════════════════════════════════════╗
║     Yet Another Git Tool (yagt)     ║
║            v${YAGT_VERSION}                  ║
╚═══════════════════════════════════════╝
`));
}

program
  .name('yagt')
  .description('Yet Another Git Tool - AI-powered git client')
  .version(YAGT_VERSION, '-v, --version')
  .option('-y, --yes', 'skip confirmations');

program
  .command('init')
  .description('Initialize a new git repository')
  .argument('[directory]', 'directory to initialize')
  .action(async (directory) => {
    printHeader();
    const target = directory || process.cwd();
    const spinner = ora('Initializing repository...').start();
    try {
      if (directory && !fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }
      runGit('init', { cwd: target, silent: true });
      spinner.succeed(chalk.green('Repository initialized!'));
      console.log(chalk.dim(`  → ${path.resolve(target)}/.git`));
    } catch (err) {
      spinner.fail('Failed to initialize repository');
    }
  });

program
  .command('status')
  .alias('st')
  .description('Show working tree status')
  .action(() => {
    ensureRepo();
    printHeader();
    const status = runGit('status -sb', { silent: true, ignoreError: true });
    if (!status) {
      console.log(chalk.green('✔ Nothing to commit, working tree clean'));
      return;
    }
    console.log(chalk.bold('Branch status:\n'));
    console.log(status);
  });

program
  .command('add')
  .description('Add file contents to the index')
  .argument('[files...]', 'files to add (default: all)')
  .option('-i, --interactive', 'interactive mode')
  .action(async (files, options) => {
    ensureRepo();
    printHeader();

    if (options.interactive || (!files || files.length === 0)) {
      const statusOutput = runGit('status --short', { silent: true, ignoreError: true });
      if (!statusOutput) {
        console.log(chalk.green('✔ Nothing to stage'));
        return;
      }

      const fileList = statusOutput.split('\n').filter(Boolean).map(line => ({
        name: `${line.substring(0, 2)} ${line.substring(3)}`,
        value: line.substring(3),
        short: line.substring(3)
      }));

      const { selected } = await inquirer.prompt([{
        type: 'checkbox',
        name: 'selected',
        message: 'Select files to stage:',
        choices: [
          { name: 'All files', value: '.' },
          new inquirer.Separator(),
          ...fileList
        ]
      }]);

      if (selected.length === 0) {
        console.log(chalk.yellow('⚠ No files selected'));
        return;
      }

      const toStage = selected.includes('.') ? '.' : selected.join(' ');
      const spinner = ora('Staging files...').start();
      runGit(`add ${toStage}`, { silent: true });
      spinner.succeed(chalk.green('Files staged successfully!'));
    } else {
      const spinner = ora(`Adding ${files.join(', ')}...`).start();
      runGit(`add ${files.join(' ')}`, { silent: true });
      spinner.succeed(chalk.green('Files added!'));
    }
  });

program
  .command('commit')
  .alias('cm')
  .description('Record changes to the repository')
  .argument('[message]', 'commit message')
  .option('-m, --message <msg>', 'commit message')
  .option('-a, --all', 'commit all modified files')
  .option('--ai', 'generate commit message with AI')
  .action(async (msg, options) => {
    ensureRepo();
    printHeader();

    let message = options.message || msg;

    if (options.ai || (!message && ai.getApiKey())) {
      const spinner = ora('Analyzing changes with AI...').start();
      try {
        const diff = runGit('diff --cached', { silent: true, ignoreError: true }) || 
                     runGit('diff', { silent: true, ignoreError: true });
        if (!diff) {
          spinner.warn('No changes to analyze');
          return;
        }
        message = await ai.generateCommitMessage(diff);
        spinner.succeed(chalk.green('AI generated commit message:'));
        console.log(chalk.cyan(`  → ${message}\n`));
        
        const { confirm } = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirm',
          message: 'Use this message?',
          default: true
        }]);
        
        if (!confirm) {
          const { custom } = await inquirer.prompt([{
            type: 'input',
            name: 'custom',
            message: 'Enter your commit message:',
            validate: i => i ? true : 'Message required'
          }]);
          message = custom;
        }
      } catch (err) {
        spinner.fail(chalk.red(`AI failed: ${err.message}`));
        const { custom } = await inquirer.prompt([{
          type: 'input',
          name: 'custom',
          message: 'Enter commit message manually:',
          validate: i => i ? true : 'Message required'
        }]);
        message = custom;
      }
    }

    if (!message) {
      const { type, scope, desc, body } = await inquirer.prompt([
        { type: 'list', name: 'type', message: 'Commit type:', choices: [
          { name: 'feat:     A new feature', value: 'feat' },
          { name: 'fix:      A bug fix', value: 'fix' },
          { name: 'docs:     Documentation only', value: 'docs' },
          { name: 'style:    Formatting', value: 'style' },
          { name: 'refactor: Code restructuring', value: 'refactor' },
          { name: 'test:     Adding tests', value: 'test' },
          { name: 'chore:    Maintenance', value: 'chore' }
        ]},
        { type: 'input', name: 'scope', message: 'Scope (optional):', filter: s => s ? `(${s})` : '' },
        { type: 'input', name: 'desc', message: 'Short description:', validate: i => i ? true : 'Description required' },
        { type: 'input', name: 'body', message: 'Longer description (optional):' }
      ]);
      message = `${type}${scope}: ${desc}`;
      if (body) message += `\n\n${body}`;
    }

    const allFlag = options.all ? '-a ' : '';
    const spinner = ora('Creating commit...').start();
    try {
      runGit(`${allFlag}commit -m "${message}"`, { silent: true });
      const hash = runGit('rev-parse --short HEAD', { silent: true, ignoreError: true });
      spinner.succeed(chalk.green(`Committed ${chalk.yellow(hash)}`));
      console.log(chalk.dim(`  → ${message.split('\n')[0]}`));
    } catch (err) {
      spinner.fail('Commit failed');
    }
  });

program
  .command('push')
  .description('Update remote refs along with associated objects')
  .argument('[remote]', 'remote name', 'origin')
  .argument('[branch]', 'branch name')
  .option('-u, --upstream', 'set upstream')
  .action((remote, branch, options) => {
    ensureRepo();
    printHeader();
    const currentBranch = runGit('branch --show-current', { silent: true, ignoreError: true });
    const targetBranch = branch || currentBranch;
    const upstream = options.upstream ? '-u ' : '';
    const spinner = ora(`Pushing to ${remote}/${targetBranch}...`).start();
    try {
      runGit(`push ${upstream}${remote} ${targetBranch}`, { silent: false });
      spinner.succeed(chalk.green(`Pushed to ${remote}/${targetBranch}!`));
    } catch (err) {
      spinner.fail('Push failed');
    }
  });

program
  .command('pull')
  .description('Fetch from and integrate with another repository')
  .argument('[remote]', 'remote name', 'origin')
  .argument('[branch]', 'branch name')
  .action((remote, branch) => {
    ensureRepo();
    printHeader();
    const currentBranch = runGit('branch --show-current', { silent: true, ignoreError: true });
    const target = branch || currentBranch;
    const spinner = ora(`Pulling from ${remote}/${target}...`).start();
    try {
      runGit(`pull ${remote} ${target}`, { silent: false });
      spinner.succeed(chalk.green('Pull complete!'));
    } catch (err) {
      spinner.fail('Pull failed');
    }
  });

program
  .command('clone')
  .description('Clone a repository into a new directory')
  .argument('<url>', 'repository URL')
  .argument('[directory]', 'target directory')
  .option('-b, --branch <branch>', 'clone specific branch')
  .action((url, directory, options) => {
    printHeader();
    const branchFlag = options.branch ? `-b ${options.branch} ` : '';
    const dirFlag = directory ? ` ${directory}` : '';
    const spinner = ora(`Cloning ${url}...`).start();
    try {
      runGit(`clone ${branchFlag}${url}${dirFlag}`, { silent: false });
      spinner.succeed(chalk.green('Clone complete!'));
      if (directory) console.log(chalk.dim(`  → ${path.resolve(directory)}`));
    } catch (err) {
      spinner.fail('Clone failed');
    }
  });

program
  .command('log')
  .description('Show commit logs')
  .option('-n, --number <count>', 'limit number of commits', '10')
  .option('--oneline', 'show one commit per line')
  .action((options) => {
    ensureRepo();
    printHeader();
    const format = options.oneline
      ? '--oneline'
      : `--pretty=format:"%C(yellow)%h%Creset %Cgreen(%cr)%Creset %s %Cblue<%an>%Creset"`;
    console.log(chalk.bold(`Last ${options.number} commits:\n`));
    runGit(`log ${format} -n ${options.number}`, { silent: false });
    console.log('\n');
  });

program
  .command('branch')
  .alias('br')
  .description('List, create, or delete branches')
  .argument('[name]', 'branch name to create')
  .option('-d, --delete <branch>', 'delete branch')
  .option('-m, --move <old:new>', 'rename branch')
  .option('-c, --checkout', 'checkout after creating')
  .option('--ai', 'generate branch name with AI')
  .action(async (name, options) => {
    ensureRepo();
    printHeader();

    if (options.delete) {
      const spinner = ora(`Deleting branch ${options.delete}...`).start();
      runGit(`branch -D ${options.delete}`, { silent: true });
      spinner.succeed(chalk.green(`Deleted branch ${options.delete}`));
      return;
    }

    if (options.move) {
      const [oldName, newName] = options.move.split(':');
      const spinner = ora(`Renaming ${oldName} → ${newName}...`).start();
      runGit(`branch -m ${oldName} ${newName}`, { silent: true });
      spinner.succeed(chalk.green('Branch renamed!'));
      return;
    }

    if (options.ai && name) {
      const spinner = ora('Generating branch name with AI...').start();
      try {
        const aiName = await ai.suggestBranchName(name);
        spinner.succeed(chalk.green(`AI suggestion: ${chalk.yellow(aiName)}`));
        const { useIt } = await inquirer.prompt([{
          type: 'confirm',
          name: 'useIt',
          message: 'Use this name?',
          default: true
        }]);
        if (useIt) name = aiName;
      } catch (err) {
        spinner.fail(chalk.red(`AI failed: ${err.message}`));
      }
    }

    if (name) {
      const spinner = ora(`Creating branch ${name}...`).start();
      runGit(`branch ${name}`, { silent: true });
      spinner.succeed(chalk.green(`Created branch ${name}`));
      if (options.checkout) {
        runGit(`checkout ${name}`, { silent: true });
        console.log(chalk.green(`✔ Switched to ${name}`));
      }
      return;
    }

    const branches = runGit('branch -a', { silent: true, ignoreError: true });
    console.log(chalk.bold('Branches:\n'));
    branches.split('\n').forEach(b => {
      if (b.startsWith('*')) console.log(chalk.green(b));
      else if (b.trim()) console.log(b);
    });
  });

program
  .command('checkout')
  .alias('co')
  .description('Switch branches or restore working tree files')
  .argument('<target>', 'branch, tag, or commit to checkout')
  .option('-b, --new-branch', 'create and checkout new branch')
  .action((target, options) => {
    ensureRepo();
    printHeader();
    const flag = options.newBranch ? '-b ' : '';
    const spinner = ora(`Checking out ${target}...`).start();
    try {
      runGit(`checkout ${flag}${target}`, { silent: true });
      spinner.succeed(chalk.green(`Switched to ${target}`));
    } catch (err) {
      spinner.fail('Checkout failed');
    }
  });

program
  .command('remote')
  .description('Manage set of tracked repositories')
  .option('-a, --add <name:url>', 'add remote (format: name:url)')
  .option('-r, --remove <name>', 'remove remote')
  .option('-v, --verbose', 'show URLs')
  .action((options) => {
    ensureRepo();
    printHeader();

    if (options.add) {
      const [name, url] = options.add.split(':');
      const spinner = ora(`Adding remote ${name}...`).start();
      runGit(`remote add ${name} ${url}`, { silent: true });
      spinner.succeed(chalk.green(`Added remote ${name}`));
      console.log(chalk.dim(`  → ${url}`));
      return;
    }

    if (options.remove) {
      const spinner = ora(`Removing remote ${options.remove}...`).start();
      runGit(`remote remove ${options.remove}`, { silent: true });
      spinner.succeed(chalk.green(`Removed remote ${options.remove}`));
      return;
    }

    const flag = options.verbose ? '-v' : '';
    runGit(`remote ${flag}`, { silent: false });
  });

program
  .command('diff')
  .description('Show changes between commits, commit and working tree, etc')
  .argument('[files...]', 'files to diff')
  .option('--ai', 'get AI review of the diff')
  .action(async (files, options) => {
    ensureRepo();
    printHeader();
    const fileArg = files && files.length ? files.join(' ') : '';
    
    if (options.ai) {
      const diff = runGit(`diff ${fileArg}`, { silent: true, ignoreError: true });
      if (!diff) {
        console.log(chalk.yellow('No diff to review'));
        return;
      }
      const spinner = ora('AI is reviewing your code...').start();
      try {
        const review = await ai.reviewCode(diff);
        spinner.succeed(chalk.green('AI Review complete!\n'));
        console.log(review);
      } catch (err) {
        spinner.fail(chalk.red(`AI review failed: ${err.message}`));
      }
      return;
    }
    
    runGit(`diff ${fileArg}`, { silent: false });
  });

program
  .command('merge')
  .description('Join two or more development histories together')
  .argument('<branch>', 'branch to merge into current')
  .action((branch) => {
    ensureRepo();
    printHeader();
    const spinner = ora(`Merging ${branch}...`).start();
    try {
      runGit(`merge ${branch}`, { silent: false });
      spinner.succeed(chalk.green('Merge complete!'));
    } catch (err) {
      spinner.fail('Merge failed (conflicts?)');
    }
  });

program
  .command('stash')
  .description('Stash changes in a dirty working directory')
  .option('-l, --list', 'list stashes')
  .option('-p, --pop', 'pop latest stash')
  .option('-a, --apply', 'apply latest stash')
  .option('-d, --drop', 'drop latest stash')
  .argument('[message]', 'stash message')
  .action((message, options) => {
    ensureRepo();
    printHeader();

    if (options.list) {
      runGit('stash list', { silent: false });
      return;
    }
    if (options.pop) {
      const spinner = ora('Popping stash...').start();
      runGit('stash pop', { silent: true });
      spinner.succeed(chalk.green('Stash popped!'));
      return;
    }
    if (options.apply) {
      const spinner = ora('Applying stash...').start();
      runGit('stash apply', { silent: true });
      spinner.succeed(chalk.green('Stash applied!'));
      return;
    }
    if (options.drop) {
      const spinner = ora('Dropping stash...').start();
      runGit('stash drop', { silent: true });
      spinner.succeed(chalk.green('Stash dropped!'));
      return;
    }

    const msg = message || 'WIP';
    const spinner = ora('Stashing changes...').start();
    runGit(`stash push -m "${msg}"`, { silent: true });
    spinner.succeed(chalk.green('Changes stashed!'));
  });

program
  .command('undo')
  .description('Undo last commit (soft reset)')
  .option('-h, --hard', 'hard reset (discard changes)')
  .action((options) => {
    ensureRepo();
    printHeader();
    const mode = options.hard ? '--hard' : '--soft';
    const spinner = ora('Undoing last commit...').start();
    runGit(`reset ${mode} HEAD~1`, { silent: true });
    spinner.succeed(chalk.green(`Last commit undone (${mode})`));
  });

program
  .command('summary')
  .alias('sum')
  .description('Generate AI summary of the repository')
  .action(async () => {
    ensureRepo();
    printHeader();
    const spinner = ora('Analyzing repository with AI...').start();
    try {
      const summary = await ai.summarizeRepo(process.cwd());
      spinner.succeed(chalk.green('Repository Summary\n'));
      console.log(chalk.cyan(summary));
    } catch (err) {
      spinner.fail(chalk.red(`AI summary failed: ${err.message}`));
    }
  });

program
  .command('explain')
  .description('Explain a git command in plain English')
  .argument('<command>', 'git command to explain')
  .action(async (cmd) => {
    printHeader();
    const spinner = ora('Thinking...').start();
    try {
      const explanation = await ai.explainCommand(cmd);
      spinner.succeed(chalk.green(`yagt explain "${cmd}"`));
      console.log('\n' + explanation + '\n');
    } catch (err) {
      spinner.fail(chalk.red(`AI explain failed: ${err.message}`));
    }
  });

program
  .command('config')
  .description('Configure yagt settings')
  .option('--api-key <key>', 'set OpenAI API key')
  .option('--show', 'show current config')
  .action((options) => {
    printHeader();
    const cfg = ai.loadConfig();

    if (options.show) {
      console.log(chalk.bold('Current configuration:'));
      console.log(`  API Key: ${cfg.openaiApiKey ? cfg.openaiApiKey.slice(0, 8) + '...' : chalk.red('not set')}`);
      return;
    }

    if (options.apiKey) {
      cfg.openaiApiKey = options.apiKey;
      ai.saveConfig(cfg);
      console.log(chalk.green('✔ API key saved'));
      return;
    }

    console.log(chalk.yellow('Run "yagt config --api-key <key>" to set your OpenAI API key'));
  });

program
  .command('gui')
  .description('Launch the yagt web GUI')
  .option('-p, --port <port>', 'port to run on', '3000')
  .action(async (options) => {
    printHeader();
    console.log(chalk.cyan(`Starting yagt web GUI on port ${options.port}...`));
    console.log(chalk.dim('Make sure you have built the web package first: npm run build'));
    spawn('npx', ['next', 'start', '-p', options.port], {
      cwd: path.join(__dirname, '../../web'),
      stdio: 'inherit'
    });
  });

if (process.argv.length === 2) {
  printHeader();
  console.log(chalk.yellow('Welcome to yagt! Run "yagt --help" to see available commands.\n'));
  program.help();
}

program.parse(process.argv);
