// 输入处理 - 键盘多键组合(8方向) + 触屏浮动摇杆(360°)

import { CONFIG } from './config.js';

export class InputHandler {
  constructor(canvas) {
    this.canvas = canvas;
    this.startPressed = false;

    // 键盘状态
    this.keys = {};
    this.keyAngle = null;

    // 摇杆状态
    this.joystick = {
      active: false,
      baseX: 0, baseY: 0,
      knobX: 0, knobY: 0,
      angle: 0,
      magnitude: 0,
    };
    this._touchId = null;
    this._touchStart = null;
    this._touchTime = 0;
    this._isPlaying = false;

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchMove = this._onTouchMove.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);
    this._onClick = this._onClick.bind(this);

    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
    canvas.addEventListener('touchstart', this._onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this._onTouchMove, { passive: false });
    canvas.addEventListener('touchend', this._onTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', this._onTouchEnd, { passive: false });
    canvas.addEventListener('click', this._onClick);
  }

  // 设置是否在游戏中（影响摇杆/点击行为）
  set playing(v) { this._isPlaying = v; }

  // --- 键盘 ---
  _onKeyDown(e) {
    this.keys[e.key] = true;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); this.startPressed = true; }
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(e.key)) e.preventDefault();
  }
  _onKeyUp(e) { this.keys[e.key] = false; }

  // 根据按下的方向键计算角度
  getKeyboardAngle() {
    let dx = 0, dy = 0;
    if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) dx -= 1;
    if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) dx += 1;
    if (this.keys['ArrowUp'] || this.keys['w'] || this.keys['W']) dy -= 1;
    if (this.keys['ArrowDown'] || this.keys['s'] || this.keys['S']) dy += 1;
    if (dx !== 0 || dy !== 0) return Math.atan2(dy, dx);
    return null;
  }

  // --- 触屏摇杆 ---
  _onTouchStart(e) {
    e.preventDefault();
    if (!this._isPlaying) { this.startPressed = true; return; }
    const t = e.changedTouches[0];
    this._touchId = t.identifier;
    this._touchStart = { x: t.clientX, y: t.clientY };
    this._touchTime = Date.now();
    this.joystick.active = false;
  }

  _onTouchMove(e) {
    e.preventDefault();
    const t = this._findTouch(e.touches);
    if (!t || !this._touchStart) return;

    const dx = t.clientX - this._touchStart.x;
    const dy = t.clientY - this._touchStart.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const dz = CONFIG.JOYSTICK.DEAD_ZONE;

    // 超过死区才激活摇杆
    if (!this.joystick.active && dist > dz) {
      this.joystick.active = true;
      this.joystick.baseX = this._touchStart.x;
      this.joystick.baseY = this._touchStart.y;
    }

    if (this.joystick.active) {
      const R = CONFIG.JOYSTICK.BASE_RADIUS;
      const clamped = Math.min(dist, R);
      const ratio = dist > 0 ? clamped / dist : 0;
      this.joystick.knobX = this.joystick.baseX + dx * ratio;
      this.joystick.knobY = this.joystick.baseY + dy * ratio;
      this.joystick.angle = Math.atan2(dy, dx);
      this.joystick.magnitude = Math.min(dist / R, 1);
    }
  }

  _onTouchEnd(e) {
    e.preventDefault();
    const t = this._findTouch(e.changedTouches);
    if (!t) return;
    if (!this.joystick.active && Date.now() - this._touchTime < 300) {
      this.startPressed = true;
    }
    this.joystick.active = false;
    this._touchId = null;
    this._touchStart = null;
  }

  _findTouch(list) {
    if (this._touchId == null) return null;
    for (let i = 0; i < list.length; i++) {
      if (list[i].identifier === this._touchId) return list[i];
    }
    return null;
  }

  _onClick(_e) {
    if (!this._isPlaying) this.startPressed = true;
  }

  // 获取当前输入角度（摇杆优先，键盘次之）
  getAngle() {
    if (this.joystick.active && this.joystick.magnitude > 0.15) {
      return this.joystick.angle;
    }
    return this.getKeyboardAngle();
  }

  // 消费开始/重启信号
  consumeStart() {
    if (this.startPressed) { this.startPressed = false; return true; }
    return false;
  }

  destroy() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
    this.canvas.removeEventListener('touchstart', this._onTouchStart);
    this.canvas.removeEventListener('touchmove', this._onTouchMove);
    this.canvas.removeEventListener('touchend', this._onTouchEnd);
    this.canvas.removeEventListener('touchcancel', this._onTouchEnd);
    this.canvas.removeEventListener('click', this._onClick);
  }
}
