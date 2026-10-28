import type { NextConfig } from "next";

// 图片对外访问：小程序侧只认自己的域名，所以 /img/* 反代到 R2 公共域名
// R2_PUBLIC_ORIGIN 例：https://pub-xxxxxxxxxxxx.r2.dev
const R2_PUBLIC_ORIGIN = (process.env.R2_PUBLIC_ORIGIN || "").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  // pg 必须在 Node 运行时外部加载，否则 Turbopack 打包会解析不到 Node 内置子模块
  serverExternalPackages: ["pg"],
  async rewrites() {
    if (!R2_PUBLIC_ORIGIN) return [];
    return [
      {
        source: "/img/:path*",
        destination: `${R2_PUBLIC_ORIGIN}/:path*`,
      },
    ];
  },
};

export default nextConfig;
