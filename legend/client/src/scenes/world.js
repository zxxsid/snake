// 主世界场景 - 地图/怪物/战斗/掉落/挂机
// P1: 地图渲染+角色移动+摇杆  P2: 怪物AI+战斗+掉落+挂机

import { CONFIG } from '../config.js';
import { roundRect, drawBar, drawJoystick, hitTest, FloatText } from '../ui/common.js';
import { InventoryPanel, EquipPanel, ShopPanel, SkillPanel } from '../ui/panels.js';
import { ChatPanel, ArenaPanel, RewardPanel } from '../ui/chat.js';
import { Monster, LootDrop, tileHash, dist } from '../game/entity.js';

const T = CONFIG.THEME;
const TILE = CONFIG.TILE_SIZE;

export class WorldScene {
  constructor(app, W, H, _params) {
    this.app = app;
    this.W = W; this.H = H;

    // 玩家状态
    const u = app.gameData?.user || app.user;
    this.player = {
      x: u.pos_x || 400, y: u.pos_y || 300,
      speed: (u.speed || 3) * TILE,
      hp: u.hp || 100, maxHp: u.max_hp || 100,
      mp: u.mp || 50, maxMp: u.max_mp || 50,
      level: u.level || 1, exp: u.exp || 0,
      attack: u.attack || 10, defense: u.defense || 5,
      critRate: u.crit_rate || 0.05,
      class: u.class || 'warrior', nickname: u.nickname || '冒险者',
      facing: 0,    // 朝向弧度
      atkCd: 0,     // 普攻冷却
      dead: false,
    };

    // 地图
    this.mapData = (app.gameData?.maps || [])[0] || {
      width: 1200, height: 900, bg_color: '#7EC850', name: '新手村',
      safe_x: 600, safe_y: 450, safe_r: 100,
    };

    // 怪物实例
    this.monsters = this.spawnMonsters();

    // 掉落物
    this.loots = [];

    // 摄像机
    this.camX = 0; this.camY = 0;

    // 飘字
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

    // 自动战斗
    this.autoFight = false;
    this.btnAuto = { x: W - 50, y: 60, w: 40, h: 24 };

    // 击杀统计
    this.killCount = 0;

    // 战斗特效
    this.effects = [];

    // UI 面板
    const itemMap = {};
    (app.gameData?.items || []).forEach(it => { itemMap[it.id] = it; });
    (app.gameData?.shop_items || []).forEach(it => { itemMap[it.id] = it; });
    this.itemMap = itemMap;
    this.invPanel = new InventoryPanel(W, H, app.gameData?.inventory || [], itemMap, app.gameData?.equipment || []);
    this.equipPanel = new EquipPanel(W, H, app.gameData?.equipment || [], itemMap, this.player);
    this.shopPanel = new ShopPanel(W, H, app.gameData?.shop_items || [], this.player);
    this.skillPanel = new SkillPanel(W, H, skills, this.player.level);

    this.chatPanel = new ChatPanel(W, H);
    this.arenaPanel = new ArenaPanel(W, H, this.player);
    this.rewardPanel = new RewardPanel(W, H);

    // 模拟系统消息
    this.chatPanel.addMsg('系统', '欢迎来到卡通传奇！');
    this.chatPanel.addMsg('系统', '击杀怪物获得经验和金币');

    // 底部菜单按钮
    this.menuBtns = [
      { id: 'bag',    label: '🎒', x: 10,  y: H - 50, w: 36, h: 36 },
      { id: 'equip',  label: '⚔',  x: 52,  y: H - 50, w: 36, h: 36 },
      { id: 'skill',  label: '📖', x: 94,  y: H - 50, w: 36, h: 36 },
      { id: 'shop',   label: '🏪', x: 136, y: H - 50, w: 36, h: 36 },
      { id: 'chat',   label: '💬', x: 178, y: H - 50, w: 36, h: 36 },
      { id: 'arena',  label: '🏟',  x: 220, y: H - 50, w: 36, h: 36 },
      { id: 'reward', label: '🎁', x: 262, y: H - 50, w: 36, h: 36 },
    ];

    app.input.onTap((x, y) => this.onTap(x, y));
  }

  // 根据模板生成怪物实例
  spawnMonsters() {
    const templates = this.app.gameData?.monsters || [];
    const monsters = [];
    for (const tmpl of templates) {
      // 每种怪物生成多只
      const count = tmpl.is_boss ? 1 : 4;
      for (let i = 0; i < count; i++) {
        const mx = 100 + Math.random() * (this.mapData.width - 200);
        const my = 100 + Math.random() * (this.mapData.height - 200);
        // 避开安全区
        if (dist(mx, my, this.mapData.safe_x, this.mapData.safe_y) < this.mapData.safe_r + 50) continue;
        monsters.push(new Monster(tmpl, mx, my));
      }
    }
    return monsters;
  }

  // --- 点击处理 ---
  onTap(x, y) {
    // 面板优先处理（最上层的最先处理）
    if (this.rewardPanel.onTap(x, y, (id) => this.handleReward(id))) return;
    if (this.arenaPanel.onTap(x, y)) return;
    if (this.chatPanel.onTap(x, y, (_msg) => {})) return;
    if (this.invPanel.onTap(x, y)) return;
    if (this.equipPanel.onTap(x, y)) return;
    if (this.skillPanel.onTap(x, y)) return;
    if (this.shopPanel.onTap(x, y, (item) => this.buyItem(item))) return;

    // 死亡点击复活
    if (this.player.dead) {
      this.player.dead = false;
      this.player.hp = this.player.maxHp;
      this.player.mp = this.player.maxMp;
      this.player.x = this.mapData.safe_x || 600;
      this.player.y = this.mapData.safe_y || 450;
      return;
    }

    // 底部菜单按钮
    for (const btn of this.menuBtns) {
      if (hitTest(x, y, btn.x, btn.y, btn.w, btn.h)) {
        if (btn.id === 'bag') this.invPanel.toggle();
        else if (btn.id === 'equip') this.equipPanel.toggle();
        else if (btn.id === 'skill') this.skillPanel.toggle();
        else if (btn.id === 'shop') this.shopPanel.toggle();
        else if (btn.id === 'chat') this.chatPanel.toggle();
        else if (btn.id === 'arena') this.arenaPanel.toggle();
        else if (btn.id === 'reward') this.rewardPanel.toggle();
        return;
      }
    }

    // 自动战斗开关
    if (hitTest(x, y, this.btnAuto.x, this.btnAuto.y, this.btnAuto.w, this.btnAuto.h)) {
      this.autoFight = !this.autoFight;
      return;
    }
    // 普攻
    if ((x - this.atkBtn.x) ** 2 + (y - this.atkBtn.y) ** 2 <= (this.atkBtn.r + 8) ** 2) {
      this.doAttack();
      return;
    }
    // 技能
    for (const btn of this.skillBtns) {
      if ((x - btn.x) ** 2 + (y - btn.y) ** 2 <= (btn.r + 8) ** 2 && btn.cd <= 0) {
        this.doSkill(btn);
        return;
      }
    }
    // 拾取掉落物
    for (let i = this.loots.length - 1; i >= 0; i--) {
      const loot = this.loots[i];
      const sx = loot.x - this.camX, sy = loot.y - this.camY;
      if ((x - sx) ** 2 + (y - sy) ** 2 < 400) {
        this.pickupLoot(i);
        return;
      }
    }
  }

  // 广告/分享/充值处理
  handleReward(id) {
    const p = this.player;
    switch (id) {
      case 'ad_diamond':
        p.diamond = (p.diamond || 0) + 5;
        this.rewardPanel.msg = '+5 💎 钻石';
        this.rewardPanel.msgTimer = 1500;
        this.addFloat(p.x, p.y - 40, '+5💎', '#E040FB');
        break;
      case 'ad_stamina':
        p.stamina = Math.min(100, (p.stamina || 0) + 50);
        this.rewardPanel.msg = '+50 体力';
        this.rewardPanel.msgTimer = 1500;
        break;
      case 'ad_exp':
        this.rewardPanel.msg = '双倍经验 30 分钟已激活';
        this.rewardPanel.msgTimer = 1500;
        break;
      case 'share':
        p.diamond = (p.diamond || 0) + 10;
        this.rewardPanel.msg = '分享成功 +10💎';
        this.rewardPanel.msgTimer = 1500;
        if (typeof wx !== 'undefined') {
          wx.shareAppMessage({ title: '我在卡通传奇打到了稀有装备！', query: '' });
        }
        break;
      case 'sign':
        this.rewardPanel.msg = '签到成功 +5💎 +500金币';
        this.rewardPanel.msgTimer = 1500;
        p.diamond = (p.diamond || 0) + 5;
        p.gold = (p.gold || 0) + 500;
        break;
      case 'recharge':
        this.rewardPanel.msg = '充值功能开发中';
        this.rewardPanel.msgTimer = 1500;
        break;
    }
  }

  // 购买商店物品
  buyItem(item) {
    if (this.player.gold >= item.buy_price) {
      this.player.gold -= item.buy_price;
      this.shopPanel.msg = `购买 ${item.name} 成功`;
      this.shopPanel.msgTimer = 1500;
    } else {
      this.shopPanel.msg = '金币不足';
      this.shopPanel.msgTimer = 1500;
    }
  }

  // --- 战斗 ---

  // 计算伤害
  calcDamage(atk, def, critRate) {
    let dmg = Math.max(1, atk - def * 0.5);
    const crit = Math.random() < critRate;
    if (crit) dmg *= 2;
    dmg *= 0.9 + Math.random() * 0.2;
    return { dmg: Math.round(dmg), crit };
  }

  // 普攻
  doAttack() {
    const p = this.player;
    if (p.dead || p.atkCd > 0) return;
    p.atkCd = 500; // 0.5秒冷却

    // 找最近的活怪物
    const target = this.findNearestMonster(150);
    if (!target) return;

    // 面向目标
    p.facing = Math.atan2(target.y - p.y, target.x - p.x);

    const { dmg, crit } = this.calcDamage(p.attack, target.tmpl.defense, p.critRate);
    const dead = target.takeDamage(dmg);
    this.addFloat(target.x, target.y - 20, `-${dmg}${crit ? ' 暴击!' : ''}`, crit ? '#FFD54F' : '#fff');
    // 攻击特效：斩击线
    this.effects.push({ type: 'slash', x: target.x, y: target.y, t: 0, dur: 300 });

    if (dead) this.onMonsterKill(target);
  }

  // 释放技能
  doSkill(btn) {
    const p = this.player;
    if (p.dead) return;
    const skill = btn.skill;
    if (p.mp < (skill.mana_cost || 0)) {
      this.addFloat(p.x, p.y - 30, 'MP不足', '#2196F3');
      return;
    }
    btn.cd = skill.cooldown * 1000;
    p.mp -= skill.mana_cost || 0;

    // AOE 技能
    const range = skill.range || 150;
    const aoeR = skill.aoe_radius || 0;
    const ratio = skill.damage_ratio || 1.5;

    if (aoeR > 0) {
      // 范围技能：伤害范围内所有怪物
      for (const m of this.monsters) {
        if (!m.alive) continue;
        if (dist(p.x, p.y, m.x, m.y) > range + aoeR) continue;
        const { dmg, crit } = this.calcDamage(Math.round(p.attack * ratio), m.tmpl.defense, p.critRate);
        const dead = m.takeDamage(dmg);
        this.addFloat(m.x, m.y - 20, `-${dmg}`, '#FF9800');
        if (dead) this.onMonsterKill(m);
      }
    } else {
      // 单体技能
      const target = this.findNearestMonster(range);
      if (!target) return;
      p.facing = Math.atan2(target.y - p.y, target.x - p.x);
      const { dmg, crit } = this.calcDamage(Math.round(p.attack * ratio), target.tmpl.defense, p.critRate);
      const dead = target.takeDamage(dmg);
      this.addFloat(target.x, target.y - 20, `-${dmg}${crit ? '!' : ''}`, '#FF9800');
      if (dead) this.onMonsterKill(target);
    }

    this.addFloat(p.x, p.y - 35, skill.name, '#FFD54F');
  }

  // 找最近活怪物
  findNearestMonster(range) {
    let nearest = null, minD = range;
    for (const m of this.monsters) {
      if (!m.alive) continue;
      const d = dist(this.player.x, this.player.y, m.x, m.y);
      if (d < minD) { minD = d; nearest = m; }
    }
    return nearest;
  }

  // 怪物被击杀
  onMonsterKill(m) {
    this.killCount++;
    const exp = m.tmpl.exp_reward || 10;
    const gold = m.tmpl.gold_reward || 5;
    this.player.exp += exp;
    this.addFloat(m.x, m.y - 10, `+${exp} EXP`, T.EXP_BAR);

    // 掉落
    this.loots.push(new LootDrop(
      m.x + (Math.random() - 0.5) * 20,
      m.y + (Math.random() - 0.5) * 20,
      null, null, gold, 0,
    ));

    // 升级检测
    const needExp = this.player.level * 100;
    if (this.player.exp >= needExp) {
      this.player.exp -= needExp;
      this.player.level++;
      this.player.maxHp += 15;
      this.player.hp = this.player.maxHp;
      this.player.maxMp += 8;
      this.player.mp = this.player.maxMp;
      this.player.attack += 3;
      this.player.defense += 2;
      this.addFloat(this.player.x, this.player.y - 50, `🎉 升级 Lv.${this.player.level}!`, '#FFD54F');
    }
  }

  // 拾取掉落物
  pickupLoot(idx) {
    const loot = this.loots[idx];
    if (loot.gold > 0) {
      this.addFloat(loot.x, loot.y - 10, `+${loot.gold} 金币`, T.GOLD);
    }
    this.loots.splice(idx, 1);
  }

  // --- 更新 ---

  update(dt) {
    const p = this.player;
    if (p.dead) return;

    // 冷却
    if (p.atkCd > 0) p.atkCd -= dt;
    for (const btn of this.skillBtns) {
      if (btn.cd > 0) btn.cd -= dt;
    }

    // MP 自然恢复
    p.mp = Math.min(p.maxMp, p.mp + dt * 0.005);

    // 飘字
    this.floats.forEach(f => f.update(dt));
    this.floats = this.floats.filter(f => f.alive);

    // 战斗特效
    this.effects.forEach(e => { e.t += dt; });
    this.effects = this.effects.filter(e => e.t < e.dur);

    // 面板更新
    this.shopPanel.update(dt);
    this.rewardPanel.update(dt);

    // 掉落物
    this.loots.forEach(l => l.update(dt));
    this.loots = this.loots.filter(l => l.alive);

    // 移动
    const dir = this.app.input.getMoveDir();
    if (dir) {
      const spd = p.speed * dt / 1000;
      p.x += dir.x * spd;
      p.y += dir.y * spd;
      p.x = Math.max(16, Math.min(this.mapData.width - 16, p.x));
      p.y = Math.max(16, Math.min(this.mapData.height - 16, p.y));
      p.facing = Math.atan2(dir.y, dir.x);
    }

    // 摄像机
    const tcx = p.x - this.W / 2, tcy = p.y - this.H / 2;
    this.camX += (tcx - this.camX) * CONFIG.CAMERA_SMOOTH;
    this.camY += (tcy - this.camY) * CONFIG.CAMERA_SMOOTH;

    // 怪物 AI + 攻击玩家
    for (const m of this.monsters) {
      m.update(dt, p.x, p.y);
      if (m.canAttack(p.x, p.y)) {
        m.atkCd = 1500;
        const { dmg } = this.calcDamage(m.tmpl.attack, p.defense, 0);
        p.hp -= dmg;
        this.addFloat(p.x, p.y - 20, `-${dmg}`, T.HP_BAR);
        if (p.hp <= 0) { p.hp = 0; p.dead = true; }
      }
    }

    // 自动拾取（距离 < 40）
    for (let i = this.loots.length - 1; i >= 0; i--) {
      if (dist(p.x, p.y, this.loots[i].x, this.loots[i].y) < 40) {
        this.pickupLoot(i);
      }
    }

    // 自动战斗
    if (this.autoFight && !p.dead) {
      const target = this.findNearestMonster(300);
      if (target) {
        // 自动移向怪物
        if (dist(p.x, p.y, target.x, target.y) > 40) {
          const angle = Math.atan2(target.y - p.y, target.x - p.x);
          const spd = p.speed * dt / 1000;
          p.x += Math.cos(angle) * spd;
          p.y += Math.sin(angle) * spd;
          p.facing = angle;
        }
        // 自动攻击
        if (p.atkCd <= 0 && dist(p.x, p.y, target.x, target.y) < 50) {
          this.doAttack();
        }
      }
    }
  }

  addFloat(x, y, text, color) {
    this.floats.push(new FloatText(x, y, text, color));
  }

  // --- 渲染 ---

  render(ctx, W, H) {
    // 地图背景
    ctx.fillStyle = this.mapData.bg_color || T.BG;
    ctx.fillRect(0, 0, W, H);

    // Tile 装饰
    this.renderTiles(ctx, W, H);

    // 安全区
    this.renderSafeZone(ctx);

    // 掉落物
    this.renderLoots(ctx);

    // 怪物
    this.renderMonsters(ctx);

    // 玩家
    this.renderPlayer(ctx);

    // 战斗特效
    this.renderEffects(ctx);

    // 飘字
    this.floats.forEach(f => f.render(ctx, this.camX, this.camY));

    // HUD
    this.renderHUD(ctx, W, H);

    // 底部菜单
    this.renderMenuBtns(ctx);

    // 摇杆
    drawJoystick(ctx, this.app.input.joystick);

    // 技能
    this.renderSkillBtns(ctx);

    // 面板（最上层）
    this.invPanel.render(ctx);
    this.equipPanel.render(ctx);
    this.shopPanel.render(ctx);
    this.skillPanel.render(ctx);
    this.chatPanel.render(ctx);
    this.arenaPanel.render(ctx);
    this.rewardPanel.render(ctx);

    // 死亡提示
    if (this.player.dead) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#F44336'; ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('💀 你被击败了', W / 2, H / 2 - 20);
      ctx.fillStyle = '#fff'; ctx.font = '16px sans-serif';
      ctx.fillText('点击屏幕回城复活', W / 2, H / 2 + 20);
    }
  }

  // 地图 Tile 装饰（草丛/花/石头/树）
  renderTiles(ctx, W, H) {
    const c0 = Math.floor(this.camX / TILE) - 1;
    const r0 = Math.floor(this.camY / TILE) - 1;
    const c1 = Math.ceil((this.camX + W) / TILE) + 1;
    const r1 = Math.ceil((this.camY + H) / TILE) + 1;

    for (let col = c0; col <= c1; col++) {
      for (let row = r0; row <= r1; row++) {
        if (col < 0 || row < 0) continue;
        const sx = col * TILE - this.camX;
        const sy = row * TILE - this.camY;
        const h = tileHash(col, row);

        // 棋盘格
        if ((col + row) % 2 === 0) {
          ctx.fillStyle = 'rgba(0,0,0,0.03)';
          ctx.fillRect(sx, sy, TILE, TILE);
        }

        // 装饰
        const cx = sx + TILE / 2, cy = sy + TILE / 2;
        if (h % 31 === 0) {
          // 小花
          ctx.fillStyle = ['#FF7043', '#FFD54F', '#AB47BC', '#42A5F5'][h % 4];
          ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#4CAF50';
          ctx.fillRect(cx - 1, cy + 2, 2, 5);
        } else if (h % 43 === 0) {
          // 小草丛
          ctx.fillStyle = '#558B2F';
          ctx.fillRect(cx - 5, cy - 2, 3, 7);
          ctx.fillRect(cx - 1, cy - 4, 3, 9);
          ctx.fillRect(cx + 3, cy - 1, 3, 6);
        } else if (h % 67 === 0) {
          // 石头
          ctx.fillStyle = '#9E9E9E';
          ctx.beginPath(); ctx.ellipse(cx, cy + 2, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.2)';
          ctx.beginPath(); ctx.ellipse(cx - 2, cy, 2, 1.5, -0.3, 0, Math.PI * 2); ctx.fill();
        } else if (h % 97 === 0) {
          // 树
          ctx.fillStyle = '#5D4037';
          ctx.fillRect(cx - 2, cy, 4, 10);
          ctx.fillStyle = '#388E3C';
          ctx.beginPath(); ctx.arc(cx, cy - 2, 8, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#43A047';
          ctx.beginPath(); ctx.arc(cx + 3, cy - 4, 6, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
  }

  renderSafeZone(ctx) {
    const sx = (this.mapData.safe_x || 600) - this.camX;
    const sy = (this.mapData.safe_y || 450) - this.camY;
    const sr = this.mapData.safe_r || 100;
    // 安全区光圈
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    // NPC
    ctx.fillStyle = 'rgba(255,215,0,0.4)';
    ctx.beginPath(); ctx.arc(sx, sy, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFD54F'; ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center'; ctx.fillText('🏪 商店', sx, sy - 20);
  }

  renderLoots(ctx) {
    for (const loot of this.loots) {
      const sx = loot.x - this.camX;
      const sy = loot.y - this.camY + loot.bobY;
      // 光柱
      ctx.fillStyle = 'rgba(255,215,0,0.15)';
      ctx.fillRect(sx - 3, sy - 20, 6, 20);
      // 金币图标
      ctx.fillStyle = '#FFD54F'; ctx.font = '14px sans-serif';
      ctx.textAlign = 'center'; ctx.fillText('💰', sx, sy);
    }
  }

  renderMonsters(ctx) {
    for (const m of this.monsters) {
      if (!m.alive) continue;
      const sx = m.x - this.camX;
      const sy = m.y - this.camY;

      // 阴影
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath(); ctx.ellipse(sx, sy + 12, 10, 4, 0, 0, Math.PI * 2); ctx.fill();

      // 身体
      const flash = m.hitFlash > 0;
      const bossScale = m.tmpl.is_boss ? 1.5 : 1;
      const r = 12 * bossScale;

      ctx.fillStyle = flash ? '#fff' : (m.tmpl.is_boss ? '#9C27B0' : '#F44336');
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
      if (m.tmpl.is_boss) {
        ctx.strokeStyle = '#FFD54F'; ctx.lineWidth = 2; ctx.stroke();
      }

      // 脸（Q版）
      ctx.fillStyle = flash ? '#ddd' : '#FFE0B2';
      ctx.beginPath(); ctx.arc(sx, sy - 2 * bossScale, 7 * bossScale, 0, Math.PI * 2); ctx.fill();
      // 眼睛（红色=怒）
      ctx.fillStyle = '#C62828';
      ctx.beginPath(); ctx.arc(sx - 3 * bossScale, sy - 3 * bossScale, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(sx + 3 * bossScale, sy - 3 * bossScale, 1.5, 0, Math.PI * 2); ctx.fill();

      // 名字 + 等级
      ctx.fillStyle = m.tmpl.is_boss ? '#FFD54F' : '#fff';
      ctx.font = `${m.tmpl.is_boss ? 'bold ' : ''}9px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`Lv.${m.tmpl.level} ${m.tmpl.name}`, sx, sy - r - 14);

      // HP 条
      drawBar(ctx, sx - 16, sy - r - 8, 32, 3, m.hp / m.maxHp, m.tmpl.is_boss ? '#9C27B0' : T.HP_BAR);
    }
  }

  renderPlayer(ctx) {
    const p = this.player;
    const px = p.x - this.camX;
    const py = p.y - this.camY;

    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(px, py + 14, 12, 5, 0, 0, Math.PI * 2); ctx.fill();

    // 身体
    const cc = { warrior: '#C62828', archer: '#2E7D32', mage: '#1565C0' };
    ctx.fillStyle = cc[p.class] || '#666';
    ctx.beginPath(); ctx.arc(px, py, 14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();

    // 脸
    ctx.fillStyle = '#FFE0B2';
    ctx.beginPath(); ctx.arc(px, py - 2, 9, 0, Math.PI * 2); ctx.fill();
    // 眼睛（朝向）
    const ex = Math.cos(p.facing) * 2, ey = Math.sin(p.facing) * 1;
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(px - 3 + ex, py - 4 + ey, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(px + 3 + ex, py - 4 + ey, 2, 0, Math.PI * 2); ctx.fill();

    // 武器指示（朝向方向的小线）
    ctx.strokeStyle = '#FFD54F'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(px + Math.cos(p.facing) * 14, py + Math.sin(p.facing) * 14);
    ctx.lineTo(px + Math.cos(p.facing) * 22, py + Math.sin(p.facing) * 22);
    ctx.stroke();

    // 昵称
    ctx.fillStyle = '#fff'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(p.nickname, px, py - 22);

    // HP 条
    drawBar(ctx, px - 16, py - 30, 32, 4, p.hp / p.maxHp, T.HP_BAR);
  }

  renderHUD(ctx, W, _H) {
    const p = this.player;
    // 左上角面板
    roundRect(ctx, 8, 8, 150, 65, 8);
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fill();

    // 头像
    const cc = { warrior: '#C62828', archer: '#2E7D32', mage: '#1565C0' };
    ctx.fillStyle = cc[p.class] || '#555';
    ctx.beginPath(); ctx.arc(36, 38, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFE0B2';
    ctx.beginPath(); ctx.arc(36, 36, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`Lv.${p.level}`, 36, 58);

    // 条
    drawBar(ctx, 62, 14, 88, 8, p.hp / p.maxHp, T.HP_BAR);
    ctx.fillStyle = '#fff'; ctx.font = '7px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`HP ${p.hp}/${p.maxHp}`, 62, 12);
    drawBar(ctx, 62, 28, 88, 8, p.mp / p.maxMp, T.MP_BAR);
    ctx.fillText(`MP ${Math.round(p.mp)}/${p.maxMp}`, 62, 26);
    drawBar(ctx, 62, 42, 88, 8, p.exp / (p.level * 100), T.EXP_BAR);
    ctx.fillText(`EXP ${p.exp}/${p.level * 100}`, 62, 40);
    ctx.fillStyle = T.GOLD; ctx.font = '9px sans-serif';
    ctx.fillText(`⚔ ${p.attack}  🛡 ${p.defense}  击杀 ${this.killCount}`, 62, 62);

    // 右上角地图名
    roundRect(ctx, W - 100, 8, 92, 22, 6);
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`📍 ${this.mapData.name}`, W - 54, 21);

    // 自动战斗
    const ab = this.btnAuto;
    roundRect(ctx, ab.x, ab.y, ab.w, ab.h, 4);
    ctx.fillStyle = this.autoFight ? T.ACCENT : '#555'; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '9px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(this.autoFight ? '自动' : '手动', ab.x + ab.w / 2, ab.y + ab.h / 2);
    ctx.textBaseline = 'alphabetic';
  }

  renderSkillBtns(ctx) {
    // 普攻
    const ab = this.atkBtn;
    ctx.fillStyle = this.player.atkCd > 0 ? '#777' : T.HP_BAR;
    ctx.beginPath(); ctx.arc(ab.x, ab.y, ab.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('⚔', ab.x, ab.y);

    // 技能
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
        ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif';
        ctx.fillText(Math.ceil(btn.cd / 1000) + 's', btn.x, btn.y + 2);
      }
    }
    ctx.textBaseline = 'alphabetic';
  }

  // 底部菜单图标
  renderMenuBtns(ctx) {
    for (const btn of this.menuBtns) {
      roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8);
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = `${btn.w * 0.5}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
    }
    ctx.textBaseline = 'alphabetic';
  }

  // 战斗特效渲染
  renderEffects(ctx) {
    for (const e of this.effects) {
      const sx = e.x - this.camX, sy = e.y - this.camY;
      const t = e.t / e.dur;
      ctx.globalAlpha = 1 - t;

      if (e.type === 'slash') {
        // 斩击弧线
        ctx.strokeStyle = '#FFD54F';
        ctx.lineWidth = 3 * (1 - t);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(sx, sy, 16 + t * 20, -Math.PI * 0.7, Math.PI * 0.3);
        ctx.stroke();
        // 火花粒子
        for (let i = 0; i < 3; i++) {
          const angle = -Math.PI * 0.7 + i * 0.5;
          const pr = 16 + t * 30;
          ctx.fillStyle = '#FF9800';
          ctx.beginPath();
          ctx.arc(sx + Math.cos(angle) * pr, sy + Math.sin(angle) * pr, 2 * (1 - t), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;
    }
  }
}
