import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveConfig, loadProjectConfig } from '../utils/config.js';
import { log } from '../utils/logger.js';

export async function exportCommand(): Promise<void> {
  const resolved = resolveConfig();
  const project = loadProjectConfig(resolved.projectName);
  if (!project) {
    log.error('找不到專案設定');
    process.exit(1);
  }

  // Export project config (no secrets)
  const output = JSON.stringify(project, null, 2) + '\n';
  const fileName = `devflow-${project.projectName}.json`;
  const filePath = join(process.cwd(), fileName);
  writeFileSync(filePath, output, 'utf-8');

  log.success(`已匯出: ${filePath}`);
  log.info('此檔案不含 Trello 憑證，可安全分享給組員');
  log.info('組員匯入方式: devflow import ' + fileName);
}
