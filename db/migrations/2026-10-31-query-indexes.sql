-- 2026-10-31 查询索引与搜索索引回填
-- 由 db/migrate.mjs 在确认新列和重复数据后执行；本文件本身可重复运行。

-- 触发 AFTER UPDATE OF date, modified，为所有存量行生成 date_ts / modified_ts。
UPDATE posts SET date = date, modified = modified;

INSERT OR IGNORE INTO post_categories(post_id, category_id)
  SELECT p.id, CAST(j.value AS INTEGER)
  FROM posts p, json_each(COALESCE(p.category_ids, '[]')) j
  WHERE CAST(j.value AS INTEGER) > 0;

INSERT INTO posts_fts(posts_fts) VALUES ('rebuild');

DROP INDEX IF EXISTS idx_posts_lang;
DROP INDEX IF EXISTS idx_posts_path;
DROP INDEX IF EXISTS idx_posts_lang_status;
DROP INDEX IF EXISTS idx_posts_lang_status_date;

ANALYZE;
