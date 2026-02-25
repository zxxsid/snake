import {
  createGame,
  resetGame,
  setDirection,
  tick,
  draw,
  Direction,
  CELL_SIZE,
  TICK_INTERVAL,
} from './game.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const startBtn = document.getElementById('start-btn');
const statusEl = document.getElementById('status');

const COLS = canvas.width / CELL_SIZE;
const ROWS = canvas.height / CELL_SIZE;

const game = createGame(COLS, ROWS);
let intervalId = null;
let highScore = 0;

function startGame() {
  if (intervalId) clearInterval(intervalId);
  resetGame(game);
  updateUI();
  statusEl.textContent = '方向键或 WASD 控制方向';
  startBtn.textContent = '重新开始';

  intervalId = setInterval(() => {
    tick(game);
    draw(ctx, game);
    updateUI();

    if (game.gameOver) {
      clearInterval(intervalId);
      intervalId = null;
      if (game.score > highScore) {
        highScore = game.score;
        highScoreEl.textContent = highScore;
      }
      statusEl.textContent = '游戏结束！按 "重新开始" 或空格键再来一局';
    }
  }, TICK_INTERVAL);
}

function updateUI() {
  scoreEl.textContent = game.score;
}

const keyMap = {
  ArrowUp: Direction.UP,
  ArrowDown: Direction.DOWN,
  ArrowLeft: Direction.LEFT,
  ArrowRight: Direction.RIGHT,
  w: Direction.UP,
  W: Direction.UP,
  s: Direction.DOWN,
  S: Direction.DOWN,
  a: Direction.LEFT,
  A: Direction.LEFT,
  d: Direction.RIGHT,
  D: Direction.RIGHT,
};

document.addEventListener('keydown', (e) => {
  if (e.key === ' ') {
    e.preventDefault();
    startGame();
    return;
  }
  const dir = keyMap[e.key];
  if (dir) {
    e.preventDefault();
    setDirection(game, dir);
  }
});

startBtn.addEventListener('click', startGame);

draw(ctx, game);
