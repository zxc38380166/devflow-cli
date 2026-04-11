/** ~/.devflow/config.json — only Trello credentials + optional activeProject */
export interface GlobalConfig {
    activeProject?: string;
    trello: {
        apiKey: string;
        token: string;
    };
}
/** ~/.devflow/projects/{name}/config.json (legacy, still supported for import) */
export interface ProjectConfig {
    projectName: string;
    repos: Record<string, RepoEntry>;
    board: BoardConfig;
}
export interface RepoEntry {
    name: string;
    role: string;
}
export interface BoardConfig {
    boardId: string;
    boardUrl: string;
    lists: Record<string, string>;
    labels: Record<string, string>;
    members: Record<string, string>;
}
/**
 * .devflow.json in each repo root — the NEW unified format.
 * Contains full project config so team members need zero setup beyond Trello credentials.
 */
export interface DevflowConfig {
    project: string;
    repoRole: string;
    repos: Record<string, RepoEntry>;
    board: BoardConfig;
}
/** Legacy .devflow.json (minimal pointer only) */
export interface RepoLocalConfig {
    project: string;
    repoRole: string;
}
/** Merged runtime config passed to all commands/services */
export interface ResolvedConfig {
    projectName: string;
    trello: {
        apiKey: string;
        token: string;
    };
    board: BoardConfig;
    repos: Record<string, RepoEntry>;
    currentRepo: DevflowConfig | RepoLocalConfig | null;
}
export type TaskType = 'feat' | 'chore' | 'hotfix';
export interface TrelloCard {
    id: string;
    idShort: number;
    shortLink: string;
    shortUrl: string;
    name: string;
    desc: string;
}
