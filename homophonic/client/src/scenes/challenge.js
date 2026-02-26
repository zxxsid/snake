// 闯关模式场景
// 单张谜面图(1:2)居中突出，左侧圆形工具按钮，点击方格弹出输入法

import { CONFIG } from '../config.js';
import { roundRect, drawButton, drawCategory, drawImagePlaceholder, hitTest } from '../ui.js';
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
    const cr = 21;
    this.buttons = {
      back:    { x: 10, y: 10, w: 60, h: 32 },
      confirm: { x: cx - 55, y: H * 0.82, w: 110, h: 42 },
      hint:    { cx: 30, cy: H * 0.42, r: cr },
      showAns: { cx: 30, cy: H * 0.42 + 56, r: cr },
    };
    this.inputArea = { cx, y: H * 0.72, boxSize: 44, gap: 8 };
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
    } catch (e) {
      this.loadError = e.message || '加载失败';
    }
  }

  _createImage(src) {
    const img = (isWx && wx.createImage) ? wx.createImage() : new Image();
    img.src = src;
    return img;
  }

  loadImages() {
    if (!this.puzzle) return;
    const base = CONFIG.API_BASE;
    this.riddleImage = this._createImage(base + this.puzzle.riddle_image);
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
    if (hitTest(x, y, b.back.x, b.back.y, b.back.w, b.back.h)) { this._cleanup(); this.app.switchScene('menu'); return; }
    if (!this.puzzle && this.loadError) { this.loadPuzzle(); return; }
    if (!this.puzzle) return;
    if (hitTest(x, y, b.confirm.x, b.confirm.y, b.confirm.w, b.confirm.h)) { this.submitAnswer(); return; }
    if (this._hitCircle(x, y, b.hint.cx, b.hint.cy, b.hint.r)) { this.getHint(); return; }
    if (this._hitCircle(x, y, b.showAns.cx, b.showAns.cy, b.showAns.r)) { this.showAnswer(); return; }
    const boxHit = this._hitInputBox(x, y);
    if (boxHit >= 0) { this.openKeyboard(boxHit); return; }
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

    // 顶栏：返回 + 关卡号
    drawButton(ctx, '←', b.back.x, b.back.y, 36, b.back.h, '#9E9E9E');
    ctx.fillStyle = T.TEXT;
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`第 ${this.seq} 关`, cx, 34);

    // 加载中/错误
    if (!this.puzzle) {
      ctx.fillStyle = T.TEXT_LIGHT; ctx.font = '16px sans-serif';
      ctx.fillText(this.loadError || '加载中...', cx, H / 2);
      if (this.loadError) drawButton(ctx, '重试', cx - 40, H / 2 + 20, 80, 36, T.PRIMARY);
      return;
    }

    // 分类标签（顶部右侧）
    drawCategory(ctx, this.puzzle.category, W - 50, 34);

    // --- 谜面图（1:2 宽高比，居中突出） ---
    const imgW = Math.min(W * 0.75, 280);
    const imgH = imgW * 2;
    const maxImgH = H * 0.52;
    const finalH = Math.min(imgH, maxImgH);
    const finalW = finalH / 2;
    const imgX = cx - finalW / 2;
    const imgY = 56;

    const imgOk = this.riddleImage && this.riddleImage.complete !== false && (this.riddleImage.width > 0 || this.riddleImage.naturalWidth > 0);
    if (imgOk) {
      roundRect(ctx, imgX - 4, imgY - 4, finalW + 8, finalH + 8, 14);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = T.BORDER;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      roundRect(ctx, imgX, imgY, finalW, finalH, 10);
      ctx.save(); ctx.clip();
      ctx.drawImage(this.riddleImage, imgX, imgY, finalW, finalH);
      ctx.restore();
    } else {
      drawImagePlaceholder(ctx, imgX, imgY, finalW, finalH, '谜面');
    }

    // --- 左侧圆形按钮（无文字标注） ---
    this._drawCircleBtn(ctx, b.hint.cx, b.hint.cy, b.hint.r, '💡', T.SECONDARY);
    this._drawCircleBtn(ctx, b.showAns.cx, b.showAns.cy, b.showAns.r, '📖', '#BDBDBD');

    // --- 答案方格 ---
    this._renderInputBoxes(ctx, cx, this.inputArea.y);

    // 确定按钮
    drawButton(ctx, '确  定', b.confirm.x, b.confirm.y, b.confirm.w, b.confirm.h, T.CORRECT);

    // 结果 toast
    if (this.resultTimer > 0) {
      const ty = this.inputArea.y - 30;
      roundRect(ctx, cx - 100, ty, 200, 36, 8);
      ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(this.resultMsg, cx, ty + 18);
    }
  }

  _drawCircleBtn(ctx, cx, cy, r, icon, color) {
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.beginPath(); ctx.arc(cx, cy + 2, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = `${r * 0.9}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(icon, cx, cy + 1);
  }

  _renderInputBoxes(ctx, cx, y) {
    const { boxSize, gap } = this.inputArea;
    const totalW = this.answerLen * boxSize + (this.answerLen - 1) * gap;
    const sx = cx - totalW / 2;
    for (let i = 0; i < this.answerLen; i++) {
      const bx = sx + i * (boxSize + gap), active = i === this.activeBox;
      roundRect(ctx, bx, y, boxSize, boxSize, 8);
      ctx.fillStyle = active ? '#FFF3E0' : '#fff'; ctx.fill();
      ctx.strokeStyle = active ? T.PRIMARY : T.BORDER; ctx.lineWidth = active ? 2.5 : 1.5; ctx.stroke();
      if (this.answer[i]) {
        ctx.fillStyle = T.TEXT; ctx.font = `bold ${boxSize * 0.58}px sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(this.answer[i], bx + boxSize / 2, y + boxSize / 2);
      } else if (active && Math.floor(Date.now() / 500) % 2 === 0) {
        ctx.fillStyle = T.PRIMARY; ctx.fillRect(bx + boxSize / 2 - 1, y + 8, 2, boxSize - 16);
      }
    }
  }
}
