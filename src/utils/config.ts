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

// ── Resolve merged config (used by all commands) ──

export function resolveConfig(): ResolvedConfig {
  const global = loadGlobalConfig();
  if (!global) {
    console.error('尚未設定，請先執行 devflow init');
    process.exit(1);
  }

  // Determine project name: .devflow.json in repo > activeProject
  const repoLocal = loadRepoLocalConfig();
  const projectName = repoLocal?.project ?? global.activeProject;
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
