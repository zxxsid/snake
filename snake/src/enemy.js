// 敌人系统 - 格子移动 + 像素距离碰撞检测

import { CONFIG } from './config.js';

const C = CONFIG.CELL_SIZE;

export class Enemy {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.hp = type.hp;
    this.maxHp = type.hp;
    this.moveTimer = 0;
    this.attackTimer = 0;
    this.hitFlash = 0;
  }

  get alive() { return this.hp > 0; }
  get px() { return this.x * C + C / 2; }
  get py() { return this.y * C + C / 2; }

  update(dt, targetGX, targetGY) {
    this.moveTimer += dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    const interval = 1000 / this.type.speed;
    while (this.moveTimer >= interval) {
      this.moveTimer -= interval;
      this.moveToward(targetGX, targetGY);
    }
  }

  moveToward(tx, ty) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    if (dx === 0 && dy === 0) return;
    if (Math.abs(dx) >= Math.abs(dy)) this.x += Math.sign(dx);
    else this.y += Math.sign(dy);
  }

  // 攻击判定（像素距离）：敌人中心 vs 蛇身体段
  tryAttack(dt, snakeBody) {
    this.attackTimer += dt;
    if (this.attackTimer < this.type.attackInterval) return 0;
    const t2 = (C * 1.0) * (C * 1.0);
    const hit = snakeBody.some(s => (s.x - this.px) ** 2 + (s.y - this.py) ** 2 < t2);
    if (hit) { this.attackTimer = 0; return this.type.attack; }
    return 0;
  }

  takeDamage(amount) { this.hp -= amount; this.hitFlash = 200; }
}

export class EnemyManager {
  constructor() { this.reset(); }

  reset() {
    this.enemies = [];
    this.spawnTimer = 0;
    this.firstSpawnTimer = CONFIG.ENEMY.FIRST_SPAWN_DELAY;
    this.spawningEnabled = false;
  }

  update(dt, snake) {
    if (!this.spawningEnabled) {
      this.firstSpawnTimer -= dt;
      if (this.firstSpawnTimer <= 0) { this.spawningEnabled = true; this.spawnTimer = 0; }
    }
    if (this.spawningEnabled) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.enemies.length < CONFIG.ENEMY.MAX_COUNT) {
        this.spawn(snake.headCell.x, snake.headCell.y);
        this.spawnTimer = CONFIG.ENEMY.SPAWN_INTERVAL;
      }
    }

    // 清理过远的敌人
    const hc = snake.headCell;
    const r2 = CONFIG.CLEANUP_RADIUS * CONFIG.CLEANUP_RADIUS;
    this.enemies = this.enemies.filter(e => (e.x - hc.x) ** 2 + (e.y - hc.y) ** 2 < r2);

    let totalDamage = 0;
    const hitT2 = (C * 0.82) * (C * 0.82);

    for (const enemy of this.enemies) {
      enemy.update(dt, hc.x, hc.y);
      totalDamage += enemy.tryAttack(dt, snake.body);
      // 蛇头碰到敌人 → 蛇攻击敌人（像素距离）
      if (snake.attack > 0 && (snake.headX - enemy.px) ** 2 + (snake.headY - enemy.py) ** 2 < hitT2) {
        enemy.takeDamage(snake.attack);
      }
    }

    const killed = this.enemies.filter(e => !e.alive).length;
    this.enemies = this.enemies.filter(e => e.alive);
    return { totalDamage, killed };
  }

  spawn(hgx, hgy) {
    const type = this.pickType();
    const a = Math.random() * Math.PI * 2;
    const d = CONFIG.ENEMY.SPAWN_MIN_DIST + Math.random() * (CONFIG.ENEMY.SPAWN_MAX_DIST - CONFIG.ENEMY.SPAWN_MIN_DIST);
    const x = Math.round(hgx + Math.cos(a) * d);
    const y = Math.round(hgy + Math.sin(a) * d);
    if (type) this.enemies.push(new Enemy(x, y, type));
  }

  pickType() {
    const types = CONFIG.ENEMY.TYPES;
    const total = types.reduce((s, t) => s + t.weight, 0);
    let r = Math.random() * total;
    for (const t of types) { r -= t.weight; if (r <= 0) return t; }
    return types[types.length - 1];
  }
}
