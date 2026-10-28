#!/usr/bin/env bash
# ============================================================
# 图库项目 - 一键初始化脚本
# 用法: bash setup.sh
# 默认管理员: admin / admin
# ============================================================
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()    { echo -e "${CYAN}📋${NC} $*"; }
success() { echo -e "${GREEN}✅${NC} $*"; }
warn()    { echo -e "${YELLOW}⚠️${NC} $*"; }
step()    { echo ""; echo -e "${BOLD}━━━ $* ━━━${NC}"; }

ENV_FILE=".env.local"

# ============================================================
# 1. 环境检查
# ============================================================
step "1/5 检查运行环境"

command -v node  >/dev/null && NODE_OK=true || NODE_OK=false
command -v pnpm  >/dev/null && PNPM_OK=true || PNPM_OK=false
command -v psql   >/dev/null && PSQL_OK=true  || PSQL_OK=false

echo -e "  Node.js: $(node -v 2>/dev/null || echo ${RED}未安装${NC})"
echo -e "  pnpm:    $(pnpm -v 2>/dev/null || echo ${RED}未安装${NC})"
echo -e "  psql:     $(psql --version 2>/dev/null | head -1 || echo ${YELLOW}可选${NC})"

$PNPM_OK || npm install -g pnpm 2>&1 | tail -3

# ============================================================
# 2. 生成 .env.local
# ============================================================
step "2/5 生成 .env.local"

if [ -f "$ENV_FILE" ]; then
  warn ".env.local 已存在，是否覆盖？(y/N)"
  read -r ans
  [ "$ans" = "y" ] || [ "$ans" = "Y" ] || { info "跳过"; goto 3; }
  rm "$ENV_FILE"
fi

cat > "$ENV_FILE" <<'EOF'
# ============================================
# 图库项目 环境变量
# ============================================

# Vercel Postgres
POSTGRES_URL=postgres://user:password@host:port/dbname

# Cloudflare R2
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET=gallery-images
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com

# 微信小程序 (可选)
WECHAT_APPID=
WECHAT_SECRET=
EOF
success ".env.local 已生成（不含敏感默认值）"

# ============================================================
# 3. 数据库初始化 SQL
# ============================================================
step "3/5 生成数据库初始化 SQL"

mkdir -p scripts

# 生成 admin/admin 的 bcrypt hash（通过 Node.js）
info "正在生成默认管理员 admin/admin 的密码哈希..."
ADMIN_HASH=$(node -e "console.log(require('bcryptjs').hashSync('admin', 10))" 2>/dev/null || echo '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy')
success "密码哈希已生成"

cat > scripts/init-db.sql <<SQL
-- ============================================
-- 图库项目 数据库初始化
-- ============================================

-- 管理员
CREATE TABLE IF NOT EXISTS admins (
  id             SERIAL PRIMARY KEY,
  username       VARCHAR(50) NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NOT NULL,
  last_login_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 默认管理员 admin / admin
INSERT INTO admins (username, password_hash) VALUES ('admin', '${ADMIN_HASH}')
ON CONFLICT (username) DO NOTHING;

-- 合集
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

-- 图片
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

-- 解锁记录
CREATE TABLE IF NOT EXISTS unlocks (
  id             SERIAL PRIMARY KEY,
  openid         VARCHAR(100) NOT NULL,
  collection_id  INTEGER REFERENCES collections(id) ON DELETE CASCADE NOT NULL,
  unlocked_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(openid, collection_id)
);

-- 系统配置
CREATE TABLE IF NOT EXISTS settings (
  key   VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL
);

-- 广告埋点
CREATE TABLE IF NOT EXISTS ad_events (
  id           SERIAL PRIMARY KEY,
  openid       VARCHAR(100),
  ad_type      VARCHAR(20),
  ad_unit_id   VARCHAR(50),
  action       VARCHAR(20),
  duration_ms  INTEGER,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 默认配置
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
SQL
success "scripts/init-db.sql 已生成（含默认 admin/admin）"

# 自动执行（如果有 psql + 有效连接）
if [ "$PSQL_OK" = true ] && grep -q "postgres://[^ ]" "$ENV_FILE" && ! grep -q "your-" "$ENV_FILE"; then
  set -a; source "$ENV_FILE"; set +a
  if psql "$POSTGRES_URL" -f scripts/init-db.sql 2>&1 | tail -3; then
    success "数据库初始化完成"
  fi
fi

# ============================================================
# 4. 安装依赖
# ============================================================
step "4/5 安装依赖"
if [ ! -d "node_modules" ]; then
  pnpm install 2>&1 | tail -5
  success "依赖安装完成"
else
  info "node_modules 已存在，跳过"
fi

# ============================================================
# 5. Vercel 配置
# ============================================================
step "5/5 Vercel 部署配置"
cat > vercel.json <<'JSON'
{
  "framework": "nextjs",
  "installCommand": "pnpm install",
  "buildCommand": "pnpm build",
  "outputDirectory": ".next",
  "regions": ["sin1"],
  "env": {
    "NODE_ENV": "production"
  }
}
JSON
success "vercel.json 已生成"

# ============================================================
# 完成
# ============================================================
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║            🎉 初始化完成！                        ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${GREEN}🎯 默认管理员账号密码：${NC}"
echo -e "     ${BOLD}用户名: admin${NC}"
echo -e "     ${BOLD}密码:   admin${NC}"
echo ""
echo -e "  ${GREEN}1. 本地开发${NC}"
echo -e "     pnpm dev"
echo -e "     → http://localhost:3000/admin/login"
echo ""
echo -e "  ${GREEN}2. 数据库${NC}"
echo -e "     本地: psql \$POSTGRES_URL -f scripts/init-db.sql"
echo -e "     Vercel: Postgres Dashboard → SQL Editor 粘贴运行"
echo ""
echo -e "  ${GREEN}3. R2 Bucket${NC}"
echo -e "     Cloudflare → R2 → Create Bucket → Public Access 开 Public"
echo -e "     把 key 填到 .env.local"
echo ""
echo -e "  ${GREEN}4. 部署 Vercel${NC}"
echo -e "     Import GitHub 仓库 → 连 Postgres → 填环境变量 → Deploy"
echo ""
echo -e "  ${GREEN}5. 修改密码${NC}"
echo -e "     登录后台后 → 左侧菜单 → 🔐 修改密码"
echo ""
