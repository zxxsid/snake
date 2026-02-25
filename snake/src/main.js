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
  }

  loop(ts) {
    const dt = Math.min(ts - this.lastTimestamp, 100);
    this.lastTimestamp = ts;

    this.processInput();
    if (this.state === STATE.PLAYING) {
      this.update(dt);
    }
    this.render();

    requestAnimationFrame(t => this.loop(t));
  }

  processInput() {
    if (this.state === STATE.MENU || this.state === STATE.GAME_OVER) {
      if (this.input.consumeStart()) {
        this.startGame();
        return;
      }
    }

    if (this.state === STATE.PLAYING) {
      // 消费所有排队的方向输入
      let dir = this.input.consumeDirection();
      while (dir) {
        this.snake.setDirection(dir);
        dir = this.input.consumeDirection();
      }
    }

    // 清空未消费的事件
    this.input.consumeStart();
  }

  update(dt) {
    this.gameTime += dt;
    if (this.damageFlashTimer > 0) this.damageFlashTimer -= dt;

    // 蛇移动
    const snakeMoved = this.snake.update(dt);

    if (snakeMoved) {
      // 拾取道具
      const collected = this.powerups.checkCollection(this.snake.head.x, this.snake.head.y);
      if (collected) {
        this.snake.applyPowerup(collected.type);
      }
    }

    // 刷新道具
    this.powerups.update(dt, (x, y) => this.snake.occupies(x, y));

    // 敌人更新
    const { totalDamage, killed } = this.enemies.update(dt, this.snake);
    this.kills += killed;

    // 蛇受伤
    if (totalDamage > 0) {
      this.snake.takeDamage(totalDamage);
      this.damageFlashTimer = 150;
    }

    // 判定游戏结束
    if (!this.snake.alive) {
      this.state = STATE.GAME_OVER;
    }
  }

  render() {
    this.renderer.clear();
    this.renderer.drawGrid();
    this.renderer.drawPowerUps(this.powerups.items);
    this.renderer.drawEnemies(this.enemies.enemies);
    this.renderer.drawSnake(this.snake);
    this.renderer.drawHUD(this.snake, this.kills, this.gameTime);

    if (this.damageFlashTimer > 0) {
      this.renderer.drawDamageFlash();
    }

    if (this.state === STATE.MENU) {
      this.renderer.drawMenu();
    } else if (this.state === STATE.GAME_OVER) {
      this.renderer.drawGameOver(this.snake, this.kills, this.gameTime);
    }
  }
}

new Game();
