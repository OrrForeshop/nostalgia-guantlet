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

    // Intro animation / input lock (applies to all levels).
    this.introLock = false;
    this._introOverlay = null;
    this._introFreezeEvent = null;
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

    // Flashy level intro (title card) + temporary player freeze.
    this.playLevelIntro();
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
  // Supports both keyboard and mobile touch controls (wired via HUDScene).
  getMoveInput() {
    // During the intro title card, lock player input to build anticipation.
    if (this.introLock) return { left: false, right: false, jump: false };

    const touch = this.game.registry.get('touchInput') ?? {};

    const left = this.cursors.left.isDown || this.keys.a.isDown || !!touch.left;
    const right = this.cursors.right.isDown || this.keys.d.isDown || !!touch.right;

    const jumpKey = Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.keys.w) ||
      Phaser.Input.Keyboard.JustDown(this.keys.space);

    const jumpTouch = !!touch.jumpJustPressed;

    // Consume one-shot touch jump.
    if (jumpTouch) {
      touch.jumpJustPressed = false;
      this.game.registry.set('touchInput', touch);
    }

    const jump = jumpKey || jumpTouch;

    return { left, right, jump };
  }

  isJumpHeld() {
    if (this.introLock) return false;
    const touch = this.game.registry.get('touchInput') ?? {};
    return this.cursors.up.isDown || this.keys.w.isDown || this.keys.space.isDown || !!touch.jump;
  }

  playLevelIntro() {
    // If a derived level wants to disable this, it can set `levelConfig.disableIntro = true`.
    if (this.levelConfig?.disableIntro) return;

    // Prevent stacking overlays if a scene is restarted quickly.
    if (this._introOverlay) {
      this._introOverlay.destroy(true);
      this._introOverlay = null;
    }

    this.introLock = true;

    // While locked, make extra-sure the player cannot drift horizontally.
    if (this._introFreezeEvent) this._introFreezeEvent.remove(false);
    this._introFreezeEvent = this.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        if (!this.introLock) return;
        if (this.player?.body) {
          this.player.setAccelerationX(0);
          this.player.setVelocityX(0);
        }
      },
    });

    const w = this.scale.width;
    const h = this.scale.height;

    const container = this.add.container(w / 2, h / 2)
      .setScrollFactor(0)
      .setDepth(2000);

    // "ICE" style: cyan/white, stroke + additive glow layer.
    const baseText = this.add.text(0, 0, 'THE ICY BROTHER', {
      fontFamily: 'Impact, Haettenschweiler, "Arial Black", system-ui, sans-serif',
      fontSize: '72px',
      fontStyle: 'bold',
      color: '#e9fbff',
      stroke: '#6ff6ff',
      strokeThickness: 7,
      align: 'center',
    }).setOrigin(0.5);

    baseText.setShadow(0, 0, '#7ff7ff', 18, true, true);

    const glowText = this.add.text(0, 0, 'THE ICY BROTHER', {
      fontFamily: baseText.style.fontFamily,
      fontSize: '72px',
      fontStyle: 'bold',
      color: '#bffcff',
      stroke: '#d8ffff',
      strokeThickness: 2,
      align: 'center',
    }).setOrigin(0.5);
    glowText.setAlpha(0.55);
    glowText.setBlendMode(Phaser.BlendModes.ADD);
    glowText.setScale(1.06);

    container.add([glowText, baseText]);

    // Start state
    container.setAlpha(0);
    container.setScale(2.0);
    container.y += 20;

    // Subtle shake (like cracking ice)
    const shakeTween = this.tweens.add({
      targets: container,
      angle: { from: -0.8, to: 0.8 },
      duration: 70,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    // In → Hold → Out
    this.tweens.timeline({
      targets: container,
      tweens: [
        {
          alpha: 1,
          scale: 1,
          y: h / 2,
          duration: 480,
          ease: 'Back.Out',
        },
        {
          // hold
          duration: 1500,
        },
        {
          alpha: 0,
          scale: 0.55,
          duration: 420,
          ease: 'Quad.In',
        },
      ],
      onComplete: () => {
        shakeTween?.stop();
        container.destroy(true);
        this._introOverlay = null;
        this.introLock = false;
        if (this._introFreezeEvent) {
          this._introFreezeEvent.remove(false);
          this._introFreezeEvent = null;
        }
      },
    });

    this._introOverlay = container;
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
