// HUDScene – top info bar only.
// Mobile controls are now native HTML buttons in index.html.
// They write directly to the Phaser registry (touchInput) via window.__phaserGame.

export default class HUDScene extends Phaser.Scene {
  constructor() {
    super('HUD');
    this.elapsedMs  = 0;
    this.objective  = '';
    this.levelNumber = 1;
    this.totalLevels = 50;
    this.isPaused    = false;
  }

  create() {
    const MONO = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

    // Ensure touchInput exists in registry with right-movement by default
    if (!this.game.registry.get('touchInput')) {
      this.game.registry.set('touchInput', {
        left: false, right: false, up: false, down: false, jump: false, jumpJustPressed: false,
      });
    }

    // ── HUD bar ────────────────────────────────────────────────────────────
    this.hudBg = this.add
      .rectangle(0, 0, this.scale.width, 48, 0x080e1c, 0.92)
      .setOrigin(0, 0)
      .setDepth(100)
      .setStrokeStyle(2, 0x1b2450, 1);

    const txt = (x, y, s, color = '#e6ebff', size = '14px') =>
      this.add.text(x, y, s, { fontFamily: MONO, fontSize: size, color }).setDepth(101);

    this.iconTimer    = this.add.image(14, 24, 'tex_icon_timer').setOrigin(0.5).setDepth(101).setScale(0.9);
    this.txtTime      = txt(30, 16, '0.0s',    '#e6ebff');
    this.txtFloors    = txt(90, 16, 'Fl:0',    '#c9d1ff');
    this.txtLevel     = txt(145, 16, 'Lv 1/50', '#a9b4ff');
    this.txtObjective = txt(225, 16, '',        '#8898cc', '13px');

    this.lives  = this.game.registry.get('playerLives') ?? 3;
    this.hearts = this.add.group();
    this.drawHearts();

    // ── Event listeners ────────────────────────────────────────────────────
    this.game.events.on('player:lost_life', () => {
      this.lives = this.game.registry.get('playerLives');
      this.drawHearts();
    });

    this.game.events.on('level:changed', (data) => {
      this.levelNumber = data.levelNumber;
      this.totalLevels = data.totalLevels;
      this.objective   = data.objective;
      this.refresh();
      this.resetTimer();
      // Tell HTML button to reset back to ▶ RIGHT
      if (typeof window.__resetMoveButton === 'function') window.__resetMoveButton();
    });

    this.game.events.on('floors:changed', (data) => {
      this.txtFloors.setText(`Fl:${data?.floors ?? 0}`);
    });

    this.game.events.on('timer:reset',  () => this.resetTimer());
    this.game.events.on('timer:pause',  () => this.setPaused(true));
    this.game.events.on('timer:resume', () => this.setPaused(false));
    this.game.events.on('game:end',     () => this.showPlayAgain());

    this.refresh();

    // Reposition on resize
    this.scale.on('resize', this.relayout, this);
    this.relayout();
  }

  relayout() {
    const w = this.scale.width;
    this.hudBg.setSize(w, 48);

    const isNarrow = w < 600;
    if (isNarrow) {
      // Compact: timer | floors | level  — hearts right-aligned
      this.iconTimer.setPosition(14, 24);
      this.txtTime.setPosition(30, 16);
      this.txtFloors.setPosition(88, 16);
      this.txtLevel.setPosition(145, 16);
      this.txtObjective.setVisible(false);
    } else {
      this.iconTimer.setPosition(18, 24);
      this.txtTime.setPosition(34, 16);
      this.txtFloors.setPosition(100, 16);
      this.txtLevel.setPosition(175, 16);
      this.txtObjective.setPosition(270, 16).setVisible(true);
    }
    this.drawHearts();
  }

  drawHearts() {
    this.hearts.clear(true, true);
    const w      = this.scale.width;
    const startX = w - 14 - 3 * 26;
    for (let i = 0; i < 3; i++) {
      const h = this.add.image(startX + i * 26, 24, 'tex_heart').setDepth(101).setScale(0.7);
      if (i >= this.lives) { h.setTint(0x333333); h.setAlpha(0.4); }
      this.hearts.add(h);
    }
  }

  showPlayAgain() {
    const w = this.scale.width;
    const h = this.scale.height;
    const overlay = this.add.container(0, 0).setDepth(2000);
    overlay.add(this.add.rectangle(0, 0, w, h, 0x000000, 0.7).setOrigin(0));
    const btn = this.add.rectangle(w / 2, h / 2, 240, 60, 0x1b2450)
      .setStrokeStyle(2, 0x2f3c7a)
      .setInteractive({ useHandCursor: true });
    overlay.add(btn);
    overlay.add(
      this.add.text(w / 2, h / 2, 'PLAY AGAIN', {
        fontSize: '24px', fontWeight: 'bold', color: '#ffffff',
      }).setOrigin(0.5).setDepth(2001)
    );
    btn.on('pointerdown', () => {
      this.game.events.off('game:end');
      this.scene.stop('HUD');
      this.game.registry.get('levelManager').startLevel(1);
    });
  }

  resetTimer()          { this.elapsedMs = 0; this.refresh(); }
  setPaused(v)          { this.isPaused = v; }

  refresh() {
    this.txtLevel.setText(`Lv ${this.levelNumber}/${this.totalLevels}`);
    if (this.txtObjective?.visible) this.txtObjective.setText(this.objective || 'Reach the goal.');
    this.txtTime.setText(`${(this.elapsedMs / 1000).toFixed(1)}s`);
  }

  update(_t, dt) {
    if (this.isPaused) return;
    this.elapsedMs += dt;
    this.txtTime.setText(`${(this.elapsedMs / 1000).toFixed(1)}s`);
  }
}
