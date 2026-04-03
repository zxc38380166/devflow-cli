import type { ResolvedConfig, TrelloCard } from '../types/index.js';
export declare function createCard(config: ResolvedConfig, params: {
    name: string;
    desc?: string;
    idList: string;
    idLabels?: string[];
    idMembers?: string[];
    due?: string;
}): Promise<TrelloCard>;
export declare function moveCard(config: ResolvedConfig, cardId: string, listId: string): Promise<void>;
export declare function addComment(config: ResolvedConfig, cardId: string, text: string): Promise<void>;
export declare function getCardByShortLink(config: ResolvedConfig, shortLink: string): Promise<TrelloCard>;
export declare function getCardByIdShort(config: ResolvedConfig, idShort: number): Promise<TrelloCard>;
export declare function getListCards(config: ResolvedConfig, listId: string): Promise<Array<{
    id: string;
    name: string;
}>>;
export declare function getBoardLists(apiKey: string, token: string, boardId: string): Promise<{
    id: string;
    name: string;
}[]>;
export declare function getBoardLabels(apiKey: string, token: string, boardId: string): Promise<{
    id: string;
    name: string;
    color: string;
}[]>;
export declare function getBoardMembers(apiKey: string, token: string, boardId: string): Promise<{
    id: string;
    fullName: string;
    username: string;
}[]>;
export declare function createBoard(apiKey: string, token: string, name: string): Promise<{
    id: string;
    shortUrl: string;
}>;
export declare function createList(apiKey: string, token: string, boardId: string, name: string, pos: number): Promise<{
    id: string;
    name: string;
}>;
export declare function createLabel(apiKey: string, token: string, boardId: string, name: string, color: string): Promise<{
    id: string;
    name: string;
}>;
