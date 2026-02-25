import { CONFIG } from './config.js';

const C = CONFIG.CELL_SIZE;
const HUD = CONFIG.HUD_HEIGHT;

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
  }

  resize() {
    const gameW = CONFIG.GRID_COLS * C;
    const gameH = CONFIG.GRID_ROWS * C;
    const totalH = gameH + HUD;

    const scaleX = window.innerWidth / gameW;
    const scaleY = window.innerHeight / totalH;
    const scale = Math.min(scaleX, scaleY, 1.5);

    this.canvas.width = Math.floor(gameW * scale);
    this.canvas.height = Math.floor(totalH * scale);
    this.scale = scale;
    this.gameW = gameW;
    this.gameH = gameH;
  }

  clear() {
    const ctx = this.ctx;
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.fillStyle = '#0a0a2e';
    ctx.fillRect(0, 0, this.gameW, this.gameH + HUD);
  }

  drawGrid() {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= CONFIG.GRID_COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * C, HUD);
      ctx.lineTo(x * C, HUD + this.gameH);
      ctx.stroke();
    }
    for (let y = 0; y <= CONFIG.GRID_ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, HUD + y * C);
      ctx.lineTo(this.gameW, HUD + y * C);
      ctx.stroke();
    }
  }

  drawSnake(snake) {
    const ctx = this.ctx;
    const len = snake.body.length;
    const flicker = snake.invincibleTimer > 0 && Math.floor(snake.invincibleTimer / 80) % 2 === 0;
    if (flicker) return;

    for (let i = len - 1; i >= 0; i--) {
      const seg = snake.body[i];
      const t = 1 - (i / len) * 0.6;
      const r = Math.round(0 * t);
      const g = Math.round(220 * t);
      const b = Math.round(130 + 125 * t);
      ctx.fillStyle = `rgb(${r},${g},${b})`;

      const px = seg.x * C;
      const py = HUD + seg.y * C;

      if (i === 0) {
        ctx.beginPath();
        ctx.arc(px + C / 2, py + C / 2, C / 2 - 1, 0, Math.PI * 2);
        ctx.fill();
        // 眼睛
        ctx.fillStyle = '#fff';
        const ex = px + C / 2 + snake.direction.x * 3;
        const ey = py + C / 2 + snake.direction.y * 3;
        ctx.beginPath();
        ctx.arc(ex, ey, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(ex + snake.direction.x, ey + snake.direction.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(px + 1, py + 1, C - 2, C - 2);
      }
    }
  }

  drawPowerUps(powerups) {
    const ctx = this.ctx;
    for (const p of powerups) {
      const px = p.x * C;
      const py = HUD + p.y * C;
      const s = p.pulseScale;

      ctx.save();
      ctx.translate(px + C / 2, py + C / 2);
      ctx.scale(s, s);

      // 背景圆
      ctx.fillStyle = p.type.color + '33';
      ctx.beginPath();
      ctx.arc(0, 0, C / 2 - 1, 0, Math.PI * 2);
      ctx.fill();

      // 边框
      ctx.strokeStyle = p.type.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 符号
      ctx.fillStyle = p.type.color;
      ctx.font = `bold ${C * 0.55}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.type.symbol, 0, 1);

      ctx.restore();
    }
  }

  drawEnemies(enemies) {
    const ctx = this.ctx;
    for (const e of enemies) {
      const px = e.x * C;
      const py = HUD + e.y * C;
      const flash = e.hitFlash > 0;

      // 身体
      ctx.fillStyle = flash ? '#fff' : e.type.color;
      ctx.beginPath();
      ctx.arc(px + C / 2, py + C / 2, C / 2 - 1, 0, Math.PI * 2);
      ctx.fill();

      // 类型符号
      ctx.fillStyle = flash ? '#000' : '#fff';
      ctx.font = `bold ${C * 0.5}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(e.type.symbol, px + C / 2, py + C / 2 + 1);

      // 血条
      const barW = C - 4;
      const barH = 3;
      const barX = px + 2;
      const barY = py - 2;
      const hpRatio = e.hp / e.maxHp;

      ctx.fillStyle = '#333';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = hpRatio > 0.5 ? '#4f4' : hpRatio > 0.25 ? '#ff4' : '#f44';
      ctx.fillRect(barX, barY, barW * hpRatio, barH);
    }
  }

  drawHUD(snake, kills, time) {
    const ctx = this.ctx;

    // HUD 背景
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, this.gameW, HUD);

    // 分隔线
    ctx.strokeStyle = '#00dca8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, HUD);
    ctx.lineTo(this.gameW, HUD);
    ctx.stroke();

    const stats = [
      { icon: '♥', value: snake.length, color: '#ff4444' },
      { icon: '⚡', value: snake.speed, color: '#44ff44' },
      { icon: '⚔', value: snake.attack, color: '#ffaa00' },
      { icon: '◆', value: snake.defense, color: '#4488ff' },
    ];

    ctx.font = 'bold 15px sans-serif';
    const startX = 10;
    const y1 = 25;

    stats.forEach((s, i) => {
      const x = startX + i * 80;
      ctx.fillStyle = s.color;
      ctx.textAlign = 'left';
      ctx.fillText(s.icon, x, y1);
      ctx.fillStyle = '#eee';
      ctx.fillText(` ${s.value}`, x + 16, y1);
    });

    // 击杀数
    ctx.fillStyle = '#ccc';
    ctx.textAlign = 'left';
    ctx.fillText(`击杀: ${kills}`, startX, y1 + 25);

    // 时间
    const sec = Math.floor(time / 1000);
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const ss = String(sec % 60).padStart(2, '0');
    ctx.textAlign = 'right';
    ctx.fillStyle = '#aaa';
    ctx.fillText(`${m}:${ss}`, this.gameW - 10, y1);

    // 提示
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#666';
    ctx.textAlign = 'right';
    ctx.fillText('方向键/滑动控制', this.gameW - 10, y1 + 25);
  }

  drawMenu() {
    const ctx = this.ctx;
    const cx = this.gameW / 2;
    const cy = HUD + this.gameH / 2;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, HUD, this.gameW, this.gameH);

    ctx.fillStyle = '#00dca8';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('贪吃蛇 RPG', cx, cy - 60);

    ctx.fillStyle = '#eee';
    ctx.font = '16px sans-serif';
    ctx.fillText('收集道具 · 击败敌人 · 活下去', cx, cy - 15);

    ctx.fillStyle = '#00dca8';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('点击 或 按空格键 开始', cx, cy + 40);

    // 规则提示
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#888';
    const rules = [
      '♥ 长度   ⚡ 速度   ⚔ 攻击   ◆ 防御',
      '蛇长度 < 2 时游戏结束',
    ];
    rules.forEach((r, i) => {
      ctx.fillText(r, cx, cy + 90 + i * 22);
    });
  }

  drawGameOver(snake, kills, time) {
    const ctx = this.ctx;
    const cx = this.gameW / 2;
    const cy = HUD + this.gameH / 2;

    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, HUD, this.gameW, this.gameH);

    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('游戏结束', cx, cy - 60);

    const sec = Math.floor(time / 1000);
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const ss = String(sec % 60).padStart(2, '0');

    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#eee';
    const lines = [
      `存活时间: ${m}:${ss}`,
      `击杀敌人: ${kills}`,
      `最终长度: ${snake.length}`,
      `攻击力: ${snake.attack}   防御力: ${snake.defense}`,
    ];
    lines.forEach((l, i) => {
      ctx.fillText(l, cx, cy - 10 + i * 28);
    });

    ctx.fillStyle = '#00dca8';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('点击 或 按空格键 重新开始', cx, cy + 110);
  }

  drawDamageFlash() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(255,0,0,0.15)';
    ctx.fillRect(0, HUD, this.gameW, this.gameH);
  }
}
