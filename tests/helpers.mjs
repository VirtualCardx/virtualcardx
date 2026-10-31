// 真实 SQLite D1 / R2 / ExecutionContext 测试环境。
// SQL 由 node:sqlite 执行，渲染测试与查询/约束/触发器共享同一套 schema。
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'

const schema = readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8')

export function createEnv(seed = {}) {
  const T = { posts: [], pages: [], categories: [], media: [], tags: [], ...seed }
  const log = { sql: [], r2puts: [] }
  const objects = new Map()
  const db = new DatabaseSync(':memory:')
  db.exec(schema)

  for (const table of ['posts', 'pages', 'categories', 'media', 'tags']) {
    for (const row of T[table]) {
      const keys = Object.keys(row)
      if (!keys.length) continue
      const values = keys.map(k => typeof row[k] === 'object' && row[k] !== null ? JSON.stringify(row[k]) : row[k])
      db.prepare(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`).run(...values)
    }
  }

  const DB = {
    _db: db,
    prepare(sql) {
      log.sql.push(String(sql))
      let args = []
      const stmt = {
        bind(...a) { args = a; return stmt },
        async all() { return { results: db.prepare(sql).all(...args) } },
        async first() { return db.prepare(sql).get(...args) ?? null },
        async run() {
          const result = db.prepare(sql).run(...args)
          // 少量旧断言直接检查这个数组；数据库本身始终是事实来源。
          if (/INSERT INTO media/i.test(sql)) {
            const [id, filename, path, mime_type, alt, width, height] = args
            T.media.push({ id, filename, path, mime_type, alt, width, height })
          }
          if (/DELETE FROM media/i.test(sql)) {
            T.media = T.media.filter(m => m.id !== args[0])
          }
          return { meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } }
        },
      }
      return stmt
    },
    async batch(statements) {
      db.exec('BEGIN')
      try {
        const out = []
        for (const stmt of statements) out.push(await stmt.run())
        db.exec('COMMIT')
        return out
      } catch (error) {
        db.exec('ROLLBACK')
        throw error
      }
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
  return { env, ctx, log, tables: T, db }
}

export function get(env, path, ctx, init) {
  return import('../index.js').then(({ default: app }) =>
    app.fetch(new Request(`https://virtualcardx.com${path}`, init), env, ctx))
}
