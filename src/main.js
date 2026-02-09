import BootScene from './scenes/BootScene.js';
import PreloadScene from './scenes/PreloadScene.js';
import MenuScene from './scenes/MenuScene.js';
import HUDScene from './scenes/HUDScene.js';
import Level1 from './levels/Level1.js';

// Register future levels here (2..50 can be added later).
const LEVEL_SCENES = {
  1: Level1,
};

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 960,
  height: 540,
  backgroundColor: '#0b1020',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 1200 },
      debug: false,
    },
  },
  pixelArt: true,
  scene: [BootScene, PreloadScene, MenuScene, HUDScene, Level1],
};

const game = new Phaser.Game(config);

// Make level scene classes available to the LevelManager (loaded in Preload).
// We attach to game for easy access without bundlers.
game.registry.set('LEVEL_SCENES', LEVEL_SCENES);

export default game;
