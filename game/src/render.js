// The renderer: one canvas, painted every frame. Deep-space gradient, drifting nebula,
// three twinkling star layers, glowing shards, tumbling rocks, a dart of a ship with a
// flame and a trail — and the HUD and screens over it all. No images, no network: every
// pixel is drawn from the world state.
import { VIEW, SHIP, SHARD, ROCK, SHIELD, PALETTE } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const TAU = Math.PI * 2;
const NEBULA_COLORS = ['rgba(59,29,94,', 'rgba(13,59,77,', 'rgba(77,29,58,'];

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function star4(ctx, x, y, r, rot) {
  ctx.beginPath();
  for (let i = 0; i < 4; i += 1) {
    const a = rot + (i * Math.PI) / 2;
    const a2 = a + Math.PI / 4;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    ctx.lineTo(x + Math.cos(a2) * r * 0.28, y + Math.sin(a2) * r * 0.28);
  }
  ctx.closePath();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = VIEW.width * dpr;
  canvas.height = VIEW.height * dpr;
  ctx.scale(dpr, dpr);

  function fit() {
    const scale = Math.min(window.innerWidth / VIEW.width, window.innerHeight / VIEW.height);
    canvas.style.width = `${Math.floor(VIEW.width * scale)}px`;
    canvas.style.height = `${Math.floor(VIEW.height * scale)}px`;
  }
  window.addEventListener('resize', fit);
  fit();

  function drawBackground(world) {
    const g = ctx.createLinearGradient(0, 0, 0, VIEW.height);
    g.addColorStop(0, PALETTE.spaceTop);
    g.addColorStop(1, PALETTE.spaceBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    for (const blob of world.nebula) {
      const rg = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.r);
      rg.addColorStop(0, `${NEBULA_COLORS[blob.hue]}0.34)`);
      rg.addColorStop(1, `${NEBULA_COLORS[blob.hue]}0)`);
      ctx.fillStyle = rg;
      ctx.fillRect(blob.x - blob.r, blob.y - blob.r, blob.r * 2, blob.r * 2);
    }
    for (let layer = 0; layer < world.stars.length; layer += 1) {
      for (const star of world.stars[layer]) {
        const a = 0.35 + 0.4 * (0.5 + 0.5 * Math.sin(star.twinkle));
        ctx.globalAlpha = a;
        ctx.fillStyle = layer === 2 ? '#cfe8ff' : '#ffffff';
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawShard(shard) {
    const color = shard.alt ? PALETTE.shardAlt : PALETTE.shard;
    const core = shard.alt ? '#e8fdff' : PALETTE.shardCore;
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
    ctx.fillStyle = color;
    star4(ctx, shard.x, shard.y, SHARD.radius + 4, shard.spin);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = core;
    star4(ctx, shard.x, shard.y, SHARD.radius * 0.45, shard.spin);
    ctx.fill();
    ctx.restore();
  }

  function drawRock(rock) {
    ctx.save();
    ctx.translate(rock.x, rock.y);
    ctx.rotate(rock.rot);
    ctx.beginPath();
    for (let i = 0; i < rock.verts.length; i += 1) {
      const a = (i / rock.verts.length) * TAU;
      const r = rock.radius * rock.verts[i];
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fillStyle = PALETTE.rock;
    ctx.fill();
    ctx.strokeStyle = PALETTE.rockRim;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.7;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = PALETTE.rockDark;
    ctx.beginPath();
    ctx.arc(-rock.radius * 0.25, -rock.radius * 0.1, rock.radius * 0.22, 0, TAU);
    ctx.arc(rock.radius * 0.3, rock.radius * 0.3, rock.radius * 0.16, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawShieldItem(item, time) {
    const pulse = 1 + 0.12 * Math.sin(time * 5 + item.sway);
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.shadowColor = PALETTE.shield;
    ctx.shadowBlur = 18;
    ctx.strokeStyle = PALETTE.shield;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, SHIELD.radius * pulse, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(6, 0);
    ctx.lineTo(0, 7);
    ctx.lineTo(-6, 0);
    ctx.closePath();
    ctx.fillStyle = '#dff8ff';
    ctx.fill();
    ctx.restore();
  }

  function drawShip(ship, time, hasShield) {
    ctx.save();
    ctx.translate(ship.x, ship.y);
    if (ship.invuln > 0 && Math.floor(time * 12) % 2 === 0) ctx.globalAlpha = 0.35;
    // Engine flame, flickering with time and stretched by speed.
    const speed = Math.hypot(ship.vx, ship.vy);
    const flame = 16 + Math.sin(time * 31) * 4 + speed * 0.03;
    ctx.rotate(ship.angle);
    const fg = ctx.createLinearGradient(-14, 0, -14 - flame, 0);
    fg.addColorStop(0, '#ffe9a8');
    fg.addColorStop(0.5, PALETTE.flame);
    fg.addColorStop(1, 'rgba(255,90,40,0)');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(-13, -5);
    ctx.lineTo(-14 - flame, 0);
    ctx.lineTo(-13, 5);
    ctx.closePath();
    ctx.fill();
    // The dart itself.
    const body = ctx.createLinearGradient(-18, 0, 22, 0);
    body.addColorStop(0, PALETTE.shipDark);
    body.addColorStop(1, PALETTE.ship);
    ctx.shadowColor = PALETTE.ship;
    ctx.shadowBlur = 18;
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(22, 0);
    ctx.lineTo(-12, -13);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-12, 13);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(6, 0, 3.4, 0, TAU);
    ctx.fill();
    ctx.restore();
    if (hasShield) {
      ctx.save();
      ctx.strokeStyle = PALETTE.shield;
      ctx.globalAlpha = 0.75 + 0.2 * Math.sin(time * 4);
      ctx.lineWidth = 2.5;
      ctx.shadowColor = PALETTE.shield;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(ship.x, ship.y, SHIP.radius + 10, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawParts(parts) {
    for (const p of parts) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawPopups(popups) {
    ctx.textAlign = 'center';
    ctx.font = '700 19px "Segoe UI", system-ui, sans-serif';
    for (const p of popups) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawHud(s) {
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.text;
    ctx.font = '800 34px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(String(s.score).padStart(6, '0'), 24, 46);
    ctx.font = '600 14px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = PALETTE.dim;
    ctx.fillText('SCORE', 24, 68);
    // Hull hearts.
    for (let i = 0; i < 3; i += 1) {
      const x = 30 + i * 30;
      const y = 92;
      ctx.fillStyle = i < s.hull ? PALETTE.hull : 'rgba(255,94,122,0.22)';
      ctx.beginPath();
      ctx.moveTo(x, y + 5);
      ctx.bezierCurveTo(x - 9, y - 4, x - 5, y - 12, x, y - 5);
      ctx.bezierCurveTo(x + 5, y - 12, x + 9, y - 4, x, y + 5);
      ctx.fill();
    }
    if (s.shield) {
      ctx.fillStyle = PALETTE.shield;
      ctx.font = '700 13px "Segoe UI", system-ui, sans-serif';
      ctx.fillText('◈ SHIELD', 120, 96);
    }
    // Combo.
    if (s.combo >= 2) {
      ctx.fillStyle = '#ffd75e';
      ctx.font = '800 26px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(`COMBO ×${Math.min(8, s.combo)}`, 24, 138);
      ctx.fillStyle = 'rgba(255,215,94,0.35)';
      roundRect(ctx, 24, 148, 120, 6, 3);
      ctx.fill();
      ctx.fillStyle = '#ffd75e';
      roundRect(ctx, 24, 148, 120 * Math.max(0, s.comboTimer / 3), 6, 3);
      ctx.fill();
    }
    // Level + quota, top right.
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.text;
    ctx.font = '800 24px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`LEVEL ${s.level}`, VIEW.width - 24, 44);
    ctx.font = '600 14px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = PALETTE.dim;
    ctx.fillText(`HARVEST ${s.collected} / ${s.quota}`, VIEW.width - 24, 68);
    ctx.fillStyle = 'rgba(125,249,255,0.3)';
    roundRect(ctx, VIEW.width - 224, 78, 200, 8, 4);
    ctx.fill();
    ctx.fillStyle = '#7df9ff';
    roundRect(ctx, VIEW.width - 224, 78, 200 * (s.collected / s.quota), 8, 4);
    ctx.fill();
    // Dash cooldown pip, bottom centre.
    const ready = s.ship.dashCd <= 0;
    ctx.textAlign = 'center';
    ctx.font = '700 13px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = ready ? '#7df9ff' : 'rgba(143,168,200,0.6)';
    ctx.fillText(ready ? 'DASH READY  [SPACE]' : 'DASH …', VIEW.width / 2, VIEW.height - 18);
  }

  function drawTitle(s, best) {
    ctx.fillStyle = 'rgba(3,5,16,0.55)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.shadowColor = '#7df9ff';
    ctx.shadowBlur = 34;
    ctx.fillStyle = '#eaf6ff';
    ctx.font = '900 92px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('NOVA', VIEW.width / 2, 268);
    ctx.shadowColor = '#ffd75e';
    ctx.fillStyle = '#ffd75e';
    ctx.font = '900 92px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('HARVEST', VIEW.width / 2, 356);
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.text;
    ctx.font = '600 24px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('Pilot the last harvester. Gather star shards, dodge the rocks,', VIEW.width / 2, 414);
    ctx.fillText('fill the quota — and don’t lose your hull.', VIEW.width / 2, 446);
    ctx.fillStyle = '#7df9ff';
    ctx.font = '700 26px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('PRESS  SPACE  OR  CLICK  TO  LAUNCH', VIEW.width / 2, 516);
    ctx.fillStyle = PALETTE.dim;
    ctx.font = '600 17px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('Steer  ·  Arrow keys / WASD / mouse      Dash  ·  Space      Pause  ·  P', VIEW.width / 2, 566);
    if (best > 0) {
      ctx.fillStyle = '#ffd75e';
      ctx.font = '700 19px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(`BEST  ${best}`, VIEW.width / 2, 606);
    }
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(3,5,16,0.66)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = '900 64px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('PAUSED', VIEW.width / 2, 350);
    ctx.fillStyle = PALETTE.dim;
    ctx.font = '600 20px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('Press P or Space to keep flying', VIEW.width / 2, 396);
  }

  function drawOver(s, best) {
    ctx.fillStyle = 'rgba(3,5,16,0.72)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ff5e7a';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#ff8ba0';
    ctx.font = '900 72px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('MISSION OVER', VIEW.width / 2, 300);
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.text;
    ctx.font = '800 40px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`SCORE  ${s.score}`, VIEW.width / 2, 372);
    ctx.fillStyle = '#ffd75e';
    ctx.font = '700 24px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`BEST  ${best}      ·      REACHED LEVEL ${s.level}`, VIEW.width / 2, 416);
    ctx.fillStyle = '#7df9ff';
    ctx.font = '700 24px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('PRESS  SPACE  OR  CLICK  TO  FLY  AGAIN', VIEW.width / 2, 500);
  }

  function drawBanner(s) {
    if (s.banner <= 0) return;
    const a = Math.min(1, s.banner);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.font = '900 40px "Segoe UI", system-ui, sans-serif';
    const w = ctx.measureText(s.bannerText).width;
    ctx.fillStyle = 'rgba(3,5,16,0.72)';
    roundRect(ctx, VIEW.width / 2 - w / 2 - 26, 112, w + 52, 62, 12);
    ctx.fill();
    ctx.shadowColor = '#7df9ff';
    ctx.shadowBlur = 22;
    ctx.fillStyle = '#eaf6ff';
    ctx.fillText(s.bannerText, VIEW.width / 2, 154);
    ctx.restore();
  }

  return {
    draw(world, screen, best) {
      const s = world.state;
      ctx.save();
      if (s.shake > 0) {
        const m = s.shake * 22;
        ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
      }
      drawBackground(world);
      for (const shard of s.shards) drawShard(shard);
      for (const item of s.shields) drawShieldItem(item, s.time);
      for (const rock of s.rocks) drawRock(rock);
      drawShip(s.ship, s.time, s.shield);
      drawParts(s.parts);
      drawPopups(s.popups);
      ctx.restore();
      if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(s);
      drawBanner(s);
      if (screen === SCREEN_TITLE) drawTitle(s, best);
      else if (screen === SCREEN_PAUSED) drawPaused();
      else if (screen === SCREEN_OVER) drawOver(s, best);
    },
  };
}
