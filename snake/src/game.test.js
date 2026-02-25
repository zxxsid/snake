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
    const old = { ...snake.head };
    snake.move();
    expect(snake.head.x).toBe(old.x + 1);
    expect(snake.head.y).toBe(old.y);
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

  it('无边界自由移动（不穿墙）', () => {
    snake.body = [{ x: 100, y: 100 }];
    snake.direction = DIR.RIGHT;
    snake.nextDirection = DIR.RIGHT;
    snake.move();
    expect(snake.head.x).toBe(101);
  });

  it('长度小于2时alive为false', () => {
    snake.body = [{ x: 0, y: 0 }];
    expect(snake.alive).toBe(false);
  });

  it('道具效果正确', () => {
    const old = snake.speed;
    snake.applyPowerup({ effectType: 'speed', effectValue: 1 });
    expect(snake.speed).toBe(old + 1);
  });
});

describe('PowerUpManager', () => {
  let mgr;
  beforeEach(() => { mgr = new PowerUpManager(); });

  it('在蛇头附近生成道具', () => {
    mgr.spawn(10, 10, () => false);
    expect(mgr.items.length).toBe(1);
    const p = mgr.items[0];
    const dist = Math.sqrt((p.x - 10) ** 2 + (p.y - 10) ** 2);
    expect(dist).toBeLessThanOrEqual(CONFIG.SPAWN_RADIUS + 1);
  });

  it('拾取道具', () => {
    mgr.spawn(0, 0, () => false);
    const p = mgr.items[0];
    const collected = mgr.checkCollection(p.x, p.y);
    expect(collected).not.toBeNull();
    expect(mgr.items.length).toBe(0);
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
  it('在蛇头远处生成敌人', () => {
    const mgr = new EnemyManager();
    mgr.spawn(0, 0);
    expect(mgr.enemies.length).toBe(1);
    const e = mgr.enemies[0];
    const dist = Math.sqrt(e.x ** 2 + e.y ** 2);
    expect(dist).toBeGreaterThanOrEqual(CONFIG.ENEMY.SPAWN_MIN_DIST - 1);
  });
});
