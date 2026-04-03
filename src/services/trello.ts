import type { ResolvedConfig, TrelloCard } from '../types/index.js';

const BASE = 'https://api.trello.com/1';

function authQuery(apiKey: string, token: string): string {
  return `key=${apiKey}&token=${token}`;
}

function auth(config: ResolvedConfig): string {
  return authQuery(config.trello.apiKey, config.trello.token);
}

// ── Card operations (use ResolvedConfig) ──

export async function createCard(
  config: ResolvedConfig,
  params: {
    name: string;
    desc?: string;
    idList: string;
    idLabels?: string[];
    idMembers?: string[];
    due?: string;
  },
): Promise<TrelloCard> {
  const res = await fetch(`${BASE}/cards?${auth(config)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`Trello createCard failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<TrelloCard>;
}

export async function moveCard(config: ResolvedConfig, cardId: string, listId: string): Promise<void> {
  const res = await fetch(`${BASE}/cards/${cardId}?${auth(config)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idList: listId }),
  });
  if (!res.ok) throw new Error(`Trello moveCard failed: ${res.status}`);
}

export async function addComment(config: ResolvedConfig, cardId: string, text: string): Promise<void> {
  const res = await fetch(`${BASE}/cards/${cardId}/actions/comments?${auth(config)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`Trello addComment failed: ${res.status}`);
}

export async function getCardByShortLink(config: ResolvedConfig, shortLink: string): Promise<TrelloCard> {
  const res = await fetch(`${BASE}/cards/${shortLink}?${auth(config)}&fields=id,idShort,shortLink,shortUrl,name,desc`);
  if (!res.ok) throw new Error(`Trello getCard failed: ${res.status}`);
  return res.json() as Promise<TrelloCard>;
}

export async function getListCards(
  config: ResolvedConfig,
  listId: string,
): Promise<Array<{ id: string; name: string }>> {
  const res = await fetch(`${BASE}/lists/${listId}/cards?${auth(config)}&fields=id,name`);
  if (!res.ok) throw new Error(`Trello getListCards failed: ${res.status}`);
  return res.json() as Promise<Array<{ id: string; name: string }>>;
}

// ── Board operations (use raw credentials, for init) ──

export async function getBoardLists(apiKey: string, token: string, boardId: string) {
  const res = await fetch(`${BASE}/boards/${boardId}/lists?${authQuery(apiKey, token)}`);
  if (!res.ok) throw new Error(`Trello getBoardLists failed: ${res.status}`);
  return res.json() as Promise<Array<{ id: string; name: string }>>;
}

export async function getBoardLabels(apiKey: string, token: string, boardId: string) {
  const res = await fetch(`${BASE}/boards/${boardId}/labels?${authQuery(apiKey, token)}`);
  if (!res.ok) throw new Error(`Trello getBoardLabels failed: ${res.status}`);
  return res.json() as Promise<Array<{ id: string; name: string; color: string }>>;
}

export async function getBoardMembers(apiKey: string, token: string, boardId: string) {
  const res = await fetch(`${BASE}/boards/${boardId}/members?${authQuery(apiKey, token)}`);
  if (!res.ok) throw new Error(`Trello getBoardMembers failed: ${res.status}`);
  return res.json() as Promise<Array<{ id: string; fullName: string; username: string }>>;
}

export async function createBoard(apiKey: string, token: string, name: string) {
  const res = await fetch(`${BASE}/boards?${authQuery(apiKey, token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, defaultLists: false }),
  });
  if (!res.ok) throw new Error(`Trello createBoard failed: ${res.status}`);
  return res.json() as Promise<{ id: string; shortUrl: string }>;
}

export async function createList(apiKey: string, token: string, boardId: string, name: string, pos: number) {
  const res = await fetch(`${BASE}/boards/${boardId}/lists?${authQuery(apiKey, token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, pos }),
  });
  if (!res.ok) throw new Error(`Trello createList failed: ${res.status}`);
  return res.json() as Promise<{ id: string; name: string }>;
}

export async function createLabel(apiKey: string, token: string, boardId: string, name: string, color: string) {
  const res = await fetch(`${BASE}/boards/${boardId}/labels?${authQuery(apiKey, token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, color }),
  });
  if (!res.ok) throw new Error(`Trello createLabel failed: ${res.status}`);
  return res.json() as Promise<{ id: string; name: string }>;
}
