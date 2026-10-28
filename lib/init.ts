/**
 * 数据库自动初始化模块
 * 应用启动时自动检测并创建缺失的表 + 插入默认数据
 * 用户无需手动执行任何 SQL
 */
import { sql as vercelSql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';

// 默认密码的 bcrypt hash ("admin")
const DEFAULT_PASSWORD_HASH = bcrypt.hashSync('admin', 10);

async function run(sqlText: string, params?: any[]) {
  try {
    await vercelSql.query(sqlText, params);
    console.log(`  ✅ ${sqlText.slice(0, 80)}...`);
    return true;
  } catch (e: any) {
    console.error(`  ❌ Failed: ${sqlText.slice(0, 80)}... → ${e?.message}`);
    return false;
  }
}

export async function initDatabase() {
  console.log('🔧 [DB INIT] 开始初始化数据库...');

  // 1. admins 表
  await run(`
    CREATE TABLE IF NOT EXISTS admins (
      id             SERIAL PRIMARY KEY,
      username       VARCHAR(50) NOT NULL UNIQUE,
      password_hash  VARCHAR(255) NOT NULL,
      last_login_at  TIMESTAMPTZ,
      created_at     TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // 2. 插入默认 admin/admin
  await run(
    `INSERT INTO admins (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING`,
    ['admin', DEFAULT_PASSWORD_HASH]
  );

  // 3. settings 表
  await run(`
    CREATE TABLE IF NOT EXISTS settings (
      key   VARCHAR(100) PRIMARY KEY,
      value JSONB NOT NULL
    )
  `);

  // 4. 默认配置
  const defaultSettings: Record<string, string> = {
    ad_config: JSON.stringify({
      reward_video: { unit_id: '', preload: true, timeout_ms: 5000 },
      banner_home_top: { enabled: true, unit_id: '' },
      banner_collection_bottom: { enabled: true, unit_id: '' },
      banner_image_preview: { enabled: false, unit_id: '' },
      interstitial_collection_switch: { enabled: true, interval: 3, unit_id: '' },
      interstitial_success: { enabled: false, probability: 20, unit_id: '' },
    }),
    download_config: JSON.stringify({ free_daily_limit: 3, require_unlock: true }),
    home_config: JSON.stringify({
      show_header: true, header_text: '精选图集', show_search: false,
      show_promo_button: true, promo_text: '看广告解锁全部合集',
      collection_columns: 2, show_unlock_badge: true, footer_text: '',
    }),
  };
  for (const [key, value] of Object.entries(defaultSettings)) {
    await run(
      `INSERT INTO settings ("key", value) VALUES ($1, $2::jsonb) ON CONFLICT ("key") DO NOTHING`,
      [key, value]
    );
  }

  // 5. collections 表
  await run(`
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

  // 6. images 表
  await run(`
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

  // 7. unlocks 表
  await run(`
    CREATE TABLE IF NOT EXISTS unlocks (
      id             SERIAL PRIMARY KEY,
      openid         VARCHAR(100) NOT NULL,
      collection_id  INT REFERENCES collections(id) ON DELETE CASCADE,
      unlocked_at    TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(openid, collection_id)
    )
  `);

  // 8. ad_events 表
  await run(`
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

  // 9. 索引
  await run(`CREATE INDEX IF NOT EXISTS idx_images_collection ON images(collection_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_unlocks_openid ON unlocks(openid)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_ad_events_openid ON ad_events(openid)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_ad_events_created ON ad_events(created_at DESC)`);

  console.log('✅ [DB INIT] 完成');
}

// 缓存初始化状态
let initialized = false;

export async function ensureDbInit() {
  if (initialized) return;
  try {
    await initDatabase();
    initialized = true;
  } catch (e: any) {
    console.error('[DB INIT] ensure failed:', e?.message);
  }
}
