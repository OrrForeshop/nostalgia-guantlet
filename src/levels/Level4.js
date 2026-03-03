import LevelBase from './LevelBase.js';

export default class Level4 extends LevelBase {
  constructor() {
    super('Level4');
    this.blocks        = null;
    this.ball          = null;
    this.paddle        = null;
    this.ballSpeed     = 350;
    this.isLevelComplete = false;
    this.failGuard     = false;
    this.ballLaunched  = false;
    this.powerups      = null;  // falling powerup group
  }

  create() {
    super.create();
    this.introLock = false;
    this.createLevelTextures();

    const w = this.scale.width;
    const h = this.scale.height;

    this.physics.world.setBounds(0, 52, w, h - 52);
    this.physics.world.checkCollision.down = false;

    // Jungle Background (Deep green tiles)
    this.add.tileSprite(0, 52, w, h - 52, 'tex_bg_jungle').setOrigin(0);

    // 1. Paddle (Wooden Log style)
    this.paddle = this.physics.add.image(w / 2, h - 40, 'tex_paddle_wood');
    this.paddle.setImmovable(true);
    this.paddle.setCollideWorldBounds(false); // manual clamp so it truly reaches the walls
    this.paddle.body.allowGravity = false;
    this.paddle.setDepth(100);

    // 2. Ball (Coconut/Ancient Orb)
    this.ball = this.physics.add.image(w / 2, h - 65, 'tex_ball_jungle');
    this.ball.setCollideWorldBounds(true);
    this.ball.setBounce(1);
    this.ball.body.allowGravity = false;
    this.ball.setDepth(101);

    // 3. Blocks Group
    this.blocks = this.physics.add.staticGroup();
    this.createBlockLayout();

    // 4. Falling powerups group
    this.powerups = this.physics.add.group();

    // 5. Collisions
    this.physics.add.collider(this.ball, this.paddle, this.handlePaddleHit, null, this);
    this.physics.add.collider(this.ball, this.blocks, this.handleBlockHit, null, this);
    this.physics.add.overlap(this.paddle, this.powerups, this.handlePowerupCatch, null, this);

    // Custom HUD
    this.game.events.emit('level:changed', {
      levelNumber: 4,
      objective: 'JUMP to launch. Catch power-ups!',
      totalLevels: 50
    });

    // Rearrange buttons to < JUMP > for this level only
    const controls = document.getElementById('controls');
    const btnLeft  = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    const btnJump  = document.getElementById('btn-jump');
    if (controls && btnLeft && btnRight && btnJump) {
      btnJump.textContent = 'START';
      controls.appendChild(btnLeft);
      controls.appendChild(btnJump);
      controls.appendChild(btnRight);
    }

    // Restore button order and label when leaving this scene
    this.events.once('shutdown', () => {
      if (controls && btnLeft && btnRight && btnJump) {
        btnJump.textContent = 'JUMP';
        controls.appendChild(btnLeft);
        controls.appendChild(btnRight);
        controls.appendChild(btnJump);
      }
    });
  }

  createLevelTextures() {
    const g = this.add.graphics();

    // BACKGROUND: Dark Jungle Green with leaf pattern
    g.clear();
    g.fillStyle(0x1a2e1a, 1);
    g.fillRect(0, 0, 128, 128);
    g.fillStyle(0x223c22, 0.5);
    g.fillTriangle(0, 128, 64, 0, 128, 128); // Leaf-ish shape
    g.generateTexture('tex_bg_jungle', 128, 128);

    // PADDLE: Carved Jungle Wood
    g.clear();
    g.fillStyle(0x5d4037, 1); // Dark Brown
    g.fillRoundedRect(0, 0, 140, 20, 10);
    g.lineStyle(2, 0x3e2723, 1);
    g.strokeRoundedRect(0, 0, 140, 20, 10);
    // Wood grain lines
    g.lineStyle(1, 0x795548, 0.4);
    g.lineBetween(10, 5, 130, 5);
    g.lineBetween(15, 12, 125, 12);
    g.generateTexture('tex_paddle_wood', 140, 20);

    // BALL: Ancient Jade Orb
    g.clear();
    g.fillStyle(0x2ecc71, 1); // Jade Green
    g.fillCircle(10, 10, 10);
    g.fillStyle(0xffffff, 0.3);
    g.fillCircle(7, 7, 4);
    g.generateTexture('tex_ball_jungle', 20, 20);

    // BLOCK: Normal - stone grey (60×22, 1/4 smaller than original 80×30)
    g.clear();
    g.fillStyle(0x455a64, 1);
    g.fillRect(0, 0, 60, 22);
    g.fillStyle(0x2e7d32, 0.5);
    g.fillRect(4, 4, 14, 7);
    g.fillRect(38, 11, 16, 6);
    g.lineStyle(2, 0x1b5e20, 1);
    g.strokeRect(0, 0, 60, 22);
    g.generateTexture('tex_block_moss', 60, 22);

    // BLOCK: Multiply (×2 ball) - yellow/gold
    g.clear();
    g.fillStyle(0xf1c40f, 1);
    g.fillRect(0, 0, 60, 22);
    g.lineStyle(2, 0xd4ac0d, 1);
    g.strokeRect(0, 0, 60, 22);
    g.fillStyle(0xffffff, 0.9);
    g.fillRect(20, 6, 8, 10); // ×
    g.fillRect(32, 6, 8, 10);
    g.generateTexture('tex_block_multiply', 60, 22);

    // BLOCK: Wide paddle — purple
    g.clear();
    g.fillStyle(0x9b59b6, 1);
    g.fillRect(0, 0, 60, 22);
    g.lineStyle(2, 0x7d3c98, 1);
    g.strokeRect(0, 0, 60, 22);
    g.fillStyle(0xffffff, 0.9);
    g.fillRect(8, 9, 44, 4);   // ——— (wide bar symbol)
    g.generateTexture('tex_block_wide', 60, 22);

    // BLOCK: Fast ball - red/orange
    g.clear();
    g.fillStyle(0xe74c3c, 1);
    g.fillRect(0, 0, 60, 22);
    g.lineStyle(2, 0xc0392b, 1);
    g.strokeRect(0, 0, 60, 22);
    g.fillStyle(0xffffff, 0.9);
    g.fillTriangle(18, 6, 18, 16, 30, 11); // ► (fast symbol)
    g.fillTriangle(28, 6, 28, 16, 42, 11);
    g.generateTexture('tex_block_fast', 60, 22);

    // POWERUP ICONS (16×16 falling pills)
    // Multiply - yellow
    g.clear(); g.fillStyle(0xf1c40f,1); g.fillCircle(8,8,8); g.fillStyle(0x000,0.7); g.fillRect(5,5,6,8); g.generateTexture('tex_pu_multiply',16,16);
    // Wide - purple
    g.clear(); g.fillStyle(0x9b59b6,1); g.fillCircle(8,8,8); g.fillStyle(0xfff,0.9); g.fillRect(2,7,12,2); g.generateTexture('tex_pu_wide',16,16);
    // Fast - red
    g.clear(); g.fillStyle(0xe74c3c,1); g.fillCircle(8,8,8); g.fillStyle(0xfff,0.9); g.fillTriangle(4,4,4,12,12,8); g.generateTexture('tex_pu_fast',16,16);

    g.destroy();
  }

  createBlockLayout() {
    const w      = this.scale.width;
    const bw     = 60, gap = 8;
    const cols   = Math.floor((w - 20) / (bw + gap));
    const startX = Math.floor((w - cols * (bw + gap) + gap) / 2) + bw / 2;
    const rowYs  = [76, 106, 136, 166, 196];
    const puTypes = ['multiply', 'wide', 'fast'];

    // Build full list of block positions
    const positions = [];
    rowYs.forEach(y => {
      for (let c = 0; c < cols; c++) {
        positions.push({ x: startX + c * (bw + gap), y });
      }
    });

    // Shuffle positions and assign exactly 10 power-ups (evenly across types)
    const shuffled = positions.slice().sort(() => Math.random() - 0.5);
    const puSlots  = new Set();
    // Pick 10 slots — at least 3 of each type, last 1 random
    const puAssignments = [];
    for (let i = 0; i < 9; i++) puAssignments.push(puTypes[i % 3]);
    puAssignments.push(puTypes[Math.floor(Math.random() * 3)]);
    // Shuffle assignments
    puAssignments.sort(() => Math.random() - 0.5);

    for (let i = 0; i < 10; i++) puSlots.set = undefined; // dummy — use array index check

    // Map first 10 shuffled positions to power-ups
    const puMap = new Map();
    for (let i = 0; i < 10 && i < shuffled.length; i++) {
      puMap.set(shuffled[i], puAssignments[i]);
    }

    // Create all blocks
    positions.forEach(pos => {
      const puType = puMap.get(pos) || null;
      const texture = puType ? `tex_block_${puType}` : 'tex_block_moss';
      const block = this.blocks.create(pos.x, pos.y, texture);
      block.setData('puType', puType);
    });
  }

  handlePaddleHit(ball, paddle) {
    const diff       = ball.x - paddle.x;
    const normalized = Phaser.Math.Clamp(diff / (paddle.displayWidth / 2), -1, 1);
    const speed      = Math.max(this.ballSpeed, Math.sqrt(ball.body.velocity.x**2 + ball.body.velocity.y**2));
    // Max horizontal shift = 60% of speed, so vertical is always at least 80% (sin/cos ~37°)
    const maxX   = speed * 0.6;
    const vx     = normalized * maxX;
    const vy     = -Math.sqrt(speed * speed - vx * vx);  // always strong upward
    ball.setVelocity(vx, vy);
  }

  handleBlockHit(ball, block) {
    const puType = block.getData('puType');
    const bx = block.x, by = block.y;
    block.destroy();

    // Drop a falling power-up if this was a power-up block
    if (puType) {
      const pu = this.powerups.create(bx, by, `tex_pu_${puType}`);
      pu.setData('puType', puType);
      pu.body.allowGravity = true;
      pu.body.setVelocityY(120);
      pu.setDepth(50);
    }

    const currentVel = ball.body.velocity;
    ball.setVelocity(currentVel.x * 1.02, currentVel.y * 1.02);

    if (this.blocks.countActive() === 0 && !this.isLevelComplete) {
      this.isLevelComplete = true;
      this.cameras.main.flash(500, 255, 255, 255);
      setTimeout(() => {
        window.location.assign(window.location.origin + window.location.pathname + '?level=5');
      }, 500);
    }
  }

  handlePowerupCatch(paddle, pu) {
    const puType = pu.getData('puType');
    pu.destroy();

    if (puType === 'multiply') {
      // Spawn a second ball
      const b2 = this.physics.add.image(this.ball.x, this.ball.y, 'tex_ball_jungle');
      b2.setCollideWorldBounds(true);
      b2.setBounce(1);
      b2.body.allowGravity = false;
      b2.setDepth(101);
      b2.setVelocity(this.ball.body.velocity.x * -0.9, this.ball.body.velocity.y);
      this.physics.add.collider(b2, this.paddle, this.handlePaddleHit, null, this);
      this.physics.add.collider(b2, this.blocks, this.handleBlockHit, null, this);
      this.cameras.main.flash(200, 255, 255, 0);
    } else if (puType === 'wide') {
      // Extend paddle width by 40px, max 220px
      const newW = Math.min(220, this.paddle.displayWidth + 40);
      this.paddle.setDisplaySize(newW, this.paddle.displayHeight);
      this.paddle.body.setSize(newW, this.paddle.displayHeight);
      this.cameras.main.flash(200, 155, 89, 182);
    } else if (puType === 'fast') {
      const v = this.ball.body.velocity;
      const spd = Math.sqrt(v.x * v.x + v.y * v.y);
      const factor = Math.min(2.5, 560 / spd);
      this.ball.setVelocity(v.x * factor, v.y * factor);
      this.cameras.main.flash(200, 231, 76, 60);
    }
  }

  loseLife() {
    let lives = this.game.registry.get('playerLives') || 3;
    lives--;
    this.game.registry.set('playerLives', lives);
    this.game.events.emit('player:lost_life');

    if (lives <= 0) {
      // GAME OVER
      this.showGameOver();
    } else {
      // Reset ball position
      this.time.delayedCall(500, () => {
        this.ballLaunched = false;
        this.failGuard = false;
        this.ball.setVelocity(0, 0);
        this.ball.x = this.paddle.x;
        this.ball.y = this.paddle.y - 25;
      });
    }
  }

  showGameOver() {
    this.isPaused = true;
    const w = this.scale.width;
    const h = this.scale.height;

    // Darken screen
    const overlay = this.add.rectangle(0, 0, w, h, 0x000000, 0.7).setOrigin(0).setDepth(200);

    // Game Over Text
    this.add.text(w/2, h/2 - 40, 'GAME OVER', {
      fontSize: '48px',
      fontStyle: 'bold',
      color: '#ff0000',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(201);

    // Restart prompt
    const restartText = this.add.text(w/2, h/2 + 30, 'Press START to restart', {
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5).setDepth(201);

    // Blink effect
    this.tweens.add({
      targets: restartText,
      alpha: 0.3,
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    const doRestart = () => {
      this.game.registry.set('playerLives', 3);
      window.location.reload();
    };

    // Listen for jump key or touch jump button
    this.input.keyboard.once('keydown-SPACE', doRestart);
    this.input.keyboard.once('keydown-UP',    doRestart);

    // Poll touch jump via registry
    this._gameOverRestartPoll = this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        const t = this.game.registry.get('touchInput') || {};
        if (t.jump) doRestart();
      }
    });
  }

  update() {
    if (this.isPaused || this.isLevelComplete) return;
    const { left, right, jump } = this.getMoveInput();

    const accel = 2400;
    if (left) this.paddle.setAccelerationX(-accel);
    else if (right) this.paddle.setAccelerationX(accel);
    else { this.paddle.setAccelerationX(0); this.paddle.setDragX(3000); }

    // Clamp paddle to screen edges using actual display half-width
    const hw = this.paddle.displayWidth / 2;
    const sw = this.scale.width;
    if (this.paddle.x < hw) {
      this.paddle.x = hw;
      this.paddle.body.velocity.x = 0;
    } else if (this.paddle.x > sw - hw) {
      this.paddle.x = sw - hw;
      this.paddle.body.velocity.x = 0;
    }

    if (!this.ballLaunched) {
      this.ball.x = this.paddle.x;
      this.ball.y = this.paddle.y - 25;
      if (jump) {
        this.ballLaunched = true;
        this.ball.setVelocity(this.ballSpeed * 0.5, -this.ballSpeed);
      }
    }

    if (this.ball.y > this.scale.height && !this.failGuard) {
      this.failGuard = true;
      this.cameras.main.shake(200, 0.01);
      this.loseLife();
    }

    // Destroy powerups that fall off screen
    if (this.powerups) {
      this.powerups.getChildren().forEach(pu => {
        if (pu.y > this.scale.height + 20) pu.destroy();
      });
    }
  }
}
