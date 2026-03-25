import { execSync } from 'node:child_process';

function run(cmd: string, cwd?: string): string {
  return execSync(cmd, { encoding: 'utf-8', cwd, stdio: 'pipe' }).trim();
}

export function getGitRoot(cwd?: string): string {
  return run('git rev-parse --show-toplevel', cwd);
}

export function getCurrentBranch(cwd?: string): string {
  return run('git rev-parse --abbrev-ref HEAD', cwd);
}

export function branchExists(name: string, cwd?: string): boolean {
  try {
    run(`git rev-parse --verify ${name}`, cwd);
    return true;
  } catch {
    return false;
  }
}

export function remoteBranchExists(name: string, cwd?: string): boolean {
  try {
    const output = run(`git ls-remote --heads origin ${name}`, cwd);
    return output.length > 0;
  } catch {
    return false;
  }
}

export function fetch(cwd?: string): void {
  run('git fetch origin', cwd);
}

export function checkout(branch: string, create?: boolean, cwd?: string): void {
  const flag = create ? '-b' : '';
  run(`git checkout ${flag} ${branch}`, cwd);
}

export function pull(cwd?: string): void {
  run('git pull', cwd);
}

export function pushBranch(branch: string, cwd?: string): void {
  run(`git push -u origin ${branch}`, cwd);
}

export function createTag(tag: string, cwd?: string): void {
  run(`git tag ${tag}`, cwd);
}

export function pushTag(tag: string, cwd?: string): void {
  run(`git push origin ${tag}`, cwd);
}

export function ensureDevelop(cwd?: string): void {
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

export function merge(branch: string, cwd?: string): void {
  run(`git merge ${branch} --no-edit`, cwd);
}
