// 结构一致性测试：代码里查询/写入的列必须存在于 db/schema.sql。
// 2026-10 的真实事故就是 posts.sticky 只存在于生产库、没进 schema，
// 按 schema 初始化的环境全站列表页报错。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const schema = fs.readFileSync(path.join(root, 'db/schema.sql'), 'utf8')
const src = fs.readFileSync(path.join(root, 'index.js'), 'utf8')

function tableColumns(sql, table) {
  const m = sql.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${table} \\(([\\s\\S]*?)\\n\\);`))
  assert.ok(m, `schema.sql 缺少 ${table} 建表语句`)
  return new Set(
    m[1].split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('--'))
      .map(line => line.split(/[\s,]+/)[0])
      .filter(Boolean),
  )
}

function codeColumns(source, table) {
  const cols = new Set()
  const addList = (list) => {
    if (list.includes('*') || list.includes('${')) return
    for (const part of list.split(',')) {
      const name = part.trim().split(/\s+/)[0]
      if (/^[a-z_][a-z0-9_]*$/i.test(name)) cols.add(name)
    }
  }
  // 匹配到「最近的」FROM，再判断表名，避免 SELECT 跨越整段代码吞掉别的查询
  for (const m of source.matchAll(/SELECT\s+([\s\S]*?)\s+FROM\s+([a-z_][a-z0-9_]*)/gi)) {
    if (m[2].toLowerCase() !== table) continue
    addList(m[1].replace(/\n/g, ' '))
  }
  for (const m of source.matchAll(new RegExp(`INSERT INTO ${table}\\s*\\(([^)]+)\\)`, 'gi'))) {
    addList(m[1])
  }
  // 模板里复用的列常量（如首页的 COLS）
  for (const m of source.matchAll(/const COLS = '([^']+)'/g)) addList(m[1])
  // PUT 接口的字段白名单
  for (const m of source.matchAll(/const fields = \[([^\]]+)\]/g)) {
    for (const s of m[1].matchAll(/'([^']+)'/g)) cols.add(s[1])
  }
  return cols
}

test('posts 查询用到的列都在 schema 里', () => {
  const schemaCols = tableColumns(schema, 'posts')
  const used = [...codeColumns(src, 'posts')].filter(c => c !== 'n')
  const missing = used.filter(c => !schemaCols.has(c))
  assert.deepEqual(missing, [], `schema.sql 的 posts 缺列: ${missing.join(', ')}`)
})

test('sticky 列在 schema 与代码中同时存在', () => {
  assert.ok(tableColumns(schema, 'posts').has('sticky'))
  assert.ok(/ORDER BY sticky DESC/.test(src))
})

test('media 的尺寸/alt 列在 schema 里', () => {
  const cols = tableColumns(schema, 'media')
  for (const c of ['id', 'filename', 'path', 'alt', 'width', 'height']) {
    assert.ok(cols.has(c), `media 缺列 ${c}`)
  }
})

test('schema 覆盖 Worker 依赖的全部表', () => {
  for (const t of ['posts', 'categories', 'tags', 'pages', 'media']) {
    assert.ok(new RegExp(`CREATE TABLE IF NOT EXISTS ${t} `).test(schema), `缺表 ${t}`)
  }
})

test('export default 在 catch-all 注册之后（避免顺序陷阱）', () => {
  const catchAll = src.indexOf("app.get('*'")
  const exportIdx = src.indexOf('export default app')
  assert.ok(catchAll > -1 && exportIdx > -1)
  assert.ok(exportIdx > catchAll, 'export default 必须在所有路由注册之后')
})
