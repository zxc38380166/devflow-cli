import type { TaskType } from '../types/index.js';

export function getBaseBranch(type: TaskType): string {
  return type === 'hotfix' ? 'main' : 'develop';
}

export function buildBranchName(type: TaskType, shortLink: string, title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `${type}/${shortLink}-${slug}`;
}

export function parseCardIdFromBranch(branch: string): string | null {
  const match = branch.match(/^(?:feature|chore|hotfix)\/([a-zA-Z0-9]+)-/);
  return match ? match[1] : null;
}
