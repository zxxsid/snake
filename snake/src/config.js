// 游戏配置 - 所有参数均可修改以调整游戏平衡

export const CONFIG = {
  CELL_SIZE: 20,
  GRID_COLS: 30,
  GRID_ROWS: 30,
  HUD_HEIGHT: 70,

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
    MAX_COUNT: 5,
    SPAWN_INTERVAL: 3000,
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
    TYPES: [
      { id: 'boar', name: '野猪', symbol: '猪', color: '#8B4513', hp: 5, attack: 2, speed: 2, attackInterval: 2000, weight: 50 },
      { id: 'wolf', name: '野狼', symbol: '狼', color: '#708090', hp: 3, attack: 3, speed: 3, attackInterval: 1500, weight: 50 },
    ],
  },
};
