## Cursor Cloud specific instructions

贪吃蛇 RPG — 基于 Vite + Canvas 2D 的微信小游戏（浏览器开发版）。

### 项目结构

所有游戏代码位于 `snake/` 目录下，根目录仅含本文件和 `.gitignore`。

### 服务

| 服务 | 命令 | 端口 |
|------|------|------|
| Vite dev server | `npm run dev` (在 snake/ 下) | 5173 |

### 常用命令

在 `snake/` 目录下执行，参见 `snake/package.json` scripts：

- `npm run dev` — 启动开发服务器
- `npm run build` — 生产构建
- `npm run lint` — ESLint 检查
- `npm test` — Vitest 单元测试

### 注意事项

- 游戏配置集中在 `snake/src/config.js`，新增道具/敌人只需在对应数组中添加条目。
- Vite `server.host` 已设为 `0.0.0.0`，Cloud 环境中可通过 Desktop 面板直接访问。
- 游戏逻辑（snake/powerup/enemy）为纯逻辑模块，便于单元测试；渲染与输入分离在独立模块中。
- 游戏规则详见 `snake/docs/RULE.md`，项目方案详见 `snake/docs/plan.md`。
