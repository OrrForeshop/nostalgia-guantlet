export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.cameras.main.setBackgroundColor('#0b1020');

    this.add.text(w / 2, 110, 'Nostalgia Gauntlet', {
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      fontSize: '48px',
      color: '#e6ebff',
    }).setOrigin(0.5);

    this.add.text(w / 2, 170, '50 micro-levels. One retro marathon.', {
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      fontSize: '18px',
      color: '#a9b4ff',
    }).setOrigin(0.5);

    const controls = [
      'Move: WASD / Arrow Keys',
      'Jump: W / Up / Space',
      'Restart: R',
      'Pause: Esc',
      '',
      'Level 1: reach the flag, avoid the hazard.'
    ].join('\n');

    this.add.text(w / 2, 270, controls, {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: '16px',
      color: '#c9d1ff',
      align: 'center',
      lineSpacing: 6,
    }).setOrigin(0.5);

    const btn = this.add.rectangle(w / 2, 410, 260, 54, 0x1b2450)
      .setStrokeStyle(2, 0x2f3c7a)
      .setInteractive({ useHandCursor: true });

    const btnText = this.add.text(w / 2, 410, 'START', {
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      fontSize: '22px',
      color: '#e6ebff',
      letterSpacing: 2,
    }).setOrigin(0.5);

    const start = () => {
      const lm = this.registry.get('levelManager');
      lm.startLevel(1);
    };

    btn.on('pointerover', () => btn.setFillStyle(0x24306a));
    btn.on('pointerout', () => btn.setFillStyle(0x1b2450));
    btn.on('pointerdown', start);

    this.input.keyboard.once('keydown-SPACE', start);
    this.input.keyboard.once('keydown-ENTER', start);

    void btnText;
  }
}
