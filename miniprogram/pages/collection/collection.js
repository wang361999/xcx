const app = getApp();
const request = require('../../utils/request');
const store = require('../../utils/store');
const ad = require('../../utils/ad');

Page({
  data: {
    id: 0,
    detail: { title: '', description: '', images: [] },
    unlocked: false,
    loading: true,
    saving: false,
    progress: '',
    freeLeft: 0,
    requireUnlock: true,
    downloadUrl: '',
    downloadCode: '',
    banners: { bottom: '' },
  },

  onLoad(options) {
    const id = Number(options.id);
    this.setData({ id });
    if (options.title) wx.setNavigationBarTitle({ title: decodeURIComponent(options.title) });
    this.load();
  },

  onShow() {
    // 从预览页回来时同步解锁状态
    if (this.data.detail.images.length) {
      this.setData({ unlocked: store.isUnlocked(this.data.id) });
    }
  },

  async load() {
    this.setData({ loading: true });
    try {
      const settings = await app.waitSettings();
      const download = settings.download_config || {};
      const openid = store.ensureDeviceId();

      const detail = await request.getCollection(this.data.id, openid);
      const unlocked = !!detail.isUnlocked || store.isUnlocked(this.data.id);
      if (detail.isUnlocked) store.addUnlockedLocal(this.data.id);

      this.setData({
        detail,
        unlocked,
        loading: false,
        requireUnlock: download.require_unlock !== false,
        freeLeft: store.freeLeft(download.free_daily_limit),
        downloadUrl: detail.downloadUrl || '',
        downloadCode: detail.downloadCode || '',
        banners: { bottom: ad.bannerUnit('banner_collection_bottom') },
      });
      if (detail.title) wx.setNavigationBarTitle({ title: detail.title });
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: e.message || '加载失败', icon: 'none' });
    }
  },

  onPreview(e) {
    const { index } = e.currentTarget.dataset;
    app.globalData.previewCache = {
      images: this.data.detail.images,
      index: Number(index),
      unlocked: this.data.unlocked,
    };
    wx.navigateTo({ url: '/pages/preview/preview' });
  },

  // 免费额度 or 看广告解锁
  async onUnlock() {
    if (this.data.unlocked) return;

    if (this.data.freeLeft > 0) {
      const res = await wx.showModal({
        title: '免费解锁',
        content: `今日还剩 ${this.data.freeLeft} 次免费解锁，确认使用？`,
      });
      if (!res.confirm) return;
      await this.doUnlock(true);
      return;
    }

    const ok = await ad.showRewarded();
    if (!ok) {
      wx.showToast({ title: '看完广告才能解锁哦', icon: 'none' });
      return;
    }
    await this.doUnlock(false);
  },

  async doUnlock(useFree) {
    try {
      await request.unlockCollection(store.ensureDeviceId(), this.data.id);
      store.addUnlockedLocal(this.data.id);
      if (useFree) store.addFreeUsed();

      const download = ad.downloadCfg();
      this.setData({
        unlocked: true,
        freeLeft: store.freeLeft(download.free_daily_limit),
      });
      wx.showToast({ title: '解锁成功', icon: 'success' });
      // 解锁后重新拉一次，服务端这时才会下发网盘链接
      this.load();
    } catch (e) {
      wx.showToast({ title: e.message || '解锁失败', icon: 'none' });
    }
  },

  async onCopyLink() {
    if (!this.data.unlocked || !this.data.downloadUrl) {
      wx.showToast({ title: '请先解锁', icon: 'none' });
      return;
    }
    wx.setClipboardData({
      data: this.data.downloadUrl,
      success: () => wx.showToast({ title: '链接已复制', icon: 'success' }),
    });
  },

  onCopyCode() {
    const code = this.data.downloadCode;
    if (!code) return;
    wx.setClipboardData({
      data: code,
      success: () => wx.showToast({ title: '提取码已复制', icon: 'success' }),
    });
  },

  onShareAppMessage() {
    return {
      title: this.data.detail.title || '精选图集',
      path: `/pages/collection/collection?id=${this.data.id}`,
    };
  },
});
