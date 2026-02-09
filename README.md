# Nostalgia Gauntlet

HTML5 (Phaser 3 CDN) micro-level gauntlet.

## Run locally

Because the game loads `assets/levels.json`, run via a local web server:

```bash
cd /home/oran/clawd/projects/nostalgia-gauntlet
python3 -m http.server 8080
```

Then open: http://localhost:8080

## Controls

- Move: WASD / Arrow Keys
- Jump: W / Up / Space
- Restart: R
- Pause: Esc

## Structure

- `assets/levels.json` — level list (50 entries)
- `src/LevelManager.js` — starts/restarts/advances levels
- `src/levels/LevelBase.js` — base class for all levels
- `src/levels/Level1.js` — Level 1 MVP (classic platformer)
- `src/scenes/*` — Boot/Preload/Menu/HUD

## Adding Level 2+

1. Create `src/levels/Level2.js` extending `LevelBase`.
2. Register it in `src/main.js` in `LEVEL_SCENES`.
3. Update `assets/levels.json` objective/title.

