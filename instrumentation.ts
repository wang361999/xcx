/**
 * Next.js 应用启动钩子
 * 暂时禁用 initDatabase，等 Vercel 环境变量配置好后再启用
 */
export async function register() {
  // 暂时禁用，避免启动时阻塞 Serverless Function
  // if (process.env.NEXT_RUNTIME === 'nodejs') {
  //   try {
  //     const { initDatabase } = await import('./lib/init');
  //     await initDatabase();
  //   } catch (e) {
  //     console.warn('[instrumentation] DB init skipped:', e);
  //   }
  // }
}
