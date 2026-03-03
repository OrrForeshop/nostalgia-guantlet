import LevelManager from '../LevelManager.js';

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload() {
    const w = this.scale.width;
    const h = this.scale.height;

    this.cameras.main.setBackgroundColor('#0b1020');

    const barBg = this.add.rectangle(w / 2, h / 2, 520, 18, 0x1b2450).setOrigin(0.5);
    const bar = this.add.rectangle(w / 2 - 260, h / 2, 0, 12, 0x8bd450).setOrigin(0, 0.5);

    this.load.on('progress', (p) => {
      bar.width = 520 * p;
    });

    this.load.json('levels', './assets/levels.json');
    
    // ONLY generate textures that are GLOBAL across all levels
    this.createGlobalTextures();
  }

  createGlobalTextures() {
    const g = this.add.graphics();

    // HEART: Life icon
    g.clear();
    g.fillStyle(0xff0000, 1);
    g.fillCircle(7, 7, 7);
    g.fillCircle(17, 7, 7);
    g.fillTriangle(0, 10, 24, 10, 12, 24);
    g.generateTexture('tex_heart', 24, 24);
    
    // TIMER ICON
    g.clear();
    g.fillStyle(0x1b2450, 1);
    g.fillCircle(10, 11, 8);
    g.lineStyle(2, 0xe6ebff, 1);
    g.strokeCircle(10, 11, 8);
    g.generateTexture('tex_icon_timer', 20, 20);

    g.destroy();
  }

  create() {
    this.game.registry.set('playerLives', 3);
    try {
      const levelManager = new LevelManager(this).loadFromCache();
      this.registry.set('levelManager', levelManager);
      
      const params = new URLSearchParams(window.location.search);
      const forceLevel = params.get('level');
      
      if (forceLevel) {
        const lv = parseInt(forceLevel, 10);
        const sceneKey = `Level${lv}`;
        // Guard: only start the level if the scene actually exists
        if (this.scene.get(sceneKey)) {
          console.log('Force Loading Level:', lv);
          this.scene.start(sceneKey);
          this.scene.launch('HUD');
          this.scene.stop('Preload');
        } else {
          console.warn(`Level ${lv} not yet implemented — redirecting to menu`);
          this.scene.start('ComingSoon', { level: lv });
        }
      } else {
        this.scene.start('Menu');
      }
    } catch (e) {
      console.error('Critical Error in Preload:', e);
      this.scene.start('Menu');
    }
  }
}
