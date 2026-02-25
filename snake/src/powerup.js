// 道具系统 - 在蛇周围随机生成道具（碰撞基于像素距离）

import { CONFIG } from './config.js';

const C = CONFIG.CELL_SIZE;

export class PowerUp {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.pulseTimer = Math.random() * 1000;
  }
  update(dt) { this.pulseTimer += dt; }
  get pulseScale() { return 1 + Math.sin(this.pulseTimer / 250) * 0.18; }
  // 格子中心的像素坐标
  get px() { return this.x * C + C / 2; }
  get py() { return this.y * C + C / 2; }
}

export class PowerUpManager {
  constructor() { this.reset(); }

  reset() {
    this.items = [];
    this.spawnTimer = CONFIG.POWERUP.SPAWN_INTERVAL;
  }

  // headX/headY: 蛇头格子坐标
  update(dt, headGX, headGY, occupiedCheck) {
    this.items.forEach(p => p.update(dt));

    // 清理远离蛇头的道具
    const r2 = CONFIG.CLEANUP_RADIUS * CONFIG.CLEANUP_RADIUS;
    this.items = this.items.filter(p => {
      const dx = p.x - headGX, dy = p.y - headGY;
      return dx * dx + dy * dy < r2;
    });

    // 定时生成新道具
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.items.length < CONFIG.POWERUP.MAX_COUNT) {
      this.spawn(headGX, headGY, occupiedCheck);
      this.spawnTimer = CONFIG.POWERUP.SPAWN_INTERVAL;
    }
  }

  spawn(hgx, hgy, occupiedCheck) {
    const type = this.pickType();
    const pos = this.findSpawnPos(hgx, hgy, occupiedCheck);
    if (pos && type) this.items.push(new PowerUp(pos.x, pos.y, type));
  }

  pickType() {
    const types = CONFIG.POWERUP.TYPES;
    const total = types.reduce((s, t) => s + t.weight, 0);
    let r = Math.random() * total;
    for (const t of types) { r -= t.weight; if (r <= 0) return t; }
    return types[types.length - 1];
  }

  findSpawnPos(hgx, hgy, occupiedCheck) {
    const R = CONFIG.SPAWN_RADIUS;
    for (let i = 0; i < 80; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 4 + Math.random() * (R - 4);
      const x = Math.round(hgx + Math.cos(a) * d);
      const y = Math.round(hgy + Math.sin(a) * d);
      if (!occupiedCheck(x, y) && !this.items.some(p => p.x === x && p.y === y)) return { x, y };
    }
    return null;
  }

  // 蛇头像素坐标 → 检测拾取（基于像素距离）
  checkCollection(headPX, headPY) {
    const t2 = (C * 0.72) * (C * 0.72);
    const idx = this.items.findIndex(p => (headPX - p.px) ** 2 + (headPY - p.py) ** 2 < t2);
    if (idx >= 0) {
      const item = this.items[idx];
      this.items.splice(idx, 1);
      return item;
    }
    return null;
  }
}
