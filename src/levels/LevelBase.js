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
    if (this.introLock) return { left: false, right: false, up: false, down: false, jump: false };

    const touch = this.game.registry.get('touchInput') ?? {};

    const left = this.cursors.left.isDown || this.keys.a.isDown || !!touch.left;
    const right = this.cursors.right.isDown || this.keys.d.isDown || !!touch.right;
    const up = this.cursors.up.isDown || this.keys.w.isDown || !!touch.up;
    const down = this.cursors.down.isDown || this.keys.s.isDown || !!touch.down;

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

    return { left, right, up, down, jump };
  }

  isJumpHeld() {
    if (this.introLock) return false;
    const touch = this.game.registry.get('touchInput') ?? {};
    return this.cursors.up.isDown || this.keys.w.isDown || this.keys.space.isDown || !!touch.jump;
  }

  playLevelIntro() {
    const w  = this.scale.width;
    const h  = this.scale.height;

    // Per-level control guide text
    const CONTROLS = {
      Level1:  ['◀ ▶  Move', 'JUMP  Jump up floors', 'Reach the top!'],
      Level2:  ['◀ ▶  Move', 'JUMP  Shoot harpoon', 'Pop all orbs!'],
      Level3:  ['JUMP  Tap to flap', 'Fly through the tunnel', 'Don\'t hit walls!'],
      Level4:  ['◀ ▶  Move paddle', 'START  Launch ball', 'Break all blocks!'],
      Level5:  ['◀ ▶  Move', 'PULL  Pull items up', 'Reach $500!'],
      Level6:  ['Joystick  Move', 'FIRE  Shoot enemies', 'Survive 30 seconds!'],
      Level7:  ['Joystick  Move', 'SLOW  Slow hazards', 'Reach the EXIT!'],
      Level8:  ['◀ ▶  Move', 'JUMP  Jump (x2 air)', 'Outrun the wall!'],
      Level9:  ['Joystick  Dodge', 'SHIELD  Invincible 2s', 'Survive 20 seconds!'],
      Level10: ['AIM pad  Drag ◀▶', 'POWER pad  Drag ▲▼', 'Hit every target!'],
    };

    const key      = this.scene.key;
    const num      = parseInt(key.replace('Level', ''), 10) || 1;
    const cfg      = this.levelConfig ?? {};
    const title    = cfg.name || `LEVEL ${num}`;
    const obj      = cfg.objective || '';
    const controls = CONTROLS[key] || ['◀ ▶  Move', 'JUMP  Action'];

    this.introLock = true;

    // ── Dark overlay ─────────────────────────────────────────────────────
    const overlay = this.add.container(0, 0).setDepth(500).setScrollFactor(0);
    const shade   = this.add.rectangle(w/2, h/2, w, h, 0x000000, 0.78);
    overlay.add(shade);

    // ── Card ─────────────────────────────────────────────────────────────
    const cardH = 360;
    const card  = this.add.rectangle(w/2, h/2, w - 40, cardH, 0x0d1530, 0.97)
      .setStrokeStyle(2, 0x2f3c7a);
    overlay.add(card);

    const cardTop = h/2 - cardH/2;

    // Level badge
    const badge = this.add.text(w/2, cardTop + 32, `LEVEL ${num}`, {
      fontSize: '13px', color: '#a9b4ff', letterSpacing: 4,
      fontFamily: 'ui-monospace, monospace'
    }).setOrigin(0.5);
    overlay.add(badge);

    // Level title
    const titleTxt = this.add.text(w/2, cardTop + 62, title, {
      fontSize: '30px', color: '#e6ebff', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5);
    overlay.add(titleTxt);

    // Divider
    const div = this.add.rectangle(w/2, cardTop + 92, w - 80, 1, 0x2f3c7a);
    overlay.add(div);

    // Objective
    if (obj) {
      const objTxt = this.add.text(w/2, cardTop + 115, obj, {
        fontSize: '15px', color: '#8bd450', fontStyle: 'italic',
        stroke: '#000', strokeThickness: 2, wordWrap: { width: w - 80 }
      }).setOrigin(0.5);
      overlay.add(objTxt);
    }

    // Controls header
    const ctrlHdr = this.add.text(w/2, cardTop + 155, 'CONTROLS', {
      fontSize: '11px', color: '#6677aa', letterSpacing: 3,
      fontFamily: 'ui-monospace, monospace'
    }).setOrigin(0.5);
    overlay.add(ctrlHdr);

    // Control lines
    controls.forEach((line, i) => {
      const parts = line.split('  ');
      const lineY = cardTop + 178 + i * 28;
      if (parts.length >= 2) {
        // Key label (highlighted) + description
        const keyTxt = this.add.text(w/2 - 10, lineY, parts[0], {
          fontSize: '14px', color: '#f1c40f', fontStyle: 'bold',
          fontFamily: 'ui-monospace, monospace'
        }).setOrigin(1, 0.5);
        const descTxt = this.add.text(w/2 + 4, lineY, parts.slice(1).join('  '), {
          fontSize: '14px', color: '#c9d1ff'
        }).setOrigin(0, 0.5);
        overlay.add([keyTxt, descTxt]);
      } else {
        const txt = this.add.text(w/2, lineY, line, {
          fontSize: '14px', color: '#c9d1ff'
        }).setOrigin(0.5);
        overlay.add(txt);
      }
    });

    // Tap to start — pulsing
    const tapY  = cardTop + cardH - 28;
    const tapTxt = this.add.text(w/2, tapY, 'TAP ANYWHERE TO START', {
      fontSize: '13px', color: '#8bd450', letterSpacing: 2,
      fontFamily: 'ui-monospace, monospace'
    }).setOrigin(0.5);
    overlay.add(tapTxt);
    this.tweens.add({
      targets: tapTxt, alpha: { from: 1, to: 0.25 },
      duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });

    // ── Pause physics while intro card is shown ───────────────────────────
    this.physics.pause();

    // ── Hide controls during intro (restore on dismiss) ───────────────────
    const controlsEl = document.getElementById('controls');
    if (controlsEl) controlsEl.style.visibility = 'hidden';

    // ── Dismiss on any touch/tap/key ─────────────────────────────────────
    const dismiss = () => {
      this.introLock = false;
      this.physics.resume();
      if (controlsEl) controlsEl.style.visibility = '';
      this.tweens.add({
        targets: overlay, alpha: 0, duration: 220,
        onComplete: () => overlay.destroy()
      });
    };

    // Touch anywhere
    this.input.once('pointerdown', dismiss);

    // Also dismiss via any HTML button press (covers joystick / action buttons)
    const anyBtnDown = e => {
      dismiss();
      document.removeEventListener('touchstart', anyBtnDown, true);
      document.removeEventListener('mousedown',  anyBtnDown, true);
    };
    // Small delay so the pointerdown that might also fire doesn't double-trigger
    this.time.delayedCall(200, () => {
      document.addEventListener('touchstart', anyBtnDown, { passive: true, capture: true });
      document.addEventListener('mousedown',  anyBtnDown, { capture: true });
    });

    // Keyboard fallback
    this.input.keyboard.once('keydown', dismiss);
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
