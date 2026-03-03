import LevelBase from './LevelBase.js';

export default class Level6 extends LevelBase {
  constructor() {
    super('Level6');
    this.player = null;
    this.enemies = null;
    this.bullets = null;
    this.spawnTimer = null;
    this.survivalTime = 30;
    this.spawnRate = 1500;
    this.playerSpeed = 250;
    this.enemySpeed = 100;
    this.bulletSpeed = 500;
    this.lastFireTime = 0;
    this.fireRate = 250;
    this.isLevelComplete = false;
    this.isGameOver = false;
    this._ammo = 5;
    this._maxAmmo = 5;
    this._recharging = false;
    this._rechargeEnd = 0;
    this._ammoText = null;
    this._jumpWasDown = false;
    this._burstActive = false;
    this._hitCount = 0;
    this._invincible = false;
  }

  create() {
    super.create();

    this.isLevelComplete = false;
    this.isGameOver      = false;
    this._hitCount       = 0;
    this._invincible     = false;
    this._ammo           = 5;
    this._recharging     = false;
    this._jumpWasDown    = false;
    this._burstActive    = false;
    this.survivalTime    = 30;

    this.createLevelTextures();

    const w = this.scale.width;
    const h = this.scale.height;

    this.add.tileSprite(0, 52, w, h - 52, 'tex_arena_floor').setOrigin(0).setDepth(-1);

    this.player = this.physics.add.sprite(w / 2, h / 2, 'tex_survivor');
    this.player.setCollideWorldBounds(true);
    this.player.setCircle(12);
    this.player.body.setAllowGravity(false);

    this.enemies      = this.physics.add.group();
    this.enemyBullets = this.physics.add.group();
    this.bullets      = this.physics.add.group();
    this.powerupGroup = this.physics.add.group();

    this.txtTimer = this.add.text(w / 2, 80, `SURVIVE: ${this.survivalTime}s`, {
      fontSize: '32px', color: '#ffffff', fontWeight: 'bold', stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5);

    this._healthText = this.add.text(14, h - 55, '❤️❤️', {
      fontSize: '18px'
    }).setOrigin(0, 0.5).setDepth(20);

    this.add.text(w / 2, h - 30, 'KEEP MOVING - DODGE THE RED ORBS!', {
      fontSize: '20px', color: '#ff4444', fontStyle: 'italic', fontWeight: 'bold'
    }).setOrigin(0.5);

    this.physics.add.overlap(this.player, this.enemies,      this.handlePlayerHit,  null, this);
    this.physics.add.overlap(this.player, this.enemyBullets, this.handlePlayerHit,  null, this);
    this.physics.add.overlap(this.bullets, this.enemies,     this.handleEnemyHit,   null, this);
    this.physics.add.overlap(this.player, this.powerupGroup, this.handlePowerupPick, null, this);

    this._burstActive = false;
    this.time.addEvent({ delay: 8000, loop: true, callback: this.spawnBurstPowerup, callbackScope: this });

    this.spawnEvent = this.time.addEvent({
      delay: this.spawnRate, callback: this.spawnEnemy, callbackScope: this, loop: true
    });

    this.time.addEvent({
      delay: 1000,
      callback: () => {
        if (this.isPaused || this.isLevelComplete || this.isGameOver) return;
        this.survivalTime--;
        this.txtTimer.setText(`SURVIVE: ${this.survivalTime}s`);
        if (this.survivalTime % 5 === 0 && this.spawnEvent.delay > 400) {
          this.spawnEvent.delay -= 100;
        }
        if (this.survivalTime <= 0) this.winLevel6();
      },
      loop: true
    });

    this.game.events.emit('level:changed', {
      levelNumber: 6,
      objective: 'Keep Moving: Survival',
      totalLevels: 50
    });

    this._ammo = 5;
    this._recharging = false;
    this._ammoText = this.add.text(w - 20, h - 30, '🔴🔴🔴🔴🔴', {
      fontSize: '18px'
    }).setOrigin(1, 1).setDepth(200);

    // ── Joystick + FIRE button ────────────────────────────────────────────
    this._joyDx = 0; this._joyDy = 0; this._joyActive = false;
    this._setupJoystick('FIRE');
  }

  _setupJoystick(actionLabel) {
    const controls = document.getElementById('controls');
    const btnLeft  = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    const btnJump  = document.getElementById('btn-jump');
    if (!controls || !btnJump) return;

    // Hide arrow buttons — keep them in DOM so other levels can still find them
    if (btnLeft)  btnLeft.style.display  = 'none';
    if (btnRight) btnRight.style.display = 'none';

    // Rename action button
    btnJump.textContent    = actionLabel;
    btnJump.style.fontSize = '18px';

    // Controls bar: flex row, joystick left, action button right
    controls.style.display             = 'flex';
    controls.style.flexDirection       = 'row';
    controls.style.alignItems          = 'center';
    controls.style.justifyContent      = 'space-around';
    controls.style.padding             = '6px 16px';
    controls.style.gap                 = '16px';
    controls.style.gridTemplateColumns = '';
    controls.style.gridTemplateRows    = '';

    // Remove any stale joystick canvas from a previous scene
    document.getElementById('joy-canvas')?.remove();

    // Build joystick canvas — sized to fit controls bar height
    const ctrlH   = controls.getBoundingClientRect().height || 160;
    const joySize = Math.max(80, Math.min(ctrlH - 12, 140));
    const canvas  = document.createElement('canvas');
    canvas.id     = 'joy-canvas';
    canvas.width  = joySize;
    canvas.height = joySize;
    canvas.style.cssText = [
      'touch-action:none',
      'user-select:none',
      '-webkit-user-select:none',
      'border-radius:50%',
      'background:rgba(255,255,255,0.05)',
      'border:2px solid rgba(255,255,255,0.18)',
      'flex-shrink:0',
      'display:block',
    ].join(';');

    // Insert canvas before the action button (which stays in DOM)
    controls.insertBefore(canvas, btnJump);

    // Size action button to match joystick
    const btnH = Math.round(joySize * 0.55);
    btnJump.style.width      = btnH + 'px';
    btnJump.style.height     = btnH + 'px';
    btnJump.style.maxHeight  = btnH + 'px';
    btnJump.style.flexShrink = '0';
    btnJump.style.display    = 'flex';
    btnJump.style.alignItems = 'center';
    btnJump.style.justifyContent = 'center';

    // Draw joystick
    const ctx   = canvas.getContext('2d');
    const cx    = joySize / 2, cy = joySize / 2;
    const baseR = joySize / 2 - 4;
    const knobR = Math.round(joySize / 5);
    let kx = cx, ky = cy;

    const draw = () => {
      ctx.clearRect(0, 0, joySize, joySize);
      // Outer ring
      ctx.beginPath(); ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(120,190,255,0.4)'; ctx.lineWidth = 2; ctx.stroke();
      // Guide cross
      ctx.strokeStyle = 'rgba(120,190,255,0.15)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx, cy - baseR); ctx.lineTo(cx, cy + baseR); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - baseR, cy); ctx.lineTo(cx + baseR, cy); ctx.stroke();
      // Knob
      ctx.beginPath(); ctx.arc(kx, ky, knobR, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(120,190,255,0.8)'; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    };
    draw();

    // Touch / mouse tracking
    let activeId = null, ox = 0, oy = 0;

    const startJoy = (px, py, touchId) => {
      activeId = touchId ?? null;
      ox = px; oy = py; kx = px; ky = py;
      this._joyActive = true;
      draw();
    };
    const moveJoy = (px, py, touchId) => {
      if (!this._joyActive) return;
      if (activeId !== null && touchId !== activeId) return;
      const dx = px - ox, dy = py - oy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const clamped = Math.min(dist, baseR);
      const angle = Math.atan2(dy, dx);
      kx = ox + Math.cos(angle) * clamped;
      ky = oy + Math.sin(angle) * clamped;
      this._joyDx = (clamped / baseR) * Math.cos(angle);
      this._joyDy = (clamped / baseR) * Math.sin(angle);
      draw();
    };
    const endJoy = () => {
      activeId = null;
      this._joyActive = false;
      this._joyDx = 0; this._joyDy = 0;
      kx = cx; ky = cy;
      draw();
    };

    const canvasRect = () => canvas.getBoundingClientRect();
    canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      const t = e.changedTouches[0];
      const r = canvasRect();
      startJoy(t.clientX - r.left, t.clientY - r.top, t.identifier);
    }, { passive: false });
    canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier === activeId) {
          const r = canvasRect();
          moveJoy(t.clientX - r.left, t.clientY - r.top, t.identifier);
        }
      }
    }, { passive: false });
    canvas.addEventListener('touchend',    e => { e.preventDefault(); endJoy(); }, { passive: false });
    canvas.addEventListener('touchcancel', e => { e.preventDefault(); endJoy(); }, { passive: false });
    canvas.addEventListener('mousedown', e => { e.preventDefault(); const r = canvasRect(); startJoy(e.clientX - r.left, e.clientY - r.top, 'mouse'); }, { passive: false });
    canvas.addEventListener('mousemove', e => { if (e.buttons & 1) { const r = canvasRect(); moveJoy(e.clientX - r.left, e.clientY - r.top, 'mouse'); } }, { passive: false });
    canvas.addEventListener('mouseup',    e => { e.preventDefault(); endJoy(); }, { passive: false });
    canvas.addEventListener('mouseleave', e => { e.preventDefault(); endJoy(); }, { passive: false });

    // Restore on scene shutdown
    this.events.once('shutdown', () => {
      document.getElementById('joy-canvas')?.remove();
      if (btnLeft)  { btnLeft.style.display  = ''; }
      if (btnRight) { btnRight.style.display = ''; }
      btnJump.textContent      = 'JUMP';
      btnJump.style.fontSize   = '';
      btnJump.style.width      = '';
      btnJump.style.height     = '';
      btnJump.style.maxHeight  = '';
      btnJump.style.flexShrink = '';
      btnJump.style.display    = '';
      btnJump.style.alignItems = '';
      btnJump.style.justifyContent = '';
      controls.style.display        = 'flex';
      controls.style.flexDirection  = 'row';
      controls.style.alignItems     = '';
      controls.style.justifyContent = '';
      controls.style.padding        = '';
      controls.style.gap            = '12px';
      window.__resetMoveButton?.();
    });
  }

  createLevelTextures() {
    const g = this.add.graphics();

    g.clear();
    g.fillStyle(0x333333, 1);
    g.fillRect(0, 0, 64, 64);
    g.lineStyle(2, 0x444444, 1);
    g.strokeRect(0, 0, 64, 64);
    g.generateTexture('tex_arena_floor', 64, 64);

    g.clear();
    g.fillStyle(0x3498db, 1);
    g.fillRect(0, 0, 30, 30);
    g.fillStyle(0xffccaa, 1);
    g.fillRect(5, 5, 20, 20);
    g.fillStyle(0x000000, 1);
    g.fillRect(25, 12, 10, 6);
    g.generateTexture('tex_survivor', 35, 30);

    g.clear();
    g.fillStyle(0x2ecc71, 1);
    g.fillRect(0, 0, 30, 30);
    g.fillStyle(0x1b5e20, 1);
    g.fillRect(5, 5, 20, 20);
    g.generateTexture('tex_zombie', 30, 30);

    g.clear();
    g.fillStyle(0xe74c3c, 1);
    g.fillRect(0, 0, 30, 30);
    g.fillStyle(0x000000, 1);
    g.fillRect(25, 12, 10, 6);
    g.generateTexture('tex_shooter', 35, 30);

    g.clear();
    g.fillStyle(0xff0000, 1);
    g.fillCircle(5, 5, 5);
    g.generateTexture('tex_bullet_red', 10, 10);

    g.clear();
    g.fillStyle(0xffff00, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('tex_bullet', 8, 8);

    g.clear();
    g.fillStyle(0x00eeff, 1);
    g.fillCircle(12, 12, 12);
    g.fillStyle(0xffffff, 0.8);
    g.fillTriangle(12, 2, 14, 10, 10, 10);
    g.fillTriangle(12, 22, 14, 14, 10, 14);
    g.fillTriangle(2, 12, 10, 10, 10, 14);
    g.fillTriangle(22, 12, 14, 10, 14, 14);
    g.generateTexture('tex_burst_pu', 24, 24);

    g.destroy();
  }

  spawnEnemy() {
    if (this.isPaused || this.isLevelComplete || this.isGameOver) return;
    const w = this.scale.width;
    const h = this.scale.height;
    let x, y;
    const side = Phaser.Math.Between(0, 3);
    if (side === 0)      { x = Phaser.Math.Between(0, w); y = 60; }
    else if (side === 1) { x = w; y = Phaser.Math.Between(60, h); }
    else if (side === 2) { x = Phaser.Math.Between(0, w); y = h; }
    else                 { x = 0; y = Phaser.Math.Between(60, h); }

    const isShooter = (this.survivalTime < 25 && Phaser.Math.Between(0, 10) > 7);
    const type = isShooter ? 'tex_shooter' : 'tex_zombie';
    const enemy = this.enemies.create(x, y, type);
    enemy.setData('isShooter', isShooter);
    enemy.setData('lastShot', 0);
    enemy.setCircle(12);
    enemy.body.allowGravity = false;
  }

  enemyShoot(enemy) {
    if (!enemy.active || this.isGameOver) return;
    const now = this.time.now;
    if (now < enemy.getData('lastShot') + 2000) return;
    enemy.setData('lastShot', now);
    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
    const bullet = this.enemyBullets.create(enemy.x, enemy.y, 'tex_bullet_red');
    bullet.body.allowGravity = false;
    this.physics.velocityFromRotation(angle, 200, bullet.body.velocity);
    this.time.delayedCall(3000, () => { if (bullet.active) bullet.destroy(); });
  }

  shoot() {
    if (this.isPaused || this.isGameOver || this.isLevelComplete) return;
    const now = this.time.now;
    if (now < this.lastFireTime + this.fireRate) return;
    this.lastFireTime = now;

    let angle;
    let nearest = null, nearestDist = Infinity;
    this.enemies.getChildren().forEach(e => {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
      if (d < nearestDist) { nearestDist = d; nearest = e; }
    });
    if (nearest) {
      angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, nearest.x, nearest.y);
    } else {
      angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, this.input.activePointer.worldX, this.input.activePointer.worldY);
    }

    const bullet = this.bullets.create(this.player.x, this.player.y, 'tex_bullet');
    bullet.body.allowGravity = false;
    this.physics.velocityFromRotation(angle, this.bulletSpeed, bullet.body.velocity);
    this.time.delayedCall(2000, () => { if (bullet.active) bullet.destroy(); });
  }

  spawnBurstPowerup() {
    if (this.isGameOver || this.isLevelComplete) return;
    const w = this.scale.width;
    const h = this.scale.height;
    const x = Phaser.Math.Between(40, w - 40);
    const y = Phaser.Math.Between(120, h - 120);
    const pu = this.powerupGroup.create(x, y, 'tex_burst_pu');
    pu.body.allowGravity = false;
    pu.setDepth(20);
    this.tweens.add({ targets: pu, scale: 1.3, duration: 400, yoyo: true, repeat: -1 });
    this.time.delayedCall(5000, () => { if (pu.active) pu.destroy(); });
  }

  handlePowerupPick(player, pu) {
    if (!pu.active) return;
    pu.destroy();
    this.cameras.main.flash(150, 0, 238, 255, true);
    const sorted = this.enemies.getChildren()
      .filter(e => e.active)
      .map(e => ({ e, d: Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y) }))
      .sort((a, b) => a.d - b.d).slice(0, 3);
    sorted.forEach(({ e }, i) => {
      this.time.delayedCall(i * 80, () => {
        if (!e.active || this.isGameOver) return;
        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, e.x, e.y);
        const b = this.bullets.create(this.player.x, this.player.y, 'tex_bullet');
        b.body.allowGravity = false;
        this.physics.velocityFromRotation(angle, this.bulletSpeed, b.body.velocity);
        this.time.delayedCall(2000, () => { if (b.active) b.destroy(); });
      });
    });
    if (this._ammoText) this._ammoText.setText('⚡ BURST!').setStyle({ color: '#00eeff', fontSize: '18px' });
  }

  handleEnemyHit(bullet, enemy) {
    bullet.destroy();
    enemy.destroy();
    this.cameras.main.flash(50, 255, 255, 255, true);
  }

  handlePlayerHit() {
    if (this.isGameOver || this.isLevelComplete || this._invincible) return;
    this._hitCount++;

    if (this._hitCount === 1) {
      this._invincible = true;
      if (this._healthText) this._healthText.setText('❤️');
      this.cameras.main.shake(200, 0.01);
      this.player.setTint(0xff6600);
      this.tweens.add({
        targets: this.player,
        alpha: { from: 0.2, to: 1 },
        duration: 120, yoyo: true, repeat: 7,
        onComplete: () => { this.player.setAlpha(1); this.player.clearTint(); }
      });
      this.time.delayedCall(2000, () => { this._invincible = false; });
    } else {
      this.isGameOver = true;
      if (this._healthText) this._healthText.setText('💀');
      this.cameras.main.shake(500, 0.02);
      this.player.setTint(0xff0000);
      const w = this.scale.width, h = this.scale.height;
      this.add.text(w/2, h/2 - 40, 'DESTROYED!', {
        fontSize: '56px', color: '#ff0000', fontWeight: 'bold', stroke: '#000', strokeThickness: 4
      }).setOrigin(0.5).setDepth(1000);
      this.time.delayedCall(1500, () => { window.location.reload(); });
    }
  }

  winLevel6() {
    if (this.isLevelComplete) return;
    this.isLevelComplete = true;
    this.enemies.clear(true, true);
    this.cameras.main.flash(500, 255, 255, 255);
    this.add.text(this.scale.width/2, this.scale.height/2, 'SURVIVED!', {
      fontSize: '64px', color: '#8bd450', fontWeight: 'bold'
    }).setOrigin(0.5);
    this.time.delayedCall(1500, () => {
      window.location.assign(window.location.origin + window.location.pathname + '?level=7');
    });
  }

  update() {
    if (this.isPaused || this.isGameOver || this.isLevelComplete) return;

    const touch = this.game.registry.get('touchInput') || {};
    const jump  = !!(touch.jump);

    // Joystick movement — analog, 360°
    if (this._joyActive) {
      this.player.setVelocityX(this._joyDx * this.playerSpeed);
      this.player.setVelocityY(this._joyDy * this.playerSpeed);
    } else {
      this.player.setVelocity(0);
    }

    const now = this.time.now;
    if (jump && this._ammo > 0 && !this._jumpWasDown) {
      this._ammo--;
      this.shoot();
      if (this._ammo === 0 && !this._recharging) {
        this._recharging = true;
        this._rechargeEnd = now + 1500;
        this.time.delayedCall(1500, () => {
          this._ammo = this._maxAmmo;
          this._recharging = false;
        });
      }
    }
    this._jumpWasDown = jump;

    if (this._ammoText) {
      if (this._recharging) {
        const secs = Math.ceil((this._rechargeEnd - now) / 1000);
        this._ammoText.setText(`reload ${secs}s`).setStyle({ color: '#ff6644', fontSize: '16px' });
      } else {
        this._ammoText.setText('🔴'.repeat(this._ammo) + '⚫'.repeat(this._maxAmmo - this._ammo)).setStyle({ fontSize: '18px' });
      }
    }

    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, this.input.activePointer.worldX, this.input.activePointer.worldY);
    this.player.setRotation(angle);

    this.enemies.getChildren().forEach(enemy => {
      const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);
      if (enemy.getData('isShooter')) {
        if (dist > 250) this.physics.moveToObject(enemy, this.player, this.enemySpeed);
        else enemy.body.setVelocity(0);
        this.enemyShoot(enemy);
      } else {
        this.physics.moveToObject(enemy, this.player, this.enemySpeed);
      }
      enemy.setRotation(Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y));
    });
  }
}
