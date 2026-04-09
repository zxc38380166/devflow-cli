import { input, confirm } from '@inquirer/prompts';
import { resolveConfig } from '../utils/config.js';
import { getCardByIdShort, moveCard, addComment } from '../services/trello.js';
import { createPR } from '../services/github.js';
import * as git from '../services/git.js';
import { parseCardIdFromBranch, getBaseBranch } from '../utils/branch.js';
import { log } from '../utils/logger.js';
export async function prCommand() {
    const config = resolveConfig();
    const branch = git.getCurrentBranch();
    log.info(`目前分支: ${branch}`);
    const idShort = parseCardIdFromBranch(branch);
    if (!idShort) {
        log.error(`無法從分支名 "${branch}" 解析 Card ID，分支名需符合 feat/ID-xxx 格式`);
        process.exit(1);
    }
    log.info(`正在查詢 Trello 卡片 #${idShort}...`);
    let card;
    try {
        card = await getCardByIdShort(config, Number(idShort));
    }
    catch {
        log.error(`找不到 Trello 卡片: #${idShort}`);
        process.exit(1);
    }
    log.info(`卡片: ${card.name}`);
    log.info(`連結: ${card.shortUrl}`);
    const typeMatch = branch.match(/^(feat|chore|hotfix)\//);
    const type = (typeMatch ? typeMatch[1] : 'feat');
    const baseBranch = getBaseBranch(type);
    const prTitle = await input({
        message: 'PR 標題:',
        default: card.name,
    });
    const prBody = `## Trello\n${card.shortUrl}\n\n## 變更摘要\n- \n\n## Checklist\n- [ ] 自測通過\n- [ ] 相關 i18n 已更新\n- [ ] 無 console.log 殘留`;
    const ok = await confirm({
        message: `將建立 PR: ${branch} → ${baseBranch}，確認？`,
        default: true,
    });
    if (!ok) {
        log.warn('已取消');
        return;
    }
    log.info('正在推送最新 commits...');
    try {
        git.pushBranch(branch);
    }
    catch { /* already up to date */ }
    log.info('正在建立 PR...');
    try {
        const prUrl = createPR({
            title: prTitle,
            body: prBody,
            base: baseBranch,
            head: branch,
        });
        log.success(`PR 已建立: ${prUrl}`);
        await moveCard(config, card.id, config.board.lists.inReview);
        log.success('Trello 卡片已移到 In Review');
        await addComment(config, card.id, `🔗 PR: ${prUrl}`);
        log.success('已在 Trello 卡片留言 PR 連結');
    }
    catch (err) {
        log.error(`建立 PR 失敗: ${err instanceof Error ? err.message : err}`);
    }
}
