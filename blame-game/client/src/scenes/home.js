// 首页大厅

import { CONFIG } from '../config.js';
import { roundRect, drawButton, hitTest } from '../ui.js';
import * as api from '../api.js';

const T = CONFIG.THEME;

export class HomeScene {
  constructor(app, W, H) {
    this.app = app;
    this.W = W; this.H = H;
    const cx = W / 2;
    this.btnCreate = { x: cx - 110, y: H * 0.52, w: 220, h: 50 };
    this.btnJoin = { x: cx - 110, y: H * 0.52 + 65, w: 220, h: 50 };
    this.joinInput = '';
    this.showJoinInput = false;
    this.btnJoinConfirm = { x: cx - 80, y: H * 0.52 + 150, w: 160, h: 44 };

    app.input.onTap((x, y) => this.onTap(x, y));
  }

  onTap(x, y) {
    if (hitTest(x, y, this.btnCreate.x, this.btnCreate.y, this.btnCreate.w, this.btnCreate.h)) {
      this.createRoom();
      return;
    }
    if (hitTest(x, y, this.btnJoin.x, this.btnJoin.y, this.btnJoin.w, this.btnJoin.h)) {
      this.showJoinPrompt();
      return;
    }
  }

  async createRoom() {
    try {
      const d = await api.createRoom();
      this.app.switchScene('room', { roomID: d.room_id, isHost: true });
    } catch (_e) { /* ignore */ }
  }

  showJoinPrompt() {
    const isWx = typeof wx !== 'undefined';
    if (isWx) {
      // 微信环境暂用简单方式
      this.app.switchScene('room', { roomID: 'INPUT', isHost: false });
    } else {
      const code = prompt('输入房间号：');
      if (code && code.trim()) {
        this.app.switchScene('room', { roomID: code.trim().toUpperCase(), isHost: false });
      }
    }
  }

  update(_dt) {}

  render(ctx, W, H) {
    const cx = W / 2;

    // 标题
    ctx.fillStyle = T.PRIMARY;
    ctx.font = 'bold 38px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🍳 甩锅大作战', cx, H * 0.18);

    // 副标题
    ctx.fillStyle = T.TEXT_LIGHT;
    ctx.font = '16px sans-serif';
    ctx.fillText('答题甩锅，活到最后！', cx, H * 0.26);

    // 锅的装饰
    ctx.font = '60px sans-serif';
    ctx.fillText('🫕', cx, H * 0.38);

    // 用户
    if (this.app.user) {
      ctx.fillStyle = T.TEXT; ctx.font = '14px sans-serif';
      ctx.fillText(this.app.user.nickname, cx, H * 0.46);
    }

    // 按钮
    drawButton(ctx, '🏠 创建房间', this.btnCreate.x, this.btnCreate.y, this.btnCreate.w, this.btnCreate.h, T.PRIMARY);
    drawButton(ctx, '🚪 加入房间', this.btnJoin.x, this.btnJoin.y, this.btnJoin.w, this.btnJoin.h, T.ACCENT);

    // 底部
    ctx.fillStyle = T.TEXT_LIGHT; ctx.font = '12px sans-serif';
    ctx.fillText('3-6 人实时对战', cx, H * 0.88);
  }
}
