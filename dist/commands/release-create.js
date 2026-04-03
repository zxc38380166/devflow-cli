import { confirm } from '@inquirer/prompts';
import { resolveConfig } from '../utils/config.js';
import * as git from '../services/git.js';
import { log } from '../utils/logger.js';
export async function releaseCreateCommand(version) {
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
    const ok = await confirm({
        message: `將從 develop 建立 ${branchName}，確認？`,
        default: true,
    });
    if (!ok) {
        log.warn('已取消');
        return;
    }
    try {
        git.fetch();
        git.ensureDevelop();
        git.checkout('develop');
        git.pull();
        git.checkout(branchName, true);
        git.pushBranch(branchName);
        log.success(`Release 分支已建立並推送: ${branchName}`);
        log.info(`接下來在此分支上只修 bug，完成後執行 devflow release:finish ${ver}`);
    }
    catch (err) {
        log.error(`失敗: ${err instanceof Error ? err.message : err}`);
    }
}
