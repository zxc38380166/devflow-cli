# devflow-cli

Team dev workflow CLI — Trello + Git + GitHub + Scaffold 自動化串接。

適用於任何專案，不綁定特定 repo。搭配 Claude Code `/scaffold` 指令可一鍵建置完整全端專案。

## 安裝

```bash
# 在專案根目錄（workspace 或單一 repo 皆可）
yarn add -D github:zxc38380166/devflow-cli
```

安裝後透過 `npx devflow` 執行指令。

## 指令總覽

```
npx devflow setup                 一鍵建置新專案（產生 scaffold.config.json）
npx devflow init                  初始化開發流程（Trello + Board + Repos）
npx devflow link                  將目前 repo 連結到專案
npx devflow export                匯出專案設定（不含憑證）
npx devflow import <file>         匯入專案設定檔
npx devflow use <project>         切換專案
npx devflow task                  建立 Trello 卡片 + Git 分支
npx devflow pr                    建立 PR + 同步 Trello
npx devflow release:create <ver>  建立 release 分支
npx devflow release:finish <ver>  完成 release（tag + 同步）
```

## 一鍵開箱（搭配 /scaffold）

```bash
# 1. 在新專案目錄執行
npx devflow setup          # 互動式收集參數 → 產生 scaffold.config.json

# 2. 在 Claude Code 中執行
/scaffold                  # 讀取 config → 自動建置 Repos + 框架 + Trello + 分支策略
```

## Trello 憑證取得

`devflow init` 過程中會需要 Trello API Key 和 Token，取得步驟：

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
 │    ├── feature/CARD-ID-簡述              ← 功能開發
 │    └── chore/CARD-ID-簡述               ← 雜務、重構
 │
 ├── release/v1.2.0 ─────────────────────── 上線凍結分支
 │
 └── hotfix/CARD-ID-簡述 ────────────────── 緊急修復（從 main 分出）
```

| 類型 | 格式 | 從哪切 | 合併回 |
|------|------|--------|--------|
| 功能開發 | `feature/CARD-ID-簡述` | `develop` | → `develop` |
| 雜務重構 | `chore/CARD-ID-簡述` | `develop` | → `develop` |
| 緊急修復 | `hotfix/CARD-ID-簡述` | `main` | → `main`，再同步回 `develop` |
| 上線凍結 | `release/vX.Y.Z` | `develop` | → `main`，tag 後同步回 `develop` |

> 分支名稱必須帶 Trello Card 短碼（如 `abc123`），簡述用 kebab-case

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
            │  Git:    develop → feature/abc123-x  │
            │  Remote: git push -u origin          │
            └─────────────────┬───────────────────┘
                              │
                              ▼
            ┌─────────────────────────────────────┐
            │  開發 & 提交                         │
            │  git commit -m "feat(abc123): ..."   │
            └─────────────────┬───────────────────┘
                              │
                              ▼
            ┌─────────────────────────────────────┐
            │  devflow pr                          │
            │  建立 PR → develop                   │
            │  Trello: In Progress → In Review     │
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
 │  從 main 切出 hotfix/abc123-fix-xxx                                │
 └────────────────────────────┬────────────────────────────────────────┘
                              │
                              ▼
            ┌─────────────────────────────────────┐
            │  修復 & 提交                         │
            │  git commit -m "fix(abc123): ..."    │
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
            │  ├→ 自動建立 PR 同步回 develop        │
            │  └→ Trello 卡片 → Done               │
            └─────────────────────────────────────┘

 時間軸：
 main    ──●──────────────────●── merge ──●── tag v1.1.1
           │                  ▲
           └── hotfix/abc123 ─┘
                                     │
 develop ─────────────────────────── ● ← 自動同步 PR
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
 │  1. 建立 PR: release/v1.2.0 → main                                │
 │  2. merge 後打 Git tag v1.2.0                                      │
 │  3. 自動建立 PR: main → develop（同步 release 期間的 fix）          │
 │  4. 刪除 release/v1.2.0 分支                                       │
 │  5. Trello 所有相關卡片 → Done                                     │
 └─────────────────────────────────────────────────────────────────────┘

 時間軸：
 main    ─────────────────────────────────── ● merge ── tag v1.2.0
                                             ▲
 release ─────── fix ── fix ─────────────────┘
          ▲                                        │
 develop ─┴── feat D ── feat E ─────────────────── ● ← 同步 PR
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
| `devflow pr` | 卡片 → **In Review** |
| PR approved | 卡片加上 approved 標籤 |
| PR changes requested | 卡片 → **In Progress** |
| PR merged | 卡片 → **Done** |

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

## 文件

- [操作手冊](docs/guide/wt-cli.md)
- [開發流程規範](docs/guide/workflow.md)
- [/scaffold 指令說明](.claude/commands/scaffold.md)
