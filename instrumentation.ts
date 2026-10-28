/**
 * Next.js 应用启动钩子
 * 自动初始化数据库（建表 + 默认数据）
 * 只在应用启动时执行一次，之后不再跑
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { initDatabase } = await import('./lib/init');
      await initDatabase();
    } catch (e) {
      console.warn('[instrumentation] DB init skipped:', e);
    }
  }
}
