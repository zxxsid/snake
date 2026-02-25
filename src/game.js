const CELL_SIZE = 20;
const TICK_INTERVAL = 120;

const Direction = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

export function createGame(cols, rows) {
  const state = {
    snake: [],
    food: null,
    direction: Direction.RIGHT,
    nextDirection: Direction.RIGHT,
    score: 0,
    gameOver: false,
    cols,
    rows,
  };

  resetGame(state);
  return state;
}

export function resetGame(state) {
  const midX = Math.floor(state.cols / 2);
  const midY = Math.floor(state.rows / 2);

  state.snake = [
    { x: midX, y: midY },
    { x: midX - 1, y: midY },
    { x: midX - 2, y: midY },
  ];
  state.direction = Direction.RIGHT;
  state.nextDirection = Direction.RIGHT;
  state.score = 0;
  state.gameOver = false;
  state.food = spawnFood(state);
}

export function spawnFood(state) {
  const occupied = new Set(state.snake.map((s) => `${s.x},${s.y}`));
  const free = [];

  for (let x = 0; x < state.cols; x++) {
    for (let y = 0; y < state.rows; y++) {
      if (!occupied.has(`${x},${y}`)) {
        free.push({ x, y });
      }
    }
  }

  if (free.length === 0) return null;
  return free[Math.floor(Math.random() * free.length)];
}

export function setDirection(state, dir) {
  const opposite =
    state.direction.x + dir.x === 0 && state.direction.y + dir.y === 0;
  if (!opposite) {
    state.nextDirection = dir;
  }
}

export function tick(state) {
  if (state.gameOver) return state;

  state.direction = state.nextDirection;
  const head = state.snake[0];
  const newHead = {
    x: head.x + state.direction.x,
    y: head.y + state.direction.y,
  };

  if (
    newHead.x < 0 ||
    newHead.x >= state.cols ||
    newHead.y < 0 ||
    newHead.y >= state.rows
  ) {
    state.gameOver = true;
    return state;
  }

  if (state.snake.some((s) => s.x === newHead.x && s.y === newHead.y)) {
    state.gameOver = true;
    return state;
  }

  state.snake.unshift(newHead);

  if (state.food && newHead.x === state.food.x && newHead.y === state.food.y) {
    state.score += 10;
    state.food = spawnFood(state);
  } else {
    state.snake.pop();
  }

  return state;
}

export function draw(ctx, state) {
  const w = state.cols * CELL_SIZE;
  const h = state.rows * CELL_SIZE;

  ctx.fillStyle = '#16213e';
  ctx.fillRect(0, 0, w, h);

  drawGrid(ctx, state);

  if (state.food) {
    ctx.fillStyle = '#ff6b6b';
    ctx.shadowColor = '#ff6b6b';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(
      state.food.x * CELL_SIZE + CELL_SIZE / 2,
      state.food.y * CELL_SIZE + CELL_SIZE / 2,
      CELL_SIZE / 2 - 2,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  state.snake.forEach((seg, i) => {
    const brightness = 1 - (i / state.snake.length) * 0.5;
    ctx.fillStyle = `rgba(0, 210, 255, ${brightness})`;
    ctx.fillRect(
      seg.x * CELL_SIZE + 1,
      seg.y * CELL_SIZE + 1,
      CELL_SIZE - 2,
      CELL_SIZE - 2,
    );
  });

  if (state.gameOver) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束!', w / 2, h / 2 - 10);
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#eee';
    ctx.fillText(`得分: ${state.score}`, w / 2, h / 2 + 20);
  }
}

function drawGrid(ctx, state) {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= state.cols; x++) {
    ctx.beginPath();
    ctx.moveTo(x * CELL_SIZE, 0);
    ctx.lineTo(x * CELL_SIZE, state.rows * CELL_SIZE);
    ctx.stroke();
  }
  for (let y = 0; y <= state.rows; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * CELL_SIZE);
    ctx.lineTo(state.cols * CELL_SIZE, y * CELL_SIZE);
    ctx.stroke();
  }
}

export { Direction, CELL_SIZE, TICK_INTERVAL };
