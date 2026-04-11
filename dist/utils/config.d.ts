import type { GlobalConfig, ProjectConfig, RepoLocalConfig, DevflowConfig, ResolvedConfig } from '../types/index.js';
export declare function getConfigBase(): string;
export declare function loadGlobalConfig(): GlobalConfig | null;
export declare function saveGlobalConfig(config: GlobalConfig): void;
export declare function loadProjectConfig(name: string): ProjectConfig | null;
export declare function saveProjectConfig(name: string, config: ProjectConfig): void;
export declare function listProjects(): string[];
export declare function getActiveProject(): string | null;
export declare function setActiveProject(name: string): void;
/**
 * Check if a parsed .devflow.json is the new unified format (has board + repos).
 */
export declare function isDevflowConfig(obj: unknown): obj is DevflowConfig;
export declare function loadRepoLocalConfig(cwd?: string): DevflowConfig | RepoLocalConfig | null;
export declare function resolveConfig(): ResolvedConfig;
