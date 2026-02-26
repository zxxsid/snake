// 微信小游戏浏览器 API 适配器
// 在已有全局对象上补充浏览器标准接口，兼容新版微信（window 为只读属性）

const _info = wx.getSystemInfoSync();

// 主屏画布
const _canvas = wx.createCanvas();
_canvas.width = _info.windowWidth;
_canvas.height = _info.windowHeight;

// 给 canvas 补充 addEventListener / removeEventListener
const _bindTouchEvents = (cvs) => {
  const _handlers = {};
  const _ensure = (t) => { if (!_handlers[t]) _handlers[t] = []; };

  cvs.addEventListener = (type, handler) => {
    _ensure(type);
    _handlers[type].push(handler);
  };
  cvs.removeEventListener = (type, handler) => {
    _ensure(type);
    _handlers[type] = _handlers[type].filter(h => h !== handler);
  };

  const _patch = (e) => {
    if (!e.preventDefault) e.preventDefault = () => {};
    return e;
  };

  wx.onTouchStart(e => {
    _ensure('touchstart');
    _handlers.touchstart.forEach(h => h(_patch(e)));
  });
  wx.onTouchMove(e => {
    _ensure('touchmove');
    _handlers.touchmove.forEach(h => h(_patch(e)));
  });
  wx.onTouchEnd(e => {
    _ensure('touchend');
    _handlers.touchend.forEach(h => h(_patch(e)));
    _ensure('click');
    _handlers.click.forEach(h => h(_patch(e)));
  });
  wx.onTouchCancel(e => {
    _ensure('touchcancel');
    _handlers.touchcancel.forEach(h => h(_patch(e)));
  });
};

_bindTouchEvents(_canvas);

// --- 安全地设置全局属性（兼容 window 为只读的新版微信） ---

const _safeSet = (obj, key, value) => {
  try {
    obj[key] = value;
  } catch (_e) {
    Object.defineProperty(obj, key, { value, writable: true, configurable: true });
  }
};

// 获取或创建 window 对象
const _window = (typeof window !== 'undefined') ? window : {};

// 补充 window 缺失的属性
if (_window.innerWidth === undefined) _window.innerWidth = _info.windowWidth;
if (_window.innerHeight === undefined) _window.innerHeight = _info.windowHeight;
if (_window.devicePixelRatio === undefined) _window.devicePixelRatio = _info.pixelRatio || 1;
if (typeof _window.addEventListener !== 'function') {
  _window.addEventListener = (type, handler) => {
    if (type === 'resize') {
      wx.onWindowResize(res => {
        _window.innerWidth = res.windowWidth;
        _window.innerHeight = res.windowHeight;
        handler();
      });
    }
  };
}
if (typeof _window.removeEventListener !== 'function') {
  _window.removeEventListener = () => {};
}

// 获取或创建 document 对象
const _document = (typeof document !== 'undefined') ? document : {};

if (typeof _document.getElementById !== 'function') {
  _document.getElementById = () => _canvas;
}
if (typeof _document.createElement !== 'function') {
  _document.createElement = (tag) => {
    if (tag === 'canvas') return wx.createCanvas();
    return {};
  };
}
if (typeof _document.addEventListener !== 'function') {
  _document.addEventListener = () => {};
}
if (typeof _document.removeEventListener !== 'function') {
  _document.removeEventListener = () => {};
}

// 注册到 GameGlobal（用 safeSet 防止只读属性报错）
_safeSet(GameGlobal, 'window', _window);
_safeSet(GameGlobal, 'document', _document);
_safeSet(GameGlobal, 'canvas', _canvas);

// requestAnimationFrame / cancelAnimationFrame 通常已存在
if (typeof GameGlobal.requestAnimationFrame === 'undefined') {
  _safeSet(GameGlobal, 'requestAnimationFrame', requestAnimationFrame);
}
if (typeof GameGlobal.cancelAnimationFrame === 'undefined') {
  _safeSet(GameGlobal, 'cancelAnimationFrame', cancelAnimationFrame);
}
