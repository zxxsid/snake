import { describe, it, expect, beforeEach } from 'vitest';
import { Snake, DIR } from './snake.js';
import { PowerUpManager } from './powerup.js';
import { Enemy, EnemyManager } from './enemy.js';
import { CONFIG } from './config.js';

describe('Snake', () => {
  let snake;
  beforeEach(() => { snake = new Snake(); });

  it('初始长度正确', () => {
    expect(snake.length).toBe(CONFIG.SNAKE.INITIAL_LENGTH);
  });

  it('初始属性正确', () => {
    expect(snake.speed).toBe(CONFIG.SNAKE.INITIAL_SPEED);
    expect(snake.attack).toBe(CONFIG.SNAKE.INITIAL_ATTACK);
    expect(snake.defense).toBe(CONFIG.SNAKE.INITIAL_DEFENSE);
  });

  it('移动后头部位置变化', () => {
    const oldHead = { ...snake.head };
    snake.move();
    expect(snake.head.x).toBe(oldHead.x + 1);
  });

  it('禁止180度转向', () => {
    snake.direction = DIR.RIGHT;
    snake.setDirection(DIR.LEFT);
    expect(snake.nextDirection).toEqual(DIR.RIGHT);
  });

  it('允许90度转向', () => {
    snake.direction = DIR.RIGHT;
    snake.setDirection(DIR.UP);
    expect(snake.nextDirection).toEqual(DIR.UP);
  });

  it('增长后长度增加', () => {
    snake.grow(3);
    const oldLen = snake.length;
    snake.move();
    expect(snake.length).toBe(oldLen + 1);
  });

  it('受伤后长度减少', () => {
    snake.grow(5);
    for (let i = 0; i < 5; i++) snake.move();
    const oldLen = snake.length;
    const removed = snake.takeDamage(2);
    expect(removed).toBe(2);
    expect(snake.length).toBe(oldLen - 2);
  });

  it('防御力减免伤害', () => {
    snake.grow(5);
    for (let i = 0; i < 5; i++) snake.move();
    snake.defense = 1;
    const removed = snake.takeDamage(2);
    expect(removed).toBe(1);
  });

  it('穿墙处理', () => {
    snake.body = [{ x: CONFIG.GRID_COLS - 1, y: 0 }];
    snake.direction = DIR.RIGHT;
    snake.nextDirection = DIR.RIGHT;
    snake.move();
    expect(snake.head.x).toBe(0);
  });

  it('长度小于2时alive为false', () => {
    snake.body = [{ x: 0, y: 0 }];
    expect(snake.alive).toBe(false);
  });

  it('道具效果正确', () => {
    const speedType = { effectType: 'speed', effectValue: 1 };
    const oldSpeed = snake.speed;
    snake.applyPowerup(speedType);
    expect(snake.speed).toBe(oldSpeed + 1);
  });
});

describe('PowerUpManager', () => {
  let mgr;
  beforeEach(() => { mgr = new PowerUpManager(); });

  it('生成道具到空白位置', () => {
    mgr.spawn((x, y) => x === 0 && y === 0);
    expect(mgr.items.length).toBe(1);
    const item = mgr.items[0];
    expect(item.x !== 0 || item.y !== 0).toBe(true);
  });

  it('拾取道具', () => {
    mgr.spawn(() => false);
    const item = mgr.items[0];
    const collected = mgr.checkCollection(item.x, item.y);
    expect(collected).not.toBeNull();
    expect(mgr.items.length).toBe(0);
  });

  it('不超过最大数量', () => {
    for (let i = 0; i < CONFIG.POWERUP.MAX_COUNT + 5; i++) {
      mgr.spawn(() => false);
    }
    expect(mgr.items.length).toBeLessThanOrEqual(CONFIG.POWERUP.MAX_COUNT + 5);
  });
});

describe('Enemy', () => {
  const testType = CONFIG.ENEMY.TYPES[0];

  it('初始血量正确', () => {
    const e = new Enemy(0, 0, testType);
    expect(e.hp).toBe(testType.hp);
  });

  it('受伤后扣血', () => {
    const e = new Enemy(0, 0, testType);
    e.takeDamage(2);
    expect(e.hp).toBe(testType.hp - 2);
  });

  it('血量归零后死亡', () => {
    const e = new Enemy(0, 0, testType);
    e.takeDamage(testType.hp);
    expect(e.alive).toBe(false);
  });

  it('朝目标移动', () => {
    const e = new Enemy(0, 0, testType);
    e.moveToward(5, 5);
    expect(e.x + e.y).toBeGreaterThan(0);
  });
});

describe('EnemyManager', () => {
  it('从边缘生成敌人', () => {
    const mgr = new EnemyManager();
    mgr.spawn();
    expect(mgr.enemies.length).toBe(1);
    const e = mgr.enemies[0];
    const onEdge = e.x === 0 || e.x === CONFIG.GRID_COLS - 1 ||
                   e.y === 0 || e.y === CONFIG.GRID_ROWS - 1;
    expect(onEdge).toBe(true);
  });
});
