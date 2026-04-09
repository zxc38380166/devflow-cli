# devflow-cli

團隊開發流程 CLI — Trello + Git + GitHub + Scaffold 自動化串接。

適用於任何專案，不綁定特定 repo。搭配 Claude Code `/scaffold` 指令可一鍵建置完整全端專案。

## 安裝

```bash
# 在專案根目錄（workspace 或單一 repo 皆可）
yarn add -D github:zxc38380166/devflow-cli
```

安裝後透過 `npx devflow` 執行指令。

## 指令總覽

| 指令 | 說明 |
|------|------|
| `npx devflow setup` | 一鍵建置新專案（產生 scaffold.config.json） |
| `npx devflow init` | 初始化開發流程（Trello + Board + Repos） |
| `npx devflow link` | 將目前 repo 連結到專案 |
| `npx devflow export` | 匯出專案設定（不含憑證） |
| `npx devflow import <file>` | 匯入專案設定檔 |
| `npx devflow use <project>` | 切換專案 |
| `npx devflow task` | 建立 Trello 卡片 + Git 分支 |
| `npx devflow task -y` | 同上，跳過分支建立確認（適用 CI / Claude Code） |
| `npx devflow pr` | 建立 PR + 同步 Trello 狀態 |
| `npx devflow release:create <ver>` | 建立 release 分支 + 發 PR → main |
| `npx devflow release:finish <ver>` | 完成 release（merge PR + tag + 同步 develop） |
| `npx devflow release:finish <ver> -y` | 同上，自動 merge（跳過確認） |

## Claude Code Skill（非互動式）

除了互動式 CLI，也提供 `/devflow` skill 供 Claude Code 自動執行。透過 `devflow.jsonc` 定義操作：

```jsonc
[
  // 建立 Trello 卡片 + Git 分支
  {
    "action": "task",
    "repo": "WT-be",
    "taskType": "feature",
    "title": "新增代付註記 API",
    "description": "PM 可讀的描述",
    "labels": ["backend"],
    "members": [],
    "dueDate": "",
    "createBranch": true
  },

  // 建立 PR
  { "action": "pr", "repo": "WT-be", "title": "feat: 新增代付註記 API" },

  // Release 流程
  { "action": "release:create", "repo": "WT-be", "version": "1.0.16" },
  { "action": "release:finish", "repo": "WT-be", "version": "1.0.16" }
]
```

執行方式：

```bash
node node_modules/devflow-cli/.claude/skills/devflow/run.mjs
```

## Trello 卡片命名

卡片名稱格式為 `[專案名][角色縮寫] 標題`，例如：

```
[WT-ec][FE] 發票歷程稅額%數添加
[WT-be][BE] 代付註記功能後端 API
```

角色縮寫對照：

| 角色 | 縮寫 |
|------|------|
| frontend | FE |
| backend | BE |

## 分支命名

分支名稱格式為 `{前綴}/{Trello卡片單號}-{標題slug}`，例如：

```
feat/61-代付註記功能後端-API-Sw
chore/42-重構登入模組
fix/58-修復金額計算錯誤
```

前綴對照：

| 任務類型 | 分支前綴 | 從哪切 | 合併回 |
|----------|----------|--------|--------|
| feature | `feat` | develop | → develop |
| chore | `chore` | develop | → develop |
| hotfix | `fix` | main | → main，再同步回 develop |

> slug 最多 15 字元，支援中文

## 一鍵開箱（搭配 /scaffold）

```bash
# 1. 在新專案目錄執行
npx devflow setup          # 互動式收集參數 → 產生 scaffold.config.json

# 2. 在 Claude Code 中執行
/scaffold                  # 讀取 config → 自動建置 Repos + 框架 + Trello + 分支策略
```

## Trello 憑證取得

`devflow init` 過程中會需要 Trello API Key 和 Token：

1. 前往 https://trello.com/power-ups/admin
2. 點「**New**」建立一個 Power-Up（名稱隨意，如 devflow）
3. 建立後點進該 Power-Up → 左側「**API Key**」→ 複製 API Key
4. 在同一頁面，點擊 API Key 右側的「**權杖**」超連結
5. 授權後，頁面會顯示 Token，複製即可

## 分支流程

### 分支總覽

```
main ─────────────────────────────────────── 正式環境（production）
 │
 ├── develop ─────────────────────────────── 開發主線（PR 合併目標）
 │    ├── feat/61-功能名稱                   ← 功能開發
 │    └── chore/42-重構名稱                  ← 雜務、重構
 │
 ├── release/v1.2.0 ─────────────────────── 上線凍結分支
 │
 └── fix/58-修復名稱 ───────────────────── 緊急修復（從 main 分出）
```

---

### Feature / Chore 日常開發流程

```
 ┌─────────────────────────────────────────────────────────────────────┐
 │                         devflow task                               │
 │  互動選擇 feature/chore → 建立 Trello 卡片 → 從 develop 切分支     │
 └────────────────────────────┬────────────────────────────────────────┘
                              │
                              ▼
            ┌─────────────────────────────────────┐
            │  Trello: Backlog → In Progress      │
            │  Git:    develop → feat/61-功能名稱   │
            │  Remote: git push -u origin          │
            └─────────────────┬───────────────────┘
                              │
                              ▼
            ┌─────────────────────────────────────┐
            │  開發 & 提交                         │
            │  git commit -m "feat: ..."          │
            └─────────────────┬───────────────────┘
                              │
                              ▼
            ┌─────────────────────────────────────┐
            │  devflow pr                          │
            │  建立 PR → develop                   │
            │  Trello: In Progress → In Review     │
            │  卡片留言 PR 連結                     │
            └─────────────────┬───────────────────┘
                              │
                              ▼
            ┌─────────────────────────────────────┐
            │  Code Review                         │
            └───────┬─────────────────┬───────────┘
                    │                 │
              approved          changes requested
                    │                 │
                    ▼                 ▼
            ┌──────────────┐  ┌──────────────────┐
            │  Merge PR    │  │ Trello → In Prog  │
            │  into develop│  │ 修改後重新 push    │
            └──────┬───────┘  └──────────────────┘
                   │
                   ▼
            ┌─────────────────────────────────────┐
            │  Trello: In Review → Done            │
            │  分支可刪除                           │
            └─────────────────────────────────────┘
```

---

### Hotfix 緊急修復流程

```
         正式環境發現 Bug
                │
                ▼
 ┌─────────────────────────────────────────────────────────────────────┐
 │  devflow task（選擇 hotfix）                                        │
 │  從 main 切出 fix/58-修復名稱                                       │
 └────────────────────────────┬────────────────────────────────────────┘
                              │
                              ▼
            ┌─────────────────────────────────────┐
            │  修復 & 提交                         │
            │  git commit -m "fix: ..."           │
            └─────────────────┬───────────────────┘
                              │
                              ▼
            ┌─────────────────────────────────────┐
            │  devflow pr                          │
            │  建立 PR → main                      │
            └─────────────────┬───────────────────┘
                              │
                         Review & Merge
                              │
                              ▼
            ┌─────────────────────────────────────┐
            │  merge 進 main                       │
            │                                      │
            │  ├→ 打 tag（如 v1.1.1）              │
            │  ├→ 自動同步回 develop                │
            │  └→ Trello 卡片 → Done               │
            └─────────────────────────────────────┘

 時間軸：
 main    ──●──────────────────●── merge ──●── tag v1.1.1
           │                  ▲
           └── fix/58-修復名稱 ┘
                                     │
 develop ─────────────────────────── ● ← 自動同步
```

---

### Release 上線流程

```
 ┌─────────────────────────────────────────────────────────────────────┐
 │  devflow release:create v1.2.0                                     │
 │  從 develop 切出 release/v1.2.0                                    │
 └────────────────────────────┬────────────────────────────────────────┘
                              │
                              ▼
            ┌─────────────────────────────────────┐
            │  Release 凍結期                      │
            │                                      │
            │  ✅ 只允許 bugfix                    │
            │  ❌ 不收新功能                       │
            │  develop 繼續收下一版 feature         │
            └─────────────────┬───────────────────┘
                              │
                    QA 測試 & 修 bug
                              │
                              ▼
 ┌─────────────────────────────────────────────────────────────────────┐
 │  devflow release:finish v1.2.0                                     │
 │                                                                    │
 │  1. merge PR: release/v1.2.0 → main                               │
 │  2. 打 Git tag v1.2.0                                              │
 │  3. 同步 main → develop                                            │
 │  4. 刪除 release/v1.2.0 分支                                       │
 │  5. Trello：該 repo 在 In Review 的卡片 → Done                     │
 └─────────────────────────────────────────────────────────────────────┘

 時間軸：
 main    ─────────────────────────────────── ● merge ── tag v1.2.0
                                             ▲
 release ─────── fix ── fix ─────────────────┘
          ▲                                        │
 develop ─┴── feat D ── feat E ─────────────────── ● ← 同步
```

---

### Trello 看板自動同步

```
  Backlog      To Do     In Progress    In Review       Done
 ┌────────┐ ┌────────┐ ┌────────────┐ ┌───────────┐ ┌────────┐
 │        │ │        │ │            │ │           │ │        │
 │ 新卡片 │→│ 手動排 │→│ devflow    │→│ devflow   │→│  PR    │
 │        │ │ 入迭代 │ │ task 建分支│ │ pr 建 PR  │ │ merged │
 │        │ │        │ │            │ │           │ │        │
 └────────┘ └────────┘ └────────────┘ └───────────┘ └────────┘
                              ▲               │
                              │    changes    │
                              └── requested ──┘
```

| 觸發事件 | Trello 動作 |
|----------|-------------|
| `devflow task` | 建卡 → **Backlog** → **In Progress** |
| `devflow pr` | 卡片 → **In Review**，留言 PR 連結 |
| `devflow release:finish` | 該 repo 的 In Review 卡片 → **Done** |

## 組員加入

```bash
# 情境 A：有 workspace 權限
git clone --recursive git@github.com:org/xx-platform.git
cd xx-platform && yarn install
npx devflow import devflow-xxx.json

# 情境 B：只有單一 repo 權限
git clone git@github.com:org/xx-ec.git
cd xx-ec && yarn add -D github:zxc38380166/devflow-cli
npx devflow import devflow-xxx.json
npx devflow link
```

## 設定檔

| 檔案 | 位置 | 說明 |
|------|------|------|
| `~/.devflow/config.json` | 全域 | Trello 憑證 + activeProject |
| `~/.devflow/projects/<name>/config.json` | 全域 | 專案 Board、Repos、Labels、Members |
| `.devflow.json` | 各 repo 根目錄 | 連結專案 + repo 角色 |
| `devflow.jsonc` | workspace 根目錄 | Claude Code Skill 操作定義 |

## 文件

- [操作手冊](docs/guide/wt-cli.md)
- [開發流程規範](docs/guide/workflow.md)
- [/scaffold 指令說明](.claude/commands/scaffold.md)
- [/devflow Skill 說明](.claude/skills/devflow/SKILL.md)
