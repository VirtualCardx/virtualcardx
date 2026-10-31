-- translation_id 在 WordPress 迁移数据里已经不可信：442 条文章里 206 条的指针指向同语言记录，
-- 201 条指向另一语言但无关的文章，只有 4 条构成双向对应。
-- 唯一稳定、可验证的等价关系是「同路径 + 另一语言 + 已发布」，据此重建；
-- 重建后仍指不到对手方的指针一律清空——留着只会让下一次查询再踩同一个坑。
-- 幂等：重复执行结果不变。回滚依据：迁移前的 wrangler d1 export 备份。

UPDATE posts AS p
SET translation_id = (
  SELECT t.id FROM posts t
  WHERE t.path = p.path AND t.lang <> p.lang AND t.status = 'publish'
  ORDER BY t.id LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM posts t
  WHERE t.path = p.path AND t.lang <> p.lang AND t.status = 'publish'
);

UPDATE posts
SET translation_id = NULL
WHERE translation_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM posts t
    WHERE t.id = posts.translation_id
      AND t.path = posts.path
      AND t.lang <> posts.lang
      AND t.status = 'publish'
  );
