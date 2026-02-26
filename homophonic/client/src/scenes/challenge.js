// 闯关模式场景

import { CONFIG } from '../config.js';
import { roundRect, drawButton, drawInputBoxes, drawCategory, drawImagePlaceholder, hitTest } from '../ui.js';
import * as api from '../api.js';

const T = CONFIG.THEME;

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
    this.hintImage = null;
    this.riddleImage = null;

    // 虚拟键盘（常用汉字）
    this.kbChars = '杯具鸭梨蕉绿蓝瘦香菇虾仁冻豆腐布鸽鸡冻耗子悲伤焦急难受想哭虾人不顾激动好'.split('');
    this.kbPage = 0;

    // 按钮布局
    this.buttons = {};
    this.layoutButtons();

    this.loadPuzzle();
    app.input.onTap((x, y) => this.onTap(x, y));
  }

  layoutButtons() {
    const W = this.W, H = this.H;
    const cx = W / 2;
    this.buttons = {
      confirm: { x: cx - 100, y: H * 0.62, w: 90, h: 40 },
      hint:    { x: cx + 10,  y: H * 0.62, w: 90, h: 40 },
      showAns: { x: cx - 100, y: H * 0.62 + 50, w: 200, h: 40 },
      back:    { x: 10, y: 10, w: 60, h: 32 },
    };
  }

  async loadPuzzle() {
    try {
      const data = await api.getPuzzle(this.seq);
      this.puzzle = data.puzzle;
      this.total = data.total;
      this.answerLen = this.puzzle.answer_len;
      this.answer = new Array(this.answerLen).fill('');
      this.hintChar = '';
      this.resultMsg = '';
      this.loadImages();
    } catch (_e) {
      this.resultMsg = '加载失败，请重试';
    }
  }

  loadImages() {
    if (!this.puzzle) return;
    const base = CONFIG.API_BASE;
    this.hintImage = new Image();
    this.hintImage.src = base + this.puzzle.hint_image;
    this.riddleImage = new Image();
    this.riddleImage.src = base + this.puzzle.riddle_image;
  }

  onTap(x, y) {
    const b = this.buttons;

    // 返回主菜单
    if (hitTest(x, y, b.back.x, b.back.y, b.back.w, b.back.h)) {
      this.app.switchScene('menu');
      return;
    }

    // 确定
    if (hitTest(x, y, b.confirm.x, b.confirm.y, b.confirm.w, b.confirm.h)) {
      this.submitAnswer();
      return;
    }

    // 获取提示
    if (hitTest(x, y, b.hint.x, b.hint.y, b.hint.w, b.hint.h)) {
      this.getHint();
      return;
    }

    // 获取答案
    if (hitTest(x, y, b.showAns.x, b.showAns.y, b.showAns.w, b.showAns.h)) {
      this.showAnswer();
      return;
    }

    // 虚拟键盘点击
    this.handleKBTap(x, y);
  }

  handleKBTap(x, y) {
    const startY = this.H * 0.76;
    const cols = 7, boxS = 38, gap = 6;
    const startX = (this.W - (cols * boxS + (cols - 1) * gap)) / 2;
    const perPage = 21;
    const offset = this.kbPage * perPage;

    for (let i = 0; i < perPage && offset + i < this.kbChars.length; i++) {
      const r = Math.floor(i / cols), c = i % cols;
      const bx = startX + c * (boxS + gap);
      const by = startY + r * (boxS + gap);
      if (hitTest(x, y, bx, by, boxS, boxS)) {
        // 填入第一个空位
        const idx = this.answer.indexOf('');
        if (idx >= 0) this.answer[idx] = this.kbChars[offset + i];
        return;
      }
    }

    // 删除按钮
    const delX = startX + 6 * (boxS + gap), delY = startY + 2 * (boxS + gap);
    if (hitTest(x, y, delX, delY, boxS, boxS)) {
      for (let i = this.answer.length - 1; i >= 0; i--) {
        if (this.answer[i] !== '') { this.answer[i] = ''; break; }
      }
    }
  }

  async submitAnswer() {
    const ans = this.answer.join('');
    if (ans.length < this.answerLen) return;
    try {
      const data = await api.checkAnswer(this.seq, ans);
      if (data.correct) {
        this.resultMsg = '✅ 回答正确！';
        this.resultTimer = 1500;
        setTimeout(() => {
          this.seq++;
          this.loadPuzzle();
        }, 1500);
      } else {
        this.resultMsg = '❌ 回答错误，再试试';
        this.resultTimer = 1200;
        this.answer = new Array(this.answerLen).fill('');
      }
    } catch (_e) {
      this.resultMsg = '网络错误';
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

  render(ctx, W, H) {
    const cx = W / 2;

    // 顶栏
    drawButton(ctx, '← 返回', this.buttons.back.x, this.buttons.back.y, this.buttons.back.w, this.buttons.back.h, '#9E9E9E');

    ctx.fillStyle = T.TEXT;
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`第 ${this.seq} 关 / 共 ${this.total} 关`, cx, 32);

    if (!this.puzzle) {
      ctx.fillStyle = T.TEXT_LIGHT;
      ctx.font = '16px sans-serif';
      ctx.fillText('加载中...', cx, H / 2);
      return;
    }

    // 分类标签
    drawCategory(ctx, this.puzzle.category, cx, 60);

    // 提示图片
    const imgW = Math.min(W * 0.4, 150), imgH = imgW;
    const imgY = 80;
    if (this.hintImage && this.hintImage.complete && this.hintImage.naturalWidth > 0) {
      ctx.drawImage(this.hintImage, cx - imgW - 10, imgY, imgW, imgH);
    } else {
      drawImagePlaceholder(ctx, cx - imgW - 10, imgY, imgW, imgH, '提示图');
    }

    // 谜面图片
    if (this.riddleImage && this.riddleImage.complete && this.riddleImage.naturalWidth > 0) {
      ctx.drawImage(this.riddleImage, cx + 10, imgY, imgW, imgH);
    } else {
      drawImagePlaceholder(ctx, cx + 10, imgY, imgW, imgH, '谜面图');
    }

    // 答案输入方格
    const boxSize = 42, gap = 8;
    drawInputBoxes(ctx, this.answer, this.answerLen, cx, H * 0.52, boxSize, gap);

    // 按钮
    drawButton(ctx, '确 定', this.buttons.confirm.x, this.buttons.confirm.y, this.buttons.confirm.w, this.buttons.confirm.h, T.CORRECT);
    drawButton(ctx, '提 示', this.buttons.hint.x, this.buttons.hint.y, this.buttons.hint.w, this.buttons.hint.h, T.SECONDARY);
    drawButton(ctx, '📺 看广告获取答案', this.buttons.showAns.x, this.buttons.showAns.y, this.buttons.showAns.w, this.buttons.showAns.h, '#9E9E9E');

    // 虚拟键盘
    this.renderKB(ctx, W, H);

    // 结果提示
    if (this.resultTimer > 0) {
      roundRect(ctx, cx - 100, H * 0.42, 200, 40, 8);
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.resultMsg, cx, H * 0.42 + 20);
    }
  }

  renderKB(ctx, W, H) {
    const startY = H * 0.76;
    const cols = 7, boxS = 38, gap = 6;
    const startX = (W - (cols * boxS + (cols - 1) * gap)) / 2;
    const perPage = 21;
    const offset = this.kbPage * perPage;

    for (let i = 0; i < perPage && offset + i < this.kbChars.length; i++) {
      const r = Math.floor(i / cols), c = i % cols;
      const bx = startX + c * (boxS + gap);
      const by = startY + r * (boxS + gap);
      roundRect(ctx, bx, by, boxS, boxS, 6);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = T.BORDER;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = T.TEXT;
      ctx.font = `${boxS * 0.55}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.kbChars[offset + i], bx + boxS / 2, by + boxS / 2);
    }

    // 删除键
    const delX = startX + 6 * (boxS + gap), delY = startY + 2 * (boxS + gap);
    roundRect(ctx, delX, delY, boxS, boxS, 6);
    ctx.fillStyle = '#eee';
    ctx.fill();
    ctx.strokeStyle = T.BORDER;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = T.WRONG;
    ctx.font = `bold ${boxS * 0.5}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('←', delX + boxS / 2, delY + boxS / 2);
  }
}
