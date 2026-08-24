// 本地路由测试
import { pathToFileURL } from 'url'
const mod = await import(pathToFileURL('/tmp/vcx_worker/worker_bundle.js').href)
const app = mod.default
const mockDB = {
  prepare(sql) { return { bind(...p){this._p=p;return this}, async all(){ return { results: sql.includes('SELECT slug, title') ? [{slug:'test',title:'Test Post',excerpt:'',path:'2026/08/04/test',date:'2026-08-04'}] : [] } } } }
}
const env = { DB: mockDB, R2: { get: async () => null } }
for (const path of ['/', '/en/', '/search?q=x', '/2026/08/04/test/', '/en/2026/08/04/test/']) {
  try {
    const res = await app.fetch(new Request('https://test.workers.dev' + path), env)
    console.log(path, '->', res.status)
  } catch (e) { console.log(path, '-> EXC:', e.message.slice(0,80)) }
}
