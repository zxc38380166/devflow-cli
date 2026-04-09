import { select, input, checkbox, confirm } from '@inquirer/prompts';
import { resolveConfig } from '../utils/config.js';
import { createCard, moveCard } from '../services/trello.js';
import * as git from '../services/git.js';
import { buildBranchName, getBaseBranch } from '../utils/branch.js';
import { log } from '../utils/logger.js';
const ROLE_ABBREV = {
    frontend: 'FE', backend: 'BE', admin: 'ADMIN', mobile: 'MB',
};
export async function taskCommand(options = {}) {
    const config = resolveConfig();
    const type = await select({
        message: '任務類型',
        choices: [
            { name: 'feature — 新功能', value: 'feature' },
            { name: 'chore   — 雜務/重構', value: 'chore' },
            { name: 'hotfix  — 緊急修復', value: 'hotfix' },
        ],
    });
    const title = await input({
        message: '標題（Trello 卡片名稱）:',
        validate: (v) => (v.length > 0 ? true : '必填'),
    });
    const desc = await input({
        message: '描述（選填，直接 Enter 跳過）:',
    });
    // Labels
    const labelChoices = Object.entries(config.board.labels).map(([name, id]) => ({
        name,
        value: id,
    }));
    const selectedLabels = labelChoices.length
        ? await checkbox({ message: '標籤（空白鍵選取，Enter 確認）:', choices: labelChoices })
        : [];
    // Members
    const memberChoices = Object.entries(config.board.members).map(([name, id]) => ({
        name,
        value: id,
    }));
    let selectedMembers = [];
    if (memberChoices.length) {
        selectedMembers = await checkbox({ message: '指派給（空白鍵選取，Enter 確認）:', choices: memberChoices });
    }
    // Due date
    const dueInput = await input({
        message: '到期日（選填，格式 YYYY-MM-DD）:',
        validate: (v) => {
            if (!v)
                return true;
            return /^\d{4}-\d{2}-\d{2}$/.test(v) ? true : '格式須為 YYYY-MM-DD';
        },
    });
    // Determine current repo
    let repoName = '';
    let repoRole = '';
    if (config.currentRepo) {
        repoRole = config.currentRepo.repoRole;
        // Find repo name by role
        const entry = config.repos[repoRole];
        repoName = entry?.name ?? '';
    }
    else {
        const roles = Object.keys(config.repos);
        if (roles.length > 0) {
            repoRole = await select({
                message: '此任務屬於哪個 repo？',
                choices: roles.map((r) => ({
                    name: `${config.repos[r].name} (${r})`,
                    value: r,
                })),
            });
            repoName = config.repos[repoRole]?.name ?? '';
        }
    }
    console.log();
    log.info('正在建立 Trello 卡片...');
    const abbrev = ROLE_ABBREV[repoRole] ?? repoRole.toUpperCase();
    const cardName = repoName ? `[${repoName}][${abbrev}] ${title}` : title;
    const card = await createCard(config, {
        name: cardName,
        desc: desc || undefined,
        idList: config.board.lists.backlog,
        idLabels: selectedLabels.length ? selectedLabels : undefined,
        idMembers: selectedMembers.length ? selectedMembers : undefined,
        due: dueInput ? `${dueInput}T00:00:00.000Z` : undefined,
    });
    log.success(`Trello 卡片已建立: ${card.shortUrl}`);
    await moveCard(config, card.id, config.board.lists.inProgress);
    log.success('卡片已移到 In Progress');
    // Git branch
    const createBranch = options.yes ? true : await confirm({
        message: '是否建立 Git 分支？',
        default: true,
    });
    if (createBranch) {
        const baseBranch = getBaseBranch(type);
        const branchName = buildBranchName(type, String(card.idShort), title);
        log.info(`Base branch: ${baseBranch}`);
        log.info(`新分支: ${branchName}`);
        try {
            git.fetch();
            if (baseBranch === 'develop')
                git.ensureDevelop();
            git.checkout(baseBranch);
            git.pull();
            git.checkout(branchName, true);
            git.pushBranch(branchName);
            log.success(`分支已建立並推送: ${branchName}`);
        }
        catch (err) {
            log.error(`Git 操作失敗: ${err instanceof Error ? err.message : err}`);
        }
    }
    console.log();
    log.success('完成！');
    log.info(`Trello: ${card.shortUrl}`);
    log.info(`Card ID: ${card.shortLink}（用於分支名）`);
}
