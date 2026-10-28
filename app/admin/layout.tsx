'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getAdminToken, clearAdminToken } from '@/lib/admin-api';

const menu = [
  { group: '内容管理', items: [
    { icon: '📚', label: '合集管理', href: '/admin/collections' },
  ]},
  { group: '配置', items: [
    { icon: '📢', label: '广告设置', href: '/admin/settings' },
  ]},
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const token = getAdminToken();
    if (!token && !pathname.includes('/admin/login')) {
      router.push('/admin/login');
    }
    if (token && pathname === '/admin/login') {
      router.push('/admin/collections');
    }
  }, [pathname, router]);

  const handleLogout = () => {
    clearAdminToken();
    router.push('/admin/login');
  };

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-50 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-orange-400 flex items-center justify-center text-white text-sm font-bold">图</div>
          <span className="text-base font-semibold text-gray-900">图库管理后台</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>👤 Admin</span>
          <button onClick={handleLogout} className="text-gray-400 hover:text-rose-500 transition-colors">退出</button>
        </div>
      </div>
      <div className="flex">
        <div className="w-52 bg-white border-r border-gray-200 p-3 min-h-[calc(100vh-56px)]">
          {menu.map(group => (
            <div key={group.group} className="mb-4">
              <div className="text-[11px] text-gray-400 uppercase tracking-wider px-3 pt-2 pb-2 font-medium">{group.group}</div>
              {group.items.map(item => {
                const active = pathname?.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm mb-1 transition-colors ${
                      active ? 'bg-gradient-to-r from-rose-50 to-orange-50 text-rose-500 font-medium' : 'text-gray-600 hover:bg-gray-50'
                    }`}>
                    <span className="text-lg leading-none">{item.icon}</span>{item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex-1 p-6">{children}</div>
      </div>
    </div>
  );
}
