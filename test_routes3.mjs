// 本地路由测试 v3: 修复 mock 链式调用
import { pathToFileURL } from 'url'
const mod = await import(pathToFileURL('/tmp/vcx_worker/worker_bundle.js').href)
const app = mod.default

function makeDB() {
  return {
    _sql: '', _p: [],
    prepare(sql) { this._sql = sql; this._p = []; return this },
    bind(...p) { this._p = p; return this },
    async all() {
      const sql = this._sql, p = this._p
      if (sql.includes('FROM media')) return { results: [] }
      if (sql.includes('SELECT * FROM posts')) {
        if (p[0] === '2026/08/04/test' && p[1] === 'zh') {
          return { results: [{ title:'Test Post', excerpt:'', content:'<p>hello</p>', path:'2026/08/04/test', date:'2026-08-04', modified:'2026-08-04' }] }
        }
        return { results: [] }
      }
      if (sql.includes('SELECT slug, title')) {
        return { results: [{ slug:'test', title:'Test Post', excerpt:'', path:'2026/08/04/test', date:'2026-08-04' }] }
      }
      return { results: [] }
    }
  }
}
const env = { DB: makeDB(), R2: { get: async () => null } }
for (const path of ['/', '/en/', '/search?q=x', '/2026/08/04/test/', '/en/2026/08/04/test/', '/sitemap.xml']) {
  try {
    const res = await app.fetch(new Request('https://test.workers.dev' + path), env)
    const body = await res.text()
    console.log(path, '->', res.status, '|', body.slice(0,70).replace(/\n/g,' '))
  } catch (e) { console.log(path, '-> EXC:', e.message.slice(0,100)) }
}
