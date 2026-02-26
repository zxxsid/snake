// 闯关模式场景
// 点击答案框弹出系统输入法，提示图/谜面图上下排列，灯泡/答案圆形按钮在左侧

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
    this.total = 0;
    this.answer = [];
    this.answerLen = 0;
    this.hintChar = '';
    this.resultMsg = '';
    this.resultTimer = 0;
    this.loadError = '';
    this.hintImage = null;
    this.riddleImage = null;
    this.activeBox = -1;
    this._hiddenInput = null;

    this.layoutButtons();
    this.loadPuzzle();
    app.input.onTap((x, y) => this.onTap(x, y));

    // 微信键盘事件
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
    // 圆形按钮半径
    const cr = 22;
    this.buttons = {
      back:    { x: 10, y: 10, w: 60, h: 32 },
      confirm: { x: cx - 55, y: H * 0.72, w: 110, h: 42 },
      // 左侧圆形按钮
      hint:    { cx: 36, cy: H * 0.5, r: cr },
      showAns: { cx: 36, cy: H * 0.5 + 60, r: cr },
    };
    // 答案方格区域（用于点击检测）
    this.inputArea = { cx, y: H * 0.62, boxSize: 44, gap: 8 };
  }

  async loadPuzzle() {
    this.loadError = '';
    try {
      const data = await api.getPuzzle(this.seq);
      this.puzzle = data.puzzle;
      this.total = data.total;
      this.answerLen = this.puzzle.answer_len;
      this.answer = new Array(this.answerLen).fill('');
      this.hintChar = '';
      this.resultMsg = '';
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
    this.hintImage = this._createImage(base + this.puzzle.hint_image);
    this.riddleImage = this._createImage(base + this.puzzle.riddle_image);
  }

  // --- 输入法 ---

  // 点击答案框 → 弹出键盘
  openKeyboard(boxIndex) {
    this.activeBox = boxIndex;
    if (isWx) {
      wx.showKeyboard({
        defaultValue: this.answer[boxIndex] || '',
        maxLength: 1,
        multiple: false,
        confirmHold: false,
        confirmType: 'next',
      });
    } else {
      this._openBrowserInput(boxIndex);
    }
  }

  _onWxInput(value) {
    if (this.activeBox < 0 || this.activeBox >= this.answerLen) return;
    const chars = [...value];
    if (chars.length > 0) {
      this.answer[this.activeBox] = chars[chars.length - 1];
    }
  }

  _onWxComplete(value) {
    if (this.activeBox < 0) return;
    const chars = [...value];
    if (chars.length > 0) {
      this.answer[this.activeBox] = chars[chars.length - 1];
    }
    // 自动跳到下一个空格
    const next = this.answer.indexOf('', this.activeBox + 1);
    if (next >= 0) {
      this.openKeyboard(next);
    } else {
      this.activeBox = -1;
      if (isWx) wx.hideKeyboard({});
    }
  }

  // 浏览器：用隐藏 input
  _openBrowserInput(_boxIndex) {
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
          if (next >= 0) {
            this.activeBox = next;
          } else {
            this.activeBox = -1;
            inp.blur();
          }
        }
      });
      this._hiddenInput = inp;
    }
    this._hiddenInput.value = '';
    this._hiddenInput.focus();
  }

  // --- 点击处理 ---

  onTap(x, y) {
    const b = this.buttons;

    if (hitTest(x, y, b.back.x, b.back.y, b.back.w, b.back.h)) {
      this._cleanup();
      this.app.switchScene('menu');
      return;
    }

    if (!this.puzzle && this.loadError) {
      this.loadPuzzle();
      return;
    }

    if (!this.puzzle) return;

    // 确定按钮
    if (hitTest(x, y, b.confirm.x, b.confirm.y, b.confirm.w, b.confirm.h)) {
      this.submitAnswer();
      return;
    }

    // 灯泡提示（圆形按钮）
    if (this._hitCircle(x, y, b.hint.cx, b.hint.cy, b.hint.r)) {
      this.getHint();
      return;
    }

    // 答案按钮（圆形按钮）
    if (this._hitCircle(x, y, b.showAns.cx, b.showAns.cy, b.showAns.r)) {
      this.showAnswer();
      return;
    }

    // 点击答案方格 → 弹出键盘
    const boxHit = this._hitInputBox(x, y);
    if (boxHit >= 0) {
      this.openKeyboard(boxHit);
      return;
    }
  }

  _hitCircle(tx, ty, cx, cy, r) {
    return (tx - cx) ** 2 + (ty - cy) ** 2 <= (r + 6) ** 2;
  }

  _hitInputBox(tx, ty) {
    const { cx, y, boxSize, gap } = this.inputArea;
    const totalW = this.answerLen * boxSize + (this.answerLen - 1) * gap;
    const sx = cx - totalW / 2;
    for (let i = 0; i < this.answerLen; i++) {
      const bx = sx + i * (boxSize + gap);
      if (hitTest(tx, ty, bx, y, boxSize, boxSize)) return i;
    }
    return -1;
  }

  _cleanup() {
    if (isWx) {
      wx.offKeyboardInput(this._wxInputCb);
      wx.offKeyboardComplete(this._wxCompleteCb);
      wx.hideKeyboard({});
    }
    if (this._hiddenInput) {
      this._hiddenInput.remove();
      this._hiddenInput = null;
    }
  }

  // --- API 交互 ---

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
        this.resultMsg = '❌ 回答错误，再试试';
        this.resultTimer = 1200;
        this.answer = new Array(this.answerLen).fill('');
      }
    } catch (_e) {
      this.resultMsg = '网络错误';
      this.resultTimer = 1200;
    }
  }

  async getHint() {
    try {
      const data = await api.getHint(this.seq);
      this.hintChar = data.hint;
      if (this.answer[0] === '') this.answer[0] = this.hintChar;
    } catch (_e) { /* ignore */ }
  }

  async showAnswer() {
    try {
      const data = await api.getFullAnswer(this.seq);
      this.answer = [...data.answer];
    } catch (_e) { /* ignore */ }
  }

  update(dt) {
    if (this.resultTimer > 0) this.resultTimer -= dt;
  }

  // --- 渲染 ---

  render(ctx, W, H) {
    const cx = W / 2;
    const b = this.buttons;

    // 顶栏
    drawButton(ctx, '← 返回', b.back.x, b.back.y, b.back.w, b.back.h, '#9E9E9E');
    ctx.fillStyle = T.TEXT;
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`第 ${this.seq} 关 / 共 ${this.total} 关`, cx, 32);

    // 加载中/错误
    if (!this.puzzle) {
      ctx.fillStyle = T.TEXT_LIGHT;
      ctx.font = '16px sans-serif';
      ctx.fillText(this.loadError || '加载中...', cx, H / 2);
      if (this.loadError) drawButton(ctx, '重试', cx - 40, H / 2 + 20, 80, 36, T.PRIMARY);
      return;
    }

    // 分类标签
    drawCategory(ctx, this.puzzle.category, cx, 56);

    // --- 提示图 + 谜面图 上下排列 ---
    const imgW = Math.min(W * 0.55, 200);
    const imgH = imgW * 0.7;
    const imgX = cx - imgW / 2;
    const img1Y = 72;
    const img2Y = img1Y + imgH + 10;

    this._drawImg(ctx, this.hintImage, imgX, img1Y, imgW, imgH, '提示图');
    this._drawImg(ctx, this.riddleImage, imgX, img2Y, imgW, imgH, '谜面图');

    // --- 左侧圆形按钮：💡 提示 + 📖 答案 ---
    this._drawCircleBtn(ctx, b.hint.cx, b.hint.cy, b.hint.r, '💡', T.SECONDARY);
    this._drawCircleBtn(ctx, b.showAns.cx, b.showAns.cy, b.showAns.r, '📖', '#9E9E9E');

    // 按钮文字标注
    ctx.fillStyle = T.TEXT_LIGHT;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('提示', b.hint.cx, b.hint.cy + b.hint.r + 14);
    ctx.fillText('答案', b.showAns.cx, b.showAns.cy + b.showAns.r + 14);

    // --- 答案输入方格 ---
    this._renderInputBoxes(ctx, cx, this.inputArea.y);

    // 点击提示
    ctx.fillStyle = T.TEXT_LIGHT;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('点击方格输入答案', cx, this.inputArea.y + this.inputArea.boxSize + 16);

    // 确定按钮
    drawButton(ctx, '确  定', b.confirm.x, b.confirm.y, b.confirm.w, b.confirm.h, T.CORRECT);

    // 结果 toast
    if (this.resultTimer > 0) {
      roundRect(ctx, cx - 110, H * 0.44, 220, 42, 10);
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.resultMsg, cx, H * 0.44 + 21);
    }
  }

  _drawImg(ctx, img, x, y, w, h, label) {
    const loaded = img && img.complete !== false && (img.width > 0 || img.naturalWidth > 0);
    if (loaded) {
      roundRect(ctx, x, y, w, h, 10);
      ctx.save();
      ctx.clip();
      ctx.drawImage(img, x, y, w, h);
      ctx.restore();
    } else {
      drawImagePlaceholder(ctx, x, y, w, h, label);
    }
  }

  _drawCircleBtn(ctx, cx, cy, r, icon, color) {
    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.beginPath(); ctx.arc(cx, cy + 2, r, 0, Math.PI * 2); ctx.fill();
    // 底
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // 图标
    ctx.fillStyle = '#fff';
    ctx.font = `${r * 0.9}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, cx, cy + 1);
  }

  _renderInputBoxes(ctx, cx, y) {
    const { boxSize, gap } = this.inputArea;
    const totalW = this.answerLen * boxSize + (this.answerLen - 1) * gap;
    const sx = cx - totalW / 2;

    for (let i = 0; i < this.answerLen; i++) {
      const bx = sx + i * (boxSize + gap);
      const active = i === this.activeBox;

      roundRect(ctx, bx, y, boxSize, boxSize, 8);
      ctx.fillStyle = active ? '#FFF3E0' : '#FFFFFF';
      ctx.fill();
      ctx.strokeStyle = active ? T.PRIMARY : T.BORDER;
      ctx.lineWidth = active ? 2.5 : 1.5;
      ctx.stroke();

      if (this.answer[i]) {
        ctx.fillStyle = T.TEXT;
        ctx.font = `bold ${boxSize * 0.58}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.answer[i], bx + boxSize / 2, y + boxSize / 2);
      } else if (active) {
        // 光标闪烁
        const blink = Math.floor(Date.now() / 500) % 2 === 0;
        if (blink) {
          ctx.fillStyle = T.PRIMARY;
          ctx.fillRect(bx + boxSize / 2 - 1, y + 8, 2, boxSize - 16);
        }
      }
    }
  }
}
