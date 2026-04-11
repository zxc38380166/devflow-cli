import { input, confirm, select } from '@inquirer/prompts';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { execSync } from 'node:child_process';
import { loadGlobalConfig, saveGlobalConfig, saveProjectConfig, getConfigBase } from '../utils/config.js';
import type { DevflowConfig, BoardConfig } from '../types/index.js';
import {
  getBoardLists, getBoardLabels, getBoardMembers,
  createBoard, createList, createLabel,
} from '../services/trello.js';
import { log } from '../utils/logger.js';
import type { GlobalConfig, ProjectConfig, RepoEntry } from '../types/index.js';

/** Suffixes that indicate a repo role, used to strip from project name */
const ROLE_SUFFIXES = ['ec', 'be', 'ims', 'web', 'api'];

const DEFAULT_LISTS = ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'];
const DEFAULT_LABELS: Array<{ name: string; color: string }> = [
  { name: 'FE', color: 'blue' },
  { name: 'BE', color: 'yellow' },
  { name: 'urgent', color: 'red' },
];

interface DetectedProject {
  name: string;
  repos: Record<string, RepoEntry>;
}

/**
 * Strip project-level and role suffixes to extract the core project name.
 * e.g. "WT-platform" → "wt", "WT-ec" → "wt", "myshop-backend" → "myshop"
 */
function extractProjectName(raw: string): string {
  const roleSuffixPattern = ROLE_SUFFIXES.join('|');
  return raw
    .replace(/-platform$/i, '')
    .replace(/[-_]?workspace$/i, '')
    .replace(new RegExp(`[-_]?(${roleSuffixPattern})$`, 'i'), '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * Check if current directory is inside a git repo.
 */
function isInsideGitRepo(): boolean {
  try {
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Auto-detect project from current directory:
 * 1. Read package.json for project name (if available)
 * 2. Fallback to directory name (if inside a git repo)
 * 3. Read .gitmodules for submodule repos
 * 4. Check for common subdirectories
 * 5. Treat current directory itself as a single repo
 */
function detectProject(): DetectedProject | null {
  const cwd = process.cwd();
  const dirName = basename(cwd);

  // Try to get project name from package.json first, fallback to directory name
  let name = '';
  const pkgPath = join(cwd, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { name?: string };
      if (pkg.name) {
        name = extractProjectName(pkg.name);
      }
    } catch {
      // ignore parse errors
    }
  }

  // Fallback: extract project name from directory name (e.g. "WT-ec" → "wt")
  if (!name) {
    if (!isInsideGitRepo()) return null;
    name = extractProjectName(dirName);
  }

  if (!name) return null;

  // Check .gitmodules for submodule repos
  const gitmodulesPath = join(cwd, '.gitmodules');
  const repos: Record<string, RepoEntry> = {};

  if (existsSync(gitmodulesPath)) {
    const content = readFileSync(gitmodulesPath, 'utf-8');
    const submoduleRegex = /\[submodule\s+"([^"]+)"\]\s+path\s*=\s*(\S+)\s+url\s*=\s*(\S+)/g;
    let match;
    while ((match = submoduleRegex.exec(content)) !== null) {
      const subName = match[1]!;
      const subPath = match[2]!;
      const role = guessRole(subPath);
      repos[role] = { name: subName, role };
    }
  }

  // If no submodules, check for common subdirectories
  if (Object.keys(repos).length === 0) {
    const commonDirs = ROLE_SUFFIXES;
    for (const dir of commonDirs) {
      const fullName = `${name}-${dir}`;
      if (existsSync(join(cwd, fullName)) || existsSync(join(cwd, dir))) {
        const actualDir = existsSync(join(cwd, fullName)) ? fullName : dir;
        const role = guessRole(actualDir);
        repos[role] = { name: actualDir, role };
      }
    }
  }

  // If still no repos found, treat current directory as a single repo
  // (e.g. team member cloned only one repo without the workspace)
  if (Object.keys(repos).length === 0) {
    const role = guessRole(dirName);
    repos[role] = { name: dirName, role };
  }

  return { name, repos };
}

function guessRole(dirName: string): string {
  const lower = dirName.toLowerCase();
  if (lower.includes('ec') || lower.includes('web')) return 'FE';
  if (lower.includes('be') || lower.includes('api')) return 'BE';
  return basename(dirName).toUpperCase();
}

export async function initCommand(options: { fromRepo?: boolean }): Promise<void> {
  log.info('Devflow 專案初始化');
  console.log();

  // ── Auto-detect or --from-repo ──
  const detected = detectProject();
  let projectName: string;
  let repos: Record<string, RepoEntry>;

  if (detected && (options.fromRepo || true)) {
    // Auto-detected — show what we found and confirm
    log.success(`偵測到既有專案: ${detected.name}`);
    log.info(`Repos:`);
    for (const [role, repo] of Object.entries(detected.repos)) {
      log.info(`  ${repo.name} (${role})`);
    }
    console.log();

    const useDetected = await confirm({
      message: '使用偵測到的設定？',
      default: true,
    });

    if (useDetected) {
      projectName = detected.name;
      repos = detected.repos;
    } else {
      // Fall through to manual input
      projectName = await input({
        message: '專案名稱（英文 slug）:',
        default: detected.name,
        validate: (v) => (/^[a-z0-9-]+$/.test(v) ? true : '只能用小寫英文、數字、連字號'),
      });
      repos = await collectRepos();
    }
  } else if (options.fromRepo) {
    log.error('無法偵測專案資訊，請確認目前在工作區根目錄（含 package.json 和 .gitmodules）');
    process.exit(1);
  } else {
    // No detection — full manual
    projectName = await input({
      message: '專案名稱（英文 slug，如 my-project）:',
      validate: (v) => (/^[a-z0-9-]+$/.test(v) ? true : '只能用小寫英文、數字、連字號'),
    });
    repos = await collectRepos();
  }

  // ── Trello credentials ──
  const existingGlobal = loadGlobalConfig();
  let apiKey: string;
  let token: string;

  if (existingGlobal?.trello?.apiKey) {
    const reuse = await confirm({
      message: '偵測到已有 Trello 憑證，是否沿用？',
      default: true,
    });
    if (reuse) {
      apiKey = existingGlobal.trello.apiKey;
      token = existingGlobal.trello.token;
    } else {
      console.log();
      log.info('請輸入新的 Trello 憑證，取得步驟：');
      console.log();
      console.log('  1. 前往 https://trello.com/power-ups/admin');
      console.log('  2. 點選「New」建立 Power-Up（名稱隨意，如 devflow）');
      console.log('  3. 建立後點進 Power-Up → 左側「API Key」→ 複製 API Key');
      console.log();
      apiKey = await input({ message: 'Trello API Key:', validate: (v) => v.length > 0 || '必填' });
      console.log();
      console.log('  4. 回到同頁面，點擊 API Key 右側的「Token」超連結');
      console.log('  5. 授權後複製頁面上顯示的 Token');
      console.log();
      token = await input({ message: 'Trello Token:', validate: (v) => v.length > 0 || '必填' });
    }
  } else {
    console.log();
    log.info('需要 Trello API 憑證來連結看板，請依以下步驟取得：');
    console.log();
    console.log('  1. 前往 https://trello.com/power-ups/admin');
    console.log('  2. 點選「New」建立 Power-Up（名稱隨意，如 devflow）');
    console.log('  3. 建立後點進 Power-Up → 左側「API Key」→ 複製 API Key');
    console.log();
    apiKey = await input({ message: 'Trello API Key:', validate: (v) => v.length > 0 || '必填' });
    console.log();
    console.log('  4. 回到同頁面，點擊 API Key 右側的「Token」超連結');
    console.log('  5. 授權後複製頁面上顯示的 Token');
    console.log();
    token = await input({ message: 'Trello Token:', validate: (v) => v.length > 0 || '必填' });
  }

  // ── Board ──
  const { boardId, boardUrl, lists, labels, members } = await setupBoard(apiKey, token, projectName);

  // ── Save ──
  const globalConfig: GlobalConfig = {
    activeProject: projectName,
    trello: { apiKey, token },
  };
  saveGlobalConfig(globalConfig);

  const boardConfig: BoardConfig = { boardId, boardUrl, lists, labels, members };

  const projectConfig: ProjectConfig = {
    projectName,
    repos,
    board: boardConfig,
  };
  saveProjectConfig(projectName, projectConfig);

  // ── Write .devflow.json per repo (new unified format) ──
  const cwd = process.cwd();
  const writtenFiles: string[] = [];
  for (const [role, repo] of Object.entries(repos)) {
    const repoDir = join(cwd, repo.name);
    const devflowPath = existsSync(repoDir) ? join(repoDir, '.devflow.json') : null;
    if (devflowPath) {
      const devflowConfig: DevflowConfig = {
        project: projectName,
        repoRole: role,
        repos,
        board: boardConfig,
      };
      writeFileSync(devflowPath, JSON.stringify(devflowConfig, null, 2) + '\n', 'utf-8');
      writtenFiles.push(devflowPath);
    }
  }
  // Also write for the workspace/platform directory itself
  const platformDevflow: DevflowConfig = {
    project: projectName,
    repoRole: 'platform',
    repos,
    board: boardConfig,
  };
  const platformPath = join(cwd, '.devflow.json');
  writeFileSync(platformPath, JSON.stringify(platformDevflow, null, 2) + '\n', 'utf-8');
  writtenFiles.push(platformPath);

  console.log();
  log.success(`專案 "${projectName}" 初始化完成！`);
  log.info(`設定目錄: ${getConfigBase()}`);
  log.info(`Repos: ${Object.values(repos).map((r) => `${r.name} (${r.role})`).join(', ')}`);
  log.info(`Board: ${boardUrl}`);
  log.info(`Lists: ${Object.keys(lists).join(', ')}`);
  log.info(`Labels: ${Object.keys(labels).join(', ')}`);
  log.info(`Members: ${Object.keys(members).join(', ')}`);
  console.log();
  if (writtenFiles.length) {
    log.success(`已自動產生 .devflow.json:`);
    for (const f of writtenFiles) {
      log.info(`  ${f}`);
    }
    console.log();
  }
  log.success('── 下一步 ──');
  console.log();

  log.info('1. 將 .devflow.json 加入版控並推送：');
  console.log('     git add .devflow.json && git commit -m "chore: add devflow config" && git push');
  console.log();
  log.info('2. 組員 clone 後只需設定 Trello 憑證：');
  console.log('     devflow import   （會自動偵測 .devflow.json，只需輸入 API Key + Token）');
  console.log();
  log.info('3. 開始開發任務：');
  console.log('     cd <repo> && devflow task');
  console.log();
}

async function collectRepos(): Promise<Record<string, RepoEntry>> {
  const repos: Record<string, RepoEntry> = {};
  let addMore = true;
  while (addMore) {
    const repoName = await input({
      message: 'Repo 名稱（如 my-app-web）:',
      validate: (v) => (v.length > 0 ? true : '必填'),
    });
    const role = await input({
      message: `${repoName} 的角色（如 FE / BE）:`,
      validate: (v) => (v.length > 0 ? true : '必填'),
    });
    repos[role] = { name: repoName, role };
    addMore = await confirm({ message: '還要新增其他 repo 嗎？', default: false });
  }
  return repos;
}

async function setupBoard(apiKey: string, token: string, projectName: string) {
  const boardMode = await select({
    message: 'Trello Board:',
    choices: [
      { name: '建立新的 Board（自動建立 Lists 和 Labels）', value: 'new' },
      { name: '使用現有的 Board', value: 'existing' },
    ],
  });

  let boardId: string;
  let boardUrl: string;
  const lists: Record<string, string> = {};
  const labels: Record<string, string> = {};
  const members: Record<string, string> = {};

  const listNameMap: Record<string, string> = {
    Backlog: 'backlog', 'To Do': 'todo', 'In Progress': 'inProgress',
    'In Review': 'inReview', Done: 'done',
  };

  if (boardMode === 'new') {
    const boardName = await input({
      message: 'Board 名稱:',
      default: projectName.toUpperCase(),
      validate: (v) => v.length > 0 || '必填',
    });

    log.info('正在建立 Trello Board...');
    const board = await createBoard(apiKey, token, boardName);
    boardId = board.id;
    boardUrl = board.shortUrl;
    log.success(`Board 已建立: ${boardUrl}`);

    log.info('正在建立 Lists...');
    for (let i = DEFAULT_LISTS.length - 1; i >= 0; i--) {
      const l = await createList(apiKey, token, boardId, DEFAULT_LISTS[i]!, (i + 1) * 1024);
      const key = listNameMap[DEFAULT_LISTS[i]!];
      if (key) lists[key] = l.id;
    }

    log.info('正在建立 Labels...');
    for (const lb of DEFAULT_LABELS) {
      const created = await createLabel(apiKey, token, boardId, lb.name, lb.color);
      labels[lb.name] = created.id;
    }

    const boardMembers = await getBoardMembers(apiKey, token, boardId);
    for (const m of boardMembers) {
      members[m.username] = m.id;
    }
  } else {
    const boardInput = await input({
      message: 'Board ID 或 URL（如 trello.com/b/xxxxx/...）:',
      validate: (v) => v.length > 0 || '必填',
    });
    const urlMatch = boardInput.match(/trello\.com\/b\/([^/]+)/);
    boardId = urlMatch ? urlMatch[1] : boardInput;
    boardUrl = `https://trello.com/b/${boardId}`;

    log.info('正在從 Trello 讀取 Board 資料...');
    const [fetchedLists, fetchedLabels, fetchedMembers] = await Promise.all([
      getBoardLists(apiKey, token, boardId),
      getBoardLabels(apiKey, token, boardId),
      getBoardMembers(apiKey, token, boardId),
    ]);

    for (const l of fetchedLists) {
      const key = listNameMap[l.name];
      if (key) lists[key] = l.id;
    }
    for (const lb of fetchedLabels) {
      if (lb.name) labels[lb.name] = lb.id;
    }
    for (const m of fetchedMembers) {
      members[m.username] = m.id;
    }

    const missing = DEFAULT_LISTS.filter((n) => !listNameMap[n] || !lists[listNameMap[n]!]);
    if (missing.length) {
      log.warn(`Board 缺少以下 Lists: ${missing.join(', ')}`);
      const autoCreate = await confirm({
        message: '是否自動建立缺少的 Lists？',
        default: true,
      });
      if (autoCreate) {
        for (const name of missing) {
          const key = listNameMap[name];
          if (key && !lists[key]) {
            const created = await createList(apiKey, token, boardId, name, DEFAULT_LISTS.indexOf(name) * 1024 + 1024);
            lists[key] = created.id;
          }
        }
      }
    }
  }

  return { boardId, boardUrl, lists, labels, members };
}
