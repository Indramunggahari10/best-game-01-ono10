// The screenshot scenes behind ?shot=start|play|surge|end. Each one plays the real
// rules forward from a fresh world for a fixed number of seconds, steered by the same
// autopilot a careful player would use — so the frame is what a real game looks like,
// and the same seed always gives the same frame.
import { STEP } from './config.js';
import { EVENT_HIT, EVENT_OVER, autopilotSteer, autopilotDash } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 14;
const SURGE_SECONDS = 38;
const END_LIMIT_SECONDS = 240;

// Play forward with the autopilot (dodging, dashing when a rock is about to arrive).
function runFor(world, seconds) {
  for (let index = 0; index < seconds / STEP; index += 1) {
    const events = world.step(STEP, autopilotSteer(world), autopilotDash(world), false);
    if (events & EVENT_OVER) break;
  }
  return world.state.over;
}

/**
 * Set `world` to the named scene (start, play, surge or end; any other name is start)
 * and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'surge' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      world.step(STEP, autopilotSteer(world), false, true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'surge') {
    runFor(world, SURGE_SECONDS);
    return { screen: world.state.over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'end') {
    // A pilot who starts careful, then gets reckless: after the first hull hit it
    // gives up and drifts, so the rocks finish the run — a real game over mid-game,
    // not a marathon and not an instant death.
    runFor(world, 20);
    let hit = false;
    for (let index = 0; index < END_LIMIT_SECONDS / STEP; index += 1) {
      const s = world.state;
      let steer = { x: 0, y: 0, mouse: false };
      if (!hit) {
        let tx = s.ship.x;
        let ty = s.ship.y - 160;
        let bestD = Infinity;
        for (const shard of s.shards) {
          const d = Math.hypot(shard.x - s.ship.x, shard.y - s.ship.y);
          if (d < bestD) {
            bestD = d;
            tx = shard.x;
            ty = shard.y;
          }
        }
        const dx = tx - s.ship.x;
        const dy = ty - s.ship.y;
        const len = Math.hypot(dx, dy) || 1;
        steer = { x: dx / len, y: dy / len, mouse: false };
      }
      const events = world.step(STEP, steer, false, false);
      if (events & EVENT_HIT) hit = true;
      if (events & EVENT_OVER) break;
    }
    return { screen: SCREEN_OVER, best: world.state.score };
  }
  runFor(world, PLAY_SECONDS);
  return { screen: world.state.over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
