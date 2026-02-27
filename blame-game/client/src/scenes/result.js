// 结算页

import { CONFIG } from '../config.js';
import { roundRect, drawButton, hitTest } from '../ui.js';

const T = CONFIG.THEME;

export class ResultScene {
  constructor(app, W, H, params) {
    this.app = app;
    this.W = W; this.H = H;
    this.data = params?.data || {};
    this.ws = params?.ws;

    const cx = W / 2;
    this.btnAgain = { x: cx - 100, y: H * 0.82, w: 95, h: 44 };
    this.btnHome = { x: cx + 5, y: H * 0.82, w: 95, h: 44 };

    app.input.onTap((x, y) => this.onTap(x, y));
  }

  onTap(x, y) {
    if (hitTest(x, y, this.btnHome.x, this.btnHome.y, this.btnHome.w, this.btnHome.h)) {
      if (this.ws) this.ws.close();
      this.app.switchScene('home');
    }
    if (hitTest(x, y, this.btnAgain.x, this.btnAgain.y, this.btnAgain.w, this.btnAgain.h)) {
      if (this.ws) this.ws.close();
      this.app.switchScene('home');
    }
  }

  update(_dt) {}

  render(ctx, W, H) {
    const cx = W / 2;
    const rankings = this.data.rankings || [];

    // 标题
    ctx.fillStyle = T.PRIMARY; ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🏆 游戏结束', cx, H * 0.1);

    // 冠军
    const winner = rankings.find(r => r.alive);
    if (winner) {
      ctx.font = '50px sans-serif';
      ctx.fillText('👑', cx, H * 0.2);
      ctx.fillStyle = T.PRIMARY; ctx.font = 'bold 22px sans-serif';
      ctx.fillText(winner.nickname + ' 获胜！', cx, H * 0.28);
    }

    // 排名卡片
    const cardX = 20, cardY = H * 0.34, cardW = W - 40;
    roundRect(ctx, cardX, cardY, cardW, rankings.length * 50 + 20, 14);
    ctx.fillStyle = T.CARD_BG; ctx.fill();
    ctx.strokeStyle = T.BORDER; ctx.lineWidth = 1; ctx.stroke();

    const medals = ['🥇', '🥈', '🥉', '4', '5', '6'];
    rankings.sort((a, b) => (a.alive ? 0 : 1) - (b.alive ? 0 : 1));

    rankings.forEach((r, i) => {
      const ry = cardY + 18 + i * 50;
      // 排名
      ctx.fillStyle = T.TEXT; ctx.font = '20px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(medals[i] || (i + 1).toString(), cardX + 16, ry + 14);
      // 昵称
      ctx.fillStyle = r.alive ? T.PRIMARY : T.TEXT_LIGHT;
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(r.nickname, cardX + 50, ry + 14);
      // 数据
      ctx.fillStyle = T.TEXT_LIGHT; ctx.font = '12px sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(`答对${r.correct} 甩锅${r.blames}`, cardX + cardW - 16, ry + 14);
    });

    // 按钮
    drawButton(ctx, '再来一局', this.btnAgain.x, this.btnAgain.y, this.btnAgain.w, this.btnAgain.h, T.SUCCESS);
    drawButton(ctx, '回到首页', this.btnHome.x, this.btnHome.y, this.btnHome.w, this.btnHome.h, '#9E9E9E');
  }
}
