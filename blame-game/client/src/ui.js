// UI 工具

import { CONFIG } from './config.js';
const T = CONFIG.THEME;

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

export function drawButton(ctx, text, x, y, w, h, color) {
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = color || T.PRIMARY; ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = `bold ${h * 0.42}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h / 2);
}

export function hitTest(tx, ty, x, y, w, h) { return tx >= x && tx <= x + w && ty >= y && ty <= y + h; }
export function hitCircle(tx, ty, cx, cy, r) { return (tx - cx) ** 2 + (ty - cy) ** 2 <= (r + 8) ** 2; }

// 画锅
export function drawPot(ctx, cx, cy, size, countdown, maxTime) {
  const ratio = Math.max(0, countdown / maxTime);
  const urgent = countdown < 5;
  // 锅身
  ctx.fillStyle = urgent ? T.EXPLODE : T.POT_COLOR;
  ctx.beginPath(); ctx.ellipse(cx, cy, size, size * 0.55, 0, 0, Math.PI); ctx.fill();
  // 锅把
  ctx.strokeStyle = urgent ? T.EXPLODE : '#616161'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx - size * 0.4, cy - size * 0.3);
  ctx.quadraticCurveTo(cx, cy - size * 0.9, cx + size * 0.4, cy - size * 0.3); ctx.stroke();
  // 抖动效果
  if (urgent && Math.floor(Date.now() / 100) % 2) {
    ctx.fillStyle = 'rgba(255,50,0,0.3)';
    ctx.beginPath(); ctx.arc(cx, cy - size * 0.2, size * 1.2, 0, Math.PI * 2); ctx.fill();
  }
  // 倒计时
  ctx.fillStyle = urgent ? '#fff' : T.TEXT; ctx.font = `bold ${size * 0.5}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(Math.ceil(countdown) + 's', cx, cy - 2);
}

// 画玩家头像圈
export function drawAvatar(ctx, cx, cy, r, nickname, alive, hasPot) {
  // 阴影
  ctx.fillStyle = alive ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.05)';
  ctx.beginPath(); ctx.arc(cx, cy + 2, r, 0, Math.PI * 2); ctx.fill();
  // 圆圈
  ctx.fillStyle = alive ? T.ACCENT : '#ccc';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  if (hasPot) { ctx.strokeStyle = T.DANGER; ctx.lineWidth = 3; ctx.stroke(); }
  // 首字
  ctx.fillStyle = '#fff'; ctx.font = `bold ${r * 0.9}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(alive ? (nickname || '?')[0] : '💀', cx, cy + 1);
  // 昵称
  ctx.fillStyle = alive ? T.TEXT : T.TEXT_LIGHT; ctx.font = `${r * 0.5}px sans-serif`;
  ctx.fillText((nickname || '').slice(0, 4), cx, cy + r + 12);
}
