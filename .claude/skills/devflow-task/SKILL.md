---
name: devflow-task
description: 讀取 devflow-tasks.json 自動建立 Trello 卡片 + Git 分支。當使用者說「devflow task」、「建卡片」、「建 task」時觸發。
disable-model-invocation: true
---

## 流程

1. 讀取工作目錄下的 `devflow-tasks.json`
2. 確認 devflow active project 是否正確（讀取 `~/.devflow/config.json` 的 `activeProject`），若不對先執行 `devflow use <project>`
3. 執行 `node ${CLAUDE_SKILL_DIR}/run.mjs` 完成以下動作：
   - 對每個 task 建立 Trello 卡片（卡片名稱自動加上 repo role 前綴如 `[backend]`）
   - 將卡片移到 In Progress
   - 若 `createBranch: true`，從 develop（hotfix 用 main）建立 Git 分支並推送
   - 分支名格式：`{taskType}/{trelloShortLink}-{簡短描述}`
   - 自動 stash/pop 未提交的修改
4. 完成後輸出每個 repo 的 Trello 連結和分支名

## devflow-tasks.json 格式

```json
[
  {
    "repo": "子專案目錄名稱",
    "taskType": "feature | chore | hotfix",
    "title": "卡片標題",
    "description": "PM 易讀的描述",
    "labels": ["frontend | backend | urgent"],
    "members": ["成員 key"],
    "dueDate": "YYYY-MM-DD 或空字串",
    "createBranch": true
  }
]
```

## 注意事項

- 如果 `devflow-tasks.json` 不存在或為空，先詢問使用者要建什麼任務，幫他生成 JSON 後再執行
- 描述要寫給 PM 看的，不要寫程式碼細節
- 分支名保持簡短（slug 最多 15 字元）
- labels 和 members 的可選值來自 `~/.devflow/projects/<activeProject>/config.json`
- 執行前先向使用者確認 JSON 內容
