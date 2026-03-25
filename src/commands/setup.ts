import { input, password, confirm, select, number } from '@inquirer/prompts';
import { writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { log } from '../utils/logger.js';

interface ScaffoldConfig {
  project: { name: string; description: string };
  github: { username: string };
  database: { mysql: string; redis: string };
  cloudflare: { apiToken: string; accountId: string };
  domains: { ec: string; ims: string; be: string };
  devflow: {
    enabled: boolean;
    trello: { apiKey: string; token: string; boardName: string };
  };
}

export async function setupCommand(): Promise<void> {
  log.info('Devflow Setup — 一鍵建置新專案');
  console.log();
  console.log('此指令會產生 scaffold.config.json，搭配 /scaffold 使用');
  console.log('包含：專案初始化 + Trello Board + 分支策略 + 開發流程');
  console.log();

  // ── Step 1: Basic info ──
  log.info('=== 1/5 基本資訊 ===');

  const name = await input({
    message: '專案名稱（英文 slug，會成為 repo 前綴，如 myshop → myshop-ec）:',
    validate: (v) => /^[a-z0-9-]+$/.test(v) || '只能用小寫英文、數字、連字號',
  });

  const description = await input({
    message: '專案描述:',
    default: `${name} Platform`,
  });

  let username = '';
  try {
    const { execSync } = await import('node:child_process');
    username = execSync('gh api user -q .login', { encoding: 'utf-8', stdio: 'pipe' }).trim();
    log.info(`偵測到 GitHub 帳號: ${username}`);
    const useDetected = await confirm({ message: '使用此帳號？', default: true });
    if (!useDetected) username = '';
  } catch { /* gh not available */ }

  if (!username) {
    username = await input({
      message: 'GitHub 帳號:',
      validate: (v) => v.length > 0 || '必填',
    });
  }

  // ── Step 2: Database ──
  console.log();
  log.info('=== 2/5 資料庫連線 ===');

  const mysql = await input({
    message: 'MySQL 連線字串 (mysqlsh --sql --host=... --port=... --user=... --password=... --schema=...):',
    validate: (v) => v.includes('--host') || '請提供完整 mysqlsh 連線字串',
  });

  const redis = await input({
    message: 'Redis 連線字串 (redis-cli -h ... -p ... -a ...):',
    validate: (v) => v.includes('-h') || '請提供完整 redis-cli 連線字串',
  });

  // ── Step 3: Cloudflare ──
  console.log();
  log.info('=== 3/5 Cloudflare 設定（選填，Enter 跳過）===');
  console.log();
  console.log('  用於 DNS 設定與 Pages 文件部署，取得方式：');
  console.log('  1. 登入 https://dash.cloudflare.com');
  console.log('  2. API Token：右上角頭像 →「My Profile」→「API Tokens」→「Create Token」');
  console.log('     建議使用「Edit zone DNS」+「Cloudflare Pages」權限');
  console.log('  3. Account ID：任一網域的「Overview」頁面右下角');
  console.log();

  const cfToken = await input({ message: 'Cloudflare API Token（選填，Enter 跳過）:' });
  console.log();
  console.log('  Account ID 位置：Cloudflare Dashboard → 任一網域 → Overview → 右側「API」區塊 →「帳戶識別碼」');
  console.log();
  const cfAccount = await input({ message: 'Cloudflare Account ID（選填，Enter 跳過）:' });

  // ── Step 4: Domains ──
  console.log();
  log.info('=== 4/5 網域設定 ===');

  const ecDomain = await input({ message: '前台 EC 網域:', default: `${name}.com` });
  const imsDomain = await input({ message: '後台 IMS 網域:', default: `admin.${name}.com` });
  const beDomain = await input({ message: 'API BE 網域:', default: `api.${name}.com` });

  // ── Step 5: Devflow ──
  console.log();
  log.info('=== 5/5 開發流程（devflow）===');

  const enableDevflow = await confirm({
    message: '是否建置 devflow 開發流程？（Trello Board + 分支策略 + PR 流程）',
    default: true,
  });

  let trelloApiKey = '';
  let trelloToken = '';
  let boardName = name.toUpperCase();

  if (enableDevflow) {
    trelloApiKey = await input({
      message: 'Trello API Key:',
      validate: (v) => v.length > 0 || '啟用 devflow 必須提供 Trello API Key',
    });
    trelloToken = await password({
      message: 'Trello Token:',
      validate: (v) => v.length > 0 || '啟用 devflow 必須提供 Trello Token',
    });
    boardName = await input({
      message: 'Trello Board 名稱:',
      default: boardName,
    });
  }

  // ── Build config ──
  const config: ScaffoldConfig = {
    project: { name, description },
    github: { username },
    database: { mysql, redis },
    cloudflare: { apiToken: cfToken, accountId: cfAccount },
    domains: { ec: ecDomain, ims: imsDomain, be: beDomain },
    devflow: {
      enabled: enableDevflow,
      trello: { apiKey: trelloApiKey, token: trelloToken, boardName },
    },
  };

  // ── Display summary ──
  console.log();
  console.log('─'.repeat(50));
  console.log();
  console.log(`  專案名稱:     ${name}`);
  console.log(`  專案描述:     ${description}`);
  console.log(`  GitHub:       ${username}`);
  console.log(`  Repos:        ${name}-ec, ${name}-ims, ${name}-be`);
  console.log();
  console.log(`  MySQL:        ${mysql.replace(/--password=\S+/, '--password=****')}`);
  console.log(`  Redis:        ${redis.replace(/-a\s+\S+/, '-a ****')}`);
  console.log();
  if (cfToken) {
    console.log(`  Cloudflare:   ${cfToken.slice(0, 8)}****`);
  } else {
    console.log(`  Cloudflare:   （跳過）`);
  }
  console.log(`  EC 網域:      ${ecDomain}`);
  console.log(`  IMS 網域:     ${imsDomain}`);
  console.log(`  BE 網域:      ${beDomain}`);
  console.log();
  console.log(`  Devflow:      ${enableDevflow ? `啟用（Board: ${boardName}）` : '未啟用'}`);
  console.log();
  console.log('─'.repeat(50));

  const ok = await confirm({ message: '確認以上設定，產生 scaffold.config.json？', default: true });
  if (!ok) {
    log.warn('已取消');
    return;
  }

  // ── Write config file ──
  const configPath = join(process.cwd(), 'scaffold.config.json');
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');

  log.success(`已產生: ${configPath}`);
  console.log();
  log.info('下一步：在 Claude Code 中執行 /scaffold');
  log.info('scaffold 會讀取 scaffold.config.json 自動完成所有建置');
  if (enableDevflow) {
    log.info('包含：Repo 初始化 + Trello Board + 分支策略 + devflow 連結');
  }
}
