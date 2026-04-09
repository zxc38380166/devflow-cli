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

// Read tasks JSONC (path passed as argv[2] or default)
const tasksPath = process.argv[2] || resolve(process.cwd(), 'devflow.jsonc');
const rawJson = readFileSync(tasksPath, 'utf8')
  .replace(/\/\/.*$/gm, '')       // strip single-line comments
  .replace(/\/\*[\s\S]*?\*\//g, '') // strip block comments
  .replace(/,\s*([\]}])/g, '$1');   // strip trailing commas
const items = JSON.parse(rawJson);

const platformDir = process.cwd();

// ── Trello helpers ──

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

async function trelloGet(path) {
  const params = new URLSearchParams({ key: TRELLO_KEY, token: TRELLO_TOKEN });
  const res = await fetch(`https://api.trello.com/1${path}?${params}`);
  return res.json();
}

// ── Git helpers ──

function git(args, cwd) {
  return execSync(`git ${args}`, { cwd, encoding: 'utf8', stdio: 'pipe' }).trim();
}

function hasChanges(cwd) {
  return git('status --short', cwd).length > 0;
}

function stashIfNeeded(cwd) {
  if (hasChanges(cwd)) {
    git('stash push -m "devflow-auto"', cwd);
    console.log('📦 Stashed uncommitted changes');
    return true;
  }
  return false;
}

function stashPopIfNeeded(cwd, stashed) {
  if (stashed) {
    try {
      git('stash pop', cwd);
      console.log('📦 Restored uncommitted changes');
    } catch {}
  }
}

function ensureDevelop(cwd) {
  try {
    git('rev-parse --verify develop', cwd);
  } catch {
    git('branch develop origin/develop', cwd);
  }
}

// ── Branch name builder ──

const BRANCH_PREFIX = { feature: 'feat', chore: 'chore', hotfix: 'fix' };

function buildBranchName(type, idShort, title) {
  const prefix = BRANCH_PREFIX[type] || type;
  const slug = title
    .replace(/[^\u4e00-\u9fffa-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 15);
  return `${prefix}/${idShort}-${slug}`;
}

const ROLE_ABBREV = { frontend: 'FE', backend: 'BE' };

function getRepoRole(repoName) {
  for (const [role, info] of Object.entries(REPOS)) {
    if (info.name === repoName) return role;
  }
  return repoName;
}

function buildCardName(repoName, title) {
  const role = getRepoRole(repoName);
  const abbrev = ROLE_ABBREV[role] || role.toUpperCase();
  return `[${repoName}][${abbrev}] ${title}`;
}

// ── Action: task ──

async function handleTask(item) {
  const repoDir = resolve(platformDir, item.repo);
  const cardName = buildCardName(item.repo, item.title);

  console.log(`📋 建立 Trello 卡片: ${cardName}`);

  const labelIds = (item.labels || []).map((l) => LABELS[l]).filter(Boolean).join(',');
  const memberIds = (item.members || []).map((m) => MEMBERS[m]).filter(Boolean).join(',');

  const cardBody = { idList: LISTS.backlog, name: cardName };
  if (item.description) cardBody.desc = item.description;
  if (labelIds) cardBody.idLabels = labelIds;
  if (memberIds) cardBody.idMembers = memberIds;
  if (item.dueDate) cardBody.due = `${item.dueDate}T00:00:00.000Z`;

  const card = await trelloPost('/cards', cardBody);
  if (!card.id) {
    console.error('❌ 卡片建立失敗:', JSON.stringify(card));
    return;
  }
  console.log(`✅ 卡片已建立: ${card.shortUrl}`);

  await trelloPut(`/cards/${card.id}`, { idList: LISTS.inProgress });
  console.log('✅ 已移到 In Progress');

  if (item.createBranch) {
    const baseBranch = item.taskType === 'hotfix' ? 'main' : 'develop';
    const branchName = buildBranchName(item.taskType, String(card.idShort), item.title);
    console.log(`🔀 建立分支: ${branchName} (from ${baseBranch})`);

    try {
      const stashed = stashIfNeeded(repoDir);
      git('fetch', repoDir);
      if (baseBranch === 'develop') ensureDevelop(repoDir);
      git(`checkout ${baseBranch}`, repoDir);
      git('pull', repoDir);
      git(`checkout -b ${branchName}`, repoDir);
      git(`push -u origin ${branchName}`, repoDir);
      console.log(`✅ 分支已建立並推送: ${branchName}`);
      stashPopIfNeeded(repoDir, stashed);
    } catch (err) {
      console.error(`❌ Git 錯誤: ${err.message}`);
      try { git('stash pop', repoDir); } catch {}
    }
  }
}

// ── Action: release:create ──
// 建立 release 分支 + 發 PR → main

async function handleReleaseCreate(item) {
  const repoDir = resolve(platformDir, item.repo);
  const ver = item.version.startsWith('v') ? item.version : `v${item.version}`;
  const branchName = `release/${ver}`;

  console.log(`🚀 建立 release 分支: ${branchName}`);

  try {
    const stashed = stashIfNeeded(repoDir);
    git('fetch', repoDir);
    ensureDevelop(repoDir);
    git('checkout develop', repoDir);
    git('pull', repoDir);
    git(`checkout -b ${branchName}`, repoDir);
    git(`push -u origin ${branchName}`, repoDir);
    console.log(`✅ Release 分支已建立並推送: ${branchName}`);
    stashPopIfNeeded(repoDir, stashed);
  } catch (err) {
    console.error(`❌ Git 錯誤: ${err.message}`);
    try { git('stash pop', repoDir); } catch {}
    return;
  }

  // 建立 PR → main
  try {
    console.log(`📝 建立 PR: ${branchName} → main`);
    const prUrl = execSync(
      `gh pr create --base main --head ${branchName} --title "Release ${ver}" --body "## Release ${ver}"`,
      { cwd: repoDir, encoding: 'utf8', stdio: 'pipe' },
    ).trim();
    console.log(`✅ PR 已建立: ${prUrl}`);
  } catch (err) {
    if (err.message.includes('already exists')) {
      console.log('ℹ️  PR 已存在');
    } else {
      console.error(`❌ PR 建立失敗: ${err.message}`);
    }
  }
}

// ── Action: release:finish ──
// 自動 merge PR + 打 tag + 同步 develop

async function handleReleaseFinish(item) {
  const repoDir = resolve(platformDir, item.repo);
  const ver = item.version.startsWith('v') ? item.version : `v${item.version}`;
  const branchName = `release/${ver}`;

  console.log(`🏁 完成 release: ${branchName}`);

  // 自動 merge PR
  try {
    console.log(`📝 Merge PR: ${branchName} → main`);
    execSync(
      `gh pr merge ${branchName} --merge --delete-branch`,
      { cwd: repoDir, encoding: 'utf8', stdio: 'pipe' },
    );
    console.log('✅ PR 已 merge，release 分支已刪除');
  } catch (err) {
    console.error(`❌ Merge 失敗: ${err.message}`);
    return;
  }

  // 打 tag + 同步 develop
  try {
    const stashed = stashIfNeeded(repoDir);
    git('checkout main', repoDir);
    git('pull', repoDir);
    git(`tag ${ver}`, repoDir);
    git(`push origin ${ver}`, repoDir);
    console.log(`✅ Tag ${ver} 已建立並推送`);

    git('checkout develop', repoDir);
    git('pull', repoDir);
    git('merge main', repoDir);
    git('push origin develop', repoDir);
    console.log('✅ develop 已同步 main 的變更');

    console.log(`✅ Release ${ver} 完成！`);
    stashPopIfNeeded(repoDir, stashed);
  } catch (err) {
    console.error(`❌ Git 錯誤: ${err.message}`);
    try { git('stash pop', repoDir); } catch {}
  }
}

// ── Action: pr ──

async function handlePR(item) {
  const repoDir = resolve(platformDir, item.repo);
  const branch = git('rev-parse --abbrev-ref HEAD', repoDir);

  console.log(`📝 建立 PR: ${branch}`);

  // 解析 card ID from branch name (支援縮寫 feat/fix 和全名 feature/hotfix)
  const match = branch.match(/^(?:feat|feature|chore|fix|hotfix)\/([a-zA-Z0-9]+)-/);
  const shortLink = match ? match[1] : null;

  // 決定 base branch
  const typeMatch = branch.match(/^(feat|feature|chore|fix|hotfix)\//);
  const baseBranch = typeMatch && ['hotfix', 'fix'].includes(typeMatch[1]) ? 'main' : 'develop';

  let prTitle = item.title || branch;
  let prBody = '';

  // 如果有 Trello card，取得資訊
  if (shortLink) {
    try {
      const card = await trelloGet(`/cards/${shortLink}`);
      if (card.name) prTitle = item.title || card.name;
      prBody = `## Trello\n${card.shortUrl}\n\n`;

      // 移到 In Review
      await trelloPut(`/cards/${card.id}`, { idList: LISTS.inReview });
      console.log('✅ Trello 卡片已移到 In Review');
    } catch {}
  }

  prBody += `## 變更摘要\n- \n\n## Checklist\n- [ ] 自測通過\n- [ ] 相關 i18n 已更新\n- [ ] 無 console.log 殘留`;

  try {
    git(`push -u origin ${branch}`, repoDir);
  } catch { /* already up to date */ }

  try {
    const prUrl = execSync(
      `gh pr create --base ${baseBranch} --head ${branch} --title "${prTitle.replace(/"/g, '\\"')}" --body "${prBody.replace(/"/g, '\\"')}"`,
      { cwd: repoDir, encoding: 'utf8', stdio: 'pipe' },
    ).trim();
    console.log(`✅ PR 已建立: ${prUrl}`);

    // 在 Trello 卡片留言
    if (shortLink) {
      try {
        const card = await trelloGet(`/cards/${shortLink}`);
        await trelloPost(`/cards/${card.id}/actions/comments`, { text: `🔗 PR: ${prUrl}` });
        console.log('✅ 已在 Trello 卡片留言 PR 連結');
      } catch {}
    }
  } catch (err) {
    console.error(`❌ PR 建立失敗: ${err.message}`);
  }
}

// ── Main ──

for (const item of items) {
  const action = item.action || 'task';
  console.log(`\n━━━ ${item.repo} [${action}] ━━━`);

  switch (action) {
    case 'task':
      await handleTask(item);
      break;
    case 'release:create':
      await handleReleaseCreate(item);
      break;
    case 'release:finish':
      await handleReleaseFinish(item);
      break;
    case 'pr':
      await handlePR(item);
      break;
    default:
      console.error(`❌ 不支援的 action: ${action}`);
  }
}

console.log('\n🎉 All done!');
