// 游戏应用 - 场景管理 + 主循环

import { InputManager } from './input-manager.js';
import { MenuScene } from './scenes/menu.js';
import { ChallengeScene } from './scenes/challenge.js';
import { BattleScene } from './scenes/battle.js';
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

    // 自动登录（开发模式用 guest，微信用 wx.login）
    this.doLogin().then(() => {
      this.switchScene('menu');
      requestAnimationFrame(ts => this.loop(ts));
    });
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  async doLogin() {
    const isWx = typeof wx !== 'undefined';
    let code = 'guest';
    let nickname = '玩家';
    let avatar = '';

    if (isWx) {
      try {
        const res = await new Promise((resolve, reject) => {
          wx.login({ success: resolve, fail: reject });
        });
        code = res.code;
      } catch (_e) {
        code = 'wx_guest';
      }
    }

    try {
      const data = await api.login(code, nickname, avatar);
      this.user = data.user;
    } catch (_e) {
      // 离线模式
      this.user = { id: 0, nickname: '离线玩家', level: 1 };
    }
  }

  // 切换场景
  switchScene(name, params) {
    this.input.clearTaps();
    const W = this.canvas.width, H = this.canvas.height;
    switch (name) {
      case 'menu':
        this.scene = new MenuScene(this, W, H);
        break;
      case 'challenge':
        this.scene = new ChallengeScene(this, W, H, params);
        break;
      case 'battle':
        this.scene = new BattleScene(this, W, H, params);
        break;
    }
  }

  loop(ts) {
    const dt = Math.min(ts - this.lastTs, 100);
    this.lastTs = ts;

    if (this.scene) {
      this.scene.update(dt);
      // 清屏
      this.ctx.fillStyle = CONFIG.THEME.BG;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.scene.render(this.ctx, this.canvas.width, this.canvas.height);
    }
    requestAnimationFrame(t => this.loop(t));
  }
}
