// 输入管理器 - 触摸点击 + 摇杆
import { CONFIG } from './config.js';

export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.tapCbs = [];
    // 摇杆状态
    this.joystick = { active: false, baseX: 0, baseY: 0, knobX: 0, knobY: 0, angle: 0, mag: 0 };
    this._touchId = null;
    this._touchStart = null;

    const onEnd = (e) => {
      if (e && e.preventDefault) e.preventDefault();
      const t = (e.changedTouches && e.changedTouches[0]) || e;
      const rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { left: 0, top: 0, width: canvas.width, height: canvas.height };
      const sx = ((t.clientX || 0) - rect.left) * (canvas.width / (rect.width || canvas.width));
      const sy = ((t.clientY || 0) - rect.top) * (canvas.height / (rect.height || canvas.height));
      // 摇杆松开
      if (this.joystick.active && this._touchId === (t.identifier ?? 0)) {
        this.joystick.active = false;
        this._touchId = null;
        return;
      }
      this.tapCbs.forEach(cb => cb(sx, sy));
    };

    const onStart = (e) => {
      if (e && e.preventDefault) e.preventDefault();
      const t = (e.touches && e.touches[0]) || e;
      const rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { left: 0, top: 0, width: canvas.width, height: canvas.height };
      const sx = ((t.clientX || 0) - rect.left) * (canvas.width / (rect.width || canvas.width));
      const sy = ((t.clientY || 0) - rect.top) * (canvas.height / (rect.height || canvas.height));
      // 左半屏 = 摇杆
      if (sx < canvas.width * 0.4) {
        this._touchId = t.identifier ?? 0;
        this._touchStart = { x: sx, y: sy };
        this.joystick.active = true;
        this.joystick.baseX = sx;
        this.joystick.baseY = sy;
        this.joystick.knobX = sx;
        this.joystick.knobY = sy;
        this.joystick.mag = 0;
      }
    };

    const onMove = (e) => {
      if (e && e.preventDefault) e.preventDefault();
      if (!this.joystick.active) return;
      const list = e.touches || [e];
      let t = null;
      for (let i = 0; i < list.length; i++) {
        if ((list[i].identifier ?? 0) === this._touchId) { t = list[i]; break; }
      }
      if (!t) return;
      const rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { left: 0, top: 0, width: canvas.width, height: canvas.height };
      const sx = ((t.clientX || 0) - rect.left) * (canvas.width / (rect.width || canvas.width));
      const sy = ((t.clientY || 0) - rect.top) * (canvas.height / (rect.height || canvas.height));
      const dx = sx - this.joystick.baseX, dy = sy - this.joystick.baseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const R = 50;
      const clamped = Math.min(dist, R);
      const ratio = dist > 0 ? clamped / dist : 0;
      this.joystick.knobX = this.joystick.baseX + dx * ratio;
      this.joystick.knobY = this.joystick.baseY + dy * ratio;
      this.joystick.angle = Math.atan2(dy, dx);
      this.joystick.mag = Math.min(dist / R, 1);
    };

    canvas.addEventListener('touchstart', onStart, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onEnd, { passive: false });
    canvas.addEventListener('touchcancel', onEnd, { passive: false });
    canvas.addEventListener('click', onEnd);

    // 键盘（开发用）
    this.keys = {};
    document.addEventListener('keydown', e => { this.keys[e.key] = true; });
    document.addEventListener('keyup', e => { this.keys[e.key] = false; });
  }

  onTap(cb) { this.tapCbs.push(cb); }
  clearTaps() { this.tapCbs = []; }

  // 获取移动方向（摇杆优先，键盘次之）
  getMoveDir() {
    if (this.joystick.active && this.joystick.mag > 0.15) {
      return { x: Math.cos(this.joystick.angle) * this.joystick.mag, y: Math.sin(this.joystick.angle) * this.joystick.mag };
    }
    let dx = 0, dy = 0;
    if (this.keys['ArrowLeft'] || this.keys['a']) dx -= 1;
    if (this.keys['ArrowRight'] || this.keys['d']) dx += 1;
    if (this.keys['ArrowUp'] || this.keys['w']) dy -= 1;
    if (this.keys['ArrowDown'] || this.keys['s']) dy += 1;
    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      return { x: dx / len, y: dy / len };
    }
    return null;
  }
}
