// 世界聊天面板

import { CONFIG } from '../config.js';
import { roundRect, hitTest } from './common.js';

const T = CONFIG.THEME;

export class ChatPanel {
  constructor(W, H) {
    this.W = W; this.H = H;
    this.visible = false;
    this.messages = [];
    this.inputText = '';

    const pw = Math.min(W * 0.9, 380);
    const ph = H * 0.55;
    this.panel = { x: (W - pw) / 2, y: H - ph - 10, w: pw, h: ph };
    this.closeBtn = { x: this.panel.x + pw - 32, y: this.panel.y + 6, w: 24, h: 24 };
    this.sendBtn = { x: this.panel.x + pw - 55, y: this.panel.y + ph - 38, w: 45, h: 30 };
    this.inputBox = { x: this.panel.x + 10, y: this.panel.y + ph - 38, w: pw - 75, h: 30 };
  }

  toggle() { this.visible = !this.visible; }

  // 添加消息
  addMsg(sender, content) {
    this.messages.push({ sender, content, time: Date.now() });
    if (this.messages.length > 50) this.messages.shift();
  }

  onTap(x, y, sendCallback) {
    if (!this.visible) return false;
    if (hitTest(x, y, this.closeBtn.x, this.closeBtn.y, this.closeBtn.w, this.closeBtn.h)) {
      this.visible = false; return true;
    }
    // 发送按钮
    if (hitTest(x, y, this.sendBtn.x, this.sendBtn.y, this.sendBtn.w, this.sendBtn.h)) {
      if (this.inputText.trim() && sendCallback) {
        sendCallback(this.inputText.trim());
        this.addMsg('我', this.inputText.trim());
        this.inputText = '';
      }
      return true;
    }
    // 输入框
    if (hitTest(x, y, this.inputBox.x, this.inputBox.y, this.inputBox.w, this.inputBox.h)) {
      this.openInput();
      return true;
    }
    if (hitTest(x, y, this.panel.x, this.panel.y, this.panel.w, this.panel.h)) return true;
    this.visible = false; return true;
  }

  openInput() {
    const isWx = typeof wx !== 'undefined';
    if (isWx) {
      wx.showKeyboard({ defaultValue: this.inputText, maxLength: 50, confirmType: 'send' });
      wx.onKeyboardInput((r) => { this.inputText = r.value; });
      wx.onKeyboardComplete((r) => { this.inputText = r.value; });
    } else {
      const v = prompt('发送消息：', this.inputText);
      if (v !== null) this.inputText = v;
    }
  }

  render(ctx) {
    if (!this.visible) return;
    const p = this.panel;

    roundRect(ctx, p.x, p.y, p.w, p.h, 12);
    ctx.fillStyle = 'rgba(20,15,5,0.92)'; ctx.fill();
    ctx.strokeStyle = '#5D4037'; ctx.lineWidth = 1.5; ctx.stroke();

    // 标题
    ctx.fillStyle = T.GOLD; ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('💬 世界聊天', p.x + p.w / 2, p.y + 18);
    ctx.fillStyle = '#F44336'; ctx.font = 'bold 14px sans-serif';
    ctx.fillText('✕', this.closeBtn.x + 12, this.closeBtn.y + 12);

    // 消息列表
    const msgY = p.y + 36;
    const msgH = p.h - 80;
    ctx.save();
    ctx.beginPath(); ctx.rect(p.x + 8, msgY, p.w - 16, msgH); ctx.clip();

    const visibleMsgs = this.messages.slice(-12);
    visibleMsgs.forEach((msg, i) => {
      const y = msgY + 6 + i * 18;
      ctx.fillStyle = '#FFD54F'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(msg.sender + ':', p.x + 14, y + 8);
      ctx.fillStyle = '#ddd'; ctx.font = '11px sans-serif';
      ctx.fillText(msg.content, p.x + 14 + ctx.measureText(msg.sender + ': ').width, y + 8);
    });
    ctx.restore();

    // 输入框
    roundRect(ctx, this.inputBox.x, this.inputBox.y, this.inputBox.w, this.inputBox.h, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = this.inputText ? '#fff' : '#777'; ctx.font = '12px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(this.inputText || '点击输入...', this.inputBox.x + 8, this.inputBox.y + 18);

    // 发送按钮
    roundRect(ctx, this.sendBtn.x, this.sendBtn.y, this.sendBtn.w, this.sendBtn.h, 6);
    ctx.fillStyle = T.ACCENT; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('发送', this.sendBtn.x + this.sendBtn.w / 2, this.sendBtn.y + this.sendBtn.h / 2);

    ctx.textBaseline = 'alphabetic';
  }
}

// ==================== 竞技场面板 ====================
export class ArenaPanel {
  constructor(W, H, player) {
    this.W = W; this.H = H;
    this.visible = false;
    this.player = player;
    this.matching = false;
    this.matchMsg = '';
    this.dailyCount = 0;
    this.maxDaily = 5;

    const pw = Math.min(W * 0.85, 340);
    const ph = H * 0.6;
    this.panel = { x: (W - pw) / 2, y: (H - ph) / 2, w: pw, h: ph };
    this.closeBtn = { x: this.panel.x + pw - 32, y: this.panel.y + 8, w: 24, h: 24 };
    this.matchBtn = { x: (W - 140) / 2, y: this.panel.y + ph - 70, w: 140, h: 44 };
  }

  toggle() { this.visible = !this.visible; }

  onTap(x, y) {
    if (!this.visible) return false;
    if (hitTest(x, y, this.closeBtn.x, this.closeBtn.y, this.closeBtn.w, this.closeBtn.h)) {
      this.visible = false; return true;
    }
    if (hitTest(x, y, this.matchBtn.x, this.matchBtn.y, this.matchBtn.w, this.matchBtn.h)) {
      if (this.dailyCount < this.maxDaily) {
        this.matching = true;
        this.matchMsg = '匹配中...';
        // 模拟匹配
        setTimeout(() => {
          this.matching = false;
          this.matchMsg = '暂无对手，请稍后再试';
        }, 2000);
      } else {
        this.matchMsg = '今日次数已用完（看广告+1次）';
      }
      return true;
    }
    if (hitTest(x, y, this.panel.x, this.panel.y, this.panel.w, this.panel.h)) return true;
    this.visible = false; return true;
  }

  render(ctx) {
    if (!this.visible) return;
    const p = this.panel;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, this.W, this.H);

    roundRect(ctx, p.x, p.y, p.w, p.h, 16);
    ctx.fillStyle = 'rgba(40,25,10,0.95)'; ctx.fill();
    ctx.strokeStyle = '#8D6E63'; ctx.lineWidth = 2; ctx.stroke();

    ctx.fillStyle = T.GOLD; ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('⚔ 竞技场', p.x + p.w / 2, p.y + 28);
    ctx.fillStyle = '#F44336'; ctx.font = 'bold 16px sans-serif';
    ctx.fillText('✕', this.closeBtn.x + 12, this.closeBtn.y + 12);

    // 玩家信息
    ctx.fillStyle = '#ccc'; ctx.font = '13px sans-serif';
    ctx.fillText(`Lv.${this.player.level} ${this.player.nickname}`, p.x + p.w / 2, p.y + 65);
    ctx.fillText(`⚔ ${this.player.attack}  🛡 ${this.player.defense}  ❤ ${this.player.maxHp}`, p.x + p.w / 2, p.y + 85);

    // 段位
    ctx.fillStyle = T.GOLD; ctx.font = 'bold 22px sans-serif';
    ctx.fillText('🥉 青铜', p.x + p.w / 2, p.y + 120);
    ctx.fillStyle = '#aaa'; ctx.font = '12px sans-serif';
    ctx.fillText(`积分 1000  |  今日 ${this.dailyCount}/${this.maxDaily}`, p.x + p.w / 2, p.y + 145);

    // 匹配按钮
    roundRect(ctx, this.matchBtn.x, this.matchBtn.y, this.matchBtn.w, this.matchBtn.h, this.matchBtn.h / 2);
    ctx.fillStyle = this.matching ? '#555' : '#C62828'; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 16px sans-serif';
    ctx.fillText(this.matching ? '匹配中...' : '⚔ 开始匹配', this.matchBtn.x + this.matchBtn.w / 2, this.matchBtn.y + this.matchBtn.h / 2);

    // 提示
    if (this.matchMsg) {
      ctx.fillStyle = '#FF9800'; ctx.font = '12px sans-serif';
      ctx.fillText(this.matchMsg, p.x + p.w / 2, p.y + p.h - 25);
    }

    ctx.textBaseline = 'alphabetic';
  }
}

// ==================== 广告/分享/充值面板 ====================
export class RewardPanel {
  constructor(W, H) {
    this.W = W; this.H = H;
    this.visible = false;
    this.msg = '';
    this.msgTimer = 0;

    const pw = Math.min(W * 0.9, 360);
    const ph = H * 0.75;
    this.panel = { x: (W - pw) / 2, y: (H - ph) / 2, w: pw, h: ph };
    this.closeBtn = { x: this.panel.x + pw - 32, y: this.panel.y + 8, w: 24, h: 24 };

    // 按钮列表
    const bx = this.panel.x + 16, bw = pw - 32, bh = 40;
    let by = this.panel.y + 55;
    this.btns = [
      { id: 'ad_diamond', label: '📺 看广告得 5 钻石', sub: '每日 5 次', x: bx, y: by, w: bw, h: bh, color: '#FF8F00' },
      { id: 'ad_stamina', label: '📺 看广告恢复体力', sub: '每日 3 次', x: bx, y: by += 50, w: bw, h: bh, color: '#FF8F00' },
      { id: 'ad_exp', label: '📺 30分钟双倍经验', sub: '每日 2 次', x: bx, y: by += 50, w: bw, h: bh, color: '#FF8F00' },
      { id: 'share', label: '📤 分享得 10 钻石', sub: '每日 3 次', x: bx, y: by += 50, w: bw, h: bh, color: '#4CAF50' },
      { id: 'sign', label: '📅 每日签到', sub: '看广告奖励翻倍', x: bx, y: by += 50, w: bw, h: bh, color: '#2196F3' },
      { id: 'recharge', label: '💎 充值中心', sub: '1元起充', x: bx, y: by += 50, w: bw, h: bh, color: '#9C27B0' },
    ];
  }

  toggle() { this.visible = !this.visible; }

  onTap(x, y, callback) {
    if (!this.visible) return false;
    if (hitTest(x, y, this.closeBtn.x, this.closeBtn.y, this.closeBtn.w, this.closeBtn.h)) {
      this.visible = false; return true;
    }
    for (const btn of this.btns) {
      if (hitTest(x, y, btn.x, btn.y, btn.w, btn.h)) {
        if (callback) callback(btn.id);
        return true;
      }
    }
    if (hitTest(x, y, this.panel.x, this.panel.y, this.panel.w, this.panel.h)) return true;
    this.visible = false; return true;
  }

  update(dt) { if (this.msgTimer > 0) this.msgTimer -= dt; }

  render(ctx) {
    if (!this.visible) return;
    const p = this.panel;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, this.W, this.H);

    roundRect(ctx, p.x, p.y, p.w, p.h, 16);
    ctx.fillStyle = 'rgba(40,25,10,0.95)'; ctx.fill();
    ctx.strokeStyle = '#8D6E63'; ctx.lineWidth = 2; ctx.stroke();

    ctx.fillStyle = T.GOLD; ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🎁 福利中心', p.x + p.w / 2, p.y + 28);
    ctx.fillStyle = '#F44336'; ctx.font = 'bold 16px sans-serif';
    ctx.fillText('✕', this.closeBtn.x + 12, this.closeBtn.y + 12);

    // 按钮
    for (const btn of this.btns) {
      roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8);
      ctx.fillStyle = btn.color; ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(btn.label, btn.x + 14, btn.y + btn.h / 2 - 2);
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(btn.sub, btn.x + btn.w - 12, btn.y + btn.h / 2);
    }

    // 提示
    if (this.msgTimer > 0) {
      ctx.fillStyle = '#4CAF50'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(this.msg, p.x + p.w / 2, p.y + p.h - 18);
    }

    ctx.textBaseline = 'alphabetic';
  }
}
