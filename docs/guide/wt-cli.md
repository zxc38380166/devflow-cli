# Devflow CLI 操作手冊

`devflow` 是團隊通用的開發流程 CLI 工具，自動串接 **Trello + Git + GitHub**。
適用於任何專案，不綁定特定 repo。可搭配 `/scaffold` 指令一鍵建置全新專案。

---

## 目錄

1. [一鍵開箱：新專案完整建置](#一一鍵開箱新專案完整建置)
2. [既有專案整合 devflow](#二既有專案整合-devflow)
3. [組員加入專案（三種情境）](#三組員加入專案三種情境)
4. [日常開發指令](#四日常開發指令)
5. [Release 流程](#五release-流程)
6. [多專案管理](#六多專案管理)
7. [指令速查表](#七指令速查表)
8. [scaffold.config.json 完整欄位](#八scaffoldconfigjson-完整欄位)
9. [設定檔說明](#九設定檔說明)
10. [常見問題](#十常見問題)

---

## 一、一鍵開箱：新專案完整建置

> 從零開始，一次搞定：GitHub Repos + Nuxt + Next.js + NestJS + Trello Board + 分支策略 + 開發流程。

### 流程圖

```
devflow setup              /scaffold
(互動式收集參數)  ──→  scaffold.config.json  ──→  (自動執行所有建置)
                                                    │
                                                    ├── GitHub Repos
                                                    ├── NestJS 後端
                                                    ├── Nuxt 前台
                                                    ├── Next.js 後台
                                                    ├── Workspace 腳本
                                                    ├── VitePress 文件
                                                    ├── Cloudflare 部署
                                                    │
                                                    └── Devflow 開發流程
                                                         ├── Trello Board（自動建立）
                                                         ├── develop 分支（自動建立）
                                                         ├── .devflow.json（每個 repo）
                                                         └── devflow export（給組員）
```

### Step 1：執行 setup

```bash
devflow setup
```

互動流程（5 步）：

```
ℹ Devflow Setup — 一鍵建置新專案

=== 1/5 基本資訊 ===
? 專案名稱: myshop
? 專案描述: My E-Commerce Platform
ℹ 偵測到 GitHub 帳號: myuser
? 使用此帳號？ Yes

=== 2/5 資料庫連線 ===
? MySQL 連線字串: mysqlsh --sql --host=127.0.0.1 --port=3306 --user=root --password=secret --schema=myshop
? Redis 連線字串: redis-cli -h 127.0.0.1 -p 6379 -a secret

=== 3/5 Cloudflare 設定（選填）===
? Cloudflare API Token: cf-xxx
? Cloudflare Account ID: cf-yyy

=== 4/5 網域設定 ===
? 前台 EC 網域: myshop.com
? 後台 IMS 網域: admin.myshop.com
? API BE 網域: api.myshop.com

=== 5/5 開發流程（devflow）===
? 是否建置 devflow 開發流程？ Yes
? Trello API Key: trello-key
? Trello Token: ********
? Trello Board 名稱: MYSHOP

──────────────────────────────────────────────────
  專案名稱:     myshop
  Repos:        myshop-ec, myshop-ims, myshop-be
  Devflow:      啟用（Board: MYSHOP）
──────────────────────────────────────────────────

? 確認以上設定，產生 scaffold.config.json？ Yes
✔ 已產生: scaffold.config.json

ℹ 下一步：在 Claude Code 中執行 /scaffold
```

### Step 2：執行 /scaffold

在 Claude Code 中：

```
/scaffold
```

scaffold 會自動讀取 `scaffold.config.json`，依序完成：

| 階段 | 動作 |
|------|------|
| Phase 1 | 建立 4 個 GitHub Repos + Workspace |
| Phase 2 | 建置 NestJS 後端（含完整模組結構） |
| Phase 3 | 建置 Nuxt 前台（含 UI + i18n） |
| Phase 4 | 建置 Next.js 後台（含 shadcn + i18n） |
| Phase 5 | Workspace 腳本（commit、push、dev） |
| Phase 6 | VSCode 設定 |
| Phase 7 | VitePress 文件站 |
| Phase 8 | Cloudflare DNS + Pages 部署 |
| Phase 9 | Initial Commit & Push |
| **Phase 10** | **Devflow 開發流程建置** |
| Phase 11 | 驗證所有服務 |

Phase 10（devflow 整合）自動完成：
- 建立 Trello Board（含 5 個 Lists + 3 個 Labels）
- 在每個 repo 建立 `.devflow.json`
- 在每個 repo 建立 `develop` 分支
- 匯出 `devflow-myshop.json` 給組員使用

### Step 3：分發給組員

把以下東西給組員：
- `devflow-myshop.json`（devflow export 產生的設定檔）
- Trello API Key（團隊共用的）

---

## 二、既有專案整合 devflow

> 已有專案（不論是 workspace 多 repo 或單一 repo），想加入 Trello + 分支策略 + PR 流程。
> 此段落為**管理員**操作，組員請看[第三節](#三組員加入專案三種情境)。

### Step 1：安裝 devflow

```bash
# 在專案根目錄（workspace 或單一 repo 皆可）
yarn add -D github:zxc38380166/devflow-cli
```

安裝後可透過 `npx devflow` 或 `yarn devflow` 執行。

### Step 2：初始化

```bash
npx devflow init
```

devflow 會自動偵測專案結構：

- **Workspace（含 `.gitmodules` 或多個子目錄）**→ 自動識別所有 repo 及角色
- **單一 repo** → 自動偵測目錄名稱推斷角色

```
✔ 偵測到既有專案: myshop
ℹ Repos:
    WT-ec (FE)
    WT-be (BE)

? 使用偵測到的設定？ Yes
? Trello API Key: xxxxxxxx
? Trello Token: ********
? Trello Board: 建立新的 Board
? Board 名稱: MYSHOP

✔ 專案 "myshop" 初始化完成！
```

### Step 3：連結每個 repo

```bash
cd WT-ec && npx devflow link
cd ../WT-be && npx devflow link
```

每個 repo 會產生 `.devflow.json`，**請 commit 進版控**，這樣組員 clone 後自動連結。

### Step 4：匯出設定檔給組員

```bash
npx devflow export
```

產生 `devflow-myshop.json`（不含 Trello 憑證，可安全分享）。

把以下東西給組員：
- `devflow-myshop.json`
- Trello API Key（團隊共用）

### Step 5：安裝 Claude Code Skill（選配）

如果團隊有使用 Claude Code，可安裝 `/devflow` skill：

```bash
cp -r node_modules/devflow-cli/.claude/skills/devflow .claude/skills/
```

這樣組員就能透過 JSON 批次建立 Trello 卡片 + Git 分支。

---

## 三、組員加入專案（三種情境）

### 前置需求（三種情境共通）

- Node.js >= 18
- Git
- GitHub CLI (`gh`) — `brew install gh && gh auth login`
- Trello 帳號

### 取得 Trello Token（三種情境共通）

1. 向管理員取得 **API Key**（團隊共用）
2. 瀏覽器打開以下網址（把 `你的API_KEY` 替換成實際的 Key）：
   ```
   https://trello.com/1/authorize?expiration=never&scope=read,write&response_type=token&key=你的API_KEY
   ```
3. 點擊「允許」→ 複製畫面上的 Token

---

### 情境 A：有 Workspace 權限（如 xx-platform，含所有子 repo）

> 適用：管理員給了你整個 workspace 的存取權限，你可以 clone 整個專案。

```bash
# 1. Clone workspace（含所有子 repo）
git clone --recursive git@github.com:org/myshop-platform.git
cd myshop-platform

# 2. 安裝依賴（devflow-cli 已在 devDependencies）
yarn install

# 3. 匯入管理員提供的設定檔
npx devflow import devflow-myshop.json
# → 輸入 Trello API Key 和 Token

# 4. 完成！
```

> `.devflow.json` 已在每個 repo 內（管理員已 commit），**不需要再 `devflow link`**。
> 直接開始用 `npx devflow task` 或 `/devflow`。

---

### 情境 B：只有單一 Repo 權限（如只拿到 xx-ec）

> 適用：你只被授權存取其中一個 repo，沒有 workspace 權限。

```bash
# 1. Clone 單一 repo
git clone git@github.com:org/myshop-ec.git
cd myshop-ec

# 2. 安裝 devflow（如果 repo 的 devDependencies 已有則跳過此步）
yarn add -D github:zxc38380166/devflow-cli
yarn install

# 3. 匯入管理員提供的設定檔
npx devflow import devflow-myshop.json
# → 輸入 Trello API Key 和 Token

# 4. 連結 repo（如果 .devflow.json 已存在則跳過此步）
npx devflow link
# → 選擇此 repo 的角色（如 FE）

# 5. 完成！
```

> 就算只有一個 repo，devflow 的所有功能（task、pr、release）都能正常使用。

---

### 情境 C：全新環境，從零建置

> 適用：你是管理員，要建一個全新的專案，從頭設定所有東西。

```bash
# 1. 建立工作區
mkdir myshop-platform && cd myshop-platform
git init
yarn init -y

# 2. 安裝 devflow
yarn add -D github:zxc38380166/devflow-cli

# 3. 選擇建置方式：
```

**方式一：一鍵建置（搭配 scaffold）**

適合需要完整專案骨架（NestJS + Nuxt + GitHub Repos + Cloudflare）的情況：

```bash
npx devflow setup    # 互動式收集參數，產生 scaffold.config.json
# 然後在 Claude Code 執行 /scaffold
```

> 詳見[第一節](#一一鍵開箱新專案完整建置)。

**方式二：只要開發流程**

已有 repo，只想加上 Trello + 分支策略：

```bash
npx devflow init     # 互動式設定專案 + Trello
npx devflow link     # 在每個 repo 內執行
npx devflow export   # 匯出設定檔給組員
```

> 詳見[第二節](#二既有專案整合-devflow)。

---

### 情境對照表

| | 情境 A（有 workspace） | 情境 B（只有單一 repo） | 情境 C（全新建置） |
|---|---|---|---|
| **誰** | 組員 | 組員 | 管理員 |
| **Clone** | `--recursive` 整個 workspace | 單一 repo | 自己建 |
| **安裝** | `yarn install` | `yarn add -D` + `yarn install` | `yarn add -D` |
| **匯入設定** | `devflow import` | `devflow import` | `devflow init` 或 `devflow setup` |
| **Link** | 不需要（已有 `.devflow.json`） | `devflow link`（若沒 `.devflow.json`） | `devflow link` |
| **匯出** | — | — | `devflow export`（給組員） |

---

## 四、日常開發指令

### `devflow task` — 建立任務（互動式）

```bash
npx devflow task
```

```
? 任務類型: feat — 新功能
? 標題: 新增 ATM 對帳功能
? 描述: 支援每日自動比對
? 標籤: ☑ FE
? 指派給: ☑ alice
? 到期日: 2026-04-01
? 是否建立 Git 分支？ Yes

✔ Trello 卡片已建立: https://trello.com/c/abc123
✔ 卡片已移到 In Progress
✔ 分支已建立並推送: feat/abc123-atm-reconciliation
```

| 自動動作 | 說明 |
|----------|------|
| Trello 建卡 | 名稱帶 `[repoRole]` 前綴 |
| 移到 In Progress | 從 Backlog 自動移動 |
| 建立 Git 分支 | feat/chore → `develop`、fix → `main` |
| 推送分支 | `git push -u origin <branch>` |

### `/devflow` — 自動化操作（Claude Code skill）

在 Claude Code 中使用，透過 `devflow.jsonc` 批次執行多種操作。

**支援的 action**：`task`、`release:create`、`release:finish`、`pr`

**使用方式**：

1. 編輯工作區根目錄的 `devflow.jsonc`：

```json
[
  { "action": "task", "repo": "myshop-be", "taskType": "feat", "title": "新增對帳 API", "description": "支援 ATM 每日自動對帳", "labels": ["BE"], "members": ["alice"], "createBranch": true },
  { "action": "release:create", "repo": "myshop-be", "version": "1.0.9" },
  { "action": "release:create", "repo": "myshop-ec", "version": "1.0.9" },
  { "action": "pr", "repo": "myshop-be" }
]
```

2. 在 Claude Code 輸入 `/devflow`

**自動完成**：根據 `action` 欄位依序執行對應操作（建卡片、建分支、建 PR、建 release 等）

> **安裝 skill**：`yarn add -D github:zxc38380166/devflow-cli` 後，將 `node_modules/devflow-cli/.claude/skills/devflow` 複製到專案的 `.claude/skills/` 即可。scaffold 建置的新專案會自動完成此步驟。

### `devflow pr` — 建立 Pull Request

```bash
devflow pr
```

```
ℹ 目前分支: feat/abc123-atm-reconciliation
ℹ 卡片: [myshop-ec][FE] 新增 ATM 對帳功能
? PR 標題: [myshop-ec][FE] 新增 ATM 對帳功能
? 確認建立 PR？ Yes

✔ PR 已建立: https://github.com/org/myshop-ec/pull/42
✔ Trello 卡片已移到 In Review
✔ 已在 Trello 卡片留言 PR 連結
```

| 自動動作 | 說明 |
|----------|------|
| 解析 Card ID | 從分支名取得 |
| 建立 PR | 自動判斷 base branch |
| Trello → In Review | 卡片狀態同步 |
| 卡片留言 | 附上 PR 連結 |

---

## 五、Release 流程

### 建立 Release

```bash
devflow release:create v1.2.0
```

從 `develop` 切出 `release/v1.2.0`，推送到 remote。

### 完成 Release

```bash
devflow release:finish v1.2.0
```

1. 建立 PR → `release/v1.2.0` → `main`
2. merge 後打 tag `v1.2.0`
3. 將 main 合併回 develop

---

## 六、多專案管理

### 切換專案

```bash
devflow use another-project
```

### 專案判斷優先順序

1. **Repo 內的 `.devflow.json`** → 自動識別
2. **全域 activeProject** → fallback（`devflow use` 設定）

### 設定目錄結構

```
~/.devflow/
├── config.json                    ← 全域（Trello 憑證 + 目前專案）
└── projects/
    ├── myshop/config.json         ← 專案 A
    └── another/config.json        ← 專案 B
```

---

## 七、指令速查表

### 建置階段

| 指令 | 用途 | 誰用 |
|------|------|------|
| `devflow setup` | 產生 scaffold.config.json（搭配 /scaffold） | 管理員 |
| `devflow init` | 單獨初始化開發流程 | 管理員 |
| `devflow link` | 將 repo 連結到專案 | 管理員/組員 |
| `devflow export` | 匯出設定檔（不含憑證） | 管理員 |
| `devflow import <file>` | 匯入設定檔 | 組員 |
| `devflow use <project>` | 切換專案 | 所有人 |

### 日常開發

| 指令 | 用途 | 誰用 |
|------|------|------|
| `npx devflow task` | 建立 Trello 卡片 + Git 分支（互動式） | 所有人 |
| `/devflow` | 讀取 devflow.jsonc 批次執行操作（Claude Code skill） | 所有人 |
| `npx devflow pr` | 建立 PR + 同步 Trello | 所有人 |
| `npx devflow release:create <ver>` | 建立 release 分支 | 負責人 |
| `npx devflow release:finish <ver>` | 完成 release | 負責人 |

### 組合拳：一鍵開箱

```bash
devflow setup          # 1. 互動式收集所有參數，產生 scaffold.config.json
/scaffold              # 2. 在 Claude Code 執行，自動完成所有建置
```

---

## 八、scaffold.config.json 完整欄位

```jsonc
{
  // === 必填 ===
  "project": {
    "name": "myshop",                    // 專案名（英文 slug，作為 repo 前綴）
    "description": "My E-Commerce"       // 選填，預設 "${name} Platform"
  },
  "github": {
    "username": "myuser"                 // 選填，可自動偵測
  },
  "database": {
    "mysql": "mysqlsh --sql --host=127.0.0.1 --port=3306 --user=root --password=secret --schema=myshop",  // 必填
    "redis": "redis-cli -h 127.0.0.1 -p 6379 -a secret"  // 必填
  },

  // === 選填 ===
  "cloudflare": {
    "apiToken": "cf-xxx",                // 留空則跳過 Cloudflare 階段
    "accountId": "cf-yyy"
  },
  "domains": {
    "ec": "myshop.com",                  // 預設 "${name}.com"
    "ims": "admin.myshop.com",           // 預設 "admin.${name}.com"
    "be": "api.myshop.com"               // 預設 "api.${name}.com"
  },

  // === 開發流程 ===
  "devflow": {
    "enabled": true,                     // false 則跳過 devflow 階段
    "trello": {
      "apiKey": "trello-key",            // devflow 啟用時必填
      "token": "trello-token",           // devflow 啟用時必填
      "boardName": "MYSHOP"              // 預設為大寫 ${name}
    }
  }
}
```

### 驗證規則

| 欄位 | 規則 |
|------|------|
| `project.name` | 必填，只能小寫英文、數字、連字號 |
| `database.mysql` | 必填，需包含 `--host` |
| `database.redis` | 必填，需包含 `-h` |
| `devflow.trello.apiKey` | `devflow.enabled: true` 時必填 |
| `devflow.trello.token` | `devflow.enabled: true` 時必填 |

---

## 九、設定檔說明

### `~/.devflow/config.json`（全域，不分享）

```json
{
  "activeProject": "myshop",
  "trello": {
    "apiKey": "你的 API Key",
    "token": "你的 Token"
  }
}
```

### `~/.devflow/projects/{name}/config.json`（專案）

```json
{
  "projectName": "myshop",
  "repos": {
    "FE": { "name": "myshop-ec", "role": "FE" },
    "admin": { "name": "myshop-ims", "role": "admin" },
    "BE": { "name": "myshop-be", "role": "BE" }
  },
  "board": {
    "boardId": "xxx",
    "boardUrl": "https://trello.com/b/xxx",
    "lists": { "backlog": "...", "todo": "...", "inProgress": "...", "inReview": "...", "done": "..." },
    "labels": { "FE": "...", "BE": "...", "urgent": "..." },
    "members": { "alice": "...", "bob": "..." }
  }
}
```

### `.devflow.json`（每個 repo 根目錄，要 commit）

```json
{
  "project": "myshop",
  "repoRole": "FE"
}
```

### `scaffold.config.json`（工作區根目錄，一次性使用）

由 `devflow setup` 產生，給 `/scaffold` 讀取。用完可刪除或保留作為記錄。

---

## 十、常見問題

### Q: devflow setup 和 devflow init 有什麼差別？
- **`devflow setup`** — 產生 `scaffold.config.json`，搭配 `/scaffold` 一鍵建置整個專案（含 repo 初始化 + 開發流程）
- **`devflow init`** — 只建置開發流程（Trello + 分支策略），適合已有 repo 的情況

### Q: 我只 clone 了一個 repo，可以用 devflow 嗎？
**可以。** 這就是[情境 B](#情境-b只有單一-repo-權限如只拿到-xx-ec)。devflow 設定存在 `~/.devflow/`，跟 repo 數量無關。安裝後匯入設定、link 就能使用全部功能。

### Q: `/devflow` 和 `npx devflow task` 有什麼差別？
- **`npx devflow task`** — 終端互動式，一次建一張卡
- **`/devflow`** — Claude Code skill，用 `devflow.jsonc` 批次執行操作（task、release、pr）

### Q: scaffold.config.json 裡的密碼會被 commit 嗎？
不會。`.gitignore` 已包含 `.env`，但 `scaffold.config.json` 本身沒被 ignore。建議用完後刪除，或加入 `.gitignore`。

### Q: 不想用 Cloudflare 可以嗎？
可以。`scaffold.config.json` 裡的 `cloudflare` 欄位留空或不填，scaffold 會自動跳過 Cloudflare 階段。

### Q: 不想用 devflow 可以嗎？
可以。設定 `devflow.enabled: false`（或 setup 互動時選「否」），scaffold 會跳過 Phase 10。

### Q: 新組員怎麼最快上手？
看你拿到什麼權限：
- **有 workspace 權限**（情境 A）：`git clone --recursive` → `yarn install` → `npx devflow import` → 開始開發
- **只有單一 repo**（情境 B）：`git clone` → `yarn add -D` → `npx devflow import` → `npx devflow link` → 開始開發

詳見[第三節](#三組員加入專案三種情境)。

### Q: develop 分支不存在？
`devflow task` 會自動從 main 建立並推送。

### Q: 可以一人同時參與多個專案？
可以。每個 repo 的 `.devflow.json` 指定所屬專案，devflow 會自動切換。
