// 本地路由测试 v2: mock 含真实文章数据
import { pathToFileURL } from 'url'
const mod = await import(pathToFileURL('/tmp/vcx_worker/worker_bundle.js').href)
const app = mod.default
const mockDB = {
  prepare(sql) {
    this._sql = sql
    return {
      bind(...p){ this._p = p; return this },
      async all(){
        const sql = this._sql
        if (sql.includes('SELECT * FROM posts')) {
          const path = this._p[0], lang = this._p[1]
          if (path === '2026/08/04/test' && lang === 'zh') {
            return { results: [{ title:'Test Post', excerpt:'', content:'<p>hello</p>', path, date:'2026-08-04', modified:'2026-08-04' }] }
          }
          return { results: [] }
        }
        if (sql.includes('SELECT slug, title')) {
          return { results: [{slug:'test',title:'Test Post',excerpt:'',path:'2026/08/04/test',date:'2026-08-04'}] }
        }
        if (sql.includes('FROM media')) return { results: [] }
        return { results: [] }
      }
    }
  }
}
const env = { DB: mockDB, R2: { get: async () => null } }
for (const path of ['/', '/en/', '/search?q=x', '/2026/08/04/test/', '/en/2026/08/04/test/', '/robots.txt', '/sitemap.xml']) {
  try {
    const res = await app.fetch(new Request('https://test.workers.dev' + path), env)
    const body = await res.text()
    console.log(path, '->', res.status, '|', body.slice(0,60).replace(/\n/g,' '))
  } catch (e) { console.log(path, '-> EXC:', e.message.slice(0,80)) }
}
