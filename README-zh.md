# Agents Dashboard（智能体任务监控面板）

一个安全的 Web 应用，用于**集中监控分布在不同服务器、不同目录下的 AI 自动化任务进度**。
各台远程主机上的大模型编程任务（运行在不同主机、不同项目目录）只需向本机的中心化接入
接口上报执行情况与运行状态；面板将每次上报持久化到 SQLite，并提供完整的增删改查、筛选、
按任务的事件时间线以及近实时的轮询刷新。

## 架构（服务端固定在本机，远程只装客户端）

```
远程 AI 任务（主机 A，/path/to/projX）                     运维人员浏览器
        │  POST /api/v1/reports                                 │（登录会话）
        │  Authorization: Bearer <api-key>                      │
        ▼                                                       ▼
   [接入 API] ──校验(Zod)──► [SQLite] ◄──增删改查──── [面板 UI]
   限流 + 校验哈希密钥         tasks                  列表/筛选/详情
                              task_events             实时轮询
```

- **服务端（只部署在本机一次）**：Next.js 16（App Router、React 19、TypeScript）+
  SQLite（Drizzle ORM + better-sqlite3）。它同时承载接入 API 和面板 UI。
- **客户端（每台远程服务器）**：只需要 `curl` 和一个脚本 `report.sh`，**无需安装 Node、
  数据库或任何运行时依赖**。
- **任务唯一标识** = `(hostname, project_path, task_key)`。每次上报都会 upsert（更新或插入）
  任务主记录，并向 `task_events` 追加一条不可变的历史记录（即时间线）。

## 这套"服务端固定、客户端轻量"的方案可行吗？

**完全可行，而且本项目正是这样设计的。** 分工如下：

| | 服务端（本机，仅一处） | 客户端（每台远程主机） |
|---|---|---|
| 需要安装 | Node.js 20+、本项目、Caddy（TLS） | 仅 `curl`（绝大多数 Linux/macOS 自带） |
| 保存数据 | 是（SQLite 文件） | 否 |
| 对外暴露 | 经 Caddy 的 HTTPS 域名 | 无（只是发起出站请求） |
| 认证方式 | 浏览器登录会话 | Bearer API 密钥 |

远程主机要接入，只需三样东西：**面板地址**、**一个 API 密钥**、**`report.sh` 脚本**。

## 环境要求

- Node.js 20+（已在 24 上测试）
- pnpm（通过 `corepack enable` 启用）

## 快速开始（开发环境）

```sh
pnpm install
cp .env.example .env            # 然后编辑 —— 务必设置真实的 BETTER_AUTH_SECRET

pnpm db:generate                # 首次：从 schema 生成 SQL 迁移文件
pnpm db:migrate                 # 将迁移应用到 SQLite 文件
pnpm db:seed                    # 用 SEED_ADMIN_* 环境变量创建初始管理员账号

pnpm dev                        # http://localhost:3000
```

在 `/login` 用种子管理员账号登录，在 **Dashboard → API Keys** 创建一个 API 密钥，
然后即可从远程主机上报（见下文）。

## 环境变量

| 变量 | 是否必需 | 说明 |
|---|---|---|
| `DATABASE_URL` | 生产必需 | SQLite 文件路径（如 `./data/app.db`）。 |
| `BETTER_AUTH_SECRET` | 必需 | 32+ 位会话签名密钥。`openssl rand -base64 32`。 |
| `BETTER_AUTH_URL` | 必需 | 面板对外提供服务的公开地址。 |
| `INGEST_MAX_BODY_BYTES` | 可选 | 接入请求体最大字节数（默认 16384）。 |
| `INGEST_RATE_LIMIT` | 可选 | 每个密钥每窗口的最大上报次数（默认 60）。 |
| `INGEST_RATE_WINDOW_MS` | 可选 | 限流窗口（毫秒，默认 60000）。 |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | 种子 | 初始管理员（密码至少 12 位）。 |

生产环境下若缺少 `DATABASE_URL` 或合法的 `BETTER_AUTH_SECRET`，应用会在启动时立即报错退出。

## 在远程主机上接入（客户端）

只需把 `reporter/report.sh` 拷到远程主机（或从面板下载），即可上报。它是纯
POSIX sh + curl，**零依赖**：

```sh
# 1. 拿到脚本（任选其一）
scp 本机:/path/to/AgentsDashboard/reporter/report.sh ./report.sh
# 或从面板直接下载（服务端已把脚本放到 public 下）：
curl -fsSL https://dash.example.com/report.sh -o report.sh && chmod +x report.sh

# 2. 上报一次
./report.sh \
  --url https://dash.example.com \
  --api-key "$API_KEY" \
  --task-key build-login \
  --title "实现登录流程" \
  --status running \
  --progress 60 \
  --summary "已加好鉴权路由，正在写测试"
```

所有参数也可用环境变量代替（`DASHBOARD_URL`、`API_KEY`、`TASK_KEY`、`TITLE`、
`STATUS`、`PROGRESS`、`SUMMARY`、`AGENT`）。`hostname` 与 `project_path` 默认取
本机主机名和当前目录（`pwd`）。

`status` 取值：`queued | running | paused | completed | failed`。一次运行中请复用同一个
`task_key`，这样多次上报会落到同一个任务上并构成它的时间线。

> 想让其他 AI 智能体（如 Claude Code）自动上报？见下文「给其他 Agent 用的 Skill」。

## 生产部署（服务端固定在本机）

应用设计为运行在**负责 TLS 终止的反向代理**之后：应用只监听本机回环地址，只有代理面向公网。

```sh
pnpm install --prod=false
pnpm db:migrate
pnpm db:seed
pnpm build
BETTER_AUTH_SECRET=... DATABASE_URL=./data/app.db \
  BETTER_AUTH_URL=https://dash.example.com pnpm start -H 127.0.0.1 -p 3000
```

然后用 Caddy 自动签发 HTTPS 证书 —— 见 [`Caddyfile.example`](Caddyfile.example)。
建议用进程管理器（systemd、PM2）托管 `pnpm start`，保证崩溃和开机后自动重启。
备份只需复制 SQLite 文件（连同 `-wal`/`-shm` 旁文件），或执行 `sqlite3 app.db ".backup"`。

### 安全要点

- 已禁用公开注册；账号通过 `pnpm db:seed` 下发。
- 安全响应头（CSP、HSTS、X-Frame-Options 等）在 `next.config.ts` 中设置。
- 接入接口按 API 密钥**在内存中限流** —— 对单机足够，但重启后状态会重置、且不跨实例共享。
  若要多实例部署，请把 `src/lib/http/rate-limit.ts` 换成 Redis 支撑（`checkRateLimit`
  的签名已为此预留）。
- 用 `-H 127.0.0.1` 让 `pnpm start` 只监听本机，务必经 Caddy 暴露，不要把它直接暴露到公网。

## 测试

```sh
pnpm test            # 单元 + 集成测试（Vitest）
pnpm test:coverage   # 带覆盖率阈值（行/函数 80%）
pnpm test:e2e        # Playwright 端到端（会构建并启动应用）
pnpm run typecheck   # tsc --noEmit
pnpm lint            # eslint
```

## 给其他 Agent 用的 Skill

本仓库在 `.claude/skills/agents-dashboard-reporter/` 下提供了一个 Claude Code Skill，
让其他 AI 智能体可以"开箱即用"地把自己的进度上报到本面板。把该目录拷到目标主机的
`~/.claude/skills/` 下，设置好 `DASHBOARD_URL` 与 `API_KEY` 环境变量即可。详见该目录内的
`SKILL.md`。

