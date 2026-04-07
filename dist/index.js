import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { taskCommand } from './commands/task.js';
import { prCommand } from './commands/pr.js';
import { releaseCreateCommand } from './commands/release-create.js';
import { releaseFinishCommand } from './commands/release-finish.js';
import { useCommand } from './commands/use.js';
import { exportCommand } from './commands/export.js';
import { importCommand } from './commands/import.js';
import { linkCommand } from './commands/link.js';
import { setupCommand } from './commands/setup.js';
const program = new Command();
program
    .name('devflow')
    .description('團隊開發流程 CLI — Trello + Git + GitHub 自動化串接')
    .version('0.2.0');
program
    .command('setup')
    .description('一鍵建置新專案（產生 scaffold.config.json，搭配 /scaffold 使用）')
    .action(setupCommand);
program
    .command('init')
    .description('初始化新專案（設定 Trello + Board + Repos）')
    .option('--from-repo', '從目前目錄的 package.json + .gitmodules 自動偵測專案設定')
    .action((options) => initCommand(options));
program
    .command('link')
    .description('將目前 repo 連結到專案（產生 .devflow.json）')
    .action(linkCommand);
program
    .command('use <project>')
    .description('切換目前使用的專案')
    .action(useCommand);
program
    .command('export')
    .description('匯出專案設定（不含憑證，可分享給組員）')
    .action(exportCommand);
program
    .command('import <config-file>')
    .description('匯入專案設定檔（組員加入用）')
    .action(importCommand);
program
    .command('task')
    .description('建立 Trello 卡片 + Git 分支')
    .option('-y, --yes', '跳過互動確認（適用於 CI / Claude Code）')
    .action((options) => taskCommand(options));
program
    .command('pr')
    .description('建立 Pull Request + 同步 Trello 狀態')
    .action(prCommand);
program
    .command('release:create <version>')
    .description('從 develop 建立 release 分支')
    .action(releaseCreateCommand);
program
    .command('release:finish <version>')
    .description('完成 release（PR → main、打 tag、同步 develop）')
    .action(releaseFinishCommand);
program.parse();
