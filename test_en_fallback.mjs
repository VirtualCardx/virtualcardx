// 回归测试: /en/<只有中文记录的文章>/ 走 zh fallback 渲染 200 HTML
// (2026-08-24 修复: 该分支曾引用未定义的 path 变量, 返回 ERROR: path is not defined)
import app from './worker_bundle.js'

const zhPost = { id: 1, lang: 'zh', title: '中文测试文章', excerpt: '摘要', content: '<p>hello</p>', path: '2026/08/04/test', date: '2026-08-04', modified: '2026-08-04', featured_media: null, translation_id: null }

const mockDB = {
  prepare(sql) {
    return {
      _sql: sql, _p: [],
      bind(...p) { this._p = p; return this },
      async all() {
        const s = this._sql, p = this._p
        // 主查询 path+lang: en 无记录; fallback 查询只绑 path: 返回中文记录
        if (s.startsWith('SELECT * FROM posts WHERE path')) {
          if (p[1] === 'en') return { results: [] }
          return { results: [zhPost] }
        }
        return { results: [] }
      }
    }
  }
}
const env = { DB: mockDB, R2: { get: async () => null } }
const res = await app.fetch(new Request('https://virtualcardx.com/en/2026/08/04/test/'), env)
const html = await res.text()
const checks = {
  status: res.status === 200,
  contentType: (res.headers.get('content-type') || '').includes('text/html'),
  hasZhTitle: html.includes('中文测试文章'),
  langToggleToZh: html.includes('href="/2026/08/04/test/"'),
  hreflangZh: html.includes('href="https://virtualcardx.com/2026/08/04/test/"'),
  noErrorBody: !html.startsWith('ERROR:')
}
console.log(JSON.stringify(checks, null, 2))
if (Object.values(checks).some(v => v !== true)) process.exit(1)
console.log('OK')
