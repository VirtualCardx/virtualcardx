# VirtualCardX Worker (vcx-new)

virtualcardx.com 的 Cloudflare Workers 源码（Hono + D1 `vcx-db` + R2 `vcx-media`）。
全站 SSR，中英双语（中文 `/`，英文 `/en/`），内容驱动 SEO。

## 结构

| 文件 | 说明 |
|---|---|
| `index.js` | Worker 源码（wrangler 直接打包入口，无需手动 esbuild） |
| `meta-desc.js` | 静态页 / 分类页的 meta description 文案（DB 里没有 description 列） |
| `db/schema.sql` | D1 表结构（posts / categories / tags / pages / media + 索引） |
| `db/migrations/` | 生产库增量迁移（已有库补列 / 补索引） |
| `wrangler.toml` | Cloudflare 配置（D1/R2 绑定、account_id、`assets` 静态目录） |
| `public/` | 自托管 IBM Plex（Sans 可变字重 + Mono 400/500/600 woff2）与 `_headers`，经 Workers Assets 提供 |
| `deploy_vcx.sh` | Cloudflare API 部署脚本 |
| `tests/` | `node:test` 回归套件（路由 / SEO / 404 / API / 查询数 / schema 一致性） |

## 开发

```bash
npm install            # hono + wrangler(devDependencies 精确锁定 4.156.0)
npm test               # 跑回归套件（无需联网、无需 wrangler）
npm run dev            # 本地跑；需 CLOUDFLARE_API_TOKEN（见下）
./deploy_vcx.sh        # 部署;需 CLOUDFLARE_API_TOKEN 环境变量
```

wrangler 版本在 `package.json` 里写死（不带 `^`），`deploy_vcx.sh` 走
`node_modules/.bin/wrangler` 而不是 `npx wrangler`，避免不同机器拉到不同大版本。

### 本地跑真实数据

D1 和 R2 的本地模拟是空的。有内容的本地站要先把线上库拉一份下来：

```bash
# 1. 导出线上 D1（3.8MB 左右，导期间库会短暂只读）
./node_modules/.bin/wrangler d1 export vcx-db --remote --output=.local-db/vcx-dump.sql

# 2. 灌进本地 D1（.wrangler/state 内的模拟库，可反复重灌）
./node_modules/.bin/wrangler d1 execute vcx-db --local --file=.local-db/vcx-dump.sql
```

之后 `npm run dev` 就是 D1 走本地副本、R2 走线上桶。
`wrangler.toml` 里给 R2 加了 `remote = true`，只影响 `dev`、`deploy` 会忽略它；
不这么配的话本地 R2 为空，缩略图会全部 404。

注意 **`--local` 参数会覆盖单项的 `remote = true`**，加了这个 flag 就等于全本地、
图片必然 404。要在完全离线、不碰线上的情况下调样式，才用它：

```bash
npm run dev -- --local
```

`CLOUDFLARE_API_TOKEN` 只在 R2 走线上时需要，且它能让 `dev` 读到生产桶 ——
别拿它跑不受信任的代码。

## D1 初始化与迁移

新环境：

```bash
npx wrangler d1 create vcx-db
npx wrangler d1 execute vcx-db --remote --file db/schema.sql
```

已存在的库（补索引）：

```bash
# 先确认 sticky 是否已在（生产库 2026-08 已手工加过）
npx wrangler d1 execute vcx-db --remote --command "PRAGMA table_info(posts)"
```

`ALTER TABLE ... ADD COLUMN` 在列已存在时会报 duplicate column 并中断整个文件，
所以**列已存在就不要跑 --file**，只执行索引部分：

```bash
npx wrangler d1 execute vcx-db --remote --command "\
CREATE INDEX IF NOT EXISTS idx_posts_lang_status ON posts(lang, status);\
CREATE INDEX IF NOT EXISTS idx_posts_path_lang ON posts(path, lang);\
CREATE INDEX IF NOT EXISTS idx_pages_slug_lang ON pages(slug, lang);\
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);\
CREATE INDEX IF NOT EXISTS idx_media_filename ON media(filename);\
CREATE INDEX IF NOT EXISTS idx_media_path ON media(path);"
```

> `tests/schema.test.mjs` 会校验“代码里查询的列”都在 `db/schema.sql` 里，
> 以后再出现 `sticky` 那种只存在于生产库的列，测试会直接失败。

## 请求处理顺序

1. `www.` → 裸域 301
2. 旧 WP 的 `query-xxx` 参数 → 干净路径 301
3. `BLOG_MOVED`：已迁往 blog.andou.eu.org 的文章 → 301 单跳
4. 尾斜杠规范化（只对路由文档，跳过 `/api/`、`/media/` 与带扩展名的路径）
5. Edge Cache：仅缓存无 query、无 cookie 的公开 GET HTML，命中 30 分钟
6. 安全响应头（CSP / nosniff / X-Frame-Options / Permissions-Policy）
7. 显式路由，最后是 catch-all（pages → 分类 → 文章 → 旧 URL 301 → 404）

## 管理 API

`/api/*` 使用 `Authorization: Bearer <API_TOKEN>`（secret `API_TOKEN`，密钥不在仓库中）。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/health` | 健康检查（公开） |
| GET | `/api/posts` | 列表，支持 `lang` / `status` / `q` / `limit` / `offset` |
| GET/POST/PUT/DELETE | `/api/posts[/:id]` | 单篇 CRUD，`path` 冲突返回 409 |
| GET/POST | `/api/categories` | 分类 |
| GET/POST | `/api/media` | 上传（JSON + base64，仅 `image/*`，上限约 10MB） |
| GET | `/api/tags` `/api/pages` | 标签 / 静态页 |

## 站点

- 生产：https://virtualcardx.com （中文 `/`，英文 `/en/`）
- 预览：https://vcx-new.xiaoyanggekuajing.workers.dev
