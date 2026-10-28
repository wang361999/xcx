/**
 * 本地状态：设备标识、解锁记录、每日免费额度
 * 说明：个人主体小程序不收集用户信息，这里用本地随机生成的设备 ID 作为标识
 */

const KEY_DEVICE = 'gallery_device_id';
const KEY_UNLOCKED = 'gallery_unlocked_ids';
const KEY_ALL_UNTIL = 'gallery_all_unlocked_until';
const KEY_FREE_PREFIX = 'gallery_free_unlock_';

function today() {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

// 设备唯一标识
function ensureDeviceId() {
  let id = wx.getStorageSync(KEY_DEVICE);
  if (!id) {
    id = `anon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    wx.setStorageSync(KEY_DEVICE, id);
  }
  return id;
}

function getUnlockedLocal() {
  return wx.getStorageSync(KEY_UNLOCKED) || [];
}

function addUnlockedLocal(id) {
  const list = getUnlockedLocal();
  if (list.indexOf(Number(id)) === -1) {
    list.push(Number(id));
    wx.setStorageSync(KEY_UNLOCKED, list);
  }
}

function isUnlocked(id) {
  if (isAllUnlocked()) return true;
  return getUnlockedLocal().indexOf(Number(id)) !== -1;
}

// 看广告获得「今日全部解锁」
function setAllUnlockedToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  wx.setStorageSync(KEY_ALL_UNTIL, d.getTime());
}

function isAllUnlocked() {
  const until = wx.getStorageSync(KEY_ALL_UNTIL) || 0;
  return until > Date.now();
}

// 每日免费解锁次数
function getFreeUsed(limit) {
  void limit;
  return wx.getStorageSync(KEY_FREE_PREFIX + today()) || 0;
}

function addFreeUsed() {
  const n = getFreeUsed() + 1;
  wx.setStorageSync(KEY_FREE_PREFIX + today(), n);
  return n;
}

function freeLeft(limit) {
  const l = Number(limit || 0);
  return Math.max(0, l - getFreeUsed());
}

module.exports = {
  ensureDeviceId,
  getUnlockedLocal,
  addUnlockedLocal,
  isUnlocked,
  setAllUnlockedToday,
  isAllUnlocked,
  getFreeUsed,
  addFreeUsed,
  freeLeft,
};
