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
