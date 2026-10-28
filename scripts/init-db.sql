-- ============================================
-- 图库项目 数据库初始化脚本
-- 执行方式: psql $POSTGRES_URL -f scripts/init-db.sql
-- 或 Vercel Postgres Dashboard SQL Editor 直接粘贴运行
-- ============================================

-- 合集表
CREATE TABLE IF NOT EXISTS collections (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  description TEXT,
  cover_url   TEXT NOT NULL,
  r2_key      TEXT NOT NULL,
  sort_order  INTEGER DEFAULT 0,
  status      VARCHAR(20) DEFAULT 'published',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 图片表
CREATE TABLE IF NOT EXISTS images (
  id             SERIAL PRIMARY KEY,
  collection_id  INTEGER REFERENCES collections(id) ON DELETE CASCADE NOT NULL,
  title          VARCHAR(200),
  image_url      TEXT NOT NULL,
  r2_key         TEXT NOT NULL,
  copyright      VARCHAR(200),
  sort_order     INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_images_collection ON images(collection_id);

-- 解锁记录表
CREATE TABLE IF NOT EXISTS unlocks (
  id             SERIAL PRIMARY KEY,
  openid         VARCHAR(100) NOT NULL,
  collection_id  INTEGER REFERENCES collections(id) ON DELETE CASCADE NOT NULL,
  unlocked_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(openid, collection_id)
);
CREATE INDEX IF NOT EXISTS idx_unlocks_openid ON unlocks(openid);

-- 系统配置表
CREATE TABLE IF NOT EXISTS settings (
  key   VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL
);

-- 广告埋点表
CREATE TABLE IF NOT EXISTS ad_events (
  id           SERIAL PRIMARY KEY,
  openid       VARCHAR(100),
  ad_type      VARCHAR(20),
  ad_unit_id   VARCHAR(50),
  action       VARCHAR(20),
  duration_ms  INTEGER,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ad_events_openid ON ad_events(openid);
CREATE INDEX IF NOT EXISTS idx_ad_events_created ON ad_events(created_at DESC);

-- 初始化默认配置
INSERT INTO settings (key, value) VALUES
('ad_config', '{
  "reward_video": {"unit_id": "", "preload": true, "timeout_ms": 5000},
  "banner_home_top": {"enabled": true, "unit_id": ""},
  "banner_home_bottom": {"enabled": false, "unit_id": ""},
  "banner_collection_bottom": {"enabled": true, "unit_id": ""},
  "banner_image_preview": {"enabled": false, "unit_id": ""},
  "interstitial_collection_switch": {"enabled": true, "interval": 3, "unit_id": ""},
  "interstitial_success": {"enabled": false, "probability": 20, "unit_id": ""}
}'::jsonb),
('home_config', '{
  "show_header": true,
  "header_text": "精选图集",
  "show_search": false,
  "show_promo_button": true,
  "promo_text": "看广告解锁全部合集 24小时",
  "collection_columns": 2,
  "show_unlock_badge": true
}'::jsonb),
('download_config', '{
  "free_daily_limit": 3,
  "require_unlock": true
}'::jsonb)
ON CONFLICT (key) DO NOTHING;
