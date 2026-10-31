// virtualcardx.com 新站 Worker v3 — 专业界面重设计
// 共享布局: 导航/侧边栏/页脚 + 现代 CSS
import { Hono } from 'hono'
import { pageDescFor, categoryDescFor } from './meta-desc.js'

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
// Legacy WP-era query-param URLs (e.g. /?query-27a53e09-page=2&cst, /en/?query-...-page=3)
// still circulate in Google's index and split impressions. 301 them to the clean path.
app.use('*', async (c, next) => {
  const url = new URL(c.req.url)
  if (c.req.method === 'GET' || c.req.method === 'HEAD') {
    const keys = [...url.searchParams.keys()]
    if (keys.some((k) => /^query-[0-9a-z]+-/i.test(k))) {
      url.search = ''
      return c.redirect(url.toString(), 301)
    }
  }
  await next()
})

// Migrated off-topic posts -> personal blog (batch 1, 2026-10-24)
const BLOG_MOVED = new Map(Object.entries({
  "fibocom-l850-gl-manual-network-selection-tool": "fibocom-l850-gl-manual-network-selection-tool",
  "opera-android-free-esim-3gb-guide": "opera-android-free-esim-3gb-guide",
  "ai-subscription-comparison-2026": "ai-subscription-comparison-2026",
  "a1-croatia-esim-backup-number-guide-2026": "a1-croatia-esim-backup-number-guide-2026",
  "2026/08/04/facebook-page-monetization-guide": "facebook-page-monetization-guide",
  "2026/08/01/linkedin-content-strategy": "linkedin-content-strategy",
  "2026/07/31/free-developer-tools-saas-resources-2026": "free-developer-tools-saas-resources-2026",
  "2026/07/28/whatsapp-foreign-trade-customer-development": "whatsapp-foreign-trade-customer-development",
  "2026/07/13/ai-coding-tools-comparison-2026": "ai-coding-tools-comparison-2026",
  "2026/07/05/foreign-trade-active-marketing": "foreign-trade-active-marketing",
  "2026/07/05/ai-app-review-2025": "ai-app-review-2025",
  "2026/07/05/china-api-proxy-list": "china-api-proxy-list",
  "2026/07/05/fingerprint-browser-tools": "fingerprint-browser-tools",
  "2026/07/05/bbaa-edu-pl-temp-email": "bbaa-edu-pl-temp-email",
  "2026/07/05/edu-email-guide": "edu-email-guide",
  "2026/07/05/virus-scan-online": "virus-scan-online",
  "2026/07/05/5ber-esim-solution": "5ber-esim-solution",
  "2026/07/05/facebook-ad-check": "facebook-ad-check",
  "2026/07/05/skype-alternatives-overseas-calls": "skype-alternatives-overseas-calls",
  "2026/07/05/linkedin-account-restrict-reason": "linkedin-account-restrict-reason",
  "2026/07/05/linkedin-b2b": "linkedin-b2b",
  "2026/07/04/nofollow-link-resources": "nofollow-link-resources",
  "2026/07/04/resend-email-platform-review": "resend-email-platform-review",
  "2026/07/04/hong-kong-prepaid-sim-balance-query-codes": "hong-kong-prepaid-sim-balance-query-codes",
  "2025/12/02/github-commit-code-commands-summary": "github-commit-code-commands-summary",
  "2025/12/02/free-google-gemini-enterprise-1-month": "free-google-gemini-enterprise-1-month",
  "2025/11/09/wordpress-post-security-publish": "wordpress-post-security-publish",
  "2025/07/20/llm-api-web-search-comparison": "llm-api-web-search-comparison",
  "2025/06/11/debian-socks5-proxy-dante-setup": "debian-socks5-proxy-dante-setup",
  "2025/06/08/how-to-do-foreign-trade-guide": "how-to-do-foreign-trade-guide",
  "2025/06/08/foreign-trade-customer-background-check": "foreign-trade-customer-background-check",
  "2025/06/01/webhostmost-free-plan-changes": "webhostmost-free-plan-changes",
  "2025/05/29/google-seo-process-case-study": "google-seo-process-case-study",
  "2025/05/27/linkedin-account-score-checker": "linkedin-account-score-checker",
  "2025/05/20/unlock-cursor-pro-free": "unlock-cursor-pro-free",
  "2025/05/18/translatepress-gsc-redirect-error-fix": "translatepress-gsc-redirect-error-fix",
  "2025/05/17/perplexity-deep-research-system-prompt": "perplexity-deep-research-system-prompt",
  "2025/05/15/racknerd": "racknerd",
  "2025/05/15/cloudcone": "cloudcone",
  "2025/05/13/how-to-get-temporary-email": "how-to-get-temporary-email",
  "2025/05/11/free-google-gemini-advanced-edu-email": "free-google-gemini-advanced-edu-email",
  "2025/04/13/win11-edge-dns-error-fix": "win11-edge-dns-error-fix",
  "2025/03/31/apache-https-reverse-proxy-uvicorn": "apache-https-reverse-proxy-uvicorn",
  "2025/03/29/linux-config-network": "linux-config-network",
  "2025/03/27/2025-linkedin-account-recover": "2025-linkedin-account-recover",
  "2025/03/27/translatepress-astra-pro-compatibility": "translatepress-astra-pro-compatibility",
  "2025/02/26/ai-ppt-generator-review": "ai-ppt-generator-review",
  "2025/02/12/wp-super-cache-wp-config-fix": "wp-super-cache-wp-config-fix",
  "2025/02/10/debian-unattended-upgrades-setup": "debian-unattended-upgrades-setup",
  "2025/02/10/nginx-wordpress-rank-math-sitemap-config": "nginx-wordpress-rank-math-sitemap-config",
  "2025/02/08/native-ip-residential-ip-isp-host-ip-guide": "native-ip-residential-ip-isp-host-ip-guide",
  "2025/02/06/nginx-ip-to-domain-redirect": "nginx-ip-to-domain-redirect",
  "2025/02/06/certbot-auto-free-ssl-certificate": "certbot-auto-free-ssl-certificate",
  "2025/02/06/how-to-check-if-website-uses-cdn": "how-to-check-if-website-uses-cdn",
  "2025/02/06/install-wordpress-on-debian-12": "install-wordpress-on-debian-12",
  "2025/02/02/google-seo-keyword-strategy-steps": "google-seo-keyword-strategy-steps",
  "2025/01/31/how-to-unban-google-account": "how-to-unban-google-account",
  "bing-webmaster-tools-indexnow-guide-2026": "bing-webmaster-tools-indexnow-guide-2026",
  "2025/02/04/how-to-check-if-domain-penalized-by-google": "how-to-check-if-domain-penalized-by-google",
  "site-migration-301-sitemap-seo-guide": "site-migration-301-sitemap-seo-guide",
  "cloudflare-workers-free-api-safety-guide": "cloudflare-workers-free-api-safety-guide",
  "2026/07/24/hermes-agent-rclone-r2-cron-backup": "hermes-agent-rclone-r2-cron-backup",
  "2026/07/19/cheap-vps-2026-summer-buying-guide": "cheap-vps-2026-summer-buying-guide",
  "2026/07/16/wordpress-performance-optimization-guide": "wordpress-performance-optimization-guide",
  "2026/07/10/ai-overviews-seo-traffic-strategy": "ai-overviews-seo-traffic-strategy",
  "2026/07/04/tailscale-intranet-penetration-guide": "tailscale-intranet-penetration-guide",
  "2026/07/04/tailscale-yidi-zuwang-shice-bikeng": "tailscale-yidi-zuwang-shice-bikeng",
  "2026/07/05/virtualbox-p-core-e-core-fix": "virtualbox-p-core-e-core-fix",
  "2026/07/05/ai-content-seo-strategy": "ai-content-seo-strategy",
  "2026/07/05/wordpress-debug-mode": "wordpress-debug-mode",
  "2026/07/04/foreign-trade-practice-valve-factory-guide": "foreign-trade-practice-valve-factory-guide",
  "2026/07/04/openclaw-vps-selection-guide": "openclaw-vps-selection-guide",
  "2026/07/04/cloudflare-15-year-free-ssl-certificate-guide": "cloudflare-15-year-free-ssl-certificate-guide",
  "2026/03/01/cloudflare-astro-enable-indexnow": "cloudflare-astro-enable-indexnow",
  "2026/02/20/windows-10-11-delete-github-credentials": "windows-10-11-delete-github-credentials",
  "2025/12/09/free-subdomain-list-update": "free-subdomain-list-update",
  "2025/12/08/htaccess-redirect-http-to-https": "htaccess-redirect-http-to-https"
}))
app.use('*', async (c, next) => {
  const url = new URL(c.req.url)
  const m = url.pathname.match(/^\/(?:en\/)?(.+?)\/?$/)
  if (m && BLOG_MOVED.has(m[1])) {
    return c.redirect(`https://blog.andou.eu.org/blog/${BLOG_MOVED.get(m[1])}/`, 301)
  }
  await next()
})

// Public HTML has one canonical form: trailing slash. Keep APIs, static assets and
// extension paths untouched so only route documents are normalized.
app.use('*', async (c, next) => {
  const url = new URL(c.req.url)
  const path = url.pathname
  const isDocumentPath = !path.endsWith('/') &&
    !path.startsWith('/api/') && !path.startsWith('/media/') &&
    !path.startsWith('/media-webp/') && !path.startsWith('/search') &&
    !/\/[^/]+\.[a-z0-9]{1,10}$/i.test(path)
  if ((c.req.method === 'GET' || c.req.method === 'HEAD') && isDocumentPath) {
    url.pathname = `${path}/`
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
    if (c.res.status === 200) {
      // 浏览器每次重新验证；Cloudflare 边缘缓存 30 分钟，内容更新由受信发布客户端精准 purge。
      c.header('Cache-Control', 'public, max-age=0, must-revalidate')
      c.header('CDN-Cache-Control', 'public, max-age=1800')
    } else {
      // 404 / 5xx 不写边缘缓存：否则一次临时错误页会在 CDN 上挂 30 分钟
      c.header('Cache-Control', 'no-store')
    }
  }
})
const SITE = 'https://virtualcardx.com'

// ============ 共享 CSS ============
const CSS = `
/* ===== 字体：拉丁用自托管 IBM Plex，中文走系统黑体栈 ===== */
@font-face{font-family:'Plex Sans';src:url('/fonts/ibm-plex-sans-latin-wght-normal.woff2') format('woff2');font-weight:100 700;font-style:normal;font-display:swap}
@font-face{font-family:'Plex Mono';src:url('/fonts/ibm-plex-mono-latin-400-normal.woff2') format('woff2');font-weight:400;font-style:normal;font-display:swap}
@font-face{font-family:'Plex Mono';src:url('/fonts/ibm-plex-mono-latin-500-normal.woff2') format('woff2');font-weight:500;font-style:normal;font-display:swap}
@font-face{font-family:'Plex Mono';src:url('/fonts/ibm-plex-mono-latin-600-normal.woff2') format('woff2');font-weight:600;font-style:normal;font-display:swap}

:root{
  /* 一套石墨灰阶 + 一个信号色。这是全部颜色。 */
  --paper:#ffffff;
  --surface:#f5f7f8;
  --rule:#e2e7ec;
  --ink:#111820;
  --ink-2:#5b6774;
  --ink-3:#7c8894;
  --signal:#0f4c81;
  --fill:#0a0e12;
  --sans:'Plex Sans',-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','HarmonyOS Sans SC','Hiragino Sans GB','Source Han Sans SC','Noto Sans CJK SC','Microsoft YaHei',sans-serif;
  /* 等宽栈尾部同样挂中文黑体：否则 Windows 会把等宽标签里的中文落到宋体，
     宋体与黑体同屏出现是最容易露馅的排版事故。 */
  --mono:'Plex Mono',ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,'Liberation Mono','PingFang SC','HarmonyOS Sans SC','Hiragino Sans GB','Source Han Sans SC','Noto Sans CJK SC','Microsoft YaHei',monospace;
  --w:1152px;
}

*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-text-size-adjust:100%}
body{font-family:var(--sans);font-size:16px;font-weight:400;line-height:1.7;color:var(--ink);background:var(--paper);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
a{color:var(--signal);text-decoration:none}
a:hover{text-decoration:underline;text-underline-offset:2px;text-decoration-thickness:1px}
img{max-width:100%;height:auto;display:block}
::selection{background:var(--rule);color:var(--ink)}
:focus-visible{outline:2px solid var(--signal);outline-offset:2px}
.container{max-width:var(--w);margin:0 auto;padding:0 16px}

/* 字距只对拉丁收紧；中文压缩会挤字形 */
h1,h2,h3,h4{font-weight:600;line-height:1.25;letter-spacing:-.021em}
html[lang="zh"] h1,html[lang="zh"] h2,html[lang="zh"] h3,html[lang="zh"] h4{letter-spacing:0}

/* 标签：12px / 0.11em / 大写 / 常规字重。中文没有大写，字距收到 0.06em */
.label{font-family:var(--mono);font-size:12px;font-weight:400;letter-spacing:.11em;text-transform:uppercase;color:var(--ink-2)}
html[lang="zh"] .label{letter-spacing:.06em}

/* ===== 页头 ===== */
.site-header{border-bottom:1px solid var(--rule);background:var(--paper);position:sticky;top:0;z-index:100}
.header-inner{max-width:var(--w);margin:0 auto;padding:0 16px;height:64px;display:flex;align-items:center;gap:30px}
.logo{display:flex;align-items:center;gap:9px;font-size:15px;font-weight:600;color:var(--ink);letter-spacing:-.01em}
.logo:hover{color:var(--ink);text-decoration:none}
.logo-img{height:22px;width:auto}
.main-nav{display:flex;align-items:center;gap:26px;margin-right:auto}
.main-nav a{font-size:13px;color:var(--ink-2)}
.main-nav a:hover{color:var(--ink);text-decoration:none}
.nav-right{display:flex;align-items:center;gap:16px}
.menu-toggle{display:none;background:none;border:none;cursor:pointer;padding:6px;flex-direction:column;gap:5px}
.menu-toggle .bar{display:block;width:18px;height:1.5px;background:var(--ink);transition:transform .16s,opacity .16s}
.menu-toggle[aria-expanded="true"] .bar:nth-child(1){transform:translateY(6.5px) rotate(45deg)}
.menu-toggle[aria-expanded="true"] .bar:nth-child(2){opacity:0}
.menu-toggle[aria-expanded="true"] .bar:nth-child(3){transform:translateY(-6.5px) rotate(-45deg)}

/* 输入框：1px 边框、白底、2px 圆角、无内阴影 */
.search-box{display:flex;align-items:center}
.search-box input{width:148px;height:32px;border:1px solid var(--rule);border-radius:2px;background:var(--paper);padding:0 8px;font-size:13px;font-family:var(--sans);color:var(--ink)}
.search-box input::placeholder{color:var(--ink-2)}
.search-box input:focus-visible{outline:2px solid var(--signal);outline-offset:2px}
.search-box button{height:32px;margin-left:6px;padding:0 11px;background:var(--fill);color:#fff;border:1px solid var(--fill);border-radius:2px;font-size:12px;font-weight:600;font-family:var(--sans);cursor:pointer}
.search-box button:hover{background:var(--signal);border-color:var(--signal)}
.lang-switch{font-family:var(--mono);font-size:12px;color:var(--ink-2)}
.lang-switch:hover{color:var(--signal);text-decoration:none}

/* ===== 分类条：文字链接，一条细线收口 ===== */
.cat-bar{border-bottom:1px solid var(--rule)}
.cat-bar-inner{max-width:var(--w);margin:0 auto;padding:0 16px;height:40px;display:flex;align-items:center;gap:24px;overflow-x:auto}
.cat-bar-inner::-webkit-scrollbar{display:none}
.cat-bar a{font-size:12.5px;color:var(--ink-2);white-space:nowrap}
.cat-bar a:hover{color:var(--signal);text-decoration:none}

/* ===== 主布局：详情页 19rem 侧栏 ===== */
.layout{display:grid;grid-template-columns:minmax(0,1fr) 19rem;gap:56px;max-width:var(--w);margin:0 auto;padding:36px 16px 56px}
.layout.no-sidebar{grid-template-columns:minmax(0,1fr)}
.layout>main{min-width:0}

/* ===== Hero：不居中。左标题，右三条数字事实，共用同一条起始横线 ===== */
.hero{display:grid;grid-template-columns:minmax(0,1fr) 19rem;gap:56px;border-top:1px solid var(--rule);padding-top:26px;margin-bottom:56px}
.hero-kicker{display:inline-flex;align-items:center;gap:8px;margin-bottom:16px;font-family:var(--mono);font-size:12px;letter-spacing:.11em;text-transform:uppercase;color:var(--ink-2)}
html[lang="zh"] .hero-kicker{letter-spacing:.06em}
.hero-kicker::before{content:'';width:9px;height:9px;background:var(--signal);display:block}
.hero-title{font-size:2.7rem;line-height:1.1;font-weight:600;margin:0 0 14px;max-width:30ch}
/* 中文没有升降部，1.1 的行高会把行挤在一起 */
html[lang="zh"] .hero-title{line-height:1.18}
.hero-lede{font-size:15px;line-height:1.65;color:var(--ink-2);max-width:54ch;margin:0 0 24px}
.hero-actions{display:flex;align-items:center;gap:22px;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;height:38px;padding:0 18px;background:var(--fill);color:#fff;border:1px solid var(--fill);border-radius:2px;font-size:13px;font-weight:600;letter-spacing:.01em}
.btn:hover{background:var(--signal);border-color:var(--signal);color:#fff;text-decoration:none}
.btn-quiet{font-size:13px;color:var(--ink-2);border-bottom:1px solid var(--rule);padding-bottom:1px}
.btn-quiet:hover{color:var(--signal);border-color:var(--signal);text-decoration:none}
.facts{display:flex;flex-direction:column;min-width:0}
.fact{display:flex;align-items:baseline;justify-content:space-between;gap:14px;padding:11px 0;border-bottom:1px solid var(--rule)}
.fact:first-child{padding-top:2px}
.fact .k{font-family:var(--mono);font-size:12px;color:var(--ink-2);letter-spacing:0}
.fact .v{font-family:var(--mono);font-size:19px;font-weight:500;color:var(--ink);font-variant-numeric:tabular-nums}

/* ===== 区块标题：上细线 + 左标题 + 右计数 ===== */
.section-head{display:flex;align-items:baseline;justify-content:space-between;gap:20px;border-top:1px solid var(--rule);padding-top:11px;margin-bottom:14px}
.section-head h2{font-family:var(--mono);font-size:12px;font-weight:400;letter-spacing:.11em;text-transform:uppercase;color:var(--ink)}
html[lang="zh"] .section-head h2{font-family:var(--sans);font-size:13px;font-weight:600;letter-spacing:0}
.section-head .count{font-family:var(--mono);font-size:12px;color:var(--ink-2);font-variant-numeric:tabular-nums;white-space:nowrap}

/* ===== 列表：共享细线网格。容器 border-top+left，格子自己 border-right+bottom，
   末行不满也不会露出灰块 ===== */
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(296px,1fr));border-top:1px solid var(--rule);border-left:1px solid var(--rule)}
.cell{position:relative;display:flex;flex-direction:column;padding:22px 24px;border-right:1px solid var(--rule);border-bottom:1px solid var(--rule)}
.cell-no{font-family:var(--mono);font-size:12px;color:var(--ink-2);margin-bottom:10px;font-variant-numeric:tabular-nums}
.cell h3{font-size:16px;font-weight:600;line-height:1.36;margin:0 0 8px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.cell h3 a{color:var(--ink)}
.cell h3 a::after{content:'';position:absolute;inset:0;z-index:1}
.cell:hover h3 a{color:var(--signal)}
.cell p{font-size:13.5px;line-height:1.6;color:var(--ink-2);margin:0 0 16px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.spec{display:grid;grid-template-columns:auto 1fr;gap:5px 14px;margin:auto 0 0;padding:0}
.spec dt{font-family:var(--mono);font-size:12px;color:var(--ink-2);letter-spacing:0}
.spec dd{margin:0;font-family:var(--mono);font-size:12.5px;color:var(--ink);text-align:right;font-variant-numeric:tabular-nums}
.cell-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:16px;padding-top:11px;border-top:1px solid var(--rule);font-family:var(--mono);font-size:12px;color:var(--ink-2);font-variant-numeric:tabular-nums}
.cell-foot .arrow{color:var(--ink);display:inline-block;transition:transform .12s}
.cell:hover .arrow{transform:translateX(3px)}

/* ===== 分页：等宽数字，细线分隔，当前页用最深填充 ===== */
.pagination{display:flex;align-items:stretch;flex-wrap:wrap;border-top:1px solid var(--rule)}
.pagination a,.pagination .cur,.pagination .dots,.pagination .disabled{display:inline-flex;align-items:center;justify-content:center;min-width:36px;height:36px;padding:0 8px;border-right:1px solid var(--rule);border-bottom:1px solid var(--rule);font-family:var(--mono);font-size:12px;font-variant-numeric:tabular-nums;color:var(--ink-2)}
.pagination a:hover{background:var(--surface);color:var(--ink);text-decoration:none}
.pagination .cur{background:var(--fill);color:#fff}
.pagination .dots{color:var(--ink-2);min-width:20px}
.pagination .disabled{color:var(--ink-2)}
.pagination .page-info{margin-left:auto;padding-left:16px;display:inline-flex;align-items:center;border-bottom:1px solid var(--rule);font-family:var(--mono);font-size:12px;color:var(--ink-2);white-space:nowrap}

/* ===== 侧栏 ===== */
.sidebar{display:flex;flex-direction:column;gap:34px;position:sticky;top:88px;align-self:start}
.widget{border-top:1px solid var(--rule);padding-top:10px}
.widget h3{font-family:var(--mono);font-size:12px;font-weight:400;letter-spacing:.11em;text-transform:uppercase;color:var(--ink-2);margin:0 0 11px}
html[lang="zh"] .widget h3{font-family:var(--sans);font-size:12px;font-weight:600;letter-spacing:0}
.widget ul{list-style:none}
.widget li{font-size:13px;line-height:1.55;padding:8px 0;border-bottom:1px solid var(--rule)}
.widget li:last-child{border-bottom:none;padding-bottom:0}
.widget li a{color:var(--ink)}
.widget li a:hover{color:var(--signal);text-decoration:none}
.author-card .author-name{font-size:13px;font-weight:600;margin-bottom:6px}
.author-card p{font-size:13px;line-height:1.65;color:var(--ink-2)}
.kv{display:grid;grid-template-columns:5.5rem minmax(0,1fr);gap:9px 12px;margin:0}
.kv dt{font-family:var(--mono);font-size:12px;color:var(--ink-2)}
.kv dd{margin:0;font-family:var(--mono);font-size:12px;color:var(--ink);overflow-wrap:anywhere}

/* ===== 详情页 ===== */
.article h1{font-size:2rem;line-height:1.2;margin:0 0 12px}
html[lang="zh"] .article h1{line-height:1.32}
.article-header{margin-bottom:18px}
.article-meta{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-family:var(--mono);font-size:12px;color:var(--ink-2);font-variant-numeric:tabular-nums}
.article-meta .sep{color:var(--rule)}
.article-meta a{color:var(--ink-2)}
.article-meta a:hover{color:var(--signal)}
.breadcrumbs{font-family:var(--mono);font-size:12px;color:var(--ink-2);margin:0 0 12px;line-height:1.5}
.breadcrumbs a{color:var(--ink-2)}
.breadcrumbs a:hover{color:var(--signal)}
.article-hero{width:100%;max-height:420px;object-fit:cover;margin:22px 0;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)}
/* 手机端侧栏会堆到全文之后，所以关键事实要在标题下先给一遍 */
.only-mobile{display:none}
.content{font-size:16px;line-height:1.75}
.content h2{font-size:1.24rem;margin:36px 0 12px}
.content h3{font-size:1.06rem;margin:26px 0 10px}
.content p{margin:0 0 16px}
.content ul,.content ol{margin:0 0 16px 20px}
.content li{margin-bottom:6px}
.content img{margin:18px 0}
.content a{text-decoration:underline;text-underline-offset:2px}
.content table{display:block;width:100%;max-width:100%;overflow-x:auto;border-collapse:collapse;margin:22px 0;font-size:13px;border-top:1px solid var(--rule)}
.content th{font-weight:600;text-align:left;padding:8px 10px;border-bottom:1px solid var(--ink-3)}
.content td{padding:8px 10px;border-bottom:1px solid var(--rule)}
.content blockquote{border-left:2px solid var(--signal);padding:0 0 0 16px;margin:22px 0;color:var(--ink-2)}
.content code,pre{font-family:var(--mono);font-size:13px}
.content code{background:var(--surface);padding:1px 5px}
pre{background:var(--surface);border-left:2px solid var(--rule);padding:16px;overflow-x:auto;margin:20px 0;line-height:1.6;white-space:pre;tab-size:2}
pre code{background:none;padding:0;white-space:pre}
.article,.content,.content p,.content li,.content a,.cell,.cell h3,.cell p{overflow-wrap:anywhere;word-break:break-word;min-width:0}
.article-footer{margin-top:40px;padding-top:14px;border-top:1px solid var(--rule);font-size:13px}
.lang-toggle{font-family:var(--mono);font-size:12px;color:var(--ink-2);border-bottom:1px solid var(--rule);padding-bottom:1px}
.lang-toggle:hover{color:var(--signal);border-color:var(--signal);text-decoration:none}

/* ===== 页面 / 分类 / 搜索 ===== */
.page-title{font-size:1.75rem;margin:0 0 8px}
.page-lead{font-size:13px;color:var(--ink-2);margin:0 0 24px;max-width:62ch}
.page-content{font-size:16px;line-height:1.75}
.page-content h2{font-size:1.24rem;margin:32px 0 12px}
.page-content h3{font-size:1.06rem;margin:26px 0 10px}
.page-content p{margin:0 0 16px}
.page-content ul,.page-content ol{margin:0 0 16px 20px}
.page-content li{margin-bottom:6px}
.page-content img{margin:18px 0}
.page-content a{text-decoration:underline;text-underline-offset:2px}
.post-list{list-style:none}
.post-list li{display:flex;justify-content:space-between;align-items:baseline;gap:16px;padding:12px 0;border-bottom:1px solid var(--rule)}
.post-list a{color:var(--ink);font-size:14px}
.post-list a:hover{color:var(--signal);text-decoration:none}
.post-list time{font-family:var(--mono);font-size:12px;color:var(--ink-2);white-space:nowrap}
.empty-note{font-size:13.5px;line-height:1.7;color:var(--ink-2);padding:26px 0;max-width:56ch}
.home-hero{display:none}

/* ===== 页脚 ===== */
.site-footer{border-top:1px solid var(--rule);margin-top:64px;padding:38px 0 30px}
.footer-inner{max-width:var(--w);margin:0 auto;padding:0 16px;display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:32px}
.footer-col h4{font-family:var(--mono);font-size:12px;font-weight:400;letter-spacing:.11em;text-transform:uppercase;color:var(--ink-2);margin:0 0 11px}
html[lang="zh"] .footer-col h4{font-family:var(--sans);font-weight:600;letter-spacing:0}
.footer-col a{display:block;font-size:13px;color:var(--ink-2);margin-bottom:8px}
.footer-col a:hover{color:var(--signal);text-decoration:none}
.footer-bottom{max-width:var(--w);margin:26px auto 0;padding:14px 16px 0;border-top:1px solid var(--rule);font-family:var(--mono);font-size:12px;color:var(--ink-2)}

/* ===== 404 ===== */
.notfound{padding:68px 0;max-width:54ch}
.notfound .code{font-family:var(--mono);font-size:12px;letter-spacing:.11em;color:var(--ink-2)}
.notfound h1{font-size:1.6rem;margin:10px 0 10px}
.notfound p{font-size:14px;color:var(--ink-2);margin-bottom:20px}
.notfound .links{display:flex;flex-wrap:wrap;gap:8px 18px;font-size:13px}

/* ===== 响应式 ===== */
@media(max-width:900px){
  .layout{grid-template-columns:minmax(0,1fr);gap:0;padding:28px 16px 48px}
  .sidebar{display:none}
  .hero{grid-template-columns:minmax(0,1fr);gap:28px;margin-bottom:40px}
  .hero-title{font-size:1.5rem}
  .grid{grid-template-columns:minmax(0,1fr)}
  .only-mobile{display:grid;grid-template-columns:5.5rem minmax(0,1fr);gap:6px 12px;margin:0 0 20px;padding:12px 0;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)}
  .only-mobile dt{font-family:var(--mono);font-size:12px;color:var(--ink-2)}
  .only-mobile dd{margin:0;font-family:var(--mono);font-size:12px;color:var(--ink);text-align:right}
  .article h1{font-size:1.55rem}
}
@media(max-width:760px){
  .header-inner{height:56px;flex-wrap:wrap;padding:0 16px;gap:0}
  .main-nav{display:none;position:absolute;top:100%;left:0;right:0;background:var(--paper);flex-direction:column;align-items:stretch;gap:0;border-bottom:1px solid var(--rule);z-index:99}
  .main-nav.open{display:flex}
  .main-nav a{padding:13px 16px;border-bottom:1px solid var(--rule);font-size:14px;color:var(--ink)}
  .main-nav a:last-child{border-bottom:none}
  .menu-toggle{display:flex;order:2;margin-left:auto}
  .header-inner{position:relative}
  .nav-right{order:3;width:100%;padding:8px 0;border-top:1px solid var(--rule);gap:12px}
  .search-box{flex:1;min-width:0}
  .search-box input{width:auto;flex:1;min-width:0}
  .logo{order:1}
  .cat-bar-inner{gap:18px;padding:0 16px}
  .page-title{font-size:1.4rem}
  .cell{padding:20px 18px}
  .site-footer{margin-top:44px;padding:30px 0 24px}
  .footer-inner{padding:0 16px;gap:26px}
  .footer-bottom{padding:12px 16px 0}
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
function getLang(pathname) {
  // 精确匹配语言前缀: 旧的 startsWith('/en') 会把 /english-xxx/、/env-xxx/ 误判成英文站
  return pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'zh'
}
function baseOf(lang) { return lang==='en' ? '/en/' : '/' }
// 生成 IN (?,?,...) 占位符
function ph(n) { return new Array(n).fill('?').join(',') }
// 一次性取结果集 (批量查询用)
async function queryAll(c, sql, params) {
  return (await c.env.DB.prepare(sql).bind(...params).all()).results
}
// 常量时间字符串比较 (API Token 校验, 避免逐字符短路)
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}
// 日期格式化: 兼容 ISO (2026-08-04T02:07:35) 和可读格式 (November 21, 2025)
// 统一输出 YYYY-MM-DD: 列表里日期是等宽小字, 混排两种格式会让行看起来歪。
function fmtDate(d) {
  if (!d) return ''
  const s = String(d).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10)
  const t = Date.parse(s)
  if (!Number.isNaN(t)) {
    const dt = new Date(t)
    const p = (n) => String(n).padStart(2, '0')
    // 用本地日期: "November 21, 2025" 按本地零点解析, 走 UTC 会回退一天
    return `${dt.getFullYear()}-${p(dt.getMonth()+1)}-${p(dt.getDate())}`
  }
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
// 统一 404 页面: 与 catch-all 结尾同款。不带 canonical/hreflang, 强制 noindex。
// 之前越界分页/不存在的分类走 c.notFound()，返回 Hono 默认纯文本 —— 与站点 404 两套样式，
// 且没有 robots 指令，会被搜索引擎当成可索引的薄页面。
function notFoundHtml(c, lang) {
  const base = baseOf(lang)
  return c.html(layout(lang, '404 Not Found - VirtualCardx', 'Page not found', `
    <div class="notfound">
      <div class="code">404</div>
      <h1>${lang==='en'?"This page isn't here":'这个页面不存在'}</h1>
      <p>${lang==='en'
        ? 'The link is probably out of date, or the piece was moved somewhere else.'
        : '链接大概是过期了，或者这篇内容被挪到别处了。'}</p>
      <div class="links">
        <a href="${base}">${lang==='en'?'Home':'回到首页'}</a>
        <a href="${base}virtual-credit-card/">${lang==='en'?'Virtual card reviews':'虚拟卡评测'}</a>
        <a href="${base}about/">${lang==='en'?'About':'关于本站'}</a>
      </div>
    </div>`, { noSidebar:true, noindex:true, omitCanonical:true }), 404)
}

// 分类导航条 (中英)
const CATS_ZH = [
  ['/virtual-credit-card/', '虚拟卡评测'],
  ['/cross-border-collections/', '跨境支付收款'],
  ['/cryptocurrency/', '加密货币'],
]
const CATS_EN = [
  ['/en/virtual-credit-card/', 'Virtual Cards'],
  ['/en/cross-border-collections/', 'Payments'],
  ['/en/cryptocurrency/', 'Crypto'],
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
  const seoHead = opts.omitCanonical ? '' : `
<link rel="canonical" href="${SITE}${canonical}">
<link rel="alternate" hreflang="${lang==='en'?'zh':'en'}" href="${SITE}${altHref}">
<link rel="alternate" hreflang="${lang}" href="${SITE}${canonical}">
<link rel="alternate" hreflang="x-default" href="${SITE}${lang==='zh' ? canonical : altHref}">
<meta property="og:url" content="${SITE}${canonical}">`
  const sidebar = opts.noSidebar ? '' : `
  <aside class="sidebar">${opts.sidebar || `
    <div class="widget author-card">
      <h3>${lang==='en'?'About':'关于作者'}</h3>
      <div class="author-name">Kenneth Lau</div>
      <p>${lang==='en'
        ? 'Writes about cross-border payments and virtual cards. The cards here were opened and charged for real; where a source could not be checked, it says so.'
        : '写跨境支付和虚拟卡。这里的卡是自己开的，扣款记录在文里。核实不了的来源会标出来。'}</p>
    </div>
    <div class="widget">
      <h3>${lang==='en'?'Recent':'最近更新'}</h3>
      ${opts.recentPosts||''}
    </div>
    <div class="widget">
      <h3>${lang==='en'?'Contact':'联系'}</h3>
      <ul><li>Telegram&nbsp;&nbsp;@VirtualCardx</li></ul>
    </div>`}
  </aside>`
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${opts.noindex ? '<meta name="robots" content="noindex,follow">' : ''}
<link rel="icon" type="image/png" href="/media/1556-cropped-logo.png">
<link rel="preload" href="/fonts/ibm-plex-sans-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
${seoHead}
<meta property="og:type" content="${opts.ogType||'website'}">
<meta property="og:site_name" content="VirtualCardx">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:locale" content="${lang==='en'?'en_US':'zh_CN'}">
${(opts.extraHead||'').includes('og:image') ? '' : `<meta property="og:image" content="${SITE}/media/1556-cropped-logo.png"><meta property="og:image:alt" content="VirtualCardx">`}
<meta name="twitter:card" content="summary">
${opts.jsonld ? `<script type="application/ld+json">${JSON.stringify(opts.jsonld).replace(/</g, '\\u003c')}</script>` : ''}
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
      <a href="${base}contact/">${lang==='en'?'Contact':'联系'}</a>
    </div>
    <div class="footer-col">
      <h4>${lang==='en'?'Categories':'分类'}</h4>
      ${catLinks}
    </div>
    <div class="footer-col">
      <h4>${lang==='en'?'Legal':'条款'}</h4>
      <a href="${base}terms/">${lang==='en'?'Terms of use':'使用条款'}</a>
      <a href="${base}privacy-policy/">${lang==='en'?'Privacy policy':'隐私政策'}</a>
    </div>
  </div>
  <div class="footer-bottom">© ${new Date().getFullYear()} VirtualCardx</div>
</footer>
<script>
(function(){
  var btn=document.querySelector('.menu-toggle'), nav=document.getElementById('mainNav');
  if(!btn||!nav) return;
  function close(){ nav.classList.remove('open'); btn.setAttribute('aria-expanded','false'); }
  btn.addEventListener('click', function(e){
    e.stopPropagation();
    var open=nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', open?'true':'false');
  });
  nav.addEventListener('click', function(e){ if(e.target.tagName==='A') close(); });
  document.addEventListener('click', function(e){
    if(!nav.classList.contains('open')) return;
    if(!nav.contains(e.target) && !btn.contains(e.target)) close();
  });
  document.addEventListener('keydown', function(e){ if(e.key==='Escape') close(); });
})();
</script>
</body>
</html>`
}

// 侧边栏最新文章
async function recentPosts(c, lang, limit=5) {
  const { results } = await c.env.DB.prepare(
    'SELECT slug, title, path, sticky FROM posts WHERE lang = ? AND status="publish" ORDER BY sticky DESC, date DESC LIMIT ?'
  ).bind(lang, limit).all()
  const base = baseOf(lang)
  const items = results.map(p => `<li><a href="${base}${p.path}/">${esc(p.title)}</a></li>`).join('')
  return `<ul class="recent-list">${items}</ul>`
}

// 图片重写 (支持 src 和 data-src, 以及 srcset)
// 查询批量化: 每篇文章最多 2 次 D1 查询 (旧实现每张图 2 次), 避免图多的文章顶到
// Workers 单请求 subrequest 上限。
async function rewriteImages(c, html, fallbackAlt='') {
  // 1) 旧 WP 上传路径 -> 现存 media.path (一次 IN 查询)
  const re = /\/wp-content\/uploads\/[^"'\s)]+/g
  const found = [...new Set(html.match(re) || [])]
  if (found.length) {
    const byName = new Map() // filename -> [oldPath]
    for (const oldPath of found) {
      let fname = oldPath.split('/').pop().split('?')[0]
      fname = fname.replace(/-\d+x\d+(?=\.[a-zA-Z]+$)/, '')
      if (!byName.has(fname)) byName.set(fname, [])
      byName.get(fname).push(oldPath)
    }
    const rows = await queryAll(c,
      `SELECT filename, path FROM media WHERE filename IN (${ph(byName.size)})`, [...byName.keys()])
    const pathByFilename = new Map(rows.map(r => [r.filename, r.path]))
    for (const [fname, oldPaths] of byName) {
      const newPath = pathByFilename.get(fname)
      if (!newPath) continue
      for (const oldPath of oldPaths) html = html.split(oldPath).join('/' + newPath)
    }
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
  // 4) 从 media 表补准确尺寸与空 alt，降低 CLS 并改善可访问性 (一次 IN 查询)
  const imageTags = [...new Set(html.match(/<img\b[^>]*>/gi) || [])]
  const tagToPath = new Map() // img tag -> media 表里的 path
  for (const tag of imageTags) {
    const srcMatch = tag.match(/\ssrc=["']\/?([^"']+)["']/i)
    if (!srcMatch || !srcMatch[1].startsWith('media/')) continue
    let mediaPath
    try { mediaPath = decodeURIComponent(srcMatch[1]) } catch { mediaPath = srcMatch[1] }
    tagToPath.set(tag, mediaPath)
  }
  if (tagToPath.size) {
    const mediaPaths = [...new Set(tagToPath.values())]
    const rows = await queryAll(c,
      `SELECT path, width, height, alt FROM media WHERE path IN (${ph(mediaPaths.length)})`, mediaPaths)
    const metaByPath = new Map(rows.map(r => [r.path, r]))
    for (const [tag, mediaPath] of tagToPath) {
      const media = metaByPath.get(mediaPath)
      if (!media) continue
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

// 列表卡片渲染 (首页/分类/搜索共用)。
// 一次批量取 media 与中文配对信息，替代原实现"每张卡片 2~3 次查询"的 N+1：
// 一页 10 篇从最多 ~30 次查询降到 2 次。
// opts: { showCat, showZhTag, lcpFirst }
// 列表单元（网格里的一格）。刻意不放缩略图：这一列读的是数字和规格，
// 一张 4:3 的配图会把格子撑成落地页卡片。
// 查询固定 2 次（配对摘要 + 分类名称），不随文章数增长。
async function renderPostCards(c, lang, posts, opts = {}) {
  const base = baseOf(lang)
  // 英文文章没有摘要时回退到中文配对
  const needPair = new Set()
  for (const p of posts) {
    if (lang === 'en' && p.translation_id && !excerptText(p.excerpt)) needPair.add(p.translation_id)
  }
  const pairExcerpt = new Map()
  if (needPair.size) {
    const rows = await queryAll(c,
      `SELECT translation_id, excerpt FROM posts WHERE lang = 'zh' AND translation_id IN (${ph(needPair.size)})`,
      [...needPair])
    for (const r of rows) {
      if (!pairExcerpt.get(r.translation_id) && r.excerpt) pairExcerpt.set(r.translation_id, r.excerpt)
    }
  }
  // 分类 id -> 名称（只有 3 个分类，一次全表查询比每篇 JOIN 便宜）
  const catName = new Map()
  if (opts.showCat) {
    const rows = await queryAll(c, 'SELECT id, name FROM categories', [])
    for (const r of rows) catName.set(r.id, r.name)
  }
  const catOf = (p) => {
    if (!catName.size || !p.category_ids) return ''
    let ids = []
    try { ids = JSON.parse(p.category_ids) || [] } catch { ids = [] }
    for (const id of ids) if (catName.has(id)) return catName.get(id)
    return ''
  }
  // 阅读时长：按每分钟 400 字估算正文字数
  const readMin = (p) => {
    const n = Number(p.body_len) || 0
    if (!n) return ''
    return Math.max(1, Math.round(n / 400))
  }
  return posts.map((p, i) => {
    const excerpt = excerptText(p.excerpt, 120) || (p.translation_id ? excerptText(pairExcerpt.get(p.translation_id), 120) : '')
    const cat = catOf(p)
    const min = readMin(p)
    const zhTag = opts.showZhTag && p.isZhFallback
      ? `<span class="tag">${lang === 'en' ? 'ZH source' : '中文原文'}</span>` : ''
    const spec = [
      cat ? `<dt>${lang === 'en' ? 'Filed' : '分类'}</dt><dd>${esc(cat)}</dd>` : '',
      `<dt>${lang === 'en' ? 'Updated' : '更新'}</dt><dd>${esc(fmtDate(p.date))}</dd>`,
      Number(p.body_len) ? `<dt>${lang === 'en' ? 'Length' : '正文'}</dt><dd>${Number(p.body_len)} ${lang === 'en' ? 'chars' : '字'}</dd>` : ''
    ].join('')
    return `<article class="cell">
      <h3><a href="${base}${p.path}/">${esc(p.title)}</a></h3>
      ${excerpt ? `<p>${esc(excerpt)}</p>` : ''}
      <dl class="spec">${spec}</dl>
      <div class="cell-foot">
        <span>${min ? (lang === 'en' ? `${min} min read` : `约 ${min} 分钟`) : (lang === 'en' ? 'Review' : '评测')}${zhTag}</span>
        <span class="arrow" aria-hidden="true">&#8594;</span>
      </div>
    </article>`
  }).join('')
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
  headers.set('Vary', 'Accept') // 图片按 Accept 协商 WebP；AVIF 需先有 media-avif/ 生成管线，暂不声明
  return new Response(obj.body, { headers })
})

// 搜索 (统一入口): 与 ?s= 共用同一套卡片式结果页 + 双语文案 + noindex。
// 旧实现是另一套纯列表、缩略图缺失、空结果只写英文 "No results found"。
app.get('/search', async (c) => {
  const lang = getLang(c.req.path)
  // 兼容 WP 风格 s 参数与 q 参数,避免 /search/?s=xx 被丢参 302 回首页
  const q = (c.req.query('q') || c.req.query('s') || '').trim()
  if (!q) return c.redirect(baseOf(lang), 302)
  return c.html(await handleSearch(c, lang, q))
})

// 站内搜索 (WP 兼容 ?s= 与新版 /search?q= 共用)
async function handleSearch(c, lang, q) {
  const results = await queryAll(c,
    'SELECT slug, title, excerpt, path, date, category_ids, translation_id, length(content) AS body_len FROM posts WHERE lang = ? AND status="publish" AND (title LIKE ? OR content LIKE ?) ORDER BY sticky DESC, date DESC LIMIT 20',
    [lang, `%${q}%`, `%${q}%`])
  const cards = await renderPostCards(c, lang, results, { showCat: true })
  const count = results.length
  const listHtml = cards
    ? `<div class="grid">${cards}</div>`
    : `<p class="empty-note">${lang==='en'
      ? `Nothing matched “${esc(q)}”. Try a card name, or a shorter phrase.`
      : `没有匹配 “${esc(q)}” 的内容。可以试试平台名，或者把关键词缩短一点。`}</p>`
  const sectionHead = cards
    ? `<div class="section-head"><h2>${lang==='en'?'Matches':'匹配条目'}</h2><span class="count">${String(count).padStart(2,'0')}</span></div>`
    : ''
  const heading = lang==='en' ? `Results for “${esc(q)}”` : `“${esc(q)}” 的搜索结果`
  const body = `<h1 class="page-title">${heading}</h1>${sectionHead}${listHtml}`
  const searchDesc = lang==='en'
    ? `Search results for “${q}” on VirtualCardx. Browse related virtual card reviews, payment guides, and practical tutorials.`
    : `VirtualCardx 站内“${q}”搜索结果，查找相关虚拟卡评测、跨境支付指南与实用教程。`
  return layout(lang, `${q} - VirtualCardx`, searchDesc, body, { noSidebar:true, path: `?s=${encodeURIComponent(q)}`, noindex:true })
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
    'SELECT slug, title, path, date, category_ids, translation_id, excerpt, sticky, length(content) AS body_len FROM posts WHERE lang = ? AND status="publish" ORDER BY sticky DESC, date DESC'
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
  // 与首页一致：date 混存 ISO 与可读格式，统一在 JS 里按 sticky/日期重排
  filtered.sort((a, b) => (b.sticky||0) - (a.sticky||0) || dateTs(b.date) - dateTs(a.date))
  // 分页: 每页 10 篇
  const perPage = 10
  const totalPages = Math.max(1, Math.ceil(filtered.length/perPage))
  if (page > totalPages) return null
  const pageItems = filtered.slice((page-1)*perPage, page*perPage)
  // 分类 URL 前缀 (分页用)
  const catPath = childSlug ? `${parentSlug}/${childSlug}` : parentSlug
  const catUrl = `${base}${catPath}/`
  // 渲染网格 (摘要配对回退在 renderPostCards 内批量处理)
  const cards = await renderPostCards(c, lang, pageItems, { showZhTag: true })
  const listHtml = cards
    ? `<div class="grid">${cards}</div>`
    : `<p class="empty-note">${lang==='en'?'Nothing filed under this category yet.':`这个分类下还没有文章。`}</p>`
  // 分页导航 (统一组件)
  const urlFor = (p) => p === 1 ? catUrl : `${catUrl}page/${p}/`
  const pagination = renderPagination(page, totalPages, urlFor, { showInfo: true })
  // 分类名: 英文用映射表, 中文用数据库名; 子分类 slug 用于查找英文名
  let name = catRes.results[0].name
  if (lang === 'en') {
    const nameSlug = childSlug || parentSlug
    name = CATEGORY_NAMES_EN[nameSlug] || name
  }
  const lead = categoryDescFor(lang, childSlug || parentSlug)
  const sectionHead = `<div class="section-head"><h2>${lang==='en'?'Entries':'条目'}</h2><span class="count">${String(pageItems.length).padStart(2,'0')} / ${filtered.length}</span></div>`
  const body = `<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${base}">${lang==='en'?'Home':'首页'}</a> / <span>${esc(name)}</span></nav><h1 class="page-title">${esc(name)}</h1>${lead?`<p class="page-lead">${esc(lead)}</p>`:''}${sectionHead}${listHtml}${pagination}`
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
    ? (lang==='en'
      ? `Page ${page} of ${name}.`
      : `${name}第 ${page} 页。`)
    : (categoryDescFor(lang, childSlug || parentSlug) || `${name} category on VirtualCardx`)
  return layout(lang, pageTitle, pageDesc, body, { noSidebar:true, path: canonicalPath, jsonld: categoryJsonld })
}

// 日期排序键。posts.date 混存 ISO 与 "November 21, 2025" 两种格式，
// SQL 的字符串排序会把后者排到最前，所以统一在 JS 里解析。
function dateTs(d) {
  const s = String(d || '')
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return Date.parse(s.slice(0, 10))
  return Date.parse(s) || 0
}

// 首页 + 分页
async function renderHomePage(c, lang, page) {
  const base = baseOf(lang)
  const perPage = 10
  const offset = (page-1)*perPage
  const COLS = 'slug, title, excerpt, path, date, category_ids, translation_id, sticky, length(content) AS body_len'
  let results
  if (lang === 'en') {
    // 英文首页仅展示真实英文文章：日期格式文章，或有翻译配对的新版纯 slug 文章
    const isRealArticle = (p) => /^\d{4}\/\d{2}\/\d{2}\//.test(p.path) || (!p.path.includes('/') && p.translation_id != null)
    results = (await queryAll(c, `SELECT ${COLS} FROM posts WHERE lang = ? AND status = 'publish'`, ['en']))
      .filter(isRealArticle)
  } else {
    results = await queryAll(c, `SELECT ${COLS} FROM posts WHERE lang = ? AND status = 'publish'`, [lang])
  }
  results.sort((a, b) => (b.sticky||0) - (a.sticky||0) || dateTs(b.date) - dateTs(a.date))
  const total = results.length
  const totalPages = Math.max(1, Math.ceil(total/perPage))
  if (page > totalPages) return null
  const pageItems = results.slice(offset, offset+perPage)
  const cards = await renderPostCards(c, lang, pageItems, { showCat: true })
  // 分页导航 (统一组件)
  const urlFor = (p) => p === 1 ? base : `${base}page/${p}/`
  const pagination = renderPagination(page, totalPages, urlFor, { showInfo: true })
  // Hero：左边是标题和两条事实型入口，右边是一列数字。左右共用顶部那条细线。
  // 首条是置顶文章，日期不一定最新 —— 这里要的是真正的最大日期
  const latestDate = fmtDate(results.reduce((acc, p) => (dateTs(p.date) > dateTs(acc) ? p.date : acc), ''))
  const heroSection = page === 1 ? `
<section class="hero">
  <div>
    <div class="hero-kicker">${lang==='en'?'Virtual cards':'虚拟卡'}</div>
    <h1 class="hero-title">${lang==='en'
      ? 'What each virtual card is actually like to use'
      : '每家虚拟卡实际用起来是什么样'}</h1>
    <p class="hero-lede">${lang==='en'
      ? 'Numbers come from cards we opened ourselves. Fees are worked out from actual charges; where KYC stalled and how long funding took are recorded per card. Anything we could not verify is marked unverified.'
      : '数字来自我们自己开的卡。费率按实际扣款算，KYC 和到账时间记在各篇里。核实不了的说法会标出来。'}</p>
    <div class="hero-actions">
      <a class="btn" href="${base}virtual-credit-card/">${lang==='en'?'Browse the archive':'进入评测目录'}</a>
      <a class="btn-quiet" href="${base}about/">${lang==='en'?'How these are tested':'评测是怎么做的'}</a>
    </div>
  </div>
  <div class="facts">
    <div class="fact"><span class="k">${lang==='en'?'Entries':'收录条目'}</span><span class="v">${total}</span></div>
    <div class="fact"><span class="k">${lang==='en'?'Last update':'最近更新'}</span><span class="v">${esc(latestDate)}</span></div>
    <div class="fact"><span class="k">${lang==='en'?'Categories':'分类'}</span><span class="v">${String((lang==='en'?CATS_EN:CATS_ZH).length).padStart(2,'0')}</span></div>
  </div>
</section>` : `<h1 class="page-title">${lang==='en'?`Archive, page ${page}`:`文章归档第 ${page} 页`}</h1>`
  // 区块头：上细线 + 左侧标题 + 右侧「本页 / 总数」
  const shown = pageItems.length
  const sectionHead = `<div class="section-head">
    <h2>${page>1?(lang==='en'?'Older entries':'更早的条目'):(lang==='en'?'Latest entries':'最新条目')}</h2>
    <span class="count">${String(shown).padStart(2,'0')} / ${total}</span>
  </div>`
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
  const body = heroSection + sectionHead + `<div class="grid">${cards}</div>` + pagination
  const pageTitle = page>1
    ? (lang==='en' ? `Archive, page ${page} - VirtualCardx` : `文章归档第 ${page} 页 - VirtualCardx`)
    : (lang==='en' ? 'VirtualCardx | Virtual card records: fees, KYC, funding' : '虚拟信用卡实测记录：费率、KYC、充值到账 | VirtualCardx')
  const pageDesc = page>1
    ? (lang==='en' ? `Archive page ${page}.` : `文章归档第 ${page} 页。`)
    : (lang==='en' ? 'What each virtual card is like to use: fee maths, where KYC stalls, funding time, and what trips risk checks.' : '各家虚拟卡实际用起来是什么样：费率怎么算、KYC 卡在哪、充值多久到账、什么情况会被风控。')
  return layout(lang,
    pageTitle,
    pageDesc,
    body, { noSidebar: true, path: page>1?`page/${page}/`:'', jsonld: homeJsonld })
}

// ============ 具体路由 ============
app.get('/page/:n', async (c) => {
  const lang = getLang(c.req.path)
  const page = parsePage(c.req.param('n'))
  if (page === null) return notFoundHtml(c, lang)
  // /page/1/ -> 301 到首页 (消除重复内容)
  if (page === 1) return c.redirect(lang==='en' ? '/en/' : '/', 301)
  const html = await renderHomePage(c, lang, page)
  return html ? c.html(html) : notFoundHtml(c, lang)
})
app.get('/en/page/:n', async (c) => {
  const page = parsePage(c.req.param('n'))
  if (page === null) return notFoundHtml(c, 'en')
  if (page === 1) return c.redirect('/en/', 301)
  const html = await renderHomePage(c, 'en', page)
  return html ? c.html(html) : notFoundHtml(c, 'en')
})

// /category/:slug 重定向
app.get('/category/:slug', async (c) => {
  const slug = c.req.param('slug')
  if (slug === 'virutal-credit-card') return c.redirect('/virtual-credit-card/', 301)
  const { results } = await c.env.DB.prepare('SELECT id FROM categories WHERE slug = ? AND parent = 0').bind(slug).all()
  if (!results.length) return notFoundHtml(c, 'zh')
  return c.redirect(`/${slug}/`, 301)
})

app.get('/en/category/:slug', async (c) => {
  const slug = c.req.param('slug')
  if (slug === 'virutal-credit-card') return c.redirect('/en/virtual-credit-card/', 301)
  const { results } = await c.env.DB.prepare('SELECT id FROM categories WHERE slug = ? AND parent = 0').bind(slug).all()
  if (!results.length) return notFoundHtml(c, 'en')
  return c.redirect(`/en/${slug}/`, 301)
})

// virutal 拼写重定向
app.get('/virutal-credit-card/:rest*', (c) => {
  const rest = c.req.path.replace('/virutal-credit-card','')
  // 汇总页/分页直接指到最终分类页 (单跳, 避免二次 301)
  if (rest.startsWith('/virtual-credit-card-platform-summary')) return c.redirect('/virtual-credit-card/', 301)
  // 空 rest 必须补尾斜杠, 否则会先跳到 /virtual-credit-card 再被尾斜杠规则 301 一次
  return c.redirect(`/virtual-credit-card${rest || '/'}`, 301)
})
app.get('/virutal-credit-card', (c) => c.redirect('/virtual-credit-card/', 301))
app.get('/en/virutal-credit-card/:rest*', (c) => {
  const rest = c.req.path.replace('/en/virutal-credit-card','')
  if (rest.startsWith('/virtual-credit-card-platform-summary')) return c.redirect('/en/virtual-credit-card/', 301)
  return c.redirect(`/en/virtual-credit-card${rest || '/'}`, 301)
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
  const staticSlugs = ['about','contact','terms','privacy-policy','virtual-credit-card','cryptocurrency','cross-border-collections']
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
  lines.push('> 虚拟信用卡、跨境收款和稳定币充值的实测记录。英文版在 /en/。')
  lines.push('')
  lines.push('## 分类')
  lines.push('')
  lines.push('- [虚拟卡评测](https://virtualcardx.com/virtual-credit-card/): 开卡流程、费率、充值方式、封卡风险')
  lines.push('- [跨境支付与收款](https://virtualcardx.com/cross-border-collections/): 收款平台开户、费率、提现时效')
  lines.push('- [加密货币](https://virtualcardx.com/cryptocurrency/): U 卡、稳定币充值、链上手续费')
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
  if (!safeEqual(auth, `Bearer ${token}`)) return { ok: false, err: 'Unauthorized' }
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
    `SELECT id, lang, slug, title, excerpt, path, date, modified, status, featured_media, category_ids, tag_ids, translation_id, sticky FROM posts WHERE ${where} ORDER BY sticky DESC, date DESC LIMIT ? OFFSET ?`
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
    'INSERT INTO posts (lang, slug, title, content, excerpt, path, date, modified, status, featured_media, category_ids, tag_ids, translation_id, sticky) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
  ).bind(
    lang, slug, body.title, body.content||'', body.excerpt||'', path, date,
    new Date().toISOString(), body.status||'publish',
    body.featured_media||null, JSON.stringify(body.category_ids||[]), JSON.stringify(body.tag_ids||[]),
    body.translation_id||null, Number.isFinite(body.sticky) ? body.sticky : 0
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
  const fields = ['title','content','excerpt','slug','path','date','status','featured_media','category_ids','tag_ids','translation_id','sticky']
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

// 媒体 id 生成: 旧的 Date.now() % 1e8 每 27.8 小时循环一次，隔天上传撞主键并覆盖 R2 对象。
// 毫秒时间戳 * 1000 + 3 位随机数，仍在 Number.MAX_SAFE_INTEGER (9e15) 之内。
function newMediaId() {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000)
}

// POST /api/media — 上传媒体 (JSON: { filename, dataBase64, mimeType, alt?, width?, height? })
app.post('/api/media', async (c) => {
  const a = apiAuth(c); if (!a.ok) return apiJson({ error: a.err }, 401)
  let body
  try { body = await c.req.json() } catch { return apiJson({ error: 'Invalid JSON' }, 400) }
  if (!body.filename || !body.dataBase64) return apiJson({ error: 'filename and dataBase64 required' }, 400)
  if (typeof body.dataBase64 !== 'string' || body.dataBase64.length > 14_000_000) {
    return apiJson({ error: 'File too large: max ~10MB (dataBase64)' }, 413)
  }
  const mime = String(body.mimeType || '')
  if (mime && !/^image\//i.test(mime)) return apiJson({ error: 'Only image/* uploads are accepted' }, 415)
  let buf
  try { buf = Uint8Array.from(atob(body.dataBase64), ch => ch.charCodeAt(0)) }
  catch { return apiJson({ error: 'dataBase64 is not valid base64' }, 400) }
  // 去掉路径分隔符，避免 R2 key 逃出 media/ 前缀
  const filename = String(body.filename).replace(/[\\/]+/g, '_').slice(0, 160)
  const dim = (v) => (Number.isFinite(v) && v > 0 ? Math.round(v) : null)
  // 先占 id (主键唯一约束保证不撞)，再写 R2；写 R2 失败则回滚 DB 记录，避免留下死链
  let id = null
  for (let attempt = 0; attempt < 5 && id === null; attempt++) {
    const candidate = newMediaId()
    try {
      await c.env.DB.prepare('INSERT INTO media (id, filename, path, mime_type, alt, width, height) VALUES (?,?,?,?,?,?,?)')
        .bind(candidate, filename, `media/${candidate}-${filename}`, mime, body.alt || '', dim(body.width), dim(body.height)).run()
      id = candidate
    } catch {
      if (attempt === 4) return apiJson({ error: 'Could not allocate a unique media id' }, 500)
    }
  }
  // DB path 必须带 media/ 前缀: 渲染层 src="/${path}" 直接拼 URL (2026-08-16 修复)
  const path = `media/${id}-${filename}`
  try {
    await c.env.R2.put(path, buf, { httpMetadata: { contentType: mime || 'application/octet-stream' } })
  } catch (e) {
    await c.env.DB.prepare('DELETE FROM media WHERE id = ?').bind(id).run().catch(() => {})
    return apiJson({ error: 'R2 upload failed: ' + (e && e.message ? e.message : 'unknown') }, 502)
  }
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

// 兜底路由 (catch-all)。必须最后注册；export default 统一放在文件末尾，
// 避免"先导出、后注册"这种靠模块求值顺序兜着的隐式依赖。
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
    return html ? c.html(html) : notFoundHtml(c, lang)
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
    return c.html(layout(lang, `${pg.title} - VirtualCardx`, pageDescFor(lang, pg.slug) || pg.title, body, { noSidebar:true, path: `${pg.slug}/`, jsonld:pageJsonld }))
  }

  // 分类页: /slug/, /parent/child/, /slug/page/N/, /parent/child/page/N/
  const parts = postPath.split('/').filter(Boolean)
  if (parts.length >= 1 && parts.length <= 4) {
    // 分类分页: 最后两段是 page/N
    let page = 1
    let catParts = parts
    if (parts.length >= 3 && parts[parts.length-2] === 'page') {
      const parsed = parsePage(parts[parts.length-1])
      if (parsed === null) return notFoundHtml(c, lang)
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
          const plainZh = String(zp.content || '').replace(/<[^>]+>/g, '').replace(/\s+/g, '')
          const readMinZh = Math.max(1, Math.round(plainZh.length / 400))
          const body = `<article class="article">
            <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/en/">Home</a> / <span>${esc(zp.title)}</span></nav>
            <div class="article-header">
              <h1>${esc(zp.title)}</h1>
              <div class="article-meta">
                <span>${esc(fmtDate(zp.date))}</span>
                <span class="sep">/</span>
                <span>Kenneth Lau</span>
                <span class="sep">/</span>
                <span>${readMinZh} min read</span>
              </div>
              <dl class="only-mobile">
                <dt>Updated</dt><dd>${esc(fmtDate(zp.date))}</dd>
                <dt>Source</dt><dd>Chinese original</dd>
                <dt>Read</dt><dd>${readMinZh} min</dd>
              </dl>
            </div>
            <div class="content">${content}</div>
            <div class="article-footer">
              <a class="lang-toggle" href="/${postPath}/">阅读中文版</a>
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
    const publishedDate = (p.date || '').slice(0,10)
    const storedModifiedDate = (p.modified || '').slice(0,10)
    // Imported records can carry a stale modified timestamp. Schema dates must never run backwards.
    const modifiedDate = storedModifiedDate >= publishedDate ? storedModifiedDate : publishedDate
    // 正文字数：只算可见文本，用来给"读多久"这个事实
    const plain = String(p.content || '').replace(/<[^>]+>/g, '').replace(/\s+/g, '')
    const wordCount = plain.length
    const readMin = Math.max(1, Math.round(wordCount / 400))
    // 分类名（一篇文章通常挂 1 个）
    let catLabel = ''
    try {
      const ids = JSON.parse(p.category_ids || '[]') || []
      if (ids.length) {
        const { results: cr } = await c.env.DB.prepare(
          `SELECT name FROM categories WHERE id IN (${ph(ids.length)})`
        ).bind(...ids).all()
        catLabel = cr.map(r => r.name).slice(0, 2).join(' / ')
      }
    } catch { catLabel = '' }
    // 手机上侧栏会堆到全文之后，所以关键事实要在标题下面先给一遍
    const factSummary = `<dl class="only-mobile">
      <dt>${lang==='en'?'Updated':'更新'}</dt><dd>${esc(fmtDate(p.date))}</dd>
      ${catLabel?`<dt>${lang==='en'?'Filed':'分类'}</dt><dd>${esc(catLabel)}</dd>`:''}
      <dt>${lang==='en'?'Read':'预计'}</dt><dd>${lang==='en'?`${readMin} min`:`${readMin} 分钟`}</dd>
    </dl>`
    const articleSidebar = `
      <div class="widget">
        <h3>${lang==='en'?'Record':'条目信息'}</h3>
        <dl class="kv">
          <dt>${lang==='en'?'Updated':'更新'}</dt><dd>${esc(modifiedDate)}</dd>
          <dt>${lang==='en'?'First run':'首发'}</dt><dd>${esc(publishedDate)}</dd>
          ${catLabel?`<dt>${lang==='en'?'Filed':'分类'}</dt><dd>${esc(catLabel)}</dd>`:''}
          <dt>${lang==='en'?'Length':'正文'}</dt><dd>${wordCount} ${lang==='en'?'chars':'字'}</dd>
          <dt>${lang==='en'?'Read':'预计'}</dt><dd>${lang==='en'?`${readMin} min`:`${readMin} 分钟`}</dd>
          <dt>${lang==='en'?'Lang':'语言'}</dt><dd>${lang==='en'?'English':'中文'}</dd>
        </dl>
      </div>
      <div class="widget author-card">
        <h3>${lang==='en'?'Written by':'作者'}</h3>
        <div class="author-name">Kenneth Lau</div>
        <p>${lang==='en'
          ? 'The card was opened and charged; the charges are recorded in the post.'
          : '卡是自己开的，扣款记录在文里。'}</p>
      </div>
      <div class="widget">
        <h3>${lang==='en'?'Recent':'最近更新'}</h3>
        ${recent}
      </div>`
    const body = `<article class="article">
      <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${base}">${lang==='en'?'Home':'首页'}</a> / <span>${esc(p.title)}</span></nav>
      <div class="article-header">
        <h1>${esc(p.title)}</h1>
        <div class="article-meta">
          <span>${esc(fmtDate(p.date))}</span>
          <span class="sep">/</span>
          <a class="author-link" href="${base}about/">Kenneth Lau</a>
          <span class="sep">/</span>
          <span>${lang==='en'?`${readMin} min read`:`约 ${readMin} 分钟`}</span>
        </div>
        ${factSummary}
      </div>
      ${heroHtml}
      <div class="content">${content}</div>
      <div class="article-footer">
        <a class="lang-toggle" href="${altHref}">${altLang==='en'?'Read in English':'阅读中文版'}</a>
      </div>
    </article>`
    return c.html(layout(lang, `${p.title} - VirtualCardx`,
      articleDesc, body,
      { sidebar: articleSidebar, path: `${path}/`, ogType: 'article',
        jsonld: { '@context':'https://schema.org', '@graph': [
          { '@type':'Article', '@id':`${articleUrl}#article`, headline:p.title.slice(0,110), description:articleDesc, url:articleUrl,
            image:articleImage ? [articleImage] : undefined,
            datePublished:publishedDate, dateModified:modifiedDate, inLanguage:lang==='en'?'en':'zh-CN',
            author:{'@type':'Person',name:'Kenneth Lau',url:`${SITE}${base}about/`,'sameAs':['https://www.linkedin.com/in/kenneth-lau-77a551379','https://www.linkedin.com/company/virtualcardx']},
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
  return notFoundHtml(c, lang)
  } catch (e) {
    // 旧实现直接把 e.message + stack 当正文吐给访客且状态码 200 —— 信息泄露 + 被搜索引擎当内容抓。
    console.error('VCX worker error:', e && (e.stack || e.message))
    try {
      const errLang = getLang(new URL(c.req.url).pathname)
      return c.html(layout(errLang, '500 Internal Server Error - VirtualCardx', 'Service temporarily unavailable', `
    <div class="notfound">
      <div class="code">500</div>
      <h1>${errLang==='en'?'Something broke on this end':'这边出了点问题'}</h1>
      <p>${errLang==='en'
        ? 'The page did not load. Refreshing in a moment usually clears it.'
        : '页面没有加载出来。过一会儿刷新一下，一般就正常了。'}</p>
      <div class="links"><a href="${baseOf(errLang)}">${errLang==='en'?'Home':'回到首页'}</a></div>
    </div>`, { noSidebar:true, noindex:true, omitCanonical:true }), 500)
    } catch {
      return c.text('Internal Server Error', 500)
    }
  }
})

export default app
