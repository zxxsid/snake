// 输入处理 - 键盘方向键/WASD + 触摸滑动

import { DIR } from './snake.js';

export class InputHandler {
  constructor(canvas) {
    this.canvas = canvas;
    this.directionQueue = [];
    this.startPressed = false;
    this.touchStart = null;

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);
    this._onClick = this._onClick.bind(this);

    document.addEventListener('keydown', this._onKeyDown);
    canvas.addEventListener('touchstart', this._onTouchStart, { passive: false });
    canvas.addEventListener('touchend', this._onTouchEnd, { passive: false });
    canvas.addEventListener('click', this._onClick);
  }

  // 键盘方向映射
  _onKeyDown(e) {
    const map = {
      ArrowUp: DIR.UP, ArrowDown: DIR.DOWN, ArrowLeft: DIR.LEFT, ArrowRight: DIR.RIGHT,
      w: DIR.UP, W: DIR.UP, s: DIR.DOWN, S: DIR.DOWN,
      a: DIR.LEFT, A: DIR.LEFT, d: DIR.RIGHT, D: DIR.RIGHT,
    };
    const dir = map[e.key];
    if (dir) { e.preventDefault(); this.directionQueue.push(dir); }
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); this.startPressed = true; }
  }

  // 触摸开始
  _onTouchStart(e) {
    e.preventDefault();
    const t = e.touches[0];
    this.touchStart = { x: t.clientX, y: t.clientY, time: Date.now() };
  }

  // 触摸结束 → 判断滑动方向或轻触
  _onTouchEnd(e) {
    e.preventDefault();
    if (!this.touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - this.touchStart.x;
    const dy = t.clientY - this.touchStart.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 15) {
      this.startPressed = true;
    } else {
      if (Math.abs(dx) > Math.abs(dy)) {
        this.directionQueue.push(dx > 0 ? DIR.RIGHT : DIR.LEFT);
      } else {
        this.directionQueue.push(dy > 0 ? DIR.DOWN : DIR.UP);
      }
    }
    this.touchStart = null;
  }

  _onClick(_e) { this.startPressed = true; }

  // 消费一个方向输入
  consumeDirection() { return this.directionQueue.shift() || null; }

  // 消费开始/重启信号
  consumeStart() {
    if (this.startPressed) { this.startPressed = false; return true; }
    return false;
  }

  destroy() {
    document.removeEventListener('keydown', this._onKeyDown);
    this.canvas.removeEventListener('touchstart', this._onTouchStart);
    this.canvas.removeEventListener('touchend', this._onTouchEnd);
    this.canvas.removeEventListener('click', this._onClick);
  }
}
