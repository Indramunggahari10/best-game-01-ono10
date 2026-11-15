// The world: one ship, falling shards to harvest, tumbling rocks to dodge, the odd
// shield, and the particles and popups that make it feel alive. Everything here is pure
// simulation on a fixed step, driven by the seeded RNG, so the same seed + the same
// steering always plays the same game.
import {
  VIEW, STEP, SHIP, SHARD, ROCK, SHIELD, COMBO_WINDOW, MAX_HULL,
  quotaFor, rockRateFor, rockSpeedFor, levelBonus,
} from './config.js';
import { range } from './random.js';

export const EVENT_HIT = 1;
export const EVENT_PICKUP = 2;
export const EVENT_OVER = 4;
export const EVENT_LEVEL = 8;
export const EVENT_SHIELD = 16;
export const EVENT_DASH = 32;

const TAU = Math.PI * 2;

function makeStars(rng) {
  const layers = [];
  for (let layer = 0; layer < 3; layer += 1) {
    const stars = [];
    const count = 46 - layer * 12;
    for (let i = 0; i < count; i += 1) {
      stars.push({
        x: rng() * VIEW.width,
        y: rng() * VIEW.height,
        r: 0.6 + layer * 0.5 + rng() * 0.9,
        twinkle: rng() * TAU,
        speed: 6 + layer * 14,
      });
    }
    layers.push(stars);
  }
  return layers;
}

function makeNebula(rng) {
  const blobs = [];
  for (let i = 0; i < 5; i += 1) {
    blobs.push({
      x: rng() * VIEW.width,
      y: rng() * VIEW.height,
      r: 180 + rng() * 220,
      hue: i % 3,
      drift: range(rng, -6, 6),
    });
  }
  return blobs;
}

function spawnShard(world, y) {
  const { rng } = world;
  world.shards.push({
    x: range(rng, 30, VIEW.width - 30),
    y: y ?? -20,
    vy: range(rng, SHARD.fallMin, SHARD.fallMax),
    sway: range(rng, 0, TAU),
    swaySpeed: range(rng, 0.8, 2.2),
    alt: rng() < 0.22,
    spin: range(rng, 0, TAU),
    active: true,
  });
}

function spawnRock(world, y) {
  const { rng } = world;
  const level = world.state.level;
  const radius = range(rng, ROCK.radiusMin, ROCK.radiusMax);
  const verts = [];
  const n = 7 + Math.floor(rng() * 4);
  for (let i = 0; i < n; i += 1) verts.push(range(rng, 0.72, 1.15));
  world.rocks.push({
    x: range(rng, 40, VIEW.width - 40),
    y: y ?? -60,
    vy: range(rng, ROCK.fallMin, ROCK.fallMax) * rockSpeedFor(level),
    vx: range(rng, -26, 26),
    radius,
    verts,
    rot: range(rng, 0, TAU),
    rotSpeed: range(rng, -1.4, 1.4),
    active: true,
  });
}

function spawnShield(world) {
  const { rng } = world;
  world.shields.push({
    x: range(rng, 40, VIEW.width - 40),
    y: -20,
    vy: 65,
    sway: range(rng, 0, TAU),
    active: true,
  });
}

function burst(world, x, y, color, count, speed) {
  for (let i = 0; i < count; i += 1) {
    const a = world.rng() * TAU;
    const v = range(world.rng, speed * 0.3, speed);
    world.parts.push({
      x, y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: range(world.rng, 0.35, 0.8),
      max: 0.8,
      size: range(world.rng, 2, 5),
      color,
    });
  }
}

function popup(world, x, y, text, color) {
  world.popups.push({ x, y, text, color, life: 1.0 });
}

export function createWorld(rng) {
  const world = {
    rng,
    state: null,
    stars: makeStars(rng),
    nebula: makeNebula(rng),
  };
  world.reset = function reset() {
    world.state = {
      time: 0,
      score: 0,
      combo: 0,
      comboTimer: 0,
      hull: MAX_HULL,
      shield: false,
      level: 1,
      quota: quotaFor(1),
      collected: 0,
      ship: {
        x: VIEW.width / 2,
        y: VIEW.height - 110,
        vx: 0,
        vy: 0,
        angle: -Math.PI / 2,
        invuln: 0,
        dash: 0,
        dashCd: 0,
        trail: 0,
      },
      shards: [],
      rocks: [],
      shields: [],
      parts: [],
      popups: [],
      shardTimer: 0.3,
      rockTimer: 1.2,
      shieldTimer: SHIELD.spawnEvery,
      banner: 0,
      bannerText: '',
      shake: 0,
      over: false,
    };
    world.shards = world.state.shards;
    world.rocks = world.state.rocks;
    world.shields = world.state.shields;
    world.parts = world.state.parts;
    world.popups = world.state.popups;
    for (let i = 0; i < 8; i += 1) spawnShard(world, range(rng, 40, 320));
    for (let i = 0; i < 4; i += 1) spawnRock(world, range(rng, 40, 240));
  };
  // The step, bound to this world, so callers just say world.step(...).
  world.step = function step(dt, steer, dash, attract) {
    return stepWorld(world, dt, steer, dash, attract);
  };
  world.reset();
  return world;
}

// One fixed step. `steer` is {x, y, mouse} from input; `dash` asks for a dash;
// `attract` keeps the title screen alive without scoring or dying.
export function stepWorld(world, dt, steer, dash, attract) {
  const s = world.state;
  const events = 0;
  let out = events;
  s.time += dt;
  const ship = s.ship;

  // --- ship ---
  if (ship.dash > 0) {
    ship.dash -= dt;
  } else {
    const ax = steer.x * SHIP.accel;
    const ay = steer.y * SHIP.accel;
    ship.vx += ax * dt;
    ship.vy += ay * dt;
    const drag = Math.exp(-SHIP.drag * dt);
    ship.vx *= drag;
    ship.vy *= drag;
    const speed = Math.hypot(ship.vx, ship.vy);
    if (speed > SHIP.maxSpeed) {
      ship.vx = (ship.vx / speed) * SHIP.maxSpeed;
      ship.vy = (ship.vy / speed) * SHIP.maxSpeed;
    }
    if (dash && ship.dashCd <= 0 && (steer.x !== 0 || steer.y !== 0)) {
      const len = Math.hypot(steer.x, steer.y) || 1;
      ship.vx = (steer.x / len) * SHIP.dashSpeed;
      ship.vy = (steer.y / len) * SHIP.dashSpeed;
      ship.dash = SHIP.dashTime;
      ship.dashCd = SHIP.dashCooldown;
      out |= EVENT_DASH;
    }
  }
  ship.dashCd = Math.max(0, ship.dashCd - dt);
  ship.invuln = Math.max(0, ship.invuln - dt);
  ship.x = Math.min(VIEW.width - SHIP.radius, Math.max(SHIP.radius, ship.x + ship.vx * dt));
  ship.y = Math.min(VIEW.height - SHIP.radius, Math.max(SHIP.radius, ship.y + ship.vy * dt));
  const moving = Math.hypot(ship.vx, ship.vy);
  if (moving > 40) ship.angle = Math.atan2(ship.vy, ship.vx);
  ship.trail -= dt;
  if (moving > 120 && ship.trail <= 0) {
    ship.trail = 0.03;
    s.parts.push({
      x: ship.x - Math.cos(ship.angle) * 18,
      y: ship.y - Math.sin(ship.angle) * 18,
      vx: -ship.vx * 0.12,
      vy: -ship.vy * 0.12,
      life: 0.4,
      max: 0.4,
      size: range(world.rng, 2, 4),
      color: '#ff9a3d',
    });
  }

  // --- sky drifts (parallax lives here, the renderer reads the same numbers) ---
  for (const layer of world.stars) {
    for (const star of layer) {
      star.y += star.speed * dt;
      star.twinkle += dt * 2;
      if (star.y > VIEW.height + 2) {
        star.y = -2;
        star.x = world.rng() * VIEW.width;
      }
    }
  }
  for (const blob of world.nebula) {
    blob.x += blob.drift * dt;
    if (blob.x < -260) blob.x = VIEW.width + 260;
    if (blob.x > VIEW.width + 260) blob.x = -260;
  }

  // --- spawns ---
  s.shardTimer -= dt;
  if (s.shardTimer <= 0) {
    s.shardTimer = SHARD.spawnEvery * range(world.rng, 0.8, 1.25);
    spawnShard(world);
  }
  s.rockTimer -= dt;
  if (s.rockTimer <= 0) {
    s.rockTimer = rockRateFor(s.level) * range(world.rng, 0.8, 1.2);
    spawnRock(world);
  }
  s.shieldTimer -= dt;
  if (s.shieldTimer <= 0 && !s.shield) {
    s.shieldTimer = SHIELD.spawnEvery;
    spawnShield(world);
  }

  // --- shards ---
  for (const shard of s.shards) {
    if (!shard.active) continue;
    shard.sway += shard.swaySpeed * dt;
    shard.spin += dt * 2.4;
    shard.y += shard.vy * dt;
    shard.x += Math.sin(shard.sway) * 22 * dt;
    if (shard.y > VIEW.height + 24) {
      shard.active = false;
      continue;
    }
    const dx = shard.x - ship.x;
    const dy = shard.y - ship.y;
    if (dx * dx + dy * dy < (SHARD.radius + SHIP.radius) * (SHARD.radius + SHIP.radius)) {
      shard.active = false;
      if (!attract) {
        s.combo = s.comboTimer > 0 ? s.combo + 1 : 1;
        s.comboTimer = COMBO_WINDOW;
        const mult = Math.min(8, s.combo);
        const gained = SHARD.score * mult;
        s.score += gained;
        s.collected += 1;
        burst(world, shard.x, shard.y, shard.alt ? '#5ef2ff' : '#ffd75e', 10, 160);
        popup(world, shard.x, shard.y - 14, `+${gained}`, shard.alt ? '#5ef2ff' : '#ffd75e');
        out |= EVENT_PICKUP;
        if (s.collected >= s.quota) {
          s.level += 1;
          s.collected = 0;
          s.quota = quotaFor(s.level);
          const bonus = levelBonus(s.level - 1);
          s.score += bonus;
          s.banner = 2.2;
          s.bannerText = `LEVEL ${s.level} — HARVEST COMPLETE  +${bonus}`;
          burst(world, ship.x, ship.y, '#7df9ff', 26, 260);
          out |= EVENT_LEVEL;
        }
      }
    }
  }

  // --- rocks ---
  for (const rock of s.rocks) {
    if (!rock.active) continue;
    rock.y += rock.vy * dt;
    rock.x += rock.vx * dt;
    rock.rot += rock.rotSpeed * dt;
    if (rock.x < rock.radius) { rock.x = rock.radius; rock.vx = Math.abs(rock.vx); }
    if (rock.x > VIEW.width - rock.radius) { rock.x = VIEW.width - rock.radius; rock.vx = -Math.abs(rock.vx); }
    if (rock.y > VIEW.height + 70) {
      rock.active = false;
      continue;
    }
    const dx = rock.x - ship.x;
    const dy = rock.y - ship.y;
    const hitR = rock.radius * 0.86 + SHIP.radius * 0.8;
    if (dx * dx + dy * dy < hitR * hitR && ship.invuln <= 0 && ship.dash <= 0) {
      rock.active = false;
      if (attract) {
        // On the title screen the ship is a ghost: rocks pass through it.
        continue;
      }
      burst(world, rock.x, rock.y, '#c9b8a3', 18, 240);
      s.shake = 0.45;
      if (s.shield) {
        s.shield = false;
        ship.invuln = SHIP.invulnTime;
        popup(world, ship.x, ship.y - 30, 'SHIELD DOWN', '#6ee7ff');
      } else {
        s.hull -= 1;
        s.combo = 0;
        s.comboTimer = 0;
        ship.invuln = SHIP.invulnTime;
        popup(world, ship.x, ship.y - 30, 'HULL HIT', '#ff5e7a');
        burst(world, ship.x, ship.y, '#ff5e7a', 22, 300);
        out |= EVENT_HIT;
        if (s.hull <= 0) {
          s.over = true;
          burst(world, ship.x, ship.y, '#7df9ff', 46, 380);
          burst(world, ship.x, ship.y, '#ff9a3d', 30, 260);
          out |= EVENT_OVER;
        }
      }
    }
  }

  // --- shields ---
  for (const item of s.shields) {
    if (!item.active) continue;
    item.y += item.vy * dt;
    item.sway += dt * 2;
    item.x += Math.sin(item.sway) * 18 * dt;
    if (item.y > VIEW.height + 24) {
      item.active = false;
      continue;
    }
    const dx = item.x - ship.x;
    const dy = item.y - ship.y;
    if (dx * dx + dy * dy < (SHIELD.radius + SHIP.radius) * (SHIELD.radius + SHIP.radius)) {
      item.active = false;
      if (!attract && !s.shield) {
        s.shield = true;
        popup(world, ship.x, ship.y - 30, 'SHIELD UP', '#6ee7ff');
        burst(world, ship.x, ship.y, '#6ee7ff', 16, 200);
        out |= EVENT_SHIELD;
      }
    }
  }

  // --- combo decay, particles, popups, banner ---
  if (s.comboTimer > 0) {
    s.comboTimer -= dt;
    if (s.comboTimer <= 0) s.combo = 0;
  }
  for (const p of s.parts) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.exp(-1.5 * dt);
    p.vy *= Math.exp(-1.5 * dt);
  }
  s.parts = s.parts.filter((p) => p.life > 0);
  world.parts = s.parts;
  for (const p of s.popups) {
    p.life -= dt;
    p.y -= 34 * dt;
  }
  s.popups = s.popups.filter((p) => p.life > 0);
  world.popups = s.popups;
  s.shards = s.shards.filter((i) => i.active);
  world.shards = s.shards;
  s.rocks = s.rocks.filter((i) => i.active);
  world.rocks = s.rocks;
  s.shields = s.shields.filter((i) => i.active);
  world.shields = s.shields;
  if (s.banner > 0) s.banner -= dt;
  if (s.shake > 0) s.shake -= dt;

  return out;
}

// A fresh world for the title screen's living background: the ship flies itself.
export function stepAttract(world, dt) {
  return stepWorld(world, dt, autopilotSteer(world), false, true);
}

// Steer toward the nearest shard, shoved away from rocks that are close ahead.
export function autopilotSteer(world) {
  const s = world.state;
  const ship = s.ship;
  let tx = ship.x;
  let ty = ship.y - 160;
  let bestD = Infinity;
  for (const shard of s.shards) {
    const d = Math.hypot(shard.x - ship.x, shard.y - ship.y);
    if (d < bestD) {
      bestD = d;
      tx = shard.x;
      ty = shard.y;
    }
  }
  let ax = tx - ship.x;
  let ay = ty - ship.y;
  for (const rock of s.rocks) {
    const dx = ship.x - rock.x;
    const dy = ship.y - rock.y;
    const d = Math.hypot(dx, dy);
    const near = rock.radius + 90;
    if (d < near && d > 0.01) {
      const push = (near - d) / near * 620;
      ax += (dx / d) * push;
      ay += (dy / d) * push;
    }
  }
  const len = Math.hypot(ax, ay) || 1;
  return { x: ax / len, y: ay / len, mouse: false };
}

// Should the autopilot dash right now (a rock is about to arrive)? Cheap, used by shots.
export function autopilotDash(world) {
  const s = world.state;
  for (const rock of s.rocks) {
    const dx = rock.x - s.ship.x;
    const dy = rock.y - s.ship.y;
    if (dy > -10 && dy < 130 && Math.abs(dx) < rock.radius + 60) return true;
  }
  return false;
}
