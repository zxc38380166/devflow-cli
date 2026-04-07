export declare function mergePR(params: {
    branch: string;
    method?: 'merge' | 'squash' | 'rebase';
    cwd?: string;
}): void;
export declare function createPR(params: {
    title: string;
    body: string;
    base: string;
    head: string;
    cwd?: string;
}): string;
