# VirtualCardX Worker (vcx-new)

virtualcardx.com 的 Cloudflare Workers 源码（Hono + D1 `vcx-db` + R2 `vcx-media`）。

## 结构

| 文件 | 说明 |
|---|---|
| `index.js` | Worker 源码（wrangler 直接打包入口，无需手动 esbuild） |
| `db/schema.sql` | D1 表结构（posts/categories/tags/pages/media + 索引） |
| `wrangler.toml` | Cloudflare 配置（D1/R2 绑定、account_id） |
| `deploy_vcx.sh` | Cloudflare API 部署脚本 |
| `test_*.mjs` | SEO / Schema / 301 映射 / 路由回归测试 |
| `syntax_check.cjs` | 语法检查 |
| `diag*.js` | 临时诊断脚本 |

## 开发

```bash
npm install            # hono
npx wrangler dev       # 本地模式;加 --remote 连生产 D1/R2
npx wrangler deploy    # 需 CLOUDFLARE_API_TOKEN;wrangler 自动打包 index.js
```

## D1 初始化

```bash
npx wrangler d1 create vcx-db
npx wrangler d1 execute vcx-db --remote --file db/schema.sql
```

## 管理 API

`/api/*` 使用 Bearer Token（secret `API_TOKEN`），密钥不在仓库中。

## 站点

- 生产：https://virtualcardx.com （中文 `/`，英文 `/en/`）
- 预览：https://vcx-new.xiaoyanggekuajing.workers.dev
