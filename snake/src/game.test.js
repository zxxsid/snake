import { describe, it, expect, beforeEach } from 'vitest';
import { Snake } from './snake.js';
import { PowerUpManager } from './powerup.js';
import { Enemy, EnemyManager } from './enemy.js';
import { CONFIG } from './config.js';

const C = CONFIG.CELL_SIZE;

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

  it('更新后蛇头位置变化', () => {
    snake.setAngle(0);
    const oldX = snake.headX;
    snake.update(100);
    expect(snake.headX).toBeGreaterThan(oldX);
  });

  it('设置角度后方向改变', () => {
    snake.setAngle(Math.PI / 2);
    const oldY = snake.headY;
    snake.update(100);
    expect(snake.headY).toBeGreaterThan(oldY);
  });

  it('支持8方向/任意角度', () => {
    snake.setAngle(Math.PI / 4);
    snake.update(200);
    expect(snake.headX).toBeGreaterThan(0);
    expect(snake.headY).toBeGreaterThan(0);
  });

  it('增长后segments增加', () => {
    const old = snake.segments;
    snake.grow(3);
    expect(snake.segments).toBe(old + 3);
  });

  it('受伤后segments减少', () => {
    snake.grow(5);
    const old = snake.segments;
    const removed = snake.takeDamage(2);
    expect(removed).toBe(2);
    expect(snake.segments).toBe(old - 2);
  });

  it('防御力减免伤害', () => {
    snake.grow(5);
    snake.defense = 1;
    const removed = snake.takeDamage(2);
    expect(removed).toBe(1);
  });

  it('无限地图自由移动', () => {
    snake.setAngle(0);
    for (let i = 0; i < 100; i++) snake.update(16);
    expect(snake.headX).toBeGreaterThan(100);
  });

  it('长度小于2时alive为false', () => {
    snake.takeDamage(100);
    expect(snake.alive).toBe(false);
  });

  it('身体段沿轨迹排列', () => {
    snake.setAngle(0);
    for (let i = 0; i < 50; i++) snake.update(16);
    expect(snake.body.length).toBeGreaterThanOrEqual(2);
    expect(snake.body[0].x).toBeGreaterThan(snake.body[1].x);
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

  it('像素距离拾取道具', () => {
    mgr.spawn(0, 0, () => false);
    const p = mgr.items[0];
    const px = p.x * C + C / 2, py = p.y * C + C / 2;
    const collected = mgr.checkCollection(px, py);
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

  it('像素距离攻击检测', () => {
    const e = new Enemy(0, 0, testType);
    e.attackTimer = testType.attackInterval;
    const body = [{ x: C / 2, y: C / 2 }];
    const dmg = e.tryAttack(0, body);
    expect(dmg).toBe(testType.attack);
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
