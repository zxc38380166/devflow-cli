import { input, confirm } from '@inquirer/prompts';
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { log } from '../utils/logger.js';
function displaySummary(config) {
    const { project, github, database, cloudflare, domains, devflow } = config;
    console.log();
    console.log('─'.repeat(50));
    console.log();
    console.log(`  專案名稱:     ${project.name}`);
    console.log(`  專案描述:     ${project.description}`);
    console.log(`  GitHub:       ${github.username}`);
    console.log(`  Repos:        ${project.name}-ec, ${project.name}-ims, ${project.name}-be`);
    console.log();
    console.log(`  MySQL:        ${database.mysql.replace(/--password=\S+/, '--password=****')}`);
    console.log(`  Redis:        ${database.redis.replace(/-a\s+\S+/, '-a ****')}`);
    console.log();
    if (cloudflare.apiToken) {
        console.log(`  Cloudflare:   ${cloudflare.apiToken.slice(0, 8)}****`);
    }
    else {
        console.log(`  Cloudflare:   （跳過）`);
    }
    console.log(`  EC 網域:      ${domains.ec}`);
    console.log(`  IMS 網域:     ${domains.ims}`);
    console.log(`  BE 網域:      ${domains.be}`);
    console.log();
    console.log(`  Devflow:      ${devflow.enabled ? `啟用（Board: ${devflow.trello.boardName}）` : '未啟用'}`);
    console.log();
    console.log('─'.repeat(50));
}
function validateConfig(config) {
    const errors = [];
    if (!config.project?.name)
        errors.push('project.name');
    if (!config.database?.mysql)
        errors.push('database.mysql');
    if (!config.database?.redis)
        errors.push('database.redis');
    if (config.devflow?.enabled) {
        if (!config.devflow.trello?.apiKey)
            errors.push('devflow.trello.apiKey');
        if (!config.devflow.trello?.token)
            errors.push('devflow.trello.token');
    }
    return errors;
}
export async function setupCommand() {
    log.info('Devflow Setup — 一鍵建置新專案');
    console.log();
    // ── Check for existing scaffold.config.json ──
    const configPath = join(process.cwd(), 'scaffold.config.json');
    if (existsSync(configPath)) {
        log.info('偵測到 scaffold.config.json，讀取現有配置...');
        console.log();
        const raw = readFileSync(configPath, 'utf-8');
        const config = JSON.parse(raw);
        const errors = validateConfig(config);
        if (errors.length > 0) {
            log.error('scaffold.config.json 驗證失敗，缺少必填欄位:');
            errors.forEach((e) => console.log(`  - ${e}`));
            console.log();
            log.info('請補齊後重新執行 devflow setup');
            return;
        }
        // Fill defaults
        if (!config.project.description)
            config.project.description = `${config.project.name} Platform`;
        if (!config.github?.username) {
            try {
                const { execSync } = await import('node:child_process');
                config.github = { username: execSync('gh api user -q .login', { encoding: 'utf-8', stdio: 'pipe' }).trim() };
            }
            catch {
                config.github = { username: '' };
            }
        }
        if (!config.domains?.ec)
            config.domains = { ...config.domains, ec: `${config.project.name}.com` };
        if (!config.domains?.ims)
            config.domains.ims = `admin.${config.project.name}.com`;
        if (!config.domains?.be)
            config.domains.be = `api.${config.project.name}.com`;
        if (!config.cloudflare)
            config.cloudflare = { apiToken: '', accountId: '' };
        if (!config.devflow)
            config.devflow = { enabled: false, trello: { apiKey: '', token: '', boardName: '' } };
        displaySummary(config);
        const ok = await confirm({ message: '使用此配置繼續？', default: true });
        if (!ok) {
            log.warn('已取消，請修改 scaffold.config.json 後重新執行');
            return;
        }
        log.success(`已載入配置: ${configPath}`);
        console.log();
        log.info('下一步：在 Claude Code 中執行 /scaffold');
        log.info('scaffold 會讀取 scaffold.config.json 自動完成所有建置');
        if (config.devflow.enabled) {
            log.info('包含：Repo 初始化 + Trello Board + 分支策略 + devflow 連結');
        }
        return;
    }
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
        if (!useDetected)
            username = '';
    }
    catch { /* gh not available */ }
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
        console.log();
        console.log('  Trello API 憑證取得方式：');
        console.log('  1. 前往 https://trello.com/power-ups/admin');
        console.log('  2. 點選「New」建立 Power-Up（名稱隨意，如 devflow）');
        console.log('  3. 建立後點進 Power-Up → 左側「API Key」→ 複製 API Key');
        console.log();
        trelloApiKey = await input({
            message: 'Trello API Key:',
            validate: (v) => v.length > 0 || '啟用 devflow 必須提供 Trello API Key',
        });
        console.log();
        console.log('  4. 回到同頁面，點擊 API Key 右側的「Token」超連結');
        console.log('  5. 授權後複製頁面上顯示的 Token');
        console.log();
        trelloToken = await input({
            message: 'Trello Token:',
            validate: (v) => v.length > 0 || '啟用 devflow 必須提供 Trello Token',
        });
        boardName = await input({
            message: 'Trello Board 名稱:',
            default: boardName,
        });
    }
    // ── Build config ──
    const config = {
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
    displaySummary(config);
    const ok = await confirm({ message: '確認以上設定，產生 scaffold.config.json？', default: true });
    if (!ok) {
        log.warn('已取消');
        return;
    }
    // ── Write config file ──
    const outPath = join(process.cwd(), 'scaffold.config.json');
    writeFileSync(outPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
    log.success(`已產生: ${outPath}`);
    console.log();
    log.info('下一步：在 Claude Code 中執行 /scaffold');
    log.info('scaffold 會讀取 scaffold.config.json 自動完成所有建置');
    if (enableDevflow) {
        log.info('包含：Repo 初始化 + Trello Board + 分支策略 + devflow 連結');
    }
}
