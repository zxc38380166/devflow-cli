import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve } from 'path';

// Read devflow config
const home = process.env.HOME || process.env.USERPROFILE;
const globalConfig = JSON.parse(readFileSync(resolve(home, '.devflow/config.json'), 'utf8'));
const activeProject = globalConfig.activeProject;
const projectConfig = JSON.parse(
  readFileSync(resolve(home, `.devflow/projects/${activeProject}/config.json`), 'utf8'),
);

const TRELLO_KEY = globalConfig.trello.apiKey;
const TRELLO_TOKEN = globalConfig.trello.token;
const LISTS = projectConfig.board.lists;
const LABELS = projectConfig.board.labels;
const MEMBERS = projectConfig.board.members;
const REPOS = projectConfig.repos;

// Read tasks JSON (path passed as argv[2] or default)
const tasksPath = process.argv[2] || resolve(process.cwd(), 'devflow-tasks.json');
const tasks = JSON.parse(readFileSync(tasksPath, 'utf8'));

async function trelloPost(path, body) {
  const params = new URLSearchParams({ key: TRELLO_KEY, token: TRELLO_TOKEN, ...body });
  const res = await fetch(`https://api.trello.com/1${path}`, { method: 'POST', body: params });
  return res.json();
}

async function trelloPut(path, body) {
  const params = new URLSearchParams({ key: TRELLO_KEY, token: TRELLO_TOKEN, ...body });
  const res = await fetch(`https://api.trello.com/1${path}`, { method: 'PUT', body: params });
  return res.json();
}

function buildBranchName(type, shortLink, title) {
  const slug = title
    .replace(/[^\u4e00-\u9fffa-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 15);
  return `${type}/${shortLink}-${slug}`;
}

function getRepoRole(repoName) {
  for (const [role, info] of Object.entries(REPOS)) {
    if (info.name === repoName) return role;
  }
  return repoName;
}

const platformDir = process.cwd();

for (const task of tasks) {
  const repoRole = getRepoRole(task.repo);
  const repoDir = resolve(platformDir, task.repo);
  const cardName = `[${repoRole}] ${task.title}`;

  console.log(`\n━━━ ${task.repo} ━━━`);
  console.log(`📋 Creating Trello card: ${cardName}`);

  const labelIds = (task.labels || [])
    .map((l) => LABELS[l])
    .filter(Boolean)
    .join(',');
  const memberIds = (task.members || [])
    .map((m) => MEMBERS[m])
    .filter(Boolean)
    .join(',');

  const cardBody = { idList: LISTS.backlog, name: cardName };
  if (task.description) cardBody.desc = task.description;
  if (labelIds) cardBody.idLabels = labelIds;
  if (memberIds) cardBody.idMembers = memberIds;
  if (task.dueDate) cardBody.due = `${task.dueDate}T00:00:00.000Z`;

  const card = await trelloPost('/cards', cardBody);
  if (!card.id) {
    console.error('❌ Failed to create card:', JSON.stringify(card));
    continue;
  }
  console.log(`✅ Card created: ${card.shortUrl}`);

  await trelloPut(`/cards/${card.id}`, { idList: LISTS.inProgress });
  console.log('✅ Moved to In Progress');

  if (task.createBranch) {
    const baseBranch = task.taskType === 'hotfix' ? 'main' : 'develop';
    const branchName = buildBranchName(task.taskType, card.shortLink, task.title);
    console.log(`🔀 Creating branch: ${branchName} (from ${baseBranch})`);

    try {
      const statusOut = execSync('git status --short', { cwd: repoDir, encoding: 'utf8' }).trim();
      const hasChanges = statusOut.length > 0;
      if (hasChanges) {
        execSync('git stash push -m "devflow-task-auto"', { cwd: repoDir, stdio: 'pipe' });
        console.log('📦 Stashed uncommitted changes');
      }

      execSync('git fetch', { cwd: repoDir, stdio: 'pipe' });
      if (baseBranch === 'develop') {
        try {
          execSync('git rev-parse --verify develop', { cwd: repoDir, stdio: 'pipe' });
        } catch {
          execSync('git branch develop origin/develop', { cwd: repoDir, stdio: 'pipe' });
        }
      }
      execSync(`git checkout ${baseBranch}`, { cwd: repoDir, stdio: 'pipe' });
      execSync('git pull', { cwd: repoDir, stdio: 'pipe' });
      execSync(`git checkout -b ${branchName}`, { cwd: repoDir, stdio: 'pipe' });
      execSync(`git push -u origin ${branchName}`, { cwd: repoDir, stdio: 'pipe' });
      console.log(`✅ Branch created and pushed: ${branchName}`);

      if (hasChanges) {
        execSync('git stash pop', { cwd: repoDir, stdio: 'pipe' });
        console.log('📦 Restored uncommitted changes');
      }
    } catch (err) {
      console.error(`❌ Git error: ${err.message}`);
      try {
        execSync('git stash pop', { cwd: repoDir, stdio: 'pipe' });
      } catch {}
    }
  }
}

console.log('\n🎉 All tasks done!');
