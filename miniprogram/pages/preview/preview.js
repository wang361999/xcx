const app = getApp();
const store = require('../../utils/store');
const ad = require('../../utils/ad');

Page({
  data: {
    images: [],
    current: 0,
    unlocked: false,
    banner: '',
  },

  onLoad() {
    const cache = app.globalData.previewCache || {};
    const images = cache.images || [];
    this.setData({
      images,
      current: cache.index || 0,
      unlocked: !!cache.unlocked,
      banner: ad.bannerUnit('banner_image_preview'),
    });
  },

  onSwiperChange(e) {
    this.setData({ current: e.detail.current });
  },

  async onSave() {
    if (!this.data.unlocked) {
      wx.showToast({ title: '请先解锁该合集', icon: 'none' });
      return;
    }
    const img = this.data.images[this.data.current];
    if (!img) return;

    wx.showLoading({ title: '保存中' });
    try {
      await app.downloadImage(img.imageUrl);
      wx.hideLoading();
      wx.showToast({ title: '已保存到相册', icon: 'success' });
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

  onShareAppMessage() {
    return { title: '精选图集', path: '/pages/index/index' };
  },
});
