// 房间等待页

import { CONFIG } from '../config.js';
import { roundRect, drawButton, drawAvatar, hitTest } from '../ui.js';
import * as api from '../api.js';

const T = CONFIG.THEME;

export class RoomScene {
  constructor(app, W, H, params) {
    this.app = app;
    this.W = W; this.H = H;
    this.roomID = params?.roomID || '';
    this.isHost = params?.isHost || false;
    this.players = [];
    this.status = 0;
    this.ws = null;

    const cx = W / 2;
    this.btnReady = { x: cx - 80, y: H * 0.78, w: 160, h: 46 };
    this.btnShare = { x: cx - 80, y: H * 0.78 + 56, w: 160, h: 40 };
    this.btnBack = { x: 12, y: 12, w: 50, h: 32 };

    app.input.onTap((x, y) => this.onTap(x, y));
    this.connect();
  }

  connect() {
    this.ws = api.connectWS(this.roomID);
    this.ws.onmessage = (e) => {
      const msg = JSON.parse(typeof e.data === 'string' ? e.data : '{}');
      this.handleMsg(msg);
    };
    this.ws.onclose = () => {};
  }

  handleMsg(msg) {
    switch (msg.type) {
      case 'room_state':
        this.players = msg.data.players || [];
        this.status = msg.data.status;
        break;
      case 'game_start':
        this.app.switchScene('game', { ws: this.ws, roomID: this.roomID, players: this.players });
        break;
      case 'error':
        break;
    }
  }

  onTap(x, y) {
    if (hitTest(x, y, this.btnBack.x, this.btnBack.y, this.btnBack.w, this.btnBack.h)) {
      if (this.ws) this.ws.close();
      this.app.switchScene('home');
      return;
    }
    if (hitTest(x, y, this.btnReady.x, this.btnReady.y, this.btnReady.w, this.btnReady.h)) {
      this.ws?.send(JSON.stringify({ type: 'ready' }));
      return;
    }
    if (hitTest(x, y, this.btnShare.x, this.btnShare.y, this.btnShare.w, this.btnShare.h)) {
      if (typeof wx !== 'undefined') {
        wx.shareAppMessage({ title: `来甩锅！房间号 ${this.roomID}`, query: `room_id=${this.roomID}` });
      }
    }
  }

  update(_dt) {}

  render(ctx, W, H) {
    const cx = W / 2;

    drawButton(ctx, '←', this.btnBack.x, this.btnBack.y, 36, this.btnBack.h, '#9E9E9E');

    // 房间号
    ctx.fillStyle = T.PRIMARY; ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center'; ctx.fillText('🍳 房间', cx, 40);

    roundRect(ctx, cx - 70, 55, 140, 36, 18);
    ctx.fillStyle = T.ACCENT; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 18px sans-serif';
    ctx.fillText(this.roomID, cx, 73);

    // 等待人数
    ctx.fillStyle = T.TEXT_LIGHT; ctx.font = '14px sans-serif';
    ctx.fillText(`${this.players.length} / 6 人`, cx, 108);

    // 玩家头像列表
    const avatarR = 28;
    const cols = Math.min(this.players.length, 3);
    const rows = Math.ceil(this.players.length / 3);
    const startX = cx - (cols * 80) / 2 + 40;
    const startY = 140;

    this.players.forEach((p, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const ax = startX + col * 80;
      const ay = startY + row * 90;
      drawAvatar(ctx, ax, ay, avatarR, p.nickname, true, false);
      // 准备状态
      if (p.ready) {
        ctx.fillStyle = T.SUCCESS; ctx.font = 'bold 12px sans-serif';
        ctx.fillText('已准备', ax, ay + avatarR + 26);
      }
    });

    // 按钮
    const myState = this.players.find(p => p.user_id === this.app.user?.id);
    const readyText = myState?.ready ? '取消准备' : '准 备';
    drawButton(ctx, readyText, this.btnReady.x, this.btnReady.y, this.btnReady.w, this.btnReady.h, myState?.ready ? '#9E9E9E' : T.SUCCESS);
    drawButton(ctx, '📤 分享给好友', this.btnShare.x, this.btnShare.y, this.btnShare.w, this.btnShare.h, T.ACCENT);

    // 提示
    ctx.fillStyle = T.TEXT_LIGHT; ctx.font = '13px sans-serif';
    ctx.fillText('全员准备后自动开始（至少 3 人）', cx, H * 0.93);
  }
}
