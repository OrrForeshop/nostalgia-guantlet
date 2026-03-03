import LevelBase from './LevelBase.js';

export default class Level3 extends LevelBase {
  constructor() {
    super('Level3');
    this.distance        = 0;
    this.targetDistance  = 6000;
    this.scrollSpeed     = 240;
    this.isLevelComplete = false;
    this.failGuard       = false;
    this.hurdleSpacing   = 520;
    this.firstHurdleX    = 600;
  }

  create() {
    this.distance        = 0;
    this.isLevelComplete = false;
    this.failGuard       = false;
    this._jumpWasDown    = false;
    this.wallPieces      = [];
    this.hurdlePieces    = [];

    super.create();
    this.createLevelTextures();

    const w = this.scale.width;
    const h = this.scale.height;

    this.physics.world.gravity.y = 700;
    this.physics.world.setBounds(0, 0, w, h);

    // Player
    this.player = this.physics.add.sprite(150, h / 2, 'tex_player_copter');
    this.player.setCollideWorldBounds(false);
    this.player.setDepth(10);
    this.player.body.setSize(34, 18);
    this.player.setMaxVelocity(0, 320);
    this.player.setAlpha(1);

    // Solid floor and ceiling barriers (invisible static bodies)
    this.floorBarrier   = this.physics.add.staticImage(w / 2, h - 2, '__DEFAULT').setDisplaySize(w, 4).setAlpha(0);
    this.ceilingBarrier = this.physics.add.staticImage(w / 2, 54,    '__DEFAULT').setDisplaySize(w, 4).setAlpha(0);
    this.floorBarrier.refreshBody();
    this.ceilingBarrier.refreshBody();

    this.physics.add.collider(this.player, this.floorBarrier,   () => this.die());
    this.physics.add.collider(this.player, this.ceilingBarrier, () => this.die());

    // Background
    this.bg = this.add.tileSprite(0, 0, w, h, 'tex_bg_tech').setOrigin(0).setScrollFactor(0);
    this.bg.setDepth(-10);

    this.generateInitialWalls();
    this.generateInitialHurdles();

    this.game.events.emit('level:changed', {
      levelNumber: 3,
      objective: 'SURVIVE THE TUNNEL',
      totalLevels: 50,
    });

    this.progressBarBg = this.add.rectangle(w / 2, 25, 300, 10, 0x1b2450).setScrollFactor(0).setDepth(1000);
    this.progressBar   = this.add.rectangle(w / 2 - 150, 25, 0, 10, 0x8bd450)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(1001);

    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.upKey    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.wKey     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
  }

  createLevelTextures() {
    ['tex_player_copter','tex_wall_block','tex_hurdle','tex_bg_tech']
      .forEach(k => { if (this.textures.exists(k)) this.textures.remove(k); });

    const g = this.add.graphics();

    // Chopper
    g.clear();
    g.fillStyle(0x4b5320, 1);
    g.beginPath();
    g.moveTo(0, 10); g.lineTo(40, 10); g.lineTo(50, 20); g.lineTo(45, 30); g.lineTo(0, 30);
    g.closePath(); g.fill();
    g.fillStyle(0x2d3319, 1); g.fillRect(10, 12, 10, 8); g.fillRect(30, 18, 8, 6);
    g.fillStyle(0xadd8e6, 0.8);
    g.beginPath(); g.moveTo(35, 12); g.lineTo(45, 15); g.lineTo(42, 25); g.lineTo(35, 25);
    g.closePath(); g.fill();
    g.fillStyle(0x4b5320, 1); g.fillRect(-20, 18, 20, 4);
    g.fillStyle(0x4b5320, 1); g.fillTriangle(-20, 10, -20, 25, -28, 15);
    g.fillStyle(0x1a1a1a, 1); g.fillRect(15, 6, 4, 4);
    g.fillStyle(0x1a1a1a, 1); g.fillRect(-10, 4, 60, 2);
    g.generateTexture('tex_player_copter', 80, 40);

    // Wall block tile
    g.clear();
    g.fillStyle(0x222222, 1);
    g.fillRect(0, 0, 40, 40);
    g.lineStyle(1, 0x4b5320, 1);
    g.strokeRect(0, 0, 40, 40);
    g.generateTexture('tex_wall_block', 40, 40);

    // Hurdle bar tile
    g.clear();
    g.fillStyle(0xff4400, 1);
    g.fillRect(0, 0, 24, 128);
    g.lineStyle(2, 0xff8866, 1);
    g.strokeRect(0, 0, 24, 128);
    g.generateTexture('tex_hurdle', 24, 128);

    // Background grid
    g.clear();
    g.fillStyle(0x050810, 1); g.fillRect(0, 0, 128, 128);
    g.lineStyle(1, 0x1b2450, 0.4);
    for (let i = 0; i < 128; i += 32) { g.lineBetween(i, 0, i, 128); g.lineBetween(0, i, 128, i); }
    g.generateTexture('tex_bg_tech', 128, 128);
    g.destroy();
  }

  makeWallImage(x, y, w, h, texture) {
    const img = this.add.image(x, y, texture).setOrigin(0, 0).setDepth(5);
    img.setDisplaySize(w, h);
    return img;
  }

  generateInitialWalls() {
    const w = this.scale.width;
    for (let x = 0; x < w + 80; x += 40) { this.spawnWallAt(x); }
  }

  spawnWallAt(x) {
    const h        = this.scale.height;
    const topLimit = 52;
    const progress = Math.min(this.distance / this.targetDistance, 1);

    const currentGap = 360 - (140 * progress);
    const halfGap    = currentGap / 2;
    const rawCenter  = 270 + Math.sin((this.distance + x) * 0.002) * 85 * progress;
    const centerY    = Phaser.Math.Clamp(rawCenter, topLimit + halfGap + 30, h - halfGap - 30);

    const topH  = Math.max(4, centerY - halfGap - topLimit);
    const botY  = centerY + halfGap;
    const botH  = Math.max(4, h - botY);

    const ceilImg  = this.makeWallImage(x, topLimit, 40, topH, 'tex_wall_block');
    const floorImg = this.makeWallImage(x, botY,     40, botH, 'tex_wall_block');

    this.wallPieces.push({ x, topY: topLimit, topH, botY, botH, ceilImg, floorImg });
  }

  generateInitialHurdles() {
    for (let i = 0; i < 6; i++) {
      this.spawnHurdleAt(this.firstHurdleX + i * this.hurdleSpacing);
    }
  }

  spawnHurdleAt(x) {
    const h        = this.scale.height;
    const topLimit = 52;
    const flyZone  = h - topLimit;
    const maxBarH  = Math.floor(flyZone * 0.25);
    const gapSize  = flyZone - 2 * maxBarH;

    const mid       = topLimit + flyZone / 2;
    const jitter    = flyZone * 0.15;
    const gapCenter = mid + (Math.random() * 2 - 1) * jitter;

    const topH = Math.round(gapCenter - gapSize / 2 - topLimit);
    const botY = gapCenter + gapSize / 2;
    const botH = Math.round(h - botY);

    const hasTop = topH > 0 && topH <= maxBarH;
    const hasBot = botH > 0 && botH <= maxBarH;

    const topImg = hasTop ? this.makeWallImage(x, topLimit, 24, topH, 'tex_hurdle') : null;
    const botImg = hasBot ? this.makeWallImage(x, botY,     24, botH, 'tex_hurdle') : null;

    this.hurdlePieces.push({
      x,
      topY: topLimit, topH: hasTop ? topH : 0,
      botY, botH: hasBot ? botH : 0,
      topImg, botImg,
    });
  }

  checkCollisions() {
    if (this.failGuard || this.isLevelComplete) return;

    const pw = 34, ph = 18;
    const px = this.player.x - pw / 2;
    const py = this.player.y - ph / 2;

    const hits = (rx, ry, rw, rh) =>
      px < rx + rw && px + pw > rx &&
      py < ry + rh && py + ph > ry;

    for (const p of this.wallPieces) {
      if (p.topH > 0 && hits(p.x, p.topY, 40, p.topH)) { this.die(); return; }
      if (p.botH > 0 && hits(p.x, p.botY, 40, p.botH)) { this.die(); return; }
    }

    for (const p of this.hurdlePieces) {
      if (p.topH > 0 && hits(p.x, p.topY, 24, p.topH)) { this.die(); return; }
      if (p.botH > 0 && hits(p.x, p.botY, 24, p.botH)) { this.die(); return; }
    }
  }

  die() {
    if (this.failGuard || this.isLevelComplete) return;
    this.failGuard = true;
    this.cameras.main.flash(80, 255, 0, 0);
    this.time.delayedCall(1, () => this.scene.restart());
  }

  update(_t, dt) {
    if (this.isPaused || this.isLevelComplete || this.introLock) return;

    const touchInput = this.game.registry.get('touchInput') || {};
    const isJumpDown = this.spaceKey.isDown || this.upKey.isDown || this.wKey.isDown
      || touchInput.jump === true || this.input.activePointer.isDown;

    if (isJumpDown && !this._jumpWasDown) {
      this.player.body.setVelocityY(-320);
    }
    this._jumpWasDown = isJumpDown;

    const moveAmount = this.scrollSpeed * (dt / 1000);
    if (isNaN(moveAmount) || moveAmount <= 0) return;

    this.distance      += moveAmount;
    this.bg.tilePositionX += moveAmount * 0.5;

    // Scroll + recycle walls
    this.wallPieces.forEach(p => {
      p.x -= moveAmount;
      p.ceilImg.setX(p.x);
      p.floorImg.setX(p.x);
    });
    while (this.wallPieces.length > 0 && this.wallPieces[0].x < -40) {
      const old = this.wallPieces.shift();
      old.ceilImg.destroy();
      old.floorImg.destroy();
      const last = this.wallPieces[this.wallPieces.length - 1];
      if (last) this.spawnWallAt(last.x + 40);
    }

    // Scroll + recycle hurdles
    this.hurdlePieces.forEach(p => {
      p.x -= moveAmount;
      if (p.topImg) p.topImg.setX(p.x);
      if (p.botImg) p.botImg.setX(p.x);
    });
    while (this.hurdlePieces.length > 0 && this.hurdlePieces[0].x < -30) {
      const old = this.hurdlePieces.shift();
      if (old.topImg) old.topImg.destroy();
      if (old.botImg) old.botImg.destroy();
      const last = this.hurdlePieces[this.hurdlePieces.length - 1];
      if (last) this.spawnHurdleAt(last.x + this.hurdleSpacing);
    }

    // Manual AABB collision for tunnel walls and hurdles
    this.checkCollisions();

    // Progress bar
    this.progressBar.width = 300 * Math.min(this.distance / this.targetDistance, 1);

    // Level complete
    if (this.distance >= this.targetDistance && !this.isLevelComplete) {
      this.isLevelComplete = true;
      this.cameras.main.flash(500, 255, 255, 255);
      setTimeout(() => {
        window.location.assign(window.location.origin + window.location.pathname + '?level=4&from=level3');
      }, 500);
    }
  }
}
