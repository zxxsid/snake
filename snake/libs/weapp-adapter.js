// 微信小游戏浏览器 API 适配器
// 兼容新版微信（window/document 及其属性均可能为只读）

const _info = wx.getSystemInfoSync();

// 主屏画布
const _canvas = wx.createCanvas();
_canvas.width = _info.windowWidth;
_canvas.height = _info.windowHeight;

// 安全写入属性（直接赋值失败时用 defineProperty 覆盖）
const _set = (obj, key, val) => {
  try { obj[key] = val; } catch (_e) {
    try { Object.defineProperty(obj, key, { value: val, writable: true, configurable: true }); } catch (_e2) { /* 无法覆盖则跳过 */ }
  }
};

// 给 canvas 补充事件接口（映射到 wx 触摸事件）
const _handlers = {};
const _ensure = (t) => { if (!_handlers[t]) _handlers[t] = []; };

_set(_canvas, 'addEventListener', (type, handler) => {
  _ensure(type);
  _handlers[type].push(handler);
});
_set(_canvas, 'removeEventListener', (type, handler) => {
  _ensure(type);
  _handlers[type] = _handlers[type].filter(h => h !== handler);
});

const _patch = (e) => {
  if (!e.preventDefault) e.preventDefault = () => {};
  return e;
};

wx.onTouchStart(e => { _ensure('touchstart'); _handlers.touchstart.forEach(h => h(_patch(e))); });
wx.onTouchMove(e => { _ensure('touchmove'); _handlers.touchmove.forEach(h => h(_patch(e))); });
wx.onTouchEnd(e => {
  _ensure('touchend'); _handlers.touchend.forEach(h => h(_patch(e)));
  _ensure('click'); _handlers.click.forEach(h => h(_patch(e)));
});
wx.onTouchCancel(e => { _ensure('touchcancel'); _handlers.touchcancel.forEach(h => h(_patch(e))); });

// --- window ---
const _w = (typeof window !== 'undefined') ? window : {};

_set(_w, 'innerWidth', _info.windowWidth);
_set(_w, 'innerHeight', _info.windowHeight);
_set(_w, 'devicePixelRatio', _info.pixelRatio || 1);
_set(_w, 'addEventListener', (type, handler) => {
  if (type === 'resize') {
    wx.onWindowResize(res => {
      _set(_w, 'innerWidth', res.windowWidth);
      _set(_w, 'innerHeight', res.windowHeight);
      handler();
    });
  }
});
_set(_w, 'removeEventListener', () => {});

// --- document ---
const _d = (typeof document !== 'undefined') ? document : {};

_set(_d, 'getElementById', () => _canvas);
_set(_d, 'createElement', (tag) => (tag === 'canvas') ? wx.createCanvas() : {});
_set(_d, 'addEventListener', () => {});
_set(_d, 'removeEventListener', () => {});

// --- 全局 ---
_set(GameGlobal, 'window', _w);
_set(GameGlobal, 'document', _d);
_set(GameGlobal, 'canvas', _canvas);
if (typeof GameGlobal.requestAnimationFrame === 'undefined') {
  _set(GameGlobal, 'requestAnimationFrame', requestAnimationFrame);
}
if (typeof GameGlobal.cancelAnimationFrame === 'undefined') {
  _set(GameGlobal, 'cancelAnimationFrame', cancelAnimationFrame);
}
