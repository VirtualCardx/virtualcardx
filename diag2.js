// 诊断 v2: 只测 env 键, 不碰 DB/R2
export default {
  async fetch(request, env) {
    return new Response(JSON.stringify({ keys: Object.keys(env) }), { headers: { 'Content-Type': 'application/json' } })
  }
}
