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
      // 离线模式：直接给一个可玩的角色
      this.user = { id: 0, nickname: '离线冒险者', class: 'warrior', level: 1,
        hp: 100, max_hp: 100, mp: 50, max_mp: 50, attack: 10, defense: 5,
        speed: 3, crit_rate: 0.05, pos_x: 400, pos_y: 300, gold: 500, diamond: 0 };
    }
  }

  // 加载游戏数据并进入主世界
  async enterWorld() {
    try {
      this.gameData = await api.getGameData();
      this.user = this.gameData.user;
    } catch (_e) {
      // 离线模式：使用默认数据
      this.gameData = {
        user: this.user,
        maps: [{ id: 1, name: '新手村', level_min: 1, level_max: 10, width: 1200, height: 900,
                 safe_x: 600, safe_y: 450, safe_r: 100, bg_color: '#7EC850', theme: 'grass' }],
        monsters: [
          { id: 1, name: '小史莱姆', level: 1, hp: 30, attack: 3, defense: 1, speed: 1, exp_reward: 5, gold_reward: 3, respawn_time: 10, map_id: 1, is_boss: false, aggro_range: 80 },
          { id: 2, name: '蘑菇仔', level: 3, hp: 50, attack: 5, defense: 2, speed: 1.2, exp_reward: 10, gold_reward: 5, respawn_time: 15, map_id: 1, is_boss: false, aggro_range: 90 },
          { id: 3, name: '史莱姆王', level: 10, hp: 500, attack: 25, defense: 10, speed: 1.5, exp_reward: 200, gold_reward: 100, respawn_time: 60, map_id: 1, is_boss: true, aggro_range: 150 },
        ],
        skills: [
          { id: 1, name: '猛击', cooldown: 0, damage_ratio: 1, range: 50, aoe_radius: 0, mana_cost: 0 },
          { id: 2, name: '旋风斩', cooldown: 8, damage_ratio: 1.8, range: 50, aoe_radius: 80, mana_cost: 15 },
          { id: 3, name: '冲锋', cooldown: 12, damage_ratio: 2, range: 150, aoe_radius: 0, mana_cost: 20 },
        ],
      };
    }
    this.switchScene('world');
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
