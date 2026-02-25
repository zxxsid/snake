// 敌人系统 - 从蛇头远处生成并追踪蛇

import { CONFIG } from './config.js';

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

  // 朝目标移动
  update(dt, targetX, targetY) {
    this.moveTimer += dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    const interval = 1000 / this.type.speed;
    while (this.moveTimer >= interval) {
      this.moveTimer -= interval;
      this.moveToward(targetX, targetY);
    }
  }

  // 沿最短路径朝目标走一步
  moveToward(tx, ty) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    if (dx === 0 && dy === 0) return;
    if (Math.abs(dx) >= Math.abs(dy)) {
      this.x += Math.sign(dx);
    } else {
      this.y += Math.sign(dy);
    }
  }

  // 尝试攻击蛇（与蛇身重叠时周期攻击）
  tryAttack(dt, snakeBody) {
    this.attackTimer += dt;
    if (this.attackTimer < this.type.attackInterval) return 0;
    if (snakeBody.some(s => s.x === this.x && s.y === this.y)) {
      this.attackTimer = 0;
      return this.type.attack;
    }
    return 0;
  }

  // 受到伤害
  takeDamage(amount) {
    this.hp -= amount;
    this.hitFlash = 200;
  }
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
    // 首次生成延迟
    if (!this.spawningEnabled) {
      this.firstSpawnTimer -= dt;
      if (this.firstSpawnTimer <= 0) {
        this.spawningEnabled = true;
        this.spawnTimer = 0;
      }
    }

    // 定时生成敌人
    if (this.spawningEnabled) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.enemies.length < CONFIG.ENEMY.MAX_COUNT) {
        this.spawn(snake.head.x, snake.head.y);
        this.spawnTimer = CONFIG.ENEMY.SPAWN_INTERVAL;
      }
    }

    // 清理过远的敌人
    const r2 = CONFIG.CLEANUP_RADIUS * CONFIG.CLEANUP_RADIUS;
    this.enemies = this.enemies.filter(e => {
      const dx = e.x - snake.head.x, dy = e.y - snake.head.y;
      return dx * dx + dy * dy < r2;
    });

    let totalDamage = 0;
    const head = snake.head;

    for (const enemy of this.enemies) {
      enemy.update(dt, head.x, head.y);
      // 敌人攻击蛇
      totalDamage += enemy.tryAttack(dt, snake.body);
      // 蛇头碰到敌人 → 蛇攻击敌人
      if (enemy.x === head.x && enemy.y === head.y && snake.attack > 0) {
        enemy.takeDamage(snake.attack);
      }
    }

    // 移除死亡敌人
    const killed = this.enemies.filter(e => !e.alive).length;
    this.enemies = this.enemies.filter(e => e.alive);
    return { totalDamage, killed };
  }

  // 在蛇头远处随机位置生成敌人
  spawn(headX, headY) {
    const type = this.pickType();
    const angle = Math.random() * Math.PI * 2;
    const dist = CONFIG.ENEMY.SPAWN_MIN_DIST +
      Math.random() * (CONFIG.ENEMY.SPAWN_MAX_DIST - CONFIG.ENEMY.SPAWN_MIN_DIST);
    const x = Math.round(headX + Math.cos(angle) * dist);
    const y = Math.round(headY + Math.sin(angle) * dist);
    if (type) this.enemies.push(new Enemy(x, y, type));
  }

  // 按权重随机选择敌人类型
  pickType() {
    const types = CONFIG.ENEMY.TYPES;
    const total = types.reduce((s, t) => s + t.weight, 0);
    let r = Math.random() * total;
    for (const t of types) {
      r -= t.weight;
      if (r <= 0) return t;
    }
    return types[types.length - 1];
  }
}
