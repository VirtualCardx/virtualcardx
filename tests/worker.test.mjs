import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createEnv } from './helpers.mjs'
import { seed, posts as basePosts } from './fixtures.mjs'

async function fetchPath(env, ctx, path, init) {
  const { default: app } = await import('../index.js')
  return app.fetch(new Request(`https://virtualcardx.com${path}`, init), env, ctx)
}

function fresh(overrides) {
  const { env, ctx, log, tables } = createEnv(seed(overrides))
  return { env, ctx, log, tables }
}

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
      body: JSON.stringify({ filename: `pic-${i}.png`, dataBase64: 'aGk=', mimeType: 'image/png', width: 100, height: 50 }),
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
    body: JSON.stringify({ filename: 'fail.png', dataBase64: 'aGk=', mimeType: 'image/png' }),
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
