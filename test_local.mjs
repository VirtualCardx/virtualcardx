// 本地模拟: 用 node 运行 bundle 的 fetch, 注入 mock env
import { readFileSync } from 'fs'
import vm from 'vm'

const code = readFileSync('/tmp/vcx_worker/worker_bundle.js','utf8')
// bundle 是 ESM, 转成 CJS 执行或用动态 import
import { pathToFileURL } from 'url'

// mock D1
const mockDB = {
  prepare(sql) {
    return {
      bind(...params) { this._p = params; return this },
      async all() {
        console.log('  [mock DB]', sql.slice(0,80), 'params:', JSON.stringify(this._p||[]).slice(0,80))
        return { results: [] }
      },
      async run() { return { success:true } },
    }
  }
}
const mockR2 = { get: async () => null }

// 通过动态 import 加载 bundle (ESM)
const mod = await import(pathToFileURL('/tmp/vcx_worker/worker_bundle.js').href)
const app = mod.default
console.log('app type:', typeof app)
console.log('app.fetch:', typeof app.fetch)

// 构造 request 并调用
const env = { DB: mockDB, R2: mockR2 }
try {
  const res = await app.fetch(new Request('https://vcx-new.xiaoyanggekuajing.workers.dev/'), env)
  console.log('res:', res.status)
  const body = await res.text()
  console.log('body head:', body.slice(0,200))
} catch (e) {
  console.log('EXCEPTION:', e.message)
  console.log(e.stack.split('\n').slice(0,6).join('\n'))
}
