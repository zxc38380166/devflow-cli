import { input, password, confirm, select } from '@inquirer/prompts';
import { loadGlobalConfig, saveGlobalConfig, saveProjectConfig, getConfigBase } from '../utils/config.js';
import {
  getBoardLists, getBoardLabels, getBoardMembers,
  createBoard, createList, createLabel,
} from '../services/trello.js';
import { log } from '../utils/logger.js';
import type { GlobalConfig, ProjectConfig, RepoEntry } from '../types/index.js';

const DEFAULT_LISTS = ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'];
const DEFAULT_LABELS: Array<{ name: string; color: string }> = [
  { name: 'frontend', color: 'blue' },
  { name: 'backend', color: 'yellow' },
  { name: 'urgent', color: 'red' },
];

export async function initCommand(): Promise<void> {
  log.info('Devflow 專案初始化');
  console.log();

  // ── Step 1: Project name ──
  const projectName = await input({
    message: '專案名稱（英文 slug，如 my-project）:',
    validate: (v) => (/^[a-z0-9-]+$/.test(v) ? true : '只能用小寫英文、數字、連字號'),
  });

  // ── Step 2: Repos ──
  const repos: Record<string, RepoEntry> = {};
  let addMore = true;
  while (addMore) {
    const repoName = await input({
      message: 'Repo 名稱（如 my-app-web）:',
      validate: (v) => (v.length > 0 ? true : '必填'),
    });
    const role = await input({
      message: `${repoName} 的角色（如 frontend / backend / mobile）:`,
      validate: (v) => (v.length > 0 ? true : '必填'),
    });
    repos[role] = { name: repoName, role };
    addMore = await confirm({ message: '還要新增其他 repo 嗎？', default: false });
  }

  // ── Step 3: Trello credentials ──
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
      apiKey = await input({ message: 'Trello API Key:', validate: (v) => v.length > 0 || '必填' });
      token = await password({ message: 'Trello Token:', validate: (v) => v.length > 0 || '必填' });
    }
  } else {
    apiKey = await input({ message: 'Trello API Key:', validate: (v) => v.length > 0 || '必填' });
    token = await password({ message: 'Trello Token:', validate: (v) => v.length > 0 || '必填' });
  }

  // ── Step 4: Board ──
  const boardMode = await select({
    message: 'Trello Board:',
    choices: [
      { name: '使用現有的 Board', value: 'existing' },
      { name: '建立新的 Board（自動建立 Lists 和 Labels）', value: 'new' },
    ],
  });

  let boardId: string;
  let boardUrl: string;
  const lists: Record<string, string> = {};
  const labels: Record<string, string> = {};
  const members: Record<string, string> = {};

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

    // Create lists (reverse order so they appear correctly)
    log.info('正在建立 Lists...');
    const listNameMap: Record<string, string> = {
      Backlog: 'backlog', 'To Do': 'todo', 'In Progress': 'inProgress',
      'In Review': 'inReview', Done: 'done',
    };
    for (let i = DEFAULT_LISTS.length - 1; i >= 0; i--) {
      const l = await createList(apiKey, token, boardId, DEFAULT_LISTS[i]!, (i + 1) * 1024);
      const key = listNameMap[DEFAULT_LISTS[i]!];
      if (key) lists[key] = l.id;
    }

    // Create labels
    log.info('正在建立 Labels...');
    for (const lb of DEFAULT_LABELS) {
      const created = await createLabel(apiKey, token, boardId, lb.name, lb.color);
      labels[lb.name] = created.id;
    }

    // Fetch members
    const boardMembers = await getBoardMembers(apiKey, token, boardId);
    for (const m of boardMembers) {
      members[m.username] = m.id;
    }
  } else {
    // Existing board
    const boardInput = await input({
      message: 'Board ID 或 URL（如 trello.com/b/xxxxx/...）:',
      validate: (v) => v.length > 0 || '必填',
    });
    // Extract board ID from URL or use as-is
    const urlMatch = boardInput.match(/trello\.com\/b\/([^/]+)/);
    boardId = urlMatch ? urlMatch[1] : boardInput;
    boardUrl = `https://trello.com/b/${boardId}`;

    log.info('正在從 Trello 讀取 Board 資料...');
    const [fetchedLists, fetchedLabels, fetchedMembers] = await Promise.all([
      getBoardLists(apiKey, token, boardId),
      getBoardLabels(apiKey, token, boardId),
      getBoardMembers(apiKey, token, boardId),
    ]);

    const listNameMap: Record<string, string> = {
      Backlog: 'backlog', 'To Do': 'todo', 'In Progress': 'inProgress',
      'In Review': 'inReview', Done: 'done',
    };
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

    // Check if required lists exist
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

  // ── Step 5: Save ──
  const globalConfig: GlobalConfig = {
    activeProject: projectName,
    trello: { apiKey, token },
  };
  saveGlobalConfig(globalConfig);

  const projectConfig: ProjectConfig = {
    projectName,
    repos,
    board: { boardId, boardUrl, lists, labels, members },
  };
  saveProjectConfig(projectName, projectConfig);

  console.log();
  log.success(`專案 "${projectName}" 初始化完成！`);
  log.info(`設定目錄: ${getConfigBase()}`);
  log.info(`Repos: ${Object.values(repos).map((r) => `${r.name} (${r.role})`).join(', ')}`);
  log.info(`Board: ${boardUrl}`);
  log.info(`Lists: ${Object.keys(lists).join(', ')}`);
  log.info(`Labels: ${Object.keys(labels).join(', ')}`);
  log.info(`Members: ${Object.keys(members).join(', ')}`);
  console.log();
  log.info('下一步：到每個 repo 內執行 devflow link 來連結專案');
}
