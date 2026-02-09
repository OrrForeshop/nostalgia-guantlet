import LevelBase from './LevelBase.js';

export default class Level1 extends LevelBase {
  constructor() {
    super('Level1');
  }

  create() {
    super.create();

    // World
    const w = this.scale.width;
    const h = this.scale.height;
    this.physics.world.setBounds(0, 0, w, h);

    // Platforms (static bodies)
    const platforms = this.physics.add.staticGroup();

    // Ground
    for (let x = 0; x < w; x += 64) {
      platforms.create(x + 32, h - 24, 'tex_platform');
    }

    // Floating ledges (closer together and lower for easier jumping)
    platforms.create(200, 420, 'tex_platform').setScale(1.8, 1).refreshBody();
    platforms.create(380, 380, 'tex_platform').setScale(1.6, 1).refreshBody();
    platforms.create(560, 340, 'tex_platform').setScale(1.6, 1).refreshBody();
    platforms.create(740, 300, 'tex_platform').setScale(1.8, 1).refreshBody();

    // Player
    this.player = this.physics.add.sprite(90, h - 100, 'tex_player');
    this.player.setCollideWorldBounds(true);
    this.player.setDragX(900);
    this.player.setMaxVelocity(320, 800);

    this.physics.add.collider(this.player, platforms);

    // Hazard: a moving saw that patrols a short path.
    this.hazard = this.physics.add.sprite(520, h - 70, 'tex_hazard');
    this.hazard.setCircle(11, 1, 1);
    this.hazard.setImmovable(true);
    this.hazard.body.allowGravity = false;

    this.tweens.add({
      targets: this.hazard,
      x: { from: 420, to: 620 },
      duration: 1400,
      ease: 'Sine.inOut',
      yoyo: true,
      repeat: -1,
    });

    this.tweens.add({
      targets: this.hazard,
      angle: 360,
      duration: 900,
      repeat: -1,
    });

    this.physics.add.overlap(this.player, this.hazard, () => {
      if (this.isPaused) return;
      this.flashCamera(0xff5b6e);
      this.failLevel();
    });

    // Goal: flag (placed on the last platform)
    this.goal = this.physics.add.staticImage(w - 100, 260, 'tex_goal');
    this.goal.refreshBody();

    this.physics.add.overlap(this.player, this.goal, () => {
      if (this.isPaused) return;
      this.flashCamera(0x8bd450);
      this.winLevel();
    });

    // Camera
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(120, 80);

    // Win text hint (subtle)
    this.add.text(720, 220, 'FLAG →', {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: '16px',
      color: '#a9b4ff',
    });
  }

  flashCamera(color) {
    this.cameras.main.flash(120, (color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff);
  }

  update() {
    if (this.isPaused) return;

    const { left, right, jump } = this.getMoveInput();

    const accel = 900;

    if (left) {
      this.player.setAccelerationX(-accel);
    } else if (right) {
      this.player.setAccelerationX(accel);
    } else {
      this.player.setAccelerationX(0);
    }

    const onGround = this.player.body.blocked.down;

    if (jump && onGround) {
      this.player.setVelocityY(-620);
    }
  }
}
