import { execSync } from 'node:child_process';
function run(cmd, cwd) {
    return execSync(cmd, { encoding: 'utf-8', cwd, stdio: 'pipe' }).trim();
}
export function mergePR(params) {
    const { branch, method = 'merge', cwd } = params;
    run(`gh pr merge "${branch}" --${method} --delete-branch`, cwd);
}
export function createPR(params) {
    const { title, body, base, head, cwd } = params;
    const result = run(`gh pr create --base "${base}" --head "${head}" --title "${title}" --body "${body}"`, cwd);
    // gh pr create outputs the PR URL
    const urlMatch = result.match(/https:\/\/github\.com\/.+\/pull\/\d+/);
    return urlMatch ? urlMatch[0] : result;
}
