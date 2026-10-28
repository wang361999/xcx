/**
 * 广告管理（单例复用，避免重复创建实例）
 * 所有广告位开关、ID、频次均来自后端 /api/settings，后台改完小程序即生效
 */
const request = require('./request');
const store = require('./store');

let settings = {};
let rewardAd = null;
let pendingResolve = null;
let collectionOpenCount = 0;
let lastRewardAt = 0;
let interstitial = null;

function configure(s) {
  settings = s || {};
  // 重置插屏实例，保证换了广告位 ID 后立即生效
  interstitial = null;
}

function adCfg() {
  return settings.ad_config || {};
}

function unitOf(key) {
  const cfg = adCfg()[key];
  return cfg && cfg.unit_id ? cfg.unit_id : '';
}

function bannerUnit(key) {
  const cfg = adCfg()[key];
  if (!cfg || !cfg.enabled || !cfg.unit_id) return '';
  return cfg.unit_id;
}

function bannerOn(key) {
  return !!bannerUnit(key);
}

function downloadCfg() {
  return settings.download_config || {};
}

function homeCfg() {
  return settings.home_config || {};
}

function report(adType, unitId, action, durationMs) {
  request.sendAdEvent({
    openid: store.ensureDeviceId(),
    adType,
    adUnitId: unitId || '',
    action,
    durationMs: durationMs || 0,
  });
}

/* ---------------- 激励视频 ---------------- */

function getRewardAd() {
  const unitId = unitOf('reward_video');
  if (!unitId) return null;

  if (rewardAd) return rewardAd;

  rewardAd = wx.createRewardedVideoAd({ adUnitId: unitId });

  rewardAd.onLoad(() => {
    report('reward', unitId, 'load');
  });

  rewardAd.onError((err) => {
    console.error('[ad] rewarded error', err);
    report('reward', unitId, 'error');
    if (pendingResolve) {
      const r = pendingResolve;
      pendingResolve = null;
      r(false);
    }
  });

  rewardAd.onClose((res) => {
    const ended = res && res.isEnded;
    report('reward', unitId, ended ? 'complete' : 'close');
    if (pendingResolve) {
      const r = pendingResolve;
      pendingResolve = null;
      r(!!ended);
    }
  });

  // 预加载
  rewardAd.load().catch(() => {});
  return rewardAd;
}

/**
 * 展示激励视频，看完返回 true
 * 若后台未配置广告位 ID，则直接放行（开发模式），并提示
 */
function showRewarded() {
  return new Promise((resolve) => {
    const ad = getRewardAd();
    if (!ad) {
      wx.showToast({ title: '广告位未配置，已直接解锁', icon: 'none' });
      resolve(true);
      return;
    }

    const startAt = Date.now();
    pendingResolve = (ok) => {
      report('reward', unitOf('reward_video'), 'show', Date.now() - startAt);
      resolve(ok);
    };

    ad.show().catch(() => {
      ad.load()
        .then(() => ad.show())
        .catch(() => {
          const r = pendingResolve;
          pendingResolve = null;
          if (r) r(false);
          wx.showToast({ title: '广告加载失败，请稍后再试', icon: 'none' });
        });
    });
  });
}

/* ---------------- 插屏广告 ---------------- */

function getInterstitial(unitId) {
  if (interstitial) return interstitial;
  if (!wx.createInterstitialAd) return null;
  interstitial = wx.createInterstitialAd({ adUnitId: unitId });
  interstitial.onError((e) => console.error('[ad] interstitial error', e));
  return interstitial;
}

// 进入合集时按频次弹插屏
function maybeShowSwitchInterstitial() {
  const cfg = adCfg().interstitial_collection_switch;
  if (!cfg || !cfg.enabled || !cfg.unit_id) return;

  const interval = Number(cfg.interval || 3);
  collectionOpenCount += 1;
  if (collectionOpenCount % interval !== 0) return;

  const ad = getInterstitial(cfg.unit_id);
  if (!ad) return;
  ad.show().catch(() => {});
  report('interstitial', cfg.unit_id, 'show');
}

// 下载成功后的概率插屏
function maybeShowSuccessInterstitial() {
  const cfg = adCfg().interstitial_success;
  if (!cfg || !cfg.enabled || !cfg.unit_id) return;
  const p = Number(cfg.probability || 0);
  if (Math.random() * 100 >= p) return;

  const ad = getInterstitial(cfg.unit_id);
  if (!ad) return;
  ad.show().catch(() => {});
  report('interstitial', cfg.unit_id, 'show');
}

module.exports = {
  configure,
  bannerUnit,
  bannerOn,
  downloadCfg,
  homeCfg,
  showRewarded,
  maybeShowSwitchInterstitial,
  maybeShowSuccessInterstitial,
  report,
  get lastRewardAt() {
    return lastRewardAt;
  },
};
