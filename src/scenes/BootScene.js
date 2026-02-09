export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    // Minimal boot: set consistent settings, then preload.
    this.cameras.main.setBackgroundColor('#0b1020');
    this.scene.start('Preload');
  }
}
