// 微信小游戏浏览器 API 适配器
// 将 wx API 映射为 window/document/canvas 等浏览器标准接口
// 使游戏代码在浏览器和微信小游戏中均可运行

const _info = wx.getSystemInfoSync();

// 主屏画布（微信第一个 createCanvas 调用返回主屏画布）
const _canvas = wx.createCanvas();
_canvas.width = _info.windowWidth;
_canvas.height = _info.windowHeight;

// 给 canvas 添加 addEventListener / removeEventListener
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

  // 给微信触摸事件添加 preventDefault（浏览器事件有，微信没有）
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

// 模拟 window 对象
const _window = {
  innerWidth: _info.windowWidth,
  innerHeight: _info.windowHeight,
  devicePixelRatio: _info.pixelRatio || 1,
  addEventListener(type, handler) {
    if (type === 'resize') {
      wx.onWindowResize(res => {
        _window.innerWidth = res.windowWidth;
        _window.innerHeight = res.windowHeight;
        handler();
      });
    }
  },
  removeEventListener() {},
};

// 模拟 document 对象
const _document = {
  getElementById() { return _canvas; },
  createElement(tag) {
    if (tag === 'canvas') return wx.createCanvas();
    return {};
  },
  addEventListener() {},
  removeEventListener() {},
};

// 注册到全局
GameGlobal.window = _window;
GameGlobal.document = _document;
GameGlobal.canvas = _canvas;
GameGlobal.requestAnimationFrame = requestAnimationFrame;
GameGlobal.cancelAnimationFrame = cancelAnimationFrame;
