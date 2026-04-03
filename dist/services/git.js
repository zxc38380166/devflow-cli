import { execSync } from 'node:child_process';
function run(cmd, cwd) {
    return execSync(cmd, { encoding: 'utf-8', cwd, stdio: 'pipe' }).trim();
}
export function getGitRoot(cwd) {
    return run('git rev-parse --show-toplevel', cwd);
}
export function getCurrentBranch(cwd) {
    return run('git rev-parse --abbrev-ref HEAD', cwd);
}
export function branchExists(name, cwd) {
    try {
        run(`git rev-parse --verify ${name}`, cwd);
        return true;
    }
    catch {
        return false;
    }
}
export function remoteBranchExists(name, cwd) {
    try {
        const output = run(`git ls-remote --heads origin ${name}`, cwd);
        return output.length > 0;
    }
    catch {
        return false;
    }
}
export function fetch(cwd) {
    run('git fetch origin', cwd);
}
export function checkout(branch, create, cwd) {
    const flag = create ? '-b' : '';
    run(`git checkout ${flag} ${branch}`, cwd);
}
export function pull(cwd) {
    run('git pull', cwd);
}
export function pushBranch(branch, cwd) {
    run(`git push -u origin ${branch}`, cwd);
}
export function createTag(tag, cwd) {
    run(`git tag ${tag}`, cwd);
}
export function pushTag(tag, cwd) {
    run(`git push origin ${tag}`, cwd);
}
export function ensureDevelop(cwd) {
    if (remoteBranchExists('develop', cwd)) {
        if (!branchExists('develop', cwd)) {
            run('git checkout -b develop origin/develop', cwd);
        }
        return;
    }
    run('git checkout main', cwd);
    run('git pull', cwd);
    run('git checkout -b develop', cwd);
    run('git push -u origin develop', cwd);
}
export function merge(branch, cwd) {
    run(`git merge ${branch} --no-edit`, cwd);
}
