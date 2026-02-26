// 闯关模式场景（参考图二风格重构）

import { CONFIG } from '../config.js';
import { roundRect, drawImagePlaceholder, hitTest } from '../ui.js';
import * as api from '../api.js';

const T = CONFIG.THEME;
const isWx = typeof wx !== 'undefined';

export class ChallengeScene {
  constructor(app, W, H, params) {
    this.app = app;
    this.W = W;
    this.H = H;
    this.seq = params?.seq || 1;
    this.puzzle = null;
    this.answer = [];
    this.answerLen = 0;
    this.resultMsg = '';
    this.resultTimer = 0;
    this.loadError = '';
    this.riddleImage = null;
    this.activeBox = -1;
    this._hiddenInput = null;

    this.layoutButtons();
    this.loadPuzzle();
    app.input.onTap((x, y) => this.onTap(x, y));

    if (isWx) {
      this._wxInputCb = (res) => this._onWxInput(res.value);
      this._wxCompleteCb = (res) => this._onWxComplete(res.value);
      wx.onKeyboardInput(this._wxInputCb);
      wx.onKeyboardComplete(this._wxCompleteCb);
    }
  }

  layoutButtons() {
    const W = this.W, H = this.H;
    const cx = W / 2;
    this.buttons = {
      back:    { cx: 32, cy: 36, r: 18 },
      confirm: { x: cx - 65, y: H * 0.86, w: 130, h: 44 },
      hint:    { cx: 32, cy: H * 0.68, r: 20 },
      showAns: { cx: 32, cy: H * 0.68 + 52, r: 20 },
    };
    this.inputArea = { cx, y: H * 0.76, boxSize: 50, gap: 12 };
  }

  async loadPuzzle() {
    this.loadError = '';
    try {
      const data = await api.getPuzzle(this.seq);
      this.puzzle = data.puzzle;
      this.answerLen = this.puzzle.answer_len;
      this.answer = new Array(this.answerLen).fill('');
      this.resultMsg = '';
      this.activeBox = -1;
      this.loadImages();
    } catch (e) { this.loadError = e.message || '加载失败'; }
  }

  _createImage(src) {
    const img = (isWx && wx.createImage) ? wx.createImage() : new Image();
    img.src = src;
    return img;
  }

  loadImages() {
    if (!this.puzzle) return;
    this.riddleImage = this._createImage(CONFIG.API_BASE + this.puzzle.riddle_image);
  }

  // --- 输入法 ---

  openKeyboard(boxIndex) {
    this.activeBox = boxIndex;
    if (isWx) {
      wx.showKeyboard({ defaultValue: this.answer[boxIndex] || '', maxLength: 1, multiple: false, confirmType: 'next' });
    } else {
      this._openBrowserInput();
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

  _openBrowserInput() {
    if (!this._hiddenInput) {
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0.01;z-index:9999;font-size:16px;';
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

  // --- 点击 ---

  onTap(x, y) {
    const b = this.buttons;
    if (this._hitCircle(x, y, b.back.cx, b.back.cy, b.back.r)) { this._cleanup(); this.app.switchScene('menu'); return; }
    if (!this.puzzle && this.loadError) { this.loadPuzzle(); return; }
    if (!this.puzzle) return;
    if (hitTest(x, y, b.confirm.x, b.confirm.y, b.confirm.w, b.confirm.h)) { this.submitAnswer(); return; }
    if (this._hitCircle(x, y, b.hint.cx, b.hint.cy, b.hint.r)) { this.getHint(); return; }
    if (this._hitCircle(x, y, b.showAns.cx, b.showAns.cy, b.showAns.r)) { this.showAnswer(); return; }
    const boxHit = this._hitInputBox(x, y);
    if (boxHit >= 0) { this.openKeyboard(boxHit); return; }
  }

  _hitCircle(tx, ty, cx, cy, r) { return (tx - cx) ** 2 + (ty - cy) ** 2 <= (r + 8) ** 2; }

  _hitInputBox(tx, ty) {
    const { cx, y, boxSize, gap } = this.inputArea;
    const totalW = this.answerLen * boxSize + (this.answerLen - 1) * gap;
    const sx = cx - totalW / 2;
    for (let i = 0; i < this.answerLen; i++) {
      if (hitTest(tx, ty, sx + i * (boxSize + gap), y, boxSize, boxSize)) return i;
    }
    return -1;
  }

  _cleanup() {
    if (isWx) { wx.offKeyboardInput(this._wxInputCb); wx.offKeyboardComplete(this._wxCompleteCb); wx.hideKeyboard({}); }
    if (this._hiddenInput) { this._hiddenInput.remove(); this._hiddenInput = null; }
  }

  // --- API ---

  async submitAnswer() {
    const ans = this.answer.join('');
    if ([...ans].length < this.answerLen) return;
    try {
      const data = await api.checkAnswer(this.seq, ans);
      if (data.correct) {
        this.resultMsg = '✅ 回答正确！';
        this.resultTimer = 1500;
        setTimeout(() => { this.seq++; this.loadPuzzle(); }, 1500);
      } else {
        this.resultMsg = '❌ 回答错误';
        this.resultTimer = 1200;
        this.answer = new Array(this.answerLen).fill('');
      }
    } catch (_e) { this.resultMsg = '网络错误'; this.resultTimer = 1200; }
  }

  async getHint() {
    try { const data = await api.getHint(this.seq); if (this.answer[0] === '') this.answer[0] = data.hint; }
    catch (_e) { /* ignore */ }
  }

  async showAnswer() {
    try { const data = await api.getFullAnswer(this.seq); this.answer = [...data.answer]; }
    catch (_e) { /* ignore */ }
  }

  update(dt) { if (this.resultTimer > 0) this.resultTimer -= dt; }

  // --- 渲染 ---

  render(ctx, W, H) {
    const cx = W / 2;
    const b = this.buttons;
    const pad = W * 0.06;

    // ===== 顶栏 =====

    // 返回按钮（蓝色圆形）
    ctx.fillStyle = T.ACCENT;
    ctx.beginPath(); ctx.arc(b.back.cx, b.back.cy, b.back.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('‹', b.back.cx - 1, b.back.cy);

    // 关卡徽章（金色胶囊）
    const badgeW = 110, badgeH = 32, badgeX = cx - badgeW / 2, badgeY = 20;
    roundRect(ctx, badgeX, badgeY, badgeW, badgeH, badgeH / 2);
    ctx.fillStyle = T.BADGE_BG; ctx.fill();
    ctx.fillStyle = T.BADGE_TEXT; ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`第 ${this.seq} 关`, cx, badgeY + badgeH / 2);

    // ===== 加载中 =====

    if (!this.puzzle) {
      ctx.fillStyle = T.TEXT_LIGHT; ctx.font = '16px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(this.loadError || '加载中...', cx, H / 2);
      if (this.loadError) {
        roundRect(ctx, cx - 40, H / 2 + 16, 80, 36, 18);
        ctx.fillStyle = T.PRIMARY; ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif';
        ctx.fillText('重试', cx, H / 2 + 34);
      }
      return;
    }

    // ===== 图片卡片区域 =====

    const cardPad = 12;
    const cardX = pad;
    const cardY = 62;
    const cardW = W - pad * 2;
    // 图片 1:2 宽高，卡片包裹图片
    const imgW = cardW - cardPad * 2;
    const imgH = imgW * 2;
    const maxImgH = H * 0.48;
    const finalImgH = Math.min(imgH, maxImgH);
    const finalImgW = finalImgH / 2;
    const cardH = finalImgH + cardPad * 2;

    // 卡片阴影
    roundRect(ctx, cardX + 2, cardY + 3, cardW, cardH, 16);
    ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fill();
    // 卡片本体
    roundRect(ctx, cardX, cardY, cardW, cardH, 16);
    ctx.fillStyle = T.CARD_BG; ctx.fill();
    ctx.strokeStyle = T.BORDER; ctx.lineWidth = 1.5; ctx.stroke();

    // 谜面图居中
    const imgX = cx - finalImgW / 2;
    const imgY = cardY + cardPad;
    const imgOk = this.riddleImage && this.riddleImage.complete !== false && (this.riddleImage.width > 0 || this.riddleImage.naturalWidth > 0);
    if (imgOk) {
      roundRect(ctx, imgX, imgY, finalImgW, finalImgH, 10);
      ctx.save(); ctx.clip();
      ctx.drawImage(this.riddleImage, imgX, imgY, finalImgW, finalImgH);
      ctx.restore();
    } else {
      drawImagePlaceholder(ctx, imgX, imgY, finalImgW, finalImgH, '谜面');
    }

    // ===== 分类文字（卡片下方，居中，普通文字） =====
    const catY = cardY + cardH + 18;
    ctx.fillStyle = T.TEXT; ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(this.puzzle.category, cx, catY);

    // ===== 左侧工具按钮 =====

    // 💡 提示
    ctx.fillStyle = T.HINT_COLOR;
    ctx.beginPath(); ctx.arc(b.hint.cx, b.hint.cy, b.hint.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `${b.hint.r}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('💡', b.hint.cx, b.hint.cy + 1);

    // 答案（红色圆形 + 文字）
    ctx.fillStyle = T.ANSWER_COLOR;
    ctx.beginPath(); ctx.arc(b.showAns.cx, b.showAns.cy, b.showAns.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `bold ${b.showAns.r * 0.7}px sans-serif`;
    ctx.fillText('答案', b.showAns.cx, b.showAns.cy + 1);

    // ===== 答案方格 =====
    this._renderInputBoxes(ctx, cx, this.inputArea.y);

    // ===== 确定按钮（金色胶囊） =====
    roundRect(ctx, b.confirm.x, b.confirm.y, b.confirm.w, b.confirm.h, b.confirm.h / 2);
    ctx.fillStyle = T.PRIMARY; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('确定', b.confirm.x + b.confirm.w / 2, b.confirm.y + b.confirm.h / 2);

    // ===== 结果 toast =====
    if (this.resultTimer > 0) {
      const ty = this.inputArea.y - 32;
      roundRect(ctx, cx - 100, ty, 200, 36, 10);
      ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(this.resultMsg, cx, ty + 18);
    }
  }

  _renderInputBoxes(ctx, cx, y) {
    const { boxSize, gap } = this.inputArea;
    const totalW = this.answerLen * boxSize + (this.answerLen - 1) * gap;
    const sx = cx - totalW / 2;
    for (let i = 0; i < this.answerLen; i++) {
      const bx = sx + i * (boxSize + gap), active = i === this.activeBox;
      // 阴影
      roundRect(ctx, bx + 1, y + 2, boxSize, boxSize, 8);
      ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fill();
      // 方格
      roundRect(ctx, bx, y, boxSize, boxSize, 8);
      ctx.fillStyle = active ? '#FFF3E0' : '#fff'; ctx.fill();
      ctx.strokeStyle = active ? T.PRIMARY : T.BORDER; ctx.lineWidth = active ? 2.5 : 1.5; ctx.stroke();
      if (this.answer[i]) {
        ctx.fillStyle = T.TEXT; ctx.font = `bold ${boxSize * 0.52}px sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(this.answer[i], bx + boxSize / 2, y + boxSize / 2);
      } else if (active && Math.floor(Date.now() / 500) % 2 === 0) {
        ctx.fillStyle = T.PRIMARY; ctx.fillRect(bx + boxSize / 2 - 1, y + 10, 2, boxSize - 20);
      }
    }
  }
}
