// Base class for all levels.
// Provides:
// - Common input (WASD/arrows + R restart + Esc pause)
// - Win/lose helpers
// - Simple camera + world bounds

export default class LevelBase extends Phaser.Scene {
  constructor(key) {
    super(key);
    this.levelNumber = 1;
    this.levelConfig = null;
    this.isPaused = false;
  }

  init(data) {
    this.levelNumber = data.levelNumber ?? 1;
    this.levelConfig = data.levelConfig ?? { objective: 'Reach the goal.' };
  }

  create() {
    this.cameras.main.setBackgroundColor('#0b1020');

    this.setupInput();
    this.createPauseOverlay();

    // Keep HUD timer in sync on new level start.
    this.game.events.emit('timer:reset');
  }

  setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();

    this.keys = this.input.keyboard.addKeys({
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      r: Phaser.Input.Keyboard.KeyCodes.R,
      esc: Phaser.Input.Keyboard.KeyCodes.ESC,
    });

    this.keys.r.on('down', () => {
      const lm = this.game.registry.get('levelManager');
      if (lm) lm.restartLevel();
    });

    this.keys.esc.on('down', () => {
      this.togglePause();
    });
  }

  createPauseOverlay() {
    const w = this.scale.width;
    const h = this.scale.height;

    this.pauseOverlay = this.add.container(0, 0).setDepth(1000).setVisible(false);
    const shade = this.add.rectangle(0, 0, w, h, 0x000000, 0.5).setOrigin(0);
    const box = this.add.rectangle(w / 2, h / 2, 520, 160, 0x0b1020, 0.95)
      .setStrokeStyle(2, 0x2f3c7a);
    const txt = this.add.text(w / 2, h / 2 - 30, 'PAUSED', {
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      fontSize: '40px',
      color: '#e6ebff',
    }).setOrigin(0.5);
    const hint = this.add.text(w / 2, h / 2 + 30, 'Press Esc to resume', {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: '16px',
      color: '#c9d1ff',
    }).setOrigin(0.5);

    this.pauseOverlay.add([shade, box, txt, hint]);
  }

  togglePause() {
    this.isPaused = !this.isPaused;

    // Freeze Arcade physics + this scene's updates.
    if (this.isPaused) {
      this.physics.world.pause();
      this.pauseOverlay.setVisible(true);
      this.game.events.emit('timer:pause');
    } else {
      this.physics.world.resume();
      this.pauseOverlay.setVisible(false);
      this.game.events.emit('timer:resume');
    }
  }

  // Helper used by derived classes.
  getMoveInput() {
    const left = this.cursors.left.isDown || this.keys.a.isDown;
    const right = this.cursors.right.isDown || this.keys.d.isDown;
    const jump = Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.keys.w) ||
      Phaser.Input.Keyboard.JustDown(this.keys.space);

    return { left, right, jump };
  }

  winLevel() {
    const lm = this.game.registry.get('levelManager');
    this.time.delayedCall(450, () => {
      if (lm) lm.nextLevel();
      else this.scene.start('Menu');
    });
  }

  failLevel() {
    const lm = this.game.registry.get('levelManager');
    this.time.delayedCall(200, () => {
      if (lm) lm.restartLevel();
      else this.scene.restart();
    });
  }
}
