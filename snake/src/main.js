// 游戏入口 - 状态机 + 主循环

import './style.css';
import { Snake } from './snake.js';
import { PowerUpManager } from './powerup.js';
import { EnemyManager } from './enemy.js';
import { Renderer } from './renderer.js';
import { InputHandler } from './input.js';

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

  startGame() {
    this.snake.reset();
    this.powerups.reset();
    this.enemies.reset();
    this.kills = 0;
    this.gameTime = 0;
    this.damageFlashTimer = 0;
    this.state = STATE.PLAYING;
    this.input.playing = true;
  }

  loop(ts) {
    const dt = Math.min(ts - this.lastTimestamp, 100);
    this.lastTimestamp = ts;

    this.processInput();
    if (this.state === STATE.PLAYING) this.update(dt);
    this.render();

    requestAnimationFrame(t => this.loop(t));
  }

  // 处理输入：摇杆/键盘 → 蛇角度
  processInput() {
    if (this.state !== STATE.PLAYING) {
      this.input.playing = false;
      if (this.input.consumeStart()) { this.startGame(); return; }
    }

    if (this.state === STATE.PLAYING) {
      const angle = this.input.getAngle();
      if (angle !== null) this.snake.setAngle(angle);
    }
    this.input.consumeStart();
  }

  update(dt) {
    this.gameTime += dt;
    if (this.damageFlashTimer > 0) this.damageFlashTimer -= dt;

    // 蛇移动（每帧像素级）
    this.snake.update(dt);

    // 拾取道具（像素距离）
    const item = this.powerups.checkCollection(this.snake.headX, this.snake.headY);
    if (item) this.snake.applyPowerup(item.type);

    // 道具刷新（格子坐标）
    const hc = this.snake.headCell;
    this.powerups.update(dt, hc.x, hc.y, (x, y) => this.snake.occupies(x, y));

    // 敌人更新
    const { totalDamage, killed } = this.enemies.update(dt, this.snake);
    this.kills += killed;

    if (totalDamage > 0) {
      this.snake.takeDamage(totalDamage);
      this.damageFlashTimer = 150;
    }

    if (!this.snake.alive) {
      this.state = STATE.GAME_OVER;
      this.input.playing = false;
    }
  }

  render() {
    const r = this.renderer;
    r.clear();
    r.setCamera(this.snake.headX, this.snake.headY);
    r.drawDesertBackground();
    r.drawPowerUps(this.powerups.items);
    r.drawEnemies(this.enemies.enemies);
    r.drawSnake(this.snake);
    r.drawVignette();
    r.drawHUD(this.snake, this.kills, this.gameTime);
    r.drawJoystick(this.input.joystick);

    if (this.damageFlashTimer > 0) r.drawDamageFlash();
    if (this.state === STATE.MENU) r.drawMenu();
    else if (this.state === STATE.GAME_OVER) r.drawGameOver(this.snake, this.kills, this.gameTime);
  }
}

new Game();
