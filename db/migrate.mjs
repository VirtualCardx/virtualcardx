#!/usr/bin/env node
// 一次性 / 可重复执行的 D1 迁移入口。
// 先做重复数据 preflight，再按 pragma 条件补列，最后执行幂等 schema 与回填。
// 用法: node db/migrate.mjs --local|--remote
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const scope = process.argv.includes('--remote') ? '--remote' : process.argv.includes('--local') ? '--local' : ''
if (!scope) {
  console.error('用法: node db/migrate.mjs --local|--remote')
  process.exit(2)
}
const wrangler = path.join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.js')
if (!existsSync(wrangler)) {
  console.error('未找到本地 wrangler，请先 npm ci')
  process.exit(2)
}

function runWrangler(args) {
  return spawnSync(process.execPath, [wrangler, 'd1', 'execute', 'vcx-db', scope, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: process.env,
  })
}

function invoke(args, { allowFailure = false } = {}) {
  const result = runWrangler(args)
  if (result.status !== 0 && !allowFailure) {
    console.error(result.stdout || '')
    console.error(result.stderr || '')
    process.exit(result.status || 1)
  }
  return result
}

function jsonCommand(sql) {
  const result = runWrangler(['--json', '--command', sql])
  if (result.status !== 0) {
    console.error(result.stdout || '')
    console.error(result.stderr || '')
    process.exit(result.status || 1)
  }
  const start = result.stdout.indexOf('[')
  const end = result.stdout.lastIndexOf(']')
  if (start < 0 || end < start) throw new Error(`无法解析 wrangler JSON 输出:\n${result.stdout}`)
  return JSON.parse(result.stdout.slice(start, end + 1))
}

function rows(command) {
  const payload = jsonCommand(command)
  return payload.flatMap(entry => entry.results || [])
}

const duplicateChecks = [
  ['posts path/lang', 'SELECT path, lang, COUNT(*) AS n FROM posts GROUP BY path, lang HAVING n > 1 LIMIT 20'],
  ['pages slug/lang', 'SELECT slug, lang, COUNT(*) AS n FROM pages GROUP BY slug, lang HAVING n > 1 LIMIT 20'],
  ['categories slug', 'SELECT slug, COUNT(*) AS n FROM categories GROUP BY slug HAVING n > 1 LIMIT 20'],
]
for (const [label, sql] of duplicateChecks) {
  const dupes = rows(sql)
  if (dupes.length) {
    console.error(`迁移中止：${label} 存在重复值，请先合并：`)
    console.error(JSON.stringify(dupes, null, 2))
    process.exit(1)
  }
}

const columns = new Set(rows('PRAGMA table_info(posts)').map(row => row.name))
for (const [name, definition] of [
  ['sticky', 'INTEGER DEFAULT 0'],
  ['date_ts', 'INTEGER'],
  ['modified_ts', 'INTEGER'],
]) {
  if (columns.has(name)) continue
  const result = invoke(['--command', `ALTER TABLE posts ADD COLUMN ${name} ${definition}`], { allowFailure: true })
  if (result.status !== 0 && !/duplicate column/i.test(`${result.stdout}\n${result.stderr}`)) {
    console.error(result.stdout || '')
    console.error(result.stderr || '')
    process.exit(result.status || 1)
  }
}
const refreshed = new Set(rows('PRAGMA table_info(posts)').map(row => row.name))
for (const name of ['sticky', 'date_ts', 'modified_ts']) {
  if (!refreshed.has(name)) {
    console.error(`迁移中止：posts.${name} 未能添加`)
    process.exit(1)
  }
}

invoke(['--file', path.join(root, 'db/schema.sql')])
invoke(['--file', path.join(root, 'db/migrations/2026-10-31-query-indexes.sql')])

const integrity = jsonCommand("SELECT COUNT(*) AS n FROM posts WHERE date IS NOT NULL AND date <> '' AND date_ts IS NULL")
console.log(`迁移完成 (${scope})。无法解析日期的文章数: ${integrity[0]?.results?.[0]?.n ?? 'unknown'}`)
console.log('提示：本地 Worker 缓存需重启 dev；生产 HTML 已降至 5 分钟缓存，写 API 会主动清当前 PoP。')
