import LevelBase from './LevelBase.js';

export default class Level8 extends LevelBase {
  constructor() {
    super('Level8');
    this.player = null;
    this.platforms = null;
    this.collapseWall = null;
    this.isLevelComplete = false;
    this.isGameOver = false;
    this.runSpeed = 357;      // 15% slower player
    this.collapseSpeed = 250; // Medium chase speed
    this.worldWidth = 7000;   // Longer run
  }

  create() {
    super.create();
    this.createLevelTextures();

    const w = this.scale.width;
    const h = this.scale.height;

    // Game area: from below HUD (y=52) to top of controls area (h-10)
    const topY    = 52;
    const bottomY = h - 10;
    const gameH   = bottomY - topY;
    this._topY    = topY;
    this._bottomY = bottomY;

    this.physics.world.setBounds(0, topY, this.worldWidth, gameH);
    this.cameras.main.setBounds(0, 0, this.worldWidth, h);

    // Background fills only game area
    this.bg = this.add.tileSprite(0, topY, w, gameH, 'tex_bg_city').setOrigin(0).setScrollFactor(0);

    this.platforms = this.physics.add.staticGroup();
    this.createPlatforms();

    // Player spawns above the first platform
    this.player = this.physics.add.sprite(200, topY + 80, 'tex_player_runner');
    this.player.setDepth(10);
    this.player.setCollideWorldBounds(true);
    this.player.setGravityY(1500);
    this.physics.add.collider(this.player, this.platforms);

    // Collapse wall — full game-area height
    this.collapseWall = this.add.rectangle(-w + 50, topY, w, gameH, 0xff0000, 0.5).setOrigin(0);
    this.collapseWall.setDepth(5);

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1, -100, 0);

    // Progress text — fixed to camera, below HUD bar
    this.txtProgress = this.add.text(w/2, topY + 16, 'DISTANCE: 0%', {
      fontSize: '20px', color: '#ffffff', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100);

    // Create cursor keys ONCE here (not every frame in update)
    this._cursors = this.input.keyboard.createCursorKeys();
    this._spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Double-jump state
    this._jumpsLeft   = 2;   // max 2 jumps (1 ground + 1 air)
    this._jumpWasDown = false; // edge-detect: only jump on fresh press

    this.game.events.emit('level:changed', {
      levelNumber: 8,
      objective: 'Run! Don\'t get crushed!',
      totalLevels: 50
    });
  }

  createLevelTextures() {
    const g = this.add.graphics();
    
    // CITY BG
    g.clear();
    g.fillStyle(0x1a1a2e, 1);
    g.fillRect(0, 0, 128, 128);
    g.fillStyle(0x16213e, 1);
    g.fillRect(10, 40, 30, 88);
    g.fillRect(60, 20, 40, 108);
    g.generateTexture('tex_bg_city', 128, 128);

    // RUNNER
    g.clear();
    g.fillStyle(0x3498db, 1);
    g.fillRect(0, 0, 24, 32);
    g.fillStyle(0xffccaa, 1);
    g.fillRect(4, 4, 16, 12);
    g.generateTexture('tex_player_runner', 24, 32);

    // ROOFTOP PLATFORM
    g.clear();
    g.fillStyle(0x444444, 1);
    g.fillRect(0, 0, 64, 64);
    g.lineStyle(2, 0x222222, 1);
    g.strokeRect(0, 0, 64, 64);
    g.generateTexture('tex_rooftop', 64, 64);

    g.destroy();
  }

  createPlatforms() {
    const topY    = this._topY;
    const bottomY = this._bottomY;
    let currX = 0;

    // First wide platform — landing zone
    const firstPlat = this.platforms.create(200, bottomY - 80, 'tex_rooftop');
    firstPlat.setDisplaySize(600, 160);
    firstPlat.refreshBody();
    currX = 500;

    while (currX < this.worldWidth - 400) {
      const type = Phaser.Math.Between(1, 10);

      if (type > 8) {
        // TUNNEL SECTION
        const platWidth = 400;
        const floorH    = 130;
        const ceilH     = 120;

        const floor = this.platforms.create(currX + platWidth/2, bottomY - floorH/2, 'tex_rooftop');
        floor.setDisplaySize(platWidth, floorH); floor.refreshBody();

        const ceiling = this.platforms.create(currX + platWidth/2, topY + ceilH/2, 'tex_rooftop');
        ceiling.setDisplaySize(platWidth, ceilH); ceiling.refreshBody();

        this.add.text(currX + 50, bottomY - floorH - 26, 'STAY LOW!', {
          fontSize: '14px', color: '#ff4444', stroke: '#000', strokeThickness: 2
        });

        currX += platWidth + 120;
      } else {
        // STANDARD ROOFTOP
        const platWidth = Phaser.Math.Between(150, 300);
        const platH     = Phaser.Math.Between(120, 220);
        const gap       = Phaser.Math.Between(100, 160);

        const plat = this.platforms.create(currX + platWidth/2, bottomY - platH/2, 'tex_rooftop');
        plat.setDisplaySize(platWidth, platH); plat.refreshBody();

        currX += platWidth + gap;
      }
    }

    // Goal platform
    const goalX = this.worldWidth - 200;
    const finalPlat = this.platforms.create(goalX, bottomY - 80, 'tex_rooftop');
    finalPlat.setDisplaySize(400, 160); finalPlat.refreshBody();

    // Finish bar fully above ground — platform center=bottomY-80, half-height=80 → surface at bottomY-160
    // Bar height=100, so center at bottomY-160-50 = bottomY-210 puts it fully on the ground
    this.finishMarker = this.add.rectangle(goalX + 100, bottomY - 210, 40, 100, 0x8bd450).setOrigin(0.5);
    this.physics.add.existing(this.finishMarker, true);
  }

  handleGameOver(reason) {
    if (this.isGameOver || this.isLevelComplete) return;
    this.isGameOver = true;
    this.player.setTint(0xff0000);
    this.cameras.main.shake(500, 0.02);
    
    const w = this.scale.width;
    const h = this.scale.height;
    const midY = this._topY + (this._bottomY - this._topY) / 2;
    this.add.text(this.player.x, midY, reason, {
      fontSize: '48px', color: '#ff0000', fontWeight: 'bold',
      stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5);

    this.time.delayedCall(1200, () => window.location.reload());
  }

  update(_t, dt) {
    if (this.isLevelComplete || this.isGameOver || this.introLock) return;

    if (this.player && this.player.body) {
        const touch    = this.game.registry.get('touchInput') || {};
        const onGround = this.player.body.touching.down || this.player.body.blocked.down;

        // ── Left / Right movement ──────────────────────────────────────
        const goLeft  = this._cursors.left.isDown  || !!touch.left;
        const goRight = this._cursors.right.isDown || !!touch.right;

        if (goLeft)        this.player.body.setVelocityX(-this.runSpeed);
        else if (goRight)  this.player.body.setVelocityX(this.runSpeed);
        else               this.player.body.setVelocityX(0);

        // ── Double jump ────────────────────────────────────────────────
        // Reset jump count when landing
        if (onGround) this._jumpsLeft = 2;

        const jumpDown = this._cursors.up.isDown || this._spaceKey.isDown || !!touch.jump;
        const jumpJustPressed = jumpDown && !this._jumpWasDown; // edge detect

        if (jumpJustPressed && this._jumpsLeft > 0) {
            this.player.body.setVelocityY(-850);
            this._jumpsLeft--;
        }
        this._jumpWasDown = jumpDown;
    }

    if (this.collapseWall) {
        this.collapseWall.x += this.collapseSpeed * (dt/1000);
    }
    
    if (this.bg) {
        this.bg.tilePositionX = this.cameras.main.scrollX * 0.5;
    }

    if (this.player && this.collapseWall) {
        if (this.player.x < this.collapseWall.x + 50) {
            this.handleGameOver("CAUGHT!");
        }
    }
    if (this.player.y > this._bottomY + 50) {
        this.handleGameOver("FELL!");
    }

    // 7. Win Condition
    this.physics.overlap(this.player, this.finishMarker, () => {
        if (this.isLevelComplete) return;
        this.isLevelComplete = true;
        this.cameras.main.flash(500, 255, 255, 255);
        const midY2 = this._topY + (this._bottomY - this._topY) / 2;
        this.add.text(this.player.x, midY2, 'ESCAPED!', {
          fontSize: '64px', color: '#8bd450', fontWeight: 'bold',
          stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5);
        this.time.delayedCall(1500, () => {
            window.location.assign(window.location.origin + window.location.pathname + '?level=9');
        });
    });
  }
}
