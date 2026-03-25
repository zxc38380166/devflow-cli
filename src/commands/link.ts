import { input, select } from '@inquirer/prompts';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadGlobalConfig, loadProjectConfig, listProjects, getActiveProject } from '../utils/config.js';
import * as git from '../services/git.js';
import { log } from '../utils/logger.js';
import type { RepoLocalConfig } from '../types/index.js';

export async function linkCommand(): Promise<void> {
  // Check we're in a git repo
  let gitRoot: string;
  try {
    gitRoot = git.getGitRoot();
  } catch {
    log.error('目前不在 Git repo 內');
    process.exit(1);
  }

  // Determine project
  const projects = listProjects();
  if (projects.length === 0) {
    log.error('尚未建立任何專案，請先執行 devflow init');
    process.exit(1);
  }

  let projectName: string;
  if (projects.length === 1) {
    projectName = projects[0]!;
    log.info(`使用專案: ${projectName}`);
  } else {
    projectName = await select({
      message: '要連結到哪個專案？',
      choices: projects.map((p) => ({ name: p, value: p })),
      default: getActiveProject() ?? undefined,
    });
  }

  const project = loadProjectConfig(projectName);
  if (!project) {
    log.error(`找不到專案 "${projectName}"`);
    process.exit(1);
  }

  // Determine repo role
  let repoRole: string;
  const roles = Object.keys(project.repos);
  if (roles.length === 1) {
    repoRole = roles[0]!;
    log.info(`Repo 角色: ${repoRole}`);
  } else if (roles.length > 1) {
    repoRole = await select({
      message: '此 repo 的角色是？',
      choices: roles.map((r) => ({
        name: `${r} (${project.repos[r]!.name})`,
        value: r,
      })),
    });
  } else {
    repoRole = await input({
      message: 'Repo 角色（如 frontend / backend）:',
      validate: (v) => v.length > 0 || '必填',
    });
  }

  // Write .devflow.json
  const config: RepoLocalConfig = {
    project: projectName,
    repoRole,
  };
  const filePath = join(gitRoot, '.devflow.json');
  writeFileSync(filePath, JSON.stringify(config, null, 2) + '\n', 'utf-8');

  log.success(`已建立 ${filePath}`);
  log.info('建議將 .devflow.json 加入版控，這樣其他組員 clone 後就自動連結');
}
