// 渲染器 - 摄像机跟随 + 沙漠背景 + 卡通风格

import { CONFIG } from './config.js';

const C = CONFIG.CELL_SIZE;

// 确定性哈希 - 根据格子坐标生成固定随机值（用于沙漠装饰）
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

  // 画布跟随窗口大小
  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  // 摄像机以蛇头为中心
  setCamera(head) {
    this.camera.x = head.x * C + C / 2 - this.canvas.width / 2;
    this.camera.y = head.y * C + C / 2 - this.canvas.height / 2;
  }

  // 世界格子坐标 → 屏幕像素坐标
  toScreen(cellX, cellY) {
    return { x: cellX * C - this.camera.x, y: cellY * C - this.camera.y };
  }

  // 清空画布
  clear() {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  // === 沙漠背景 ===
  drawDesertBackground() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const [baseR, baseG, baseB] = CONFIG.THEME.SAND_BASE;

    // 填充基础沙色
    ctx.fillStyle = `rgb(${baseR},${baseG},${baseB})`;
    ctx.fillRect(0, 0, w, h);

    // 可见格子范围
    const c0 = Math.floor(this.camera.x / C) - 1;
    const r0 = Math.floor(this.camera.y / C) - 1;
    const c1 = Math.ceil((this.camera.x + w) / C) + 1;
    const r1 = Math.ceil((this.camera.y + h) / C) + 1;

    // 格子颜色微变 - 模拟沙地纹理
    for (let col = c0; col <= c1; col++) {
      for (let row = r0; row <= r1; row++) {
        const hv = cellHash(col, row);
        const shade = (hv % 16) - 8;
        if (Math.abs(shade) > 3) {
          const sx = col * C - this.camera.x;
          const sy = row * C - this.camera.y;
          ctx.fillStyle = `rgb(${baseR + shade},${baseG + shade},${baseB + shade * 0.6 | 0})`;
          ctx.fillRect(sx, sy, C, C);
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
        if (col === c0) ctx.moveTo(sx, sy + wave);
        else ctx.lineTo(sx, sy + wave);
      }
      ctx.stroke();
    }

    // 淡淡的网格线
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

    // 装饰物（仙人掌、石头）
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

  // 卡通仙人掌
  drawCactus(cx, cy, hv) {
    const ctx = this.ctx;
    ctx.fillStyle = CONFIG.THEME.CACTUS_FILL;
    ctx.strokeStyle = CONFIG.THEME.CACTUS_STROKE;
    ctx.lineWidth = 1.5;
    const s = C * 0.7;
    // 主干
    roundRect(ctx, cx - s * 0.15, cy - s * 0.55, s * 0.3, s * 1.1, 3);
    ctx.fill(); ctx.stroke();
    // 左臂
    if (hv % 3 !== 0) {
      roundRect(ctx, cx - s * 0.5, cy - s * 0.15, s * 0.38, s * 0.18, 2);
      ctx.fill(); ctx.stroke();
      roundRect(ctx, cx - s * 0.5, cy - s * 0.45, s * 0.18, s * 0.35, 2);
      ctx.fill(); ctx.stroke();
    }
    // 右臂
    if (hv % 5 !== 0) {
      roundRect(ctx, cx + s * 0.12, cy + s * 0.05, s * 0.38, s * 0.18, 2);
      ctx.fill(); ctx.stroke();
      roundRect(ctx, cx + s * 0.35, cy - s * 0.25, s * 0.18, s * 0.35, 2);
      ctx.fill(); ctx.stroke();
    }
  }

  // 卡通石头
  drawRock(cx, cy, hv) {
    const ctx = this.ctx;
    const rw = C * (0.35 + (hv % 7) * 0.03);
    const rh = C * (0.25 + (hv % 5) * 0.02);
    ctx.fillStyle = CONFIG.THEME.ROCK_FILL;
    ctx.strokeStyle = CONFIG.THEME.ROCK_STROKE;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2, rw, rh, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.ellipse(cx - rw * 0.2, cy - rh * 0.1, rw * 0.3, rh * 0.4, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // 卡通小灌木
  drawBush(cx, cy) {
    const ctx = this.ctx;
    ctx.fillStyle = '#A8B060';
    ctx.strokeStyle = '#7A8840';
    ctx.lineWidth = 1;
    const r = C * 0.22;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx - r * 0.7, cy + r * 0.3, r * 0.7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + r * 0.7, cy + r * 0.2, r * 0.65, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }

  // === 卡通蛇 ===
  drawSnake(snake) {
    const ctx = this.ctx;
    const body = snake.body;
    const len = body.length;
    const blink = snake.invincibleTimer > 0 && Math.floor(snake.invincibleTimer / 80) % 2 === 0;
    if (blink) return;

    // 从尾到头绘制
    for (let i = len - 1; i >= 0; i--) {
      const seg = body[i];
      const scr = this.toScreen(seg.x, seg.y);
      const cx = scr.x + C / 2;
      const cy = scr.y + C / 2;
      const r = C / 2 - 1;
      const t = 1 - (i / Math.max(len, 1)) * 0.45;

      // 描边
      ctx.fillStyle = '#2E5A1E';
      ctx.beginPath(); ctx.arc(cx, cy, r + 2, 0, Math.PI * 2); ctx.fill();

      // 身体色
      ctx.fillStyle = `rgb(${60 + 30 * t | 0},${130 + 70 * t | 0},${40 + 30 * t | 0})`;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      // 高光
      ctx.fillStyle = `rgba(255,255,255,${0.22 * t})`;
      ctx.beginPath(); ctx.arc(cx - r * 0.25, cy - r * 0.25, r * 0.35, 0, Math.PI * 2); ctx.fill();
    }

    // 头部特征
    if (len > 0) this.drawSnakeHead(snake);
  }

  // 蛇头：大眼睛 + 舌头
  drawSnakeHead(snake) {
    const ctx = this.ctx;
    const scr = this.toScreen(snake.head.x, snake.head.y);
    const cx = scr.x + C / 2;
    const cy = scr.y + C / 2;
    const dir = snake.direction;
    const perpX = dir.y, perpY = -dir.x;

    // 双眼
    const eyeOff = 3.5;
    for (const side of [-1, 1]) {
      const ex = cx + dir.x * 2.5 + perpX * eyeOff * side;
      const ey = cy + dir.y * 2.5 + perpY * eyeOff * side;
      // 眼白
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(ex, ey, 3.8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // 瞳孔
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(ex + dir.x * 1.2, ey + dir.y * 1.2, 2, 0, Math.PI * 2); ctx.fill();
    }

    // 舌头
    const tx = cx + dir.x * (C / 2 + 2);
    const ty = cy + dir.y * (C / 2 + 2);
    const tx2 = tx + dir.x * 5;
    const ty2 = ty + dir.y * 5;
    ctx.strokeStyle = '#E53935';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx2, ty2); ctx.stroke();
    const fk = 3;
    ctx.beginPath(); ctx.moveTo(tx2, ty2);
    ctx.lineTo(tx2 + dir.x * fk + perpX * fk, ty2 + dir.y * fk + perpY * fk); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tx2, ty2);
    ctx.lineTo(tx2 + dir.x * fk - perpX * fk, ty2 + dir.y * fk - perpY * fk); ctx.stroke();
  }

  // === 卡通道具 ===
  drawPowerUps(powerups) {
    const ctx = this.ctx;
    for (const p of powerups) {
      const scr = this.toScreen(p.x, p.y);
      const cx = scr.x + C / 2;
      const cy = scr.y + C / 2;
      const s = p.pulseScale;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(s, s);

      // 背景圆（卡通风格带描边）
      ctx.fillStyle = p.type.color + '30';
      ctx.strokeStyle = p.type.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, C / 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

      // 内圆高光
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath(); ctx.arc(-2, -3, C * 0.18, 0, Math.PI * 2); ctx.fill();

      // 符号
      ctx.fillStyle = p.type.color;
      ctx.font = `bold ${C * 0.52}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.type.symbol, 0, 1);

      ctx.restore();
    }
  }

  // === 卡通敌人 ===
  drawEnemies(enemies) {
    const ctx = this.ctx;
    for (const e of enemies) {
      const scr = this.toScreen(e.x, e.y);
      const cx = scr.x + C / 2;
      const cy = scr.y + C / 2;
      const r = C / 2;
      const flash = e.hitFlash > 0;

      // 阴影
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath(); ctx.ellipse(cx, cy + r + 2, r * 0.7, 3, 0, 0, Math.PI * 2); ctx.fill();

      // 身体描边
      ctx.fillStyle = flash ? '#fff' : '#3E2723';
      ctx.beginPath(); ctx.arc(cx, cy, r + 2, 0, Math.PI * 2); ctx.fill();

      // 身体填色
      ctx.fillStyle = flash ? '#eee' : e.type.color;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      // 类型文字
      ctx.fillStyle = flash ? '#333' : '#fff';
      ctx.font = `bold ${C * 0.48}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(e.type.symbol, cx, cy + 1);

      // 血条（卡通风格）
      const bw = C + 4;
      const bh = 5;
      const bx = cx - bw / 2;
      const by = cy - r - 8;
      const hpRatio = e.hp / e.maxHp;
      roundRect(ctx, bx, by, bw, bh, 2);
      ctx.fillStyle = '#444'; ctx.fill();
      ctx.strokeStyle = '#222'; ctx.lineWidth = 1; ctx.stroke();
      if (hpRatio > 0) {
        roundRect(ctx, bx + 1, by + 1, (bw - 2) * hpRatio, bh - 2, 1.5);
        ctx.fillStyle = hpRatio > 0.5 ? '#4CAF50' : hpRatio > 0.25 ? '#FFC107' : '#F44336';
        ctx.fill();
      }
    }
  }

  // === 卡通 HUD（浮动面板） ===
  drawHUD(snake, kills, time) {
    const ctx = this.ctx;
    const w = this.canvas.width;

    // 面板尺寸
    const pw = Math.min(520, w - 20);
    const ph = 56;
    const px = (w - pw) / 2;
    const py = 10;

    // 面板背景
    roundRect(ctx, px, py, pw, ph, 14);
    ctx.fillStyle = 'rgba(60,35,10,0.75)';
    ctx.fill();
    ctx.strokeStyle = '#D4A04A';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 属性
    const stats = [
      { icon: '♥', val: snake.length, color: '#ff5555' },
      { icon: '⚡', val: snake.speed, color: '#66ff66' },
      { icon: '⚔', val: snake.attack, color: '#ffcc33' },
      { icon: '◆', val: snake.defense, color: '#55aaff' },
    ];
    ctx.font = 'bold 15px sans-serif';
    const sx = px + 18;
    const sy = py + 23;

    stats.forEach((s, i) => {
      const x = sx + i * 72;
      ctx.fillStyle = s.color;
      ctx.textAlign = 'left';
      ctx.fillText(s.icon, x, sy);
      ctx.fillStyle = '#FFF8E1';
      ctx.fillText(` ${s.val}`, x + 15, sy);
    });

    // 击杀
    ctx.fillStyle = '#D4A04A';
    ctx.fillText(`击杀: ${kills}`, sx, sy + 22);

    // 时间
    const sec = Math.floor(time / 1000);
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const ss = String(sec % 60).padStart(2, '0');
    ctx.textAlign = 'right';
    ctx.fillStyle = '#FFF8E1';
    ctx.fillText(`${m}:${ss}`, px + pw - 18, sy);

    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#B08050';
    ctx.fillText('方向键/滑动控制', px + pw - 18, sy + 22);
  }

  // === 菜单画面 ===
  drawMenu() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    // 半透明遮罩
    ctx.fillStyle = 'rgba(80,50,20,0.55)';
    ctx.fillRect(0, 0, w, h);

    // 卡通标题卡片
    const cardW = 380, cardH = 280;
    roundRect(ctx, cx - cardW / 2, cy - cardH / 2 - 20, cardW, cardH, 20);
    ctx.fillStyle = 'rgba(60,35,10,0.85)';
    ctx.fill();
    ctx.strokeStyle = '#D4A04A';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 标题
    ctx.fillStyle = '#FFD54F';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText('🐍 贪吃蛇 RPG', cx, cy - 80);

    // 副标题
    ctx.fillStyle = '#FFF8E1';
    ctx.font = '15px sans-serif';
    ctx.fillText('收集道具 · 击败敌人 · 在沙漠中活下去', cx, cy - 40);

    // 开始提示
    ctx.fillStyle = '#FFD54F';
    ctx.font = 'bold 19px sans-serif';
    ctx.fillText('点击 或 按空格键 开始', cx, cy + 10);

    // 规则提示
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#B08050';
    ctx.fillText('♥ 长度   ⚡ 速度   ⚔ 攻击   ◆ 防御', cx, cy + 55);
    ctx.fillText('蛇长度 < 2 时游戏结束', cx, cy + 78);
  }

  // === 游戏结束画面 ===
  drawGameOver(snake, kills, time) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    ctx.fillStyle = 'rgba(60,30,10,0.65)';
    ctx.fillRect(0, 0, w, h);

    // 卡通结算卡片
    const cardW = 340, cardH = 280;
    roundRect(ctx, cx - cardW / 2, cy - cardH / 2, cardW, cardH, 20);
    ctx.fillStyle = 'rgba(60,35,10,0.9)';
    ctx.fill();
    ctx.strokeStyle = '#D4A04A';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#F44336';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText('游戏结束', cx, cy - 90);

    const sec = Math.floor(time / 1000);
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const ss = String(sec % 60).padStart(2, '0');

    ctx.font = '17px sans-serif';
    ctx.fillStyle = '#FFF8E1';
    const lines = [
      `存活时间: ${m}:${ss}`,
      `击杀敌人: ${kills}`,
      `最终长度: ${snake.length}`,
      `攻击力: ${snake.attack}   防御力: ${snake.defense}`,
    ];
    lines.forEach((l, i) => ctx.fillText(l, cx, cy - 35 + i * 28));

    ctx.fillStyle = '#FFD54F';
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText('点击 或 按空格键 重新开始', cx, cy + 105);
  }

  // 受伤红色闪烁
  drawDamageFlash() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(255,50,30,0.18)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // 边缘暗角（增强沉浸感）
  drawVignette() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(40,20,5,0.35)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }
}
