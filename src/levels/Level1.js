import LevelBase from './LevelBase.js';

export default class Level1 extends LevelBase {
  constructor() {
    super('Level1');
    this.totalFloors  = 20;
    this.floorSpacing = 62;
    this.lastFloor    = 0;
    this.failGuard    = false;
  }

  create() {
    // ── Reset ALL per-run state ────────────────────────────────────────────
    // scene.start() reuses the existing instance — constructor is NOT re-run.
    this.failGuard   = false;
    this.lastFloor   = 0;
    this._camCeiling = null;   // lowest scrollY the camera has ever reached
    this._camInit    = false;  // true after follow has settled (frame 2+)

    // ── Textures & scene base ──────────────────────────────────────────────
    this.createLevelTextures();
    super.create();   // keyboard, pause overlay, HUD timer-reset

    const w = this.scale.width;    // 480
    const h = this.scale.height;   // 854

    // ── World ──────────────────────────────────────────────────────────────
    const worldHeight = h + this.totalFloors * this.floorSpacing + 260;
    this.worldHeight  = worldHeight;
    this.physics.world.setBounds(0, 0, w, worldHeight);

    // ── Background (fixed to screen, no scroll) ────────────────────────────
    this.bg = this.add
      .tileSprite(0, 0, w, h, 'tex_bg_brick')
      .setOrigin(0, 0)
      .setScrollFactor(0);

    // ── Platforms ─────────────────────────────────────────────────────────
    const platforms = this.physics.add.staticGroup();

    // Full-width ground row
    const groundY = worldHeight - 28;
    for (let x = 0; x < w; x += 64) {
      platforms.create(x + 32, groundY, 'tex_platform');
    }

    // 20 climbing floors – zig-zag static layout; floors 18 & 19 move
    const margin  = 80;
    const xRange  = w - margin * 2;
    const platW   = 64 * 1.67;
    const edgeL   = platW / 2 + 4;
    const edgeR   = w - platW / 2 - 4;
    const travelDuration = 2400; // same speed for both

    // Moving platforms group (dynamic, immovable, tween-driven)
    this._movingPlatforms = this.physics.add.group();

    for (let floor = 1; floor <= this.totalFloors; floor++) {
      const y = worldHeight - 100 - floor * this.floorSpacing;
      const x = margin + ((floor * 137) % 100 / 100) * xRange;

      const isMoving = (floor === 18 || floor === 19);

      if (isMoving) {
        // Floor 18 starts left→right, floor 19 starts right→left
        const goRight = (floor === 18);
        const startX  = goRight ? edgeL : edgeR;
        const endX    = goRight ? edgeR : edgeL;
        const fixedY  = y; // never changes

        const plat = this.physics.add.image(startX, fixedY, 'tex_platform')
          .setScale(1.67, 1)
          .setImmovable(true);
        plat.body.allowGravity = false;
        // One-way: only block collision from the top (player can jump through from below)
        plat.body.checkCollision.down  = false;
        plat.body.checkCollision.left  = false;
        plat.body.checkCollision.right = false;

        this.tweens.add({
          targets: plat,
          x: endX,
          duration: travelDuration,
          ease: 'Linear',
          yoyo: true,
          repeat: -1,
          onUpdate: () => {
            // Sync physics body — always restore fixedY so platform never drifts vertically
            plat.body.reset(plat.x, fixedY);
          }
        });

        this._movingPlatforms.add(plat);
        if (floor === this.totalFloors) this._lastPlatformPos = { x: startX, y };
      } else {
        const sp = platforms.create(x, y, 'tex_platform').setScale(1.67, 1).refreshBody();
        // One-way: player can jump through from below, lands on top
        sp.body.checkCollision.down  = false;
        sp.body.checkCollision.left  = false;
        sp.body.checkCollision.right = false;
        if (floor === this.totalFloors) this._lastPlatformPos = { x, y };
      }
    }

    // ── Player ────────────────────────────────────────────────────────────
    this.player = this.physics.add.sprite(w / 2, worldHeight - 80, 'tex_player');
    this.player.setCollideWorldBounds(true);
    this.player.setDragX(600);
    this.player.setMaxVelocity(420, 900);
    this.physics.add.collider(this.player, platforms);
    this.physics.add.collider(this.player, this._movingPlatforms);

    // ── Goal flag ─────────────────────────────────────────────────────────
    const lp    = this._lastPlatformPos ?? { x: w / 2, y: worldHeight - 200 };
    const goalY = lp.y - 52;
    this.goal   = this.physics.add.staticImage(lp.x, goalY, 'tex_goal');
    this.goal.refreshBody();
    this.physics.add.overlap(this.player, this.goal, () => {
      if (this.failGuard) return;
      this.failGuard = true;
      this.cameras.main.flash(500, 255, 255, 255);
      this.time.delayedCall(600, () => {
        window.location.replace(
          window.location.origin + window.location.pathname +
          '?level=2&v=' + Date.now()
        );
      });
    });

    // ── Camera ────────────────────────────────────────────────────────────
    // Strategy: startFollow so the player is ALWAYS visible from frame 1.
    // One-way lock is enforced by shrinking the camera bounds — camera.preRender()
    // clamps scrollY to bounds AFTER computing the follow target, so bounds
    // are the reliable place to block downward movement.
    this.cameras.main.setBounds(0, 0, w, worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(w * 0.6, h * 0.3);

    // ── HUD seed ──────────────────────────────────────────────────────────
    this.emitFloorsChanged(0);

    this.add.text(w / 2, worldHeight - 170, '↑  CLIMB UP  ↑', {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: '15px',
      color: '#c9d1ff',
    }).setOrigin(0.5);
  }

  // ── Per-frame ─────────────────────────────────────────────────────────────
  update() {
    if (this.isPaused || this.failGuard) return;

    const { left, right, jump } = this.getMoveInput();
    const onGround = this.player.body.blocked.down;

    // Manual check: is the player resting on top of a moving platform?
    // body.reset() clears blocked flags each frame, so we can't rely on them alone.
    const py = this.player.body.bottom;
    const px = this.player.x;
    let onMovingPlat = false;
    if (!onGround && this.player.body.velocity.y >= 0) {
      this._movingPlatforms.getChildren().forEach(plat => {
        const halfW = plat.body.halfWidth;
        const platTop = plat.body.y; // top edge of physics body
        if (
          Math.abs(py - platTop) < 12 &&
          px >= plat.body.x - halfW - 4 &&
          px <= plat.body.x + halfW + 4
        ) {
          onMovingPlat = true;
          // Snap player to sit exactly on top
          this.player.body.y = platTop - this.player.body.height;
          this.player.body.velocity.y = 0;
        }
      });
    }

    const canJump = onGround || onMovingPlat;

    // Horizontal movement
    if (left)        this.player.setAccelerationX(-1100);
    else if (right)  this.player.setAccelerationX(1100);
    else             this.player.setAccelerationX(0);

    // Jump
    if (jump && canJump) this.player.setVelocityY(-640);

    // ── One-way camera via dynamic bounds ─────────────────────────────────
    // camera.preRender() follows the player, THEN clamps scrollY to bounds.
    // By shrinking the top bound of the allowed scroll range, we prevent the
    // camera from ever going back down once it has scrolled up.
    //
    // Frame 0: startFollow not yet run → scrollY = 0 (default).  Skip.
    // Frame 1+: startFollow has run → scrollY reflects actual position.
    const scrollY = this.cameras.main.scrollY;
    const w = this.scale.width;
    const h = this.scale.height;

    if (!this._camInit) {
      // Wait until startFollow has positioned the camera above 0
      if (scrollY > 0) {
        this._camInit    = true;
        this._camCeiling = scrollY;
        // Bounds: scroll can go from 0 up to _camCeiling (no further down)
        this.cameras.main.setBounds(0, 0, w, this._camCeiling + h);
      }
    } else {
      // Camera scrolled UP → new ceiling, tighten the bounds
      if (scrollY < this._camCeiling) {
        this._camCeiling = scrollY;
        this.cameras.main.setBounds(0, 0, w, this._camCeiling + h);
      }
      // Camera trying to scroll DOWN → bounds clamp already prevents it.
      // No explicit override needed here.
    }

    // Parallax: use _camCeiling (never drifts down)
    const displayScroll = this._camCeiling ?? scrollY;
    if (this.bg) this.bg.tilePositionY = displayScroll * 0.25;

    // ── Floors counter ─────────────────────────────────────────────────────
    const startY  = this.worldHeight - 80;
    const climbed = startY - this.player.y;
    const floors  = Phaser.Math.Clamp(
      Math.floor(climbed / this.floorSpacing), 0, this.totalFloors
    );
    if (floors !== this.lastFloor) {
      this.lastFloor = floors;
      this.emitFloorsChanged(floors);
    }

    // ── Death: fall off the locked viewport ───────────────────────────────
    // Kill zone = 60 px below the bottom of the locked camera window.
    // _camCeiling never goes back up, so this zone never moves back down.
    if (this._camInit) {
      const killY = this._camCeiling + h + 60;
      if (this.player.y > killY && !this.failGuard) {
        this.failGuard = true;
        this.cameras.main.flash(200, 255, 60, 80);
        // Respawn in place — teleport back to start, stop all momentum, stay still
        this.time.delayedCall(250, () => {
          const spawnY = this.worldHeight - 80;
          this.player.setPosition(this.scale.width / 2, spawnY);
          this.player.setVelocity(0, 0);
          this.player.setAccelerationX(0);
          this.lastFloor = 0;
          this.emitFloorsChanged(0);
          // Reset camera ceiling so it can follow player back down to start
          this._camInit    = false;
          this._camCeiling = null;
          this.cameras.main.setBounds(0, 0, this.scale.width, this.worldHeight);
          this.failGuard = false;
        });
      }
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  emitFloorsChanged(floors) {
    this.game.events.emit('floors:changed', { floors });
  }

  // ── Texture generation ────────────────────────────────────────────────────
  createLevelTextures() {
    // Destroy existing textures so restarts don't hit the "key already exists" warning
    ['tex_player', 'tex_platform', 'tex_bg_brick', 'tex_goal'].forEach(key => {
      if (this.textures.exists(key)) this.textures.remove(key);
    });

    const g = this.add.graphics();

    // Player sprite
    g.clear();
    g.fillStyle(0x5c4a32, 1);
    g.fillRect(4, 28, 8, 12);
    g.fillRect(14, 28, 8, 12);
    g.fillStyle(0x2ecc71, 1);
    g.fillRoundedRect(2, 14, 22, 16, 4);
    g.fillStyle(0xf1c40f, 1);
    g.fillTriangle(10, 20, 13, 16, 16, 20);
    g.fillStyle(0xffccaa, 1);
    g.fillCircle(13, 10, 8);
    g.fillStyle(0x3498db, 1);
    g.fillRect(3, 2, 20, 8);
    g.fillRect(1, 8, 24, 4);
    g.lineStyle(2, 0x1a5276, 1);
    g.strokeRect(3, 2, 20, 8);
    g.strokeRect(1, 8, 24, 4);
    g.lineStyle(1, 0x333333, 1);
    g.beginPath();
    g.arc(13, 11, 4, 0.2, Math.PI - 0.2);
    g.strokePath();
    g.generateTexture('tex_player', 26, 40);

    // Platform
    g.clear();
    g.fillStyle(0xbfe9ff, 1);
    g.fillRect(0, 0, 64, 16);
    g.fillStyle(0xf5fbff, 1);
    g.fillRect(0, 0, 64, 5);
    g.lineStyle(1, 0x86c9f2, 0.9);
    g.lineBetween(6, 6, 22, 14);
    g.lineBetween(24, 6, 40, 14);
    g.lineBetween(42, 6, 58, 14);
    g.fillStyle(0x8fd3ff, 0.35);
    g.fillTriangle(0, 16, 0, 8, 10, 16);
    g.fillTriangle(64, 16, 54, 16, 64, 8);
    g.lineStyle(2, 0x3f6f8f, 1);
    g.strokeRect(0, 0, 64, 16);
    g.generateTexture('tex_platform', 64, 16);

    // Brick background tile
    g.clear();
    g.fillStyle(0x1b2130, 1);
    g.fillRect(0, 0, 128, 128);
    const brickFill = 0x2a3247;
    const mortar    = 0x111624;
    g.lineStyle(2, mortar, 1);
    for (let row = 0; row < 8; row++) {
      const rowY   = row * 16;
      const offset = (row % 2) * 16;
      for (let col = 0; col < 8; col++) {
        const x = col * 32 - offset;
        g.fillStyle(brickFill + (row % 3) * 0x040404, 1);
        g.fillRect(Phaser.Math.Wrap(x, -32, 128), rowY, 32, 16);
        g.strokeRect(Phaser.Math.Wrap(x, -32, 128), rowY, 32, 16);
      }
    }
    g.generateTexture('tex_bg_brick', 128, 128);

    // Goal flag
    g.clear();
    g.fillStyle(0xf6d365, 1);
    g.fillRect(2, 2, 4, 40);
    g.fillStyle(0x8bd450, 1);
    g.fillTriangle(6, 6, 30, 14, 6, 22);
    g.lineStyle(2, 0x1f3a7a, 0.7);
    g.strokeRect(2, 2, 4, 40);
    g.generateTexture('tex_goal', 32, 44);

    g.destroy();
  }
}
