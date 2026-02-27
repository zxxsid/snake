// 通用 UI 绘制工具

import { CONFIG } from '../config.js';
const T = CONFIG.THEME;

// 圆角矩形路径
export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

// 按钮
export function drawButton(ctx, text, x, y, w, h, color) {
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = color || T.PRIMARY; ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = `bold ${h * 0.4}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h / 2);
}

// 碰撞检测
export function hitTest(tx, ty, x, y, w, h) {
  return tx >= x && tx <= x + w && ty >= y && ty <= y + h;
}

// HP/MP 条
export function drawBar(ctx, x, y, w, h, ratio, color, bgColor) {
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = bgColor || '#333'; ctx.fill();
  if (ratio > 0) {
    roundRect(ctx, x, y, w * Math.max(0, Math.min(1, ratio)), h, h / 2);
    ctx.fillStyle = color; ctx.fill();
  }
}

// 摇杆
export function drawJoystick(ctx, joystick) {
  if (!joystick.active) return;
  const { baseX, baseY, knobX, knobY } = joystick;
  // 底座
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath(); ctx.arc(baseX, baseY, 50, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2; ctx.stroke();
  // 摇杆
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath(); ctx.arc(knobX, knobY, 20, 0, Math.PI * 2); ctx.fill();
}

// 飘字效果
export class FloatText {
  constructor(x, y, text, color, duration) {
    this.x = x; this.y = y; this.text = text; this.color = color;
    this.duration = duration || 1000; this.elapsed = 0;
  }
  update(dt) { this.elapsed += dt; this.y -= dt * 0.03; }
  get alive() { return this.elapsed < this.duration; }
  render(ctx, camX, camY) {
    const alpha = 1 - this.elapsed / this.duration;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color; ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(this.text, this.x - camX, this.y - camY);
    ctx.globalAlpha = 1;
  }
}
