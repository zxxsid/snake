// 道具系统 - 在蛇周围随机生成道具

import { CONFIG } from './config.js';

export class PowerUp {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.pulseTimer = Math.random() * 1000;
  }

  update(dt) { this.pulseTimer += dt; }

  // 脉动缩放（卡通弹跳感）
  get pulseScale() {
    return 1 + Math.sin(this.pulseTimer / 250) * 0.18;
  }
}

export class PowerUpManager {
  constructor() { this.reset(); }

  reset() {
    this.items = [];
    this.spawnTimer = CONFIG.POWERUP.SPAWN_INTERVAL;
  }

  update(dt, headX, headY, occupiedCheck) {
    this.items.forEach(p => p.update(dt));

    // 清理远离蛇头的道具
    const r2 = CONFIG.CLEANUP_RADIUS * CONFIG.CLEANUP_RADIUS;
    this.items = this.items.filter(p => {
      const dx = p.x - headX, dy = p.y - headY;
      return dx * dx + dy * dy < r2;
    });

    // 定时生成新道具
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.items.length < CONFIG.POWERUP.MAX_COUNT) {
      this.spawn(headX, headY, occupiedCheck);
      this.spawnTimer = CONFIG.POWERUP.SPAWN_INTERVAL;
    }
  }

  // 在蛇头附近随机生成道具
  spawn(headX, headY, occupiedCheck) {
    const type = this.pickType();
    const pos = this.findSpawnPos(headX, headY, occupiedCheck);
    if (pos && type) {
      this.items.push(new PowerUp(pos.x, pos.y, type));
    }
  }

  // 按权重随机选择道具类型
  pickType() {
    const types = CONFIG.POWERUP.TYPES;
    const total = types.reduce((s, t) => s + t.weight, 0);
    let r = Math.random() * total;
    for (const t of types) {
      r -= t.weight;
      if (r <= 0) return t;
    }
    return types[types.length - 1];
  }

  // 在蛇头周围找空位
  findSpawnPos(headX, headY, occupiedCheck) {
    const R = CONFIG.SPAWN_RADIUS;
    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 4 + Math.random() * (R - 4);
      const x = Math.round(headX + Math.cos(angle) * dist);
      const y = Math.round(headY + Math.sin(angle) * dist);
      if (!occupiedCheck(x, y) && !this.items.some(p => p.x === x && p.y === y)) {
        return { x, y };
      }
    }
    return null;
  }

  // 蛇头碰到道具时拾取
  checkCollection(headX, headY) {
    const idx = this.items.findIndex(p => p.x === headX && p.y === headY);
    if (idx >= 0) {
      const collected = this.items[idx];
      this.items.splice(idx, 1);
      return collected;
    }
    return null;
  }
}
