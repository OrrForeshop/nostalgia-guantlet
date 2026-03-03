export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    this.cameras.main.setBackgroundColor('#0b1020');

    // Hide HTML controls bar while on the menu screen
    const controlsEl = document.getElementById('controls');
    if (controlsEl) controlsEl.style.visibility = 'hidden';

    // Title — centred vertically in the top third
    this.add.text(w / 2, h * 0.14, 'Nostalgia Gauntlet', {
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      fontSize: '38px',
      fontStyle: 'bold',
      color: '#e6ebff',
    }).setOrigin(0.5);

    this.add.text(w / 2, h * 0.22, '50 micro-levels. One retro marathon.', {
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      fontSize: '15px',
      color: '#a9b4ff',
      wordWrap: { width: w - 40 },
      align: 'center',
    }).setOrigin(0.5);

    // Controls hint
    const controls = [
      '◀  ▶  JUMP',
      '',
      'Climb all floors to win.',
      'Fall off-screen = death.',
    ].join('\n');

    this.add.text(w / 2, h * 0.38, controls, {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: '14px',
      color: '#c9d1ff',
      align: 'center',
      lineSpacing: 8,
      wordWrap: { width: w - 40 },
    }).setOrigin(0.5);

    // START button — centred on the screen
    const btn = this.add.rectangle(w / 2, h * 0.54, 220, 56, 0x1b2450)
      .setStrokeStyle(2, 0x2f3c7a)
      .setInteractive({ useHandCursor: true });

    const btnText = this.add.text(w / 2, h * 0.54, 'START', {
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#e6ebff',
      letterSpacing: 3,
    }).setOrigin(0.5);
    btnText.setInteractive({ useHandCursor: true });

    const start = () => {
      // Restore controls before handing off to the level
      if (controlsEl) controlsEl.style.visibility = '';
      try {
        const lm = this.game.registry.get('levelManager');
        if (lm) lm.setCurrent(1);
        this.game.registry.set('touchInput', {
          left: false, right: false, jump: false, jumpJustPressed: false,
        });
        this.game.scene.stop('Menu');
        this.game.scene.start('Level1', { levelNumber: 1 });
        this.game.scene.launch('HUD');
      } catch (err) {
        console.error('Start error:', err);
        if (controlsEl) controlsEl.style.visibility = '';
        this.scene.manager.start('Level1');
      }
    };

    btn.on('pointerover', () => btn.setFillStyle(0x24306a));
    btn.on('pointerout',  () => btn.setFillStyle(0x1b2450));
    btn.on('pointerdown', start);
    btnText.on('pointerdown', start);

    this.input.keyboard.once('keydown-SPACE', start);
    this.input.keyboard.once('keydown-ENTER', start);
  }
}
