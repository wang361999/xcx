/**
 * 数据库自动初始化模块
 * 应用启动时自动检测并创建缺失的表 + 插入默认数据
 * 用户无需手动执行任何 SQL
 */
import { sql } from 'drizzle-orm';
import { db } from './db';
import bcrypt from 'bcryptjs';

// 默认密码的 bcrypt hash ("admin")
const DEFAULT_PASSWORD_HASH = bcrypt.hashSync('admin', 10);

export async function initDatabase() {
  try {
    // 1. 创建 admins 表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS admins (
        id             SERIAL PRIMARY KEY,
        username       VARCHAR(50) NOT NULL UNIQUE,
        password_hash  VARCHAR(255) NOT NULL,
        last_login_at  TIMESTAMPTZ,
        created_at     TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 2. 插入默认 admin/admin 账号（如果不存在）
    await db.execute(sql`
      INSERT INTO admins (username, password_hash)
      VALUES ('admin', ${DEFAULT_PASSWORD_HASH})
      ON CONFLICT (username) DO NOTHING
    `);

    // 3. 创建 settings 表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS settings (
        key   VARCHAR(100) PRIMARY KEY,
        value JSONB NOT NULL
      )
    `);

    // 4. 插入默认配置（如果 key 不存在）
    const defaultSettings: Record<string, string> = {
      ad_config: JSON.stringify({
        reward_video: { unit_id: '', preload: true, timeout_ms: 5000 },
        banner_home_top: { enabled: true, unit_id: '' },
        banner_collection_bottom: { enabled: true, unit_id: '' },
        banner_image_preview: { enabled: false, unit_id: '' },
        interstitial_collection_switch: { enabled: true, interval: 3, unit_id: '' },
        interstitial_success: { enabled: false, probability: 20, unit_id: '' },
      }),
      download_config: JSON.stringify({
        free_daily_limit: 3,
        require_unlock: true,
      }),
      home_config: JSON.stringify({
        show_header: true,
        header_text: '精选图集',
        show_search: false,
        show_promo_button: true,
        promo_text: '看广告解锁全部合集',
        collection_columns: 2,
        show_unlock_badge: true,
        footer_text: '',
      }),
    };

    for (const [key, value] of Object.entries(defaultSettings)) {
      await db.execute(sql`
        INSERT INTO settings ("key", value)
        VALUES (${key}, ${value}::jsonb)
        ON CONFLICT ("key") DO NOTHING
      `);
    }

    // 5. 创建 collections 表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS collections (
        id          SERIAL PRIMARY KEY,
        title       VARCHAR(200) NOT NULL,
        description TEXT,
        cover_url   TEXT NOT NULL,
        r2_key      TEXT NOT NULL,
        sort_order  INT DEFAULT 0,
        status      VARCHAR(20) DEFAULT 'published',
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 6. 创建 images 表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS images (
        id             SERIAL PRIMARY KEY,
        collection_id  INT REFERENCES collections(id) ON DELETE CASCADE,
        title          VARCHAR(200),
        image_url      TEXT NOT NULL,
        r2_key         TEXT NOT NULL,
        copyright      VARCHAR(200),
        sort_order     INT DEFAULT 0,
        created_at     TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 7. 创建 unlocks 表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS unlocks (
        id             SERIAL PRIMARY KEY,
        openid         VARCHAR(100) NOT NULL,
        collection_id  INT REFERENCES collections(id) ON DELETE CASCADE,
        unlocked_at    TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(openid, collection_id)
      )
    `);

    // 8. 创建 ad_events 表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ad_events (
        id           SERIAL PRIMARY KEY,
        openid       VARCHAR(100),
        ad_type      VARCHAR(20),
        ad_unit_id   VARCHAR(50),
        action       VARCHAR(20),
        duration_ms  INT,
        created_at   TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 9. 创建索引
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_images_collection ON images(collection_id);
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_unlocks_openid ON unlocks(openid);
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_ad_events_openid ON ad_events(openid);
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_ad_events_created ON ad_events(created_at DESC);
    `);

    console.log('✅ 数据库初始化完成');
    return true;
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    return false;
  }
}

// 缓存初始化状态，避免每次请求都跑
let initialized = false;

export async function ensureDbInit() {
  if (initialized) return;
  await initDatabase();
  initialized = true;
}
