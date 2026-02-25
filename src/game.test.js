import { describe, it, expect } from 'vitest';
import {
  createGame,
  resetGame,
  tick,
  setDirection,
  spawnFood,
  Direction,
} from './game.js';

describe('createGame', () => {
  it('should create a game with initial state', () => {
    const game = createGame(20, 20);
    expect(game.snake).toHaveLength(3);
    expect(game.score).toBe(0);
    expect(game.gameOver).toBe(false);
    expect(game.food).not.toBeNull();
    expect(game.cols).toBe(20);
    expect(game.rows).toBe(20);
  });

  it('should place the snake in the center', () => {
    const game = createGame(20, 20);
    expect(game.snake[0]).toEqual({ x: 10, y: 10 });
  });
});

describe('tick', () => {
  it('should move the snake forward', () => {
    const game = createGame(20, 20);
    game.food = { x: 0, y: 0 };
    const headBefore = { ...game.snake[0] };
    tick(game);
    expect(game.snake[0].x).toBe(headBefore.x + 1);
    expect(game.snake[0].y).toBe(headBefore.y);
  });

  it('should end game on wall collision', () => {
    const game = createGame(20, 20);
    game.food = { x: 0, y: 0 };
    game.snake = [{ x: 19, y: 5 }, { x: 18, y: 5 }, { x: 17, y: 5 }];
    game.direction = Direction.RIGHT;
    game.nextDirection = Direction.RIGHT;
    tick(game);
    expect(game.gameOver).toBe(true);
  });

  it('should end game on self collision', () => {
    const game = createGame(20, 20);
    game.food = { x: 0, y: 0 };
    game.snake = [
      { x: 5, y: 5 },
      { x: 6, y: 5 },
      { x: 6, y: 6 },
      { x: 5, y: 6 },
      { x: 4, y: 6 },
      { x: 4, y: 5 },
    ];
    game.direction = Direction.DOWN;
    game.nextDirection = Direction.DOWN;
    tick(game);
    expect(game.gameOver).toBe(true);
  });

  it('should increase score when eating food', () => {
    const game = createGame(20, 20);
    game.snake = [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }];
    game.food = { x: 6, y: 5 };
    game.direction = Direction.RIGHT;
    game.nextDirection = Direction.RIGHT;
    tick(game);
    expect(game.score).toBe(10);
    expect(game.snake).toHaveLength(4);
  });

  it('should not tick when game is over', () => {
    const game = createGame(20, 20);
    game.gameOver = true;
    const snakeBefore = [...game.snake];
    tick(game);
    expect(game.snake).toEqual(snakeBefore);
  });
});

describe('setDirection', () => {
  it('should change direction', () => {
    const game = createGame(20, 20);
    setDirection(game, Direction.UP);
    expect(game.nextDirection).toEqual(Direction.UP);
  });

  it('should not allow reversing direction', () => {
    const game = createGame(20, 20);
    game.direction = Direction.RIGHT;
    setDirection(game, Direction.LEFT);
    expect(game.nextDirection).toEqual(Direction.RIGHT);
  });
});

describe('resetGame', () => {
  it('should reset to initial state', () => {
    const game = createGame(20, 20);
    game.score = 100;
    game.gameOver = true;
    resetGame(game);
    expect(game.score).toBe(0);
    expect(game.gameOver).toBe(false);
    expect(game.snake).toHaveLength(3);
  });
});

describe('spawnFood', () => {
  it('should return null when board is full', () => {
    const game = createGame(2, 2);
    game.snake = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ];
    expect(spawnFood(game)).toBeNull();
  });

  it('should not place food on snake', () => {
    const game = createGame(3, 1);
    game.snake = [{ x: 0, y: 0 }, { x: 1, y: 0 }];
    const food = spawnFood(game);
    expect(food).toEqual({ x: 2, y: 0 });
  });
});
