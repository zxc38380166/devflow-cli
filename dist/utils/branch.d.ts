import type { TaskType } from '../types/index.js';
export declare function getBaseBranch(type: TaskType): string;
export declare function buildBranchName(type: TaskType, shortLink: string, title: string): string;
export declare function parseCardIdFromBranch(branch: string): string | null;
