// 蛇实体 - 像素级自由方向移动 + 轨迹系统

import { CONFIG } from './config.js';

const C = CONFIG.CELL_SIZE;
const SEG = CONFIG.SEG_DIST;

export class Snake {
  constructor() { this.reset(); }

  // 重置到初始状态
  reset() {
    this.headX = 0;
    this.headY = 0;
    this.angle = 0;
    this.segments = CONFIG.SNAKE.INITIAL_LENGTH;
    this.speed = CONFIG.SNAKE.INITIAL_SPEED;
    this.attack = CONFIG.SNAKE.INITIAL_ATTACK;
    this.defense = CONFIG.SNAKE.INITIAL_DEFENSE;
    this.growQueue = 0;
    this.invincibleTimer = 0;

    // 预填充轨迹（向左延伸）
    this.trail = [];
    const need = (this.segments + 2) * SEG;
    for (let d = 0; d <= need; d += 1) {
      this.trail.push({ x: -d, y: 0 });
    }
    this.body = this._buildBody();
  }

  // 蛇头像素坐标
  get head() { return { x: this.headX, y: this.headY }; }
  // 蛇头对应的格子坐标（供道具/敌人刷新用）
  get headCell() { return { x: Math.floor(this.headX / C), y: Math.floor(this.headY / C) }; }
  get length() { return this.segments; }
  get alive() { return this.segments >= CONFIG.SNAKE.MIN_LENGTH; }

  // 蛇头朝向的方向向量（用于渲染眼睛/舌头）
  get dirX() { return Math.cos(this.angle); }
  get dirY() { return Math.sin(this.angle); }

  // 设置移动角度（弧度）
  setAngle(rad) { this.angle = rad; }

  // 每帧更新
  update(dt) {
    if (this.invincibleTimer > 0) this.invincibleTimer -= dt;

    // 按速度计算移动距离
    const px = this.speed * C * dt / 1000;
    this.headX += Math.cos(this.angle) * px;
    this.headY += Math.sin(this.angle) * px;

    // 记录轨迹
    this.trail.unshift({ x: this.headX, y: this.headY });

    // 限制轨迹长度
    const maxTrail = (this.segments + this.growQueue + 5) * Math.ceil(SEG) + 200;
    if (this.trail.length > maxTrail) this.trail.length = maxTrail;

    // 从轨迹重建身体
    this.body = this._buildBody();
  }

  // 沿轨迹按固定间距取身体段位置
  _buildBody() {
    const body = [{ x: this.trail[0].x, y: this.trail[0].y }];
    let acc = 0;
    let nextAt = SEG;
    for (let i = 1; i < this.trail.length; i++) {
      const dx = this.trail[i].x - this.trail[i - 1].x;
      const dy = this.trail[i].y - this.trail[i - 1].y;
      const d = Math.sqrt(dx * dx + dy * dy);
      acc += d;
      if (acc >= nextAt) {
        // 线性插值到精确位置
        const over = acc - nextAt;
        const t = d > 0 ? (d - over) / d : 0;
        body.push({
          x: this.trail[i - 1].x + (this.trail[i].x - this.trail[i - 1].x) * t,
          y: this.trail[i - 1].y + (this.trail[i].y - this.trail[i - 1].y) * t,
        });
        nextAt += SEG;
        if (body.length >= this.segments) break;
      }
    }
    return body;
  }

  // 增长
  grow(amount) {
    this.segments += amount;
    this.growQueue += amount;
  }

  // 受伤，缩短身体
  takeDamage(enemyAttack) {
    if (this.invincibleTimer > 0) return 0;
    const dmg = Math.max(1, enemyAttack - this.defense);
    const removed = Math.min(dmg, this.segments - 1);
    this.segments -= removed;
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

  // 某格子坐标是否被蛇身覆盖（用于道具避让）
  occupies(gx, gy) {
    const px = gx * C + C / 2;
    const py = gy * C + C / 2;
    const t2 = (C * 0.9) * (C * 0.9);
    return this.body.some(s => (s.x - px) ** 2 + (s.y - py) ** 2 < t2);
  }
}
