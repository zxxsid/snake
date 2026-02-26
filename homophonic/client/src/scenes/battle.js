// 竞技模式场景 - WebSocket 实时对战

import { CONFIG } from '../config.js';
import { roundRect, drawButton, drawInputBoxes, drawCategory, drawImagePlaceholder, drawHP, drawTimer, hitTest } from '../ui.js';
import * as api from '../api.js';

const T = CONFIG.THEME;

export class BattleScene {
  constructor(app, W, H, params) {
    this.app = app;
    this.W = W;
    this.H = H;
    this.roomID = params?.roomID || '';
    this.ws = null;

    // 游戏状态
    this.phase = 'loading'; // loading | waiting | playing | over
    this.me = { hp: 5, current: 0, nickname: app.user?.nickname || '' };
    this.opponent = { hp: 5, current: 0, nickname: '等待中...' };
    this.puzzle = null;
    this.answer = [];
    this.answerLen = 0;
    this.timer = CONFIG.MATCH_TIMER;
    this.resultMsg = '';
    this.winner = null;
    this.hintChar = '';
    this.hintImage = null;
    this.riddleImage = null;

    // 虚拟键盘
    this.kbChars = '杯具鸭梨蕉绿蓝瘦香菇虾仁冻豆腐布鸽鸡冻耗子悲伤焦急难受想哭虾人不顾激动好'.split('');

    // 按钮
    this.buttons = {
      confirm:   { x: W / 2 - 140, y: H * 0.6, w: 70, h: 36 },
      hint:      { x: W / 2 - 55,  y: H * 0.6, w: 70, h: 36 },
      skip:      { x: W / 2 + 25,  y: H * 0.6, w: 70, h: 36 },
      surrender: { x: W / 2 - 45,  y: H * 0.6 + 44, w: 90, h: 34 },
      back:      { x: 10, y: 10, w: 60, h: 32 },
      share:     { x: W / 2 - 80, y: H * 0.5, w: 160, h: 44 },
    };

    app.input.onTap((x, y) => this.onTap(x, y));

    if (this.roomID) {
      this.joinExistingRoom();
    } else {
      this.createNewRoom();
    }
  }

  async createNewRoom() {
    try {
      const data = await api.createRoom();
      this.roomID = data.room_id;
      this.phase = 'waiting';
      this.connectWS();
    } catch (_e) {
      this.phase = 'over';
      this.resultMsg = '创建房间失败';
    }
  }

  async joinExistingRoom() {
    try {
      await api.joinRoom(this.roomID);
      this.phase = 'waiting';
      this.connectWS();
    } catch (_e) {
      this.phase = 'over';
      this.resultMsg = '加入房间失败';
    }
  }

  connectWS() {
    this.ws = api.connectWS(this.roomID);
    this.ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      this.handleWSMsg(msg);
    };
    this.ws.onclose = () => {
      if (this.phase === 'playing') {
        this.phase = 'over';
        this.resultMsg = '连接断开';
      }
    };
  }

  handleWSMsg(msg) {
    switch (msg.type) {
      case 'state':
        this.updateState(msg.data);
        break;
      case 'game_start':
        this.phase = 'playing';
        this.timer = CONFIG.MATCH_TIMER;
        break;
      case 'puzzle':
        this.onNewPuzzle(msg.data);
        break;
      case 'answer_result':
        if (msg.data.correct) {
          this.resultMsg = '✅ 正确！';
        } else {
          this.resultMsg = '❌ 错误';
          this.me.hp = msg.data.hp;
          this.answer = new Array(this.answerLen).fill('');
        }
        break;
      case 'hint':
        this.hintChar = msg.data;
        if (this.answer[0] === '') this.answer[0] = this.hintChar;
        break;
      case 'game_over':
        this.phase = 'over';
        this.winner = msg.data.winner;
        this.resultMsg = this.winner === String(this.app.user.id) ? '🎉 你赢了！' :
                         this.winner === 'draw' ? '🤝 平局' : '😢 你输了';
        break;
    }
  }

  updateState(data) {
    const uid = this.app.user.id;
    const a = data.a, b = data.b;
    if (a && a.user_id === uid) {
      Object.assign(this.me, a);
      if (b) Object.assign(this.opponent, b);
    } else if (b && b.user_id === uid) {
      Object.assign(this.me, b);
      if (a) Object.assign(this.opponent, a);
    } else {
      if (a) Object.assign(this.me, a);
      if (b) Object.assign(this.opponent, b);
    }
  }

  onNewPuzzle(data) {
    this.puzzle = data;
    this.answerLen = data.answer_len;
    this.answer = new Array(this.answerLen).fill('');
    this.hintChar = '';
    this.timer = CONFIG.MATCH_TIMER;
    // 加载图片
    const base = CONFIG.API_BASE;
    this.hintImage = new Image();
    this.hintImage.src = base + data.hint_image;
    this.riddleImage = new Image();
    this.riddleImage.src = base + data.riddle_image;
  }

  onTap(x, y) {
    const b = this.buttons;

    if (hitTest(x, y, b.back.x, b.back.y, b.back.w, b.back.h)) {
      if (this.ws) this.ws.close();
      this.app.switchScene('menu');
      return;
    }

    if (this.phase === 'waiting' && hitTest(x, y, b.share.x, b.share.y, b.share.w, b.share.h)) {
      this.shareRoom();
      return;
    }

    if (this.phase !== 'playing') return;

    if (hitTest(x, y, b.confirm.x, b.confirm.y, b.confirm.w, b.confirm.h)) {
      this.sendAnswer();
    } else if (hitTest(x, y, b.hint.x, b.hint.y, b.hint.w, b.hint.h)) {
      this.ws?.send(JSON.stringify({ type: 'hint' }));
    } else if (hitTest(x, y, b.skip.x, b.skip.y, b.skip.w, b.skip.h)) {
      this.ws?.send(JSON.stringify({ type: 'skip' }));
    } else if (hitTest(x, y, b.surrender.x, b.surrender.y, b.surrender.w, b.surrender.h)) {
      this.ws?.send(JSON.stringify({ type: 'surrender' }));
    } else {
      this.handleKBTap(x, y);
    }
  }

  shareRoom() {
    if (typeof wx !== 'undefined') {
      wx.shareAppMessage({ title: '来和我PK谐音梗！', query: `room_id=${this.roomID}` });
    }
  }

  sendAnswer() {
    const ans = this.answer.join('');
    if (ans.length < this.answerLen) return;
    this.ws?.send(JSON.stringify({ type: 'answer', data: ans }));
  }

  handleKBTap(x, y) {
    const startY = this.H * 0.76;
    const cols = 7, boxS = 36, gap = 5;
    const startX = (this.W - (cols * boxS + (cols - 1) * gap)) / 2;
    for (let i = 0; i < 21 && i < this.kbChars.length; i++) {
      const r = Math.floor(i / cols), c = i % cols;
      const bx = startX + c * (boxS + gap);
      const by = startY + r * (boxS + gap);
      if (hitTest(x, y, bx, by, boxS, boxS)) {
        const idx = this.answer.indexOf('');
        if (idx >= 0) this.answer[idx] = this.kbChars[i];
        return;
      }
    }
    // 删除键
    const delX = startX + 6 * (boxS + gap), delY = startY + 2 * (boxS + gap);
    if (hitTest(x, y, delX, delY, boxS, boxS)) {
      for (let i = this.answer.length - 1; i >= 0; i--) {
        if (this.answer[i] !== '') { this.answer[i] = ''; break; }
      }
    }
  }

  update(dt) {
    if (this.phase === 'playing' && this.puzzle) {
      this.timer -= dt / 1000;
      if (this.timer <= 0) {
        this.timer = 0;
        this.ws?.send(JSON.stringify({ type: 'timeout' }));
      }
    }
  }

  render(ctx, W, H) {
    const cx = W / 2;
    drawButton(ctx, '← 返回', this.buttons.back.x, this.buttons.back.y, this.buttons.back.w, this.buttons.back.h, '#9E9E9E');

    if (this.phase === 'loading') {
      ctx.fillStyle = T.TEXT; ctx.font = '18px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('准备中...', cx, H / 2);
      return;
    }

    if (this.phase === 'waiting') {
      this.renderWaiting(ctx, W, H);
      return;
    }

    if (this.phase === 'over') {
      this.renderGameOver(ctx, W, H);
      return;
    }

    // 双方信息栏
    this.renderPlayers(ctx, W);

    // 题目序号
    if (this.puzzle) {
      ctx.fillStyle = T.TEXT; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`${this.puzzle.seq} / ${this.puzzle.total}`, cx, 90);
      drawCategory(ctx, this.puzzle.category, cx, 110);
    }

    // 倒计时
    drawTimer(ctx, W - 40, 70, 18, Math.max(0, this.timer / CONFIG.MATCH_TIMER));
    ctx.fillStyle = this.timer > 10 ? T.TEXT : T.WRONG;
    ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(Math.ceil(Math.max(0, this.timer)) + 's', W - 40, 74);

    // 图片
    const imgW = Math.min(W * 0.35, 120), imgH = imgW, imgY = 125;
    if (this.hintImage?.complete && this.hintImage.naturalWidth > 0) {
      ctx.drawImage(this.hintImage, cx - imgW - 8, imgY, imgW, imgH);
    } else {
      drawImagePlaceholder(ctx, cx - imgW - 8, imgY, imgW, imgH, '提示图');
    }
    if (this.riddleImage?.complete && this.riddleImage.naturalWidth > 0) {
      ctx.drawImage(this.riddleImage, cx + 8, imgY, imgW, imgH);
    } else {
      drawImagePlaceholder(ctx, cx + 8, imgY, imgW, imgH, '谜面图');
    }

    // 答案方格
    drawInputBoxes(ctx, this.answer, this.answerLen, cx, H * 0.5, 40, 7);

    // 按钮
    const b = this.buttons;
    drawButton(ctx, '确定', b.confirm.x, b.confirm.y, b.confirm.w, b.confirm.h, T.CORRECT);
    drawButton(ctx, '提示', b.hint.x, b.hint.y, b.hint.w, b.hint.h, T.SECONDARY);
    drawButton(ctx, '跳过', b.skip.x, b.skip.y, b.skip.w, b.skip.h, '#9E9E9E');
    drawButton(ctx, '认输', b.surrender.x, b.surrender.y, b.surrender.w, b.surrender.h, T.WRONG);

    // 虚拟键盘
    this.renderKB(ctx, W, H);

    // 结果提示
    if (this.resultMsg) {
      ctx.fillStyle = T.TEXT; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(this.resultMsg, cx, H * 0.46);
    }
  }

  renderPlayers(ctx, W) {
    // 左边：我方
    drawHP(ctx, this.me.hp, CONFIG.MATCH_HP, 12, 50, 18);
    ctx.fillStyle = T.TEXT; ctx.font = '13px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(this.me.nickname || '我', 12, 70);

    // 右边：对手
    drawHP(ctx, this.opponent.hp, CONFIG.MATCH_HP, W - 12 - CONFIG.MATCH_HP * 22, 50, 18);
    ctx.textAlign = 'right';
    ctx.fillText(this.opponent.nickname || '对手', W - 12, 70);
  }

  renderWaiting(ctx, W, H) {
    const cx = W / 2;
    ctx.fillStyle = T.TEXT; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('等待对手加入...', cx, H * 0.35);
    ctx.fillStyle = T.TEXT_LIGHT; ctx.font = '16px sans-serif';
    ctx.fillText(`房间号: ${this.roomID}`, cx, H * 0.42);

    drawButton(ctx, '📤 分享给好友', this.buttons.share.x, this.buttons.share.y, this.buttons.share.w, this.buttons.share.h, '#1976D2');

    ctx.fillStyle = T.TEXT_LIGHT; ctx.font = '13px sans-serif';
    ctx.fillText('将房间号分享给微信好友', cx, H * 0.6);
  }

  renderGameOver(ctx, W, H) {
    const cx = W / 2;
    roundRect(ctx, cx - 150, H * 0.3, 300, 200, 16);
    ctx.fillStyle = T.CARD_BG; ctx.fill();
    ctx.strokeStyle = T.BORDER; ctx.lineWidth = 2; ctx.stroke();

    ctx.fillStyle = T.PRIMARY; ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(this.resultMsg || '游戏结束', cx, H * 0.3 + 50);

    ctx.fillStyle = T.TEXT; ctx.font = '15px sans-serif';
    ctx.fillText(`我方 ♥${this.me.hp}  答题${this.me.current}`, cx, H * 0.3 + 100);
    ctx.fillText(`对方 ♥${this.opponent.hp}  答题${this.opponent.current}`, cx, H * 0.3 + 125);

    ctx.fillStyle = T.TEXT_LIGHT; ctx.font = '14px sans-serif';
    ctx.fillText('点击"返回"回到主菜单', cx, H * 0.3 + 165);
  }

  renderKB(ctx, W, H) {
    const startY = H * 0.76;
    const cols = 7, boxS = 36, gap = 5;
    const startX = (W - (cols * boxS + (cols - 1) * gap)) / 2;
    for (let i = 0; i < 21 && i < this.kbChars.length; i++) {
      const r = Math.floor(i / cols), c = i % cols;
      const bx = startX + c * (boxS + gap);
      const by = startY + r * (boxS + gap);
      roundRect(ctx, bx, by, boxS, boxS, 5);
      ctx.fillStyle = '#fff'; ctx.fill();
      ctx.strokeStyle = T.BORDER; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = T.TEXT; ctx.font = `${boxS * 0.55}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(this.kbChars[i], bx + boxS / 2, by + boxS / 2);
    }
    const delX = startX + 6 * (boxS + gap), delY = startY + 2 * (boxS + gap);
    roundRect(ctx, delX, delY, boxS, boxS, 5);
    ctx.fillStyle = '#eee'; ctx.fill();
    ctx.fillStyle = T.WRONG; ctx.font = `bold ${boxS * 0.5}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('←', delX + boxS / 2, delY + boxS / 2);
  }
}
