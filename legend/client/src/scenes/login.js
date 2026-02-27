// 登录场景 - 微信授权登录 + 绑定手机号

import { CONFIG } from '../config.js';
import { roundRect, drawButton, hitTest } from '../ui/common.js';

const T = CONFIG.THEME;

export class LoginScene {
  constructor(app, W, H) {
    this.app = app;
    this.W = W; this.H = H;
    this.btnLogin = { x: W / 2 - 100, y: H * 0.55, w: 200, h: 50 };
    app.input.onTap((x, y) => this.onTap(x, y));
  }

  onTap(x, y) {
    if (hitTest(x, y, this.btnLogin.x, this.btnLogin.y, this.btnLogin.w, this.btnLogin.h)) {
      // 重新登录
      this.app.doLogin().then(() => {
        if (this.app.user && this.app.user.id > 0) {
          if (!this.app.user.class) this.app.switchScene('select-class');
          else this.app.enterWorld();
        }
      });
    }
  }

  update(_dt) {}

  render(ctx, W, H) {
    const cx = W / 2;
    // 背景
    ctx.fillStyle = '#1a3a1a';
    ctx.fillRect(0, 0, W, H);

    // 标题
    ctx.fillStyle = T.GOLD; ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🌿 卡通传奇', cx, H * 0.25);

    ctx.fillStyle = '#aaa'; ctx.font = '15px sans-serif';
    ctx.fillText('治愈冒险，快乐打怪', cx, H * 0.34);

    // 装饰
    ctx.font = '60px sans-serif';
    ctx.fillText('⚔️', cx, H * 0.44);

    // 登录按钮
    drawButton(ctx, '微信登录', this.btnLogin.x, this.btnLogin.y, this.btnLogin.w, this.btnLogin.h, T.ACCENT);

    ctx.fillStyle = '#666'; ctx.font = '12px sans-serif';
    ctx.fillText('登录即表示同意用户协议', cx, H * 0.72);
  }
}
