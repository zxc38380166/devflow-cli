import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import type { GlobalConfig, ProjectConfig, RepoLocalConfig, ResolvedConfig } from '../types/index.js';

const CONFIG_BASE = join(homedir(), '.devflow');
const GLOBAL_CONFIG_PATH = join(CONFIG_BASE, 'config.json');
const PROJECTS_DIR = join(CONFIG_BASE, 'projects');

export function getConfigBase(): string {
  return CONFIG_BASE;
}

// ── Global config ──

export function loadGlobalConfig(): GlobalConfig | null {
  if (!existsSync(GLOBAL_CONFIG_PATH)) return null;
  try {
    return JSON.parse(readFileSync(GLOBAL_CONFIG_PATH, 'utf-8')) as GlobalConfig;
  } catch {
    return null;
  }
}

export function saveGlobalConfig(config: GlobalConfig): void {
  if (!existsSync(CONFIG_BASE)) mkdirSync(CONFIG_BASE, { recursive: true });
  writeFileSync(GLOBAL_CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

// ── Per-project config ──

function projectConfigPath(name: string): string {
  return join(PROJECTS_DIR, name, 'config.json');
}

export function loadProjectConfig(name: string): ProjectConfig | null {
  const p = projectConfigPath(name);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf-8')) as ProjectConfig;
  } catch {
    return null;
  }
}

export function saveProjectConfig(name: string, config: ProjectConfig): void {
  const dir = join(PROJECTS_DIR, name);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(projectConfigPath(name), JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

export function listProjects(): string[] {
  if (!existsSync(PROJECTS_DIR)) return [];
  return readdirSync(PROJECTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

// ── Active project ──

export function getActiveProject(): string | null {
  return loadGlobalConfig()?.activeProject ?? null;
}

export function setActiveProject(name: string): void {
  const global = loadGlobalConfig();
  if (!global) {
    console.error('尚未設定，請先執行 devflow init');
    process.exit(1);
  }
  global.activeProject = name;
  saveGlobalConfig(global);
}

// ── Repo-local config (.devflow.json) ──

export function loadRepoLocalConfig(cwd?: string): RepoLocalConfig | null {
  const searchDir = cwd || process.cwd();
  // walk up to find .devflow.json
  let dir = resolve(searchDir);
  while (true) {
    const candidate = join(dir, '.devflow.json');
    if (existsSync(candidate)) {
      try {
        return JSON.parse(readFileSync(candidate, 'utf-8')) as RepoLocalConfig;
      } catch {
        return null;
      }
    }
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

// ── Auto-detect project from current directory ──

/**
 * 當沒有 .devflow.json 時，掃描所有專案的 repos 設定，
 * 比對當前目錄（或上層目錄）名稱是否匹配某個專案的 repo。
 * 避免因 activeProject 設定錯誤而將操作（如建卡片、建分支）執行到錯誤的專案。
 */
function detectProjectFromDirectory(): string | null {
  const cwd = resolve(process.cwd());
  const dirName = cwd.split('/').pop() || '';

  const projects = listProjects();
  for (const name of projects) {
    const config = loadProjectConfig(name);
    if (!config?.repos) continue;

    for (const [role, entry] of Object.entries(config.repos)) {
      // Match: cwd ends with repo name, or cwd basename matches repo name/role
      if (entry.name === dirName || role === dirName) {
        return name;
      }
    }
  }

  // Also check if cwd contains subdirectories matching a project's repos
  for (const name of projects) {
    const config = loadProjectConfig(name);
    if (!config?.repos) continue;

    const repoNames = Object.entries(config.repos).flatMap(([role, entry]) => [entry.name, role]);
    const matchCount = repoNames.filter((r) => existsSync(join(cwd, r))).length;
    if (matchCount > 0) {
      return name;
    }
  }

  return null;
}

// ── Resolve merged config (used by all commands) ──

export function resolveConfig(): ResolvedConfig {
  const global = loadGlobalConfig();
  if (!global) {
    console.error('尚未設定，請先執行 devflow init');
    process.exit(1);
  }

  // Priority: .devflow.json > auto-detect from directory > activeProject
  const repoLocal = loadRepoLocalConfig();
  let projectName = repoLocal?.project ?? null;

  if (!projectName) {
    const detected = detectProjectFromDirectory();
    if (detected) {
      if (global.activeProject && detected !== global.activeProject) {
        console.error(
          `⚠️  注意：activeProject 為「${global.activeProject}」，但當前目錄屬於「${detected}」，已自動切換。` +
          `\n   若不正確，請執行 devflow use <project> 或在 repo 內放置 .devflow.json。`,
        );
      }
      projectName = detected;
    }
  }

  if (!projectName) {
    projectName = global.activeProject;
  }

  if (!projectName) {
    console.error('無法判斷目前專案，請在 repo 內放置 .devflow.json 或執行 devflow use <project>');
    process.exit(1);
  }

  const project = loadProjectConfig(projectName);
  if (!project) {
    console.error(`找不到專案 "${projectName}" 的設定，請執行 devflow init 或 devflow import`);
    process.exit(1);
  }

  return {
    projectName,
    trello: global.trello,
    board: project.board,
    repos: project.repos,
    currentRepo: repoLocal,
  };
}
