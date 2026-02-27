// 职业选择场景

import { CONFIG } from '../config.js';
import { roundRect, drawButton, hitTest } from '../ui/common.js';
import * as api from '../api.js';

const T = CONFIG.THEME;

const CLASSES = [
  { id: 'warrior', name: '🗡️ 战士', desc: '近战肉盾，高血高防', color: '#C62828' },
  { id: 'archer',  name: '🏹 弓手', desc: '远程输出，高攻速', color: '#2E7D32' },
  { id: 'mage',    name: '🔮 法师', desc: '魔法 AOE，控制', color: '#1565C0' },
];

export class SelectClassScene {
  constructor(app, W, H) {
    this.app = app;
    this.W = W; this.H = H;
    this.selected = null;
    this.confirming = false;

    // 三个职业卡片
    const cardW = Math.min(W * 0.28, 120);
    const gap = 15;
    const totalW = cardW * 3 + gap * 2;
    const startX = (W - totalW) / 2;
    this.cards = CLASSES.map((c, i) => ({
      ...c, x: startX + i * (cardW + gap), y: H * 0.3, w: cardW, h: cardW * 1.4,
    }));

    this.btnConfirm = { x: W / 2 - 80, y: H * 0.82, w: 160, h: 46 };
    app.input.onTap((x, y) => this.onTap(x, y));
  }

  onTap(x, y) {
    // 选择职业卡片
    for (const card of this.cards) {
      if (hitTest(x, y, card.x, card.y, card.w, card.h)) {
        this.selected = card.id;
        return;
      }
    }
    // 确认按钮
    if (this.selected && hitTest(x, y, this.btnConfirm.x, this.btnConfirm.y, this.btnConfirm.w, this.btnConfirm.h)) {
      this.confirmClass();
    }
  }

  async confirmClass() {
    if (this.confirming) return;
    this.confirming = true;
    try {
      await api.selectClass(this.selected);
      this.app.user.class = this.selected;
      this.app.enterWorld();
    } catch (_e) {
      this.confirming = false;
    }
  }

  update(_dt) {}

  render(ctx, W, H) {
    const cx = W / 2;
    ctx.fillStyle = '#1a2a3a';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = T.GOLD; ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('选择你的职业', cx, H * 0.15);

    ctx.fillStyle = '#aaa'; ctx.font = '14px sans-serif';
    ctx.fillText('每个角色只能选择一次', cx, H * 0.22);

    // 职业卡片
    for (const card of this.cards) {
      const sel = this.selected === card.id;
      // 卡片背景
      roundRect(ctx, card.x, card.y, card.w, card.h, 14);
      ctx.fillStyle = sel ? card.color : '#333'; ctx.fill();
      ctx.strokeStyle = sel ? T.GOLD : '#555'; ctx.lineWidth = sel ? 3 : 1; ctx.stroke();

      // 图标
      ctx.font = `${card.w * 0.4}px sans-serif`;
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
      ctx.fillText(card.name.split(' ')[0], card.x + card.w / 2, card.y + card.h * 0.3);

      // 名称
      ctx.font = `bold ${card.w * 0.15}px sans-serif`;
      ctx.fillText(card.name.split(' ')[1], card.x + card.w / 2, card.y + card.h * 0.55);

      // 描述
      ctx.font = `${card.w * 0.1}px sans-serif`;
      ctx.fillStyle = '#ccc';
      ctx.fillText(card.desc, card.x + card.w / 2, card.y + card.h * 0.72);

      if (sel) {
        ctx.fillStyle = T.GOLD; ctx.font = 'bold 14px sans-serif';
        ctx.fillText('✓ 已选择', card.x + card.w / 2, card.y + card.h * 0.88);
      }
    }

    // 确认按钮
    if (this.selected) {
      drawButton(ctx, this.confirming ? '创建中...' : '开始冒险',
        this.btnConfirm.x, this.btnConfirm.y, this.btnConfirm.w, this.btnConfirm.h, T.ACCENT);
    }
  }
}
