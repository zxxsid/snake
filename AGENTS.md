## Cursor Cloud specific instructions

贪吃蛇 RPG — Canvas 2D 微信小游戏，支持浏览器开发和微信小游戏双平台运行。

### 项目结构

所有游戏代码位于 `snake/` 目录下。该目录可直接用微信开发者工具打开。

- `snake/game.js` — 微信小游戏入口（加载适配器 + 启动游戏）
- `snake/src/main.js` — 浏览器入口（加载 CSS + 启动游戏）
- `snake/src/game-core.js` — 平台无关的游戏核心类
- `snake/libs/weapp-adapter.js` — 微信环境浏览器 API 适配器

### 服务

| 服务 | 命令 | 端口 |
|------|------|------|
| Vite dev server | `npm run dev` (在 snake/ 下) | 5173 |

### 常用命令

在 `snake/` 目录下执行，参见 `snake/package.json` scripts：

- `npm run dev` — 启动浏览器开发服务器
- `npm run build` — 生产构建（浏览器版）
- `npm run lint` — ESLint 检查（含微信入口文件）
- `npm test` — Vitest 单元测试

### 注意事项

- 双平台架构：`weapp-adapter.js` 将 `wx.*` API 映射为 `window/document/canvas` 标准接口，使 `game-core.js` 无需平台判断。
- 微信运行：用微信开发者工具打开 `snake/` 目录即可，入口为 `game.js`。需在 `project.config.json` 中填写真实 `appid`。
- 浏览器运行：`npm run dev` 启动 Vite，入口为 `index.html` → `src/main.js`。
- `input.js` 中所有 `preventDefault` 调用已用 `safePrevent` 包装，兼容微信触摸事件。
- 游戏配置集中在 `snake/src/config.js`，新增道具/敌人只需在对应 TYPES 数组中添加条目。
