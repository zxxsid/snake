// 主菜单场景

import { CONFIG } from '../config.js';
import { roundRect, drawButton, hitTest } from '../ui.js';

const T = CONFIG.THEME;

export class MenuScene {
  constructor(app, W, H) {
    this.app = app;
    this.W = W;
    this.H = H;
    this.btnChallenge = { x: W / 2 - 120, y: H * 0.48, w: 240, h: 52 };
    this.btnBattle = { x: W / 2 - 120, y: H * 0.48 + 70, w: 240, h: 52 };

    app.input.onTap((x, y) => this.onTap(x, y));
  }

  onTap(x, y) {
    const bc = this.btnChallenge, bb = this.btnBattle;
    if (hitTest(x, y, bc.x, bc.y, bc.w, bc.h)) {
      this.app.switchScene('challenge', { seq: this.app.user.level || 1 });
    }
    if (hitTest(x, y, bb.x, bb.y, bb.w, bb.h)) {
      this.app.switchScene('battle');
    }
  }

  update(_dt) {}

  render(ctx, W, H) {
    const cx = W / 2;

    // 标题
    ctx.fillStyle = T.PRIMARY;
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎭 谐音梗大作战', cx, H * 0.2);

    // 副标题
    ctx.fillStyle = T.TEXT_LIGHT;
    ctx.font = '16px sans-serif';
    ctx.fillText('猜谐音梗，笑到停不下来', cx, H * 0.28);

    // 用户信息
    if (this.app.user) {
      ctx.fillStyle = T.TEXT;
      ctx.font = '14px sans-serif';
      ctx.fillText(`${this.app.user.nickname}  |  闯关进度: 第${this.app.user.level}关`, cx, H * 0.36);
    }

    // 卡片背景
    const cardW = 280, cardH = 180;
    roundRect(ctx, cx - cardW / 2, H * 0.42, cardW, cardH, 16);
    ctx.fillStyle = T.CARD_BG;
    ctx.fill();
    ctx.strokeStyle = T.BORDER;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 按钮
    drawButton(ctx, '📖 闯关模式', this.btnChallenge.x, this.btnChallenge.y, this.btnChallenge.w, this.btnChallenge.h, T.PRIMARY);
    drawButton(ctx, '⚔️ 竞技模式', this.btnBattle.x, this.btnBattle.y, this.btnBattle.w, this.btnBattle.h, T.ACCENT || '#4A90D9');

    // 底部
    ctx.fillStyle = T.TEXT_LIGHT;
    ctx.font = '12px sans-serif';
    ctx.fillText('点击按钮开始游戏', cx, H * 0.85);
  }
}
