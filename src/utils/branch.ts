import type { TaskType } from '../types/index.js';

export function getBaseBranch(type: TaskType): string {
  return type === 'hotfix' ? 'main' : 'develop';
}

export function buildBranchName(type: TaskType, idShort: string, title: string): string {
  const slug = title
    .replace(/[^\u4e00-\u9fffa-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 15);
  return `${type}/${idShort}-${slug}`;
}

export function parseCardIdFromBranch(branch: string): string | null {
  const match = branch.match(/^(?:feat|chore|hotfix)\/(\d+)-/);
  return match ? match[1] : null;
}
