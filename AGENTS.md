## Cursor Cloud specific instructions

Snake 是一个基于 Vite + vanilla JavaScript 的贪吃蛇网页游戏。

### 服务

| 服务 | 命令 | 端口 |
|------|------|------|
| Vite dev server | `npm run dev` | 5173 |

### 常用命令

参见 `package.json` scripts 部分：

- `npm run dev` — 启动开发服务器 (host: 0.0.0.0, port: 5173)
- `npm run build` — 生产构建
- `npm run lint` — ESLint 检查
- `npm test` — 运行 Vitest 测试
- `npm run test:watch` — 监听模式测试

### 注意事项

- Vite 配置中 `server.host` 已设为 `0.0.0.0`，Cloud 环境中无需额外配置即可通过 Desktop 面板访问。
- 游戏逻辑在 `src/game.js`，纯函数设计，便于单元测试。DOM 交互在 `src/main.js`。
