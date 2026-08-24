// virtualcardx.com 新站 Worker v3 — 专业界面重设计
// 共享布局: 导航/侧边栏/页脚 + 现代 CSS
import { Hono } from 'hono'

const app = new Hono({ strict: false })

// www -> 非 www 301 (保持老站行为)
app.use('*', async (c, next) => {
  const host = c.req.header('host') || ''
  if (host.toLowerCase().startsWith('www.')) {
    const url = new URL(c.req.url)
    url.hostname = host.slice(4)
    return c.redirect(url.toString(), 301)
  }
  await next()
})
// 公开 SSR HTML 的 Worker Edge Cache。缓存键保持原始 URL，便于 Zone API 精准 purge。
app.use('*', async (c, next) => {
  const url = new URL(c.req.url)
  const path = url.pathname
  const method = c.req.method.toUpperCase()
  const excluded = path.startsWith('/api/') || path.startsWith('/media/') || path.startsWith('/search') ||
    path === '/sitemap.xml' || path === '/robots.txt' || path === '/favicon.ico' || path === '/virtualcardx2026.txt'
  const eligible = method === 'GET' && !url.search && !excluded &&
    !c.req.header('authorization') && !c.req.header('cookie') && typeof caches !== 'undefined' && caches.default
  if (!eligible) return next()

  const cache = caches.default
  const cacheKey = new Request(url.toString(), { method: 'GET' })
  const cached = await cache.match(cacheKey)
  if (cached) {
    const hit = new Response(cached.body, cached)
    hit.headers.set('Cache-Control', 'public, max-age=0, must-revalidate')
    hit.headers.set('CDN-Cache-Control', 'public, max-age=1800')
    hit.headers.set('X-VCX-Cache', 'HIT')
    return hit
  }

  await next()
  const contentType = c.res.headers.get('Content-Type') || ''
  if (c.res.status === 200 && contentType.toLowerCase().includes('text/html') && !c.res.headers.has('Set-Cookie')) {
    const stored = c.res.clone()
    stored.headers.set('Cache-Control', 'public, max-age=1800')
    stored.headers.set('CDN-Cache-Control', 'public, max-age=1800')
    const put = cache.put(cacheKey, stored)
    try {
      c.executionCtx.waitUntil(put)
    } catch {
      await put
    }
    c.header('X-VCX-Cache', 'MISS')
  }
})

// 全局安全响应头与公开 HTML 的 CDN 缓存声明（HSTS 由 Cloudflare Zone 设置负责，此处不覆盖）
app.use('*', async (c, next) => {
  await next()
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.header('X-Frame-Options', 'SAMEORIGIN')
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  c.header('Content-Security-Policy', "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; connect-src 'self' https://cloudflareinsights.com; frame-src https:")

  const url = new URL(c.req.url)
  const method = c.req.method.toUpperCase()
  const path = url.pathname
  const contentType = c.res.headers.get('Content-Type') || ''
  const excluded = path.startsWith('/api/') || path.startsWith('/media/') || path.startsWith('/search') ||
    path === '/sitemap.xml' || path === '/robots.txt' || path === '/favicon.ico' || path === '/virtualcardx2026.txt'
  if ((method === 'GET' || method === 'HEAD') && !url.search && !excluded && contentType.toLowerCase().includes('text/html')) {
    // 浏览器每次重新验证；Cloudflare 边缘缓存 30 分钟，内容更新由受信发布客户端精准 purge。
    c.header('Cache-Control', 'public, max-age=0, must-revalidate')
    c.header('CDN-Cache-Control', 'public, max-age=1800')
  }
})
const SITE = 'https://virtualcardx.com'

// ============ 共享 CSS ============
const CSS = `
:root{
  --primary:#2563eb; --primary-dark:#1d4ed8; --primary-light:#eff6ff;
  --accent:#f59e0b; --text:#1f2937; --text-light:#6b7280;
  --bg:#f8fafc; --card:#ffffff; --border:#e5e7eb;
  --radius:12px; --shadow:0 1px 3px rgba(0,0,0,.08),0 4px 14px rgba(0,0,0,.05);
  --shadow-lg:0 8px 30px rgba(0,0,0,.12);
}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;background:var(--bg);color:var(--text);line-height:1.75;font-size:16px}
a{color:var(--primary);text-decoration:none}
a:hover{color:var(--primary-dark)}
img{max-width:100%;height:auto}
.container{max-width:1140px;margin:0 auto;padding:0 20px}

/* 顶部导航 */
.site-header{background:#fff;border-bottom:1px solid var(--border);position:sticky;top:0;z-index:100;box-shadow:0 1px 4px rgba(0,0,0,.04)}
.header-inner{max-width:1140px;margin:0 auto;padding:0 20px;display:flex;align-items:center;justify-content:space-between;height:64px}
.logo{font-size:1.35rem;font-weight:800;color:var(--text);display:flex;align-items:center;gap:8px}
.logo-img{height:38px;width:auto;display:block}
.logo .logo-badge{background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:800}
.main-nav{display:flex;align-items:center;gap:22px}
.main-nav a{color:var(--text);font-size:.95rem;font-weight:500;padding:6px 2px;border-bottom:2px solid transparent}
.main-nav a:hover{color:var(--primary);border-bottom-color:var(--primary)}
.nav-right{display:flex;align-items:center;gap:12px}
/* 汉堡菜单按钮 (默认隐藏, 移动端显示) */
.menu-toggle{display:none;background:none;border:none;cursor:pointer;padding:8px;flex-direction:column;gap:5px;border-radius:6px}
.menu-toggle .bar{display:block;width:22px;height:2.5px;background:var(--text);border-radius:2px;transition:transform .25s,opacity .25s}
.menu-toggle:hover{background:var(--bg)}
.menu-toggle[aria-expanded="true"] .bar:nth-child(1){transform:translateY(7.5px) rotate(45deg)}
.menu-toggle[aria-expanded="true"] .bar:nth-child(2){opacity:0}
.menu-toggle[aria-expanded="true"] .bar:nth-child(3){transform:translateY(-7.5px) rotate(-45deg)}
.search-box{display:flex;align-items:center;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:0 4px 0 12px;height:38px}
.search-box input{border:none;background:transparent;outline:none;font-size:.9rem;width:160px;color:var(--text)}
.search-box button{border:none;background:var(--primary);color:#fff;border-radius:6px;height:30px;padding:0 12px;font-size:.85rem;cursor:pointer}
.lang-switch{font-size:.85rem;font-weight:600;color:var(--text-light);background:var(--bg);border:1px solid var(--border);padding:6px 12px;border-radius:8px}
.lang-switch:hover{color:var(--primary);border-color:var(--primary)}

/* 分类条 */
.cat-bar{background:#fff;border-bottom:1px solid var(--border)}
.cat-bar-inner{max-width:1140px;margin:0 auto;padding:0 20px;display:flex;gap:6px;overflow-x:auto;white-space:nowrap;padding:10px 20px}
.cat-bar a{font-size:.85rem;color:var(--text-light);padding:5px 14px;border-radius:20px;background:var(--bg);font-weight:500}
.cat-bar a:hover{color:var(--primary);background:var(--primary-light)}
/* 主布局 */
.layout{display:grid;grid-template-columns:1fr 300px;gap:28px;max-width:1140px;margin:0 auto;padding:28px 20px 40px}
.layout>main,.layout>.sidebar{min-width:0}
.layout.no-sidebar{grid-template-columns:1fr}
@media(max-width:900px){.layout{grid-template-columns:1fr}.sidebar{display:none}}

/* 文章卡片 */
.post-card{background:var(--card);border-radius:var(--radius);box-shadow:var(--shadow);overflow:hidden;margin-bottom:22px;display:flex;transition:transform .15s,box-shadow .15s}
.post-card:hover{transform:translateY(-2px);box-shadow:var(--shadow-lg)}
.post-thumb{flex:0 0 220px;min-height:150px;background:linear-gradient(135deg,#e0e7ff,#f5f3ff);display:flex;align-items:center;justify-content:center;overflow:hidden}
.post-thumb img{width:100%;height:100%;object-fit:cover}
.post-thumb .no-img{font-size:2.2rem;opacity:.35}
.post-body{padding:20px 24px;flex:1}
.post-meta{display:flex;align-items:center;gap:14px;font-size:.82rem;color:var(--text-light);margin-bottom:8px}
.post-meta .cat{color:var(--primary);font-weight:600}
.post-title{font-size:1.22rem;font-weight:700;line-height:1.45;margin-bottom:8px}
.post-title a{color:var(--text)}
.post-title a:hover{color:var(--primary)}
.post-excerpt{color:var(--text-light);font-size:.93rem;line-height:1.7}
@media(max-width:700px){.post-card{flex-direction:column}.post-thumb{flex:none;min-height:120px}}

/* 分页 */
.pagination{display:flex;justify-content:center;align-items:center;gap:5px;margin:30px 0;flex-wrap:wrap}
.pagination a,.pagination .cur,.pagination .dots{min-width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:8px;font-size:.9rem;font-weight:600;background:#fff;border:1px solid var(--border);color:var(--text)}
.pagination a:hover{border-color:var(--primary);color:var(--primary);background:var(--primary-light)}
.pagination .cur{background:var(--primary);border-color:var(--primary);color:#fff}
.pagination .dots{border:none;background:transparent;color:var(--text-light);min-width:24px}
.pagination .disabled{opacity:.35;pointer-events:none;min-width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:8px;background:#fff;border:1px solid var(--border);color:var(--text-light)}
.pagination .prev,.pagination .next,.pagination .first,.pagination .last{min-width:36px}
.pagination .page-info{font-size:.82rem;color:var(--text-light);margin-left:6px;white-space:nowrap}
@media(max-width:700px){
  .pagination{gap:4px}
  .pagination a,.pagination .cur,.pagination .dots,.pagination .disabled{min-width:32px;height:32px;font-size:.82rem}
  .pagination .first,.pagination .last{display:none}
  .pagination .page-info{display:none}
}

/* 侧边栏 */
.sidebar{display:flex;flex-direction:column;gap:22px}
.widget{background:var(--card);border-radius:var(--radius);box-shadow:var(--shadow);padding:22px}
.widget h3{font-size:1rem;font-weight:700;margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid var(--primary-light);display:flex;align-items:center;gap:8px}
.widget h3::before{content:"";width:4px;height:16px;background:var(--primary);border-radius:2px;display:inline-block}
.widget ul{list-style:none}
.widget li{margin-bottom:9px;font-size:.9rem;border-bottom:1px dashed var(--border);padding-bottom:9px}
.widget li:last-child{border-bottom:none;padding-bottom:0}
.widget li a{color:var(--text);display:block}
.widget li a:hover{color:var(--primary)}
.author-card{text-align:center}
.author-avatar{width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:800;margin:0 auto 12px}
.author-card .author-name{font-size:1.05rem;font-weight:700;margin-bottom:6px}
.author-card p{font-size:.85rem;color:var(--text-light)}
.contact-list li{display:flex;align-items:center;gap:8px;font-size:.88rem}

/* 文章页 */
.article{background:var(--card);border-radius:var(--radius);box-shadow:var(--shadow);padding:36px 40px}
.article-header{margin-bottom:26px;padding-bottom:22px;border-bottom:1px solid var(--border)}
.article .article-hero{display:block;width:100%;max-height:420px;object-fit:cover;border-radius:12px;margin:18px 0 6px;border:1px solid var(--border)}
.article h1{font-size:1.75rem;font-weight:800;line-height:1.4;margin-bottom:14px}
.article-meta{display:flex;gap:16px;font-size:.86rem;color:var(--text-light);flex-wrap:wrap}
.article-meta .author-link{color:inherit;text-decoration:none}
.article-meta .author-link:hover{text-decoration:underline}
.breadcrumbs{font-size:.84rem;color:var(--text-light);margin:0 0 14px;line-height:1.5}
.breadcrumbs a{text-decoration:underline;text-underline-offset:2px}
.article .content{font-size:1.02rem}
.article .content h2{font-size:1.35rem;font-weight:700;margin:30px 0 14px;padding-left:12px;border-left:4px solid var(--primary)}
.article .content h3{font-size:1.15rem;font-weight:700;margin:24px 0 12px}
.article .content p{margin:0 0 16px}
.article .content ul,.article .content ol{margin:0 0 16px 22px}
.article .content li{margin-bottom:6px}
.article .content img{border-radius:8px;margin:10px 0}
.article .content table{width:100%;border-collapse:collapse;margin:16px 0;font-size:.92rem}
.article .content th{background:var(--primary-light);font-weight:700}
.article .content td,.article .content th{border:1px solid var(--border);padding:10px 12px;text-align:left}
.article .content blockquote{border-left:4px solid var(--accent);background:#fffbeb;padding:14px 18px;margin:16px 0;border-radius:0 8px 8px 0;color:#92400e}
.article .content a{text-decoration:underline;text-underline-offset:2px}
.article,.article .content,.article .content p,.article .content li,.article .content a{overflow-wrap:anywhere;word-break:break-word;min-width:0}
.article .content table{display:block;max-width:100%;overflow-x:auto}
.article .content code{background:var(--bg);padding:2px 6px;border-radius:4px;font-size:.9em}
pre{background:#f6f8fa;color:#212121;border:1px solid #e1e4e8;padding:18px;border-radius:8px;overflow-x:auto;margin:16px 0;max-width:100%;white-space:pre;word-wrap:normal;tab-size:4;font-size:.92rem;font-family:"JetBrains Mono","Fira Code","Cascadia Code","SF Mono",Menlo,Consolas,"Liberation Mono","Courier New",monospace;line-height:1.6}
pre code{background:none;color:inherit;padding:0;white-space:pre;font-size:.92rem;font-family:inherit;line-height:1.6}
.article .content code{background:var(--bg);padding:2px 6px;border-radius:4px;font-size:.9em;font-family:"JetBrains Mono","Fira Code","Cascadia Code","SF Mono",Menlo,Consolas,"Liberation Mono","Courier New",monospace}
.lang-toggle{background:var(--primary-light);color:var(--primary);padding:8px 16px;border-radius:8px;font-weight:600}

/* 页面/分类/搜索 */
.page-title{font-size:1.6rem;font-weight:800;margin:24px 0 20px;padding-bottom:12px;border-bottom:2px solid var(--primary-light)}
.post-list{background:var(--card);border-radius:var(--radius);box-shadow:var(--shadow);padding:8px 24px}
.home-hero{margin:0;padding:0}
.home-hero h1{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.home-hero p{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.post-list li{padding:14px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:14px}
.post-list li:last-child{border-bottom:none}
.post-list a{color:var(--text);font-weight:600;font-size:.98rem}
.post-list a:hover{color:var(--primary)}
.post-list time{color:var(--text-light);font-size:.82rem;white-space:nowrap}
.page-content{background:var(--card);border-radius:var(--radius);box-shadow:var(--shadow);padding:36px 40px;font-size:1.02rem}
.page-content h2{font-size:1.3rem;margin:22px 0 12px}
.page-content p{margin-bottom:14px}
.page-content ul{margin:0 0 14px 20px}

/* 页脚 */
.site-footer{background:#0f172a;color:#94a3b8;padding:40px 0 28px;margin-top:40px}
.footer-inner{max-width:1140px;margin:0 auto;padding:0 20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:30px}
.footer-col h4{color:#f1f5f9;font-size:1rem;margin-bottom:14px;font-weight:700}
.footer-col a{display:block;color:#94a3b8;font-size:.88rem;margin-bottom:8px}
.footer-col a:hover{color:#fff}
.footer-bottom{max-width:1140px;margin:24px auto 0;padding:18px 20px 0;border-top:1px solid #1e293b;font-size:.82rem;text-align:center;color:#94a3b8}

/* 404 */
.notfound{text-align:center;padding:80px 20px}
.notfound .code{font-size:5rem;font-weight:900;background:linear-gradient(135deg,#2563eb,#7c3aed);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.notfound h1{font-size:1.5rem;margin:10px 0 16px}

@media(max-width:700px){
  /* 主菜单: 桌面导航隐藏, 汉堡按钮显示, 点击展开下拉面板 */
  .main-nav{display:none;position:absolute;top:100%;left:0;right:0;background:#fff;flex-direction:column;align-items:stretch;gap:0;padding:8px 0;border-bottom:1px solid var(--border);box-shadow:0 8px 20px rgba(0,0,0,.08);z-index:99}
  .main-nav.open{display:flex}
  .main-nav a{padding:14px 20px;border-bottom:1px solid var(--border);font-size:1rem}
  .main-nav a:last-child{border-bottom:none}
  .main-nav a:hover{background:var(--bg);color:var(--primary);border-bottom-color:var(--border)}
  .menu-toggle{display:flex}
  .header-inner{position:relative;height:auto;flex-wrap:wrap;padding:10px 16px;gap:8px 12px}
  .logo-img{height:28px;width:auto}
  .logo{font-size:1.1rem;gap:6px}
  .nav-right{width:100%;order:3;display:flex;gap:8px}
  .search-box{flex:1;min-width:0}
  .search-box input{width:auto;flex:1;min-width:0}
  .search-box button{padding:0 10px;white-space:nowrap}
  .lang-switch{padding:6px 10px}
  /* 移动端分类栏: 全部 8 个分类显示, 自动换行成两行胶囊 */
  .cat-bar-inner{flex-wrap:wrap;gap:6px;padding:8px 12px;overflow-x:visible;white-space:normal}
  .cat-bar a{padding:5px 12px;font-size:.8rem}
  .article,.page-content{padding:22px 18px}
  .article h1{font-size:1.35rem}
  .post-title{font-size:1.08rem}
}
`

// ============ 工具函数 ============
function esc(s) {
  if (!s) return ''
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}
function excerptText(value, max = 320) {
  const text = String(value || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
  if (text.length <= max) return text
  let cut = text.slice(0, max)
  // Only back up when max actually cuts through an ASCII word. The old regex
  // ran on every excerpt and treated Chinese text after an ASCII letter as a
  // partial English word, reducing some cards to a single "A".
  if (/[A-Za-z0-9]$/.test(cut) && /[A-Za-z0-9]/.test(text.charAt(max))) {
    const wordSafe = cut.replace(/[A-Za-z0-9]+$/, '')
    if (wordSafe) cut = wordSafe
  }
  return cut.trim()
}
function getLang(pathname) { return pathname.startsWith('/en') ? 'en' : 'zh' }
function baseOf(lang) { return lang==='en' ? '/en/' : '/' }
// 日期格式化: 兼容 ISO (2026-08-04T02:07:35) 和可读格式 (November 21, 2025)
function fmtDate(d) {
  if (!d) return ''
  const s = String(d).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10)
  // 可读格式: 原样返回
  return s
}
// ===== 统一分页导航生成器 =====
// 生成智能页码: 首尾固定, 当前页前后各 WINDOW 页, 中间用省略号
// 例 (total=18, cur=9): 1 2 3 … 7 8 [9] 10 11 … 16 17 18
function buildPageLinks(cur, totalPages, urlFor) {
  const WINDOW = 2 // 当前页前后各几页
  const pages = new Set([1, totalPages])
  for (let i = Math.max(1, cur - WINDOW); i <= Math.min(totalPages, cur + WINDOW); i++) pages.add(i)
  const sorted = [...pages].sort((a,b) => a-b)
  let out = ''
  let prev = 0
  for (const p of sorted) {
    if (prev && p - prev > 1) out += '<span class="dots">…</span>'
    if (p === 1) out += p === cur ? '<span class="cur" aria-current="page">1</span>' : `<a href="${urlFor(1)}">1</a>`
    else out += p === cur ? `<span class="cur" aria-current="page">${p}</span>` : `<a href="${urlFor(p)}">${p}</a>`
    prev = p
  }
  return out
}
// 完整分页组件: prev/首页/页码/末页/next + rel=prev/next
function renderPagination(cur, totalPages, urlFor, opts={}) {
  if (totalPages <= 1) return ''
  const prevHtml = cur > 1 ? `<a class="prev" rel="prev" href="${urlFor(cur-1)}" aria-label="Previous">‹</a>` : '<span class="prev disabled">‹</span>'
  const nextHtml = cur < totalPages ? `<a class="next" rel="next" href="${urlFor(cur+1)}" aria-label="Next">›</a>` : '<span class="next disabled">›</span>'
  const firstHtml = cur > 1 ? `<a class="first" href="${urlFor(1)}" aria-label="First">«</a>` : '<span class="first disabled">«</span>'
  const lastHtml = cur < totalPages ? `<a class="last" href="${urlFor(totalPages)}" aria-label="Last">»</a>` : '<span class="last disabled">»</span>'
  const links = buildPageLinks(cur, totalPages, urlFor)
  const info = opts.showInfo ? `<span class="page-info">${cur} / ${totalPages}</span>` : ''
  return `<nav class="pagination" aria-label="Pagination">${firstHtml}${prevHtml}${links}${nextHtml}${lastHtml}${info}</nav>`
}
// 解析分页参数: 合法返回页码, 非法返回 null
function parsePage(n) {
  if (!/^\d+$/.test(String(n||''))) return null
  const p = parseInt(n, 10)
  if (p < 1) return null
  return p
}

// 分类导航条 (中英)
const CATS_ZH = [
  ['/virtual-credit-card/', '虚拟卡评测'],
  ['/cross-border-collections/', '跨境支付收款'],
  ['/technology-share/', '技术教程'],
  ['/artificial-intelligence/', 'AI 工具'],
  ['/seo/', 'SEO 与流量'],
  ['/social-media/', '社媒运营外贸'],
  ['/cryptocurrency/', '加密货币'],
  ['/resource-share/', '免费资源'],
]
const CATS_EN = [
  ['/en/virtual-credit-card/', 'Virtual Cards'],
  ['/en/cross-border-collections/', 'Payments'],
  ['/en/technology-share/', 'Tech'],
  ['/en/artificial-intelligence/', 'AI Tools'],
  ['/en/seo/', 'SEO'],
  ['/en/social-media/', 'Social & Trade'],
  ['/en/cryptocurrency/', 'Crypto'],
  ['/en/resource-share/', 'Free Resources'],
]
// 分类英文名映射 (slug -> 英文名, 用于英文分类页标题)
const CATEGORY_NAMES_EN = {
  'virtual-credit-card': 'Virtual Card Reviews',
  'cross-border-collections': 'Cross-Border Payments',
  'technology-share': 'Tech Tutorials',
  'artificial-intelligence': 'AI Tools',
  'seo': 'SEO & Traffic',
  'social-media': 'Social Media & Foreign Trade',
  'cryptocurrency': 'Cryptocurrency',
  'resource-share': 'Free Resources & Tools',
}

// ============ 共享布局 ============
// 生成当前页面对应语言的 URL (语言切换按钮)
// path 格式: 不带语言前缀 (如 '2026/07/13/79card-review', 'virtual-credit-card/', 'about', 'search?q=visa')
function langSwitchHref(lang, curPath) {
  const en = lang === 'en'
  if (!curPath) return en ? '/' : '/en/'
  // 分离 query 参数
  let [p, query] = curPath.split('?')
  // 去掉尾部斜杠统一处理
  p = p.replace(/^\/+|\/+$/g, '')
  if (!p) {
    // 纯 query (如 ?s=visa): 直接换语言前缀
    const q = query ? '?' + query : ''
    return en ? '/' + q : '/en/' + q
  }
  // 已经是目标语言的 URL (英文页面的中文版=去前缀, 中文页面的英文版=加前缀)
  let out
  if (en) {
    // 当前是英文页 -> 中文版: 去掉 /en/ 前缀
    if (p.startsWith('en/')) p = p.slice(3)
    out = '/' + p + '/'
  } else {
    // 当前是中文页 -> 英文版: 加 /en/ 前缀
    out = '/en/' + p + '/'
  }
  return query ? out + '?' + query : out
}
function layout(lang, title, desc, body, opts={}) {
  const base = baseOf(lang)
  const cats = lang==='en' ? CATS_EN : CATS_ZH
  const catLinks = cats.map(([u,n]) => `<a href="${u}">${n}</a>`).join('')
  const altHref = langSwitchHref(lang, opts.path)
  const altLabel = lang==='en' ? '中文' : 'English'
  const searchPlaceholder = lang==='en' ? 'Search...' : '搜索文章...'
  const homeLabel = lang==='en' ? 'Home' : '首页'
  const canonical = opts.canonical || (base + (opts.path||''))
  const sidebar = opts.noSidebar ? '' : `
  <aside class="sidebar">
    <div class="widget author-card">
      <div class="author-avatar">木</div>
      <div class="author-name">${lang==='en'?'Moyi Foreign Trade':'木易外贸'}</div>
      <p>${lang==='en'?'Virtual card reviews & cross-border payment guides.':'虚拟信用卡实测评测，跨境电商支付经验分享。'}</p>
    </div>
    <div class="widget">
      <h3>${lang==='en'?'Recent Posts':'最新文章'}</h3>
      ${opts.recentPosts||''}
    </div>
    <div class="widget">
      <h3>${lang==='en'?'Contact':'联系方式'}</h3>
      <ul class="contact-list">
        <li>📮 TG：${lang==='en'?'VirtualCardx':'@VirtualCardx'}</li>
      </ul>
    </div>
  </aside>`
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="icon" type="image/png" href="/media/1556-cropped-logo.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="canonical" href="${SITE}${canonical}">
<link rel="alternate" hreflang="${lang==='en'?'zh':'en'}" href="${SITE}${altHref}">
<link rel="alternate" hreflang="${lang}" href="${SITE}${canonical}">
<link rel="alternate" hreflang="x-default" href="${SITE}${lang==='zh' ? canonical : altHref}">
<meta property="og:type" content="${opts.ogType||'website'}">
<meta property="og:site_name" content="VirtualCardx">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}${canonical}">
<meta property="og:locale" content="${lang==='en'?'en_US':'zh_CN'}">
<meta name="twitter:card" content="summary">
${opts.jsonld ? `<script type="application/ld+json">${JSON.stringify(opts.jsonld)}</script>` : ''}
${opts.extraHead||''}
<style>${CSS}</style>
</head>
<body>
<header class="site-header">
  <div class="header-inner">
    <a class="logo" href="${base}"><img class="logo-img" src="/media/1556-cropped-logo.png" alt="VirtualCardx" width="128" height="45"> VirtualCardx</a>
    <button class="menu-toggle" aria-label="${lang==='en'?'Menu':'菜单'}" aria-expanded="false">
      <span class="bar"></span><span class="bar"></span><span class="bar"></span>
    </button>
    <nav class="main-nav" id="mainNav">
      <a href="${base}">${homeLabel}</a>
      <a href="${base}virtual-credit-card/">${lang==='en'?'Virtual Card Reviews':'虚拟卡评测'}</a>
      <a href="${base}about/">${lang==='en'?'About':'关于'}</a>
      <a href="${base}contact/">${lang==='en'?'Contact':'联系'}</a>
    </nav>
    <div class="nav-right">
      <form class="search-box" action="${base}" method="get">
        <input type="search" name="s" placeholder="${searchPlaceholder}" aria-label="Search">
        <button type="submit">${lang==='en'?'Go':'搜索'}</button>
      </form>
      <a class="lang-switch" href="${altHref}">${altLabel}</a>
    </div>
  </div>
</header>
<div class="cat-bar"><div class="cat-bar-inner">${catLinks}</div></div>
<div class="layout${opts.noSidebar?' no-sidebar':''}">
  <main>${body}</main>
  ${sidebar}
</div>
<footer class="site-footer">
  <div class="footer-inner">
    <div class="footer-col">
      <h4>VirtualCardx</h4>
      <a href="${base}">${homeLabel}</a>
      <a href="${base}about/">${lang==='en'?'About':'关于本站'}</a>
      <a href="${base}contact/">${lang==='en'?'Contact':'联系站长'}</a>
    </div>
    <div class="footer-col">
      <h4>${lang==='en'?'Categories':'分类'}</h4>
      ${catLinks}
    </div>
    <div class="footer-col">
      <h4>${lang==='en'?'Legal':'法律'}</h4>
      <a href="${base}terms/">${lang==='en'?'Terms of Use':'使用条款'}</a>
      <a href="${base}privacy-policy/">${lang==='en'?'Privacy Policy':'隐私政策'}</a>
    </div>
  </div>
  <div class="footer-bottom">© ${new Date().getFullYear()} VirtualCardx · ${lang==='en'?'Virtual credit card reviews':'虚拟信用卡评测'} · All rights reserved</div>
</footer>
<script>
(function(){
  var btn=document.querySelector('.menu-toggle'), nav=document.getElementById('mainNav');
  if(!btn||!nav) return;
  btn.addEventListener('click', function(e){
    e.stopPropagation();
    var open=nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', open?'true':'false');
  });
  // 点击菜单项后收起
  nav.querySelectorAll('a').forEach(function(a){
    a.addEventListener('click', function(){ nav.classList.remove('open'); btn.setAttribute('aria-expanded','false'); });
  });
  // 点击页面其他区域关闭
  document.addEventListener('click', function(e){
    if(!nav.classList.contains('open')) return;
    if(!nav.contains(e.target) && !btn.contains(e.target)){
      nav.classList.remove('open'); btn.setAttribute('aria-expanded','false');
    }
  });
  // 菜单展开时锁定滚动 (可选)
})();
</script>
</body>
</html>`
}

// 侧边栏最新文章
async function recentPosts(c, lang, limit=5) {
  const { results } = await c.env.DB.prepare(
    'SELECT slug, title, path FROM posts WHERE lang = ? AND status="publish" ORDER BY date DESC LIMIT ?'
  ).bind(lang, limit).all()
  const base = baseOf(lang)
  const items = results.map(p => `<li><a href="${base}${p.path}/">${esc(p.title)}</a></li>`).join('')
  return `<ul class="recent-list">${items}</ul>`
}

// 图片重写 (支持 src 和 data-src, 以及 srcset)
async function rewriteImages(c, html, fallbackAlt='') {
  const re = /\/wp-content\/uploads\/[^"'\s)]+/g
  const found = [...new Set(html.match(re) || [])]
  for (const oldPath of found) {
    let fname = oldPath.split('/').pop().split('?')[0]
    fname = fname.replace(/-\d+x\d+(?=\.[a-zA-Z]+$)/, '')
    const { results } = await c.env.DB.prepare('SELECT path FROM media WHERE filename = ? LIMIT 1').bind(fname).all()
    if (results.length) html = html.split(oldPath).join('/' + results[0].path)
  }
  // 去除 smush lazyload 痕迹: data-src 提升为 src (无 JS 时也能显示)
  // 1) 先把完整域名替换为相对路径
  html = html.split('https://virtualcardx.com/media/').join('/media/')
  html = html.split('https://virtualcardx.com/wp-content/uploads/').join('/wp-content/uploads/')
  // 2) data-src 提升为 src (覆盖 smush 1x1 占位)
  html = html.replace(/<img([^>]*?)\sdata-src="([^"]*)"([^>]*)>/g, (m, pre, src, post) => {
    // 移除原 src (占位 SVG) 再放真实 src
    pre = pre.replace(/\ssrc="[^"]*"/, '')
    post = post.replace(/\ssrc="[^"]*"/, '')
    return `<img${pre} src="${src}"${post}>`
  })
  // 3) data-srcset 提升 (如果存在)
  html = html.replace(/<img([^>]*?)\sdata-srcset="([^"]*)"([^>]*)>/g, (m, pre, srcset, post) => {
    if (/srcset="/.test(pre+post)) return m
    return `<img${pre} srcset="${srcset}"${post}>`
  })
  // 4) 从 media 表补准确尺寸与空 alt，降低 CLS 并改善可访问性
  const imageTags = [...new Set(html.match(/<img\b[^>]*>/gi) || [])]
  for (const tag of imageTags) {
    const srcMatch = tag.match(/\ssrc=["']\/?([^"']+)["']/i)
    if (!srcMatch || !srcMatch[1].startsWith('media/')) continue
    let mediaPath
    try { mediaPath = decodeURIComponent(srcMatch[1]) } catch { mediaPath = srcMatch[1] }
    const { results } = await c.env.DB.prepare('SELECT width, height, alt FROM media WHERE path = ? LIMIT 1').bind(mediaPath).all()
    if (!results.length) continue
    const media = results[0]
    let updated = tag
    if (media.width && media.height && !/\swidth=/i.test(updated)) {
      updated = updated.replace(/\s*\/?>$/, ` width="${media.width}" height="${media.height}">`)
    }
    const alt = esc(media.alt || fallbackAlt)
    if (alt) {
      if (/\salt=["']\s*["']/i.test(updated)) updated = updated.replace(/\salt=["']\s*["']/i, ` alt="${alt}"`)
      else if (!/\salt=/i.test(updated)) updated = updated.replace(/\s*\/?>$/, ` alt="${alt}">`)
    }
    html = html.split(tag).join(updated)
  }
  // 5) 正文图片懒加载: 未标记的 img 加 loading=lazy + decoding=async (首图除外)
  let imgCount = 0
  html = html.replace(/<img(?![^>]*loading=)[^>]*>/g, (m) => {
    imgCount++
    // 第一张正文图不加 lazy (LCP), 加 fetchpriority=high
    if (imgCount === 1) {
      return m.replace(/(<img[^>]*?)(\/?>)$/, '$1 fetchpriority="high" decoding="async">')
    }
    return m.replace(/(<img[^>]*?)(\/?>)$/, '$1 loading="lazy" decoding="async">')
  })
  return html
}

// ============ 路由 ============

// 媒体
app.get('/media/*', async (c) => {
  const key = c.req.path.replace('/media/', '')
  // WebP 协商: 客户端 Accept 含 image/webp (所有现代浏览器) 且存在 WebP 版本时, 分发 WebP
  const accept = c.req.header('Accept') || ''
  const wantsWebp = /image\/webp/i.test(accept)
  if (wantsWebp) {
    const base = key.replace(/\.(jpg|jpeg|png)$/i, '')
    const webpObj = await c.env.R2.get(`media-webp/${base}.webp`)
    if (webpObj) {
      const headers = new Headers()
      webpObj.writeHttpMetadata(headers)
      headers.set('Cache-Control', 'public, max-age=2592000, immutable')
      headers.set('Vary', 'Accept')
      headers.set('Content-Type', 'image/webp')
      return new Response(webpObj.body, { headers })
    }
  }
  const obj = await c.env.R2.get('media/' + key)
  if (!obj) return c.notFound()
  const headers = new Headers()
  obj.writeHttpMetadata(headers)
  // 图片为 R2 静态对象, 长缓存 + immutable (更新时改文件名即可)
  headers.set('Cache-Control', 'public, max-age=2592000, immutable')
  headers.set('Vary', 'Accept') // 为 WebP/AVIF 协商留口子
  return new Response(obj.body, { headers })
})

// 搜索
app.get('/search', async (c) => {
  const lang = getLang(c.req.path)
  // 兼容 WP 风格 s 参数与 q 参数,避免 /search/?s=xx 被丢参 302 回首页
  const q = (c.req.query('q') || c.req.query('s') || '').trim()
  const base = baseOf(lang)
  if (!q) return c.redirect(base, 302)
  const { results } = await c.env.DB.prepare(
    'SELECT slug, title, path, date FROM posts WHERE lang = ? AND status="publish" AND (title LIKE ? OR content LIKE ?) ORDER BY date DESC LIMIT 20'
  ).bind(lang, `%${q}%`, `%${q}%`).all()
  const items = results.map(p => `<li><a href="${base}${p.path}/">${esc(p.title)}</a> <time>${esc(fmtDate(p.date))}</time></li>`).join('') || '<li>No results found</li>'
  const body = `<h1 class="page-title">${lang==='en'?'Search':'搜索'}: ${esc(q)}</h1><ul class="post-list">${items}</ul>`
  return c.html(layout(lang, `${q} - VirtualCardx`, `Search results for ${q}`, body, { noSidebar:true, path: `?s=${encodeURIComponent(q)}` }))
})

// ?s= 搜索 (WP 兼容)
async function handleSearch(c, lang, q) {
  const base = baseOf(lang)
  const { results } = await c.env.DB.prepare(
    'SELECT slug, title, excerpt, path, date, featured_media, translation_id FROM posts WHERE lang = ? AND status="publish" AND (title LIKE ? OR content LIKE ?) ORDER BY date DESC LIMIT 20'
  ).bind(lang, `%${q}%`, `%${q}%`).all()
  // 搜索列表与首页/分类一致: 卡片式, 带特色图 (英文无图时经配对取中文特色图)
  const items = []
  for (const p of results) {
    let imgHtml = '<div class="no-img">💳</div>'
    let fm = p.featured_media
    if (lang === 'en' && !fm && p.translation_id) {
      const zhRes = await c.env.DB.prepare(
        'SELECT featured_media FROM posts WHERE lang = ? AND translation_id = ? AND featured_media IS NOT NULL AND featured_media != 0 LIMIT 1'
      ).bind('zh', p.translation_id).all()
      if (zhRes.results.length) fm = zhRes.results[0].featured_media
    }
    if (fm) {
      const mRes = await c.env.DB.prepare('SELECT path, width, height FROM media WHERE id = ?').bind(fm).all()
      if (mRes.results.length) {
        const m = mRes.results[0]
        imgHtml = `<img src="/${m.path}" alt="${esc(p.title)}"${m.width&&m.height?` width="${m.width}" height="${m.height}"`:''} loading="lazy" decoding="async">`
      }
    }
    const excerpt = excerptText(p.excerpt)
    items.push(`<article class="post-card">
      <a class="post-thumb" href="${base}${p.path}/">${imgHtml}</a>
      <div class="post-body">
        <div class="post-meta"><span>${esc(fmtDate(p.date))}</span></div>
        <h2 class="post-title"><a href="${base}${p.path}/">${esc(p.title)}</a></h2>
        <div class="post-excerpt">${esc(excerpt)}</div>
      </div>
    </article>`)
  }
  const listHtml = items.join('') || `<p style="padding:20px;color:var(--text-light)">${lang==='en'?'No results found':'没有找到相关结果'}</p>`
  const body = `<h1 class="page-title">${lang==='en'?'Search':'搜索'}: ${esc(q)}</h1>${listHtml}`
  return layout(lang, `${q} - VirtualCardx`, `Search results for ${q}`, body, { noSidebar:true, path: `?s=${encodeURIComponent(q)}` })
}

// 分类渲染 (带分页)
async function renderCategory(c, lang, parentSlug, childSlug, page) {
  const base = baseOf(lang)
  let catRes
  if (childSlug) {
    const { results: parents } = await c.env.DB.prepare('SELECT id FROM categories WHERE slug = ?').bind(parentSlug).all()
    if (!parents.length) return null
    catRes = await c.env.DB.prepare('SELECT id, name FROM categories WHERE slug = ? AND parent = ?').bind(childSlug, parents[0].id).all()
  } else {
    catRes = await c.env.DB.prepare('SELECT id, name FROM categories WHERE slug = ?').bind(parentSlug).all()
  }
  if (!catRes.results.length) return null
  const catId = catRes.results[0].id
  const { results: posts } = await c.env.DB.prepare(
    'SELECT slug, title, path, date, category_ids, featured_media, translation_id, excerpt FROM posts WHERE lang = ? AND status="publish" ORDER BY date DESC'
  ).bind(lang).all()
  // 英文分类: category_ids 为空, 通过翻译配对取中文 category_ids
  let zhCatMap = {}
  let zhAll = []
  if (lang === 'en') {
    const zhPosts = await c.env.DB.prepare(
      'SELECT translation_id, category_ids, slug, title, path, date, featured_media, excerpt FROM posts WHERE lang = ? AND status="publish"'
    ).bind('zh').all()
    zhAll = zhPosts.results
    for (const zp of zhPosts.results) {
      if (zp.translation_id) zhCatMap[zp.translation_id] = zp.category_ids
    }
  }
  // 英文分类: 收集该分类下的文章 (英文配对 + 中文原文 fallback)
  let filtered = posts.filter(p => {
    let catIds = p.category_ids
    if (lang === 'en' && (!catIds || catIds === '[]') && p.translation_id && zhCatMap[p.translation_id]) {
      catIds = zhCatMap[p.translation_id]
    }
    try { return (JSON.parse(catIds||'[]')||[]).includes(catId) }
    catch { return false }
  })
  // 英文分类: 补充无英文翻译但属于该分类的中文文章 (TranslatePress 自动翻译)
  if (lang === 'en') {
    const enTids = new Set(filtered.filter(p=>p.translation_id).map(p=>p.translation_id))
    const zhFallback = zhAll.filter(zp => {
      // 已有英文配对的不重复加入
      if (zp.translation_id && enTids.has(zp.translation_id)) return false
      try { return (JSON.parse(zp.category_ids||'[]')||[]).includes(catId) }
      catch { return false }
    }).map(zp => ({
      slug: zp.slug, title: zp.title, path: zp.path, date: zp.date, excerpt: zp.excerpt,
      featured_media: zp.featured_media, translation_id: null, isZhFallback: true
    }))
    filtered = [...filtered, ...zhFallback]
  }
  // 分页: 每页 10 篇
  const perPage = 10
  const totalPages = Math.max(1, Math.ceil(filtered.length/perPage))
  if (page > totalPages) return null
  const pageItems = filtered.slice((page-1)*perPage, page*perPage)
  // 分类 URL 前缀 (分页用)
  const catPath = childSlug ? `${parentSlug}/${childSlug}` : parentSlug
  const catUrl = `${base}${catPath}/`
  // 渲染卡片式列表 (带特色图)
  const items = []
  for (const p of pageItems) {
    let imgHtml = '<div class="no-img">💳</div>'
    let fm = p.featured_media
    if (lang === 'en' && !fm && p.translation_id) {
      const zhRes = await c.env.DB.prepare(
        'SELECT featured_media FROM posts WHERE lang = ? AND translation_id = ? AND featured_media IS NOT NULL AND featured_media != 0 LIMIT 1'
      ).bind('zh', p.translation_id).all()
      if (zhRes.results.length) fm = zhRes.results[0].featured_media
    }
    if (fm) {
      const mRes = await c.env.DB.prepare('SELECT path, width, height FROM media WHERE id = ?').bind(fm).all()
      if (mRes.results.length) {
        const m = mRes.results[0]
        imgHtml = `<img src="/${m.path}" alt="${esc(p.title)}"${m.width&&m.height?` width="${m.width}" height="${m.height}"`:''} loading="lazy" decoding="async">`
      }
    }
    let catExcerpt = excerptText(p.excerpt)
    // 英文无摘要: 回退中文配对摘要 (同特色图回退逻辑)
    if (lang === 'en' && !catExcerpt && p.translation_id) {
      const zhExRes = await c.env.DB.prepare(
        'SELECT excerpt FROM posts WHERE lang = ? AND translation_id = ? AND excerpt IS NOT NULL AND excerpt != \'\' LIMIT 1'
      ).bind('zh', p.translation_id).all()
      if (zhExRes.results.length) catExcerpt = excerptText(zhExRes.results[0].excerpt)
    }
    items.push(`<article class="post-card">
      <a class="post-thumb" href="${base}${p.path}/">${imgHtml}</a>
      <div class="post-body">
        <div class="post-meta"><span>${esc(fmtDate(p.date))}</span>${p.isZhFallback?'<span class="cat">'+(lang==='en'?'ZH':'中')+'</span>':''}</div>
        <h2 class="post-title"><a href="${base}${p.path}/">${esc(p.title)}</a></h2>
        ${catExcerpt?`<div class="post-excerpt">${esc(catExcerpt)}</div>`:''}
      </div>
    </article>`)
  }
  const listHtml = items.join('') || '<p style="padding:20px;color:var(--text-light)">No posts</p>'
  // 分页导航 (统一组件)
  const urlFor = (p) => p === 1 ? catUrl : `${catUrl}page/${p}/`
  const pagination = renderPagination(page, totalPages, urlFor, { showInfo: true })
  // 分类名: 英文用映射表, 中文用数据库名; 子分类 slug 用于查找英文名
  let name = catRes.results[0].name
  if (lang === 'en') {
    const nameSlug = childSlug || parentSlug
    name = CATEGORY_NAMES_EN[nameSlug] || name
  }
  const body = `<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${base}">${lang==='en'?'Home':'首页'}</a> / <span>${esc(name)}</span></nav><h1 class="page-title">${esc(name)}${page>1 ? (lang==='en' ? ` — Page ${page}` : `第 ${page} 页`) : ''}</h1>${listHtml}${pagination}`
  const canonicalPath = page>1 ? `${catPath}/page/${page}/` : `${catPath}/`
  const canonicalUrl = `${SITE}${base}${canonicalPath}`
  const categoryJsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'CollectionPage', '@id': `${canonicalUrl}#webpage`, url: canonicalUrl, name, inLanguage: lang==='en'?'en':'zh-CN', isPartOf: { '@id': `${SITE}${base}#website` } },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: lang==='en'?'Home':'首页', item: `${SITE}${base}` },
        { '@type': 'ListItem', position: 2, name, item: canonicalUrl }
      ] }
    ]
  }
  const pageTitle = page>1
    ? (lang==='en' ? `${name} — Page ${page} - VirtualCardx` : `${name}第 ${page} 页 - VirtualCardx`)
    : `${name} - VirtualCardx`
  const pageDesc = page>1
    ? (lang==='en' ? `Browse ${name} articles on page ${page}.` : `${name}文章列表第 ${page} 页。`)
    : `${name} category on VirtualCardx`
  return layout(lang, pageTitle, pageDesc, body, { noSidebar:true, path: canonicalPath, jsonld: categoryJsonld })
}

// 首页 + 分页
async function renderHomePage(c, lang, page) {
  const base = baseOf(lang)
  const perPage = 10
  const offset = (page-1)*perPage
  // 英文首页仅展示真实英文文章：日期格式文章，或有翻译配对的新版纯 slug 文章
  let total = 0
  let results = []
  if (lang === 'en') {
    const isRealArticle = (p) => /^\d{4}\/\d{2}\/\d{2}\//.test(p.path) || (!p.path.includes('/') && p.translation_id != null)
    results = (await c.env.DB.prepare(
      'SELECT slug, title, excerpt, path, date, featured_media, translation_id FROM posts WHERE lang = ? AND status = \'publish\' ORDER BY date DESC'
    ).bind('en').all()).results.filter(isRealArticle)
    results.sort((a,b) => {
      const ts = (d) => {
        const s = String(d||'')
        if (/^\d{4}-\d{2}-\d{2}/.test(s)) return Date.parse(s.slice(0,10))
        return Date.parse(s) || 0
      }
      return ts(b.date) - ts(a.date)
    })
    total = results.length
  } else {
    const { results: totalRes } = await c.env.DB.prepare('SELECT COUNT(*) as n FROM posts WHERE lang = ? AND status = "publish"').bind(lang).all()
    total = totalRes[0].n
    const { results: r } = await c.env.DB.prepare(
      'SELECT slug, title, excerpt, path, date, featured_media, translation_id FROM posts WHERE lang = ? AND status = "publish" ORDER BY date DESC'
    ).bind(lang).all()
    results = r
  }
  const totalPages = Math.max(1, Math.ceil(total/perPage))
  if (page > totalPages) return null
  const pageItems = results.slice(offset, offset+perPage)
  // 特色图: 查 media 表映射
  const cards = []
  for (const p of pageItems) {
    let imgHtml = '<div class="no-img">💳</div>'
    // 特色图: 优先用自身的, 英文文章通过翻译配对取中文特色图
    let fm = p.featured_media
    if (lang === 'en' && !fm && p.translation_id) {
      const zhRes = await c.env.DB.prepare(
        'SELECT featured_media FROM posts WHERE lang = ? AND translation_id = ? AND featured_media IS NOT NULL AND featured_media != 0 LIMIT 1'
      ).bind('zh', p.translation_id).all()
      if (zhRes.results.length) fm = zhRes.results[0].featured_media
    }
    if (fm) {
      const mRes = await c.env.DB.prepare('SELECT path, width, height FROM media WHERE id = ?').bind(fm).all()
      // 首页第 1 张卡片图: 不加 lazy, 加 fetchpriority=high (LCP 优化)
      const isFirst = (page === 1 && cards.length === 0)
      if (mRes.results.length) {
        const m = mRes.results[0]
        const dims = m.width&&m.height ? ` width="${m.width}" height="${m.height}"` : ''
        imgHtml = isFirst
          ? `<img src="/${m.path}" alt="${esc(p.title)}"${dims} fetchpriority="high" decoding="async">`
          : `<img src="/${m.path}" alt="${esc(p.title)}"${dims} loading="lazy" decoding="async">`
      }
    }
    const excerpt = excerptText(p.excerpt)
    cards.push(`<article class="post-card">
      <a class="post-thumb" href="${base}${p.path}/">${imgHtml}</a>
      <div class="post-body">
        <div class="post-meta"><span class="cat">${lang==='en'?'Review':'评测'}</span><span>${esc(fmtDate(p.date))}</span></div>
        <h2 class="post-title"><a href="${base}${p.path}/">${esc(p.title)}</a></h2>
        <div class="post-excerpt">${esc(excerpt)}</div>
      </div>
    </article>`)
  }
  // 分页导航 (统一组件)
  const urlFor = (p) => p === 1 ? base : `${base}page/${p}/`
  const pagination = renderPagination(page, totalPages, urlFor, { showInfo: true })
  const recent = await recentPosts(c, lang)
  // 首页第 1 页: 加 SEO H1 区块 (改版迁移时丢失), 分页页不加
  const heroSection = page === 1
    ? `<section class="home-hero"><h1>${lang==='en'
        ? 'Virtual Credit Card Reviews &amp; Recommendations — 60+ Platforms Tested'
        : '虚拟信用卡评测与推荐 — 60+ 平台实测'}</h1><p>${lang==='en'
        ? 'Independent, hands-on reviews of virtual credit cards for cross-border payments: fees, KYC, funding methods, and real-world usage.'
        : '跨境支付虚拟信用卡实测评测：费率、KYC、开卡与充值方式、风控与真实使用体验。'}</p></section>`
    : ''
  const siteUrl = SITE + base
  const homeJsonld = page === 1 ? {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite', '@id': `${siteUrl}#website`, name: 'VirtualCardx', url: siteUrl,
        description: lang==='en' ? 'Independent virtual credit card reviews and recommendations.' : '虚拟信用卡实测评测与推荐。',
        inLanguage: lang==='en' ? 'en' : 'zh-CN',
        publisher: { '@id': `${SITE}/#organization` },
        potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: `${siteUrl}?s={search_term_string}` }, 'query-input': 'required name=search_term_string' }
      },
      { '@type': 'Organization', '@id': `${SITE}/#organization`, name: 'VirtualCardx', url: SITE+'/', logo: { '@type': 'ImageObject', url: `${SITE}/media/1556-cropped-logo.png`, width: 128, height: 45 } }
    ]
  } : undefined
  const body = heroSection + (page>1 ? `<h1 class="page-title">${lang==='en'?`Latest Articles — Page ${page}`:`最新文章第 ${page} 页`}</h1>` : '') + cards.join('') + pagination
  const pageTitle = page>1
    ? (lang==='en' ? `Latest Articles — Page ${page} - VirtualCardx` : `最新文章第 ${page} 页 - VirtualCardx`)
    : (lang==='en' ? 'VirtualCardx | Virtual Credit Card Reviews & Recommendations' : '虚拟信用卡平台推荐与评测 | VirtualCardx 60+平台实测')
  const pageDesc = page>1
    ? (lang==='en' ? `Browse the latest VirtualCardx reviews and guides on page ${page}.` : `VirtualCardx 最新评测和教程第 ${page} 页。`)
    : (lang==='en' ? 'Independent virtual credit card reviews, fees comparison, KYC and recommendations for cross-border payments.' : '虚拟信用卡实测评测与推荐：60+平台费率、KYC、返现、安全性全面对比，跨境支付与广告投放场景实测。')
  return layout(lang,
    pageTitle,
    pageDesc,
    body, { recentPosts: recent, path: page>1?`page/${page}/`:'', jsonld: homeJsonld })
}

// ============ 具体路由 ============
app.get('/page/:n', async (c) => {
  const lang = getLang(c.req.path)
  const page = parsePage(c.req.param('n'))
  if (page === null) return c.notFound()
  // /page/1/ -> 301 到首页 (消除重复内容)
  if (page === 1) return c.redirect(lang==='en' ? '/en/' : '/', 301)
  const html = await renderHomePage(c, lang, page)
  return html ? c.html(html) : c.notFound()
})
app.get('/en/page/:n', async (c) => {
  const page = parsePage(c.req.param('n'))
  if (page === null) return c.notFound()
  if (page === 1) return c.redirect('/en/', 301)
  const html = await renderHomePage(c, 'en', page)
  return html ? c.html(html) : c.notFound()
})

// /category/:slug 重定向
app.get('/category/:slug', async (c) => {
  const slug = c.req.param('slug')
  if (slug === 'virutal-credit-card') return c.redirect('/virtual-credit-card/', 301)
  const { results } = await c.env.DB.prepare('SELECT id FROM categories WHERE slug = ? AND parent = 0').bind(slug).all()
  if (!results.length) return c.notFound()
  return c.redirect(`/${slug}/`, 301)
})

app.get('/en/category/:slug', async (c) => {
  const slug = c.req.param('slug')
  if (slug === 'virutal-credit-card') return c.redirect('/en/virtual-credit-card/', 301)
  const { results } = await c.env.DB.prepare('SELECT id FROM categories WHERE slug = ? AND parent = 0').bind(slug).all()
  if (!results.length) return c.notFound()
  return c.redirect(`/en/${slug}/`, 301)
})

// virutal 拼写重定向
app.get('/virutal-credit-card/:rest*', (c) => {
  const rest = c.req.path.replace('/virutal-credit-card','')
  // 汇总页/分页直接指到最终分类页 (单跳, 避免二次 301)
  if (rest.startsWith('/virtual-credit-card-platform-summary')) return c.redirect('/virtual-credit-card/', 301)
  return c.redirect(`/virtual-credit-card${rest}`, 301)
})
app.get('/virutal-credit-card', (c) => c.redirect('/virtual-credit-card/', 301))
app.get('/en/virutal-credit-card/:rest*', (c) => {
  const rest = c.req.path.replace('/en/virutal-credit-card','')
  if (rest.startsWith('/virtual-credit-card-platform-summary')) return c.redirect('/en/virtual-credit-card/', 301)
  return c.redirect(`/en/virtual-credit-card${rest}`, 301)
})
app.get('/en/virutal-credit-card', (c) => c.redirect('/en/virtual-credit-card/', 301))
app.get('/favicon.ico', (c) => c.redirect('/media/1556-cropped-logo.png', 301))

// sitemap（只收录最终规范 200 URL；旧路径/已合并分类由 301 承接，不能留在 sitemap）
app.get('/sitemap.xml', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT path, lang, modified, translation_id FROM posts WHERE status = "publish"').all()
  const canonicalPosts = results.filter(p => {
    const decodedPath = '/' + (p.lang === 'en' ? 'en/' : '') + p.path.replace(/^\/+|\/+$/g, '')
    if (OLD_URL_REDIRECTS[decodedPath]) return false
    const postPath = decodedPath.replace(/^\/en\//, '').replace(/^\//, '')
    // 非日期 URL 只保留新版纯 slug 且必须属于正式中英配对；排除旧 Page/分类占位记录
    if (!/^\d{4}\/\d{2}\/\d{2}\//.test(p.path) && (p.path.includes('/') || p.translation_id == null)) return false
    return !OLD_CAT_REDIRECTS.some(([from]) => postPath === from.slice(1) || postPath.startsWith(from.slice(1) + '/'))
  })
  const postUrls = canonicalPosts.map(p => {
    const base = p.lang==='en' ? '/en/' : '/'
    const lastmod = (p.modified||'').slice(0,10)
    return `<url><loc>${SITE}${base}${p.path}/</loc>${lastmod?`<lastmod>${lastmod}</lastmod>`:''}</url>`
  }).join('')
  const staticSlugs = ['about','contact','terms','privacy-policy','technology-share','virtual-credit-card','cryptocurrency','cross-border-collections','social-media','artificial-intelligence','seo','resource-share']
  const staticUrls = ['/', '/en/', ...staticSlugs.flatMap(slug => [`/${slug}/`, `/en/${slug}/`])]
    .map(path => `<url><loc>${SITE}${path}</loc></url>`).join('')
  return c.body(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${staticUrls}${postUrls}</urlset>`,
    { headers: { 'Content-Type': 'application/xml' } })
})

// robots
app.get('/robots.txt', (c) => c.text('User-agent: *\nAllow: /\nSitemap: ' + SITE + '/sitemap.xml'))

// llms.txt — AEO:面向 LLM 爬虫的站点导览(markdown 约定)
app.get('/llms.txt', async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT path, title, excerpt FROM posts WHERE status='publish' AND lang='zh' ORDER BY date DESC LIMIT 40"
  ).all()
  const { results: enPosts } = await c.env.DB.prepare(
    "SELECT path, title, excerpt FROM posts WHERE status='publish' AND lang='en' ORDER BY date DESC LIMIT 40"
  ).all()
  const lines = []
  lines.push('# VirtualCardX')
  lines.push('')
  lines.push('> 虚拟信用卡评测与跨境支付指南:实测各平台(开卡/费率/充值/风控),面向海外订阅、广告投放与收款的用户。英文版 /en/。')
  lines.push('')
  lines.push('## 分类')
  lines.push('')
  lines.push('- [虚拟卡评测](https://virtualcardx.com/virtual-credit-card/): 各平台实测评分')
  lines.push('- [跨境支付与收款](https://virtualcardx.com/cross-border-collections/): 收款方案')
  lines.push('- [SEO 与流量](https://virtualcardx.com/seo/): 独立站获客')
  lines.push('- [免费资源](https://virtualcardx.com/resource-share/): 限时免费额度')
  lines.push('')
  lines.push('## 最新文章(中文)')
  lines.push('')
  for (const p of results) {
    const u = SITE + '/' + String(p.path || '').replace(/^\/+|\/+$/g, '') + '/'
    const t = (p.title || '').replace(/\s+/g, ' ').trim()
    const d = (p.excerpt || '').replace(/\s+/g, ' ').trim().slice(0, 90)
    lines.push(`- [${t}](${u})${d ? ': ' + d : ''}`)
  }
  lines.push('')
  lines.push('## Latest Posts (English)')
  lines.push('')
  for (const p of enPosts.slice(0, 20)) {
    const u = SITE + '/en/' + String(p.path || '').replace(/^\/+|\/+$/g, '') + '/'
    const t = (p.title || '').replace(/\s+/g, ' ').trim()
    lines.push(`- [${t}](${u})`)
  }
  return c.text(lines.join('\n'), 200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' })
})

// IndexNow 验证 key 文件 (no-store 防止 404 被 CF 边缘缓存)
app.get('/virtualcardx2026.txt', (c) => {
  c.header('Cache-Control', 'no-store, no-cache, must-revalidate')
  return c.text('virtualcardx2026')
})

// ============ 管理 API (供 Hermes Agent 调用) ============
// 认证: Authorization: Bearer <API_TOKEN>, token 通过 wrangler secret put API_TOKEN 设置
function apiAuth(c) {
  const auth = c.req.header('Authorization') || ''
  const token = c.env.API_TOKEN || ''
  if (!token) return { ok: false, err: 'API_TOKEN not configured on worker' }
  if (auth !== `Bearer ${token}`) return { ok: false, err: 'Unauthorized' }
  return { ok: true }
}
function apiJson(data, status=200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  })
}
function slugify(s) {
  return String(s||'').toLowerCase().trim()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// GET /api/health — 健康检查
app.get('/api/health', async (c) => {
  try {
    await c.env.DB.prepare('SELECT 1').all()
    return apiJson({ ok: true, service: 'vcx-new', time: new Date().toISOString() })
  } catch (e) {
    return apiJson({ ok: false, error: e.message }, 500)
  }
})

// GET /api/posts — 文章列表 (支持 lang, status, limit, offset, q 搜索)
app.get('/api/posts', async (c) => {
  const a = apiAuth(c); if (!a.ok) return apiJson({ error: a.err }, 401)
  const lang = c.req.query('lang') || 'zh'
  const status = c.req.query('status') || 'publish'
  const limit = Math.min(parseInt(c.req.query('limit')||'20')||20, 100)
  const offset = parseInt(c.req.query('offset')||'0')||0
  const q = (c.req.query('q')||'').trim()
  let where = 'lang = ? AND status = ?'
  const params = [lang, status]
  if (q) { where += ' AND (title LIKE ? OR content LIKE ?)'; params.push(`%${q}%`, `%${q}%`) }
  const total = (await c.env.DB.prepare(`SELECT COUNT(*) as n FROM posts WHERE ${where}`).bind(...params).all()).results[0].n
  const { results } = await c.env.DB.prepare(
    `SELECT id, lang, slug, title, excerpt, path, date, modified, status, featured_media, category_ids, tag_ids, translation_id FROM posts WHERE ${where} ORDER BY date DESC LIMIT ? OFFSET ?`
  ).bind(...params, limit, offset).all()
  return apiJson({ total, limit, offset, posts: results })
})

// GET /api/posts/:id — 单篇详情
app.get('/api/posts/:id', async (c) => {
  const a = apiAuth(c); if (!a.ok) return apiJson({ error: a.err }, 401)
  const id = parseInt(c.req.param('id'))
  const { results } = await c.env.DB.prepare('SELECT * FROM posts WHERE id = ?').bind(id).all()
  if (!results.length) return apiJson({ error: 'Post not found' }, 404)
  return apiJson({ post: results[0] })
})

// POST /api/posts — 新建文章
// body: { lang, title, content, slug?, excerpt?, date?, featured_media?, category_ids?, tag_ids?, translation_id?, status? }
app.post('/api/posts', async (c) => {
  const a = apiAuth(c); if (!a.ok) return apiJson({ error: a.err }, 401)
  let body
  try { body = await c.req.json() } catch { return apiJson({ error: 'Invalid JSON' }, 400) }
  const lang = body.lang === 'en' ? 'en' : 'zh'
  if (!body.title) return apiJson({ error: 'title required' }, 400)
  const slug = body.slug || slugify(body.title)
  // 自动生成 path: 纯 slug (2026-08-20 起新文章不带日期段)
  let path = body.path
  if (!path) {
    path = slug
  }
  // slug 唯一性: 同 lang+path 冲突则报错
  const dup = await c.env.DB.prepare('SELECT id FROM posts WHERE path = ? AND lang = ?').bind(path, lang).all()
  if (dup.results.length) return apiJson({ error: `Path already exists: ${path}`, existingId: dup.results[0].id }, 409)
  const date = body.date || new Date().toISOString().slice(0,10)
  const r = await c.env.DB.prepare(
    'INSERT INTO posts (lang, slug, title, content, excerpt, path, date, modified, status, featured_media, category_ids, tag_ids, translation_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'
  ).bind(
    lang, slug, body.title, body.content||'', body.excerpt||'', path, date,
    new Date().toISOString(), body.status||'publish',
    body.featured_media||null, JSON.stringify(body.category_ids||[]), JSON.stringify(body.tag_ids||[]),
    body.translation_id||null
  ).run()
  return apiJson({ ok: true, id: r.meta.last_row_id, path, slug, url: `/${path}/` }, 201)
})

// PUT /api/posts/:id — 更新文章
app.put('/api/posts/:id', async (c) => {
  const a = apiAuth(c); if (!a.ok) return apiJson({ error: a.err }, 401)
  const id = parseInt(c.req.param('id'))
  let body
  try { body = await c.req.json() } catch { return apiJson({ error: 'Invalid JSON' }, 400) }
  const { results } = await c.env.DB.prepare('SELECT id, path, lang FROM posts WHERE id = ?').bind(id).all()
  if (!results.length) return apiJson({ error: 'Post not found' }, 404)
  // path 变更时查重 (与 POST 一致), 防止把文章改到已有 URL 上
  if (body.path !== undefined && body.path !== results[0].path) {
    const dup = await c.env.DB.prepare('SELECT id FROM posts WHERE path = ? AND lang = ? AND id != ?').bind(body.path, results[0].lang, id).all()
    if (dup.results.length) return apiJson({ error: `Path already exists: ${body.path}`, existingId: dup.results[0].id }, 409)
  }
  const fields = ['title','content','excerpt','slug','path','date','status','featured_media','category_ids','tag_ids','translation_id']
  const sets = []; const params = []
  for (const f of fields) {
    if (body[f] !== undefined) {
      sets.push(`${f} = ?`)
      // null 表示清空字段 (SQL NULL), 不能走 JSON.stringify 变成字符串 "null"
      params.push(body[f] === null ? null : (typeof body[f] === 'object' ? JSON.stringify(body[f]) : body[f]))
    }
  }
  if (body.category_ids && Array.isArray(body.category_ids)) {
    // category_ids 已作为对象处理, 上面 JSON.stringify 覆盖
  }
  if (!sets.length) return apiJson({ error: 'No fields to update' }, 400)
  sets.push('modified = ?'); params.push(new Date().toISOString())
  params.push(id)
  await c.env.DB.prepare(`UPDATE posts SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run()
  return apiJson({ ok: true, id })
})

// DELETE /api/posts/:id — 删除文章
app.delete('/api/posts/:id', async (c) => {
  const a = apiAuth(c); if (!a.ok) return apiJson({ error: a.err }, 401)
  const id = parseInt(c.req.param('id'))
  const r = await c.env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(id).run()
  if (!r.meta.changes) return apiJson({ error: 'Post not found' }, 404)
  return apiJson({ ok: true, deleted: id })
})

// GET /api/categories — 分类列表
app.get('/api/categories', async (c) => {
  const a = apiAuth(c); if (!a.ok) return apiJson({ error: a.err }, 401)
  const { results } = await c.env.DB.prepare('SELECT * FROM categories ORDER BY id').all()
  return apiJson({ categories: results })
})

// POST /api/categories — 新建分类
app.post('/api/categories', async (c) => {
  const a = apiAuth(c); if (!a.ok) return apiJson({ error: a.err }, 401)
  let body
  try { body = await c.req.json() } catch { return apiJson({ error: 'Invalid JSON' }, 400) }
  if (!body.name) return apiJson({ error: 'name required' }, 400)
  const slug = body.slug || slugify(body.name)
  const r = await c.env.DB.prepare('INSERT INTO categories (name, slug, parent, description, count) VALUES (?,?,?,?,0)')
    .bind(body.name, slug, body.parent||0, body.description||'').run()
  return apiJson({ ok: true, id: r.meta.last_row_id, slug }, 201)
})

// GET /api/media — 媒体列表
app.get('/api/media', async (c) => {
  const a = apiAuth(c); if (!a.ok) return apiJson({ error: a.err }, 401)
  const { results } = await c.env.DB.prepare('SELECT * FROM media ORDER BY id DESC LIMIT 100').all()
  return apiJson({ media: results })
})

// POST /api/media — 上传媒体 (JSON: { filename, dataBase64, mimeType, alt?, width?, height? })
app.post('/api/media', async (c) => {
  const a = apiAuth(c); if (!a.ok) return apiJson({ error: a.err }, 401)
  let body
  try { body = await c.req.json() } catch { return apiJson({ error: 'Invalid JSON' }, 400) }
  if (!body.filename || !body.dataBase64) return apiJson({ error: 'filename and dataBase64 required' }, 400)
  const buf = Uint8Array.from(atob(body.dataBase64), ch => ch.charCodeAt(0))
  const id = Date.now() % 100000000
  const key = `media/${id}-${body.filename}`
  await c.env.R2.put(key, buf, { httpMetadata: { contentType: body.mimeType || 'application/octet-stream' } })
  // DB path 必须带 media/ 前缀: 渲染层 src="/${path}" 直接拼 URL (2026-08-16 修复)
  const path = `media/${id}-${body.filename}`
  const r = await c.env.DB.prepare('INSERT INTO media (id, filename, path, mime_type, alt, width, height) VALUES (?,?,?,?,?,?,?)')
    .bind(id, body.filename, path, body.mimeType||'', body.alt||'', body.width||null, body.height||null).run()
  return apiJson({ ok: true, id, path, url: `/${path}` }, 201)
})

// GET /api/tags — 标签列表
app.get('/api/tags', async (c) => {
  const a = apiAuth(c); if (!a.ok) return apiJson({ error: a.err }, 401)
  const { results } = await c.env.DB.prepare('SELECT * FROM tags ORDER BY id').all()
  return apiJson({ tags: results })
})

// GET /api/pages — 页面列表
app.get('/api/pages', async (c) => {
  const a = apiAuth(c); if (!a.ok) return apiJson({ error: a.err }, 401)
  const { results } = await c.env.DB.prepare('SELECT id, lang, slug, title, path, date, translation_id FROM pages ORDER BY id').all()
  return apiJson({ pages: results })
})

// 旧中文URL 301 映射 (老站 WP 中文 path -> 新站规范 URL, 数据源: Bing Webmaster GetPageStats)
const OLD_URL_REDIRECTS = {
  // 同品牌重复评测合并（2026-08-23）：中英文均单跳到流量/内容主 URL
  '/virtualcardx2026-2': '/virtualcardx2026.txt',
  '/en/virtualcardx2026-2': '/virtualcardx2026.txt',
  '/2026/07/13/coca-visa-card-review': '/2026/07/31/coca-card-review-2026',
  '/en/2026/07/13/coca-visa-card-review': '/en/2026/07/31/coca-card-review-2026',
  '/2026/07/13/paymier-cross-border-payment-virtual-card': '/2025/05/19/paymier',
  '/en/2026/07/13/paymier-cross-border-payment-virtual-card': '/en/2025/05/19/paymier',
  '/2025/02/10/nginx-\u670d\u52a1\u5668\u642d\u5efawordpress\u4f7f\u7528rank-math-seo\u63d2\u4ef6\u751f\u6210sitemaps\u9700\u8981\u8fdb\u884c\u7684\u989d\u5916': '/2025/02/10/nginx-wordpress-rank-math-sitemap-config',
  '/2025/12/02/\u514d\u8d39\u9886\u53d6\u4e00\u4e2a\u6708google-gemini\u4f01\u4e1a\u7248': '/2025/12/02/free-google-gemini-enterprise-1-month',
  '/category/virutal-credit-card/virtual-credit-card-platform-summary': '/virtual-credit-card',
  '/en/category/virutal-credit-card/virtual-credit-card-platform-summary': '/en/virtual-credit-card',
  '/en/category/virutal-credit-card/virtual-credit-card-platform-summary/page/2': '/en/virtual-credit-card',
  '/2025/02/10/nginx-\u670d\u52a1\u5668\u642d\u5efawordpress\u4f7f\u7528rank-math-seo\u63d2\u4ef6\u751f\u6210sitem': '/2025/02/10/nginx-wordpress-rank-math-sitemap-config',
  '/en/2025/07/21/\u4e00\u6587\u770b\u61c2avalanche-card\uff0c\u5168\u7403\u516c\u94fetop10\u63a8\u51fa\u7684visa\u5361': '/2025/07/21/avalanche-card-visa-crypto-guide',
  '/2025/02/08/\u4e00\u7bc7\u6587\u7ae0\u5f7b\u5e95\u5f04\u6e05\u695a\u539f\u751fip\u3001\u4f4f\u5b85ip\u3001isp-ip\u4e0ehost-ip\u5230\u5e95\u5982\u4f55': '/2025/02/08/native-ip-residential-ip-isp-host-ip-guide',
  '/2025/07/21/\u4e00\u6587\u770b\u61c2avalanche-card\uff0c\u5168\u7403\u516c\u94fetop10\u63a8\u51fa\u7684visa\u5361': '/2025/07/21/avalanche-card-visa-crypto-guide',
  '/en/2025/05/21/\u514dkyc\u865a\u62df\u4fe1\u7528\u5361\u5e73\u53f0\u63a8\u8350-\u6843\u5b50\u718ataozixiong\u865a\u62df\u5361\u5e73\u53f0': '/2025/05/21/taozixiong',
  '/en/2025/06/11/debian-\u4e0b\u914d\u7f6e-socks5-\u4ee3\u7406\u670d\u52a1\u7aef\u8f6f\u4ef6-dante': '/2025/06/11/debian-socks5-proxy-dante-setup',
  '/2025/06/11/debian-\u4e0b\u914d\u7f6e-socks5-\u4ee3\u7406\u670d\u52a1\u7aef\u8f6f\u4ef6-dante': '/2025/06/11/debian-socks5-proxy-dante-setup',
  '/en/2025/05/13/\u5982\u4f55\u514d\u8d39\u83b7\u53d6\u4e34\u65f6\u6559\u80b2\u90ae\u7bb1\uff08bbaa-edu-pl\u7ed3\u5c3e\uff09': '/2026/07/05/bbaa-edu-pl-temp-email',
  '/en/2025/04/07/\u865a\u62df\u4fe1\u7528\u5361\u5e73\u53f0\u6c47\u603b-ucards\u865a\u62df\u4fe1\u7528\u5361\u5e73\u53f0\uff08\u4f18\u5494\uff09': '/2025/04/07/ucards-virtual-credit-card-review',
  '/en/2025/05/19/\u4eb2\u6d4b-xtransfer\uff1a\u8de8\u5883\u6536\u6b3e\u7684\u9ad8\u6548\u4e4b\u9009\u4e0e\u907f\u5751\u6307\u5357': '/2026/07/05/xtransfer',
  '/en/2025/07/07/cloudflare-15\u5e74\u514d\u8d39ssl\u8bc1\u4e66\u5b8c\u6574\u7533\u8bf7\u6307\u5357': '/2025/07/07/cloudflare-free-ssl-15years',
  '/2025/05/11/\u514d\u8d39\u9886\u53d6\u8c37\u6b4cgemini\u9ad8\u7ea7\u7248\u653b\u7565\uff0c\u9644\u7f8eedu\u90ae\u7bb1\u6ce8\u518c\u6559\u7a0b': '/2025/05/11/free-google-gemini-advanced-edu-email',
  '/2025/02/10/debian-\u7cfb\u7edf\u65e0\u4eba\u503c\u5b88\u81ea\u52a8\u66f4\u65b0\u8bbe\u7f6e\u5168\u6d41\u7a0b\uff1a\u4ece\u5b89\u88c5\u5230\u914d': '/2025/02/10/debian-unattended-upgrades-setup',
  '/2025/04/07/\u865a\u62df\u4fe1\u7528\u5361\u5e73\u53f0\u6c47\u603b-ucards\u865a\u62df\u4fe1\u7528\u5361\u5e73\u53f0\uff08\u4f18\u5494\uff09': '/2025/04/07/ucards-virtual-credit-card-review',
  '/2025/04/13/win11\u7684edge\u8bbf\u95ee\u5f02\u5e38\uff0c\u663e\u793adns-\u9519\u8bef\u5982\u4f55\u5904\u7406': '/2025/04/13/win11-edge-dns-error-fix',
  '/2025/05/13/\u5982\u4f55\u514d\u8d39\u83b7\u53d6\u4e34\u65f6\u6559\u80b2\u90ae\u7bb1\uff08bbaa-edu-pl\u7ed3\u5c3e\uff09': '/2026/07/05/bbaa-edu-pl-temp-email',
  '/en/2025/05/20/\u5982\u4f55\u514d\u8d39\u89e3\u9501cursor-pro\uff0c\u544a\u522b14\u5929\u9650\u5236': '/2025/05/20/unlock-cursor-pro-free',
  '/en/2025/03/31/apache\u4e0bhttps\u53cd\u5411\u4ee3\u7406uvicorn': '/2025/03/31/apache-https-reverse-proxy-uvicorn',
  '/en/2025/02/16/\u4f18\u79c0\u7684\u865a\u62df\u4fe1\u7528\u5361\u5e73\u53f0\u63a8\u8350-hornetpay': '/2025/02/16/hornetpay-no-kyc-virtual-card-review',
  '/en/2025/04/07/\u865a\u62df\u5361\u5e73\u53f0\u6c47\u603b-valitop\u865a\u62df\u5361\u5e73\u53f0\u9cb8\u5361': '/2025/04/07/valitop-virtual-card-review',
  '/en/2025/04/07/\u865a\u62df\u5361\u5e73\u53f0\u6c47\u603b-zeptocard\u865a\u62df\u5361\u5e73\u53f0': '/2025/04/07/zeptocard-virtual-card-review',
  '/2025/05/20/\u5982\u4f55\u514d\u8d39\u89e3\u9501cursor-pro\uff0c\u544a\u522b14\u5929\u9650\u5236': '/2025/05/20/unlock-cursor-pro-free',
  '/2025/12/02/\u514d\u8d39\u9886\u53d6\u4e00\u4e2a\u6708google-gemini-\u4f01\u4e1a\u7248': '/2025/12/02/free-google-gemini-enterprise-1-month',
  '/2025/02/06/\u5728debian-12\u4e0a\u624b\u52a8\u5b89\u88c5wordpress': '/2025/02/06/install-wordpress-on-debian-12',
  '/2025/05/14/\u5982\u4f55\u4e3awordpress\u7f51\u7ad9\u5f00\u542f\u8c03\u8bd5\u6a21\u5f0f\u6392\u67e5\u9519\u8bef': '/2026/07/05/wordpress-debug-mode',
  '/2025/04/05/\u65e0\u9700kyc\u7684\u865a\u62df\u4fe1\u7528\u5361\u63a8\u8350-nexa\u865a\u62df\u4fe1\u7528\u5361': '/2025/04/05/nexa-no-kyc-virtual-card-review',
  '/en/2025/02/14/2025-\u5e74\u4e94\u6b3e\u5e38\u7528\u805a\u5408-ai-\u5e94\u7528\u8bc4\u6d4b': '/2026/07/05/ai-app-review-2025',
  '/en/2025/07/20/\u56fd\u5185\u865a\u62df\u4fe1\u7528\u5361\u5e73\u53f0\u8dd1\u8def\u68b3\u7406\u53ca\u98ce\u9669\u89c4\u907f\u5efa\u8bae': '/2026/07/05/vcc-platform-risk-warning',
  '/en/2025/05/19/\u514dkyc\u865a\u62df\u4fe1\u7528\u5361\u5e73\u53f0-cardking': '/2025/05/19/cardking',
  '/en/2025/05/21/\u8d44\u8d39\u8d85\u4f4e\u7684\u865a\u62df\u4fe1\u7528\u5361\u5e73\u53f0-4399pay': '/2025/05/21/4399pay',
  '/en/2025/04/07/\u865a\u62df\u5361\u5e73\u53f0\u6c47\u603b-visapay\u865a\u62df\u5361\u5e73\u53f0': '/2025/04/07/visapay-virtual-card-review',
  '/en/2025/04/07/\u865a\u62df\u5361\u5e73\u53f0\u6c47\u603b-cvcwallet\u865a\u62df\u5361': '/2025/04/07/cvcwallet-virtual-card-review',
  '/2025/03/31/apache\u4e0bhttps\u53cd\u5411\u4ee3\u7406uvicorn': '/2025/03/31/apache-https-reverse-proxy-uvicorn',
  '/2025/02/16/\u4f18\u79c0\u7684\u865a\u62df\u4fe1\u7528\u5361\u5e73\u53f0\u63a8\u8350-hornetpay': '/2025/02/16/hornetpay-no-kyc-virtual-card-review',
  '/2025/04/07/\u865a\u62df\u5361\u5e73\u53f0\u6c47\u603b-valitop\u865a\u62df\u5361\u5e73\u53f0\u9cb8\u5361': '/2025/04/07/valitop-virtual-card-review',
  '/en/2025/04/07/\u865a\u62df\u5361\u5e73\u53f0\u6c47\u603b-afrocard\u865a\u62df\u5361': '/2025/04/07/afrocard-virtual-card-review',
  '/2025/05/20/skype\u505c\u6b62\u8fd0\u8425\u540e\uff0c\u5916\u8d38\u4eba\u6253\u56fd\u9645\u7535\u8bdd\u600e\u4e48\u529e': '/2026/07/05/skype-alternatives-overseas-calls',
  '/2025/05/27/\u5206\u4eab\u4e00\u4e2a\u68c0\u6d4blinkedin\u8d26\u53f7\u8bc4\u5206\u7684\u7f51\u7ad9': '/2025/05/27/linkedin-account-score-checker',
  '/en/2025/04/07/\u865a\u62df\u5361\u5e73\u53f0\u6c47\u603b-icard\u865a\u62df\u5361\u5e73\u53f0': '/2025/04/07/icard-virtual-card-review',
  '/2025/04/07/\u865a\u62df\u5361\u5e73\u53f0\u6c47\u603b-visapay\u865a\u62df\u5361\u5e73\u53f0': '/2025/04/07/visapay-virtual-card-review',
  '/2025/07/20/\u5f53\u524d\u56fd\u9645\u4e3b\u6d41\u5927\u6a21\u578bapi\u8054\u7f51\u641c\u7d22\u80fd\u529b\u5206\u6790': '/2025/07/20/llm-api-web-search-comparison',
  '/2025/07/20/\u56fd\u5185\u865a\u62df\u4fe1\u7528\u5361\u5e73\u53f0\u8dd1\u8def\u68b3\u7406\u53ca\u98ce\u9669\u89c4\u907f\u5efa\u8bae': '/2026/07/05/vcc-platform-risk-warning',
  '/2025/02/14/2025-\u5e74\u4e94\u6b3e\u5e38\u7528\u805a\u5408-ai-\u5e94\u7528\u8bc4\u6d4b': '/2026/07/05/ai-app-review-2025',
  '/2025/04/07/\u865a\u62df\u5361\u5e73\u53f0\u6c47\u603b-afrocard\u865a\u62df\u5361': '/2025/04/07/afrocard-virtual-card-review',
  '/2025/06/08/\u5916\u8d38\u884c\u4e1a\u5982\u4f55\u505a\u597d\u4e00\u4efd\u5b8c\u6574\u7684\u5ba2\u6237\u80cc\u8c03\u6d41\u7a0b': '/2025/06/08/foreign-trade-customer-background-check',
  '/2025/05/14/\u5982\u4f55\u83b7\u53d6\u7a33\u5b9a\u53ef\u957f\u671f\u4f7f\u7528\u7684\u56fd\u5916\u6559\u80b2\u90ae\u7bb1': '/2026/07/05/edu-email-guide',
  '/2025/04/07/\u865a\u62df\u5361\u5e73\u53f0\u6c47\u603b-icard\u865a\u62df\u5361\u5e73\u53f0': '/2025/04/07/icard-virtual-card-review',
  '/2025/02/04/\u5982\u4f55\u5224\u65ad\u57df\u540d\u662f\u5426\u88abgoogle\u60e9\u7f5a\uff1f': '/2025/02/04/how-to-check-if-domain-penalized-by-google',
  '/en/2025/05/19/\u865a\u62df\u4fe1\u7528\u5361\u5e73\u53f0-paymier': '/2025/05/19/paymier',
  '/2025/06/01/webhostmost-\u514d\u8d39\u8ba1\u5212\u8c03\u6574': '/2025/06/01/webhostmost-free-plan-changes',
  '/2025/04/05/2025\u5e74\u5341\u6b3e\u5e38\u7528\u7684\u4e2d\u5fc3\u5316\u7535\u5b50\u94b1\u5305': '/2025/04/05/top-10-centralized-crypto-wallets-2025',
  '/en/2025/02/14/5ber-esim\u5361\u8dd1\u8def\u4e86\uff1f': '/2026/07/05/5ber-esim-solution',
  '/2025/02/13/\u865a\u62df\u4fe1\u7528\u5361\u5361\u5934\u8bc4\u6d4b\uff1a404038': '/2025/02/13/virtual-card-bin-404038-review',
  '/en/2025/02/14/vcc247\u865a\u62df\u4fe1\u7528\u5361\u5e73\u53f0': '/2025/02/14/vcc247-virtual-credit-card-review',
  '/2026/07/04/\u76ee\u524d\u56fd\u5185\u53ef\u7528\u7684\u4e2d\u8f6capi\u670d\u52a1\u5217\u8868': '/2026/07/05/china-api-proxy-list',
  '/2025/06/08/\u4e2a\u4eba\u5982\u4f55\u505a\u5916\u8d38\u63a5\u5355\uff08\u5b9e\u64cd\u6307\u5357\uff09': '/2025/06/08/how-to-do-foreign-trade-guide',
  '/en/2025/02/12/amzkeys\u865a\u62df\u5361\u5e73\u53f0': '/2025/02/12/amzkeys-virtual-card-review',
  '/2025/05/10/web3\u652f\u4ed8\u5e73\u53f0deerpay': '/2026/07/05/deerpay-web3-payment',
  '/en/2025/02/11/infini\u4e07\u4e8b\u8fbeu\u5361': '/2025/02/11/infini-mastercard-usdt-card',
  '/2025/02/14/5ber-esim\u5361\u8dd1\u8def\u4e86\uff1f': '/2026/07/05/5ber-esim-solution',
  '/2025/02/14/5ber-esim\u5361\u8dd1\u8def': '/2026/07/05/5ber-esim-solution',
  '/2025/01/31/\u5982\u4f55\u8fdb\u884cgoogle\u8d26\u53f7\u89e3\u5c01': '/2025/01/31/how-to-unban-google-account',
  '/2025/02/12/redotpay\u865a\u62df\u4fe1\u7528\u5361': '/2025/02/12/redotpay-virtual-credit-card-review',
  '/2025/02/14/vcc247\u865a\u62df\u4fe1\u7528\u5361\u5e73\u53f0': '/2025/02/14/vcc247-virtual-credit-card-review',
  '/en/2025/02/12/foton\u865a\u62df\u4fe1\u7528\u5361': '/2025/02/12/foton-virtual-credit-card-review',
  '/2025/02/12/amzkeys\u865a\u62df\u5361\u5e73\u53f0': '/2025/02/12/amzkeys-virtual-card-review',
  '/2025/02/11/mipay\u865a\u62df\u4fe1\u7528\u5361\u5e73\u53f0': '/2025/02/11/mipay-virtual-card-review',
  '/2025/02/11/infini\u4e07\u4e8b\u8fbeu\u5361': '/2025/02/11/infini-mastercard-usdt-card',
  '/en/2025/05/13/\u5982\u4f55\u83b7\u53d6\u4e34\u65f6\u90ae\u7bb1': '/2025/05/13/how-to-get-temporary-email',
  '/2025/02/12/foton\u865a\u62df\u4fe1\u7528\u5361': '/2025/02/12/foton-virtual-credit-card-review',
  '/2025/02/11/trx\u80fd\u91cf\u79df\u7528\u5e73\u53f0': '/2025/02/11/tron-trx-energy-rental-platform',
  '/2025/05/13/\u5982\u4f55\u83b7\u53d6\u4e34\u65f6\u90ae\u7bb1': '/2025/05/13/how-to-get-temporary-email',
  '/2025/02/11/\u4f18\u6613\u4ed8\u865a\u62df\u4fe1\u7528\u5361': '/2025/02/11/youyifu-virtual-credit-card-review',
  '/2025/02/11/\u52a0\u5bc6\u8d27\u5e01\u5151\u6362\u5e73\u53f0': '/2025/02/11/how-to-use-decentralized-exchange-dex',
  '/2025/05/19/worldfirst': '/2026/07/05/worldfirst',

  '/2025/05/19/airwallex': '/2026/07/05/airwallex',

  '/2025/05/19/xtransfer': '/2026/07/05/xtransfer',

  '/2025/05/19/lianlian': '/2026/07/05/lianlian',

  '/2025/05/19/skyee': '/2026/07/05/skyee',

  '/2025/05/18/photonpay': '/2026/07/05/photonpay',

  '/2025/05/19/pingpongx': '/2026/07/05/pingpongx',

  '/en/2025/05/19/airwallex': '/en/2026/07/05/airwallex',

  '/en/2025/05/19/skyee': '/en/2026/07/05/skyee',

  '/en/2025/05/19/lianlian': '/en/2026/07/05/lianlian',

  '/en/2025/05/19/worldfirst': '/en/2026/07/05/worldfirst',

  '/2026/08/02/cardking-review-2026': '/2025/05/19/cardking',

  '/en/2026/07/04/tailscale-a-simple-guide-to-network-monitoring': '/en/2026/07/04/tailscale-intranet-penetration-guide',

  '/2025/05/21/linkedin-account-restrict-reason': '/2026/07/05/linkedin-account-restrict-reason',

  '/2025/07/28/facebook-ad-check': '/2026/07/05/facebook-ad-check',

  '/en/2025/07/28/facebook-ad-check': '/en/2026/07/05/facebook-ad-check',

  '/en/2026/07/05/virtualbox-p-core-and-e-core-fix': '/en/2026/07/05/virtualbox-p-core-e-core-fix',

  '/virutal-credit-card/virtual-credit-card-platform-summary': '/virtual-credit-card',

  '/en/virutal-credit-card/virtual-credit-card-platform-summary': '/en/virtual-credit-card',

  '/virutal-credit-card/virtual-credit-card-platform-summary/page/6': '/virtual-credit-card',

  '/en/virutal-credit-card/virtual-credit-card-platform-summary/page/3': '/en/virtual-credit-card',

  '/en/virutal-credit-card/page/3': '/en/virtual-credit-card',

  '/virutal-credit-card': '/virtual-credit-card',

  '/en/virutal-credit-card': '/en/virtual-credit-card',

  '/tag/kyc-free-virtual-credit-card': '/virtual-credit-card',

  '/en/tag/solvocard': '/en/2026/07/04/solvocard-review',

};

// 英文历史 slug → 已配对的统一 canonical path（2026-08-16 双语 URL 审计）
// 仅用于 /en/ 请求，确保旧外链单跳到英文页而非中文页或 fallback。
const EN_OLD_PATH_REDIRECTS = {
  "2026/07/31/free-developer-tools-and-saas-resources-2026": "2026/07/31/free-developer-tools-saas-resources-2026",
  "2026/07/28/whatsapp-for-foreign-trade-customer-development": "2026/07/28/whatsapp-foreign-trade-customer-development",
  "2026/07/25/stripe-hk-registration-guide-for-sellers-in-china": "2026/07/25/stripe-hk-register-guide-china-seller",
  "2026/07/10/ai-overviews-of-seo-traffic-strategy": "2026/07/10/ai-overviews-seo-traffic-strategy",
  "2026/07/06/virtual-credit-card-rankings-2026": "2026/07/06/virtual-credit-card-ranking-2026",
  "2025/12/20/u-bitget0u": "2025/12/20/bitget",
  "2025/07/21/一文看懂avalanche-card，全球公链top10推出的visa卡": "2025/07/21/avalanche-card-visa-crypto-guide",
  "2025/05/22/winprocard": "2025/05/22/wintopay",
  "2025/05/21/免kyc虚拟信用卡平台推荐-桃子熊taozixiong虚拟卡平台": "2025/05/21/taozixiong",
  "2025/05/21/资费超低的虚拟信用卡平台-4399pay": "2025/05/21/4399pay",
  "2025/05/19/虚拟信用卡平台-paymier": "2025/05/19/paymier",
  "2025/05/19/免kyc虚拟信用卡平台-cardking": "2025/05/19/cardking",
  "2025/04/07/虚拟卡平台汇总-zeptocard虚拟卡平台": "2025/04/07/zeptocard-virtual-card-review",
  "2025/04/07/虚拟卡平台汇总-visapay虚拟卡平台": "2025/04/07/visapay-virtual-card-review",
  "2025/04/07/虚拟卡平台汇总-valitop虚拟卡平台鲸卡": "2025/04/07/valitop-virtual-card-review",
  "2025/04/07/虚拟信用卡平台汇总-ucards虚拟信用卡平台（优咔）": "2025/04/07/ucards-virtual-credit-card-review",
  "2025/04/07/虚拟卡平台汇总-cvcwallet虚拟卡": "2025/04/07/cvcwallet-virtual-card-review",
  "2025/04/07/虚拟卡平台汇总-afrocard虚拟卡": "2025/04/07/afrocard-virtual-card-review",
  "2025/04/07/虚拟卡平台汇总-icard虚拟卡平台": "2025/04/07/icard-virtual-card-review",
  "2025/04/06/免kyc虚拟信用卡-三只猴虚拟信用卡": "2025/04/06/three-monkeys-no-kyc-virtual-card",
  "2025/04/05/无需kyc的虚拟信用卡推荐-nexa虚拟信用卡": "2025/04/05/nexa-no-kyc-virtual-card-review",
  "2025/04/05/2025年十款常用的中心化电子钱包": "2025/04/05/top-10-centralized-crypto-wallets-2025",
  "2025/02/16/优秀的虚拟信用卡平台推荐-hornetpay": "2025/02/16/hornetpay-no-kyc-virtual-card-review",
  "2025/02/14/vcc247虚拟信用卡平台": "2025/02/14/vcc247-virtual-credit-card-review",
  "2025/02/13/虚拟信用卡卡头评测：404038": "2025/02/13/virtual-card-bin-404038-review",
  "2025/02/12/amzkeys虚拟卡平台": "2025/02/12/amzkeys-virtual-card-review",
  "2025/02/12/foton虚拟信用卡": "2025/02/12/foton-virtual-credit-card-review",
  "2025/02/12/redotpay虚拟信用卡": "2025/02/12/redotpay-virtual-credit-card-review",
  "2025/02/11/infini万事达u卡": "2025/02/11/infini-mastercard-usdt-card",
  "2025/02/11/优易付虚拟信用卡": "2025/02/11/youyifu-virtual-credit-card-review",
  "2025/02/11/mipay虚拟信用卡平台": "2025/02/11/mipay-virtual-card-review",
  // 2026-08-19 审计补充: Bing PageStats 中 404 的 EN 旧路径
  "2025/03/27/linkedin-account-recovery-guide-2025": "2025/03/27/2025-linkedin-account-recover",
  "2026/07/05/edu-email-guide-en": "2026/07/05/edu-email-guide",
  "2026/07/05/deerpay-web3-payment-review": "2026/07/05/deerpay-web3-payment",
  "2026/07/04/tailscale-networking-review-setup-guide": "2026/07/04/tailscale-intranet-penetration-guide",
  "2026/07/05/virtualbox-p-core-e-core-fix-en": "2026/07/05/virtualbox-p-core-e-core-fix",
  "2026/08/10/cardecho-virtual-credit-card-review-en": "virtual-credit-card",
}

// 旧分类 URL 301 (分类重构后: 被删除/合并的分类路径 -> 新顶级分类)
// 注意: 用兜底路由内检查, 避免 Hono 尾斜杠匹配问题
const OLD_CAT_REDIRECTS = [
  ['/virtual-credit-card/virtual-credit-card-platform-summary', '/virtual-credit-card'],
  ['/virtual-credit-card/virtual-credit-card-bin-check-and-test', '/virtual-credit-card'],
  // 拼写错误旧分类 virutal-credit-card (含分页变体, Bing 4xx 主源)
  ['/virutal-credit-card', '/virtual-credit-card'],
  ['/category/virutal-credit-card', '/virtual-credit-card'],
  ['/vps', '/technology-share'],
  ['/mobile-card', '/resource-share'],
  ['/residential-ip', '/technology-share'],
  ['/electronic-wallet', '/cryptocurrency'],
  ['/experience-sharing', '/technology-share'],
  ['/technology-share/wordpress', '/technology-share'],
  ['/technology-share/seo', '/seo'],
  ['/social-media/facebook', '/social-media'],
  ['/social-media/linkedin-account-operation', '/social-media'],
  ['/experience-sharing/foreign-trade-customer-acquisition', '/social-media'],
]

export default app

// 兜底路由
app.get('*', async (c) => {
  try {
  // 文章 slug 后误拼的 /null（旧模板遗留，bingbot 反复抓）→ 先于文章正则处理
  if (/\/null\/?$/.test(c.req.path)) {
    return c.redirect(c.req.path.replace(/\/null\/?$/, '/'), 301)
  }
  const lang = getLang(c.req.path)
  const clean = c.req.path.replace(/^\/+|\/+$/g, '')
  const postPath = clean.startsWith('en/') ? clean.slice(3) : clean

  // 已变更英文 slug 的历史 URL：单跳到配对后的统一英文 canonical URL。
  if (lang === 'en' && EN_OLD_PATH_REDIRECTS[postPath]) {
    return c.redirect(`/en/${EN_OLD_PATH_REDIRECTS[postPath]}/`, 301)
  }

  // 旧中文URL 301 (老站 WP 中文 path -> 新站规范 URL, 保留 Bing/GSC 流量)
  {
    const decodedPath = '/' + decodeURIComponent(c.req.path).replace(/^\/+|\/+$/g, '')
    const target = OLD_URL_REDIRECTS[decodedPath]
    if (target) {
      return c.redirect(/\.[a-z0-9]+$/i.test(target) ? target : `${target}/`, 301)
    }
  }

  // 旧分类 URL 301 (分类重构后)
  for (const [from, to] of OLD_CAT_REDIRECTS) {
    if (postPath === from.slice(1) || postPath.startsWith(from.slice(1) + '/')) {
      return c.redirect(`${lang==='en'?'/en':''}${to}/`, 301)
    }
  }

  // ?s= 搜索
  const s = c.req.query('s')
  if (s && s.trim()) {
    return c.html(await handleSearch(c, lang, s.trim()))
  }

  // 首页
  if (postPath === '' || postPath === 'en') {
    const html = await renderHomePage(c, lang, 1)
    return html ? c.html(html) : c.notFound()
  }

  // 页面 (按语言查询: /en/about/ 返回英文页面, /about/ 返回中文页面)
  const pageSlug = postPath.split('/')[0]
  const pageRes = await c.env.DB.prepare('SELECT slug, title, content, path FROM pages WHERE slug = ? AND lang = ? LIMIT 1').bind(pageSlug, lang).all()
  if (pageRes.results.length) {
    const pg = pageRes.results[0]
    let pageContent = pg.content
    pageContent = await rewriteImages(c, pageContent, pg.title)
    const base = baseOf(lang)
    const pageUrl = `${SITE}${base}${pg.slug}/`
    const body = `<div class="page-content"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${base}">${lang==='en'?'Home':'首页'}</a> / <span>${esc(pg.title)}</span></nav><h1 class="page-title">${esc(pg.title)}</h1>${pageContent}</div>`
    const pageType = pg.slug==='about' ? 'AboutPage' : pg.slug==='contact' ? 'ContactPage' : 'WebPage'
    const pageJsonld = { '@context':'https://schema.org', '@graph': [
      { '@type':pageType, '@id':`${pageUrl}#webpage`, url:pageUrl, name:pg.title, inLanguage:lang==='en'?'en':'zh-CN', isPartOf:{'@id':`${SITE}${base}#website`} },
      { '@type':'BreadcrumbList', itemListElement:[
        {'@type':'ListItem',position:1,name:lang==='en'?'Home':'首页',item:`${SITE}${base}`},
        {'@type':'ListItem',position:2,name:pg.title,item:pageUrl}
      ]}
    ]}
    return c.html(layout(lang, `${pg.title} - VirtualCardx`, pg.title, body, { noSidebar:true, path: `${pg.slug}/`, jsonld:pageJsonld }))
  }

  // 分类页: /slug/, /parent/child/, /slug/page/N/, /parent/child/page/N/
  const parts = postPath.split('/').filter(Boolean)
  if (parts.length >= 1 && parts.length <= 4) {
    // 分类分页: 最后两段是 page/N
    let page = 1
    let catParts = parts
    if (parts.length >= 3 && parts[parts.length-2] === 'page') {
      const parsed = parsePage(parts[parts.length-1])
      if (parsed === null) return c.notFound()
      page = parsed
      catParts = parts.slice(0, parts.length-2)
    }
    if (catParts.length >= 1 && catParts.length <= 2) {
      // /slug/page/1/ -> 301 到分类首页
      if (page === 1 && parts.length >= 3) {
        const catPath = catParts.join('/')
        return c.redirect(`${baseOf(lang)}${catPath}/`, 301)
      }
      const catHtml = await renderCategory(c, lang, catParts[0], catParts[1] || null, page)
      if (catHtml) return c.html(catHtml)
    }
  }

  // 旧日期 URL → 新 slug URL (301 单跳): 仅当 slug 版文章存在时
  const dm = postPath.match(/^(\d{4})\/(\d{2})\/(\d{2})\/(.+)$/)
  if (dm) {
    const slug = dm[4]
    const { results: np } = await c.env.DB.prepare('SELECT id FROM posts WHERE path = ? AND lang = ? AND status = \'publish\' LIMIT 1').bind(slug, lang).all()
    if (np.length) return c.redirect(`${baseOf(lang)}${slug}/`, 301)
  }

  // 文章页 (通用: 按 path 精确查询; 新文章纯 slug, 老文章日期格式)
  if (postPath) {
    const { results } = await c.env.DB.prepare('SELECT * FROM posts WHERE path = ? AND lang = ? AND status = \'publish\' LIMIT 1').bind(postPath, lang).all()
    if (!results.length) {
      // 英文版无独立记录: fallback 到中文记录 (TranslatePress 自动翻译风格)
      if (lang === 'en') {
        const { results: zhResults } = await c.env.DB.prepare('SELECT * FROM posts WHERE path = ? AND lang = \'zh\' AND status = \'publish\' LIMIT 1').bind(postPath).all()
        if (zhResults.length) {
          const zp = zhResults[0]
          const base = '/en/'
          let content = zp.content
          content = await rewriteImages(c, content, zp.title)
          const recent = await recentPosts(c, 'en')
          const body = `<article class="article">
            <div class="article-header">
              <h1>${esc(zp.title)}</h1>
              <div class="article-meta">
                <span>🕐 ${esc(fmtDate(zp.date))}</span>
                <span>✍️ Moyi Foreign Trade</span>
              </div>
            </div>
            <div class="content">${content}</div>
            <div class="article-footer">
              <a class="lang-toggle" href="/${postPath}/">🌐 阅读中文版</a>
            </div>
          </article>`
          return c.html(layout('en', `${zp.title} - VirtualCardx`,
            (zp.excerpt||'').replace(/<[^>]+>/g,'').slice(0,150), body,
            { recentPosts: recent, path: `${postPath}/` }))
        }
      }
      // 未命中: 不在此 404, 穿透到下方 WP 遗留兜底 301 / 最终 404
    }
    if (results.length) {
    const p = results[0]
    const base = baseOf(lang)
    const path = postPath
    const altHref = lang==='zh' ? `/en/${path}/` : `/${path}/`
    const curHref = lang==='zh' ? `/${path}/` : `/en/${path}/`
    const altLang = lang==='zh' ? 'en' : 'zh'
    let content = p.content
    content = await rewriteImages(c, content, p.title)
    // 特色图: 自身的; 英文无图时通过 translation_id 取配对中文文章的特色图
    let fm = p.featured_media
    if (!fm && p.translation_id) {
      const { results: pairRes } = await c.env.DB.prepare(
        'SELECT featured_media FROM posts WHERE translation_id = ? AND featured_media IS NOT NULL AND featured_media != 0 AND id != ? LIMIT 1'
      ).bind(p.translation_id, p.id).all()
      if (pairRes.length) fm = pairRes[0].featured_media
    }
    let heroHtml = ''
    let ogImageTag = ''
    let articleImage = ''
    if (fm) {
      const { results: mRes } = await c.env.DB.prepare('SELECT path, alt, width, height FROM media WHERE id = ?').bind(fm).all()
      if (mRes.length) {
        const mp = mRes[0]
        articleImage = `${SITE}/${mp.path}`
        heroHtml = `<img class="article-hero" src="/${mp.path}" alt="${esc(mp.alt || p.title)}"${mp.width&&mp.height?` width="${mp.width}" height="${mp.height}"`:''} fetchpriority="high" decoding="async">`
        ogImageTag = `<meta property="og:image" content="${SITE}/${mp.path}"><meta property="og:image:alt" content="${esc(mp.alt || p.title)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${SITE}/${mp.path}">`
      }
    }
    const recent = await recentPosts(c, lang)
    const articleUrl = `${SITE}${baseOf(lang)}${path}/`
    const articleDesc = (p.excerpt||'').replace(/<[^>]+>/g,'').slice(0,150)
    const body = `<article class="article">
      <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${base}">${lang==='en'?'Home':'首页'}</a> / <span>${esc(p.title)}</span></nav>
      <div class="article-header">
        <h1>${esc(p.title)}</h1>
        <div class="article-meta">
          <span>🕐 ${esc(fmtDate(p.date))}</span>
          <a class="author-link" href="${base}about/">✍️ ${lang==='en'?'Moyi Foreign Trade':'木易外贸'}</a>
        </div>
      </div>
      ${heroHtml}
      <div class="content">${content}</div>
      <div class="article-footer">
        <a class="lang-toggle" href="${altHref}">${altLang==='en'?'🌐 Read in English':'🌐 阅读中文版'}</a>
      </div>
    </article>`
    return c.html(layout(lang, `${p.title} - VirtualCardx`,
      articleDesc, body,
      { recentPosts: recent, path: `${path}/`, ogType: 'article',
        jsonld: { '@context':'https://schema.org', '@graph': [
          { '@type':'Article', '@id':`${articleUrl}#article`, headline:p.title.slice(0,110), description:articleDesc, url:articleUrl,
            image:articleImage ? [articleImage] : undefined,
            datePublished:(p.date||'').slice(0,10), dateModified:(p.modified||p.date||'').slice(0,10), inLanguage:lang==='en'?'en':'zh-CN',
            author:{'@type':'Person',name:lang==='en'?'Moyi Foreign Trade':'木易外贸',url:`${SITE}${base}about/`},
            publisher:{'@type':'Organization','@id':`${SITE}/#organization`,name:'VirtualCardx',logo:{'@type':'ImageObject',url:`${SITE}/media/1556-cropped-logo.png`,width:128,height:45}},
            mainEntityOfPage:{'@id':`${articleUrl}#webpage`}, isPartOf:{'@id':`${SITE}${base}#website`} },
          { '@type':'WebPage', '@id':`${articleUrl}#webpage`, url:articleUrl, name:p.title, inLanguage:lang==='en'?'en':'zh-CN', mainEntity:{'@id':`${articleUrl}#article`} },
          { '@type':'BreadcrumbList', itemListElement:[
            {'@type':'ListItem',position:1,name:lang==='en'?'Home':'首页',item:`${SITE}${base}`},
            {'@type':'ListItem',position:2,name:p.title,item:articleUrl}
          ]}
        ]},
        extraHead: `${ogImageTag}` }))
    }
  }

  // 下线文章 301（合并重复内容用; status=draft 后命中此表跳转）
  {
    const rawPath = c.req.path.replace(/^\/|\/$/g, '')
    const REDIRECTS = {
      '2025/07/07/cloudflare-free-ssl-15years': '2026/07/04/cloudflare-15-year-free-ssl-certificate-guide',
      'en/2025/07/07/cloudflare-free-ssl-15years': 'en/2026/07/04/cloudflare-15-year-free-ssl-certificate-guide',
    }
    if (REDIRECTS[rawPath]) return c.redirect(`/${REDIRECTS[rawPath]}/`, 301)
  }

  // WP 遗留路径兜底 301（Bing 4xx 根治）——仅当上面所有真实内容均未命中时才生效
  {
    const rawPath = c.req.path
    const m = rawPath.match(/^\/(en\/)?(tag|author|feed|comments|news|wp-(?:json|admin|content|includes|login\.php)|xmlrpc\.php|readme\.html|license\.txt|blog)(?:\/|$)/)
    if (m) {
      const base = m[1] || ''
      const target = m[2] === 'tag' ? `${base}virtual-credit-card/` : base
      return c.redirect(`/${target}`, 301)
    }
    const d = rawPath.match(/^\/(en\/)?\d{4}(?:\/\d{2})?(?:\/.*)?$/)
    if (d) return c.redirect(`/${d[1] || ''}`, 301)
    // 文章 slug 后误拼的 /null（旧模板遗留，bingbot 反复抓）→ 301 回文章本身
    if (/\/null\/?$/.test(rawPath)) {
      return c.redirect(rawPath.replace(/\/null\/?$/, '/'), 301)
    }
  }

  // 404
  return c.html(layout(lang, '404 Not Found - VirtualCardx', 'Page not found', `
    <div class="notfound">
      <div class="code">404</div>
      <h1>${lang==='en'?'Page not found':'页面不存在'}</h1>
      <p><a href="${baseOf(lang)}">${lang==='en'?'← Back to home':'← 返回首页'}</a></p>
    </div>`, { noSidebar:true }), 404)
  } catch (e) {
    return c.text('ERROR: ' + e.message + '\n' + (e.stack||'').split('\n').slice(0,5).join('\n'))
  }
})
