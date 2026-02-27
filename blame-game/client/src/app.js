// 场景管理 + 主循环

import { InputManager } from './input-manager.js';
import { HomeScene } from './scenes/home.js';
import { RoomScene } from './scenes/room.js';
import { GameScene } from './scenes/game.js';
import { ResultScene } from './scenes/result.js';
import { CONFIG } from './config.js';
import * as api from './api.js';

export class App {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.input = new InputManager(this.canvas);
    this.user = null;
    this.scene = null;
    this.lastTs = 0;

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.doLogin().then(() => {
      this.switchScene('home');
      requestAnimationFrame(ts => this.loop(ts));
    });
  }

  resize() { this.canvas.width = window.innerWidth; this.canvas.height = window.innerHeight; }

  async doLogin() {
    const isWx = typeof wx !== 'undefined';
    let code = 'guest', nick = '玩家', avatar = '';
    if (isWx) { try { const r = await new Promise((ok, fail) => wx.login({ success: ok, fail })); code = r.code; } catch (_e) { code = 'wx_guest'; } }
    try { const d = await api.login(code, nick, avatar); this.user = d.user; }
    catch (_e) { this.user = { id: 0, nickname: '离线玩家' }; }
  }

  switchScene(name, params) {
    this.input.clearTaps();
    const W = this.canvas.width, H = this.canvas.height;
    switch (name) {
      case 'home': this.scene = new HomeScene(this, W, H); break;
      case 'room': this.scene = new RoomScene(this, W, H, params); break;
      case 'game': this.scene = new GameScene(this, W, H, params); break;
      case 'result': this.scene = new ResultScene(this, W, H, params); break;
    }
  }

  loop(ts) {
    const dt = Math.min(ts - this.lastTs, 100);
    this.lastTs = ts;
    if (this.scene) {
      this.scene.update(dt);
      this.ctx.fillStyle = CONFIG.THEME.BG;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.scene.render(this.ctx, this.canvas.width, this.canvas.height);
    }
    requestAnimationFrame(t => this.loop(t));
  }
}
