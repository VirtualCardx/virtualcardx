-- VirtualCardX D1 数据库表结构 (vcx-db)
-- 新环境初始化：npx wrangler d1 execute vcx-db --remote --file db/schema.sql
-- posts.translation_id 指向另一语言配对文章的 id。
-- posts.date / modified 保留原始展示值；date_ts / modified_ts 是索引排序用的 Unix 秒。
-- posts.category_ids 保留兼容；规范化查询使用 post_categories，触发器负责同步。

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
  date_ts INTEGER,
  modified_ts INTEGER,
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

CREATE TABLE IF NOT EXISTS post_categories (
  post_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  PRIMARY KEY (post_id, category_id)
);

CREATE TABLE IF NOT EXISTS site_events (
  day TEXT NOT NULL,
  kind TEXT NOT NULL,
  path TEXT NOT NULL,
  target TEXT NOT NULL DEFAULT '',
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, kind, path, target)
);

CREATE INDEX IF NOT EXISTS idx_posts_translation ON posts(translation_id);
CREATE INDEX IF NOT EXISTS idx_posts_feed ON posts(lang, status, sticky DESC, date_ts DESC);
CREATE INDEX IF NOT EXISTS idx_posts_modified ON posts(lang, status, modified_ts DESC);
CREATE UNIQUE INDEX IF NOT EXISTS ux_posts_path_lang ON posts(path, lang);
CREATE INDEX IF NOT EXISTS idx_pages_lang ON pages(lang);
CREATE UNIQUE INDEX IF NOT EXISTS ux_pages_slug_lang ON pages(slug, lang);
CREATE UNIQUE INDEX IF NOT EXISTS ux_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_media_path ON media(path);
CREATE INDEX IF NOT EXISTS idx_media_filename ON media(filename);
CREATE INDEX IF NOT EXISTS idx_post_categories_category ON post_categories(category_id, post_id);

-- 站内搜索索引。trigram 支持中英文子串，避免对长正文反复做 %q% 全表扫描。
CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(
  title, content,
  content='posts', content_rowid='id',
  tokenize='trigram'
);

-- 可读英文日期转为 ISO 后由 unixepoch 解析；未知格式保留 NULL，不伪造日期。
CREATE TRIGGER IF NOT EXISTS trg_posts_dates_insert
AFTER INSERT ON posts
BEGIN
  UPDATE posts SET
    date_ts = CASE
      WHEN NEW.date GLOB '????-??-??*' THEN unixepoch(NEW.date)
      WHEN NEW.date LIKE '% %, %' THEN unixepoch(
        substr(NEW.date, instr(NEW.date, ', ') + 2) || '-' ||
        printf('%02d', CASE substr(NEW.date, 1, instr(NEW.date, ' ') - 1)
          WHEN 'January' THEN 1 WHEN 'February' THEN 2 WHEN 'March' THEN 3
          WHEN 'April' THEN 4 WHEN 'May' THEN 5 WHEN 'June' THEN 6
          WHEN 'July' THEN 7 WHEN 'August' THEN 8 WHEN 'September' THEN 9
          WHEN 'October' THEN 10 WHEN 'November' THEN 11 WHEN 'December' THEN 12 END) || '-' ||
        printf('%02d', CAST(substr(NEW.date, instr(NEW.date, ' ') + 1,
          instr(NEW.date, ',') - instr(NEW.date, ' ') - 1) AS INTEGER)))
      ELSE NULL END,
    modified_ts = CASE
      WHEN NEW.modified GLOB '????-??-??*' THEN unixepoch(NEW.modified)
      WHEN NEW.modified LIKE '% %, %' THEN unixepoch(
        substr(NEW.modified, instr(NEW.modified, ', ') + 2) || '-' ||
        printf('%02d', CASE substr(NEW.modified, 1, instr(NEW.modified, ' ') - 1)
          WHEN 'January' THEN 1 WHEN 'February' THEN 2 WHEN 'March' THEN 3
          WHEN 'April' THEN 4 WHEN 'May' THEN 5 WHEN 'June' THEN 6
          WHEN 'July' THEN 7 WHEN 'August' THEN 8 WHEN 'September' THEN 9
          WHEN 'October' THEN 10 WHEN 'November' THEN 11 WHEN 'December' THEN 12 END) || '-' ||
        printf('%02d', CAST(substr(NEW.modified, instr(NEW.modified, ' ') + 1,
          instr(NEW.modified, ',') - instr(NEW.modified, ' ') - 1) AS INTEGER)))
      ELSE NULL END
  WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_posts_dates_update
AFTER UPDATE OF date, modified ON posts
BEGIN
  UPDATE posts SET
    date_ts = CASE
      WHEN NEW.date GLOB '????-??-??*' THEN unixepoch(NEW.date)
      WHEN NEW.date LIKE '% %, %' THEN unixepoch(
        substr(NEW.date, instr(NEW.date, ', ') + 2) || '-' ||
        printf('%02d', CASE substr(NEW.date, 1, instr(NEW.date, ' ') - 1)
          WHEN 'January' THEN 1 WHEN 'February' THEN 2 WHEN 'March' THEN 3
          WHEN 'April' THEN 4 WHEN 'May' THEN 5 WHEN 'June' THEN 6
          WHEN 'July' THEN 7 WHEN 'August' THEN 8 WHEN 'September' THEN 9
          WHEN 'October' THEN 10 WHEN 'November' THEN 11 WHEN 'December' THEN 12 END) || '-' ||
        printf('%02d', CAST(substr(NEW.date, instr(NEW.date, ' ') + 1,
          instr(NEW.date, ',') - instr(NEW.date, ' ') - 1) AS INTEGER)))
      ELSE NULL END,
    modified_ts = CASE
      WHEN NEW.modified GLOB '????-??-??*' THEN unixepoch(NEW.modified)
      WHEN NEW.modified LIKE '% %, %' THEN unixepoch(
        substr(NEW.modified, instr(NEW.modified, ', ') + 2) || '-' ||
        printf('%02d', CASE substr(NEW.modified, 1, instr(NEW.modified, ' ') - 1)
          WHEN 'January' THEN 1 WHEN 'February' THEN 2 WHEN 'March' THEN 3
          WHEN 'April' THEN 4 WHEN 'May' THEN 5 WHEN 'June' THEN 6
          WHEN 'July' THEN 7 WHEN 'August' THEN 8 WHEN 'September' THEN 9
          WHEN 'October' THEN 10 WHEN 'November' THEN 11 WHEN 'December' THEN 12 END) || '-' ||
        printf('%02d', CAST(substr(NEW.modified, instr(NEW.modified, ' ') + 1,
          instr(NEW.modified, ',') - instr(NEW.modified, ' ') - 1) AS INTEGER)))
      ELSE NULL END
  WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_post_categories_insert
AFTER INSERT ON posts
BEGIN
  INSERT OR IGNORE INTO post_categories(post_id, category_id)
    SELECT NEW.id, CAST(value AS INTEGER) FROM json_each(NEW.category_ids)
    WHERE CAST(value AS INTEGER) > 0;
END;

CREATE TRIGGER IF NOT EXISTS trg_post_categories_update
AFTER UPDATE OF category_ids ON posts
BEGIN
  DELETE FROM post_categories WHERE post_id = NEW.id;
  INSERT OR IGNORE INTO post_categories(post_id, category_id)
    SELECT NEW.id, CAST(value AS INTEGER) FROM json_each(NEW.category_ids)
    WHERE CAST(value AS INTEGER) > 0;
END;

CREATE TRIGGER IF NOT EXISTS trg_post_categories_delete
AFTER DELETE ON posts
BEGIN
  DELETE FROM post_categories WHERE post_id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_posts_fts_insert
AFTER INSERT ON posts
BEGIN
  INSERT INTO posts_fts(rowid, title, content) VALUES (NEW.id, NEW.title, NEW.content);
END;

CREATE TRIGGER IF NOT EXISTS trg_posts_fts_delete
AFTER DELETE ON posts
BEGIN
  INSERT INTO posts_fts(posts_fts, rowid, title, content)
    VALUES ('delete', OLD.id, OLD.title, OLD.content);
END;

CREATE TRIGGER IF NOT EXISTS trg_posts_fts_update
AFTER UPDATE OF title, content ON posts
BEGIN
  INSERT INTO posts_fts(posts_fts, rowid, title, content)
    VALUES ('delete', OLD.id, OLD.title, OLD.content);
  INSERT INTO posts_fts(rowid, title, content) VALUES (NEW.id, NEW.title, NEW.content);
END;
