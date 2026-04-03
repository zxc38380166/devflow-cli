---
name: devflow
description: 讀取 devflow.jsonc 自動執行 devflow 操作（建卡片、建 release、建 PR 等）。當使用者說「devflow」、「devflow task」、「devflow release」、「devflow pr」、「建卡片」、「建 task」時觸發。
disable-model-invocation: true
---

## 流程

1. 讀取工作目錄下的 `devflow.jsonc`
2. 確認 devflow active project 是否正確（讀取 `~/.devflow/config.json` 的 `activeProject`），若不對先執行 `devflow use <project>`
3. 執行 `node ${CLAUDE_SKILL_DIR}/run.mjs` 完成以下動作：
   - 根據每筆資料的 `action` 欄位決定操作類型
   - 支援 `task`、`release:create`、`release:finish`、`pr` 四種操作
4. 完成後輸出每個操作的結果

## devflow.jsonc 格式

JSON 為陣列，每筆資料的 `action` 欄位決定操作類型：

### action: task（建立 Trello 卡片 + Git 分支）

```json
{
  "action": "task",
  "repo": "子專案目錄名稱",
  "taskType": "feature | chore | hotfix",
  "title": "卡片標題",
  "description": "PM 易讀的描述",
  "labels": ["frontend | backend | urgent"],
  "members": ["成員 key"],
  "dueDate": "YYYY-MM-DD 或空字串",
  "createBranch": true
}
```

### action: release:create（建立 release 分支）

```json
{
  "action": "release:create",
  "repo": "子專案目錄名稱",
  "version": "1.0.9"
}
```

### action: release:finish（完成 release：PR → main、打 tag、同步 develop）

```json
{
  "action": "release:finish",
  "repo": "子專案目錄名稱",
  "version": "1.0.9"
}
```

### action: pr（建立 Pull Request + 同步 Trello）

```json
{
  "action": "pr",
  "repo": "子專案目錄名稱"
}
```

### 混合使用範例

```json
[
  { "action": "task", "repo": "WT-be", "taskType": "feature", "title": "新增 API", "description": "...", "labels": ["backend"], "members": ["user1"], "createBranch": true },
  { "action": "release:create", "repo": "WT-be", "version": "1.0.9" },
  { "action": "release:create", "repo": "WT-ec", "version": "1.0.9" }
]
```

## 注意事項

- 如果 `devflow.jsonc` 不存在或為空，先詢問使用者要做什麼操作，幫他生成 JSON 後再執行
- 描述要寫給 PM 看的，不要寫程式碼細節
- 分支名保持簡短（slug 最多 15 字元）
- labels 和 members 的可選值來自 `~/.devflow/projects/<activeProject>/config.json`
- 執行前先向使用者確認 JSON 內容
