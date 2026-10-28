const request = require('./utils/request');
const store = require('./utils/store');
const ad = require('./utils/ad');

App({
  globalData: {
    settings: null,
    settingsReady: null,
  },

  onLaunch() {
    store.ensureDeviceId();
    this.globalData.settingsReady = this.loadSettings();
  },

  loadSettings() {
    return request
      .getSettings()
      .then((s) => {
        this.globalData.settings = s || {};
        ad.configure(s || {});
        return s || {};
      })
      .catch(() => {
        this.globalData.settings = {};
        ad.configure({});
        return {};
      });
  },

  // 页面统一用这个拿配置，保证配置已加载
  waitSettings() {
    if (this.globalData.settings) return Promise.resolve(this.globalData.settings);
    if (this.globalData.settingsReady) return this.globalData.settingsReady;
    this.globalData.settingsReady = this.loadSettings();
    return this.globalData.settingsReady;
  },

  // 下载到相册（统一处理权限）
  downloadImage(url) {
    return new Promise((resolve, reject) => {
      wx.downloadFile({
        url,
        success(res) {
          if (res.statusCode !== 200) return reject(new Error('下载失败'));
          wx.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => resolve(true),
            fail(err) {
              const msg = (err && err.errMsg) || '';
              if (msg.indexOf('auth deny') !== -1 || msg.indexOf('authorize') !== -1) {
                wx.showModal({
                  title: '需要相册权限',
                  content: '请在设置中允许保存图片到相册',
                  confirmText: '去设置',
                  success(r) {
                    if (r.confirm) wx.openSetting();
                  },
                });
              }
              reject(err);
            },
          });
        },
        fail: reject,
      });
    });
  },
});
