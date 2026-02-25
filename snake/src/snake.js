import { CONFIG } from './config.js';

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

  reset() {
    const mid = Math.floor(CONFIG.GRID_COLS / 2);
    const midY = Math.floor(CONFIG.GRID_ROWS / 2);
    this.body = [];
    for (let i = 0; i < CONFIG.SNAKE.INITIAL_LENGTH; i++) {
      this.body.push({ x: mid - i, y: midY });
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

  get head() {
    return this.body[0];
  }

  get length() {
    return this.body.length;
  }

  get alive() {
    return this.body.length >= CONFIG.SNAKE.MIN_LENGTH;
  }

  setDirection(dir) {
    const isOpposite = this.direction.x + dir.x === 0 && this.direction.y + dir.y === 0;
    if (!isOpposite) {
      this.nextDirection = dir;
    }
  }

  update(dt) {
    if (this.invincibleTimer > 0) {
      this.invincibleTimer -= dt;
    }
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

  move() {
    this.direction = this.nextDirection;
    const h = this.head;
    const newHead = {
      x: (h.x + this.direction.x + CONFIG.GRID_COLS) % CONFIG.GRID_COLS,
      y: (h.y + this.direction.y + CONFIG.GRID_ROWS) % CONFIG.GRID_ROWS,
    };
    this.body.unshift(newHead);
    if (this.growQueue > 0) {
      this.growQueue--;
    } else {
      this.body.pop();
    }
  }

  grow(amount) {
    this.growQueue += amount;
  }

  takeDamage(enemyAttack) {
    if (this.invincibleTimer > 0) return 0;
    const dmg = Math.max(1, enemyAttack - this.defense);
    const removed = Math.min(dmg, this.body.length - 1);
    for (let i = 0; i < removed; i++) {
      this.body.pop();
    }
    this.invincibleTimer = 500;
    return removed;
  }

  applyPowerup(type) {
    switch (type.effectType) {
      case 'length':
        this.grow(type.effectValue);
        break;
      case 'speed':
        this.speed = Math.min(this.speed + type.effectValue, CONFIG.SNAKE.MAX_SPEED);
        break;
      case 'attack':
        this.attack += type.effectValue;
        break;
      case 'defense':
        this.defense += type.effectValue;
        break;
    }
  }

  occupies(x, y) {
    return this.body.some(s => s.x === x && s.y === y);
  }
}

export { DIR };
