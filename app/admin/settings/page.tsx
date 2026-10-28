'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/admin-api';

const defaultAdConfig = {
  reward_video: { unit_id: '', preload: true, timeout_ms: 5000 },
  banner_home_top: { enabled: true, unit_id: '' },
  banner_home_bottom: { enabled: false, unit_id: '' },
  banner_collection_bottom: { enabled: true, unit_id: '' },
  banner_image_preview: { enabled: false, unit_id: '' },
  interstitial_collection_switch: { enabled: true, interval: 3, unit_id: '' },
  interstitial_success: { enabled: false, probability: 20, unit_id: '' },
};
const defaultHomeConfig = {
  show_header: true, header_text: '精选图集', show_search: false,
  show_promo_button: true, promo_text: '看广告解锁全部合集 24小时',
  collection_columns: 2, show_unlock_badge: true,
};
const defaultDownloadConfig = { free_daily_limit: 3, require_unlock: true };

export default function SettingsPage() {
  const [config, setConfig] = useState({
    ad_config: defaultAdConfig, home_config: defaultHomeConfig, download_config: defaultDownloadConfig,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminFetch('/api/admin/settings');
        const d = res.data || {};
        setConfig({
          ad_config: { ...defaultAdConfig, ...(d.ad_config || {}) },
          home_config: { ...defaultHomeConfig, ...(d.home_config || {}) },
          download_config: { ...defaultDownloadConfig, ...(d.download_config || {}) },
        });
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true); setSaved(false);
    try {
      await adminFetch('/api/admin/settings', { method: 'PUT', body: JSON.stringify(config) });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (e: any) { alert(e.message); }
    setSaving(false);
  };

  const setAd = (key: string, updates: any) =>
    setConfig(c => ({ ...c, ad_config: { ...c.ad_config, [key]: { ...(c.ad_config as any)[key], ...updates } } }));
  const setHome = (key: string, val: any) =>
    setConfig(c => ({ ...c, home_config: { ...c.home_config, [key]: val } }));
  const setDownload = (key: string, val: any) =>
    setConfig(c => ({ ...c, download_config: { ...c.download_config, [key]: val } }));

  const Toggle = ({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) => (
    <button type="button" onClick={() => onChange(!on)}
      className={`w-11 h-6 rounded-full relative transition-colors ${on ? 'bg-rose-500' : 'bg-gray-300'}`}>
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );

  const Row = ({ name, desc, children }: { name: string; desc?: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between py-3 px-5 border-b border-gray-100 last:border-0">
      <div className="flex-1 pr-4">
        <div className="text-sm text-gray-800 font-medium">{name}</div>
        {desc && <div className="text-xs text-gray-500 mt-0.5">{desc}</div>}
      </div>
      {children}
    </div>
  );

  if (loading) return <div className="text-center text-gray-400 py-20">加载中...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">设置中心</h1>
      <p className="text-sm text-gray-500 mb-6">所有配置修改后，小程序端实时拉取，无需重新发布即可生效</p>

      {/* 广告位 ID */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-6">
        <div className="px-5 py-3 border-b border-gray-100 text-sm font-semibold text-gray-900">广告位 ID（微信广告平台获取）</div>
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-4">
            <label className="w-36 text-sm text-gray-600">激励视频广告位</label>
            <input type="text" value={config.ad_config.reward_video.unit_id}
              onChange={e => setAd('reward_video', { unit_id: e.target.value })}
              placeholder="adunit-xxxxxxxxxx"
              className="flex-1 max-w-xs px-3 py-1.5 border border-gray-300 rounded-md text-sm outline-none focus:border-rose-500" />
          </div>
          <div className="flex items-center gap-4">
            <label className="w-36 text-sm text-gray-600">Banner 广告位</label>
            <input type="text" value={(config.ad_config.banner_home_top as any).unit_id}
              onChange={e => {
                ['banner_home_top', 'banner_home_bottom', 'banner_collection_bottom', 'banner_image_preview'].forEach(k =>
                  setAd(k, { unit_id: e.target.value })
                );
              }}
              placeholder="adunit-xxxxxxxxxx"
              className="flex-1 max-w-xs px-3 py-1.5 border border-gray-300 rounded-md text-sm outline-none focus:border-rose-500" />
            <span className="text-xs text-gray-400">所有 Banner 共用</span>
          </div>
          <div className="flex items-center gap-4">
            <label className="w-36 text-sm text-gray-600">插屏广告位</label>
            <input type="text" value={(config.ad_config.interstitial_collection_switch as any).unit_id}
              onChange={e => {
                ['interstitial_collection_switch', 'interstitial_success'].forEach(k =>
                  setAd(k, { unit_id: e.target.value })
                );
              }}
              placeholder="adunit-xxxxxxxxxx"
              className="flex-1 max-w-xs px-3 py-1.5 border border-gray-300 rounded-md text-sm outline-none focus:border-rose-500" />
          </div>
        </div>
      </div>

      {/* 激励视频 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-6">
        <div className="px-5 py-3 border-b border-gray-100 text-sm font-semibold text-gray-900">🎬 激励视频广告</div>
        <Row name="① 下载解锁（核心场景）" desc='用户点"下载合集"按钮时触发，看完完整广告才解锁'>
          <Toggle on={!!config.ad_config.reward_video.unit_id} onChange={() => {}} />
        </Row>
        <Row name="广告预加载" desc="小程序启动时预加载激励视频，减少用户等待">
          <Toggle on={config.ad_config.reward_video.preload}
            onChange={v => setAd('reward_video', { preload: v })} />
        </Row>
      </div>

      {/* Banner */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-6">
        <div className="px-5 py-3 border-b border-gray-100 text-sm font-semibold text-gray-900">📢 Banner 广告位置</div>
        <Row name="D. 首页顶部 Banner" desc="合集列表上方，曝光最高">
          <Toggle on={config.ad_config.banner_home_top.enabled}
            onChange={v => setAd('banner_home_top', { enabled: v })} />
        </Row>
        <Row name="D. 首页底部 Banner">
          <Toggle on={config.ad_config.banner_home_bottom.enabled}
            onChange={v => setAd('banner_home_bottom', { enabled: v })} />
        </Row>
        <Row name="E. 合集详情底部 Banner">
          <Toggle on={config.ad_config.banner_collection_bottom.enabled}
            onChange={v => setAd('banner_collection_bottom', { enabled: v })} />
        </Row>
        <Row name="F. 图片预览底部 Banner">
          <Toggle on={config.ad_config.banner_image_preview.enabled}
            onChange={v => setAd('banner_image_preview', { enabled: v })} />
        </Row>
      </div>

      {/* 插屏 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-6">
        <div className="px-5 py-3 border-b border-gray-100 text-sm font-semibold text-gray-900">🖼️ 插屏广告</div>
        <Row name="G. 合集切换时触发" desc="用户从合集返回首页进入另一个合集时">
          <div className="flex items-center gap-3">
            <Toggle on={config.ad_config.interstitial_collection_switch.enabled}
              onChange={v => setAd('interstitial_collection_switch', { enabled: v })} />
            <input type="number" value={config.ad_config.interstitial_collection_switch.interval}
              onChange={e => setAd('interstitial_collection_switch', { interval: parseInt(e.target.value) || 3 })}
              className="w-16 px-2 py-1 text-sm border border-gray-300 rounded text-center outline-none focus:border-rose-500" />
            <span className="text-xs text-gray-500">次触发 1 次</span>
          </div>
        </Row>
        <Row name="H. 成功场景触发" desc="下载完成 / 解锁成功后小概率弹出">
          <div className="flex items-center gap-3">
            <Toggle on={config.ad_config.interstitial_success.enabled}
              onChange={v => setAd('interstitial_success', { enabled: v })} />
            <input type="number" value={config.ad_config.interstitial_success.probability}
              onChange={e => setAd('interstitial_success', { probability: parseInt(e.target.value) || 20 })}
              className="w-16 px-2 py-1 text-sm border border-gray-300 rounded text-center outline-none focus:border-rose-500" />
            <span className="text-xs text-gray-500">% 概率</span>
          </div>
        </Row>
      </div>

      {/* 首页布局 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-6">
        <div className="px-5 py-3 border-b border-gray-100 text-sm font-semibold text-gray-900">🎨 首页布局（后端驱动小程序 UI）</div>
        <Row name="首页标题文字">
          <input type="text" value={config.home_config.header_text}
            onChange={e => setHome('header_text', e.target.value)}
            className="w-64 px-3 py-1.5 border border-gray-300 rounded-md text-sm outline-none focus:border-rose-500" />
        </Row>
        <Row name='显示"看广告得福利"按钮'>
          <Toggle on={config.home_config.show_promo_button}
            onChange={v => setHome('show_promo_button', v)} />
        </Row>
        <Row name="福利按钮文字">
          <input type="text" value={config.home_config.promo_text}
            onChange={e => setHome('promo_text', e.target.value)}
            className="w-64 px-3 py-1.5 border border-gray-300 rounded-md text-sm outline-none focus:border-rose-500" />
        </Row>
        <Row name="合集网格列数">
          <div className="flex gap-2">
            {[2, 3].map(n => (
              <button key={n} onClick={() => setHome('collection_columns', n)}
                className={`px-4 py-1.5 text-sm rounded-md ${config.home_config.collection_columns === n ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {n} 列
              </button>
            ))}
          </div>
        </Row>
        <Row name="未解锁合集显示锁图标">
          <Toggle on={config.home_config.show_unlock_badge}
            onChange={v => setHome('show_unlock_badge', v)} />
        </Row>
      </div>

      {/* 下载规则 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-6">
        <div className="px-5 py-3 border-b border-gray-100 text-sm font-semibold text-gray-900">⬇️ 下载规则</div>
        <Row name="每日免费下载次数" desc="不看广告每天可以下载多少张">
          <div className="flex items-center gap-2">
            <input type="number" value={config.download_config.free_daily_limit}
              onChange={e => setDownload('free_daily_limit', parseInt(e.target.value) || 3)}
              className="w-16 px-2 py-1 text-sm border border-gray-300 rounded text-center outline-none focus:border-rose-500" />
            <span className="text-sm text-gray-600">次/天</span>
          </div>
        </Row>
        <Row name="所有合集下载都需要看广告">
          <Toggle on={config.download_config.require_unlock}
            onChange={v => setDownload('require_unlock', v)} />
        </Row>
      </div>

      {/* 保存 */}
      <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-gray-200 rounded-xl p-4 flex justify-end gap-3 shadow-lg">
        {saved && <span className="text-sm text-emerald-500 self-center">✓ 保存成功</span>}
        <button onClick={save} disabled={saving}
          className="px-6 py-2 rounded-lg bg-gradient-to-r from-rose-500 to-orange-400 text-white text-sm font-medium hover:shadow-lg hover:shadow-rose-200 disabled:opacity-60">
          {saving ? '保存中...' : '保存所有设置'}
        </button>
      </div>
    </div>
  );
}
