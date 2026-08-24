// 诊断 Worker: 只测 DB + R2 绑定
export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const out = {}
    // 1. DB
    try {
      const r = await env.DB.prepare('SELECT COUNT(*) as n FROM posts').all()
      out.db = { ok: true, result: r.results }
    } catch (e) { out.db = { ok: false, err: String(e).slice(0,200) } }
    // 2. R2
    try {
      const o = await env.R2.get('nonexistent')
      out.r2 = { ok: true, got: o === null ? 'null' : 'object' }
    } catch (e) { out.r2 = { ok: false, err: String(e).slice(0,200) } }
    // 3. env 键
    out.envKeys = Object.keys(env)
    return new Response(JSON.stringify(out, null, 2), { headers: { 'Content-Type': 'application/json' } })
  }
}
