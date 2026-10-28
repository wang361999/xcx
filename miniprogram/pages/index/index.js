const app = getApp();
const request = require('../../utils/request');
const store = require('../../utils/store');
const ad = require('../../utils/ad');

Page({
  data: {
    list: [],
    loading: true,
    home: {},
    banners: { homeTop: '' },
    allUnlocked: false,
    columns: 2,
  },

  onLoad() {
    this.bootstrap();
  },

  onShow() {
    this.setData({ allUnlocked: store.isAllUnlocked() });
  },

  onPullDownRefresh() {
    this.bootstrap().then(() => wx.stopPullDownRefresh());
  },

  async bootstrap() {
    this.setData({ loading: true });
    try {
      const settings = await app.waitSettings();
      const home = settings.home_config || {};
      const download = settings.download_config || {};

      const [collections, serverUnlocked] = await Promise.all([
        request.getCollections(),
        request.getUnlockedIds(store.ensureDeviceId()).catch(() => []),
      ]);

      const unlockedSet = {};
      serverUnlocked.forEach((id) => {
        unlockedSet[id] = true;
        store.addUnlockedLocal(id);
      });
      store.getUnlockedLocal().forEach((id) => {
        unlockedSet[id] = true;
      });

      const allUnlocked = store.isAllUnlocked();
      const list = collections.map((c) => ({
        ...c,
        unlocked: allUnlocked || !!unlockedSet[c.id],
      }));

      this.setData({
        list,
        loading: false,
        home,
        columns: Number(home.collection_columns || 2),
        allUnlocked,
        banners: { homeTop: ad.bannerUnit('banner_home_top') },
      });

      this.downloadConfig = download;
      if (home.header_text) wx.setNavigationBarTitle({ title: home.header_text });
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: e.message || '加载失败', icon: 'none' });
    }
  },

  onOpen(e) {
    const { index } = e.currentTarget.dataset;
    const item = this.data.list[index];
    if (!item) return;

    ad.maybeShowSwitchInterstitial();

    wx.navigateTo({
      url: `/pages/collection/collection?id=${item.id}&title=${encodeURIComponent(item.title)}`,
    });
  },

  async onPromo() {
    if (this.data.allUnlocked) {
      wx.showToast({ title: '今日已全部解锁', icon: 'none' });
      return;
    }

    const ok = await ad.showRewarded();
    if (!ok) {
      wx.showToast({ title: '看完广告才能解锁哦', icon: 'none' });
      return;
    }

    store.setAllUnlockedToday();
    const list = this.data.list.map((c) => ({ ...c, unlocked: true }));
    this.setData({ allUnlocked: true, list });
    wx.showToast({ title: '已解锁今日全部合集', icon: 'success' });
  },

  onShareAppMessage() {
    return { title: (this.data.home && this.data.home.header_text) || '精选图集', path: '/pages/index/index' };
  },
});
