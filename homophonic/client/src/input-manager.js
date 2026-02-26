// 输入管理器 - 触摸/点击事件 + 虚拟键盘

export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.tapCallbacks = [];
    this._kbVisible = false;
    this._kbCallback = null;
    this._kbChars = [];

    // 触摸/点击 → 统一为 tap 事件
    const handle = (e) => {
      if (e.preventDefault) e.preventDefault();
      const t = (e.changedTouches && e.changedTouches[0]) || e;
      const rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { left: 0, top: 0 };
      const x = (t.clientX || t.pageX || 0) - rect.left;
      const y = (t.clientY || t.pageY || 0) - rect.top;
      const sx = x * (canvas.width / (rect.width || canvas.width));
      const sy = y * (canvas.height / (rect.height || canvas.height));
      this.tapCallbacks.forEach(cb => cb(sx, sy));
    };

    canvas.addEventListener('touchend', handle, { passive: false });
    canvas.addEventListener('click', handle);
  }

  // 注册点击回调
  onTap(cb) { this.tapCallbacks.push(cb); }

  // 清空回调
  clearTaps() { this.tapCallbacks = []; }
}
