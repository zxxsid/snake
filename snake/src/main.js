// 游戏入口 - 状态机 + 主循环

import './style.css';
import { Snake } from './snake.js';
import { PowerUpManager } from './powerup.js';
import { EnemyManager } from './enemy.js';
import { Renderer } from './renderer.js';
import { InputHandler } from './input.js';

// 游戏状态
const STATE = { MENU: 0, PLAYING: 1, GAME_OVER: 2 };

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.renderer = new Renderer(this.canvas);
    this.input = new InputHandler(this.canvas);

    this.snake = new Snake();
    this.powerups = new PowerUpManager();
    this.enemies = new EnemyManager();

    this.state = STATE.MENU;
    this.kills = 0;
    this.gameTime = 0;
    this.damageFlashTimer = 0;
    this.lastTimestamp = 0;

    window.addEventListener('resize', () => this.renderer.resize());
    requestAnimationFrame(ts => this.loop(ts));
  }

  // 开始/重新开始游戏
  startGame() {
    this.snake.reset();
    this.powerups.reset();
    this.enemies.reset();
    this.kills = 0;
    this.gameTime = 0;
    this.damageFlashTimer = 0;
    this.state = STATE.PLAYING;
  }

  // 主循环
  loop(ts) {
    const dt = Math.min(ts - this.lastTimestamp, 100);
    this.lastTimestamp = ts;

    this.processInput();
    if (this.state === STATE.PLAYING) this.update(dt);
    this.render();

    requestAnimationFrame(t => this.loop(t));
  }

  // 处理输入
  processInput() {
    if (this.state !== STATE.PLAYING) {
      if (this.input.consumeStart()) { this.startGame(); return; }
    }
    if (this.state === STATE.PLAYING) {
      let dir = this.input.consumeDirection();
      while (dir) { this.snake.setDirection(dir); dir = this.input.consumeDirection(); }
    }
    this.input.consumeStart();
  }

  // 游戏逻辑更新
  update(dt) {
    this.gameTime += dt;
    if (this.damageFlashTimer > 0) this.damageFlashTimer -= dt;

    // 蛇移动
    const moved = this.snake.update(dt);
    if (moved) {
      // 拾取道具
      const item = this.powerups.checkCollection(this.snake.head.x, this.snake.head.y);
      if (item) this.snake.applyPowerup(item.type);
    }

    // 道具刷新（以蛇头为中心）
    this.powerups.update(dt, this.snake.head.x, this.snake.head.y,
      (x, y) => this.snake.occupies(x, y));

    // 敌人更新
    const { totalDamage, killed } = this.enemies.update(dt, this.snake);
    this.kills += killed;

    // 蛇受伤
    if (totalDamage > 0) {
      this.snake.takeDamage(totalDamage);
      this.damageFlashTimer = 150;
    }

    // 判定结束
    if (!this.snake.alive) this.state = STATE.GAME_OVER;
  }

  // 渲染
  render() {
    const r = this.renderer;
    r.clear();
    r.setCamera(this.snake.head);
    r.drawDesertBackground();
    r.drawPowerUps(this.powerups.items);
    r.drawEnemies(this.enemies.enemies);
    r.drawSnake(this.snake);
    r.drawVignette();
    r.drawHUD(this.snake, this.kills, this.gameTime);

    if (this.damageFlashTimer > 0) r.drawDamageFlash();
    if (this.state === STATE.MENU) r.drawMenu();
    else if (this.state === STATE.GAME_OVER) r.drawGameOver(this.snake, this.kills, this.gameTime);
  }
}

new Game();
