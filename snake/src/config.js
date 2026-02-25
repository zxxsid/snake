// 游戏配置 - 所有参数均可修改以调整游戏平衡

export const CONFIG = {
  // 格子尺寸（像素）
  CELL_SIZE: 22,

  // 无边界地图 - 实体管理范围
  SPAWN_RADIUS: 18,
  CLEANUP_RADIUS: 40,

  // 蛇属性
  SNAKE: {
    INITIAL_LENGTH: 5,
    INITIAL_SPEED: 5,
    INITIAL_ATTACK: 0,
    INITIAL_DEFENSE: 0,
    MIN_LENGTH: 2,
    MAX_SPEED: 20,
  },

  // 道具配置
  POWERUP: {
    MAX_COUNT: 8,
    SPAWN_INTERVAL: 2500,
    TYPES: [
      { id: 'heart1', name: '心+1', symbol: '♥', color: '#ff4444', effectType: 'length', effectValue: 1, weight: 30 },
      { id: 'heart3', name: '心+3', symbol: '♥♥♥', color: '#ff0066', effectType: 'length', effectValue: 3, weight: 10 },
      { id: 'speed1', name: '脚+1', symbol: '⚡', color: '#44ff44', effectType: 'speed', effectValue: 1, weight: 20 },
      { id: 'attack1', name: '剑+1', symbol: '⚔', color: '#ffaa00', effectType: 'attack', effectValue: 1, weight: 20 },
      { id: 'defense1', name: '盾+1', symbol: '◆', color: '#4488ff', effectType: 'defense', effectValue: 1, weight: 20 },
    ],
  },

  // 敌人配置
  ENEMY: {
    MAX_COUNT: 3,
    FIRST_SPAWN_DELAY: 12000,
    SPAWN_INTERVAL: 8000,
    SPAWN_MIN_DIST: 15,
    SPAWN_MAX_DIST: 22,
    TYPES: [
      { id: 'boar', name: '野猪', symbol: '猪', color: '#8B4513', hp: 5, attack: 2, speed: 2, attackInterval: 2000, weight: 50 },
      { id: 'wolf', name: '野狼', symbol: '狼', color: '#708090', hp: 3, attack: 3, speed: 3, attackInterval: 1500, weight: 50 },
    ],
  },

  // 沙漠主题色
  THEME: {
    SAND_BASE: [240, 217, 160],
    CACTUS_FILL: '#5D9B3F',
    CACTUS_STROKE: '#3D6B2F',
    ROCK_FILL: '#B09070',
    ROCK_STROKE: '#7A6050',
  },
};
