// 蛇实体 - 管理蛇的移动、增长、受伤

import { CONFIG } from './config.js';

// 方向常量
const DIR = {
  UP:    { x: 0, y: -1 },
  DOWN:  { x: 0, y: 1 },
  LEFT:  { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

export class Snake {
  constructor() {
    this.reset();
  }

  // 重置蛇到初始状态
  reset() {
    this.body = [];
    for (let i = 0; i < CONFIG.SNAKE.INITIAL_LENGTH; i++) {
      this.body.push({ x: -i, y: 0 });
    }
    this.direction = DIR.RIGHT;
    this.nextDirection = DIR.RIGHT;
    this.speed = CONFIG.SNAKE.INITIAL_SPEED;
    this.attack = CONFIG.SNAKE.INITIAL_ATTACK;
    this.defense = CONFIG.SNAKE.INITIAL_DEFENSE;
    this.growQueue = 0;
    this.moveTimer = 0;
    this.invincibleTimer = 0;
  }

  get head() { return this.body[0]; }
  get length() { return this.body.length; }
  get alive() { return this.body.length >= CONFIG.SNAKE.MIN_LENGTH; }

  // 设置方向（禁止180°反向）
  setDirection(dir) {
    const opposite = this.direction.x + dir.x === 0 && this.direction.y + dir.y === 0;
    if (!opposite) this.nextDirection = dir;
  }

  // 按速度驱动移动
  update(dt) {
    if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
    this.moveTimer += dt;
    const interval = 1000 / this.speed;
    let moved = false;
    while (this.moveTimer >= interval) {
      this.moveTimer -= interval;
      this.move();
      moved = true;
    }
    return moved;
  }

  // 移动一步（无边界，不穿墙）
  move() {
    this.direction = this.nextDirection;
    const h = this.head;
    this.body.unshift({ x: h.x + this.direction.x, y: h.y + this.direction.y });
    if (this.growQueue > 0) {
      this.growQueue--;
    } else {
      this.body.pop();
    }
  }

  // 增长
  grow(amount) { this.growQueue += amount; }

  // 受到伤害，返回实际扣减的长度
  takeDamage(enemyAttack) {
    if (this.invincibleTimer > 0) return 0;
    const dmg = Math.max(1, enemyAttack - this.defense);
    const removed = Math.min(dmg, this.body.length - 1);
    for (let i = 0; i < removed; i++) this.body.pop();
    this.invincibleTimer = 500;
    return removed;
  }

  // 应用道具效果
  applyPowerup(type) {
    switch (type.effectType) {
      case 'length':  this.grow(type.effectValue); break;
      case 'speed':   this.speed = Math.min(this.speed + type.effectValue, CONFIG.SNAKE.MAX_SPEED); break;
      case 'attack':  this.attack += type.effectValue; break;
      case 'defense': this.defense += type.effectValue; break;
    }
  }

  // 检查某坐标是否被蛇身占据
  occupies(x, y) {
    return this.body.some(s => s.x === x && s.y === y);
  }
}

export { DIR };
