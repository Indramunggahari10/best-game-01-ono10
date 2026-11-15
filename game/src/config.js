// NOVA HARVEST — tuning constants. One place for every number the game balances on,
// so a level, a speed or a colour is a one-line change, never a hunt through the code.
export const VIEW = { width: 1280, height: 720 };
export const STEP = 1 / 60;
export const BEST_KEY = 'nova-harvest-best';

// The ship: how fast it answers the stick, how fast it can ever go, and the dash.
export const SHIP = {
  radius: 16,
  accel: 2400,
  maxSpeed: 430,
  drag: 2.6,
  dashSpeed: 900,
  dashTime: 0.16,
  dashCooldown: 1.1,
  invulnTime: 1.3,
};

// What falls: shards to harvest, rocks to dodge, shields to save you.
export const SHARD = { radius: 11, score: 10, fallMin: 55, fallMax: 120, spawnEvery: 0.5 };
export const ROCK = { radiusMin: 16, radiusMax: 42, fallMin: 90, fallMax: 185, spawnEvery: 0.9 };
export const SHIELD = { radius: 13, spawnEvery: 14 };
export const COMBO_WINDOW = 3.0;
export const MAX_HULL = 3;

// Each level asks for more shards and throws faster, denser rock.
export function quotaFor(level) {
  return 6 + level * 4;
}
export function rockRateFor(level) {
  return Math.max(0.38, ROCK.spawnEvery - (level - 1) * 0.09);
}
export function rockSpeedFor(level) {
  return 1 + (level - 1) * 0.16;
}
export function levelBonus(level) {
  return 100 * level;
}

// The palette: deep space, nebula washes, and the two harvest colours.
export const PALETTE = {
  spaceTop: '#04050f',
  spaceBottom: '#0a1030',
  nebula: ['#3b1d5e', '#0d3b4d', '#4d1d3a'],
  shard: '#ffd75e',
  shardCore: '#fff3c4',
  shardAlt: '#5ef2ff',
  rock: '#8a7f74',
  rockDark: '#4a423c',
  rockRim: '#c9b8a3',
  ship: '#7df9ff',
  shipDark: '#1b6f8f',
  flame: '#ff9a3d',
  hull: '#ff5e7a',
  shield: '#6ee7ff',
  text: '#eaf6ff',
  dim: '#8fa8c8',
};
