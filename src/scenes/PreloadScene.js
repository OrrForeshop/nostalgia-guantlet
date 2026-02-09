import LevelManager from '../LevelManager.js';

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload() {
    const w = this.scale.width;
    const h = this.scale.height;

    this.cameras.main.setBackgroundColor('#0b1020');

    const title = this.add.text(w / 2, h / 2 - 60, 'Nostalgia Gauntlet', {
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      fontSize: '40px',
      color: '#e6ebff',
    }).setOrigin(0.5);

    const barBg = this.add.rectangle(w / 2, h / 2, 520, 18, 0x1b2450).setOrigin(0.5);
    const bar = this.add.rectangle(w / 2 - 260, h / 2, 0, 12, 0x8bd450).setOrigin(0, 0.5);

    this.load.on('progress', (p) => {
      bar.width = 520 * p;
    });

    // Core data for levels (50 entries, even if placeholders for now).
    this.load.json('levels', './assets/levels.json');

    // Generate simple textures so levels can use original, cohesive visuals.
    // (No external assets required.)
    this.createCoreTextures();

    // Avoid unused var lint warnings
    void title; void barBg;
  }

  createCoreTextures() {
    // Player texture
    const g = this.add.graphics();

    // PLAYER: rounded rect
    g.clear();
    g.fillStyle(0x76b7ff, 1);
    g.fillRoundedRect(0, 0, 24, 32, 6);
    g.lineStyle(2, 0x1f3a7a, 1);
    g.strokeRoundedRect(0, 0, 24, 32, 6);
    g.generateTexture('tex_player', 24, 32);

    // PLATFORM
    g.clear();
    g.fillStyle(0x2b3a73, 1);
    g.fillRect(0, 0, 64, 16);
    g.lineStyle(2, 0x141c3f, 1);
    g.strokeRect(0, 0, 64, 16);
    g.generateTexture('tex_platform', 64, 16);

    // HAZARD: small spinning "saw" circle
    g.clear();
    g.fillStyle(0xff5b6e, 1);
    g.fillCircle(12, 12, 11);
    g.lineStyle(2, 0x6b0f1b, 1);
    g.strokeCircle(12, 12, 11);
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8;
      const x1 = 12 + Math.cos(a) * 5;
      const y1 = 12 + Math.sin(a) * 5;
      const x2 = 12 + Math.cos(a) * 11;
      const y2 = 12 + Math.sin(a) * 11;
      g.lineStyle(2, 0xffffff, 0.7);
      g.lineBetween(x1, y1, x2, y2);
    }
    g.generateTexture('tex_hazard', 24, 24);

    // GOAL: flag
    g.clear();
    g.fillStyle(0xf6d365, 1);
    g.fillRect(2, 2, 4, 40);
    g.fillStyle(0x8bd450, 1);
    g.fillTriangle(6, 6, 30, 14, 6, 22);
    g.lineStyle(2, 0x1f3a7a, 0.7);
    g.strokeRect(2, 2, 4, 40);
    g.generateTexture('tex_goal', 32, 44);

    g.destroy();
  }

  create() {
    // Create a LevelManager and keep it available via registry.
    const levelManager = new LevelManager(this).loadFromCache();
    this.registry.set('levelManager', levelManager);

    this.scene.start('Menu');
  }
}
