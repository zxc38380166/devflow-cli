import { writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { resolveConfig } from '../utils/config.js';
import { log } from '../utils/logger.js';
import type { DevflowConfig } from '../types/index.js';

export async function exportCommand(): Promise<void> {
  const resolved = resolveConfig();
  const cwd = process.cwd();
  const writtenFiles: string[] = [];

  // Write .devflow.json for each repo found in cwd
  for (const [role, repo] of Object.entries(resolved.repos)) {
    const repoDir = join(cwd, repo.name);
    if (existsSync(repoDir)) {
      const config: DevflowConfig = {
        project: resolved.projectName,
        repoRole: role,
        repos: resolved.repos,
        board: resolved.board,
      };
      const filePath = join(repoDir, '.devflow.json');
      writeFileSync(filePath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
      writtenFiles.push(filePath);
    }
  }

  // Also write for current (platform/workspace) directory
  const platformConfig: DevflowConfig = {
    project: resolved.projectName,
    repoRole: 'platform',
    repos: resolved.repos,
    board: resolved.board,
  };
  const platformPath = join(cwd, '.devflow.json');
  writeFileSync(platformPath, JSON.stringify(platformConfig, null, 2) + '\n', 'utf-8');
  writtenFiles.push(platformPath);

  // Also export legacy format for backwards compatibility
  const legacyOutput = JSON.stringify({
    projectName: resolved.projectName,
    repos: resolved.repos,
    board: resolved.board,
  }, null, 2) + '\n';
  const legacyFileName = `devflow-${resolved.projectName}.json`;
  const legacyPath = join(cwd, legacyFileName);
  writeFileSync(legacyPath, legacyOutput, 'utf-8');

  log.success('已匯出 .devflow.json:');
  for (const f of writtenFiles) {
    log.info(`  ${f}`);
  }
  console.log();
  log.info(`也已產生 ${legacyFileName}（相容舊版 devflow import）`);
  log.info('請將各 repo 的 .devflow.json 加入版控，組員 clone 後只需設定 Trello 憑證即可使用');
}
