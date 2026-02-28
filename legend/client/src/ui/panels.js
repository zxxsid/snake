// 游戏内 UI 面板（背包/装备/强化/商店/技能）
// 以半透明弹窗覆盖在主世界上

import { CONFIG } from '../config.js';
import { roundRect, drawBar, hitTest } from './common.js';

const T = CONFIG.THEME;

// 品质颜色
const QUALITY_COLOR = {
  white: '#BDBDBD', green: '#4CAF50', blue: '#2196F3',
  purple: '#9C27B0', orange: '#FF9800', red: '#F44336',
};
const QUALITY_NAME = {
  white: '普通', green: '优秀', blue: '精良',
  purple: '史诗', orange: '传说', red: '神话',
};

// ==================== 背包面板 ====================
export class InventoryPanel {
  constructor(W, H, inventory, items, equipment) {
    this.W = W; this.H = H;
    this.visible = false;
    this.inventory = inventory || [];  // 背包物品列表
    this.items = items || {};          // 物品模板 map<id, template>
    this.equipment = equipment || [];  // 已装备列表
    this.selectedSlot = -1;

    // 面板布局
    const pw = Math.min(W * 0.85, 360);
    const ph = H * 0.75;
    this.panel = { x: (W - pw) / 2, y: (H - ph) / 2, w: pw, h: ph };
    this.closeBtn = { x: this.panel.x + pw - 32, y: this.panel.y + 8, w: 24, h: 24 };

    // 格子
    this.gridCols = 5;
    this.gridSize = Math.floor((pw - 40) / this.gridCols);
    this.gridGap = 4;
  }

  toggle() { this.visible = !this.visible; this.selectedSlot = -1; }

  onTap(x, y) {
    if (!this.visible) return false;
    // 关闭
    if (hitTest(x, y, this.closeBtn.x, this.closeBtn.y, this.closeBtn.w, this.closeBtn.h)) {
      this.visible = false; return true;
    }
    // 格子点击
    const p = this.panel;
    const startX = p.x + 16, startY = p.y + 60;
    for (let i = 0; i < 30; i++) {
      const col = i % this.gridCols, row = Math.floor(i / this.gridCols);
      const gx = startX + col * (this.gridSize + this.gridGap);
      const gy = startY + row * (this.gridSize + this.gridGap);
      if (hitTest(x, y, gx, gy, this.gridSize, this.gridSize)) {
        this.selectedSlot = i;
        return true;
      }
    }
    // 点击面板内部消费事件
    if (hitTest(x, y, p.x, p.y, p.w, p.h)) return true;
    // 点击外部关闭
    this.visible = false;
    return true;
  }

  render(ctx) {
    if (!this.visible) return;
    const p = this.panel;

    // 遮罩
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, this.W, this.H);

    // 面板
    roundRect(ctx, p.x, p.y, p.w, p.h, 16);
    ctx.fillStyle = 'rgba(40,25,10,0.95)'; ctx.fill();
    ctx.strokeStyle = '#8D6E63'; ctx.lineWidth = 2; ctx.stroke();

    // 标题
    ctx.fillStyle = T.GOLD; ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🎒 背包', p.x + p.w / 2, p.y + 28);

    // 关闭按钮
    ctx.fillStyle = '#F44336'; ctx.font = 'bold 16px sans-serif';
    ctx.fillText('✕', this.closeBtn.x + 12, this.closeBtn.y + 12);

    // 格子
    const startX = p.x + 16, startY = p.y + 60;
    for (let i = 0; i < 30; i++) {
      const col = i % this.gridCols, row = Math.floor(i / this.gridCols);
      const gx = startX + col * (this.gridSize + this.gridGap);
      const gy = startY + row * (this.gridSize + this.gridGap);
      const sel = i === this.selectedSlot;

      // 格子背景
      roundRect(ctx, gx, gy, this.gridSize, this.gridSize, 6);
      ctx.fillStyle = sel ? 'rgba(255,200,0,0.3)' : 'rgba(255,255,255,0.08)'; ctx.fill();
      ctx.strokeStyle = sel ? T.GOLD : 'rgba(255,255,255,0.15)'; ctx.lineWidth = sel ? 2 : 1; ctx.stroke();

      // 物品
      const inv = this.inventory[i];
      if (inv) {
        const tmpl = this.items[inv.item_id || inv.itemId];
        if (tmpl) {
          // 品质色条
          ctx.fillStyle = QUALITY_COLOR[tmpl.quality] || '#888';
          ctx.fillRect(gx + 2, gy + this.gridSize - 4, this.gridSize - 4, 3);
          // 图标文字
          ctx.fillStyle = '#fff'; ctx.font = `${this.gridSize * 0.35}px sans-serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText((tmpl.name || '?').slice(0, 2), gx + this.gridSize / 2, gy + this.gridSize / 2 - 4);
          // 数量
          if (inv.count > 1) {
            ctx.fillStyle = '#ccc'; ctx.font = '10px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(`x${inv.count}`, gx + this.gridSize - 3, gy + this.gridSize - 6);
          }
          // 强化等级
          if (inv.enhance_level > 0) {
            ctx.fillStyle = T.GOLD; ctx.font = 'bold 9px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`+${inv.enhance_level}`, gx + 3, gy + 11);
          }
        }
      }
    }

    // 选中物品详情
    if (this.selectedSlot >= 0 && this.inventory[this.selectedSlot]) {
      const inv = this.inventory[this.selectedSlot];
      const tmpl = this.items[inv.item_id || inv.itemId];
      if (tmpl) {
        const dy = startY + 6 * (this.gridSize + this.gridGap) + 10;
        ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'left';
        const qc = QUALITY_COLOR[tmpl.quality] || '#fff';
        ctx.fillStyle = qc;
        ctx.fillText(`${tmpl.name} ${inv.enhance_level > 0 ? '+' + inv.enhance_level : ''}`, p.x + 20, dy);
        ctx.fillStyle = '#aaa'; ctx.font = '11px sans-serif';
        ctx.fillText(`${QUALITY_NAME[tmpl.quality] || ''} | ${tmpl.description || tmpl.type}`, p.x + 20, dy + 18);
        if (tmpl.base_attack) ctx.fillText(`攻击 +${tmpl.base_attack}`, p.x + 20, dy + 34);
        if (tmpl.base_defense) ctx.fillText(`防御 +${tmpl.base_defense}`, p.x + 160, dy + 34);
        if (tmpl.base_hp) ctx.fillText(`HP +${tmpl.base_hp}`, p.x + 20, dy + 48);
      }
    }

    ctx.textBaseline = 'alphabetic';
  }
}

// ==================== 装备面板 ====================
export class EquipPanel {
  constructor(W, H, equipment, items, player) {
    this.W = W; this.H = H;
    this.visible = false;
    this.equipment = equipment || [];
    this.items = items || {};
    this.player = player;

    const pw = Math.min(W * 0.8, 320);
    const ph = H * 0.7;
    this.panel = { x: (W - pw) / 2, y: (H - ph) / 2, w: pw, h: ph };
    this.closeBtn = { x: this.panel.x + pw - 32, y: this.panel.y + 8, w: 24, h: 24 };

    // 6个装备槽
    this.slots = ['weapon', 'shield', 'helmet', 'armor', 'boots', 'ring'];
    this.slotNames = { weapon: '⚔武器', shield: '🛡副手', helmet: '👑头盔', armor: '👕铠甲', boots: '👢鞋子', ring: '💍戒指' };
  }

  toggle() { this.visible = !this.visible; }

  onTap(x, y) {
    if (!this.visible) return false;
    if (hitTest(x, y, this.closeBtn.x, this.closeBtn.y, this.closeBtn.w, this.closeBtn.h)) {
      this.visible = false; return true;
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
    ctx.fillText('⚔ 装备', p.x + p.w / 2, p.y + 28);
    ctx.fillStyle = '#F44336'; ctx.font = 'bold 16px sans-serif';
    ctx.fillText('✕', this.closeBtn.x + 12, this.closeBtn.y + 12);

    // 角色属性
    const pl = this.player;
    ctx.fillStyle = '#ccc'; ctx.font = '12px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`Lv.${pl.level} ${pl.nickname}`, p.x + 20, p.y + 55);
    ctx.fillText(`⚔ ${pl.attack}  🛡 ${pl.defense}  ❤ ${pl.maxHp}  💧 ${pl.maxMp}`, p.x + 20, p.y + 72);

    // 装备槽
    const slotSize = 50;
    const startY = p.y + 90;
    this.slots.forEach((slot, i) => {
      const sy = startY + i * (slotSize + 8);
      // 槽框
      roundRect(ctx, p.x + 20, sy, slotSize, slotSize, 8);
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1; ctx.stroke();

      // 槽名
      ctx.fillStyle = '#888'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(this.slotNames[slot], p.x + 20 + slotSize / 2, sy + slotSize / 2);

      // 已装备
      const eq = this.equipment.find(e => e.slot === slot);
      if (eq) {
        const tmpl = this.items[eq.item_id || eq.itemId];
        if (tmpl) {
          ctx.fillStyle = QUALITY_COLOR[tmpl.quality] || '#fff';
          ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'left';
          ctx.fillText(`${tmpl.name}${eq.enhance_level > 0 ? ' +' + eq.enhance_level : ''}`, p.x + 80, sy + 20);
          ctx.fillStyle = '#aaa'; ctx.font = '11px sans-serif';
          let stat = '';
          if (tmpl.base_attack) stat += `攻+${tmpl.base_attack} `;
          if (tmpl.base_defense) stat += `防+${tmpl.base_defense} `;
          if (tmpl.base_hp) stat += `HP+${tmpl.base_hp}`;
          ctx.fillText(stat, p.x + 80, sy + 38);
        }
      }
    });

    ctx.textBaseline = 'alphabetic';
  }
}

// ==================== 商店面板 ====================
export class ShopPanel {
  constructor(W, H, shopItems, playerGold) {
    this.W = W; this.H = H;
    this.visible = false;
    this.shopItems = shopItems || [];
    this.playerGold = playerGold;
    this.msg = '';
    this.msgTimer = 0;

    const pw = Math.min(W * 0.85, 340);
    const ph = H * 0.7;
    this.panel = { x: (W - pw) / 2, y: (H - ph) / 2, w: pw, h: ph };
    this.closeBtn = { x: this.panel.x + pw - 32, y: this.panel.y + 8, w: 24, h: 24 };
  }

  toggle() { this.visible = !this.visible; }

  onTap(x, y, buyCallback) {
    if (!this.visible) return false;
    if (hitTest(x, y, this.closeBtn.x, this.closeBtn.y, this.closeBtn.w, this.closeBtn.h)) {
      this.visible = false; return true;
    }
    // 购买按钮
    const p = this.panel;
    const startY = p.y + 55;
    for (let i = 0; i < this.shopItems.length; i++) {
      const iy = startY + i * 48;
      const buyX = p.x + p.w - 72, buyY = iy + 6;
      if (hitTest(x, y, buyX, buyY, 52, 28)) {
        if (buyCallback) buyCallback(this.shopItems[i]);
        return true;
      }
    }
    if (hitTest(x, y, p.x, p.y, p.w, p.h)) return true;
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
    ctx.fillText('🏪 商店', p.x + p.w / 2, p.y + 28);
    ctx.fillStyle = '#F44336'; ctx.font = 'bold 16px sans-serif';
    ctx.fillText('✕', this.closeBtn.x + 12, this.closeBtn.y + 12);

    const startY = p.y + 55;
    this.shopItems.forEach((item, i) => {
      const iy = startY + i * 48;
      // 分隔线
      if (i > 0) {
        ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(p.x + 16, iy); ctx.lineTo(p.x + p.w - 16, iy); ctx.stroke();
      }
      // 物品名
      ctx.fillStyle = QUALITY_COLOR[item.quality] || '#fff';
      ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(item.name, p.x + 20, iy + 22);
      // 描述
      ctx.fillStyle = '#aaa'; ctx.font = '10px sans-serif';
      ctx.fillText(item.description || '', p.x + 20, iy + 38);
      // 购买按钮
      const buyX = p.x + p.w - 72, buyY = iy + 6;
      roundRect(ctx, buyX, buyY, 52, 28, 6);
      ctx.fillStyle = T.GOLD; ctx.fill();
      ctx.fillStyle = '#3E2723'; ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`💰${item.buy_price}`, buyX + 26, buyY + 15);
    });

    // 提示消息
    if (this.msgTimer > 0) {
      ctx.fillStyle = '#4CAF50'; ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.msg, p.x + p.w / 2, p.y + p.h - 20);
    }

    ctx.textBaseline = 'alphabetic';
  }
}

// ==================== 技能面板 ====================
export class SkillPanel {
  constructor(W, H, skills, playerLevel) {
    this.W = W; this.H = H;
    this.visible = false;
    this.skills = skills || [];
    this.playerLevel = playerLevel;

    const pw = Math.min(W * 0.85, 340);
    const ph = H * 0.7;
    this.panel = { x: (W - pw) / 2, y: (H - ph) / 2, w: pw, h: ph };
    this.closeBtn = { x: this.panel.x + pw - 32, y: this.panel.y + 8, w: 24, h: 24 };
  }

  toggle() { this.visible = !this.visible; }

  onTap(x, y) {
    if (!this.visible) return false;
    if (hitTest(x, y, this.closeBtn.x, this.closeBtn.y, this.closeBtn.w, this.closeBtn.h)) {
      this.visible = false; return true;
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
    ctx.fillText('📖 技能', p.x + p.w / 2, p.y + 28);
    ctx.fillStyle = '#F44336'; ctx.font = 'bold 16px sans-serif';
    ctx.fillText('✕', this.closeBtn.x + 12, this.closeBtn.y + 12);

    const startY = p.y + 55;
    this.skills.forEach((skill, i) => {
      const iy = startY + i * 60;
      const locked = this.playerLevel < skill.level_req;

      // 图标圆
      ctx.fillStyle = locked ? '#555' : '#FF8F00';
      ctx.beginPath(); ctx.arc(p.x + 40, iy + 25, 20, 0, Math.PI * 2); ctx.fill();
      if (!locked) { ctx.strokeStyle = T.GOLD; ctx.lineWidth = 2; ctx.stroke(); }
      ctx.fillStyle = locked ? '#888' : '#fff'; ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(skill.name.slice(0, 2), p.x + 40, iy + 27);

      // 名称 + 描述
      ctx.fillStyle = locked ? '#666' : '#fff'; ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(skill.name + (locked ? ' 🔒' : ''), p.x + 70, iy + 18);
      ctx.fillStyle = '#aaa'; ctx.font = '11px sans-serif';
      ctx.fillText(skill.description || '', p.x + 70, iy + 34);
      // 数值
      ctx.fillStyle = '#888'; ctx.font = '10px sans-serif';
      let info = `Lv.${skill.level_req}解锁`;
      if (skill.cooldown > 0) info += ` | CD ${skill.cooldown}s`;
      if (skill.mana_cost > 0) info += ` | MP ${skill.mana_cost}`;
      ctx.fillText(info, p.x + 70, iy + 48);
    });

    ctx.textBaseline = 'alphabetic';
  }
}
