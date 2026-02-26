# 贪吃蛇 RPG - 项目方案

## 技术栈

- **渲染引擎**: Canvas 2D API
- **开发工具**: Vite (dev server + build) / 微信开发者工具
- **代码检查**: ESLint 9 (flat config)
- **单元测试**: Vitest
- **语言**: ES Module JavaScript
- **运行环境**: 浏览器（开发）+ 微信小游戏（生产）

## 架构设计

```
snake/
├── game.js             # 微信小游戏入口
├── game.json           # 微信小游戏配置
├── project.config.json # 微信项目配置
├── libs/
│   └── weapp-adapter.js # 微信环境浏览器 API 适配器
├── index.html          # 浏览器入口
├── package.json        # 依赖管理
├── vite.config.js      # Vite 配置
├── eslint.config.js    # ESLint 配置
├── src/
│   ├── main.js         # 浏览器入口（加载CSS + 启动）
│   ├── game-core.js    # 游戏核心（平台无关）
│   ├── config.js       # 游戏配置（道具/敌人/属性）
│   ├── snake.js        # 蛇实体
│   ├── powerup.js      # 道具管理器
│   ├── enemy.js        # 敌人管理器
│   ├── renderer.js     # Canvas 渲染
│   ├── input.js        # 键盘/触摸输入
│   ├── style.css       # 页面样式
│   └── game.test.js    # 单元测试
└── docs/
    ├── RULE.md          # 游戏规则
    └── plan.md          # 项目方案
```

## 模块职责

### config.js - 配置中心
- 集中管理所有游戏参数
- 道具类型数组：每个道具定义 id、名称、图标、效果类型、效果值、权重
- 敌人类型数组：每个敌人定义 id、名称、血量、攻击力、速度、攻击间隔、权重
- 蛇的初始属性：长度、速度、攻击、防御
- 刷新间隔与最大数量配置

### snake.js - 蛇实体
- 管理蛇身体坐标数组
- 基于速度的移动定时器
- 方向控制（禁止 180° 反向）
- 增长/受伤逻辑
- 穿墙处理

### powerup.js - 道具系统
- 定时在空白格随机生成道具
- 按权重随机选择道具类型
- 碰撞检测：蛇头触碰道具时触发效果
- 管理活跃道具列表

### enemy.js - 敌人系统
- 从地图边缘生成敌人
- 敌人 AI：朝蛇头方向移动
- 攻击逻辑：与蛇身重叠时周期攻击
- 受伤逻辑：蛇头碰触时扣血
- 死亡移除

### renderer.js - 渲染引擎
- 网格背景绘制
- 蛇身渐变绘制
- 道具图标绘制
- 敌人图标与血条绘制
- HUD 状态栏（长度、速度、攻击、防御、击杀数）
- 开始/结束画面

### input.js - 输入处理
- 键盘方向键 + WASD
- 触摸滑动方向检测
- 点击/空格开始游戏

### main.js - 游戏主循环
- 状态机：MENU → PLAYING → GAME_OVER
- requestAnimationFrame 游戏循环
- 各系统 update 调度
- 碰撞检测协调

## 游戏流程

1. 启动 → 显示开始画面
2. 点击/按空格 → 初始化蛇 + 开始游戏循环
3. 游戏中：
   - 蛇按速度移动
   - 定时刷新道具
   - 延迟后定时刷新敌人
   - 蛇头碰道具 → 拾取效果
   - 蛇头碰敌人 → 对敌造成伤害
   - 敌人碰蛇身 → 对蛇造成伤害
   - 蛇长度 < 2 → 游戏结束
4. 游戏结束 → 显示结算画面 → 点击重新开始

## 扩展性设计

- 新增道具类型：在 `config.js` 的 `POWERUP_TYPES` 数组中添加条目
- 新增敌人类型：在 `config.js` 的 `ENEMY_TYPES` 数组中添加条目
- 调整刷新频率/概率：修改对应配置项
- 微信小游戏移植：替换 Canvas 获取方式和输入事件绑定
