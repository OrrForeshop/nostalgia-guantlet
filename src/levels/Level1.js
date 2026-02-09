import LevelBase from './LevelBase.js';

export default class Level1 extends LevelBase {
  constructor() {
    super('Level1');

    // Icy Tower tuning
    this.totalFloors = 20;
    this.floorSpacing = 220;

    this.lastFloor = 0;
    this.failGuard = false;
  }

  create() {
    super.create();

    const w = this.scale.width;
    const h = this.scale.height;

    // World: tall vertical climb
    const worldHeight = h + this.totalFloors * this.floorSpacing + 260;
    this.worldHeight = worldHeight;

    this.physics.world.setBounds(0, 0, w, worldHeight);

    // Brick tower background
    this.bg = this.add
      .tileSprite(0, 0, w, h, 'tex_bg_brick')
      .setOrigin(0, 0)
      .setScrollFactor(0);

    // Platforms (static bodies)
    const platforms = this.physics.add.staticGroup();

    // Bottom ground (wide)
    const groundY = worldHeight - 28;
    for (let x = 0; x < w; x += 64) {
      platforms.create(x + 32, groundY, 'tex_platform');
    }

    // Floors: a 20-floor climb
    // We place a few icy ledges per floor with mild randomness (deterministic per floor).
    const margin = 110;
    const minScale = 1.2;
    const maxScale = 2.2;

    for (let floor = 1; floor <= this.totalFloors; floor++) {
      const y = worldHeight - 80 - floor * this.floorSpacing;

      // Deterministic RNG-ish offsets
      const a = (floor * 37) % 97;
      const b = (floor * 61) % 89;

      const x1 = margin + ((a / 96) * (w - margin * 2));
      const x2 = margin + ((b / 88) * (w - margin * 2));

      const s1 = minScale + ((a % 10) / 10) * (maxScale - minScale);
      const s2 = minScale + ((b % 10) / 10) * (maxScale - minScale);

      platforms.create(x1, y, 'tex_platform').setScale(s1, 1).refreshBody();

      // Add a second platform on most floors (makes the climb feel more "Icy Tower")
      if (floor % 2 === 0 || floor % 5 === 0) {
        platforms.create(x2, y - 60, 'tex_platform').setScale(s2, 1).refreshBody();
      }

      // A small "bridge" every 4 floors to reduce difficulty spikes
      if (floor % 4 === 0) {
        platforms.create(w / 2, y - 120, 'tex_platform').setScale(1.9, 1).refreshBody();
      }
    }

    // Player
    this.player = this.physics.add.sprite(w / 2, worldHeight - 110, 'tex_player');
    this.player.setCollideWorldBounds(true);

    // "Icy" feel: lower drag, higher max horizontal speed
    this.player.setDragX(140);
    this.player.setMaxVelocity(420, 920);

    this.physics.add.collider(this.player, platforms);

    // Goal: flag at the top of the tower (above floor 20)
    const goalY = worldHeight - 80 - this.totalFloors * this.floorSpacing - 160;
    this.goal = this.physics.add.staticImage(w / 2, goalY, 'tex_goal');
    this.goal.refreshBody();

    this.physics.add.overlap(this.player, this.goal, () => {
      if (this.isPaused || this.failGuard) return;
      this.failGuard = true;
      this.flashCamera(0x8bd450);
      this.winLevel();
    });

    // Camera: follow and clamp to the tower
    this.cameras.main.setBounds(0, 0, w, worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(140, 120);

    // Seed floors UI
    this.emitFloorsChanged(0);

    // Simple hint near the start
    this.add
      .text(w / 2, worldHeight - 190, 'CLIMB UP!  (If you fall off-screen, you lose)', {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: '16px',
        color: '#c9d1ff',
      })
      .setOrigin(0.5);
  }

  emitFloorsChanged(floors) {
    this.game.events.emit('floors:changed', { floors });
  }

  flashCamera(color) {
    this.cameras.main.flash(120, (color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff);
  }

  update() {
    if (this.isPaused) return;

    const { left, right, jump } = this.getMoveInput();

    const accel = 980;

    if (left) {
      this.player.setAccelerationX(-accel);
    } else if (right) {
      this.player.setAccelerationX(accel);
    } else {
      this.player.setAccelerationX(0);
    }

    const onGround = this.player.body.blocked.down;

    if (jump && onGround) {
      this.player.setVelocityY(-680);
    }

    // Parallax brick background
    if (this.bg) {
      this.bg.tilePositionY = this.cameras.main.scrollY * 0.25;
    }

    // Floors counter (based on progress from spawn Y)
    const startY = this.worldHeight - 110;
    const climbed = startY - this.player.y;
    const floors = Phaser.Math.Clamp(Math.floor(climbed / this.floorSpacing), 0, this.totalFloors);

    if (floors !== this.lastFloor) {
      this.lastFloor = floors;
      this.emitFloorsChanged(floors);
    }

    // Death if the player falls below the visible camera viewport (Icy Tower rule)
    const cam = this.cameras.main;
    const killY = cam.scrollY + this.scale.height + 120;
    if (!this.failGuard && this.player.y > killY) {
      this.failGuard = true;
      this.flashCamera(0xff5b6e);
      this.failLevel();
    }
  }
}
