import LevelBase from './LevelBase.js';

export default class Level2 extends LevelBase {
  constructor() {
    super('Level2');
    this.orbs = null;
    this.harpoonActive = false;
    this.isLevelComplete = false;
    this.failGuard = false;
  }

  create() {
    // Reset all per-run state — constructor is NOT re-run on scene.restart()
    this.failGuard      = false;
    this.harpoonActive  = false;
    this.isLevelComplete = false;
    this.orbs           = null;

    super.create();
    this.createLevelTextures();

    const w = this.scale.width;
    const h = this.scale.height;

    // Arena Bounds
    this.physics.world.setBounds(0, 52, w, h - 52); 

    // Background: Icy tiles
    this.add.tileSprite(0, 52, w, h - 52, 'tex_bg_icy').setOrigin(0);

    // Torches
    for (let y = 140; y < h - 100; y += 180) {
      this.addTorch(18, y);
      this.addTorch(w - 18, y);
    }

    // Player (Suit version)
    this.player = this.physics.add.sprite(w / 2, h - 40, 'tex_player_suit');
    this.player.setCollideWorldBounds(true);
    this.player.setDragX(1200);
    this.player.setMaxVelocity(450, 0); 

    // Orbs
    this.orbs = this.physics.add.group();
    this.spawnOrb(w / 2, 180, 'large', 190);

    // Collision is handled manually in update() via distance check
    // (Phaser overlap misses fast small bodies)

    // Harpoon
    this.harpoonLine = this.add.graphics();
    this.harpoonHead = this.physics.add.sprite(0, 0, 'tex_harpoon_head_metal').setVisible(false);
    this.harpoonHead.body.setAllowGravity(false);

    // HUD Update
    this.game.events.emit('level:changed', {
      levelNumber: 2,
      objective: 'Pop all orbs! (Space to Shoot)',
      totalLevels: 50
    });

    // Rename JUMP → FIRE for this level
    const btnJump = document.getElementById('btn-jump');
    if (btnJump) {
      btnJump.textContent = 'FIRE';
      this.events.once('shutdown', () => {
        btnJump.textContent = 'JUMP';
      });
    }
  }

  addTorch(x, y) {
    this.add.rectangle(x, y, 6, 22, 0x444444);
    const flame = this.add.circle(x, y - 14, 6, 0xff8800);
    this.tweens.add({
      targets: flame,
      scale: 1.6,
      alpha: 0.6,
      duration: 250,
      yoyo: true,
      repeat: -1
    });
  }

  createLevelTextures() {
    ['tex_bg_icy','tex_harpoon_head_metal','orb_large','orb_medium','orb_small','tex_player_suit']
      .forEach(k => { if (this.textures.exists(k)) this.textures.remove(k); });
    const g = this.add.graphics();

    // BACKGROUND: Light blue icy tiles
    g.clear();
    g.fillStyle(0xd6f1ff, 1);
    g.fillRect(0, 0, 128, 128);
    g.lineStyle(2, 0xbfe5ff, 1);
    g.strokeRect(0, 0, 128, 128);
    g.generateTexture('tex_bg_icy', 128, 128);
    
    // Harpoon Head
    g.clear();
    g.fillStyle(0xaaaaaa, 1);
    g.fillTriangle(0, 14, 7, 0, 14, 14);
    g.lineStyle(2, 0x333333, 1);
    g.strokeTriangle(0, 14, 7, 0, 14, 14);
    g.generateTexture('tex_harpoon_head_metal', 14, 14);

    // ORBS (High-gloss Red)
    // Large
    g.clear();
    g.fillStyle(0xff0000, 1);
    g.fillCircle(32, 32, 32);
    g.fillStyle(0xffffff, 0.4);
    g.fillCircle(20, 20, 10); // Shine
    g.generateTexture('orb_large', 64, 64);

    // Medium
    g.clear();
    g.fillStyle(0xff0000, 1);
    g.fillCircle(20, 20, 20);
    g.fillStyle(0xffffff, 0.4);
    g.fillCircle(12, 12, 6);
    g.generateTexture('orb_medium', 40, 40);

    // Small
    g.clear();
    g.fillStyle(0xff0000, 1);
    g.fillCircle(11, 11, 11);
    g.fillStyle(0xffffff, 0.4);
    g.fillCircle(7, 7, 3);
    g.generateTexture('orb_small', 22, 22);

    // PLAYER: Inspired by the red devil character
    g.clear();
    
    // Black trench coat (long)
    g.fillStyle(0x1a1a1a, 1);
    g.fillRect(2, 16, 22, 24); 
    
    // Yellow shirt
    g.fillStyle(0xeeee00, 1);
    g.fillRect(8, 16, 10, 10);
    
    // Orange shorts
    g.fillStyle(0xff6600, 1);
    g.fillRect(6, 26, 14, 8);
    
    // Red skin/face
    g.fillStyle(0xff3333, 1);
    g.fillCircle(13, 10, 10); 
    
    // Tiny horns
    g.fillStyle(0xcc0000, 1);
    g.fillTriangle(4, 4, 6, 0, 8, 4);   // Left
    g.fillTriangle(18, 4, 20, 0, 22, 4); // Right
    
    // Black sunglasses (sharp/pointed)
    g.fillStyle(0x000000, 1);
    g.fillTriangle(4, 8, 13, 12, 13, 8); // Left lens
    g.fillTriangle(22, 8, 13, 12, 13, 8); // Right lens
    
    // Yellow bandaid on forehead
    g.fillStyle(0xddcc66, 1);
    g.fillRect(15, 3, 5, 2);
    
    g.generateTexture('tex_player_suit', 26, 40);

    g.destroy();
  }

  spawnOrb(x, y, size, vx) {
    let texture = 'orb_large';
    if (size === 'medium') texture = 'orb_medium';
    if (size === 'small') texture = 'orb_small';

    // Hit radius per size — used by manual distance check in update()
    const radius = size === 'large' ? 32 : size === 'medium' ? 20 : 11;

    const orb = this.orbs.create(x, y, texture);
    orb.setData('size', size);
    orb.setData('radius', radius);
    orb.setCollideWorldBounds(true);
    orb.setBounce(1.0);
    orb.setVelocity(vx, 110);
    orb.body.setGravityY(450);
  }

  fireHarpoon() {
    if (this.harpoonActive) return;
    this.harpoonActive = true;
    this.harpoonHead.setPosition(this.player.x, this.player.y - 20);
    this.harpoonHead.setVisible(true);
    this.harpoonHead.setVelocityY(-750);
  }

  update() {
    if (this.isPaused || this.isLevelComplete) return;

    // Manual orb-vs-player collision — hardcoded radii, no physics body dependency
    if (!this.failGuard && this.orbs) {
      const px = this.player.x;
      const py = this.player.y;
      const playerRadius = 13;
      this.orbs.getChildren().forEach(orb => {
        if (!orb.active || this.failGuard) return;
        const orbRadius = orb.getData('radius') || 11;
        const dx = orb.x - px;
        const dy = orb.y - py;
        if (dx * dx + dy * dy < (playerRadius + orbRadius) * (playerRadius + orbRadius)) {
          this.handlePlayerHit();
        }
      });
    }

    const { left, right, jump } = this.getMoveInput();

    if (left) this.player.setAccelerationX(-1600);
    else if (right) this.player.setAccelerationX(1600);
    else this.player.setAccelerationX(0);

    if (jump) this.fireHarpoon();

    if (this.harpoonActive) {
      this.harpoonLine.clear();
      this.harpoonLine.lineStyle(3, 0x888888, 1);
      
      let startX = this.harpoonHead.x;
      let currY = this.player.y - 12;
      let targetY = this.harpoonHead.y;
      
      this.harpoonLine.beginPath();
      this.harpoonLine.moveTo(startX, currY);
      
      let segment = 12;
      let steps = Math.floor(Math.abs(currY - targetY) / segment);
      for (let i = 1; i <= steps; i++) {
        let offsetX = (i % 2 === 0) ? 6 : -6;
        this.harpoonLine.lineTo(startX + offsetX, currY - i * segment);
      }
      this.harpoonLine.lineTo(startX, targetY);
      this.harpoonLine.strokePath();

    // COLLISION LOGIC: Check if ANY orb touches the harpoon line (the sides)
    this.orbs.getChildren().forEach(orb => {
      if (!orb.active) return;
      
      const harpoonWidth = 14; 
      const hRect = new Phaser.Geom.Rectangle(
        this.harpoonHead.x - harpoonWidth/2, 
        this.harpoonHead.y, 
        harpoonWidth, 
        Math.max(1, this.player.y - this.harpoonHead.y)
      );
      
      const orbCircle = new Phaser.Geom.Circle(orb.x, orb.y, orb.displayHeight/2);

      if (Phaser.Geom.Intersects.CircleToRectangle(orbCircle, hRect)) {
        this.popOrb(this.harpoonHead, orb);
        
        // CRITICAL FIX: Check immediately after popping if this was the LAST orb
        this.time.delayedCall(10, () => {
          if (this.orbs.countActive() === 0 && !this.isLevelComplete) {
            this.isLevelComplete = true;
            console.log("LAST ORB POPPED - FORCING LEVEL 3");
            window.location.replace(window.location.origin + window.location.pathname + '?level=3&v=' + Date.now());
          }
        });
      }
    });

      if (this.harpoonHead.y <= 52) this.resetHarpoon();
    }

    if (this.orbs.countActive() === 0 && !this.isLevelComplete) {
      this.isLevelComplete = true;
      
      // 1. Visual Feedback
      this.cameras.main.flash(500, 255, 255, 255);
      
      // 2. IMMEDIATE Hard Redirect (No delays, no logic, just jump)
      window.location.href = window.location.origin + window.location.pathname + '?level=3&v=' + Date.now();
    }
  }

  popOrb(harpoon, orb) {
    const size = orb.getData('size');
    const x = orb.x;
    const y = orb.y;
    const vx = Math.abs(orb.body.velocity.x) * 1.1;

    orb.destroy();
    this.resetHarpoon();

    if (size === 'large') {
      this.spawnOrb(x - 12, y, 'medium', -vx);
      this.spawnOrb(x + 12, y, 'medium', vx);
    } else if (size === 'medium') {
      this.spawnOrb(x - 8, y, 'small', -vx);
      this.spawnOrb(x + 8, y, 'small', vx);
    }
    this.cameras.main.shake(120, 0.006);
  }

  resetHarpoon() {
    this.harpoonActive = false;
    this.harpoonHead.setVisible(false);
    this.harpoonHead.setVelocityY(0);
    this.harpoonLine.clear();
  }

  handlePlayerHit() {
    if (this.failGuard) return;
    this.failGuard = true;
    this.cameras.main.flash(80, 255, 60, 60);
    this.time.delayedCall(1, () => this.scene.restart());
  }
}
