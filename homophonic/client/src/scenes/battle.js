// 竞技模式场景 - WebSocket 实时对战
// 点击答案框弹出系统输入法，提示图/谜面图上下排列，灯泡提示按钮在左侧

import { CONFIG } from '../config.js';
import { roundRect, drawButton, drawCategory, drawImagePlaceholder, drawHP, drawTimer, hitTest } from '../ui.js';
import * as api from '../api.js';

const T = CONFIG.THEME;
const isWx = typeof wx !== 'undefined';

export class BattleScene {
  constructor(app, W, H, params) {
    this.app = app;
    this.W = W;
    this.H = H;
    this.roomID = params?.roomID || '';
    this.ws = null;

    this.phase = 'loading';
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
    this.activeBox = -1;
    this._hiddenInput = null;

    const cr = 20;
    this.buttons = {
      back:      { x: 10, y: 10, w: 60, h: 32 },
      confirm:   { x: W / 2 - 50, y: H * 0.72, w: 100, h: 38 },
      hint:      { cx: 32, cy: H * 0.48, r: cr },
      skip:      { x: W / 2 - 100, y: H * 0.72 + 48, w: 90, h: 34 },
      surrender: { x: W / 2 + 10,  y: H * 0.72 + 48, w: 90, h: 34 },
      share:     { x: W / 2 - 80, y: H * 0.5, w: 160, h: 44 },
    };
    this.inputArea = { cx: W / 2, y: H * 0.62, boxSize: 40, gap: 7 };

    app.input.onTap((x, y) => this.onTap(x, y));

    if (isWx) {
      this._wxInputCb = (res) => this._onWxInput(res.value);
      this._wxCompleteCb = (res) => this._onWxComplete(res.value);
      wx.onKeyboardInput(this._wxInputCb);
      wx.onKeyboardComplete(this._wxCompleteCb);
    }

    if (this.roomID) this.joinExistingRoom();
    else this.createNewRoom();
  }

  // --- 输入法 ---

  openKeyboard(boxIndex) {
    this.activeBox = boxIndex;
    if (isWx) {
      wx.showKeyboard({ defaultValue: this.answer[boxIndex] || '', maxLength: 1, multiple: false, confirmType: 'next' });
    } else {
      if (!this._hiddenInput) {
        const inp = document.createElement('input');
        inp.type = 'text'; inp.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0.01;z-index:9999;font-size:16px;';
        document.body.appendChild(inp);
        inp.addEventListener('input', () => {
          const chars = [...inp.value];
          if (this.activeBox >= 0 && chars.length > 0) {
            this.answer[this.activeBox] = chars[chars.length - 1];
            inp.value = '';
            const next = this.answer.indexOf('', this.activeBox + 1);
            if (next >= 0) this.activeBox = next;
            else { this.activeBox = -1; inp.blur(); }
          }
        });
        this._hiddenInput = inp;
      }
      this._hiddenInput.value = '';
      this._hiddenInput.focus();
    }
  }

  _onWxInput(value) {
    if (this.activeBox < 0 || this.activeBox >= this.answerLen) return;
    const chars = [...value];
    if (chars.length > 0) this.answer[this.activeBox] = chars[chars.length - 1];
  }

  _onWxComplete(value) {
    if (this.activeBox < 0) return;
    const chars = [...value];
    if (chars.length > 0) this.answer[this.activeBox] = chars[chars.length - 1];
    const next = this.answer.indexOf('', this.activeBox + 1);
    if (next >= 0) this.openKeyboard(next);
    else { this.activeBox = -1; if (isWx) wx.hideKeyboard({}); }
  }

  _hitCircle(tx, ty, cx, cy, r) { return (tx - cx) ** 2 + (ty - cy) ** 2 <= (r + 6) ** 2; }

  _hitInputBox(tx, ty) {
    const { cx, y, boxSize, gap } = this.inputArea;
    const totalW = this.answerLen * boxSize + (this.answerLen - 1) * gap;
    const sx = cx - totalW / 2;
    for (let i = 0; i < this.answerLen; i++) {
      if (hitTest(tx, ty, sx + i * (boxSize + gap), y, boxSize, boxSize)) return i;
    }
    return -1;
  }

  // --- 房间/WS ---

  async createNewRoom() {
    try { const data = await api.createRoom(); this.roomID = data.room_id; this.phase = 'waiting'; this.connectWS(); }
    catch (_e) { this.phase = 'over'; this.resultMsg = '创建房间失败'; }
  }

  async joinExistingRoom() {
    try { await api.joinRoom(this.roomID); this.phase = 'waiting'; this.connectWS(); }
    catch (_e) { this.phase = 'over'; this.resultMsg = '加入房间失败'; }
  }

  connectWS() {
    this.ws = api.connectWS(this.roomID);
    this.ws.onmessage = (e) => this.handleWSMsg(JSON.parse(e.data));
    this.ws.onclose = () => { if (this.phase === 'playing') { this.phase = 'over'; this.resultMsg = '连接断开'; } };
  }

  handleWSMsg(msg) {
    switch (msg.type) {
      case 'state': this.updateState(msg.data); break;
      case 'game_start': this.phase = 'playing'; this.timer = CONFIG.MATCH_TIMER; break;
      case 'puzzle': this.onNewPuzzle(msg.data); break;
      case 'answer_result':
        if (msg.data.correct) { this.resultMsg = '✅ 正确！'; }
        else { this.resultMsg = '❌ 错误'; this.me.hp = msg.data.hp; this.answer = new Array(this.answerLen).fill(''); }
        break;
      case 'hint':
        this.hintChar = msg.data;
        if (this.answer[0] === '') this.answer[0] = this.hintChar;
        break;
      case 'game_over':
        this.phase = 'over'; this.winner = msg.data.winner;
        this.resultMsg = this.winner === String(this.app.user.id) ? '🎉 你赢了！' : this.winner === 'draw' ? '🤝 平局' : '😢 你输了';
        break;
    }
  }

  updateState(data) {
    const uid = this.app.user.id;
    const a = data.a, b = data.b;
    if (a && a.user_id === uid) { Object.assign(this.me, a); if (b) Object.assign(this.opponent, b); }
    else if (b && b.user_id === uid) { Object.assign(this.me, b); if (a) Object.assign(this.opponent, a); }
    else { if (a) Object.assign(this.me, a); if (b) Object.assign(this.opponent, b); }
  }

  onNewPuzzle(data) {
    this.puzzle = data; this.answerLen = data.answer_len;
    this.answer = new Array(this.answerLen).fill('');
    this.hintChar = ''; this.timer = CONFIG.MATCH_TIMER; this.activeBox = -1; this.resultMsg = '';
    const base = CONFIG.API_BASE;
    this.hintImage = (isWx && wx.createImage) ? wx.createImage() : new Image();
    this.hintImage.src = base + data.hint_image;
    this.riddleImage = (isWx && wx.createImage) ? wx.createImage() : new Image();
    this.riddleImage.src = base + data.riddle_image;
  }

  // --- 点击处理 ---

  onTap(x, y) {
    const b = this.buttons;
    if (hitTest(x, y, b.back.x, b.back.y, b.back.w, b.back.h)) {
      if (this.ws) this.ws.close(); this._cleanup(); this.app.switchScene('menu'); return;
    }
    if (this.phase === 'waiting' && hitTest(x, y, b.share.x, b.share.y, b.share.w, b.share.h)) { this.shareRoom(); return; }
    if (this.phase !== 'playing') return;

    if (hitTest(x, y, b.confirm.x, b.confirm.y, b.confirm.w, b.confirm.h)) { this.sendAnswer(); return; }
    if (this._hitCircle(x, y, b.hint.cx, b.hint.cy, b.hint.r)) { this.ws?.send(JSON.stringify({ type: 'hint' })); return; }
    if (hitTest(x, y, b.skip.x, b.skip.y, b.skip.w, b.skip.h)) { this.ws?.send(JSON.stringify({ type: 'skip' })); return; }
    if (hitTest(x, y, b.surrender.x, b.surrender.y, b.surrender.w, b.surrender.h)) { this.ws?.send(JSON.stringify({ type: 'surrender' })); return; }

    const boxHit = this._hitInputBox(x, y);
    if (boxHit >= 0) this.openKeyboard(boxHit);
  }

  shareRoom() { if (isWx) wx.shareAppMessage({ title: '来和我PK谐音梗！', query: `room_id=${this.roomID}` }); }
  sendAnswer() { const ans = this.answer.join(''); if ([...ans].length >= this.answerLen) this.ws?.send(JSON.stringify({ type: 'answer', data: ans })); }

  _cleanup() {
    if (isWx) { wx.offKeyboardInput(this._wxInputCb); wx.offKeyboardComplete(this._wxCompleteCb); wx.hideKeyboard({}); }
    if (this._hiddenInput) { this._hiddenInput.remove(); this._hiddenInput = null; }
  }

  update(dt) {
    if (this.phase === 'playing' && this.puzzle) {
      this.timer -= dt / 1000;
      if (this.timer <= 0) { this.timer = 0; this.ws?.send(JSON.stringify({ type: 'timeout' })); }
    }
  }

  // --- 渲染 ---

  render(ctx, W, H) {
    const cx = W / 2, b = this.buttons;
    drawButton(ctx, '← 返回', b.back.x, b.back.y, b.back.w, b.back.h, '#9E9E9E');

    if (this.phase === 'loading') { ctx.fillStyle = T.TEXT; ctx.font = '18px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('准备中...', cx, H / 2); return; }
    if (this.phase === 'waiting') { this.renderWaiting(ctx, W, H); return; }
    if (this.phase === 'over') { this.renderGameOver(ctx, W, H); return; }

    // 双方信息
    drawHP(ctx, this.me.hp, CONFIG.MATCH_HP, 12, 50, 16);
    ctx.fillStyle = T.TEXT; ctx.font = '12px sans-serif'; ctx.textAlign = 'left'; ctx.fillText(this.me.nickname || '我', 12, 68);
    drawHP(ctx, this.opponent.hp, CONFIG.MATCH_HP, W - 12 - CONFIG.MATCH_HP * 20, 50, 16);
    ctx.textAlign = 'right'; ctx.fillText(this.opponent.nickname || '对手', W - 12, 68);

    if (!this.puzzle) return;

    // 题号 + 分类
    ctx.fillStyle = T.TEXT; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`${this.puzzle.seq} / ${this.puzzle.total}`, cx, 86);
    drawCategory(ctx, this.puzzle.category, cx, 104);

    // 倒计时
    drawTimer(ctx, W - 36, 86, 16, Math.max(0, this.timer / CONFIG.MATCH_TIMER));
    ctx.fillStyle = this.timer > 10 ? T.TEXT : T.WRONG; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(Math.ceil(Math.max(0, this.timer)) + 's', W - 36, 90);

    // 提示图 + 谜面图 上下排列
    const imgW = Math.min(W * 0.5, 180), imgH = imgW * 0.65;
    const imgX = cx - imgW / 2, img1Y = 115, img2Y = img1Y + imgH + 8;
    this._drawImg(ctx, this.hintImage, imgX, img1Y, imgW, imgH, '提示图');
    this._drawImg(ctx, this.riddleImage, imgX, img2Y, imgW, imgH, '谜面图');

    // 左侧圆形提示按钮
    this._drawCircleBtn(ctx, b.hint.cx, b.hint.cy, b.hint.r, '💡', T.SECONDARY);
    ctx.fillStyle = T.TEXT_LIGHT; ctx.font = '10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('提示', b.hint.cx, b.hint.cy + b.hint.r + 13);

    // 答案方格
    this._renderInputBoxes(ctx, cx, this.inputArea.y);
    ctx.fillStyle = T.TEXT_LIGHT; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('点击方格输入', cx, this.inputArea.y + this.inputArea.boxSize + 14);

    // 按钮
    drawButton(ctx, '确 定', b.confirm.x, b.confirm.y, b.confirm.w, b.confirm.h, T.CORRECT);
    drawButton(ctx, '跳过 (-1♥)', b.skip.x, b.skip.y, b.skip.w, b.skip.h, '#9E9E9E');
    drawButton(ctx, '认  输', b.surrender.x, b.surrender.y, b.surrender.w, b.surrender.h, T.WRONG);

    if (this.resultMsg) { ctx.fillStyle = T.TEXT; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(this.resultMsg, cx, this.inputArea.y - 10); }
  }

  _drawImg(ctx, img, x, y, w, h, label) {
    const ok = img && img.complete !== false && (img.width > 0 || img.naturalWidth > 0);
    if (ok) { roundRect(ctx, x, y, w, h, 8); ctx.save(); ctx.clip(); ctx.drawImage(img, x, y, w, h); ctx.restore(); }
    else drawImagePlaceholder(ctx, x, y, w, h, label);
  }

  _drawCircleBtn(ctx, cx, cy, r, icon, color) {
    ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.beginPath(); ctx.arc(cx, cy + 2, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = `${r * 0.9}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(icon, cx, cy + 1);
  }

  _renderInputBoxes(ctx, cx, y) {
    const { boxSize, gap } = this.inputArea;
    const totalW = this.answerLen * boxSize + (this.answerLen - 1) * gap;
    const sx = cx - totalW / 2;
    for (let i = 0; i < this.answerLen; i++) {
      const bx = sx + i * (boxSize + gap), active = i === this.activeBox;
      roundRect(ctx, bx, y, boxSize, boxSize, 7);
      ctx.fillStyle = active ? '#FFF3E0' : '#fff'; ctx.fill();
      ctx.strokeStyle = active ? T.PRIMARY : T.BORDER; ctx.lineWidth = active ? 2.5 : 1.5; ctx.stroke();
      if (this.answer[i]) { ctx.fillStyle = T.TEXT; ctx.font = `bold ${boxSize * 0.55}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(this.answer[i], bx + boxSize / 2, y + boxSize / 2); }
      else if (active && Math.floor(Date.now() / 500) % 2 === 0) { ctx.fillStyle = T.PRIMARY; ctx.fillRect(bx + boxSize / 2 - 1, y + 8, 2, boxSize - 16); }
    }
  }

  renderWaiting(ctx, W, H) {
    const cx = W / 2;
    ctx.fillStyle = T.TEXT; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('等待对手加入...', cx, H * 0.35);
    ctx.fillStyle = T.TEXT_LIGHT; ctx.font = '16px sans-serif'; ctx.fillText(`房间号: ${this.roomID}`, cx, H * 0.42);
    drawButton(ctx, '📤 分享给好友', this.buttons.share.x, this.buttons.share.y, this.buttons.share.w, this.buttons.share.h, '#1976D2');
    ctx.fillStyle = T.TEXT_LIGHT; ctx.font = '13px sans-serif'; ctx.fillText('将房间号分享给微信好友', cx, H * 0.6);
  }

  renderGameOver(ctx, W, H) {
    const cx = W / 2;
    roundRect(ctx, cx - 150, H * 0.3, 300, 200, 16); ctx.fillStyle = T.CARD_BG; ctx.fill(); ctx.strokeStyle = T.BORDER; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = T.PRIMARY; ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(this.resultMsg || '游戏结束', cx, H * 0.3 + 50);
    ctx.fillStyle = T.TEXT; ctx.font = '15px sans-serif';
    ctx.fillText(`我方 ♥${this.me.hp}  答题${this.me.current}`, cx, H * 0.3 + 100);
    ctx.fillText(`对方 ♥${this.opponent.hp}  答题${this.opponent.current}`, cx, H * 0.3 + 125);
    ctx.fillStyle = T.TEXT_LIGHT; ctx.font = '14px sans-serif'; ctx.fillText('点击"返回"回到主菜单', cx, H * 0.3 + 165);
  }
}
