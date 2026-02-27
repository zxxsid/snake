// 游戏应用 - 场景管理 + 主循环

import { InputManager } from './input-manager.js';
import { LoginScene } from './scenes/login.js';
import { SelectClassScene } from './scenes/select-class.js';
import { WorldScene } from './scenes/world.js';
import { CONFIG } from './config.js';
import * as api from './api.js';

export class App {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.input = new InputManager(this.canvas);
    this.user = null;       // 当前用户
    this.gameData = null;   // 游戏数据
    this.scene = null;
    this.lastTs = 0;

    this.resize();
    window.addEventListener('resize', () => this.resize());

    // 自动登录
    this.doLogin().then(() => {
      if (!this.user || this.user.id === 0) {
        this.switchScene('login');
      } else if (!this.user.class) {
        this.switchScene('select-class');
      } else {
        this.enterWorld();
      }
      requestAnimationFrame(ts => this.loop(ts));
    });
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  // 微信登录
  async doLogin() {
    const isWx = typeof wx !== 'undefined';
    let code = 'guest', nick = '冒险者', avatar = '';
    if (isWx) {
      try {
        const r = await new Promise((ok, fail) => wx.login({ success: ok, fail }));
        code = r.code;
      } catch (_e) { code = 'wx_guest'; }
    }
    try {
      const d = await api.login(code, nick, avatar);
      this.user = d.user;
    } catch (_e) {
      this.user = { id: 0, nickname: '离线冒险者', class: '', level: 1 };
    }
  }

  // 加载游戏数据并进入主世界
  async enterWorld() {
    try {
      this.gameData = await api.getGameData();
      this.user = this.gameData.user;
      this.switchScene('world');
    } catch (_e) {
      this.switchScene('login');
    }
  }

  // 切换场景
  switchScene(name, params) {
    this.input.clearTaps();
    const W = this.canvas.width, H = this.canvas.height;
    switch (name) {
      case 'login': this.scene = new LoginScene(this, W, H); break;
      case 'select-class': this.scene = new SelectClassScene(this, W, H); break;
      case 'world': this.scene = new WorldScene(this, W, H, params); break;
    }
  }

  loop(ts) {
    const dt = Math.min(ts - this.lastTs, 100);
    this.lastTs = ts;
    if (this.scene) {
      this.scene.update(dt);
      const ctx = this.ctx;
      ctx.fillStyle = '#2a1a0a';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.scene.render(ctx, this.canvas.width, this.canvas.height);
    }
    requestAnimationFrame(t => this.loop(t));
  }
}
