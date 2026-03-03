export default class ComingSoonScene extends Phaser.Scene {
  constructor() {
    super('ComingSoon');
  }

  create(data) {
    const w = this.scale.width;
    const h = this.scale.height;
    const lv = data?.level ?? '?';

    this.cameras.main.setBackgroundColor('#0b1020');

    this.add.text(w/2, h * 0.35, '🚧', { fontSize: '64px' }).setOrigin(0.5);

    this.add.text(w/2, h * 0.48, `Level ${lv}`, {
      fontSize: '36px', color: '#e6ebff', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5);

    this.add.text(w/2, h * 0.56, 'Coming Soon', {
      fontSize: '22px', color: '#a9b4ff'
    }).setOrigin(0.5);

    // Back to menu button
    const btn = this.add.rectangle(w/2, h * 0.68, 200, 52, 0x1b2450)
      .setStrokeStyle(2, 0x2f3c7a)
      .setInteractive({ useHandCursor: true });

    this.add.text(w/2, h * 0.68, '← Back to Menu', {
      fontSize: '18px', color: '#8bd450'
    }).setOrigin(0.5);

    btn.on('pointerover', () => btn.setFillStyle(0x24306a));
    btn.on('pointerout',  () => btn.setFillStyle(0x1b2450));
    btn.on('pointerdown', () => {
      window.location.assign(window.location.origin + window.location.pathname);
    });

    // Also tap anywhere
    this.input.once('pointerdown', () => {
      window.location.assign(window.location.origin + window.location.pathname);
    });
  }
}
