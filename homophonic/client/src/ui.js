// UI 绘制工具集

import { CONFIG } from './config.js';

const T = CONFIG.THEME;

// 圆角矩形
export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// 卡通按钮
export function drawButton(ctx, text, x, y, w, h, color) {
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = color || T.PRIMARY;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${h * 0.42}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h / 2);
}

// 检测点击是否在矩形区域内
export function hitTest(tx, ty, x, y, w, h) {
  return tx >= x && tx <= x + w && ty >= y && ty <= y + h;
}

// 答案输入方格
export function drawInputBoxes(ctx, chars, total, x, y, boxSize, gap) {
  const totalW = total * boxSize + (total - 1) * gap;
  const sx = x - totalW / 2;
  for (let i = 0; i < total; i++) {
    const bx = sx + i * (boxSize + gap);
    roundRect(ctx, bx, y, boxSize, boxSize, 6);
    ctx.fillStyle = T.CARD_BG;
    ctx.fill();
    ctx.strokeStyle = T.BORDER;
    ctx.lineWidth = 2;
    ctx.stroke();
    if (chars[i]) {
      ctx.fillStyle = T.TEXT;
      ctx.font = `bold ${boxSize * 0.6}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(chars[i], bx + boxSize / 2, y + boxSize / 2);
    }
  }
  return { sx, boxSize, gap, total };
}

// 生命值（心形图标）
export function drawHP(ctx, hp, max, x, y, size) {
  for (let i = 0; i < max; i++) {
    ctx.fillStyle = i < hp ? '#F44336' : '#ddd';
    ctx.font = `${size}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('♥', x + i * (size + 4), y);
  }
}

// 分类标签
export function drawCategory(ctx, text, x, y) {
  const pad = 10;
  ctx.font = 'bold 14px sans-serif';
  const tw = ctx.measureText(text).width;
  roundRect(ctx, x - tw / 2 - pad, y - 12, tw + pad * 2, 24, 12);
  ctx.fillStyle = T.SECONDARY;
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

// 图片占位（当图片未加载时显示）
export function drawImagePlaceholder(ctx, x, y, w, h, label) {
  roundRect(ctx, x, y, w, h, 10);
  ctx.fillStyle = '#f5f0e0';
  ctx.fill();
  ctx.strokeStyle = T.BORDER;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = T.TEXT_LIGHT;
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label || '图片加载中...', x + w / 2, y + h / 2);
}

// 倒计时弧形
export function drawTimer(ctx, cx, cy, r, ratio) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
  ctx.strokeStyle = ratio > 0.25 ? T.SECONDARY : T.WRONG;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.stroke();
}
