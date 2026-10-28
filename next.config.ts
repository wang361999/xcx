import type { NextConfig } from "next";

// 图片对外访问：小程序只认自己的域名，所以 /img/* 反代到 Vercel Blob 公共域名
// BLOB_PUBLIC_ORIGIN 例：https://xxxxxxxx.public.blob.vercel-storage.com
const BLOB_PUBLIC_ORIGIN = (process.env.BLOB_PUBLIC_ORIGIN || "").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  // pg 必须在 Node 运行时外部加载，否则 Turbopack 打包会解析不到 Node 内置子模块
  serverExternalPackages: ["pg"],
  async rewrites() {
    if (!BLOB_PUBLIC_ORIGIN) return [];
    return [
      {
        source: "/img/:path*",
        destination: `${BLOB_PUBLIC_ORIGIN}/:path*`,
      },
    ];
  },
};

export default nextConfig;
