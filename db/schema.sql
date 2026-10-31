-- VirtualCardX D1 数据库表结构 (vcx-db)
-- 忠实导出自生产库 2026-08-24，2026-10-31 同步 Worker 实际查询用到的列（sticky）:
--   npx wrangler d1 execute vcx-db --remote --json --command \
--     "SELECT type,name,sql FROM sqlite_master WHERE sql IS NOT NULL ORDER BY type,name"
-- 应用方式 (新环境初始化):
--   npx wrangler d1 execute vcx-db --remote --file db/schema.sql
--
-- 说明:
-- - posts.category_ids / posts.tag_ids 为 JSON 数组文本 (如 '[1,2]')，
--   Worker 代码统一 JSON.stringify 写入 / JSON.parse 读取，null 表示清空。
-- - posts.translation_id 指向另一语言配对文章的 id (中英互译，同 slug)。
-- - posts.sticky 为置顶权重 (0 = 不置顶)，Worker 全部列表查询按 sticky DESC, date DESC 排序；
--   2026-10-31 前 schema 漏掉此列，导致按本文件初始化的新环境所有列表页报错。
-- - media.width/height 为 2026-08-23 SEO 修复时补充的列。

-- ============================================================
-- 表
-- ============================================================

-- posts.category_ids / posts.tag_ids 为 JSON 数组文本 (如 '[1,2]')，
--   元素分别为 categories.id / tags.id；Worker 代码统一 JSON.stringify 写入 / JSON.parse 读取，null 表示清空。
-- posts.translation_id 指向另一语言配对文章的 id (中英互译，同 slug)。

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lang TEXT NOT NULL DEFAULT 'zh',
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  excerpt TEXT DEFAULT '',
  path TEXT NOT NULL,
  date TEXT,
  modified TEXT,
  status TEXT DEFAULT 'publish',
  featured_media INTEGER,
  category_ids TEXT DEFAULT '[]',
  tag_ids TEXT DEFAULT '[]',
  translation_id INTEGER,
  sticky INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  parent INTEGER DEFAULT 0,
  description TEXT DEFAULT '',
  count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT DEFAULT '',
  count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lang TEXT NOT NULL DEFAULT 'zh',
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  path TEXT NOT NULL,
  date TEXT,
  translation_id INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY,
  filename TEXT NOT NULL,
  path TEXT NOT NULL,
  mime_type TEXT DEFAULT '',
  alt TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  width INTEGER,
  height INTEGER
);

-- ============================================================
-- 索引
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_posts_lang ON posts(lang);
CREATE INDEX IF NOT EXISTS idx_posts_path ON posts(path);
CREATE INDEX IF NOT EXISTS idx_posts_translation ON posts(translation_id);
CREATE INDEX IF NOT EXISTS idx_posts_lang_status ON posts(lang, status);
CREATE INDEX IF NOT EXISTS idx_posts_path_lang ON posts(path, lang);
CREATE INDEX IF NOT EXISTS idx_pages_lang ON pages(lang);
CREATE INDEX IF NOT EXISTS idx_pages_slug_lang ON pages(slug, lang);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_media_filename ON media(filename);
CREATE INDEX IF NOT EXISTS idx_media_path ON media(path);
