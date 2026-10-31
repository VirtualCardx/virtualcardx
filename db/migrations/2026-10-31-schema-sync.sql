-- 2026-10-31 生产库对齐迁移 (vcx-db)
-- 背景: Worker 从 2026-08 起所有列表查询都按 sticky DESC 排序，但 db/schema.sql
-- 漏了该列。生产库当时是手工加的，新建环境按 schema.sql 初始化会全站 500。
--
-- 幂等执行: 下面 ALTER 在列已存在时会报 "duplicate column name"，属预期，
-- 用 --yes 执行时跳过该语句继续后续 CREATE INDEX 即可。
--   npx wrangler d1 execute vcx-db --remote --file db/migrations/2026-10-31-schema-sync.sql
--
-- 执行前确认列是否已存在:
--   npx wrangler d1 execute vcx-db --remote --command "PRAGMA table_info(posts)"

ALTER TABLE posts ADD COLUMN sticky INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_posts_lang_status ON posts(lang, status);
CREATE INDEX IF NOT EXISTS idx_posts_path_lang ON posts(path, lang);
CREATE INDEX IF NOT EXISTS idx_pages_slug_lang ON pages(slug, lang);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_media_filename ON media(filename);
CREATE INDEX IF NOT EXISTS idx_media_path ON media(path);
