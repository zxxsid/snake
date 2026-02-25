// 渲染器 - 摄像机跟随 + 沙漠背景 + 卡通风格 + 摇杆

import { CONFIG } from './config.js';

const C = CONFIG.CELL_SIZE;

// 确定性哈希 - 根据格子坐标生成固定随机值（沙漠装饰）
function cellHash(x, y) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) & 0x7fffffff;
}

// 圆角矩形路径
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camera = { x: 0, y: 0 };
    this.resize();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  // 摄像机跟随蛇头（像素坐标）
  setCamera(headX, headY) {
    this.camera.x = headX - this.canvas.width / 2;
    this.camera.y = headY - this.canvas.height / 2;
  }

  // 世界像素 → 屏幕像素
  wp(px, py) { return { x: px - this.camera.x, y: py - this.camera.y }; }
  // 格子 → 屏幕像素
  gp(gx, gy) { return { x: gx * C - this.camera.x, y: gy * C - this.camera.y }; }

  clear() { this.ctx.setTransform(1, 0, 0, 1, 0, 0); }

  // === 沙漠背景 ===
  drawDesertBackground() {
    const ctx = this.ctx;
    const w = this.canvas.width, h = this.canvas.height;
    const [bR, bG, bB] = CONFIG.THEME.SAND_BASE;

    ctx.fillStyle = `rgb(${bR},${bG},${bB})`;
    ctx.fillRect(0, 0, w, h);

    const c0 = Math.floor(this.camera.x / C) - 1;
    const r0 = Math.floor(this.camera.y / C) - 1;
    const c1 = Math.ceil((this.camera.x + w) / C) + 1;
    const r1 = Math.ceil((this.camera.y + h) / C) + 1;

    // 沙地纹理
    for (let col = c0; col <= c1; col++) {
      for (let row = r0; row <= r1; row++) {
        const hv = cellHash(col, row);
        const shade = (hv % 16) - 8;
        if (Math.abs(shade) > 3) {
          ctx.fillStyle = `rgb(${bR + shade},${bG + shade},${bB + (shade * 0.6 | 0)})`;
          ctx.fillRect(col * C - this.camera.x, row * C - this.camera.y, C, C);
        }
      }
    }

    // 沙丘波纹
    ctx.strokeStyle = 'rgba(200,175,120,0.2)';
    ctx.lineWidth = 1;
    for (let row = r0; row <= r1; row += 3) {
      const sy = row * C - this.camera.y;
      ctx.beginPath();
      for (let col = c0; col <= c1; col++) {
        const sx = col * C - this.camera.x;
        const wave = Math.sin((col + row * 0.7) * 0.4) * 4;
        col === c0 ? ctx.moveTo(sx, sy + wave) : ctx.lineTo(sx, sy + wave);
      }
      ctx.stroke();
    }

    // 网格线
    ctx.strokeStyle = 'rgba(180,150,100,0.1)';
    ctx.lineWidth = 0.5;
    for (let col = c0; col <= c1; col++) {
      const sx = col * C - this.camera.x;
      ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, h); ctx.stroke();
    }
    for (let row = r0; row <= r1; row++) {
      const sy = row * C - this.camera.y;
      ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(w, sy); ctx.stroke();
    }

    // 装饰物
    for (let col = c0; col <= c1; col++) {
      for (let row = r0; row <= r1; row++) {
        const hv = cellHash(col, row);
        const sx = col * C - this.camera.x + C / 2;
        const sy = row * C - this.camera.y + C / 2;
        if (hv % 47 === 0) this.drawCactus(sx, sy, hv);
        else if (hv % 61 === 0) this.drawRock(sx, sy, hv);
        else if (hv % 83 === 0) this.drawBush(sx, sy);
      }
    }
  }

  drawCactus(cx, cy, hv) {
    const ctx = this.ctx;
    ctx.fillStyle = CONFIG.THEME.CACTUS_FILL;
    ctx.strokeStyle = CONFIG.THEME.CACTUS_STROKE;
    ctx.lineWidth = 1.5;
    const s = C * 0.7;
    roundRect(ctx, cx - s * 0.15, cy - s * 0.55, s * 0.3, s * 1.1, 3);
    ctx.fill(); ctx.stroke();
    if (hv % 3 !== 0) {
      roundRect(ctx, cx - s * 0.5, cy - s * 0.15, s * 0.38, s * 0.18, 2); ctx.fill(); ctx.stroke();
      roundRect(ctx, cx - s * 0.5, cy - s * 0.45, s * 0.18, s * 0.35, 2); ctx.fill(); ctx.stroke();
    }
    if (hv % 5 !== 0) {
      roundRect(ctx, cx + s * 0.12, cy + s * 0.05, s * 0.38, s * 0.18, 2); ctx.fill(); ctx.stroke();
      roundRect(ctx, cx + s * 0.35, cy - s * 0.25, s * 0.18, s * 0.35, 2); ctx.fill(); ctx.stroke();
    }
  }

  drawRock(cx, cy, hv) {
    const ctx = this.ctx;
    const rw = C * (0.35 + (hv % 7) * 0.03), rh = C * (0.25 + (hv % 5) * 0.02);
    ctx.fillStyle = CONFIG.THEME.ROCK_FILL; ctx.strokeStyle = CONFIG.THEME.ROCK_STROKE; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(cx, cy + 2, rw, rh, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath(); ctx.ellipse(cx - rw * 0.2, cy - rh * 0.1, rw * 0.3, rh * 0.4, -0.3, 0, Math.PI * 2); ctx.fill();
  }

  drawBush(cx, cy) {
    const ctx = this.ctx;
    ctx.fillStyle = '#A8B060'; ctx.strokeStyle = '#7A8840'; ctx.lineWidth = 1;
    const r = C * 0.22;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx - r * 0.7, cy + r * 0.3, r * 0.7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + r * 0.7, cy + r * 0.2, r * 0.65, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }

  // === 卡通蛇（像素坐标身体） ===
  drawSnake(snake) {
    const ctx = this.ctx;
    const body = snake.body;
    const len = body.length;
    if (len === 0) return;
    const blink = snake.invincibleTimer > 0 && Math.floor(snake.invincibleTimer / 80) % 2 === 0;
    if (blink) return;

    const r = C / 2 - 1;

    // 从尾到头绘制圆形身体段
    for (let i = len - 1; i >= 0; i--) {
      const s = this.wp(body[i].x, body[i].y);
      const t = 1 - (i / Math.max(len, 1)) * 0.45;

      // 描边
      ctx.fillStyle = '#2E5A1E';
      ctx.beginPath(); ctx.arc(s.x, s.y, r + 2, 0, Math.PI * 2); ctx.fill();
      // 填充
      ctx.fillStyle = `rgb(${60 + 30 * t | 0},${130 + 70 * t | 0},${40 + 30 * t | 0})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fill();
      // 高光
      ctx.fillStyle = `rgba(255,255,255,${0.22 * t})`;
      ctx.beginPath(); ctx.arc(s.x - r * 0.25, s.y - r * 0.25, r * 0.35, 0, Math.PI * 2); ctx.fill();
    }

    // 蛇头特征
    this._drawHead(snake);
  }

  _drawHead(snake) {
    const ctx = this.ctx;
    const s = this.wp(snake.headX, snake.headY);
    const dx = snake.dirX, dy = snake.dirY;
    const px = -dy, py = dx;

    // 双眼
    const eo = 3.5;
    for (const side of [-1, 1]) {
      const ex = s.x + dx * 3 + px * eo * side;
      const ey = s.y + dy * 3 + py * eo * side;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(ex, ey, 3.8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(ex + dx * 1.2, ey + dy * 1.2, 2, 0, Math.PI * 2); ctx.fill();
    }

    // 舌头
    const tx = s.x + dx * (C / 2 + 2), ty = s.y + dy * (C / 2 + 2);
    const tx2 = tx + dx * 5, ty2 = ty + dy * 5;
    ctx.strokeStyle = '#E53935'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx2, ty2); ctx.stroke();
    const fk = 3;
    ctx.beginPath(); ctx.moveTo(tx2, ty2);
    ctx.lineTo(tx2 + dx * fk + px * fk, ty2 + dy * fk + py * fk); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tx2, ty2);
    ctx.lineTo(tx2 + dx * fk - px * fk, ty2 + dy * fk - py * fk); ctx.stroke();
  }

  // === 道具（格子坐标） ===
  drawPowerUps(powerups) {
    const ctx = this.ctx;
    for (const p of powerups) {
      const s = this.gp(p.x, p.y);
      const cx = s.x + C / 2, cy = s.y + C / 2;
      const sc = p.pulseScale;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc);
      ctx.fillStyle = p.type.color + '30'; ctx.strokeStyle = p.type.color; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, C / 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath(); ctx.arc(-2, -3, C * 0.18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = p.type.color; ctx.font = `bold ${C * 0.52}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(p.type.symbol, 0, 1);
      ctx.restore();
    }
  }

  // === 敌人（格子坐标） ===
  drawEnemies(enemies) {
    const ctx = this.ctx;
    for (const e of enemies) {
      const s = this.gp(e.x, e.y);
      const cx = s.x + C / 2, cy = s.y + C / 2, r = C / 2;
      const flash = e.hitFlash > 0;

      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath(); ctx.ellipse(cx, cy + r + 2, r * 0.7, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = flash ? '#fff' : '#3E2723';
      ctx.beginPath(); ctx.arc(cx, cy, r + 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = flash ? '#eee' : e.type.color;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = flash ? '#333' : '#fff';
      ctx.font = `bold ${C * 0.48}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(e.type.symbol, cx, cy + 1);

      const bw = C + 4, bh = 5, bx = cx - bw / 2, by = cy - r - 8;
      const hp = e.hp / e.maxHp;
      roundRect(ctx, bx, by, bw, bh, 2); ctx.fillStyle = '#444'; ctx.fill();
      ctx.strokeStyle = '#222'; ctx.lineWidth = 1; ctx.stroke();
      if (hp > 0) {
        roundRect(ctx, bx + 1, by + 1, (bw - 2) * hp, bh - 2, 1.5);
        ctx.fillStyle = hp > 0.5 ? '#4CAF50' : hp > 0.25 ? '#FFC107' : '#F44336'; ctx.fill();
      }
    }
  }

  // === 虚拟摇杆 ===
  drawJoystick(joystick) {
    if (!joystick.active) return;
    const ctx = this.ctx;
    const { baseX, baseY, knobX, knobY } = joystick;
    const bR = CONFIG.JOYSTICK.BASE_RADIUS;
    const kR = CONFIG.JOYSTICK.KNOB_RADIUS;

    // 底座
    ctx.fillStyle = 'rgba(60,35,10,0.2)';
    ctx.strokeStyle = 'rgba(210,160,74,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(baseX, baseY, bR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    // 方向指示线
    ctx.strokeStyle = 'rgba(210,160,74,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(baseX, baseY); ctx.lineTo(knobX, knobY); ctx.stroke();

    // 摇杆
    ctx.fillStyle = 'rgba(210,160,74,0.55)';
    ctx.strokeStyle = 'rgba(255,220,120,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(knobX, knobY, kR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    // 摇杆高光
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath(); ctx.arc(knobX - kR * 0.2, knobY - kR * 0.2, kR * 0.35, 0, Math.PI * 2); ctx.fill();
  }

  // === HUD ===
  drawHUD(snake, kills, time) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const pw = Math.min(520, w - 20), ph = 56;
    const px = (w - pw) / 2, py = 10;
    roundRect(ctx, px, py, pw, ph, 14);
    ctx.fillStyle = 'rgba(60,35,10,0.75)'; ctx.fill();
    ctx.strokeStyle = '#D4A04A'; ctx.lineWidth = 2.5; ctx.stroke();

    const stats = [
      { icon: '♥', val: snake.length, color: '#ff5555' },
      { icon: '⚡', val: snake.speed, color: '#66ff66' },
      { icon: '⚔', val: snake.attack, color: '#ffcc33' },
      { icon: '◆', val: snake.defense, color: '#55aaff' },
    ];
    ctx.font = 'bold 15px sans-serif';
    const sx = px + 18, sy = py + 23;
    stats.forEach((s, i) => {
      ctx.fillStyle = s.color; ctx.textAlign = 'left'; ctx.fillText(s.icon, sx + i * 72, sy);
      ctx.fillStyle = '#FFF8E1'; ctx.fillText(` ${s.val}`, sx + i * 72 + 15, sy);
    });
    ctx.fillStyle = '#D4A04A'; ctx.fillText(`击杀: ${kills}`, sx, sy + 22);
    const sec = Math.floor(time / 1000);
    ctx.textAlign = 'right'; ctx.fillStyle = '#FFF8E1';
    ctx.fillText(`${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`, px + pw - 18, sy);
    ctx.font = '11px sans-serif'; ctx.fillStyle = '#B08050';
    ctx.fillText('摇杆/方向键控制', px + pw - 18, sy + 22);
  }

  drawMenu() {
    const ctx = this.ctx;
    const w = this.canvas.width, h = this.canvas.height;
    const cx = w / 2, cy = h / 2;
    ctx.fillStyle = 'rgba(80,50,20,0.55)'; ctx.fillRect(0, 0, w, h);
    const cw = 380, ch = 280;
    roundRect(ctx, cx - cw / 2, cy - ch / 2 - 20, cw, ch, 20);
    ctx.fillStyle = 'rgba(60,35,10,0.85)'; ctx.fill();
    ctx.strokeStyle = '#D4A04A'; ctx.lineWidth = 3; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFD54F'; ctx.font = 'bold 34px sans-serif';
    ctx.fillText('🐍 贪吃蛇 RPG', cx, cy - 80);
    ctx.fillStyle = '#FFF8E1'; ctx.font = '15px sans-serif';
    ctx.fillText('收集道具 · 击败敌人 · 在沙漠中活下去', cx, cy - 40);
    ctx.fillStyle = '#FFD54F'; ctx.font = 'bold 19px sans-serif';
    ctx.fillText('点击 或 按空格键 开始', cx, cy + 10);
    ctx.font = '13px sans-serif'; ctx.fillStyle = '#B08050';
    ctx.fillText('♥ 长度   ⚡ 速度   ⚔ 攻击   ◆ 防御', cx, cy + 55);
    ctx.fillText('滑动摇杆 / 方向键控制方向', cx, cy + 78);
  }

  drawGameOver(snake, kills, time) {
    const ctx = this.ctx;
    const w = this.canvas.width, h = this.canvas.height;
    const cx = w / 2, cy = h / 2;
    ctx.fillStyle = 'rgba(60,30,10,0.65)'; ctx.fillRect(0, 0, w, h);
    const cw = 340, ch = 280;
    roundRect(ctx, cx - cw / 2, cy - ch / 2, cw, ch, 20);
    ctx.fillStyle = 'rgba(60,35,10,0.9)'; ctx.fill();
    ctx.strokeStyle = '#D4A04A'; ctx.lineWidth = 3; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#F44336'; ctx.font = 'bold 32px sans-serif'; ctx.fillText('游戏结束', cx, cy - 90);
    const sec = Math.floor(time / 1000);
    const ts = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
    ctx.font = '17px sans-serif'; ctx.fillStyle = '#FFF8E1';
    [`存活时间: ${ts}`, `击杀敌人: ${kills}`, `最终长度: ${snake.length}`,
      `攻击力: ${snake.attack}   防御力: ${snake.defense}`].forEach((l, i) => ctx.fillText(l, cx, cy - 35 + i * 28));
    ctx.fillStyle = '#FFD54F'; ctx.font = 'bold 17px sans-serif';
    ctx.fillText('点击 或 按空格键 重新开始', cx, cy + 105);
  }

  drawDamageFlash() {
    this.ctx.fillStyle = 'rgba(255,50,30,0.18)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawVignette() {
    const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(40,20,5,0.35)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }
}
