// 测试用 D1 / R2 / ExecutionContext mock。
// 不复刻 SQLite，只按 Worker 实际发出的查询形态返回数据，并记录 SQL 调用次数
// （用于 N+1 回归：卡片列表的查询数必须与页内篇数无关）。
export function createEnv(seed = {}) {
  const T = { posts: [], pages: [], categories: [], media: [], tags: [], ...seed }
  const log = { sql: [], r2puts: [] }
  const objects = new Map() // R2 key -> { body, contentType }

  function matchPosts(s, args) {
    let r = [...T.posts]
    if (/translation_id IN/.test(s)) return r.filter(p => args.includes(p.translation_id))
    if (/lang = 'zh'/.test(s)) r = r.filter(p => p.lang === 'zh')
    else if (/lang = 'en'/.test(s)) r = r.filter(p => p.lang === 'en')
    else if (/lang = \?/.test(s)) {
      const lang = args.find(a => a === 'zh' || a === 'en')
      if (lang) r = r.filter(p => p.lang === lang)
    }
    if (/path = \?/.test(s)) {
      const pathArg = args.find(a => typeof a === 'string' && a !== 'zh' && a !== 'en')
      r = r.filter(p => p.path === pathArg)
    }
    if (/id = \?/.test(s) && !/media/.test(s)) r = r.filter(p => p.id === args[0])
    if (/status\s*=/.test(s)) r = r.filter(p => (p.status || 'publish') === 'publish')
    if (/LIKE/.test(s)) {
      const raw = String(args[1] || '').replace(/%/g, '')
      r = r.filter(p => String(p.title).includes(raw) || String(p.content || '').includes(raw))
    }
    return r
  }

  function query(sql, args) {
    const s = String(sql).replace(/\s+/g, ' ').trim()
    if (/FROM media WHERE id IN/.test(s)) return T.media.filter(m => args.includes(m.id))
    if (/FROM media WHERE path IN/.test(s)) return T.media.filter(m => args.includes(m.path))
    if (/FROM media WHERE filename IN/.test(s)) return T.media.filter(m => args.includes(m.filename))
    if (/FROM media WHERE id = \?/.test(s)) return T.media.filter(m => m.id === args[0])
    if (/FROM media WHERE path = \?/.test(s)) return T.media.filter(m => m.path === args[0])
    if (/FROM media WHERE filename = \?/.test(s)) return T.media.filter(m => m.filename === args[0])
    if (/FROM pages/.test(s)) return T.pages.filter(p => p.slug === args[0] && (args[1] === undefined || p.lang === args[1]))
    if (/FROM categories/.test(s)) {
      let r = [...T.categories]
      if (/slug = \?/.test(s)) r = r.filter(c => c.slug === args[0])
      if (/parent = \?/.test(s)) r = r.filter(c => c.parent === args[args.length - 1])
      return r
    }
    if (/FROM posts/.test(s)) {
      const rows = matchPosts(s, args)
      if (/COUNT\(\*\)/.test(s)) return [{ n: rows.length }]
      return rows
    }
    if (/FROM tags/.test(s)) return T.tags
    return []
  }

  const DB = {
    prepare(sql) {
      log.sql.push(String(sql))
      let args = []
      const stmt = {
        bind(...a) { args = a; return stmt },
        async all() { return { results: query(sql, args) } },
        async first() { return query(sql, args)[0] ?? null },
        async run() {
          const s = String(sql)
          if (/INSERT INTO media/i.test(s)) {
            const [id, filename, path, mime_type, alt, width, height] = args
            if (T.media.some(m => m.id === id)) throw new Error('UNIQUE constraint failed: media.id')
            T.media.push({ id, filename, path, mime_type, alt, width, height })
            return { meta: { changes: 1, last_row_id: id } }
          }
          if (/DELETE FROM media/i.test(s)) {
            const before = T.media.length
            T.media = T.media.filter(m => m.id !== args[0])
            return { meta: { changes: before - T.media.length } }
          }
          return { meta: { changes: 1, last_row_id: 1 } }
        },
      }
      return stmt
    },
  }

  const R2 = {
    async get(key) {
      const o = objects.get(key)
      if (!o) return null
      return {
        body: o.body,
        writeHttpMetadata(headers) { headers.set('Content-Type', o.contentType || 'application/octet-stream') },
      }
    },
    async put(key, body, opts) {
      log.r2puts.push(key)
      objects.set(key, { body, contentType: opts?.httpMetadata?.contentType })
    },
    _seed(key, contentType = 'image/png') {
      objects.set(key, { body: new TextEncoder().encode('png'), contentType })
    },
  }

  const ctx = { waitUntil() {}, passThroughOnException() {} }
  const env = { DB, R2, API_TOKEN: 'test-token', __log: log, __tables: T }
  return { env, ctx, log, tables: T }
}

export function get(env, path, ctx, init) {
  return import('../index.js').then(({ default: app }) =>
    app.fetch(new Request(`https://virtualcardx.com${path}`, init), env, ctx))
}
