import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createEnv } from './helpers.mjs'
import { seed, posts as basePosts } from './fixtures.mjs'

async function fetchPath(env, ctx, path, init) {
  const { default: app } = await import('../index.js')
  return app.fetch(new Request(`https://virtualcardx.com${path}`, init), env, ctx)
}

function fresh(overrides) {
  const { env, ctx, log, tables, db } = createEnv(seed(overrides))
  return { env, ctx, log, tables, db }
}

const PNG_1PX = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z3ZkAAAAASUVORK5CYII='

// ---------- 重定向与规范化 ----------

test('www 301 到裸域', async () => {
  const { env, ctx } = fresh()
  const res = await fetchPath(env, ctx, '/about/', { headers: { host: 'www.virtualcardx.com' } })
  assert.equal(res.status, 301)
  assert.equal(new URL(res.headers.get('location')).host, 'virtualcardx.com')
})

test('尾斜杠规范化保留 query', async () => {
  const { env, ctx } = fresh()
  const res = await fetchPath(env, ctx, '/about?x=1')
  assert.equal(res.status, 301)
  assert.equal(res.headers.get('location'), 'https://virtualcardx.com/about/?x=1')
})

test('分类条标出当前分类，其余页面不标', async () => {
  const { env, ctx } = fresh()
  const cat = await (await fetchPath(env, ctx, '/virtual-credit-card/')).text()
  assert.equal((cat.match(/aria-current="page"/g) || []).length, 1, '分类页只该标一个当前分类')
  assert.ok(cat.includes('aria-current="page">虚拟卡评测<'), '当前分类要落在「虚拟卡评测」上')
  assert.ok(cat.includes('<span class="label">分类</span>'), '分类条要有左侧标签')

  const home = await (await fetchPath(env, ctx, '/')).text()
  const bar = home.match(/<div class="cat-bar">[\s\S]*?<\/nav>/)?.[0] || ''
  assert.ok(bar && !bar.includes('aria-current'), '首页的分类条不该有当前态')

  const en = await (await fetchPath(env, ctx, '/en/virtual-credit-card/')).text()
  assert.ok(en.includes('<span class="label">Sections</span>'), '英文站标签要用 Sections')
  assert.ok(en.includes('aria-current="page">Virtual Cards<'), '英文站要标出当前分类')
})

test('静态资源与 API 不被尾斜杠规则改写', async () => {
  const { env, ctx } = fresh()
  for (const p of ['/robots.txt', '/sitemap.xml', '/api/health']) {
    const res = await fetchPath(env, ctx, p)
    assert.notEqual(res.status, 301, `${p} 不应 301`)
  }
})

test('页头用内联标记，图标指向站点自己的资源', async () => {
  const { env, ctx } = fresh()
  const html = await (await fetchPath(env, ctx, '/')).text()

  assert.ok(html.includes('<svg class="logo-mark"'), '页头标记应内联，避免一次图片请求')
  assert.ok(html.includes('class="mk-chip"'), '标记由卡框/磁条/芯片三层组成')
  assert.ok(!html.includes('1556-cropped-logo'), '不应再引用 WP 时代的位图 logo')

  // 三种图标都要声明：ico 给老浏览器和爬虫，svg 给现代浏览器，apple-touch-icon 给 iOS 主屏
  assert.ok(html.includes('href="/favicon.ico"'), '缺 favicon.ico')
  assert.ok(html.includes('href="/favicon.svg"'), '缺 favicon.svg')
  assert.ok(html.includes('href="/brand/apple-touch-icon.png"'), '缺 apple-touch-icon')
  assert.ok(!html.includes('rel="icon" type="image/png" href="/media/'), '图标签不能回落到媒体桶')
})

test('og:image 默认是 1200x630 品牌卡，带自备图时不覆盖', async () => {
  const { env, ctx } = fresh()
  const home = await (await fetchPath(env, ctx, '/')).text()
  assert.ok(home.includes('content="https://virtualcardx.com/brand/og.png"'), '首页应回落到品牌卡')
  assert.ok(home.includes('og:image:width" content="1200"'), '要声明宽度，社交平台才不会裁歪')
  assert.ok(home.includes('twitter:card" content="summary_large_image"'), '品牌卡是横版，走大图卡片')

  // 有特色图的文章自带 og:image，不能既保留自带图又声明 1200x630
  const post = await (await fetchPath(env, ctx, '/virtual-credit-card-platform-review/')).text()
  const ogImages = post.match(/property="og:image"/g) || []
  assert.equal(ogImages.length, 1, '页面只能有一个 og:image')
  assert.ok(!post.includes('brand/og.png'), '自带配图时不应再挂品牌卡')
  const cards = post.match(/name="twitter:card"/g) || []
  assert.equal(cards.length, 1, 'twitter:card 不能既由布局写一条、又由文章写一条')
})

test('旧 WP query 参数 301 到干净路径', async () => {
  const { env, ctx } = fresh()
  const res = await fetchPath(env, ctx, '/?query-27a53e09-page=2')
  assert.equal(res.status, 301)
  assert.equal(res.headers.get('location'), 'https://virtualcardx.com/')
})

test('迁移到博客的文章 301 单跳', async () => {
  const { env, ctx } = fresh()
  const res = await fetchPath(env, ctx, '/2025/05/20/unlock-cursor-pro-free/')
  assert.equal(res.status, 301)
  assert.equal(res.headers.get('location'), 'https://blog.andou.eu.org/blog/unlock-cursor-pro-free/')
})

test('virutal 拼写错误一次跳到带尾斜杠的分类页', async () => {
  const { env, ctx } = fresh()
  const res = await fetchPath(env, ctx, '/virutal-credit-card/')
  assert.equal(res.status, 301)
  // Hono 对相对路径原样透传 Location；关键是必须带尾斜杠，否则会二次 301
  assert.equal(res.headers.get('location'), '/virtual-credit-card/')
})

test('/page/1/ 301 回首页', async () => {
  const { env, ctx } = fresh()
  const res = await fetchPath(env, ctx, '/page/1/')
  assert.equal(res.status, 301)
  assert.equal(res.headers.get('location'), '/')
})

test('同品牌重复评测合并后单跳到主 URL（中英各一条）', async () => {
  const { env, ctx } = fresh()
  const cases = {
    '/2026/07/13/coca-visa-card-review/': '/2026/07/31/coca-card-review-2026/',
    '/en/2026/07/13/coca-visa-card-review/': '/en/2026/07/31/coca-card-review-2026/',
    '/2026/07/13/paymier-cross-border-payment-virtual-card/': '/2025/05/19/paymier/',
  }
  for (const [from, to] of Object.entries(cases)) {
    const res = await fetchPath(env, ctx, from)
    assert.equal(res.status, 301, from)
    assert.equal(res.headers.get('location'), to, from)
  }
})

test('旧索引校验文件 301 到 .txt（不带尾斜杠）', async () => {
  const { env, ctx } = fresh()
  const res = await fetchPath(env, ctx, '/virtualcardx2026-2/')
  assert.equal(res.status, 301)
  assert.equal(res.headers.get('location'), '/virtualcardx2026.txt')
})

// ---------- 404 一致性 ----------

test('不存在的路径返回统一 404 页且不可索引', async () => {
  const { env, ctx } = fresh()
  const res = await fetchPath(env, ctx, '/missing/')
  assert.equal(res.status, 404)
  assert.match(res.headers.get('content-type'), /text\/html/)
  assert.equal(res.headers.get('cache-control'), 'no-store', '404 不应进 CDN 缓存')
  const html = await res.text()
  assert.ok(html.includes('class="notfound"'), '应使用站点样式 404')
  assert.ok(html.includes('页面不存在'))
  assert.ok(!html.includes('rel="canonical"'), '404 不应有 canonical')
  assert.ok(!html.includes('hreflang='), '404 不应有 hreflang')
  assert.ok(html.includes('noindex'))
})

test('越界分页返回同一个 404 页而非纯文本', async () => {
  const { env, ctx } = fresh()
  for (const p of ['/page/999/', '/en/page/999/']) {
    const res = await fetchPath(env, ctx, p)
    assert.equal(res.status, 404, p)
    const html = await res.text()
    assert.ok(html.includes('class="notfound"'), `${p} 应该是样式化 404`)
  }
})

test('/en 前缀判定不误伤 /english-* 之类的 slug', async () => {
  const { env, ctx } = fresh()
  const res = await fetchPath(env, ctx, '/english-guide-to-cards/')
  assert.equal(res.status, 404)
  const html = await res.text()
  assert.ok(html.includes('页面不存在'), '应渲染中文 404，而不是被当成英文站')
})

// ---------- 首页 / 分类 / 文章 ----------

test('首页 200 且卡片按 sticky/日期排序（含可读日期格式）', async () => {
  const { env, ctx } = fresh()
  const res = await fetchPath(env, ctx, '/')
  assert.equal(res.status, 200)
  const html = await res.text()
  const order = [
    '/virtual-credit-card-platform-review/',
    '/2026/08/04/old-style-post/',
    '/script-injection-title/',
    '/crypto-card-guide/',
  ].map(href => html.indexOf(`href="${href}"`))
  assert.ok(order.every(i => i > -1), '所有文章都应在首页出现')
  assert.deepEqual([...order].sort((a, b) => a - b), order, '日期为 "November 21, 2025" 的文章必须排在 2026 年文章之后')
})

test('首页卡片查询次数与文章数量无关（N+1 回归）', async () => {
  const few = fresh()
  await fetchPath(few.env, few.ctx, '/')
  const fewCount = few.log.sql.length

  const many = fresh({
    posts: [
      ...basePosts,
      ...Array.from({ length: 9 }, (_, i) => ({
        id: 200 + i, lang: 'zh', slug: `bulk-${i}`, title: `批量文章 ${i}`, excerpt: '摘要',
        content: '<p>x</p>', path: `bulk-${i}`, date: '2026-06-01', modified: '2026-06-01',
        status: 'publish', featured_media: 10, category_ids: '[7]', tag_ids: '[]', translation_id: null, sticky: 0,
      })),
    ],
  })
  await fetchPath(many.env, many.ctx, '/')
  assert.equal(many.log.sql.length, fewCount, '一页 9 篇不应比 4 篇多出查询')
  assert.ok(fewCount <= 5, `首页查询应 <= 5 次，实际 ${fewCount}`)
})

test('每页 9 条，正好排满三列网格', async () => {
  // 11 篇中文：第一页 9 条（三整行），第二页剩 2 条（补 1 个占位格）
  const posts = [
    ...basePosts.filter(p => p.lang === 'zh'),
    ...Array.from({ length: 7 }, (_, i) => ({
      id: 300 + i, lang: 'zh', slug: `paged-${i}`, title: `翻页文章 ${i}`, excerpt: '摘要',
      content: '<p>x</p>', path: `paged-${i}`, date: `2026-07-0${i + 1}`, modified: '2026-07-01',
      status: 'publish', featured_media: null, category_ids: '[7]', tag_ids: '[]', translation_id: null, sticky: 0,
    })),
  ]
  const { env, ctx } = fresh({ posts })
  const p1 = await (await fetchPath(env, ctx, '/')).text()
  assert.equal((p1.match(/class="cell"/g) || []).length, 9, '首页第一页应有 9 条')
  assert.equal((p1.match(/class="cell cell-empty"/g) || []).length, 0, '9 条正好三整行，不该补占位格')
  assert.ok(!p1.includes('/crypto-card-guide/'), '第 10 条之后不应出现在第一页')

  const p2 = await (await fetchPath(env, ctx, '/page/2/')).text()
  assert.equal((p2.match(/class="cell"/g) || []).length, 2, '第二页应为剩下的 2 条')
  assert.equal((p2.match(/class="cell cell-empty"/g) || []).length, 1, '末页 2 条应补 1 个占位格')
  assert.ok(p2.includes('/crypto-card-guide/'), '溢出的文章应落到第二页')
})

test('分类页 200 且分页导航存在', async () => {
  const { env, ctx } = fresh()
  const res = await fetchPath(env, ctx, '/virtual-credit-card/')
  assert.equal(res.status, 200)
  const html = await res.text()
  assert.ok(html.includes('虚拟卡评测'))
  assert.ok(html.includes('/2026/08/04/old-style-post/'))
})

test('不存在的分类走 404', async () => {
  const { env, ctx } = fresh()
  const res = await fetchPath(env, ctx, '/no-such-category/')
  assert.equal(res.status, 404)
})

test('英文文章页回退中文特色图并输出 Article 结构化数据', async () => {
  const { env, ctx } = fresh()
  const res = await fetchPath(env, ctx, '/en/virtual-credit-card-platform-review/')
  assert.equal(res.status, 200)
  const html = await res.text()
  const jsonld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])
  const article = jsonld['@graph'].find(n => n['@type'] === 'Article')
  assert.ok(article, '应有 Article 节点')
  assert.deepEqual(article.image, ['https://virtualcardx.com/media/10-card.jpg'], '应回退到中文配对的特色图')
  assert.equal(article.author['@type'], 'Person')
})

test('dateModified 不会早于 datePublished', async () => {
  const { env, ctx } = fresh()
  const res = await fetchPath(env, ctx, '/virtual-credit-card-platform-review/')
  const html = await res.text()
  assert.match(html, /"datePublished":"2026-09-20"/)
  assert.match(html, /"dateModified":"2026-09-20"/)
})

test('正文 WP 旧图路径被重写并补齐尺寸/alt/懒加载', async () => {
  const { env, ctx } = fresh()
  const res = await fetchPath(env, ctx, '/virtual-credit-card-platform-review/')
  const html = await res.text()
  assert.ok(html.includes('src="/media/11-old.jpg"'), '旧上传路径应重写为 /media/')
  assert.ok(!html.includes('/wp-content/uploads/'), '正文不应残留 wp-content 路径')
  assert.match(html, /width="800" height="450"/)
  assert.match(html, /alt="Old"/)
})

test('标题里的 </script> 不会截断 JSON-LD', async () => {
  const { env, ctx } = fresh()
  const res = await fetchPath(env, ctx, '/script-injection-title/')
  const html = await res.text()
  assert.ok(!/<\/script> 的边界用例/.test(html), '脚本块内不应出现原始 </script>')
  assert.ok(html.includes('\\u003c'), '应转义为 \\u003c')
  const blocks = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)
  assert.equal(blocks.length, 1)
})

test('英文路径无独立记录时回退中文正文', async () => {
  const { env, ctx } = fresh()
  const res = await fetchPath(env, ctx, '/en/crypto-card-guide/')
  assert.equal(res.status, 200)
  const html = await res.text()
  assert.ok(html.includes('U 卡入门'), '应渲染中文正文')
  assert.ok(html.includes('href="/crypto-card-guide/"'), '应提供切回中文的链接')
  assert.ok(!html.startsWith('ERROR:'), '不应把异常当正文')
})

test('/search 直接渲染，不再多一轮 301', async () => {
  const { env, ctx } = fresh()
  const res = await fetchPath(env, ctx, '/search?q=虚拟卡')
  assert.equal(res.status, 200)
  const html = await res.text()
  assert.ok(html.includes('虚拟卡平台实测'))
  assert.ok(html.includes('noindex'), '搜索结果页不可索引')
})

// ---------- sitemap / robots / media ----------

test('sitemap 只含规范 URL', async () => {
  const { env, ctx } = fresh()
  const res = await fetchPath(env, ctx, '/sitemap.xml')
  assert.equal(res.status, 200)
  const xml = await res.text()
  assert.ok(xml.includes('<loc>https://virtualcardx.com/</loc>'))
  assert.ok(xml.includes('<loc>https://virtualcardx.com/en/</loc>'))
  assert.ok(xml.includes('https://virtualcardx.com/virtual-credit-card-platform-review/'))
  assert.ok(!xml.includes('/wp-content/'))
})

test('robots.txt 指向 sitemap', async () => {
  const { env, ctx } = fresh()
  const res = await fetchPath(env, ctx, '/robots.txt')
  const text = await res.text()
  assert.ok(text.includes('Sitemap: https://virtualcardx.com/sitemap.xml'))
})

test('媒体走 R2 并带 immutable 缓存与 Vary', async () => {
  const { env, ctx } = fresh()
  env.R2._seed('media/1556-cropped-logo.png')
  const res = await fetchPath(env, ctx, '/media/1556-cropped-logo.png')
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('vary'), 'Accept')
  assert.match(res.headers.get('cache-control'), /immutable/)
})

test('缺失媒体直接 404', async () => {
  const { env, ctx } = fresh()
  const res = await fetchPath(env, ctx, '/media/nope.png')
  assert.equal(res.status, 404)
})

// ---------- API ----------

test('API 未授权返回 401', async () => {
  const { env, ctx } = fresh()
  const res = await fetchPath(env, ctx, '/api/posts')
  assert.equal(res.status, 401)
})

test('API 授权后返回文章列表', async () => {
  const { env, ctx } = fresh()
  const res = await fetchPath(env, ctx, '/api/posts', { headers: { Authorization: 'Bearer test-token' } })
  assert.equal(res.status, 200)
  const data = await res.json()
  assert.ok(data.total > 0)
  assert.ok(Array.isArray(data.posts))
})

test('媒体上传：非图片类型 415 / 超限 413 / 非法 base64 400', async () => {
  const { env, ctx } = fresh()
  const auth = { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' }

  let res = await fetchPath(env, ctx, '/api/media', {
    method: 'POST', headers: auth,
    body: JSON.stringify({ filename: 'a.pdf', dataBase64: 'aGk=', mimeType: 'application/pdf' }),
  })
  assert.equal(res.status, 415)

  res = await fetchPath(env, ctx, '/api/media', {
    method: 'POST', headers: auth,
    body: JSON.stringify({ filename: 'big.png', dataBase64: 'A'.repeat(14_000_001), mimeType: 'image/png' }),
  })
  assert.equal(res.status, 413)

  res = await fetchPath(env, ctx, '/api/media', {
    method: 'POST', headers: auth,
    body: JSON.stringify({ filename: 'x.png', dataBase64: '!!!not-base64!!!', mimeType: 'image/png' }),
  })
  assert.equal(res.status, 400)
})

test('媒体上传生成互不相同的 id 且写入 R2', async () => {
  const { env, ctx, log } = fresh()
  const auth = { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' }
  const ids = []
  for (let i = 0; i < 3; i++) {
    const res = await fetchPath(env, ctx, '/api/media', {
      method: 'POST', headers: auth,
      body: JSON.stringify({ filename: `pic-${i}.png`, dataBase64: PNG_1PX, mimeType: 'image/png', width: 100, height: 50 }),
    })
    assert.equal(res.status, 201)
    const data = await res.json()
    ids.push(data.id)
    assert.ok(data.id > 1e12, 'id 应基于毫秒时间戳，避免 27.8 小时循环撞号')
    assert.equal(data.path, `media/${data.id}-pic-${i}.png`)
  }
  assert.equal(new Set(ids).size, 3, '三次上传 id 必须互不相同')
  assert.equal(log.r2puts.length, 3)
})

test('媒体上传失败时回滚 DB 记录', async () => {
  const { env, ctx, tables } = fresh()
  env.R2.put = async () => { throw new Error('r2 down') }
  const res = await fetchPath(env, ctx, '/api/media', {
    method: 'POST',
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: 'fail.png', dataBase64: PNG_1PX, mimeType: 'image/png' }),
  })
  assert.equal(res.status, 502)
  assert.equal(tables.media.filter(m => m.filename === 'fail.png').length, 0, '不应留下无文件的 media 记录')
})

// ---------- 列表网格布局 ----------

test('列表网格按列数补齐占位格，末行不留缺口', async () => {
  const { env, ctx } = fresh()
  // fixtures 里分类 7 有 2 篇，补 1 格凑满 3 列
  const cat = await (await fetchPath(env, ctx, '/virtual-credit-card/')).text()
  assert.equal((cat.match(/class="cell cell-empty"/g) || []).length, 1, '2 张卡片应补 1 个占位格')

  // 首页 4 篇 -> 补 2 格
  const home = await (await fetchPath(env, ctx, '/')).text()
  assert.equal((home.match(/class="cell cell-empty"/g) || []).length, 2, '4 张卡片应补 2 个占位格')

  // 3 条正好满 3 列，不补
  const three = fresh({ posts: basePosts.filter(p => p.lang === 'zh').slice(0, 3) })
  const html3 = await (await fetchPath(three.env, three.ctx, '/')).text()
  assert.equal((html3.match(/class="cell cell-empty"/g) || []).length, 0, '3 张卡片刚好满行')
})

test('英文首页的分类名走英文映射，不吐库里的中文名', async () => {
  // 英文首页只收「真英文文章」（日期路径，或纯 slug + 有翻译配对），
  // 所以这篇要带 translation_id，否则它根本不会进列表，断言就成了空转
  const { env, ctx } = fresh({
    posts: [
      ...basePosts,
      {
        id: 301, lang: 'en', slug: 'en-cat-post', title: 'Card With Category',
        excerpt: 'Has a category.', content: '<p>Body</p>', path: 'en-cat-post',
        date: '2026-05-01', modified: '2026-05-01', status: 'publish',
        featured_media: null, category_ids: '[7]', tag_ids: '[]', translation_id: 5, sticky: 0,
      },
    ],
  })
  const html = await (await fetchPath(env, ctx, '/en/')).text()
  assert.ok(html.includes('Card With Category'), '这篇英文文章应出现在英文首页')
  assert.ok(html.includes('Virtual Card Reviews'), '英文站应显示分类的英文名')
  assert.ok(!html.includes('虚拟卡评测'), '英文站不应出现中文分类名')
})

// ---------- 回归：双语、日期、语言替代 ----------

test('英文配对摘要沿正确主键回退，并标记中文语言', async () => {
  const { env, ctx } = fresh()
  const html = await (await fetchPath(env, ctx, '/en/')).text()
  assert.ok(html.includes('费率、开卡与风控实测。'), '英文空摘要应回退到中文配对摘要')
  assert.match(html, /<p lang="zh">费率、开卡与风控实测。<\/p>/, '回退摘要必须声明中文')
  assert.ok(html.includes('Virtual Card Reviews'), '英文配对分类应正确显示')
})

test('英文分类页用英文配对，不重复中文 fallback', async () => {
  const { env, ctx } = fresh()
  const html = await (await fetchPath(env, ctx, '/en/virtual-credit-card/')).text()
  assert.ok(html.includes('Virtual Card Platform Review'))
  assert.equal((html.match(/虚拟卡平台实测/g) || []).length, 0, '已有英文配对时不应再出现中文同一篇')
})

test('可读日期只输出合法 ISO，不污染页面和 sitemap', async () => {
  const { env, ctx } = fresh()
  const article = await (await fetchPath(env, ctx, '/crypto-card-guide/')).text()
  assert.ok(article.includes('2025-11-21'), '可见日期应为 2025-11-21')
  assert.ok(!article.includes('November 2<'), '不能把 November 21 截成 November 2')
  const sitemap = await (await fetchPath(env, ctx, '/sitemap.xml')).text()
  assert.ok(sitemap.includes('<lastmod>2025-11-21</lastmod>'), 'sitemap 日期必须合法')
  assert.ok(!sitemap.includes('<lastmod>November'), 'sitemap 不应出现截断英文日期')
})

test('语言切换和 hreflang 只指向真实配对', async () => {
  const { env, ctx } = fresh()
  const translated = await (await fetchPath(env, ctx, '/virtual-credit-card-platform-review/')).text()
  assert.ok(translated.includes('hreflang="en" href="https://virtualcardx.com/en/virtual-credit-card-platform-review/"'), '有配对时输出英文 alternate')
  assert.ok(translated.includes('href="/en/virtual-credit-card-platform-review/" hreflang="en"'), '语言切换指向英文正文')

  const englishOnly = await (await fetchPath(env, ctx, '/en/2026/07/04/tailscale-guide/')).text()
  assert.ok(!englishOnly.includes('hreflang="zh"'), '英文独有文章不应伪造中文 alternate')
  assert.ok(!englishOnly.includes('href="/2026/07/04/tailscale-guide/" hreflang="zh"'), '没有中文配对时不应显示语言切换')
})

test('英文回退中文正文时 canonical 回原文且 noindex', async () => {
  const { env, ctx } = fresh()
  const html = await (await fetchPath(env, ctx, '/en/crypto-card-guide/')).text()
  assert.ok(html.includes('<article class="article" lang="zh">'), '中文正文需声明语言')
  assert.ok(html.includes('rel="canonical" href="https://virtualcardx.com/crypto-card-guide/"'), '回退页 canonical 指中文原文')
  assert.ok(html.includes('noindex,follow'), '未翻译回退页不应被索引')
  assert.ok(!html.includes('hreflang="en"'), '不应把中文原文声明为英文 alternate')
})

test('文章页多分类逐个链接，JSON-LD 面包屑包含分类', async () => {
  const { env, ctx } = fresh({
    posts: basePosts.map(p => p.id === 1 ? { ...p, category_ids: '[7,8]' } : p),
  })
  const html = await (await fetchPath(env, ctx, '/virtual-credit-card-platform-review/')).text()
  assert.match(html, /<nav class="breadcrumbs"[\s\S]*href="\/virtual-credit-card\/"[\s\S]*href="\/cryptocurrency\/"/, '可见面包屑应有两个分类链接')
  const jsonld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])
  const crumbs = jsonld['@graph'].find(n => n['@type'] === 'BreadcrumbList').itemListElement
  assert.equal(crumbs.length, 4, '首页 + 两个分类 + 文章')
  assert.equal(crumbs[1].name, '虚拟卡评测')
})

// ---------- 回归：搜索、sitemap、重定向 ----------

test('搜索按真实总数分页，不再截断 20 条', async () => {
  const extra = Array.from({ length: 20 }, (_, i) => ({
    id: 500 + i, lang: 'zh', slug: `searchable-${i}`, title: `Searchable ${i}`,
    excerpt: '摘要', content: '<p>needle body</p>', path: `searchable-${i}`,
    date: `2026-06-${String((i % 20) + 1).padStart(2, '0')}`, modified: '2026-06-01',
    status: 'publish', featured_media: null, category_ids: '[]', tag_ids: '[]', translation_id: null, sticky: 0,
  }))
  const { env, ctx } = fresh({ posts: extra })
  const first = await (await fetchPath(env, ctx, '/search?q=searchable')).text()
  assert.equal((first.match(/class="cell"/g) || []).length, 9, '第一页 9 条')
  assert.ok(first.includes('1 / 3 · 20'), '显示真实总数与页数')
  assert.equal(first.match(/value="searchable"/g)?.length, 2, '两个搜索框都应保留查询词')

  const third = await (await fetchPath(env, ctx, '/search?q=searchable&page=3')).text()
  assert.equal((third.match(/class="cell"/g) || []).length, 2, '第三页应剩 2 条')
  const beyond = await fetchPath(env, ctx, '/search?q=searchable&page=4')
  assert.equal(beyond.status, 404)
})

test('搜索把 % 和 _ 当作普通字符', async () => {
  const { env, ctx } = fresh()
  const html = await (await fetchPath(env, ctx, '/search?q=%25')).text()
  assert.ok(html.includes('没有匹配'), '% 不应匹配所有文章')
  const underscore = await (await fetchPath(env, ctx, '/search?q=_')).text()
  assert.ok(underscore.includes('没有匹配'), '_ 不应匹配单字符')
})

test('sitemap 只列真实静态页和分类，不提交 404', async () => {
  const { env, ctx } = fresh()
  const xml = await (await fetchPath(env, ctx, '/sitemap.xml')).text()
  assert.ok(xml.includes('/about/'))
  assert.ok(!xml.includes('/contact/'), 'fixture 没有 contact 页，不能硬编码')
  assert.ok(!xml.includes('/terms/'), 'fixture 没有 terms 页，不能硬编码')
  assert.ok(xml.includes('/virtual-credit-card/'))
  assert.ok(xml.includes('/en/cryptocurrency/'))
})

test('未知日期型 URL 返回 404，不再软跳首页', async () => {
  const { env, ctx } = fresh()
  const res = await fetchPath(env, ctx, '/2026/01/01/definitely-missing/')
  assert.equal(res.status, 404)
  assert.ok((await res.text()).includes('class="notfound"'))
})

test('RSS 输出语言独立的订阅源', async () => {
  const { env, ctx } = fresh()
  const zh = await fetchPath(env, ctx, '/feed.xml')
  assert.equal(zh.status, 200)
  assert.match(zh.headers.get('content-type'), /rss\+xml/)
  const xml = await zh.text()
  assert.ok(xml.includes('<language>zh-CN</language>'))
  assert.ok(xml.includes('/virtual-credit-card-platform-review/'))

  const en = await fetchPath(env, ctx, '/en/feed.xml')
  const enXml = await en.text()
  assert.ok(enXml.includes('<language>en</language>'))
  assert.ok(enXml.includes('/en/2026/07/04/tailscale-guide/'))
})

// ---------- 回归：可访问性、图片和上传 ----------

test('页面有 skip link、外链脚本和可访问的移动菜单', async () => {
  const { env, ctx } = fresh()
  const res = await fetchPath(env, ctx, '/')
  const html = await res.text()
  assert.ok(html.includes('class="skip-link" href="#main"'), '缺跳到正文链接')
  assert.ok(html.includes('<main id="main" tabindex="-1">'))
  assert.ok(html.includes('aria-controls="mainNav"'), '菜单按钮要关联面板')
  assert.ok(html.includes('<script src="/app.js" defer></script>'), '交互脚本必须外链')
  assert.ok(!html.includes('nav.classList.toggle'), '不应继续内联脚本')
  const csp = res.headers.get('content-security-policy')
  assert.ok(!csp.includes("script-src 'self' 'unsafe-inline'"), '脚本 CSP 不应允许内联')
})

test('中文分页本地化并标记禁用状态', async () => {
  const extra = Array.from({ length: 10 }, (_, i) => ({
    id: 600 + i, lang: 'zh', slug: `page-a11y-${i}`, title: `分页 ${i}`, excerpt: '摘要',
    content: '<p>x</p>', path: `page-a11y-${i}`, date: '2026-05-01', modified: '2026-05-01',
    status: 'publish', featured_media: null, category_ids: '[]', tag_ids: '[]', translation_id: null, sticky: 0,
  }))
  const { env, ctx } = fresh({ posts: extra })
  const html = await (await fetchPath(env, ctx, '/')).text()
  assert.ok(html.includes('aria-label="分页"'))
  assert.ok(html.includes('aria-label="下一页"'))
  assert.ok(html.includes('class="first disabled" aria-disabled="true"'), '首页的第一页按钮应禁用')
})

test('有特色图时正文首图不抢 LCP，并折叠虚假 srcset', async () => {
  const { env, ctx } = fresh({
    posts: basePosts.map(p => p.id === 1 ? {
      ...p,
      content: '<p>正文</p><img src="/wp-content/uploads/2026/01/old.jpg" srcset="/wp-content/uploads/2026/01/old-300x200.jpg 300w, /wp-content/uploads/2026/01/old.jpg 800w" alt="">',
    } : p),
  })
  const html = await (await fetchPath(env, ctx, '/virtual-credit-card-platform-review/')).text()
  assert.equal((html.match(/fetchpriority="high"/g) || []).length, 1, '只有特色图是高优先级')
  assert.match(html, /src="\/media\/11-old.jpg"[^>]*loading="lazy"/, '正文图应懒加载')
  assert.ok(!html.includes('old.jpg 300w'), '不真实的 srcset 应移除')
})

test('文章 OG 图输出实际尺寸和替代文本', async () => {
  const { env, ctx } = fresh()
  const html = await (await fetchPath(env, ctx, '/virtual-credit-card-platform-review/')).text()
  assert.ok(html.includes('property="og:image:width" content="1200"'))
  assert.ok(html.includes('property="og:image:height" content="675"'))
  assert.ok(html.includes('name="twitter:image:alt" content="Card"'))
})

test('上传文件名被白名单化，伪装图片被拒绝', async () => {
  const { env, ctx } = fresh()
  const auth = { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' }
  const res = await fetchPath(env, ctx, '/api/media', {
    method: 'POST', headers: auth,
    body: JSON.stringify({ filename: 'x" onerror="alert(1).png', dataBase64: PNG_1PX, mimeType: 'image/png' }),
  })
  assert.equal(res.status, 201)
  const data = await res.json()
  assert.match(data.path, /^media\/\d+-x-onerror-alert-1\.png$/, '路径只能含安全字符')
  assert.ok(!data.path.includes('"'))

  const fake = await fetchPath(env, ctx, '/api/media', {
    method: 'POST', headers: auth,
    body: JSON.stringify({ filename: 'fake.png', dataBase64: 'aGk=', mimeType: 'image/png' }),
  })
  assert.equal(fake.status, 415, '内容魔数不是图片时应拒绝')
})

test('API 拒绝非法分页参数和 null JSON', async () => {
  const { env, ctx } = fresh()
  const auth = { Authorization: 'Bearer test-token' }
  let res = await fetchPath(env, ctx, '/api/posts?limit=-1', { headers: auth })
  assert.equal(res.status, 400)
  res = await fetchPath(env, ctx, '/api/posts?offset=-1', { headers: auth })
  assert.equal(res.status, 400)
  res = await fetchPath(env, ctx, '/api/posts', {
    method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: 'null',
  })
  assert.equal(res.status, 400)
})

// ---------- 回归：数据库约束和触发器 ----------

test('规范化时间戳和分类关系由数据库触发器维护', async () => {
  const { db } = fresh()
  const row = db.prepare('SELECT date_ts, modified_ts FROM posts WHERE id = 3').get()
  assert.equal(new Date(row.date_ts * 1000).toISOString().slice(0, 10), '2025-11-21')
  const links = db.prepare('SELECT category_id FROM post_categories WHERE post_id = 1 ORDER BY category_id').all()
  assert.deepEqual(links.map(r => r.category_id), [7])
})

test('数据库阻止重复规范路径', async () => {
  const { db } = fresh()
  assert.throws(() => {
    db.prepare("INSERT INTO posts (lang, slug, title, path) VALUES ('zh', 'dupe', 'Duplicate', 'crypto-card-guide')").run()
  }, /UNIQUE constraint/)
})

test('全文索引支持中英文子串搜索', async () => {
  const { env, ctx } = fresh()
  const zh = await (await fetchPath(env, ctx, '/search?q=虚拟卡平台')).text()
  assert.ok(zh.includes('虚拟卡平台实测'), '中文短语应命中')
  const en = await (await fetchPath(env, ctx, '/en/?s=platform')).text()
  assert.ok(en.includes('Virtual Card Platform Review'), '英文子串应命中')
})

test('英文默认分享图独立，字体使用内容哈希', async () => {
  const { env, ctx } = fresh()
  const en = await (await fetchPath(env, ctx, '/en/')).text()
  assert.ok(en.includes('content="https://virtualcardx.com/brand/og-en.png"'), '英文页使用英文分享卡')
  assert.ok(!en.includes('content="https://virtualcardx.com/brand/og.png"'), '英文页不应回退中文品牌卡')
  assert.match(en, /fonts\/ibm-plex-sans-latin-wght-normal-[a-f0-9]{8}\.woff2/, '字体名必须带内容哈希')
})
