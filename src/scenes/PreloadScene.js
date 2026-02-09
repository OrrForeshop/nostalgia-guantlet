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

    // PLAYER: Little guy with blue bucket hat, green sweater, brown pants
    g.clear();
    
    // Brown pants (bottom)
    g.fillStyle(0x5c4a32, 1);
    g.fillRect(4, 28, 8, 12);  // left leg
    g.fillRect(14, 28, 8, 12); // right leg
    
    // Green sweater (body)
    g.fillStyle(0x2ecc71, 1);
    g.fillRoundedRect(2, 14, 22, 16, 4);
    
    // Small crown on sweater
    g.fillStyle(0xf1c40f, 1);
    g.fillTriangle(10, 20, 13, 16, 16, 20);
    
    // Face/head (peach color)
    g.fillStyle(0xffccaa, 1);
    g.fillCircle(13, 10, 8);
    
    // Blue bucket hat
    g.fillStyle(0x3498db, 1);
    g.fillRect(3, 2, 20, 8);
    g.fillRect(1, 8, 24, 4);
    
    // Hat outline
    g.lineStyle(2, 0x1a5276, 1);
    g.strokeRect(3, 2, 20, 8);
    g.strokeRect(1, 8, 24, 4);
    
    // Smile
    g.lineStyle(1, 0x333333, 1);
    g.beginPath();
    g.arc(13, 11, 4, 0.2, Math.PI - 0.2);
    g.strokePath();
    
    g.generateTexture('tex_player', 26, 40);

    // PLATFORM (ice/snow block)
    g.clear();
    // Base ice
    g.fillStyle(0xbfe9ff, 1);
    g.fillRect(0, 0, 64, 16);

    // Snow cap
    g.fillStyle(0xf5fbff, 1);
    g.fillRect(0, 0, 64, 5);

    // Ice facets
    g.lineStyle(1, 0x86c9f2, 0.9);
    g.lineBetween(6, 6, 22, 14);
    g.lineBetween(24, 6, 40, 14);
    g.lineBetween(42, 6, 58, 14);

    // Shading
    g.fillStyle(0x8fd3ff, 0.35);
    g.fillTriangle(0, 16, 0, 8, 10, 16);
    g.fillTriangle(64, 16, 54, 16, 64, 8);

    // Outline
    g.lineStyle(2, 0x3f6f8f, 1);
    g.strokeRect(0, 0, 64, 16);

    g.generateTexture('tex_platform', 64, 16);

    // BACKGROUND: stone brick tile
    g.clear();
    g.fillStyle(0x1b2130, 1);
    g.fillRect(0, 0, 128, 128);

    // bricks
    const brickFill = 0x2a3247;
    const mortar = 0x111624;
    g.lineStyle(2, mortar, 1);
    for (let row = 0; row < 8; row++) {
      const y = row * 16;
      const offset = (row % 2) * 16;
      for (let col = 0; col < 8; col++) {
        const x = col * 32 - offset;
        g.fillStyle(brickFill + (row % 3) * 0x040404, 1);
        g.fillRect(Phaser.Math.Wrap(x, -32, 128), y, 32, 16);
        g.strokeRect(Phaser.Math.Wrap(x, -32, 128), y, 32, 16);
      }
    }
    // subtle highlights
    g.fillStyle(0xffffff, 0.03);
    g.fillRect(0, 0, 128, 128);
    g.generateTexture('tex_bg_brick', 128, 128);

    // HUD ICON: stopwatch
    g.clear();
    g.fillStyle(0x0b1020, 0);
    g.fillRect(0, 0, 20, 20);
    g.fillStyle(0x1b2450, 1);
    g.fillCircle(10, 11, 8);
    g.lineStyle(2, 0xe6ebff, 1);
    g.strokeCircle(10, 11, 8);
    g.lineStyle(2, 0xe6ebff, 1);
    g.lineBetween(10, 11, 10, 6);
    g.lineBetween(10, 11, 14, 12);
    // knob
    g.fillStyle(0xe6ebff, 1);
    g.fillRect(8, 1, 4, 3);
    g.generateTexture('tex_icon_timer', 20, 20);

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
