# devflow-cli

Team dev workflow CLI — Trello + Git + GitHub + Scaffold 自動化串接。

適用於任何專案，不綁定特定 repo。搭配 Claude Code `/scaffold` 指令可一鍵建置完整全端專案。

## 安裝

```bash
git clone git@github.com:zxc38380166/devflow-cli.git
cd devflow-cli
yarn install
yarn link
```

安裝完成後，任何目錄都可使用 `devflow` 指令。

## 指令總覽

```
devflow setup                 一鍵建置新專案（產生 scaffold.config.json）
devflow init                  初始化開發流程（Trello + Board + Repos）
devflow link                  將目前 repo 連結到專案
devflow export                匯出專案設定（不含憑證）
devflow import <file>         匯入專案設定檔
devflow use <project>         切換專案
devflow task                  建立 Trello 卡片 + Git 分支
devflow pr                    建立 PR + 同步 Trello
devflow release:create <ver>  建立 release 分支
devflow release:finish <ver>  完成 release（tag + 同步）
```

## 一鍵開箱（搭配 /scaffold）

```bash
# 1. 在新專案目錄執行
devflow setup              # 互動式收集參數 → 產生 scaffold.config.json

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

## 組員加入

```bash
devflow import devflow-xxx.json    # 匯入管理員提供的設定檔
```

## 文件

- [操作手冊](docs/guide/wt-cli.md)
- [開發流程規範](docs/guide/workflow.md)
- [/scaffold 指令說明](.claude/commands/scaffold.md)
