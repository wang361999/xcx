/**
 * 网络请求封装
 */
const { BASE_URL } = require('./config');

function request(path, { method = 'GET', data = {}, timeout = 15000 } = {}) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}${path}`,
      method,
      data,
      timeout,
      header: { 'Content-Type': 'application/json' },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject(new Error((res.data && res.data.error) || `HTTP ${res.statusCode}`));
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || '网络请求失败'));
      },
    });
  });
}

// 合集列表
function getCollections() {
  return request('/api/collections').then((r) => r.data || []);
}

// 合集详情（带 openid 可返回服务端解锁状态）
function getCollection(id, openid) {
  const qs = openid ? `?openid=${encodeURIComponent(openid)}` : '';
  return request(`/api/collections/${id}${qs}`).then((r) => r.data);
}

// 解锁合集
function unlockCollection(openid, collectionId) {
  return request('/api/unlock', {
    method: 'POST',
    data: { openid, collectionId: Number(collectionId) },
  });
}

// 已解锁合集列表
function getUnlockedIds(openid) {
  return request(`/api/unlock?openid=${encodeURIComponent(openid)}`).then(
    (r) => (r.data && r.data.unlockedCollectionIds) || []
  );
}

// 系统配置（广告位 / UI / 下载规则）
function getSettings() {
  return request('/api/settings').then((r) => r.data || {});
}

// 广告埋点（失败不影响主流程）
function sendAdEvent(payload) {
  return request('/api/ad/event', { method: 'POST', data: payload }).catch(() => null);
}

module.exports = {
  request,
  getCollections,
  getCollection,
  unlockCollection,
  getUnlockedIds,
  getSettings,
  sendAdEvent,
};
