import BootScene from './scenes/BootScene.js';
import PreloadScene from './scenes/PreloadScene.js';
import MenuScene from './scenes/MenuScene.js';
import HUDScene from './scenes/HUDScene.js';
import ComingSoonScene from './scenes/ComingSoonScene.js';
import Level1 from './levels/Level1.js';
import Level2 from './levels/Level2.js';
import Level3 from './levels/Level3.js';
import Level4 from './levels/Level4.js';
import Level5 from './levels/Level5.js';
import Level6 from './levels/Level6.js';
import Level7 from './levels/Level7.js';
import Level8 from './levels/Level8.js';
import Level9 from './levels/Level9.js';
import Level10 from './levels/Level10.js';

const LEVEL_SCENES = {
  1: Level1,
  2: Level2,
  3: Level3,
  4: Level4,
  5: Level5,
  6: Level6,
  7: Level7,
  8: Level8,
  9: Level9,
  10: Level10,
};

const config = {
  type: Phaser.AUTO,
  backgroundColor: '#0b1020',

  // ─── Scale Manager ────────────────────────────────────────────────────────
  // FIT: Phaser renders at exactly 480×854 (9:16 portrait).
  // The canvas is then scaled uniformly to fill the #game container.
  // This never breaks level world-dimensions — all code that reads
  // this.scale.width / this.scale.height always gets 480 / 854.
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: 'game',
    width: 480,
    height: 854,
  },

  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 1200 },
      debug: false,
    },
  },
  pixelArt: true,
  scene: [
    BootScene, PreloadScene, MenuScene, HUDScene, ComingSoonScene,
    Level1, Level2, Level3, Level4, Level5,
    Level6, Level7, Level8, Level9, Level10,
  ],
  fps: {
    target: 60,
    forceSetTimeOut: true,
  },
  callbacks: {
    postBoot: (game) => {
      console.log('Phaser Game Booted — 480×854 portrait');
      game.canvas.style.cursor = 'default';
    },
  },
};

const game = new Phaser.Game(config);
game.registry.set('LEVEL_SCENES', LEVEL_SCENES);

// Expose to HTML button bridge (index.html reads window.__phaserGame)
window.__phaserGame = game;

export default game;
