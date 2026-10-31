-- 2026-10-31 生产库对齐迁移 (vcx-db)
-- sticky 已收录在 db/schema.sql，生产库也已在 2026-08 手工补过。
-- 这里不再包含 ALTER；需要补列或处理存量数据的库统一用：
--   node db/migrate.mjs --remote

CREATE INDEX IF NOT EXISTS idx_posts_lang_status ON posts(lang, status);
CREATE INDEX IF NOT EXISTS idx_posts_path_lang ON posts(path, lang);
CREATE INDEX IF NOT EXISTS idx_pages_slug_lang ON pages(slug, lang);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_media_filename ON media(filename);
CREATE INDEX IF NOT EXISTS idx_media_path ON media(path);
