import assert from 'node:assert/strict'
import worker from './index.js'

class Statement {
  constructor(sql, env) { this.sql = sql; this.env = env; this.args = [] }
  bind(...args) { this.args = args; return this }
  async all() {
    const s = this.sql
    if (s.includes('FROM pages')) return { results: [] }
    if (s.includes('FROM categories')) return { results: [] }
    if (s.includes('FROM posts WHERE path')) {
      if (this.args[0] === 'coinex-orderly-wind-down-withdrawal-timeline') return { results: [this.env.post] }
      return { results: [] }
    }
    if (s.includes('FROM posts WHERE lang')) return { results: [] }
    if (s.includes('FROM media WHERE id')) return { results: [{ path: 'media/test.jpg', alt: 'test', width: 1600, height: 900 }] }
    return { results: [] }
  }
}
const post = { id: 411, lang: 'zh', path: 'coinex-orderly-wind-down-withdrawal-timeline', title: 'CoinEx', excerpt: 'test', content: '<p>test</p>', date: '2026-09-20T00:00:00.000Z', modified: '2026-09-19T17:13:28.414Z', featured_media: 1, translation_id: 406 }
const env = { post, DB: { prepare(sql) { return new Statement(sql, env) } }, R2: { async get() { return null } } }

const slash = await worker.fetch(new Request('https://virtualcardx.com/about?x=1'), env, {})
assert.equal(slash.status, 301)
assert.equal(slash.headers.get('location'), 'https://virtualcardx.com/about/?x=1')

const missing = await worker.fetch(new Request('https://virtualcardx.com/missing/'), env, {})
assert.equal(missing.status, 404)
const missingHtml = await missing.text()
assert.ok(!missingHtml.includes('rel="canonical"'))
assert.ok(!missingHtml.includes('hreflang='))

const article = await worker.fetch(new Request('https://virtualcardx.com/coinex-orderly-wind-down-withdrawal-timeline/'), env, {})
assert.equal(article.status, 200)
const articleHtml = await article.text()
assert.match(articleHtml, /"datePublished":"2026-09-20"/)
assert.match(articleHtml, /"dateModified":"2026-09-20"/)
assert.match(articleHtml, /width="1600" height="900"/)
console.log(JSON.stringify({ pass: true, assertions: 10 }))
