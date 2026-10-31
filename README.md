# VirtualCardX Worker (vcx-new)

virtualcardx.com 的 Cloudflare Workers 源码（Hono + D1 `vcx-db` + R2 `vcx-media`）。
全站 SSR，中英双语（中文 `/`，英文 `/en/`），内容驱动 SEO。

## 结构

| 文件 | 说明 |
|---|---|
| `index.js` | Worker 入口：路由、SSR、缓存、安全头、管理 API |
| `meta-desc.js` | 静态页 / 分类页的 meta description 文案 |
| `db/schema.sql` | 完整 D1 结构：表、索引、时间戳/分类/FTS 触发器 |
| `db/migrate.mjs` | 可重复执行的迁移入口（preflight → 补列 → schema → 回填） |
| `db/migrations/` | 查询索引与历史结构迁移 |
| `wrangler.toml` | D1/R2、Assets、Rate Limiting、observability |
| `public/app.js` | 移动菜单交互（外链脚本，CSP 不允许内联） |
| `public/fonts/` | 自托管 IBM Plex；文件名带内容哈希 |
| `public/brand/` | `og.png` / `og-en.png`、应用图标 |
| `tests/` | 真实 SQLite D1 回归测试（61 项，无网络依赖） |
| `deploy_vcx.sh` | 先跑测试，再调用固定版本的本地 wrangler 部署 |

## 开发

```bash
npm ci                 # 按 package-lock.json 安装
npm test               # 61 项回归（真实 SQLite + schema 一致性）
npm run dev            # 本地；需 CLOUDFLARE_API_TOKEN（R2 remote）
./deploy_vcx.sh        # 先测试，再部署；需 CLOUDFLARE_API_TOKEN
```

wrangler 精确锁定 `4.156.0`，部署脚本只使用 `node_modules/.bin/wrangler`。

### 本地跑真实数据

```bash
./node_modules/.bin/wrangler d1 export vcx-db --remote --output=.local-db/vcx-dump.sql
./node_modules/.bin/wrangler d1 execute vcx-db --local --file=.local-db/vcx-dump.sql
node db/migrate.mjs --local
npm run dev
```

`wrangler.toml` 中 R2 的 `remote = true` 只影响 `dev`，部署时忽略。
`wrangler dev --local` 会覆盖单项 remote 配置，导致图片全部 404。
本地 HTML 边缘缓存保存在 `.wrangler/state/v3/cache`，改模板后旧页面不刷新时可删除该目录（不要删 `v3/d1`）。

## D1 迁移

新环境直接执行 schema：

```bash
npx wrangler d1 execute vcx-db --remote --file db/schema.sql
```

已有库统一走：

```bash
node db/migrate.mjs --local
node db/migrate.mjs --remote
```

迁移会先检查 posts/pages/categories 的重复规范键，然后：
- 条件补 `sticky`、`date_ts`、`modified_ts`，重复执行不会因 duplicate column 中断；
- 执行幂等 schema；
- 回填可读日期时间戳、`post_categories` 与 FTS 索引；
- 删除被复合索引覆盖的旧单列索引。

`posts.date` / `modified` 保留原值，`date_ts` / `modified_ts` 由触发器维护并用于排序。
`post_categories`、`posts_fts` 同样由触发器同步，外部写入不会绕过。

## 请求处理顺序

1. `www.` → 裸域 301
2. 旧 WP `query-xxx` 参数 → 干净路径 301
3. `BLOG_MOVED` → 外部博客 301
4. 尾斜杠规范化（跳过 `/api/`、`/media/`、扩展名路径）
5. Rate Limiting（搜索与写 API）
6. Worker Edge Cache：仅缓存无 query / 无 cookie 的公开 GET HTML，最长 5 分钟
7. 安全响应头（CSP、nosniff、frame、Permissions-Policy）
8. 显式路由与 catch-all；未知日期型 URL 返回真 404

## 缓存契约

HTML 使用 `CDN-Cache-Control: max-age=300`。写 `/api/posts` 后，Worker 会清理当前 PoP 的：
- 中英文首页；
- 文章旧 URL / 新 URL；
- 对应规范文章页。

分页与分类的旧 HTML 最长 5 分钟后自然过期。**全边缘精准 purge 仍应由 Cloudflare Zone Cache Purge 或发布客户端完成**；仓库不保存 Zone purge 凭据。

## 管理 API

`/api/*` 使用 `Authorization: Bearer <API_TOKEN>`（secret `API_TOKEN`）。
除 `/api/health` 外，按 IP 限制 60 次/分钟（Cloudflare Rate Limiting binding）。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/health` | D1/R2 健康检查，匿名响应不泄露内部异常 |
| GET | `/api/posts` | `lang` / `status` / `q` / `limit(1-100)` / `offset>=0` |
| GET/POST/PUT/DELETE | `/api/posts[/:id]` | CRUD；path 冲突由数据库唯一约束兜底 |
| GET/POST | `/api/categories` | 分类；slug 唯一 |
| GET/POST | `/api/media` | PNG/JPEG/WebP/GIF，魔数校验，约 10MB |
| GET | `/api/tags` `/api/pages` | 标签 / 静态页 |

## 发现端点

- `/sitemap.xml`：只列数据库真实存在的页面、分类和文章
- `/feed.xml`、`/en/feed.xml`：双语 RSS
- `/robots.txt`、`/llms.txt`
- `/virtualcardx2026.txt`：IndexNow 验证

## 站点

- 生产：https://virtualcardx.com （中文 `/`，英文 `/en/`）
- 预览：https://vcx-new.xiaoyanggekuajing.workers.dev
