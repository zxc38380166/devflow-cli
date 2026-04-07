import { confirm } from '@inquirer/prompts';
import { resolveConfig } from '../utils/config.js';
import { createPR, mergePR } from '../services/github.js';
import * as git from '../services/git.js';
import { getListCards, moveCard } from '../services/trello.js';
import { log } from '../utils/logger.js';
export async function releaseFinishCommand(version, options = {}) {
    const config = resolveConfig();
    if (!/^v?\d+\.\d+\.\d+$/.test(version)) {
        log.error('版號格式錯誤，須為 vX.Y.Z 或 X.Y.Z');
        process.exit(1);
    }
    const ver = version.startsWith('v') ? version : `v${version}`;
    const branchName = `release/${ver}`;
    log.info(`專案: ${config.projectName}`);
    if (config.currentRepo)
        log.info(`Repo: ${config.currentRepo.repoRole}`);
    log.info(`Release 分支: ${branchName}`);
    const createMainPR = options.yes ? true : await confirm({
        message: `建立 PR: ${branchName} → main？`,
        default: true,
    });
    if (createMainPR) {
        try {
            git.fetch();
            git.pushBranch(branchName);
            const prUrl = createPR({
                title: `Release ${ver}`,
                body: `## Release ${ver}\n\nMerge release branch to main.`,
                base: 'main',
                head: branchName,
            });
            log.success(`PR 已建立: ${prUrl}`);
            log.info('請到 GitHub 完成 code review 並 merge PR');
        }
        catch (err) {
            log.error(`建立 PR 失敗: ${err instanceof Error ? err.message : err}`);
            return;
        }
    }
    if (options.yes) {
        log.info('正在自動 merge PR...');
        try {
            mergePR({ branch: branchName });
            log.success('PR 已自動 merge');
        }
        catch (err) {
            log.error(`自動 merge 失敗: ${err instanceof Error ? err.message : err}`);
            return;
        }
    }
    else {
        const merged = await confirm({
            message: 'PR 已 merge 到 main 了嗎？（確認後將打 tag 並同步回 develop）',
            default: false,
        });
        if (!merged) {
            log.info(`請 merge PR 後再重新執行 devflow release:finish ${ver}`);
            return;
        }
    }
    try {
        git.checkout('main');
        git.pull();
        git.createTag(ver);
        git.pushTag(ver);
        log.success(`Tag ${ver} 已建立並推送`);
        git.checkout('develop');
        git.pull();
        log.info('正在將 main 合併回 develop...');
        git.merge('main');
        git.pushBranch('develop');
        log.success('develop 已同步 main 的變更');
        log.success(`Release ${ver} 完成！`);
        // 將本 repo 在 In Review 的 Trello 卡片移到 Done
        const repoRole = config.currentRepo?.repoRole;
        const inReviewListId = config.board.lists.inReview;
        const doneListId = config.board.lists.done;
        if (repoRole && inReviewListId && doneListId) {
            try {
                const cards = await getListCards(config, inReviewListId);
                for (const card of cards) {
                    const match = card.name.match(/^\[([^\]]+)\]/);
                    if (match && match[1] === repoRole) {
                        await moveCard(config, card.id, doneListId);
                        log.success(`Trello 卡片已移到 Done: ${card.name}`);
                    }
                }
            }
            catch (err) {
                log.warn(`Trello 移卡失敗: ${err instanceof Error ? err.message : err}`);
            }
        }
    }
    catch (err) {
        log.error(`失敗: ${err instanceof Error ? err.message : err}`);
    }
}
