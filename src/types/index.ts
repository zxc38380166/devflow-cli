/** ~/.devflow/config.json */
export interface GlobalConfig {
  activeProject: string;
  trello: {
    apiKey: string;
    token: string;
  };
}

/** ~/.devflow/projects/{name}/config.json */
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

/** .devflow.json in each repo root */
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
  currentRepo: RepoLocalConfig | null;
}

export type TaskType = 'feat' | 'chore' | 'fix';

export interface TrelloCard {
  id: string;
  idShort: number;
  shortLink: string;
  shortUrl: string;
  name: string;
  desc: string;
}
