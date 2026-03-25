# 多人協作開發流程

本文件定義團隊的分支策略、Trello 串接、PR 流程與 Release 管理規範。

> 適用範圍：`WT-ec`（Nuxt 4 前端）與 `WT-be`（NestJS 後端）為**獨立 repo**，各自管理分支與版本。組員可能只參與其中一個專案。

---

## 一、分支策略

```
main ─────────────────────────────────────── production（正式環境）
 │
 ├── develop ─────────────────────────────── 開發主線（PR 合併目標）
 │    ├── feature/CARD-ID-簡述              ← 日常功能開發
 │    └── chore/CARD-ID-簡述               ← 雜務、重構、文件
 │
 ├── release/v1.2.0 ─────────────────────── 上線凍結分支（詳見第五節）
 │
 └── hotfix/CARD-ID-簡述 ────────────────── 緊急修復（從 main 分出）
```

### 命名規則

| 類型 | 格式 | Base Branch | 合併目標 |
|------|------|-------------|----------|
| 功能開發 | `feature/CARD-ID-簡述` | `develop` | → PR 回 `develop` |
| 雜務重構 | `chore/CARD-ID-簡述` | `develop` | → PR 回 `develop` |
| 緊急修復 | `hotfix/CARD-ID-簡述` | `main` | → PR 回 `main`，再同步回 `develop` |
| 上線凍結 | `release/vX.Y.Z` | `develop` | → PR 回 `main`，tag 後同步回 `develop` |

- 分支名稱**必須帶 Trello Card 短碼**（如 `abc123`），這是所有自動化串接的 key
- 簡述使用 kebab-case，不超過 5 個單字

---

## 二、日常開發流程

### 2.1 開單 + 建分支（CLI 互動式）

```bash
devflow task
```

互動流程：

```
? 任務類型：[feature] / [chore] / [hotfix]
? 標題：新增 ATM 對帳功能
? 描述：支援每日自動比對 ATM 入帳記錄與訂單狀態...
? 指派給：@chenshoupei
? 標籤：backend / frontend / urgent
? 到期日（選填）：2026-04-01

✅ Trello 卡片已建立：https://trello.com/c/abc123
✅ 本地分支已建立：feature/abc123-atm-reconciliation
✅ 分支已推送至 remote
```

CLI 背後執行：
1. **Trello API** → 建立卡片，放到對應 List
2. **Git** → 從正確的 base branch 切出新分支
3. **Git push** → `git push -u origin <branch>`

### 2.2 開發與提交

```bash
# commit message 格式（由 commitlint 強制）
git commit -m "feat(abc123): 新增 ATM 對帳 API"
git commit -m "fix(def456): 修正金額計算精度問題"
```

Commit 類型對照：

| 前綴 | 用途 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修復 |
| `chore` | 雜務、依賴更新 |
| `refactor` | 重構（不改變行為） |
| `docs` | 文件 |
| `style` | 格式調整（不影響邏輯） |

### 2.3 建立 PR

```bash
devflow pr
```

自動執行：
1. 從分支名解析 Card ID
2. 填入 PR template，帶上 Trello 卡片連結
3. 呼叫 `gh pr create`
4. Trello API → 移動卡片到 **In Review**

---

## 三、Hotfix 流程

用於**正式環境的緊急修復**，不走 develop 迭代。

```bash
devflow task
# 選擇類型：hotfix
# 自動從 main 建立 hotfix/CARD-ID-xxx 分支
```

```
main ──┬──────────────────────── (正式環境有 bug)
       │
       └── hotfix/abc123-fix ── 修復 ──→ PR 回 main
                                           │
                                           ├─→ merge 後自動 tag（如 v1.1.1）
                                           └─→ GitHub Action 自動開 PR 回 develop
```

**關鍵：** hotfix merge 回 main 後，由 GitHub Action **自動建立一個 PR** 將變更同步回 `develop`，避免遺忘。

---

## 四、Trello 串接

### 4.1 Board 結構

| List | 用途 | 觸發方式 |
|------|------|----------|
| **Backlog** | 待排入的需求 | `devflow task` 開單預設落點 |
| **To Do** | 本次迭代排定 | 手動拖入 |
| **In Progress** | 開發中 | 建立分支時自動移入 |
| **In Review** | PR 審核中 | 建立 PR 時自動移入 |
| **Done** | 已完成 | PR merge 時自動移入 |

### 4.2 自動化同步（GitHub Actions ↔ Trello）

| GitHub 事件 | Trello 動作 |
|-------------|-------------|
| 分支建立（含 Card ID） | 卡片 → **In Progress** |
| PR opened | 卡片 → **In Review**，comment 附上 PR 連結 |
| PR approved | 卡片加上 `✅ approved` label |
| PR changes_requested | 卡片 → **In Progress** |
| PR merged | 卡片 → **Done**，comment 記錄 merge SHA |
| PR closed（未 merge） | 卡片 → **In Progress**，移除 PR 連結 |

### 4.3 Trello API 設定

#### 取得 API 憑證

1. 前往 https://trello.com/power-ups/admin → 取得 **API Key**
2. 同頁面點擊授權連結 → 授權後取得 **Token**
3. Board ID：開啟 Board → URL 中 `trello.com/b/{boardId}/...`

#### 查詢 Board 內的 ID（只需執行一次）

```bash
# 取得所有 List 的 ID（用來決定卡片要放到哪個 List）
curl "https://api.trello.com/1/boards/{boardId}/lists?key={key}&token={token}"

# 取得所有 Member ID（用來指派成員）
curl "https://api.trello.com/1/boards/{boardId}/members?key={key}&token={token}"

# 取得所有 Label ID（用來標記 frontend/backend）
curl "https://api.trello.com/1/boards/{boardId}/labels?key={key}&token={token}"
```

查到的 ID 存入專案根目錄 `.trello.json`（可進版控，不含敏感資訊）：

```jsonc
{
  "boardId": "xxxxxx",
  "lists": {
    "backlog": "list_id_1",
    "todo": "list_id_2",
    "inProgress": "list_id_3",
    "inReview": "list_id_4",
    "done": "list_id_5"
  },
  "labels": {
    "frontend": "label_id_1",
    "backend": "label_id_2",
    "urgent": "label_id_3"
  },
  "members": {
    "chenshoupei": "member_id_1"
  }
}
```

#### 個人憑證（不進版控）

在專案根目錄的 `.env` 中設定（已加入 `.gitignore`）：

```bash
TRELLO_API_KEY=your_api_key
TRELLO_TOKEN=your_token
```

#### 4.3.1 `devflow task` 建卡的 API 呼叫

CLI 互動完成後，呼叫 Trello REST API 建立卡片：

```ts
// POST https://api.trello.com/1/cards
const response = await fetch('https://api.trello.com/1/cards', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    key: process.env.TRELLO_API_KEY,
    token: process.env.TRELLO_TOKEN,
    idList: trelloConfig.lists.backlog,   // 預設放到 Backlog
    name: '新增 ATM 對帳功能',              // ← 互動輸入的標題
    desc: '支援每日自動比對 ATM 入帳...',     // ← 互動輸入的描述
    idMembers: ['member_id'],             // ← 互動選擇的指派對象
    idLabels: ['label_id'],               // ← 根據專案自動帶入 frontend/backend
    due: '2026-04-01T00:00:00.000Z',      // ← 互動輸入的到期日（選填）
  }),
})

const card = await response.json()
// card.shortLink → 'abc123'（用作分支名的 Card ID）
// card.shortUrl  → 'https://trello.com/c/abc123'（顯示給開發者）
```

#### 4.3.2 移動卡片的 API 呼叫

當分支建立、PR 開啟、PR merge 等事件發生時，移動卡片到對應 List：

```ts
// PUT https://api.trello.com/1/cards/{cardId}
await fetch(`https://api.trello.com/1/cards/${cardId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    key: process.env.TRELLO_API_KEY,
    token: process.env.TRELLO_TOKEN,
    idList: trelloConfig.lists.inReview,  // 目標 List ID
  }),
})
```

#### 4.3.3 在卡片上新增 Comment

PR 連結、merge SHA 等資訊透過 comment 附加到卡片：

```ts
// POST https://api.trello.com/1/cards/{cardId}/actions/comments
await fetch(`https://api.trello.com/1/cards/${cardId}/actions/comments`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    key: process.env.TRELLO_API_KEY,
    token: process.env.TRELLO_TOKEN,
    text: '🔗 PR opened: https://github.com/org/WT-ec/pull/42',
  }),
})
```

#### 4.3.4 根據 Card 短碼反查 Card ID

分支名帶的是 `shortLink`，API 操作需要完整 `cardId`，可透過短碼查詢：

```ts
// GET https://api.trello.com/1/cards/{shortLink}
const card = await fetch(
  `https://api.trello.com/1/cards/${shortLink}?key=${key}&token=${token}`
).then(r => r.json())
// card.id → 完整的 Card ID，用於後續 PUT / POST
```

---

## 五、Release 流程（詳細）

Release 分支用於**上線前的凍結期**，讓 develop 可以繼續收新功能，同時 release 只收 bugfix。

### 5.1 時機

當 `develop` 累積足夠功能、準備上線時，由負責人建立 release 分支。

### 5.2 建立 Release

```bash
devflow release:create v1.2.0
```

自動執行：
1. 從 `develop` 切出 `release/v1.2.0`
2. 推送至 remote
3. Trello → 建立 Release 卡片或 checklist，列出本次包含的所有 Card

### 5.3 Release 分支的生命週期

```
develop ─── feat A ── feat B ── feat C ──┬── feat D（下次 release）── ...
                                         │
                              release/v1.2.0
                                         │
                                 ├── fix: 修正 QA 回報問題（直接 commit 或 PR）
                                 ├── fix: 最後調整
                                 │
                                 ▼
                              合併回 main
                                 │
                                 ├─→ 打 tag v1.2.0
                                 ├─→ 自動 merge 回 develop（含 release 期間的 fix）
                                 └─→ 刪除 release 分支
```

### 5.4 Release 期間的規則

| 規則 | 說明 |
|------|------|
| **只修 bug** | release 分支只允許 bugfix，不收新功能 |
| **develop 不凍結** | release 切出後，develop 繼續收下一版的 feature |
| **fix 從 release 分支開** | QA 回報的問題，開 `fix/CARD-ID-xxx` 從 `release/v1.2.0` 切出，PR 回 release |
| **不直接 push** | release 分支一樣走 PR review |

### 5.5 完成 Release

```bash
devflow release:finish v1.2.0
```

自動執行：
1. 建立 PR：`release/v1.2.0` → `main`
2. merge 後打 Git tag `v1.2.0`
3. 自動建立 PR：`main` → `develop`（將 release 期間的 fix 同步回去）
4. 刪除 `release/v1.2.0` 分支
5. Trello → 所有本次 release 的卡片移到 **Done**
6. 可選：觸發部署 pipeline

### 5.6 Release 版號規則

採用 [Semantic Versioning](https://semver.org/)：

| 版號位置 | 遞增時機 | 範例 |
|----------|----------|------|
| **Major** `X.0.0` | 破壞性變更、大版本改版 | `2.0.0` |
| **Minor** `0.X.0` | 新功能上線 | `1.3.0` |
| **Patch** `0.0.X` | Hotfix 修復 | `1.2.1` |

各 repo 版號**各自獨立管理**，因為部署節奏可能不同。

---

## 六、多 Repo 獨立管理

### 6.1 原則

- 每個 repo 各自擁有獨立的 `main`、`develop`、分支與版號
- 組員可能只參與其中一個 repo，不需要 clone 其他的
- Trello 卡片用 **Label** 區分 `frontend` / `backend` / `fullstack`
- 每個 repo 根目錄放 `.devflow.json` 標識所屬專案與角色

### 6.2 跨 Repo 協作

當一個功能同時需要前後端修改時：

```
Trello Card: "新增 ATM 對帳功能" [fullstack]
  │
  ├── backend repo: feature/abc123-atm-reconciliation-api
  │                 → PR 回 develop
  │
  └── frontend repo: feature/abc123-atm-reconciliation-ui
                     → PR 回 develop
```

- 同一張 Trello 卡片，兩邊各自開分支
- PR 互相引用（在 PR description 中連結對方的 PR）
- **後端先 merge**（前端通常依賴後端 API）
- 卡片在兩邊的 PR 都 merge 後才移到 Done

### 6.3 CLI 自動偵測 Repo

CLI 透過 repo 根目錄的 `.devflow.json` 判斷當前 repo 角色：

```bash
# 在前端 repo 內執行，自動偵測角色為 frontend
cd my-app-web && devflow task

# 在後端 repo 內執行，自動偵測角色為 backend
cd my-app-api && devflow task
```

首次設定用 `devflow link` 產生 `.devflow.json`，commit 後其他組員 clone 即可用。

---

## 七、Git Hooks（husky + commitlint）

### 7.1 安裝

```bash
yarn add -D husky @commitlint/cli @commitlint/config-conventional
```

### 7.2 commit-msg Hook

強制 commit message 帶 Card ID：

```
# 合法格式
feat(abc123): 新增 ATM 對帳 API
fix(def456): 修正金額精度

# 不合法（被 hook 擋下）
新增功能          ← 缺少類型與 Card ID
feat: 新增功能    ← 缺少 Card ID
```

### 7.3 pre-push Hook

檢查分支命名是否符合規範：

```bash
# 合法
feature/abc123-atm-reconciliation
hotfix/def456-fix-amount
release/v1.2.0

# 不合法（被 hook 擋下）
my-branch              ← 缺少類型前綴與 Card ID
feature/new-feature    ← 缺少 Card ID
```

---

## 八、GitHub 設定建議

### 8.1 Branch Protection Rules

對 `main` 和 `develop` 設定：

- [x] Require PR before merging
- [x] Require at least 1 approval
- [x] Require status checks to pass（CI）
- [x] Require branches to be up to date before merging
- [x] Do not allow bypassing the above settings

### 8.2 PR Template

每個 repo 放置 `.github/pull_request_template.md`：

```markdown
## Trello
<!-- devflow pr 會自動填入 -->

## 變更摘要
-

## 測試方式
- [ ] 本地自測通過
- [ ] 相關 i18n 已更新
- [ ] 無 console.log 殘留
```

---

## 九、完整流程總覽

```
                          ┌──────────────┐
                          │  devflow task   │ 互動式 CLI
                          └──────┬───────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
              Trello 建卡    Git 建分支    Git push
              (→ Backlog)   (from base)   (-u origin)
                    │
                    ▼
              卡片 → In Progress
                    │
                    ▼
              ┌───────────┐
              │  開發提交   │  commit-msg hook 驗證格式
              └─────┬─────┘
                    │
                    ▼
              ┌───────────┐
              │  devflow pr   │  建立 PR + Trello → In Review
              └─────┬─────┘
                    │
                    ▼
              ┌───────────┐
              │ Code Review│  GitHub PR Review
              └─────┬─────┘
                    │
           ┌───────┼───────┐
           ▼               ▼
       approved      changes requested
           │               │
           ▼               ▼
     Merge PR        卡片 → In Progress
           │          修改後重新 push
           ▼
     ┌─────────────────────────┐
     │ GitHub Action 自動觸發   │
     ├─────────────────────────┤
     │ • Trello 卡片 → Done    │
     │ • hotfix → 自動 PR 回   │
     │   develop               │
     │ • release → tag + 同步  │
     │   回 develop            │
     └─────────────────────────┘
```

---

## 十、實作狀態

### 已完成

- [x] `devflow setup` — 一鍵產生 `scaffold.config.json`，搭配 `/scaffold` 完整建置
- [x] `/scaffold` 整合 — 支援 config 檔帶入 + devflow Phase 10 自動化
- [x] `devflow init` — 互動式專案建立 + Trello Board 自動設定
- [x] `devflow link` — 將 repo 連結到專案（產生 `.devflow.json`）
- [x] `devflow export` / `devflow import` — 設定匯出匯入（組員 onboarding）
- [x] `devflow use` — 切換目前專案
- [x] `devflow task` — 建立 Trello 卡片 + Git 分支
- [x] `devflow pr` — 建立 PR + 同步 Trello 狀態
- [x] `devflow release:create` / `devflow release:finish` — Release 流程

### 待實作

- [ ] GitHub Actions workflow：Trello 狀態同步（PR merge → Done）
- [ ] GitHub Actions workflow：hotfix 自動 PR 回 develop
- [ ] husky + commitlint 設定
- [ ] pre-push hook：分支命名驗證
- [ ] PR template
- [ ] Branch protection rules 設定
