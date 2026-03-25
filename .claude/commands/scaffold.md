# Scaffold Full-Stack Workspace

Build a complete monorepo workspace from scratch with 3 sub-projects: EC (Nuxt 4), IMS (Next.js 16), BE (NestJS 11).
Optionally integrates with `devflow` CLI to set up Trello board, branching strategy, and team workflow.

## Config File Mode (Recommended)

If a `scaffold.config.json` exists in the current directory, **read all parameters from it and skip interactive collection**. Validate required fields before proceeding.

### Config File Schema

```json
{
  "project": {
    "name": "myshop",
    "description": "My E-Commerce Platform"
  },
  "github": {
    "username": "myuser"
  },
  "database": {
    "mysql": "mysqlsh --sql --host=127.0.0.1 --port=3306 --user=root --password=secret --schema=myshop",
    "redis": "redis-cli -h 127.0.0.1 -p 6379 -a secret"
  },
  "cloudflare": {
    "apiToken": "cf-api-token",
    "accountId": "cf-account-id"
  },
  "domains": {
    "ec": "myshop.com",
    "ims": "admin.myshop.com",
    "be": "api.myshop.com"
  },
  "devflow": {
    "enabled": true,
    "trello": {
      "apiKey": "trello-api-key",
      "token": "trello-token",
      "boardName": "MYSHOP"
    }
  }
}
```

### Required Fields Validation

Before proceeding, validate:

| Field | Required | Fallback |
|-------|----------|----------|
| `project.name` | **YES** | — (abort if missing) |
| `project.description` | no | `"${name} Platform"` |
| `github.username` | no | auto-detect via `gh api user -q .login` |
| `database.mysql` | **YES** | — (abort if missing) |
| `database.redis` | **YES** | — (abort if missing) |
| `cloudflare.apiToken` | no | skip Cloudflare phases |
| `cloudflare.accountId` | no | skip Cloudflare phases |
| `domains.ec` | no | `"${name}.com"` |
| `domains.ims` | no | `"admin.${name}.com"` |
| `domains.be` | no | `"api.${name}.com"` |
| `devflow.enabled` | no | `false` (skip devflow setup) |
| `devflow.trello.apiKey` | if devflow enabled | — (abort if missing) |
| `devflow.trello.token` | if devflow enabled | — (abort if missing) |

If validation fails, display which fields are missing and abort with a clear error message:

```
## scaffold.config.json 驗證失敗

缺少必填欄位:
- project.name
- database.mysql

請補齊後重新執行 /scaffold
```

### Config File Loading Order

1. Check if `scaffold.config.json` exists in current directory
2. If found → validate → use values (no interactive prompts)
3. If NOT found → fall back to interactive mode (see below)

Parse mysql connection string to extract: DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE
Parse redis connection string to extract: REDIS_HOST, REDIS_PORT, REDIS_PASSWORD

## Interactive Mode (Fallback)

If `$ARGUMENTS` contains inline arguments (e.g. `--name xxx --github yyy ...`), parse them directly and skip the interactive collection below. Otherwise, collect parameters interactively using AskUserQuestion in **5 rounds**, showing a checklist status each round.

### Checklist Format

Before each round, display the current collection status:

```
## Scaffold 設定進度

### 1. 基本資訊
- [x] 專案名稱: myshop        ← (filled example)
- [x] 專案描述: My Shop        ← (filled example)
- [ ] GitHub 帳號              ← (not yet collected)

### 2. 資料庫連線
- [ ] MySQL 連線
- [ ] Redis 連線

### 3. Cloudflare 設定
- [ ] API Token
- [ ] Account ID

### 4. 網域設定
- [ ] 前台 EC 網域
- [ ] 後台 IMS 網域
- [ ] API BE 網域

### 5. 開發流程（devflow）
- [ ] 是否啟用 devflow
```

### Round 1 — 基本資訊

Use AskUserQuestion to ask:
1. **專案名稱** — question: "專案名稱是什麼？（將用於所有 repo 與目錄的前綴，例如 `myshop` → `myshop-ec`, `myshop-ims`, `myshop-be`）", header: "Name", options: free text (provide 2 example options like "myshop", "myproject" so user can type their own via Other)
2. **專案描述** — question: "專案描述？", header: "Desc", options: provide 2 examples, user types via Other
3. **GitHub 帳號** — question: "GitHub 帳號名稱？（用於建立 private repos）", header: "GitHub", options: try to auto-detect with `gh api user -q .login` first. If found, offer detected username as first option + "Other".

After Round 1, update and display the checklist with filled values.

### Round 2 — 資料庫連線

Use AskUserQuestion to ask:
1. **MySQL 連線** — question: "請提供 MySQL 連線字串（格式: `mysqlsh --sql --host=<host> --port=<port> --user=<user> --password=<password> --schema=<schema>`）", header: "MySQL", options: provide a localhost example + a common remote example
2. **Redis 連線** — question: "請提供 Redis 連線字串（格式: `redis-cli -h <host> -p <port> -a <password>`）", header: "Redis", options: provide a localhost example + a common remote example

Parse mysql connection string to extract: DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE
Parse redis connection string to extract: REDIS_HOST, REDIS_PORT, REDIS_PASSWORD

After Round 2, update and display the checklist.

### Round 3 — Cloudflare 設定

Use AskUserQuestion to ask:
1. **Cloudflare API Token** — question: "Cloudflare API Token？（用於 DNS 設定與 Pages 部署，留空跳過）", header: "CF Token", options: provide placeholder examples, user types via Other
2. **Cloudflare Account ID** — question: "Cloudflare Account ID？", header: "CF Account", options: provide placeholder examples, user types via Other

After Round 3, update and display the checklist.

### Round 4 — 網域設定

Use AskUserQuestion to ask:
1. **前台 EC 網域** — question: "前台 (EC) 網域？", header: "EC Domain", options: use `<name>.com` as suggestion + another example
2. **後台 IMS 網域** — question: "後台管理 (IMS) 網域？", header: "IMS Domain", options: use `admin.<name>.com` as suggestion
3. **API BE 網域** — question: "API (BE) 網域？", header: "BE Domain", options: use `api.<name>.com` as suggestion

After Round 4, update and display the checklist.

### Round 5 — 開發流程（devflow）

Use AskUserQuestion to ask:
1. **啟用 devflow** — question: "是否建置 devflow 開發流程？（包含 Trello Board 自動建立、分支策略、PR 流程）", header: "Devflow", options: "是，一起建置", "否，之後再設定"

If yes:
2. **Trello API Key** — question: "Trello API Key？", header: "Trello Key"
3. **Trello Token** — question: "Trello Token？", header: "Trello Token"
4. **Board 名稱** — question: "Trello Board 名稱？", header: "Board Name", options: use `<NAME>` (uppercase project name) as default

After Round 5, display the **final checklist with all values filled**, and ask user to confirm before proceeding:

```
## Scaffold 設定完成 ✓

### 1. 基本資訊
- [x] 專案名稱: myshop
- [x] 專案描述: My E-Commerce
- [x] GitHub 帳號: myuser

### 2. 資料庫連線
- [x] MySQL: 127.0.0.1:3306 (root@myshop)
- [x] Redis: 127.0.0.1:6379

### 3. Cloudflare 設定
- [x] API Token: ****abcd
- [x] Account ID: ****efgh

### 4. 網域設定
- [x] EC: myshop.com
- [x] IMS: admin.myshop.com
- [x] BE: api.myshop.com

### 5. 開發流程
- [x] Devflow: 啟用
- [x] Trello Board: MYSHOP

即將開始建立專案，確認以上資訊正確嗎？
```

Use AskUserQuestion with options "確認開始" and "修改設定" for final confirmation. If user chooses to modify, ask which round to redo.

Use the project name as prefix for sub-project directories (e.g. `<name>-ec`, `<name>-ims`, `<name>-be`)

## Step-by-Step Execution

### Phase 1: GitHub Repos & Workspace

1. Create 4 GitHub repos (private) using `gh`:
   - `<github-user>/<name>-ec`
   - `<github-user>/<name>-ims`
   - `<github-user>/<name>-be`
   - `<github-user>/<name>-platform` (workspace root)

2. Initialize workspace root:
   - `git init` in current directory
   - Add remote origin to `<name>-platform`
   - Create `.gitignore` with: `node_modules/`, `.DS_Store`, `*.log`, `.env`

3. Clone 3 sub-repos as submodules:
   ```bash
   git submodule add git@github.com:<github-user>/<name>-ec.git <name>-ec
   git submodule add git@github.com:<github-user>/<name>-ims.git <name>-ims
   git submodule add git@github.com:<github-user>/<name>-be.git <name>-be
   ```

4. Create workspace `package.json`:
   ```json
   {
     "name": "<name>-platform",
     "version": "1.0.0",
     "private": true,
     "description": "<name> Platform",
     "scripts": {
       "dev": "concurrently -n ec,ims,be,info -c blue,green,yellow,cyan \"cd <name>-ec && yarn dev\" \"cd <name>-ims && yarn dev\" \"cd <name>-be && yarn dev\" \"sleep 5 && echo '' && echo '  All services started:' && echo '  <name>-ec  -> http://localhost:3010' && echo '  <name>-ims -> http://localhost:3011' && echo '  <name>-be  -> http://localhost:8080' && echo ''\"",
       "dev:split": "bash scripts/dev-tmux.sh",
       "dev:ec": "cd <name>-ec && yarn dev",
       "dev:ims": "cd <name>-ims && yarn dev",
       "dev:be": "cd <name>-be && yarn dev",
       "commit": "bash scripts/commit-all.sh",
       "push:all": "bash scripts/push-only-all.sh",
       "push": "bash scripts/push-all.sh",
       "docs:gen": "node scripts/generate-docs.mjs",
       "docs:sync": "node scripts/sync-docs.mjs",
       "docs:dev": "node scripts/sync-docs.mjs && vitepress dev docs",
       "docs:build": "node scripts/sync-docs.mjs && vitepress build docs",
       "docs:preview": "vitepress preview docs",
       "docs:deploy": "bash scripts/deploy-docs.sh"
     },
     "devDependencies": {
       "concurrently": "^9.1.2",
       "vitepress": "^1.6.4"
     }
   }
   ```
   Run `yarn install` in workspace root.

### Phase 2: Backend (NestJS 11)

Create the NestJS project in `<name>-be/`:

1. **Initialize NestJS project** with `npx @nestjs/cli new <name>-be --skip-git --package-manager yarn`

2. **Install dependencies**:
   ```bash
   # Core
   yarn add @nestjs/config @nestjs/typeorm typeorm mysql2 @nestjs/jwt @nestjs/passport passport passport-jwt @nestjs/swagger @nestjs/schedule @nestjs/cache-manager cache-manager cache-manager-redis-yet @keyv/redis
   # Utilities
   yarn add nestjs-i18n axios bcryptjs class-validator class-transformer compression cookie-parser moment-timezone nanoid@3 sharp zod decimal.js request-ip
   # AWS
   yarn add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
   # Dev
   yarn add -D @types/passport-jwt @types/bcryptjs @types/compression @types/cookie-parser @types/request-ip @types/multer
   ```

3. **Create files** (use the exact patterns from the reference project):

   **`src/main.ts`** — Bootstrap with:
   - CORS for localhost:3010, localhost:3011
   - Global TransformInterceptor + AllExceptionsFilter
   - ValidationPipe (whitelist, forbidNonWhitelisted, transform)
   - cookie-parser + compression middleware
   - Swagger at `/api`
   - Port from env or 8080

   **`src/app.module.ts`** — Root module with:
   - ConfigModule.forRoot (global, .env.local + .env)
   - I18nModule.forRoot (fallback zh-TW, AcceptLanguageResolver, path: `path.join(__dirname, '..', 'src', 'i18n/')`)
   - TypeOrmModule.forRootAsync (MySQL from env, synchronize: true for dev)
   - CacheModule.registerAsync (Redis from env, TTL 60s)
   - ScheduleModule.forRoot()
   - RouterModule.register for ec/ and ims/ route prefixes
   - Import HealthModule, CommonModule, EcModule, ImsModule

   **`src/common/interceptors/transform.interceptor.ts`** — Wraps responses in `{ code, message: 'ok', result, timestamp, path }`

   **`src/common/filters/http-exception.filter.ts`** — Catches all exceptions, returns `{ code, message, result: null, timestamp, path }`

   **`src/common/guards/jwt-auth.guard.ts`** — JWT auth guard

   **`src/common/decorators/current-user.decorator.ts`** — Extract user from request

   **`src/common/pipes/parse-id.pipe.ts`** — Parse and validate integer IDs

   **`src/common/common.module.ts`** — Global module

   **`src/health/health.controller.ts`** — GET /health/ec and GET /health/ims

   **`src/health/health.service.ts`** — Comprehensive package check (23+ packages) with Redis set/get/del test, returns checklist with summary

   **`src/health/health.module.ts`**

   **`src/ec/ec.controller.ts`** — GET /hello with i18n
   **`src/ec/ec.service.ts`** — i18n greeting
   **`src/ec/ec.module.ts`**

   **`src/ims/ims.controller.ts`** — GET /hello with i18n
   **`src/ims/ims.service.ts`** — i18n greeting
   **`src/ims/ims.module.ts`**

   **`src/i18n/zh-TW/common.json`** — Chinese translations (hello, welcome, success, not_found, unauthorized, forbidden, bad_request, internal_error, validation_error, ec_greeting, ims_greeting)

   **`src/i18n/en-US/common.json`** — English translations

   **`.env`** — With parsed MySQL/Redis credentials + JWT_SECRET + PORT=8080

   **`.env.example`** — Template without real values

   **`tsconfig.json`** — ES2022, commonjs, decorator metadata, paths @/* -> ./src/*

   **`nest-cli.json`** — With asset copy for i18n files

   **`eslint.config.mjs`** — Flat config with TypeScript + Prettier

   **`Dockerfile`** — Multi-stage build for Zeabur deployment:
   ```dockerfile
   FROM node:22-alpine AS builder
   WORKDIR /app
   COPY package.json yarn.lock ./
   RUN yarn install --frozen-lockfile
   COPY . .
   RUN yarn build

   FROM node:22-alpine
   WORKDIR /app
   COPY --from=builder /app/dist ./dist
   COPY --from=builder /app/node_modules ./node_modules
   COPY --from=builder /app/package.json ./
   EXPOSE 8080
   CMD ["node", "dist/main.js"]
   ```

   **`.dockerignore`**:
   ```
   node_modules
   dist
   .git
   .env.local
   *.log
   ```

   **`zeabur.json`**:
   ```json
   { "build_type": "dockerfile" }
   ```

4. Run `yarn install` in BE directory

### Phase 3: Frontend EC (Nuxt 4)

Create the Nuxt 4 project in `<name>-ec/`:

1. **Initialize**: `npx nuxi@latest init <name>-ec`

2. **Install dependencies**:
   ```bash
   yarn add @nuxt/ui @nuxt/eslint @nuxt/image @nuxtjs/i18n @pinia/nuxt pinia @vueuse/core @vueuse/nuxt @unhead/vue @vee-validate/nuxt @vee-validate/zod moment-timezone zod vue-router
   yarn add -D @iconify-json/lucide @playwright/test @vue/test-utils vitest sass happy-dom playwright-core
   ```

3. **Create files**:

   **`nuxt.config.ts`** — With modules (ui, eslint, image, i18n, pinia, vueuse, @vee-validate/nuxt), runtimeConfig for apiBaseUrl, i18n config (zh-TW default, en-US), devServer port 3010

   **`app/app.vue`** — NuxtLayout + NuxtPage

   **`app/composables/useApi.ts`** — `$api<T>()` (imperative $fetch) and `useApi<T>()` (reactive useAsyncData, server: false), auto Accept-Language from i18n locale, smart payload routing

   **`app/api/index.ts`** — Centralized API registry with health.check(), ec.hello()

   **`app/pages/index.vue`** — Simple home page with logo, i18n language switcher, and link to /health

   **`app/pages/health.vue`** — Full package verification dashboard with:
   - i18n language switcher
   - VueUse live data (mouse, window size, localStorage)
   - Pinia counter store
   - NuxtImg
   - Zod validation demo
   - moment-timezone
   - 14-item package checklist table
   - Backend health check display

   **`app/stores/counter.ts`** — Pinia counter with increment/decrement/reset/doubleCount

   **`app/assets/css/main.css`** — Tailwind + Nuxt UI imports

   **`i18n/locales/zh-TW.json`** — Full Chinese translations for dashboard
   **`i18n/locales/en-US.json`** — Full English translations

   **`eslint.config.mjs`** — Nuxt ESLint wrapper

   **`Dockerfile`** — Multi-stage build for Zeabur deployment:
   ```dockerfile
   FROM node:22-alpine AS builder
   WORKDIR /app
   COPY package.json yarn.lock ./
   RUN yarn install --frozen-lockfile
   COPY . .
   RUN yarn build

   FROM node:22-alpine
   WORKDIR /app
   COPY --from=builder /app/.output ./.output
   EXPOSE 3000
   CMD ["node", ".output/server/index.mjs"]
   ```

   **`.dockerignore`**:
   ```
   node_modules
   .output
   .nuxt
   .git
   *.log
   ```

   **`zeabur.json`**:
   ```json
   { "build_type": "dockerfile" }
   ```

### Phase 4: Frontend IMS (Next.js 16)

Create the Next.js project in `<name>-ims/`:

1. **Initialize**: `npx create-next-app@latest <name>-ims --typescript --tailwind --eslint --app --turbopack --no-import-alias`

2. **Install dependencies**:
   ```bash
   yarn add @tanstack/react-query @tanstack/react-table zustand axios next-intl next-themes next-auth@beta react-hook-form @hookform/resolvers zod moment-timezone sonner recharts react-use lucide-react radix-ui class-variance-authority clsx tailwind-merge
   yarn add -D shadcn @tailwindcss/postcss tw-animate-css prettier prettier-plugin-tailwindcss
   ```

3. **Initialize shadcn**: `npx shadcn@latest init -y`

4. **Create files**:

   **`next.config.ts`** — With next-intl plugin from `./src/i18n/request.ts`

   **`src/app/layout.tsx`** — Root layout with NextIntlClientProvider, getLocale/getMessages from next-intl/server

   **`src/app/providers.tsx`** — QueryClientProvider + ThemeProvider + Toaster (sonner)

   **`src/app/page.tsx`** — Simple home page with logo, i18n language switcher, theme toggle, and link to /health

   **`src/app/health/page.tsx`** — Full package verification dashboard with:
   - 18+ package verification checklist
   - TanStack Table for checklist
   - Recharts bar chart
   - Zustand counter
   - React Hook Form + Zod validation
   - next-themes toggle
   - moment-timezone
   - Backend health check
   - i18n language switcher

   **`src/lib/api-client.ts`** — Axios instance with Accept-Language from NEXT_LOCALE cookie, response interceptor

   **`src/lib/utils.ts`** — cn() utility (clsx + tailwind-merge)

   **`src/hooks/useApi.ts`** — useApiQuery (React Query GET wrapper) + useApiMutation

   **`src/api/index.ts`** — API registry with queryKeys factory

   **`src/stores/counter.ts`** — Zustand counter store

   **`src/i18n/config.ts`** — Locales config
   **`src/i18n/request.ts`** — next-intl getRequestConfig from cookie
   **`src/i18n/messages/zh-TW.json`** — Chinese translations
   **`src/i18n/messages/en-US.json`** — English translations

   **`components.json`** — shadcn config (new-york style, rsc, lucide icons)

   **`eslint.config.mjs`** — Next.js ESLint flat config

   **Dev script in package.json**: `"dev": "next dev --turbopack -p 3011"`

   **`next.config.ts`** — Add `output: 'standalone'` for Docker deployment:
   ```ts
   const nextConfig = {
     output: 'standalone',
     // ... other config
   };
   ```

   **`Dockerfile`** — Multi-stage build for Zeabur deployment (standalone mode):
   ```dockerfile
   FROM node:22-alpine AS builder
   WORKDIR /app
   COPY package.json yarn.lock ./
   RUN yarn install --frozen-lockfile
   COPY . .
   RUN yarn build

   FROM node:22-alpine
   WORKDIR /app
   COPY --from=builder /app/.next/standalone ./
   COPY --from=builder /app/.next/static ./.next/static
   COPY --from=builder /app/public ./public
   EXPOSE 3000
   CMD ["node", "server.js"]
   ```

   **`.dockerignore`**:
   ```
   node_modules
   .next
   .git
   *.log
   ```

   **`zeabur.json`**:
   ```json
   { "build_type": "dockerfile" }
   ```

### Phase 5: Workspace Scripts

Create all scripts in `scripts/`:

1. **`commit-all.sh`** — Interactive commit wizard with type selection (feat/fix/refactor/style/perf/docs/test/chore), scope, message. Applies same commit to all repos with changes.

2. **`push-all.sh`** — Git add + git-cz commit + push for all repos. Auto-creates GitHub repo if push fails. Auto-deploys docs after push.

3. **`push-only-all.sh`** — Push only (no commit) for all repos. Auto-deploys docs after push.

4. **`setup.sh`** — First-time setup: init submodules, yarn install in all 4 directories.

5. **`dev-tmux.sh`** — tmux 3-pane dev environment.

6. **`generate-docs.mjs`** — Auto-generate README.md & CLAUDE.md for workspace + all sub-projects from centralized config. Reads package.json scripts tables.

7. **`sync-docs.mjs`** — Copy README.md/CLAUDE.md from each project to VitePress docs dir with frontmatter. Rewrite relative links.

8. **`deploy-docs.sh`** — Build VitePress + deploy to Cloudflare Pages via wrangler.

All push scripts must include `CLOUDFLARE_ACCOUNT_ID=<cf-account>` and `--project-name=<name>-docs`.
Replace `zxc38380166` with the provided GitHub username in all scripts.

### Phase 6: VSCode Config

**`.vscode/settings.json`**:
```json
{
  "git.repositoryScanMaxDepth": 2,
  "git.autoRepositoryDetection": "subFolders",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": { "source.fixAll.eslint": "explicit" },
  "eslint.format.enable": true,
  "eslint.workingDirectories": [
    { "directory": "<name>-ec", "changeProcessCWD": true },
    { "directory": "<name>-ims", "changeProcessCWD": true },
    { "directory": "<name>-be", "changeProcessCWD": true }
  ],
  "eslint.useFlatConfig": true,
  "typescript.tsdk": "<name>-be/node_modules/typescript/lib"
}
```

**`.vscode/extensions.json`**: Recommend eslint, prettier, volar

### Phase 7: VitePress Documentation

1. Create `docs/.vitepress/config.mts` with sidebar, nav, search, dark mode. Domain links to provided domains.

2. Create `docs/index.md` home page with hero + feature cards for 3 projects.

3. Run `yarn docs:gen` to generate all README.md and CLAUDE.md.

4. Run `yarn docs:sync` to sync to VitePress.

### Phase 8: Cloudflare DNS + Pages

**Skip this phase entirely if `cloudflare.apiToken` or `cloudflare.accountId` is not provided.**

1. Create Cloudflare Pages project:
   ```bash
   CLOUDFLARE_ACCOUNT_ID=<cf-account> npx wrangler pages project create <name>-docs --production-branch main
   ```

2. Build and deploy docs:
   ```bash
   yarn docs:deploy
   ```

3. Create DNS records via Cloudflare API (using provided token):
   - First get zone IDs for each domain
   - A record: `<domain-ec>` @ -> server IP (proxied)
   - A record: `<domain-ims>` @ -> server IP (proxied)
   - A record: `<domain-be>` @ -> server IP (proxied)
   - CNAME record: `docs.<domain-ec>` -> `<name>-docs.pages.dev` (proxied)

### Phase 9: Initial Commit & Push

1. Run `yarn install` in all sub-projects
2. Commit all sub-projects with message "chore: init project scaffold"
3. Push all sub-projects
4. Commit workspace with message "chore: init workspace"
5. Push workspace
6. Deploy docs (if Cloudflare configured)

### Phase 10: Devflow Integration

**Skip this phase if `devflow.enabled` is not `true`.**

This phase sets up the complete team development workflow (Trello board, branching strategy, PR flow).

1. **Install devflow CLI** (if not already installed):
   ```bash
   # Check if devflow is available
   if ! command -v devflow &> /dev/null; then
     git clone https://github.com/zxc38380166/devflow-cli.git ~/.devflow-cli
     cd ~/.devflow-cli && yarn install && yarn link
     cd -
   fi
   ```
   devflow-cli is a standalone tool installed globally at `~/.devflow-cli`, NOT inside the project being scaffolded.

2. **Create Trello Board** via API:
   - Board name from `devflow.trello.boardName` (default: uppercase `<name>`)
   - Auto-create 5 Lists: Backlog, To Do, In Progress, In Review, Done
   - Auto-create 3 Labels: frontend (blue), backend (yellow), urgent (red)
   - Fetch board members

3. **Save devflow config**:
   - Global config (`~/.devflow/config.json`): Trello credentials + active project
   - Project config (`~/.devflow/projects/<name>/config.json`): repos, board, lists, labels, members

   Repos config:
   ```json
   {
     "ec": { "name": "<name>-ec", "role": "frontend" },
     "ims": { "name": "<name>-ims", "role": "admin" },
     "be": { "name": "<name>-be", "role": "backend" }
   }
   ```

4. **Create `.devflow.json` in each repo**:

   In `<name>-ec/`:
   ```json
   { "project": "<name>", "repoRole": "frontend" }
   ```
   In `<name>-ims/`:
   ```json
   { "project": "<name>", "repoRole": "admin" }
   ```
   In `<name>-be/`:
   ```json
   { "project": "<name>", "repoRole": "backend" }
   ```

5. **Create `develop` branch** in each sub-repo:
   ```bash
   cd <name>-ec && git checkout -b develop && git push -u origin develop && cd ..
   cd <name>-ims && git checkout -b develop && git push -u origin develop && cd ..
   cd <name>-be && git checkout -b develop && git push -u origin develop && cd ..
   ```

6. **Export devflow config** for team members:
   ```bash
   devflow export
   ```
   This creates `devflow-<name>.json` in workspace root for team onboarding.

7. **Display onboarding instructions**:
   ```
   ## Devflow 開發流程已建置完成

   Trello Board: <board-url>
   Config export: devflow-<name>.json

   ### 組員加入方式
   1. 安裝 devflow CLI
   2. devflow import devflow-<name>.json
   3. 輸入個人 Trello 憑證
   4. 開始使用 devflow task / devflow pr
   ```

### Phase 11: Verification

1. Start all 3 projects with `yarn dev`
2. Wait for all ports (3010, 3011, 8080) to be listening
3. Verify health endpoints:
   - `curl http://localhost:8080/health/ec`
   - `curl http://localhost:8080/health/ims`
4. If devflow enabled, verify `devflow --version` works
5. Report results

## Key Conventions

- API response format: `{ code: number, message: string, result: T, timestamp: number, path: string }`
- i18n: default `zh-TW`, secondary `en-US`
- EC API: `$api` / `useApi` composables with `$fetch`, auto Accept-Language
- EC forms: `@vee-validate/nuxt` + `@vee-validate/zod` (useForm, useField, toTypedSchema)
- IMS API: `request` / `useApiQuery` / `useApiMutation` with axios + react-query, auto Accept-Language from NEXT_LOCALE cookie
- IMS forms: `react-hook-form` + `@hookform/resolvers/zod`
- BE modules: `ec/` (frontend APIs), `ims/` (admin APIs), `common/` (shared), `health/` (health checks)
- Smart payload routing: GET/DELETE -> query params, POST/PUT/PATCH -> request body
- Use latest stable versions of all packages
