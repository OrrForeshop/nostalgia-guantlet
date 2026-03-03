import LevelBase from './LevelBase.js';

export default class VerticalClimbBase extends LevelBase {
  constructor(key, { targetFloors = 20 } = {}) {
    super(key);
    this.targetFloors = targetFloors;

    // Absolute Ease: keep floors close together, but not more than 75px apart.
    this.floorSpacing = 75;
    this.deathMargin = 28;

    this.highestY = null;
    this.startY = null;
    this.lastFloors = -1;
    this.worldHeight = 0;
  }

  create() {
    super.create();

    this.createScrollingBrickBackground();

    const w = this.scale.width;
    const h = this.scale.height;

    const extraFloors = 8;
    const totalFloors = this.targetFloors + extraFloors;

    // World is tall.
    this.worldHeight = h + totalFloors * this.floorSpacing;
    this.physics.world.setBounds(0, 0, w, this.worldHeight);

    // Platforms
    this.platforms = this.physics.add.staticGroup();

    const groundY = this.worldHeight - 30;

    // Ground row
    for (let x = 0; x < w; x += 64) {
      this.platforms.create(x + 32, groundY, 'tex_platform');
    }

    // Floating platforms
    let prevX = 120;
    for (let i = 1; i <= totalFloors; i++) {
      const y = groundY - i * this.floorSpacing;
      let x = Phaser.Math.Between(140, w - 140);
      if (Math.abs(x - prevX) < 120) {
        x = Phaser.Math.Clamp(x + (x < prevX ? -160 : 160), 140, w - 140);
      }
      prevX = x;

      // Absolute Ease: wide platforms.
      const scaleX = 2.5;
      this.platforms.create(x, y, 'tex_platform').setScale(scaleX, 1).refreshBody();
    }

    // Player
    this.player = this.physics.add.sprite(120, groundY - 80, 'tex_player');
    this.player.setCollideWorldBounds(true);
    this.player.setDragX(900);
    this.player.setMaxVelocity(380, 1050);

    this.physics.add.collider(this.player, this.platforms, () => {
      // Bounce / quick climb helper: hold jump to "spring" on landings.
      const holdingJump = this.isJumpHeld();
      const vy = this.player.body.velocity.y;
      const onGround = this.player.body.blocked.down;

      if (onGround && holdingJump && vy > 240) {
        const boost = Phaser.Math.Clamp(vy * 0.9, 540, 900);
        this.player.setVelocityY(-boost);
      }
    });

    // Camera (Icy Tower style: follows up; does not chase you down)
    this.cameras.main.setBounds(0, 0, w, this.worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    this.highestY = this.player.y;
    this.startY = this.player.y;

    // HUD objective hint
    this.game.events.emit('level:changed', {
      levelNumber: this.levelNumber,
      objective: `Climb to ${this.targetFloors} floors without falling.`,
      totalLevels: this.game.registry.get('levelManager')?.totalLevels ?? 50,
    });
  }

  update(_t, dt) {
    if (this.isPaused) return;

    this.updateScrollingBrickBackground();

    const { left, right, jump } = this.getMoveInput();

    const accel = 1100;
    if (left) this.player.setAccelerationX(-accel);
    else if (right) this.player.setAccelerationX(accel);
    else this.player.setAccelerationX(0);

    const onGround = this.player.body.blocked.down;
    if (jump && onGround) {
      // Absolute Ease: massive jump boost.
      this.player.setVelocityY(-900);
    }

    // Track highest point for floors.
    if (this.player.y < this.highestY) this.highestY = this.player.y;
    const floors = Math.max(0, Math.floor((this.startY - this.highestY) / this.floorSpacing));
    if (floors !== this.lastFloors) {
      this.lastFloors = floors;
      this.game.events.emit('floors:changed', { floors });
    }

    // Win condition
    if (floors >= this.targetFloors) {
      this.cameras.main.flash(140, 139, 212, 80);
      this.winLevel();
      return;
    }

    // Clamp camera so it only moves upward.
    const cam = this.cameras.main;
    const vh = this.scale.height;
    const targetScrollY = this.highestY - vh * 0.45;
    cam.scrollY = Math.min(cam.scrollY, targetScrollY);

    // Death zone: if player falls below camera bottom (plus margin) they fail.
    const deathY = cam.scrollY + vh + this.deathMargin;
    if (this.player.y > deathY) {
      this.cameras.main.flash(120, 255, 91, 110);
      this.failLevel();
    }

    void dt;
  }
}
