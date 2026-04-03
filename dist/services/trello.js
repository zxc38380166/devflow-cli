const BASE = 'https://api.trello.com/1';
function authQuery(apiKey, token) {
    return `key=${apiKey}&token=${token}`;
}
function auth(config) {
    return authQuery(config.trello.apiKey, config.trello.token);
}
// ── Card operations (use ResolvedConfig) ──
export async function createCard(config, params) {
    const res = await fetch(`${BASE}/cards?${auth(config)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
    });
    if (!res.ok)
        throw new Error(`Trello createCard failed: ${res.status} ${await res.text()}`);
    return res.json();
}
export async function moveCard(config, cardId, listId) {
    const res = await fetch(`${BASE}/cards/${cardId}?${auth(config)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idList: listId }),
    });
    if (!res.ok)
        throw new Error(`Trello moveCard failed: ${res.status}`);
}
export async function addComment(config, cardId, text) {
    const res = await fetch(`${BASE}/cards/${cardId}/actions/comments?${auth(config)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
    });
    if (!res.ok)
        throw new Error(`Trello addComment failed: ${res.status}`);
}
export async function getCardByShortLink(config, shortLink) {
    const res = await fetch(`${BASE}/cards/${shortLink}?${auth(config)}&fields=id,idShort,shortLink,shortUrl,name,desc`);
    if (!res.ok)
        throw new Error(`Trello getCard failed: ${res.status}`);
    return res.json();
}
// ── Board operations (use raw credentials, for init) ──
export async function getBoardLists(apiKey, token, boardId) {
    const res = await fetch(`${BASE}/boards/${boardId}/lists?${authQuery(apiKey, token)}`);
    if (!res.ok)
        throw new Error(`Trello getBoardLists failed: ${res.status}`);
    return res.json();
}
export async function getBoardLabels(apiKey, token, boardId) {
    const res = await fetch(`${BASE}/boards/${boardId}/labels?${authQuery(apiKey, token)}`);
    if (!res.ok)
        throw new Error(`Trello getBoardLabels failed: ${res.status}`);
    return res.json();
}
export async function getBoardMembers(apiKey, token, boardId) {
    const res = await fetch(`${BASE}/boards/${boardId}/members?${authQuery(apiKey, token)}`);
    if (!res.ok)
        throw new Error(`Trello getBoardMembers failed: ${res.status}`);
    return res.json();
}
export async function createBoard(apiKey, token, name) {
    const res = await fetch(`${BASE}/boards?${authQuery(apiKey, token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, defaultLists: false }),
    });
    if (!res.ok)
        throw new Error(`Trello createBoard failed: ${res.status}`);
    return res.json();
}
export async function createList(apiKey, token, boardId, name, pos) {
    const res = await fetch(`${BASE}/boards/${boardId}/lists?${authQuery(apiKey, token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, pos }),
    });
    if (!res.ok)
        throw new Error(`Trello createList failed: ${res.status}`);
    return res.json();
}
export async function createLabel(apiKey, token, boardId, name, color) {
    const res = await fetch(`${BASE}/boards/${boardId}/labels?${authQuery(apiKey, token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color }),
    });
    if (!res.ok)
        throw new Error(`Trello createLabel failed: ${res.status}`);
    return res.json();
}
