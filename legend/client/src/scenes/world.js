// 主世界场景 - 地图渲染 + 角色移动 + HUD
// 这是游戏的核心场景，后续阶段会持续扩展

import { CONFIG } from '../config.js';
import { roundRect, drawBar, drawJoystick, drawButton, hitTest, FloatText } from '../ui/common.js';

const T = CONFIG.THEME;
const TILE = CONFIG.TILE_SIZE;

export class WorldScene {
  constructor(app, W, H, _params) {
    this.app = app;
    this.W = W; this.H = H;

    // 玩家状态（从 gameData 初始化）
    const u = app.gameData?.user || app.user;
    this.player = {
      x: u.pos_x || 400, y: u.pos_y || 300,
      speed: (u.speed || 3) * TILE,
      hp: u.hp, maxHp: u.max_hp, mp: u.mp, maxMp: u.max_mp,
      level: u.level, exp: u.exp, attack: u.attack, defense: u.defense,
      class: u.class, nickname: u.nickname,
    };

    // 当前地图
    this.mapData = (app.gameData?.maps || [])[0] || { width: 1200, height: 900, bg_color: '#7EC850', name: '新手村' };

    // 摄像机
    this.camX = 0; this.camY = 0;

    // 飘字效果列表
    this.floats = [];

    // 技能按钮
    const skills = app.gameData?.skills || [];
    this.skillBtns = skills.slice(0, 3).map((s, i) => ({
      skill: s,
      x: W - 70 - i * 60, y: H - 80,
      r: 24, cd: 0,
    }));

    // 普攻按钮
    this.atkBtn = { x: W - 70, y: H - 140, r: 28 };

    // 自动战斗开关
    this.autoFight = false;
    this.btnAuto = { x: W - 50, y: 60, w: 40, h: 24 };

    app.input.onTap((x, y) => this.onTap(x, y));
  }

  onTap(x, y) {
    // 自动战斗开关
    if (hitTest(x, y, this.btnAuto.x, this.btnAuto.y, this.btnAuto.w, this.btnAuto.h)) {
      this.autoFight = !this.autoFight;
      return;
    }

    // 普攻
    const ab = this.atkBtn;
    if ((x - ab.x) ** 2 + (y - ab.y) ** 2 <= (ab.r + 8) ** 2) {
      this.addFloat(this.player.x, this.player.y - 20, `-${this.player.attack}`, T.HP_BAR);
      return;
    }

    // 技能
    for (const btn of this.skillBtns) {
      if ((x - btn.x) ** 2 + (y - btn.y) ** 2 <= (btn.r + 8) ** 2 && btn.cd <= 0) {
        btn.cd = btn.skill.cooldown * 1000;
        this.addFloat(this.player.x, this.player.y - 30, btn.skill.name, '#FFD54F');
        return;
      }
    }
  }

  addFloat(x, y, text, color) {
    this.floats.push(new FloatText(x, y, text, color));
  }

  update(dt) {
    // 技能 CD
    for (const btn of this.skillBtns) {
      if (btn.cd > 0) btn.cd -= dt;
    }

    // 飘字
    this.floats.forEach(f => f.update(dt));
    this.floats = this.floats.filter(f => f.alive);

    // 移动
    const dir = this.app.input.getMoveDir();
    if (dir) {
      const spd = this.player.speed * dt / 1000;
      this.player.x += dir.x * spd;
      this.player.y += dir.y * spd;
      // 地图边界
      this.player.x = Math.max(16, Math.min(this.mapData.width - 16, this.player.x));
      this.player.y = Math.max(16, Math.min(this.mapData.height - 16, this.player.y));
    }

    // 摄像机平滑跟随
    const targetCamX = this.player.x - this.W / 2;
    const targetCamY = this.player.y - this.H / 2;
    this.camX += (targetCamX - this.camX) * CONFIG.CAMERA_SMOOTH;
    this.camY += (targetCamY - this.camY) * CONFIG.CAMERA_SMOOTH;
  }

  render(ctx, W, H) {
    // ===== 地图背景 =====
    ctx.fillStyle = this.mapData.bg_color || T.BG;
    ctx.fillRect(0, 0, W, H);

    // 网格（简化 tile 效果）
    const c0 = Math.floor(this.camX / TILE);
    const r0 = Math.floor(this.camY / TILE);
    const c1 = Math.ceil((this.camX + W) / TILE);
    const r1 = Math.ceil((this.camY + H) / TILE);

    for (let col = c0; col <= c1; col++) {
      for (let row = r0; row <= r1; row++) {
        const sx = col * TILE - this.camX;
        const sy = row * TILE - this.camY;
        // 棋盘格纹理
        if ((col + row) % 2 === 0) {
          ctx.fillStyle = 'rgba(0,0,0,0.04)';
          ctx.fillRect(sx, sy, TILE, TILE);
        }
      }
    }

    // 安全区标记
    const safeX = (this.mapData.safe_x || 600) - this.camX;
    const safeY = (this.mapData.safe_y || 450) - this.camY;
    const safeR = this.mapData.safe_r || 100;
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.beginPath(); ctx.arc(safeX, safeY, safeR, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    // NPC 标记（安全区中心）
    ctx.fillStyle = 'rgba(255,215,0,0.3)';
    ctx.beginPath(); ctx.arc(safeX, safeY, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFD54F'; ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center'; ctx.fillText('商店', safeX, safeY - 20);

    // ===== 玩家 =====
    const px = this.player.x - this.camX;
    const py = this.player.y - this.camY;

    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(px, py + 14, 12, 5, 0, 0, Math.PI * 2); ctx.fill();

    // 身体（Q 版卡通）
    const classColors = { warrior: '#C62828', archer: '#2E7D32', mage: '#1565C0' };
    ctx.fillStyle = classColors[this.player.class] || '#666';
    ctx.beginPath(); ctx.arc(px, py, 14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();

    // 脸
    ctx.fillStyle = '#FFE0B2';
    ctx.beginPath(); ctx.arc(px, py - 2, 9, 0, Math.PI * 2); ctx.fill();
    // 眼睛
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(px - 3, py - 4, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(px + 3, py - 4, 2, 0, Math.PI * 2); ctx.fill();

    // 昵称
    ctx.fillStyle = '#fff'; ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.player.nickname, px, py - 22);

    // HP 条（头上）
    drawBar(ctx, px - 16, py - 30, 32, 4, this.player.hp / this.player.maxHp, T.HP_BAR);

    // ===== 飘字 =====
    this.floats.forEach(f => f.render(ctx, this.camX, this.camY));

    // ===== HUD =====
    this.renderHUD(ctx, W, H);

    // ===== 摇杆 =====
    drawJoystick(ctx, this.app.input.joystick);

    // ===== 技能按钮 =====
    this.renderSkillBtns(ctx);
  }

  renderHUD(ctx, W, _H) {
    // 左上角：头像 + 等级 + HP/MP/EXP 条
    const p = this.player;

    // 头像框
    roundRect(ctx, 8, 8, 140, 60, 8);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill();

    // 头像圆
    ctx.fillStyle = '#555';
    ctx.beginPath(); ctx.arc(36, 38, 20, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFE0B2';
    ctx.beginPath(); ctx.arc(36, 36, 15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`Lv.${p.level}`, 36, 62);

    // 条
    drawBar(ctx, 62, 16, 78, 8, p.hp / p.maxHp, T.HP_BAR);
    ctx.fillStyle = '#fff'; ctx.font = '8px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`${p.hp}/${p.maxHp}`, 62, 14);

    drawBar(ctx, 62, 30, 78, 8, p.mp / p.maxMp, T.MP_BAR);
    ctx.fillText(`${p.mp}/${p.maxMp}`, 62, 28);

    drawBar(ctx, 62, 44, 78, 8, p.exp / (p.level * 100), T.EXP_BAR);
    ctx.fillText(`EXP ${p.exp}`, 62, 42);

    // 金币/钻石
    ctx.fillStyle = T.GOLD; ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`💰 ${this.app.user?.gold || 0}`, 62, 62);
    ctx.fillText(`💎 ${this.app.user?.diamond || 0}`, 112, 62);

    // 右上角：地图名 + 自动战斗
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    roundRect(ctx, W - 110, 8, 100, 24, 6); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`📍 ${this.mapData.name}`, W - 60, 22);

    // 自动战斗按钮
    const ab = this.btnAuto;
    roundRect(ctx, ab.x, ab.y, ab.w, ab.h, 4);
    ctx.fillStyle = this.autoFight ? T.ACCENT : '#555'; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '10px sans-serif';
    ctx.fillText(this.autoFight ? '自动' : '手动', ab.x + ab.w / 2, ab.y + ab.h / 2);
  }

  renderSkillBtns(ctx) {
    // 普攻按钮
    const ab = this.atkBtn;
    ctx.fillStyle = T.HP_BAR;
    ctx.beginPath(); ctx.arc(ab.x, ab.y, ab.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('攻击', ab.x, ab.y);

    // 技能按钮
    for (const btn of this.skillBtns) {
      const onCD = btn.cd > 0;
      ctx.fillStyle = onCD ? '#555' : '#FF8F00';
      ctx.beginPath(); ctx.arc(btn.x, btn.y, btn.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();

      ctx.fillStyle = '#fff'; ctx.font = '10px sans-serif';
      ctx.fillText(btn.skill.name.slice(0, 2), btn.x, btn.y - 2);

      if (onCD) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath(); ctx.arc(btn.x, btn.y, btn.r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif';
        ctx.fillText(Math.ceil(btn.cd / 1000) + 's', btn.x, btn.y + 2);
      }
    }
  }
}
