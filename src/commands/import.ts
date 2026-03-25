import { readFileSync, existsSync } from 'node:fs';
import { input, password } from '@inquirer/prompts';
import { loadGlobalConfig, saveGlobalConfig, saveProjectConfig } from '../utils/config.js';
import { log } from '../utils/logger.js';
import type { ProjectConfig, GlobalConfig } from '../types/index.js';

export async function importCommand(filePath: string): Promise<void> {
  if (!existsSync(filePath)) {
    log.error(`檔案不存在: ${filePath}`);
    process.exit(1);
  }

  let project: ProjectConfig;
  try {
    project = JSON.parse(readFileSync(filePath, 'utf-8')) as ProjectConfig;
  } catch {
    log.error('檔案格式錯誤，請確認是 devflow export 產生的 JSON');
    process.exit(1);
  }

  if (!project.projectName || !project.board) {
    log.error('檔案內容不完整，缺少 projectName 或 board');
    process.exit(1);
  }

  // Save project config
  saveProjectConfig(project.projectName, project);
  log.success(`專案 "${project.projectName}" 已匯入`);

  // Check if global Trello credentials exist
  let global = loadGlobalConfig();
  if (!global?.trello?.apiKey) {
    log.info('尚未設定 Trello 憑證，請輸入你的個人憑證');
    const apiKey = await input({ message: 'Trello API Key:', validate: (v) => v.length > 0 || '必填' });
    const token = await password({ message: 'Trello Token:', validate: (v) => v.length > 0 || '必填' });

    global = {
      activeProject: project.projectName,
      trello: { apiKey, token },
    };
    saveGlobalConfig(global);
    log.success('Trello 憑證已儲存');
  } else {
    global.activeProject = project.projectName;
    saveGlobalConfig(global);
  }

  log.success(`目前專案已切換為: ${project.projectName}`);
  log.info('下一步：到 repo 內執行 devflow link 連結專案');
}
