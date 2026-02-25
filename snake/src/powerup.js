import { CONFIG } from './config.js';

export class PowerUp {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.pulseTimer = 0;
  }

  update(dt) {
    this.pulseTimer += dt;
  }

  get pulseScale() {
    return 1 + Math.sin(this.pulseTimer / 300) * 0.15;
  }
}

export class PowerUpManager {
  constructor() {
    this.items = [];
    this.spawnTimer = CONFIG.POWERUP.SPAWN_INTERVAL;
  }

  reset() {
    this.items = [];
    this.spawnTimer = CONFIG.POWERUP.SPAWN_INTERVAL;
  }

  update(dt, occupiedCheck) {
    this.items.forEach(p => p.update(dt));
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.items.length < CONFIG.POWERUP.MAX_COUNT) {
      this.spawn(occupiedCheck);
      this.spawnTimer = CONFIG.POWERUP.SPAWN_INTERVAL;
    }
  }

  spawn(occupiedCheck) {
    const type = this.pickType();
    const pos = this.findEmptyCell(occupiedCheck);
    if (pos && type) {
      this.items.push(new PowerUp(pos.x, pos.y, type));
    }
  }

  pickType() {
    const types = CONFIG.POWERUP.TYPES;
    const totalWeight = types.reduce((sum, t) => sum + t.weight, 0);
    let rand = Math.random() * totalWeight;
    for (const t of types) {
      rand -= t.weight;
      if (rand <= 0) return t;
    }
    return types[types.length - 1];
  }

  findEmptyCell(occupiedCheck) {
    for (let attempts = 0; attempts < 100; attempts++) {
      const x = Math.floor(Math.random() * CONFIG.GRID_COLS);
      const y = Math.floor(Math.random() * CONFIG.GRID_ROWS);
      if (!occupiedCheck(x, y) && !this.items.some(p => p.x === x && p.y === y)) {
        return { x, y };
      }
    }
    return null;
  }

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
