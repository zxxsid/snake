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

  get alive() {
    return this.hp > 0;
  }

  update(dt, targetX, targetY) {
    this.moveTimer += dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;

    const moveInterval = 1000 / this.type.speed;
    while (this.moveTimer >= moveInterval) {
      this.moveTimer -= moveInterval;
      this.moveToward(targetX, targetY);
    }
  }

  moveToward(tx, ty) {
    const cols = CONFIG.GRID_COLS;
    const rows = CONFIG.GRID_ROWS;

    let dx = tx - this.x;
    let dy = ty - this.y;

    // 处理穿墙最短路径
    if (Math.abs(dx) > cols / 2) dx = dx > 0 ? dx - cols : dx + cols;
    if (Math.abs(dy) > rows / 2) dy = dy > 0 ? dy - rows : dy + rows;

    if (Math.abs(dx) >= Math.abs(dy)) {
      this.x = (this.x + Math.sign(dx) + cols) % cols;
    } else {
      this.y = (this.y + Math.sign(dy) + rows) % rows;
    }
  }

  tryAttack(dt, snakeBody) {
    this.attackTimer += dt;
    if (this.attackTimer < this.type.attackInterval) return 0;

    const overlapping = snakeBody.some(s => s.x === this.x && s.y === this.y);
    if (overlapping) {
      this.attackTimer = 0;
      return this.type.attack;
    }
    return 0;
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.hitFlash = 200;
  }
}

export class EnemyManager {
  constructor() {
    this.enemies = [];
    this.spawnTimer = 0;
    this.firstSpawnTimer = CONFIG.ENEMY.FIRST_SPAWN_DELAY;
    this.spawningEnabled = false;
  }

  reset() {
    this.enemies = [];
    this.spawnTimer = 0;
    this.firstSpawnTimer = CONFIG.ENEMY.FIRST_SPAWN_DELAY;
    this.spawningEnabled = false;
  }

  update(dt, snake) {
    // 首次刷新延迟
    if (!this.spawningEnabled) {
      this.firstSpawnTimer -= dt;
      if (this.firstSpawnTimer <= 0) {
        this.spawningEnabled = true;
        this.spawnTimer = 0;
      }
    }

    // 定时刷新敌人
    if (this.spawningEnabled) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.enemies.length < CONFIG.ENEMY.MAX_COUNT) {
        this.spawn();
        this.spawnTimer = CONFIG.ENEMY.SPAWN_INTERVAL;
      }
    }

    let totalDamage = 0;
    const head = snake.head;

    for (const enemy of this.enemies) {
      enemy.update(dt, head.x, head.y);

      // 敌人攻击蛇
      const atkDmg = enemy.tryAttack(dt, snake.body);
      if (atkDmg > 0) {
        totalDamage += atkDmg;
      }

      // 蛇头碰到敌人 => 蛇攻击敌人
      if (enemy.x === head.x && enemy.y === head.y && snake.attack > 0) {
        enemy.takeDamage(snake.attack);
      }
    }

    // 移除死亡敌人
    const killed = this.enemies.filter(e => !e.alive).length;
    this.enemies = this.enemies.filter(e => e.alive);

    return { totalDamage, killed };
  }

  spawn() {
    const type = this.pickType();
    const pos = this.randomEdgePosition();
    if (type && pos) {
      this.enemies.push(new Enemy(pos.x, pos.y, type));
    }
  }

  pickType() {
    const types = CONFIG.ENEMY.TYPES;
    const totalWeight = types.reduce((sum, t) => sum + t.weight, 0);
    let rand = Math.random() * totalWeight;
    for (const t of types) {
      rand -= t.weight;
      if (rand <= 0) return t;
    }
    return types[types.length - 1];
  }

  randomEdgePosition() {
    const side = Math.floor(Math.random() * 4);
    switch (side) {
      case 0: return { x: Math.floor(Math.random() * CONFIG.GRID_COLS), y: 0 };
      case 1: return { x: Math.floor(Math.random() * CONFIG.GRID_COLS), y: CONFIG.GRID_ROWS - 1 };
      case 2: return { x: 0, y: Math.floor(Math.random() * CONFIG.GRID_ROWS) };
      case 3: return { x: CONFIG.GRID_COLS - 1, y: Math.floor(Math.random() * CONFIG.GRID_ROWS) };
      default: return { x: 0, y: 0 };
    }
  }
}
