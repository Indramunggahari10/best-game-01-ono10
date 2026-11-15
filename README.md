# best-game-01-ono10

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Indramunggahari10/best-game-01-ono10/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Indramunggahari10/best-game-01-ono10/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**NOVA HARVEST** — a neon space-harvest arcade game. Pilot the last harvester through a falling meteor field: gather star shards, dodge tumbling rocks, chain combos, grab shields, and fill each level's harvest quota before your hull gives out.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 — no build step, no network, just static files under `game/`.

Or run the entrypoint directly (it copies the game and screenshots into `out/` and writes the judge's dossier):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## How to play

- **Steer** — arrow keys / WASD / hold the mouse
- **Dash** — Space (hold) or Shift, with a short cooldown
- **Pause** — P or Esc
- **Restart** — Space or click on the game-over screen

Collect shards to fill the quota (`HARVEST n / quota`): each shard scores 10 × your combo, and combos climb while you keep collecting within 3 seconds. Rocks cost one hull heart (three hearts, then the mission ends) — a shield absorbs one hit. Every quota you fill levels the game up: faster rocks, denser field, a score bonus.

Screenshots in `screenshots/` are real renders of the game's own code (`?shot=start|play|surge|end&seed=7`), staged by the autopilot in `game/src/shots.js`.

---

Entered on [make.fun](https://make.fun/?ref=j9vvzrcw&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards
