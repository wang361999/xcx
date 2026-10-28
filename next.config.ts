import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pg 必须在 Node 运行时外部加载，否则 Turbopack 打包会解析不到 Node 内置子模块
  serverExternalPackages: ["pg"],
};

export default nextConfig;
