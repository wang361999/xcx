#!/usr/bin/env bash
# ============================================================
# 图库项目 - 一键初始化脚本
# 用法: bash setup.sh
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
error()   { echo -e "${RED}❌${NC} $*"; }
step()    { echo ""; echo -e "${BOLD}━━━ $* ━━━${NC}"; }

# ============================================================
# 1. 检查环境
# ============================================================
step "1/5 检查运行环境"

command -v node >/dev/null 2>&1 && NODE_OK=true || NODE_OK=false
command -v pnpm >/dev/null 2>&1 && PNPM_OK=true || PNPM_OK=false
command -v psql  >/dev/null 2>&1 && PSQL_OK=true  || PSQL_OK=false

echo -e "  Node.js: $(node -v 2>/dev/null || echo ${RED}未安装${NC})"
echo -e "  pnpm:    $(pnpm -v 2>/dev/null || echo ${RED}未安装${NC})"
echo -e "  psql:     $(psql --version 2>/dev/null | head -1 || echo ${YELLOW}可选（仅本地初始化数据库需要）${NC})"

if [ "$NODE_OK" = false ]; then
  error "请先安装 Node.js 18+ ：https://nodejs.org/"
  exit 1
fi

if [ "$PNPM_OK" = false ]; then
  info "正在安装 pnpm ..."
  npm install -g pnpm 2>&1 | tail -3
fi

# ============================================================
# 2. 创建 .env.local
# ============================================================
step "2/5 生成 .env.local 环境变量"

ENV_FILE=".env.local"

generate_token() {
  if [ -r /dev/urandom ]; then
    head -c 32 /dev/urandom | xxd -p 2>/dev/null || head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n'
  else
    openssl rand -hex 32 2>/dev/null || echo "change-me-$(date +%s)"
  fi
}

ADMIN_TOKEN=$(generate_token)

if [ -f "$ENV_FILE" ]; then
  warn ".env.local 已存在，是否覆盖？(y/N)"
  read -r ans
  if [ "$ans" != "y" ] && [ "$ans" != "Y" ]; then
    info "跳过生成 .env.local"
  else
    rm "$ENV_FILE"
  fi
fi

if [ ! -f "$ENV_FILE" ]; then
  cat > "$ENV_FILE" <<EOF
# ============================================
# 图库项目 环境变量 (自动生成)
# ============================================

# Vercel Postgres 连接字符串
# 在 Vercel Dashboard → Storage → Create Database → Postgres 创建后获取
POSTGRES_URL=postgres://user:password@host:port/dbname

# Cloudflare R2 对象存储
# 在 Cloudflare Dashboard → R2 → Create Bucket 创建
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET=gallery-images
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com

# 管理员 Token (后台登录用) - 已自动生成随机值
ADMIN_TOKEN=${ADMIN_TOKEN}

# 微信小程序 (可选，auth 接口用)
WECHAT_APPID=
WECHAT_SECRET=
EOF
  success ".env.local 已生成"
  echo ""
  info "自动生成的 ADMIN_TOKEN: ${BOLD}${ADMIN_TOKEN}${NC}"
  info "后端部署到 Vercel 后，需要把同样的环境变量也配置到 Vercel Dashboard"
fi

# ============================================================
# 3. 创建数据库初始化 SQL
# ============================================================
step "3/5 生成数据库初始化 SQL"

mkdir -p scripts

cat > scripts/init-db.sql <<'SQL'
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
SQL

success "scripts/init-db.sql 已生成"

# 如果有 psql 且 POSTGRES_URL 已配置，尝试自动执行
if [ "$PSQL_OK" = true ] && grep -q "postgres://[^ ]" "$ENV_FILE" && ! grep -q "postgres://.*your-" "$ENV_FILE"; then
  info "检测到 psql 和有效的 POSTGRES_URL，尝试自动初始化数据库..."
  set -a
  source "$ENV_FILE"
  set +a
  if psql "$POSTGRES_URL" -f scripts/init-db.sql 2>&1 | tail -5; then
    success "数据库表已创建 ✓"
  else
    warn "自动执行 SQL 失败，请手动执行: psql \$POSTGRES_URL -f scripts/init-db.sql"
  fi
fi

# ============================================================
# 4. 安装依赖
# ============================================================
step "4/5 安装项目依赖"

if [ ! -d "node_modules" ]; then
  pnpm install 2>&1 | tail -5
  success "依赖安装完成"
else
  info "node_modules 已存在，跳过安装 (运行 pnpm install 可重新安装)"
fi

# ============================================================
# 5. 创建 Vercel 部署配置
# ============================================================
step "5/5 生成 Vercel 部署配置"

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
success "vercel.json 已生成 (部署到新加坡节点 sin1 适合国内用户)"

# ============================================================
# 完成
# ============================================================
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║            🎉 初始化完成！下一步：                  ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${GREEN}1. 本地开发${NC}"
echo -e "     pnpm dev"
echo -e "     → 打开 http://localhost:3000  用 Token 登录"
echo ""
echo -e "  ${GREEN}2. 数据库初始化 (如果没自动执行)${NC}"
echo -e "     psql \$POSTGRES_URL -f scripts/init-db.sql"
echo -e "     或 Vercel Postgres Dashboard 粘贴 scripts/init-db.sql 运行"
echo ""
echo -e "  ${GREEN}3. 创建 Cloudflare R2 Bucket${NC}"
echo -e "     → https://dash.cloudflare.com → R2 → Create Bucket"
echo -e "     → Bucket Settings → Public Access → 开 Public (拿到 .r2.dev URL)"
echo -e "     → API Tokens → Create API Token (R2:Edit 权限)"
echo -e "     → 把 key 填到 .env.local"
echo ""
echo -e "  ${GREEN}4. 部署到 Vercel${NC}"
echo -e "     → Vercel → New Project → Import 这个 GitHub 仓库"
echo -e "     → 连 Postgres Storage"
echo -e "     → Environment Variables 填 .env.local 里的值"
echo -e "     → Deploy 🚀"
echo ""
echo -e "  ${GREEN}5. 小程序 request 合法域名${NC}"
echo -e "     微信小程序后台 → 开发 → 开发设置 → 服务器域名"
echo -e "     request合法域名: https://你的后端域名"
echo ""
echo -e "  ${YELLOW}📌 当前 ADMIN_TOKEN:${NC} ${BOLD}${ADMIN_TOKEN}${NC}"
echo -e "     (后端部署后也要把这个值配到 Vercel 的 Environment Variables)"
echo ""
