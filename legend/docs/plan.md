# 🌿 卡通传奇 — 完整项目方案

## 一、游戏定位

**卡通传奇**是一款微信小游戏平台的轻量 ARPG，核心玩法复刻经典传奇（打怪、爆装、PK、交易），但用治愈卡通风格呈现。适合碎片化游玩，支持长线成长和付费。

**风格关键词**：治愈卡通 · 像素萌系 · 明亮色彩 · 轻松冒险

---

## 二、核心系统

### 2.1 角色系统

**三大职业**：

| 职业 | 定位 | 主属性 | 特色 |
|------|------|--------|------|
| 🗡️ 战士 | 近战/肉盾 | 力量/体力 | 高血量高防御，冲锋技能 |
| 🏹 弓手 | 远程/输出 | 敏捷/攻击 | 高攻速远距离，闪避技能 |
| 🔮 法师 | 魔法/AOE | 智力/法力 | 范围伤害，控制技能 |

**角色属性**：

```
等级 / 经验值
HP（生命值）/ MP（法力值）
攻击力 / 防御力 / 攻速
暴击率 / 闪避率
移动速度
```

**成长路线**：
- 1-10级：新手引导，学习基础
- 11-30级：探索野外，组队打怪
- 31-50级：进入高级地图，PVP 解锁
- 51-70级：BOSS 挑战，稀有装备
- 71-99级：终极地图，传说装备

### 2.2 地图系统

**地图列表**（由低到高）：

| 地图 | 等级范围 | 风格 | 怪物 |
|------|---------|------|------|
| 🌳 新手村 | 1-10 | 绿色草地 | 史莱姆、小蘑菇 |
| 🌲 迷雾森林 | 10-20 | 深色树林 | 树精、毒蜂 |
| 🏜️ 沙漠绿洲 | 20-30 | 黄沙+绿洲 | 沙虫、蝎子 |
| 🌊 幽暗洞穴 | 30-40 | 蓝色地下 | 蝙蝠、石像鬼 |
| 🌋 熔岩裂谷 | 40-50 | 红色火山 | 火元素、熔岩龙 |
| ❄️ 冰霜雪原 | 50-60 | 白色雪地 | 冰狼、雪人 |
| 🌙 暗影深渊 | 60-70 | 紫色暗域 | 暗影骑士、恶魔 |
| ⭐ 天空之城 | 70-99 | 金色天空 | 天使守卫、龙王 |

**地图特性**：
- 每张地图有多个区域（安全区/野怪区/BOSS 区）
- 安全区：城镇 NPC（商店/仓库/任务）
- 野怪区：自动刷怪，玩家可自由击杀
- BOSS 区：定时刷新精英/BOSS，掉落稀有装备

### 2.3 战斗系统

**操作方式**（触屏）：

```
┌─────────────────────────────┐
│                             │
│       游戏画面（俯视角）      │
│    玩家在中心，怪物在周围     │
│                             │
│                    ╭───╮    │
│   ╭──╮            │技1│    │  ← 技能按钮（右下角）
│   │摇│            ╰───╯    │
│   │杆│     ╭───╮  ╭───╮   │
│   ╰──╯     │技2│  │普攻│   │
│             ╰───╯  ╰───╯   │
└─────────────────────────────┘
    ↑ 左下角移动摇杆
```

- **移动**：左下角虚拟摇杆（360°自由移动）
- **普攻**：右下角攻击按钮（连点连击）
- **技能**：2-3 个技能按钮（有 CD）
- **自动战斗**：开关按钮，自动寻怪+攻击（挂机）
- **拾取**：点击地上的掉落物 / 自动拾取

**战斗公式**：
```
伤害 = (攻击力 - 防御力 * 0.5) * (1 + 暴击倍率) * 随机浮动(0.9~1.1)
暴击判定 = rand() < 暴击率
闪避判定 = rand() < 闪避率
```

### 2.4 装备系统

**装备部位**（6 个）：

| 部位 | 主要属性加成 |
|------|------------|
| 🗡️ 武器 | 攻击力 |
| 🛡️ 盾牌/副手 | 防御力 |
| 👑 头盔 | HP |
| 👕 铠甲 | 防御力/HP |
| 👢 鞋子 | 移速/闪避 |
| 💍 戒指 | 暴击/特殊属性 |

**装备品质**：

| 品质 | 颜色 | 掉率 | 属性倍率 |
|------|------|------|---------|
| ⬜ 普通 | 白色 | 60% | 1.0x |
| 🟢 优秀 | 绿色 | 25% | 1.3x |
| 🔵 精良 | 蓝色 | 10% | 1.6x |
| 🟣 史诗 | 紫色 | 4% | 2.0x |
| 🟠 传说 | 橙色 | 0.8% | 2.5x |
| 🔴 神话 | 红色 | 0.2% | 3.0x |

**装备强化**：
- 消耗金币 + 强化石
- +1 到 +15，每级增加属性 5%
- +10 以上有失败概率（可用保护符）

### 2.5 背包与交易

- 背包格子：初始 30 格，可扩展到 100 格
- 仓库：50 格安全存储
- 摆摊交易：玩家间自由买卖装备
- 金币商店：购买药水/卷轴/材料
- 分解系统：装备分解为强化材料

### 2.6 技能系统

每个职业 6 个技能（随等级解锁）：

**战士**：
| 技能 | 解锁 | CD | 效果 |
|------|-----|-----|------|
| 猛击 | 1级 | 0s | 普通攻击 |
| 旋风斩 | 5级 | 8s | 范围伤害 |
| 冲锋 | 10级 | 12s | 突进+击退 |
| 铁壁 | 20级 | 20s | 减伤 50%，5秒 |
| 战吼 | 35级 | 30s | 全队攻击+15%，10秒 |
| 狂暴 | 50级 | 60s | 攻击+50%/防御-30%，8秒 |

**弓手**：
| 技能 | 解锁 | CD | 效果 |
|------|-----|-----|------|
| 射击 | 1级 | 0s | 普通远程攻击 |
| 多重箭 | 5级 | 6s | 3 箭扇形 |
| 闪避翻滚 | 10级 | 10s | 无敌 1 秒+位移 |
| 毒箭 | 20级 | 15s | 持续毒伤 5 秒 |
| 暴风箭雨 | 35级 | 25s | 大范围 AOE |
| 致命一击 | 50级 | 45s | 必定暴击，3 倍伤害 |

**法师**：
| 技能 | 解锁 | CD | 效果 |
|------|-----|-----|------|
| 火球 | 1级 | 0s | 普通魔法攻击 |
| 冰冻术 | 5级 | 8s | 减速 50%，3秒 |
| 雷电链 | 10级 | 10s | 弹射 3 个目标 |
| 火墙 | 20级 | 18s | 持续范围伤害 |
| 冰封 | 35级 | 30s | 定身 2 秒 |
| 陨石术 | 50级 | 60s | 超大范围高伤害 |

### 2.7 PVP 竞技

**竞技场**：
- 1v1 匹配对战，等级匹配（±5 级）
- 每日免费 5 次，额外次数消耗钻石
- 赛季排名，奖励称号 + 专属装备
- 段位：青铜/白银/黄金/铂金/钻石/王者

**野外 PK**：
- 安全区外可自由 PK
- 杀人掉 PK 值（红名）
- 红名玩家死亡掉落装备
- PK 保护：30 级以下不可被攻击

### 2.8 社交系统

- 好友列表（添加/删除/私聊）
- 公会（创建/加入/公会 BOSS）
- 世界聊天频道
- 组队（2-4 人，经验共享）

---

## 三、商业化系统

### 3.1 货币体系

| 货币 | 获取 | 用途 |
|------|------|------|
| 💰 金币 | 打怪/任务/交易 | 商店/强化/修理 |
| 💎 钻石 | 充值/签到/成就 | 商城/特权/加速 |
| 🎫 竞技币 | 竞技场 | 竞技商店兑换 |

### 3.2 充值档位（低门槛）

| 档位 | 价格 | 钻石 | 首充奖励 |
|------|------|------|---------|
| 体验 | 1 元 | 10 | +10 钻石+蓝色武器 |
| 小额 | 6 元 | 60 | +30 钻石 |
| 月卡 | 18 元 | 180 + 每日 20 | 专属称号+每日体力 |
| 中额 | 30 元 | 300 | +100 钻石 |
| 大额 | 68 元 | 680 | +300 钻石 |
| 至尊 | 128 元 | 1280 | 传说武器 |

### 3.3 广告激励系统

核心理念：**不充值也能玩，看广告获取等价资源，降低付费压力**

#### 3.3.1 每日广告奖励

| 触发场景 | 广告类型 | 奖励 | 每日上限 |
|---------|---------|------|---------|
| 每日签到加倍 | 激励视频 | 签到奖励 ×2 | 1 次 |
| 免费钻石 | 激励视频 | 5 钻石 | 5 次（共 25 钻/天） |
| 体力恢复 | 激励视频 | 恢复 50 体力 | 3 次 |
| 金币宝箱 | 激励视频 | 500-2000 金币随机 | 5 次 |
| 强化石 | 激励视频 | 强化石 ×1 | 3 次 |
| 经验加成 | 激励视频 | 30 分钟双倍经验 | 2 次 |

#### 3.3.2 战斗中广告

| 触发场景 | 广告类型 | 奖励 | 限制 |
|---------|---------|------|------|
| 死亡原地复活 | 激励视频 | 满血原地复活 | 每次死亡 1 次机会 |
| BOSS 掉落加倍 | 激励视频 | 本次掉落数量 ×2 | 每日 3 次 |
| 竞技场额外次数 | 激励视频 | +1 次竞技场机会 | 每日 2 次 |
| 强化失败保底 | 激励视频 | 下次强化必成功 | 每日 1 次 |

#### 3.3.3 被动广告

| 位置 | 广告类型 | 说明 |
|------|---------|------|
| 切换地图加载时 | 插屏广告 | 传送/换图时展示 |
| 竞技场结算后 | 插屏广告 | 结算页展示 |
| 商店页底部 | Banner 广告 | 常驻展示 |

### 3.4 分享奖励系统

| 分享场景 | 奖励 | 每日上限 |
|---------|------|---------|
| 分享到好友/群 | 10 钻石 | 3 次（共 30 钻/天） |
| 好友通过分享注册 | 50 钻石 + 蓝色装备箱 | 不限 |
| 分享击杀 BOSS 截图 | 强化石 ×2 | 1 次 |
| 邀请好友组队 | 双方 30 分钟双倍经验 | 3 次 |
| 分享竞技场战绩 | 竞技币 ×50 | 1 次 |

### 3.5 F2P 玩家日收入估算

| 来源 | 每日收入 |
|------|---------|
| 每日签到 | 5 钻石 |
| 看广告 | 25 钻石 |
| 分享 | 30 钻石 |
| 竞技场 | 10 竞技币 |
| 打怪金币 | ~5000 金币 |
| **合计** | **60 钻/天 ≈ 6 元/天**（月卡价值） |

### 3.6 钻石消耗

- VIP 特权（自动拾取/经验加成/背包扩展）
- 时装皮肤（纯外观）
- 强化保护符
- 竞技场额外次数
- 复活（死亡不回城，优先用广告免费复活）
- 快速传送
- 抽奖（装备/道具盲盒）

---

## 四、技术架构

### 4.1 总体架构

```
legend/
├── client/              # 微信小游戏前端
│   ├── game.js          # 微信入口
│   ├── game.json
│   ├── project.config.json
│   ├── libs/
│   │   └── weapp-adapter.js
│   ├── index.html       # 浏览器开发入口
│   ├── package.json
│   └── src/
│       ├── main.js
│       ├── app.js       # 场景管理
│       ├── config.js
│       ├── api.js       # HTTP + WebSocket
│       ├── ui/          # UI 组件库
│       │   ├── button.js
│       │   ├── dialog.js
│       │   ├── hud.js
│       │   └── joystick.js
│       ├── game/        # 游戏引擎
│       │   ├── camera.js
│       │   ├── map.js
│       │   ├── entity.js
│       │   ├── player.js
│       │   ├── monster.js
│       │   ├── combat.js
│       │   ├── loot.js
│       │   └── pathfind.js
│       ├── scenes/      # 场景
│       │   ├── login.js
│       │   ├── select-class.js
│       │   ├── world.js       # 主游戏场景
│       │   ├── inventory.js
│       │   ├── equip.js
│       │   ├── skill.js
│       │   ├── arena.js
│       │   ├── shop.js
│       │   ├── chat.js
│       │   └── settings.js
│       └── data/        # 静态数据表
│           ├── maps.js
│           ├── monsters.js
│           ├── items.js
│           └── skills.js
│
├── server/              # Go 后端
│   ├── cmd/main.go
│   ├── internal/
│   │   ├── config/
│   │   ├── model/       # 数据模型（20+ 张表）
│   │   ├── handler/     # HTTP API
│   │   ├── service/     # 业务逻辑
│   │   ├── ws/          # WebSocket 实时同步
│   │   ├── game/        # 服务端游戏逻辑
│   │   │   ├── combat.go
│   │   │   ├── loot.go
│   │   │   ├── map.go
│   │   │   ├── monster.go
│   │   │   └── arena.go
│   │   ├── middleware/
│   │   └── payment/     # 微信支付
│   └── sql/
│
├── admin/               # Vue3 管理后台
│   └── src/
│       ├── views/
│       │   ├── Dashboard.vue
│       │   ├── Players.vue
│       │   ├── Monsters.vue
│       │   ├── Items.vue
│       │   ├── Maps.vue
│       │   ├── Shop.vue
│       │   ├── Orders.vue
│       │   └── Logs.vue
│       └── ...
│
└── docs/                # 文档
    └── plan.md
```

### 4.2 数据库表（核心）

```sql
-- 用户
users (id, open_id, nickname, avatar, class, level, exp, gold, diamond,
       hp, mp, attack, defense, speed, crit_rate, dodge_rate,
       map_id, pos_x, pos_y, pk_value, guild_id,
       vip_level, vip_expire, created_at, last_login)

-- 装备物品
items (id, name, type, slot, quality, level_req, base_attack, base_defense,
       base_hp, base_mp, base_speed, base_crit, base_dodge, icon, description)

-- 玩家背包
inventory (id, user_id, item_id, enhance_level, count, slot_index)

-- 玩家装备栏
equipment (id, user_id, slot, item_id, enhance_level)

-- 技能
skills (id, name, class, level_req, cooldown, damage_ratio, range, aoe_radius,
        effect_type, effect_value, icon, description)

-- 玩家技能
user_skills (id, user_id, skill_id, level)

-- 怪物模板
monsters (id, name, level, hp, attack, defense, exp_reward, gold_reward,
          drop_table, respawn_time, map_id, icon, is_boss)

-- 地图
maps (id, name, level_min, level_max, width, height, safe_zones, bg_image)

-- 掉落表
drop_tables (id, monster_id, item_id, drop_rate, min_count, max_count)

-- 竞技场记录
arena_matches (id, player_a, player_b, winner, season, created_at)

-- 竞技排名
arena_rankings (id, user_id, season, score, rank, wins, losses)

-- 交易/摆摊
trades (id, seller_id, item_id, enhance_level, price, status, buyer_id, created_at)

-- 公会
guilds (id, name, leader_id, level, member_count, max_members, notice, created_at)

-- 公会成员
guild_members (id, guild_id, user_id, role, joined_at)

-- 聊天消息
chat_messages (id, channel, sender_id, content, created_at)

-- 充值订单
orders (id, user_id, product_id, amount, diamond, status, wx_order_id, created_at, paid_at)

-- 每日签到
daily_sign (id, user_id, sign_date, reward_claimed, ad_doubled)

-- 广告观看记录
ad_rewards (id, user_id, ad_type, reward_type, reward_value, created_at)
  -- ad_type: daily_diamond / revive / boss_double / stamina / gold_box / enhance_stone / exp_boost / arena_extra / enhance_protect
  -- 用于统计每日上限

-- 每日广告次数统计
user_daily_ads (id, user_id, ad_type, count, date)

-- 分享记录
share_logs (id, user_id, share_type, rewarded, created_at)
  -- share_type: friend / group / boss_kill / arena / invite

-- 邀请关系
invitations (id, inviter_id, invitee_id, rewarded, created_at)

-- 任务
quests (id, name, type, target_monster, target_count, reward_exp, reward_gold, reward_item)

-- 玩家任务进度
user_quests (id, user_id, quest_id, progress, status)
```

### 4.3 WebSocket 协议

**实时同步（30 FPS）**：

```
客户端 → 服务端:
  move      { x, y, dir }          # 移动
  attack    { target_id }           # 普攻
  skill     { skill_id, x, y }     # 释放技能
  pickup    { loot_id }             # 拾取
  chat      { channel, content }    # 聊天

  watch_ad  { ad_type }              # 看完广告上报
  share     { share_type }           # 分享完成上报

服务端 → 客户端:
  sync      { players, monsters, loots }  # 场景同步（每帧）
  damage    { source, target, amount, crit }
  loot_drop { id, item, x, y }
  level_up  { level, stats }
  item_get  { item }
  player_join   { player }
  player_leave  { player_id }
  monster_die   { monster_id, drops }
  chat_msg      { sender, content, channel }
  ad_reward     { type, reward }        # 广告奖励发放
  share_reward  { type, reward }        # 分享奖励发放
  revive        { hp }                  # 原地复活成功
```

### 4.4 客户端渲染

- **引擎**：Canvas 2D（与 snake/homophonic 同架构）
- **视角**：俯视 45° 等角（2.5D 效果）
- **Tile 地图**：20x20 像素 tile，分层渲染（地面/装饰/实体/UI）
- **精灵**：每个角色/怪物 4 方向 × 4 帧行走动画
- **摄像机**：跟随玩家，平滑插值
- **UI 层**：HUD（血条/经验条/小地图）、技能栏、摇杆

---

## 五、MVP 范围（第一版）

### 包含

- [x] 微信登录 + 选择职业
- [x] 2 张地图（新手村 + 迷雾森林）
- [x] 3 个职业（战士/弓手/法师）各 3 个技能
- [x] 5 种怪物 + 1 个 BOSS
- [x] 装备系统（6 个部位，4 个品质）
- [x] 装备强化（+1 到 +10）
- [x] 背包/装备穿戴
- [x] NPC 商店（药水/基础装备）
- [x] 自动战斗（挂机）
- [x] 1v1 竞技场
- [x] 世界聊天
- [x] 充值入口（钻石购买，1 元起）
- [x] 广告激励（每日钻石/原地复活/掉落加倍/体力恢复）
- [x] 分享奖励（分享得钻石/邀请好友得装备）
- [x] 每日签到（看广告翻倍）
- [x] 管理后台（玩家/怪物/物品/地图/订单/广告统计）

### 二期扩展

- [ ] 更多地图（沙漠→天空之城）
- [ ] 公会系统
- [ ] 组队系统
- [ ] 摆摊交易
- [ ] 每日任务/成就
- [ ] VIP 特权
- [ ] 时装系统
- [ ] 公会 BOSS
- [ ] 排行榜
- [ ] 好友系统

---

## 六、画面风格

- **整体**：明亮治愈的卡通像素风，类似"星露谷物语"遇上"传奇"
- **色调**：绿色草地为主基调，明亮饱和
- **角色**：16x16 或 32x32 像素小人，大头 Q 版，表情丰富
- **怪物**：可爱但有威胁感（圆滚滚的史莱姆、毛茸茸的狼）
- **UI**：木纹/羊皮纸质感的面板，圆角，手写体
- **特效**：夸张的击中闪光、金色经验数字飘字、彩色掉落光柱

---

## 七、开发排期（预估）

| 阶段 | 内容 | 工时 |
|------|------|------|
| P0 | 项目骨架 + 数据模型 + 基础 API | 1 天 |
| P1 | 地图渲染 + 角色移动 + 摇杆控制 | 1.5 天 |
| P2 | 怪物 AI + 战斗系统 + 掉落 | 1.5 天 |
| P3 | 装备/背包/强化 UI | 1 天 |
| P4 | 技能系统 + 特效 | 1 天 |
| P5 | 竞技场 | 0.5 天 |
| P6 | 聊天 + 商店 + 充值 | 1 天 |
| P7 | 管理后台 | 1 天 |
| P8 | 联调 + 测试 + 优化 | 1.5 天 |
| **总计** | | **10 天** |

---

## 八、关键技术难点

| 难点 | 方案 |
|------|------|
| 多人实时同步 | 服务端权威 + 客户端预测 + 插值（200ms tick） |
| 地图大小 | 分区加载，只同步视野范围内实体 |
| 性能优化 | 离屏 Canvas 缓存 tile，脏矩形渲染 |
| 微信支付 | 服务端对接微信支付 API，签名验证 |
| 数据安全 | 所有战斗/掉落在服务端计算，客户端只展示 |
| 挂机系统 | 服务端定时器驱动，客户端断线不影响 |
