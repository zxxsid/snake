// 游戏主界面 - 答题/甩锅/爆炸

import { CONFIG } from '../config.js';
import { roundRect, drawButton, drawPot, drawAvatar, hitTest, hitCircle } from '../ui.js';

const T = CONFIG.THEME;

export class GameScene {
  constructor(app, W, H, params) {
    this.app = app;
    this.W = W; this.H = H;
    this.ws = params?.ws;
    this.roomID = params?.roomID;
    this.players = params?.players || [];
    this.pots = [];
    this.question = null;
    this.choosing = false;
    this.resultMsg = '';
    this.resultTimer = 0;
    this.explodeAnim = null;
    this.blameAnim = null;

    const cx = W / 2;
    this.optBtns = [];
    this.btnConfirm = { x: cx - 55, y: H * 0.78, w: 110, h: 40 };
    this.inputAnswer = '';

    app.input.onTap((x, y) => this.onTap(x, y));

    if (this.ws) {
      this.ws.onmessage = (e) => {
        const msg = JSON.parse(typeof e.data === 'string' ? e.data : '{}');
        this.handleMsg(msg);
      };
    }
  }

  handleMsg(msg) {
    switch (msg.type) {
      case 'room_state':
        this.players = msg.data.players || [];
        this.pots = msg.data.pots || [];
        break;
      case 'question':
        this.question = msg.data;
        this.inputAnswer = '';
        this.choosing = false;
        this.layoutOptions();
        break;
      case 'answer_result':
        this.resultMsg = msg.data.correct ? '✅ 正确！' : '❌ 错误！答案：' + msg.data.answer;
        this.resultTimer = 1500;
        break;
      case 'choose_target':
        this.choosing = true;
        this.question = null;
        break;
      case 'blame_anim':
        this.blameAnim = { from: msg.data.from, to: msg.data.to, t: 0 };
        break;
      case 'pot_assign':
        break;
      case 'pot_explode':
        this.explodeAnim = { userId: msg.data.user_id, t: 0 };
        break;
      case 'player_out':
        break;
      case 'game_over':
        setTimeout(() => {
          this.app.switchScene('result', { data: msg.data, ws: this.ws });
        }, 1500);
        break;
    }
  }

  layoutOptions() {
    if (!this.question) return;
    const opts = this.question.options || [];
    const cx = this.W / 2;
    const y = this.H * 0.6;
    const w = Math.min(this.W * 0.4, 150);
    const h = 40;
    const gap = 10;
    this.optBtns = [];
    if (opts.length > 0) {
      const cols = 2, rows = Math.ceil(opts.length / cols);
      for (let i = 0; i < opts.length; i++) {
        const col = i % cols, row = Math.floor(i / cols);
        this.optBtns.push({
          x: cx - (cols * w + (cols - 1) * gap) / 2 + col * (w + gap),
          y: y + row * (h + gap), w, h, text: opts[i],
        });
      }
    }
  }

  onTap(x, y) {
    // 选择甩锅目标
    if (this.choosing) {
      const avatarR = 26;
      const count = this.players.filter(p => p.alive).length;
      const startX = this.W / 2 - (count * 70) / 2 + 35;
      let idx = 0;
      for (const p of this.players) {
        if (!p.alive || p.user_id === this.app.user?.id) { if (p.alive) idx++; continue; }
        const ax = startX + idx * 70;
        const ay = this.H * 0.55;
        if (hitCircle(x, y, ax, ay, avatarR)) {
          this.ws?.send(JSON.stringify({ type: 'blame', data: { target: p.user_id } }));
          this.choosing = false;
          return;
        }
        idx++;
      }
      return;
    }

    // 选择题选项
    for (const btn of this.optBtns) {
      if (hitTest(x, y, btn.x, btn.y, btn.w, btn.h)) {
        this.ws?.send(JSON.stringify({ type: 'answer', data: btn.text }));
        return;
      }
    }

    // 填空题确定按钮
    if (this.question && (!this.question.options || this.question.options.length === 0)) {
      if (hitTest(x, y, this.btnConfirm.x, this.btnConfirm.y, this.btnConfirm.w, this.btnConfirm.h)) {
        if (this.inputAnswer.trim()) {
          this.ws?.send(JSON.stringify({ type: 'answer', data: this.inputAnswer.trim() }));
        } else {
          this.openInput();
        }
        return;
      }
      // 点击输入框
      const iw = this.W * 0.6, ih = 40;
      const ix = this.W / 2 - iw / 2, iy = this.H * 0.62;
      if (hitTest(x, y, ix, iy, iw, ih)) {
        this.openInput();
        return;
      }
    }
  }

  openInput() {
    const isWx = typeof wx !== 'undefined';
    if (isWx) {
      wx.showKeyboard({ defaultValue: this.inputAnswer, maxLength: 10, confirmType: 'done' });
      wx.onKeyboardInput((r) => { this.inputAnswer = r.value; });
      wx.onKeyboardComplete((r) => {
        this.inputAnswer = r.value;
        if (this.inputAnswer.trim()) {
          this.ws?.send(JSON.stringify({ type: 'answer', data: this.inputAnswer.trim() }));
        }
      });
    } else {
      const ans = prompt('输入答案：', this.inputAnswer);
      if (ans !== null) {
        this.inputAnswer = ans;
        if (ans.trim()) this.ws?.send(JSON.stringify({ type: 'answer', data: ans.trim() }));
      }
    }
  }

  update(dt) {
    if (this.resultTimer > 0) this.resultTimer -= dt;
    if (this.explodeAnim) { this.explodeAnim.t += dt; if (this.explodeAnim.t > 1500) this.explodeAnim = null; }
    if (this.blameAnim) { this.blameAnim.t += dt; if (this.blameAnim.t > 800) this.blameAnim = null; }
  }

  render(ctx, W, H) {
    const cx = W / 2;

    // ===== 顶部玩家区域 =====
    const avatarR = 26;
    const gap = Math.min(70, (W - 40) / Math.max(this.players.length, 1));
    const startX = cx - (this.players.length * gap) / 2 + gap / 2;
    const avatarY = 50;

    this.players.forEach((p, i) => {
      const ax = startX + i * gap;
      const hasPot = this.pots.some(pot => pot.owner_id === p.user_id);
      drawAvatar(ctx, ax, avatarY, avatarR, p.nickname, p.alive, hasPot);
      // 锅
      if (hasPot) {
        const pot = this.pots.find(pot => pot.owner_id === p.user_id);
        if (pot) drawPot(ctx, ax, avatarY - avatarR - 22, 18, pot.countdown, pot.max_time);
      }
    });

    // ===== 题目区域 =====
    if (this.choosing) {
      // 甩锅选择
      roundRect(ctx, cx - 120, H * 0.3, 240, 50, 12);
      ctx.fillStyle = T.DANGER; ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🍳 甩给谁？', cx, H * 0.3 + 25);

      // 可选目标
      const alive = this.players.filter(p => p.alive && p.user_id !== this.app.user?.id);
      const tStartX = cx - (alive.length * 70) / 2 + 35;
      alive.forEach((p, i) => {
        drawAvatar(ctx, tStartX + i * 70, H * 0.55, avatarR, p.nickname, true, false);
      });

      ctx.fillStyle = T.TEXT_LIGHT; ctx.font = '14px sans-serif';
      ctx.fillText('点击头像甩锅', cx, H * 0.7);
    } else if (this.question) {
      // 题目卡片
      const cardY = H * 0.28, cardH = H * 0.25;
      roundRect(ctx, 20, cardY, W - 40, cardH, 14);
      ctx.fillStyle = T.CARD_BG; ctx.fill();
      ctx.strokeStyle = T.BORDER; ctx.lineWidth = 1.5; ctx.stroke();

      // 题目类型标签
      const typeMap = { riddle: '脑筋急转弯', common: '常识判断', homophone: '歇后语' };
      ctx.fillStyle = T.ACCENT; ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(typeMap[this.question.type] || this.question.type, 35, cardY + 22);

      // 题目文字
      ctx.fillStyle = T.TEXT; ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      const lines = this.wrapText(ctx, this.question.content, W - 80);
      lines.forEach((line, i) => {
        ctx.fillText(line, cx, cardY + 50 + i * 28);
      });

      // 选项或输入框
      if (this.optBtns.length > 0) {
        this.optBtns.forEach(btn => {
          drawButton(ctx, btn.text, btn.x, btn.y, btn.w, btn.h, T.ACCENT);
        });
      } else {
        // 填空输入框
        const iw = W * 0.6, ih = 40;
        const ix = cx - iw / 2, iy = H * 0.62;
        roundRect(ctx, ix, iy, iw, ih, 8);
        ctx.fillStyle = '#fff'; ctx.fill();
        ctx.strokeStyle = T.BORDER; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = this.inputAnswer ? T.TEXT : T.TEXT_LIGHT;
        ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(this.inputAnswer || '点击输入答案', cx, iy + ih / 2);

        drawButton(ctx, '确定', this.btnConfirm.x, this.btnConfirm.y, this.btnConfirm.w, this.btnConfirm.h, T.SUCCESS);
      }
    } else {
      ctx.fillStyle = T.TEXT_LIGHT; ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('等待出题...', cx, H / 2);
    }

    // ===== 爆炸特效 =====
    if (this.explodeAnim) {
      const t = this.explodeAnim.t / 1500;
      ctx.fillStyle = `rgba(255, 23, 68, ${0.4 * (1 - t)})`;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = T.EXPLODE; ctx.font = `bold ${60 + t * 40}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.globalAlpha = 1 - t;
      ctx.fillText('💥 BOOM!', cx, H * 0.4);
      ctx.globalAlpha = 1;
    }

    // ===== 甩锅动画 =====
    if (this.blameAnim) {
      const t = Math.min(this.blameAnim.t / 800, 1);
      ctx.font = `${30 + t * 20}px sans-serif`;
      ctx.textAlign = 'center'; ctx.globalAlpha = 1 - t * 0.5;
      ctx.fillText('🍳', cx + Math.sin(t * Math.PI * 4) * 30, H * 0.25 - t * 50);
      ctx.globalAlpha = 1;
    }

    // ===== 结果 toast =====
    if (this.resultTimer > 0) {
      roundRect(ctx, cx - 120, H * 0.2, 240, 40, 10);
      ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(this.resultMsg, cx, H * 0.2 + 20);
    }
  }

  wrapText(ctx, text, maxW) {
    const lines = [];
    let line = '';
    for (const ch of text) {
      if (ctx.measureText(line + ch).width > maxW) {
        lines.push(line);
        line = ch;
      } else {
        line += ch;
      }
    }
    if (line) lines.push(line);
    return lines;
  }
}
