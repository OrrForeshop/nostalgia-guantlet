export default class HUDScene extends Phaser.Scene {
  constructor() {
    super('HUD');
    this.elapsedMs = 0;
    this.objective = '';
    this.levelNumber = 1;
    this.totalLevels = 50;
  }

  create() {
    const w = this.scale.width;

    this.container = this.add.container(0, 0);

    const bg = this.add.rectangle(0, 0, w, 52, 0x0b1020, 0.75).setOrigin(0, 0);
    bg.setStrokeStyle(2, 0x1b2450, 0.8);

    // Left cluster (Icy Tower inspired): timer icon + time, then Floors.
    this.iconTimer = this.add.image(18, 26, 'tex_icon_timer').setOrigin(0.5);
    this.iconTimer.setScale(1.1);

    this.txtTime = this.add.text(34, 16, '0.0s', {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: '16px',
      color: '#e6ebff',
    });

    this.txtFloors = this.add.text(120, 16, 'Floors 0', {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: '16px',
      color: '#c9d1ff',
    });

    this.txtLevel = this.add.text(240, 16, 'Level 1/50', {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: '16px',
      color: '#a9b4ff',
    });

    this.txtObjective = this.add.text(390, 16, 'Objective: ...', {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: '16px',
      color: '#a9b4ff',
    });

    this.container.add([bg, this.iconTimer, this.txtTime, this.txtFloors, this.txtLevel, this.txtObjective]);

    // Event bridge from LevelManager / Levels (using game-level events)
    this.game.events.on('level:changed', (data) => {
      this.levelNumber = data.levelNumber;
      this.totalLevels = data.totalLevels;
      this.objective = data.objective;
      this.refresh();
      this.resetTimer();
    });

    this.game.events.on('floors:changed', (data) => {
      const floors = data?.floors ?? 0;
      this.txtFloors.setText(`Floors ${floors}`);
    });

    this.game.events.on('timer:reset', () => this.resetTimer());
    this.game.events.on('timer:pause', () => this.setPaused(true));
    this.game.events.on('timer:resume', () => this.setPaused(false));
    
    // Listen for game end to show a replay button
    this.game.events.on('game:end', () => {
      this.showPlayAgain();
    });

    this.isPaused = false;
    this.refresh();

    this.setupMobileControls();

    // Keep touch controls anchored on resize/orientation change.
    this.scale.on('resize', () => {
      this.layoutMobileControls();
    });
  }

  isMobileTouchDevice() {
    const dev = this.sys.game.device;
    const hasTouch = !!dev?.input?.touch;
    const isMobileOs = !!(dev?.os?.android || dev?.os?.iOS || dev?.os?.iPad || dev?.os?.iPhone || dev?.os?.windowsPhone);

    return hasTouch && isMobileOs;
  }

  ensureTouchRegistry() {
    const existing = this.game.registry.get('touchInput');
    if (existing) return existing;

    const touch = { left: false, right: false, jump: false, jumpJustPressed: false };
    this.game.registry.set('touchInput', touch);
    return touch;
  }

  setupMobileControls() {
    

    this.ensureTouchRegistry();

    this.mobileControls = this.add.container(0, 0).setDepth(1500);

    const makeButton = ({ width, height, label, fontSize = 26 }) => {
      const root = this.add.container(0, 0);

      const bg = this.add.rectangle(0, 0, width, height, 0x000000, 0.28)
        .setOrigin(0.5)
        .setStrokeStyle(2, 0xffffff, 0.18);

      const txt = this.add.text(0, 0, label, {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        fontSize: `${fontSize}px`,
        fontWeight: '800',
        color: '#ffffff',
      }).setOrigin(0.5);

      root.add([bg, txt]);

      // Container itself isn't interactive; use bg for hit area.
      bg.setInteractive({ useHandCursor: false });

      return { root, bg };
    };

    // Left/Right arrows (bottom-left)
    this.btnLeft = makeButton({ width: 72, height: 62, label: '◀', fontSize: 30 });
    this.btnRight = makeButton({ width: 72, height: 62, label: '▶', fontSize: 30 });

    // Jump (bottom-right)
    this.btnJump = makeButton({ width: 160, height: 74, label: 'JUMP', fontSize: 28 });

    this.mobileControls.add([this.btnLeft.root, this.btnRight.root, this.btnJump.root]);

    // Wire buttons into shared touchInput registry.
    const setTouch = (patch) => {
      const touch = this.ensureTouchRegistry();
      Object.assign(touch, patch);
      this.game.registry.set('touchInput', touch);
    };

    const bindHold = (btnBg, key) => {
      btnBg.on('pointerdown', () => setTouch({ [key]: true }));
      btnBg.on('pointerup', () => setTouch({ [key]: false }));
      btnBg.on('pointerout', () => setTouch({ [key]: false }));
    };

    bindHold(this.btnLeft.bg, 'left');
    bindHold(this.btnRight.bg, 'right');

    // Jump: hold state + one-shot "just pressed" for LevelBase.getMoveInput().
    this.btnJump.bg.on('pointerdown', () => {
      const touch = this.ensureTouchRegistry();
      if (!touch.jump) {
        touch.jumpJustPressed = true;
      }
      touch.jump = true;
      this.game.registry.set('touchInput', touch);
    });
    const clearJump = () => {
      const touch = this.ensureTouchRegistry();
      touch.jump = false;
      this.game.registry.set('touchInput', touch);
    };
    this.btnJump.bg.on('pointerup', clearJump);
    this.btnJump.bg.on('pointerout', clearJump);

    this.layoutMobileControls();
  }

  layoutMobileControls() {
    if (!this.mobileControls) return;

    const w = this.scale.width;
    const h = this.scale.height;

    const margin = 18;
    const gap = 10;

    // bottom-left cluster
    const leftY = h - margin - 36; // centered-ish
    this.btnLeft.root.setPosition(margin + 36, leftY);
    this.btnRight.root.setPosition(margin + 36 + 72 + gap, leftY);

    // bottom-right jump
    this.btnJump.root.setPosition(w - margin - 80, h - margin - 40);
  }

  showPlayAgain() {
    const w = this.scale.width;
    const h = this.scale.height;
    
    const overlay = this.add.container(0, 0).setDepth(2000);
    const bg = this.add.rectangle(0, 0, w, h, 0x000000, 0.7).setOrigin(0);
    
    const btn = this.add.rectangle(w / 2, h / 2, 240, 60, 0x1b2450)
      .setStrokeStyle(2, 0x2f3c7a)
      .setInteractive({ useHandCursor: true });
      
    this.add.text(w / 2, h / 2, 'PLAY AGAIN', {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    btn.on('pointerdown', () => {
      this.game.events.off('game:end');
      this.scene.stop('HUD');
      this.game.registry.get('levelManager').startLevel(1);
    });
  }

  resetTimer() {
    this.elapsedMs = 0;
    this.refresh();
  }

  setPaused(isPaused) {
    this.isPaused = isPaused;
  }

  refresh() {
    this.txtLevel.setText(`Level ${this.levelNumber}/${this.totalLevels}`);
    this.txtObjective.setText(`Objective: ${this.objective || 'Reach the goal.'}`);
    this.txtTime.setText(`${(this.elapsedMs / 1000).toFixed(1)}s`);
  }

  update(_t, dt) {
    if (this.isPaused) return;
    this.elapsedMs += dt;
    this.txtTime.setText(`${(this.elapsedMs / 1000).toFixed(1)}s`);
  }
}
