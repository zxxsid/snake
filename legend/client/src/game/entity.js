// 游戏实体基类 + 怪物/掉落物

import { CONFIG } from '../config.js';
const TILE = CONFIG.TILE_SIZE;

// 确定性哈希（地图装饰用）
export function tileHash(x, y) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) & 0x7fffffff;
}

// 两点距离
export function dist(ax, ay, bx, by) {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

// 怪物实例（客户端）
export class Monster {
  constructor(tmpl, x, y) {
    this.tmpl = tmpl;              // 怪物模板
    this.x = x; this.y = y;
    this.hp = tmpl.hp;
    this.maxHp = tmpl.hp;
    this.alive = true;
    this.respawnTimer = 0;
    this.spawnX = x; this.spawnY = y;
    this.targetX = x; this.targetY = y;
    this.moveTimer = 0;
    this.atkCd = 0;                // 攻击冷却
    this.hitFlash = 0;
    this.facing = 0;               // 朝向弧度
  }

  // 怪物 AI 更新
  update(dt, playerX, playerY) {
    if (!this.alive) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) this.respawn();
      return;
    }
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.atkCd > 0) this.atkCd -= dt;

    const d = dist(this.x, this.y, playerX, playerY);

    if (d < this.tmpl.aggro_range) {
      // 追踪玩家
      const angle = Math.atan2(playerY - this.y, playerX - this.x);
      this.facing = angle;
      const spd = this.tmpl.speed * TILE * dt / 1000;
      if (d > 30) {
        this.x += Math.cos(angle) * spd;
        this.y += Math.sin(angle) * spd;
      }
    } else {
      // 随机巡逻
      this.moveTimer -= dt;
      if (this.moveTimer <= 0) {
        this.targetX = this.spawnX + (Math.random() - 0.5) * 100;
        this.targetY = this.spawnY + (Math.random() - 0.5) * 100;
        this.moveTimer = 2000 + Math.random() * 3000;
      }
      const angle = Math.atan2(this.targetY - this.y, this.targetX - this.x);
      this.facing = angle;
      const d2 = dist(this.x, this.y, this.targetX, this.targetY);
      if (d2 > 5) {
        const spd = this.tmpl.speed * TILE * 0.4 * dt / 1000;
        this.x += Math.cos(angle) * spd;
        this.y += Math.sin(angle) * spd;
      }
    }
  }

  // 受击
  takeDamage(dmg) {
    this.hp -= dmg;
    this.hitFlash = 150;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this.respawnTimer = this.tmpl.respawn_time * 1000;
    }
    return this.hp <= 0;
  }

  // 重生
  respawn() {
    this.alive = true;
    this.hp = this.maxHp;
    this.x = this.spawnX + (Math.random() - 0.5) * 40;
    this.y = this.spawnY + (Math.random() - 0.5) * 40;
  }

  // 能否攻击玩家
  canAttack(playerX, playerY) {
    return this.alive && this.atkCd <= 0 && dist(this.x, this.y, playerX, playerY) < 35;
  }
}

// 掉落物
export class LootDrop {
  constructor(x, y, itemName, quality, gold, exp) {
    this.x = x; this.y = y;
    this.itemName = itemName;
    this.quality = quality;
    this.gold = gold;
    this.exp = exp;
    this.timer = 15000;   // 15秒后消失
    this.bobTimer = 0;
  }

  update(dt) {
    this.timer -= dt;
    this.bobTimer += dt;
  }

  get alive() { return this.timer > 0; }
  get bobY() { return Math.sin(this.bobTimer / 300) * 3; }
}
