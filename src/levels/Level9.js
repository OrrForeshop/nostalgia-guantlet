import LevelBase from './LevelBase.js';

export default class Level9 extends LevelBase {
  constructor() {
    super('Level9');
    this.player     = null;
    this.hazards    = null;
    this.isGameOver = false;
  }

  create() {
    super.create();

    // ── Per-run state ────────────────────────────────────────────────────
    this.isGameOver         = false;
    this._isDead            = false;
    this._survivalTime      = 20;
    this._hitCount          = 0;
    this._invincible        = false;
    this._shieldActive      = false;
    this._shieldReady       = true;
    this._shieldCooldownEnd = 0;
    this._jumpWasDown       = false;

    // Joystick state
    this._joyActive = false;
    this._joyDx    = 0;  // -1..1
    this._joyDy    = 0;  // -1..1

    this.createTextures();

    const w = this.scale.width;
    const h = this.scale.height;

    // Arena bounds (walls player cannot pass through)
    const pad = 32;
    this._arenaL = pad;
    this._arenaR = w - pad;
    this._arenaT = 60;
    this._arenaB = h - 90;

    // Arena background
    this.add.rectangle(
      w/2, (this._arenaT + this._arenaB)/2,
      this._arenaR - this._arenaL,
      this._arenaB - this._arenaT,
      0x1a1a2e
    ).setStrokeStyle(4, 0x3498db);

    // Player
    this.player = this.physics.add.sprite(w/2, (this._arenaT + this._arenaB)/2, 'tex_player_survival_v2');
    this.player.body.setAllowGravity(false);
    // Use world bounds as arena walls so balls bounce correctly
    this.physics.world.setBounds(this._arenaL, this._arenaT, this._arenaR - this._arenaL, this._arenaB - this._arenaT);
    this.player.setCollideWorldBounds(true);

    // Shield ring visual
    this._shieldRing = this.add.circle(w/2, h/2, 22, 0x00ccff, 0.3)
      .setStrokeStyle(3, 0x00ccff).setVisible(false).setDepth(9);

    // Hazards — bounce off world bounds
    this.hazards = this.physics.add.group();
    this.createHazards(8);

    // Countdown timer (big transparent center)
    this._timerText = this.add.text(w/2, (this._arenaT + this._arenaB)/2, '20', {
      fontSize: '110px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0.07).setDepth(1);

    // Health
    this._healthText = this.add.text(this._arenaL + 4, this._arenaB + 18, '❤️❤️', {
      fontSize: '18px'
    }).setOrigin(0, 0.5).setDepth(20);

    // Shield HUD
    this._shieldText = this.add.text(this._arenaR - 4, this._arenaB + 18, 'SHIELD ✓', {
      fontSize: '15px', color: '#00ccff', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 3
    }).setOrigin(1, 0.5).setDepth(20);

    this.game.events.emit('level:changed', {
      levelNumber: 9,
      objective: 'Survival: 20 Seconds',
      totalLevels: 50
    });

    // ── Build controls: joystick (left) + SHIELD button (right) ─────────
    this._buildControls();
  }

  // ── Controls: replace arrow buttons with a joystick ──────────────────────
  _buildControls() {
    const controls = document.getElementById('controls');
    const btnLeft  = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    const btnJump  = document.getElementById('btn-jump');
    if (!controls || !btnJump) return;

    // Hide original buttons (don't remove — keeps DOM intact)
    if (btnLeft)  btnLeft.style.display  = 'none';
    if (btnRight) btnRight.style.display = 'none';

    // SHIELD button
    btnJump.textContent    = 'SHIELD';
    btnJump.style.fontSize = '14px';
    btnJump.style.display  = 'flex';

    document.getElementById('joy-canvas')?.remove();

    controls.style.display        = 'flex';
    controls.style.flexDirection  = 'row';
    controls.style.alignItems     = 'center';
    controls.style.justifyContent = 'space-around';
    controls.style.padding        = '6px 12px';
    controls.style.gap            = '12px';
    controls.style.gridTemplateColumns = '';
    controls.style.gridTemplateRows    = '';

    // Joystick canvas — insert before btnJump
    const ctrlRect = controls.getBoundingClientRect();
    const joySize  = Math.max(80, Math.min((ctrlRect.height || 160) - 12, 140));
    const canvas   = document.createElement('canvas');
    canvas.id     = 'joy-canvas';
    canvas.width  = joySize;
    canvas.height = joySize;
    canvas.style.touchAction  = 'none';
    canvas.style.userSelect   = 'none';
    canvas.style.borderRadius = '50%';
    canvas.style.background   = 'rgba(255,255,255,0.04)';
    canvas.style.border       = '2px solid rgba(255,255,255,0.15)';
    canvas.style.flexShrink   = '0';
    controls.insertBefore(canvas, btnJump);

    // SHIELD btn sizing
    const btnH = Math.min(joySize * 0.55, 80);
    btnJump.style.width      = btnH + 'px';
    btnJump.style.height     = btnH + 'px';
    btnJump.style.maxHeight  = btnH + 'px';
    btnJump.style.flexShrink = '0';

    // Draw joystick
    const ctx     = canvas.getContext('2d');
    const cx      = joySize / 2;
    const cy      = joySize / 2;
    const baseR   = joySize / 2 - 6;
    const thumbR  = joySize / 6;
    let thumbX    = cx;
    let thumbY    = cy;

    const drawJoy = () => {
      ctx.clearRect(0, 0, joySize, joySize);
      // Base ring
      ctx.beginPath();
      ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(100,180,255,0.35)';
      ctx.lineWidth   = 2;
      ctx.stroke();
      // Crosshair guides
      ctx.strokeStyle = 'rgba(100,180,255,0.15)';
      ctx.lineWidth   = 1;
      ctx.beginPath(); ctx.moveTo(cx, cy - baseR); ctx.lineTo(cx, cy + baseR); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - baseR, cy); ctx.lineTo(cx + baseR, cy); ctx.stroke();
      // Thumb
      ctx.beginPath();
      ctx.arc(thumbX, thumbY, thumbR, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(100,180,255,0.75)';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth   = 1.5;
      ctx.stroke();
    };
    drawJoy();

    // Touch / mouse handlers
    let activeTouchId = null;
    let originX = 0, originY = 0;

    const getPos = (e, id) => {
      if (e.changedTouches) {
        for (const t of e.changedTouches) {
          if (t.identifier === id) {
            const r = canvas.getBoundingClientRect();
            return { x: t.clientX - r.left, y: t.clientY - r.top };
          }
        }
        return null;
      }
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const onStart = (e) => {
      e.preventDefault();
      const pos = e.changedTouches
        ? (() => { const t = e.changedTouches[0]; activeTouchId = t.identifier; const r = canvas.getBoundingClientRect(); return { x: t.clientX - r.left, y: t.clientY - r.top }; })()
        : getPos(e, null);
      this._joyActive = true;
      originX = pos.x; originY = pos.y;
      thumbX  = pos.x; thumbY  = pos.y;
      drawJoy();
    };

    const onMove = (e) => {
      e.preventDefault();
      if (!this._joyActive) return;
      const pos = getPos(e, activeTouchId);
      if (!pos) return;
      const dx   = pos.x - originX;
      const dy   = pos.y - originY;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const clamp = Math.min(dist, baseR);
      const angle = Math.atan2(dy, dx);
      thumbX = originX + Math.cos(angle) * clamp;
      thumbY = originY + Math.sin(angle) * clamp;
      this._joyDx = (clamp / baseR) * Math.cos(angle);
      this._joyDy = (clamp / baseR) * Math.sin(angle);
      drawJoy();
    };

    const onEnd = (e) => {
      e.preventDefault();
      this._joyActive = false;
      this._joyDx = 0;
      this._joyDy = 0;
      thumbX = cx; thumbY = cy;
      drawJoy();
    };

    canvas.addEventListener('touchstart',  onStart, { passive: false });
    canvas.addEventListener('touchmove',   onMove,  { passive: false });
    canvas.addEventListener('touchend',    onEnd,   { passive: false });
    canvas.addEventListener('touchcancel', onEnd,   { passive: false });
    canvas.addEventListener('mousedown',   onStart, { passive: false });
    canvas.addEventListener('mousemove',   (e) => { if (e.buttons) onMove(e); }, { passive: false });
    canvas.addEventListener('mouseup',     onEnd,   { passive: false });
    canvas.addEventListener('mouseleave',  onEnd,   { passive: false });

    // SHIELD button press
    const shieldPress   = e => { e.preventDefault(); const t = window._getTouch?.(); if (!t) return; t.jump = true;  window._commit?.(t); };
    const shieldRelease = e => { e.preventDefault(); const t = window._getTouch?.(); if (!t) return; t.jump = false; window._commit?.(t); };
    btnJump.addEventListener('touchstart',  shieldPress,   { passive: false });
    btnJump.addEventListener('touchend',    shieldRelease, { passive: false });
    btnJump.addEventListener('touchcancel', shieldRelease, { passive: false });
    btnJump.addEventListener('mousedown',   shieldPress,   { passive: false });
    btnJump.addEventListener('mouseup',     shieldRelease, { passive: false });
    btnJump.addEventListener('mouseleave',  shieldRelease, { passive: false });

    // Restore on exit
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
      controls.style.display        = 'flex';
      controls.style.flexDirection  = 'row';
      controls.style.alignItems     = '';
      controls.style.justifyContent = '';
      controls.style.padding        = '';
      controls.style.gap            = '12px';
      controls.style.gridTemplateColumns = '';
      controls.style.gridTemplateRows    = '';
      window.__resetMoveButton?.();
    });
  }

  createTextures() {
    ['tex_player_survival_v2', 'tex_hazard_v2'].forEach(k => {
      if (this.textures.exists(k)) this.textures.remove(k);
    });
    const g = this.add.graphics();

    g.clear();
    g.fillStyle(0xf1c40f, 1);
    g.fillRect(0, 0, 20, 20);
    g.generateTexture('tex_player_survival_v2', 20, 20);

    g.clear();
    g.fillStyle(0xe74c3c, 1);
    g.fillCircle(10, 10, 10);
    g.generateTexture('tex_hazard_v2', 20, 20);

    g.destroy();
  }

  createHazards(count) {
    const speeds = [180, -180, 240, -240];
    const aW = this._arenaR - this._arenaL;
    const aH = this._arenaB - this._arenaT;

    for (let i = 0; i < count; i++) {
      const x = this._arenaL + (i % 2 === 0 ? aW * 0.2 : aW * 0.8);
      const y = this._arenaT + Phaser.Math.Between(30, aH - 30);
      const hazard = this.hazards.create(x, y, 'tex_hazard_v2');
      hazard.setBounce(1);
      hazard.setCollideWorldBounds(true);
      hazard.body.setAllowGravity(false);
      hazard.setVelocity(
        speeds[Phaser.Math.Between(0, speeds.length - 1)],
        speeds[Phaser.Math.Between(0, speeds.length - 1)]
      );
    }
  }

  // ── Shield ───────────────────────────────────────────────────────────────
  activateShield() {
    if (!this._shieldReady || this._shieldActive) return;
    this._shieldActive = true;
    this._shieldReady  = false;
    this._invincible   = true;
    this._shieldRing.setVisible(true);
    this.time.delayedCall(2000, () => {
      this._shieldActive = false;
      this._invincible   = false;
      this._shieldRing.setVisible(false);
      this._shieldCooldownEnd = this.time.now + 3000;
      this.time.delayedCall(3000, () => { this._shieldReady = true; });
    });
  }

  // ── Hit system ───────────────────────────────────────────────────────────
  _triggerHit() {
    if (this._isDead || this._invincible) return;
    this._hitCount++;

    if (this._hitCount === 1) {
      this._invincible = true;
      this._healthText.setText('❤️');
      this.player.setTint(0xff8800);
      this.tweens.add({
        targets: this.player,
        alpha: { from: 0.2, to: 1 },
        duration: 120,
        yoyo: true,
        repeat: 7,
        onComplete: () => { this.player.setAlpha(1); this.player.clearTint(); }
      });
      this.time.delayedCall(2000, () => { this._invincible = false; });
    } else {
      this._triggerGameOver();
    }
  }

  _triggerGameOver() {
    if (this._isDead) return;
    this._isDead    = true;
    this.isGameOver = true;
    this._healthText.setText('💀');
    this.cameras.main.shake(500, 0.02);
    this.player.setTint(0xff0000);
    const w = this.scale.width;
    const h = this.scale.height;
    this.add.text(w/2, h/2 - 50, 'DESTROYED!', {
      fontSize: '52px', color: '#ff0000', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(30);
    this.add.text(w/2, h/2 + 20, 'Press SHIELD to retry', {
      fontSize: '20px', color: '#ffffff'
    }).setOrigin(0.5).setDepth(30);
  }

  handleWin() {
    if (this._isDead || this.isGameOver) return;
    this.isGameOver = true;
    const w = this.scale.width;
    const h = this.scale.height;
    this.add.text(w/2, h/2 - 40, 'SURVIVED!', {
      fontSize: '64px', color: '#8bd450', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(30);
    this.time.delayedCall(1500, () => {
      window.location.assign(window.location.origin + window.location.pathname + '?level=10');
    });
  }

  update(_t, dt) {
    if (this.isPaused) return;

    const touch    = this.game.registry.get('touchInput') || {};
    const jumpDown = !!(touch.jump);

    // SHIELD edge-detect
    if (jumpDown && !this._jumpWasDown) {
      if (this._isDead) {
        this.scene.restart();
        return;
      }
      this.activateShield();
    }
    this._jumpWasDown = jumpDown;

    if (this._isDead) return;

    // ── Joystick movement ─────────────────────────────────────────────────
    const speed = 270;
    if (this._joyActive) {
      this.player.setVelocityX(this._joyDx * speed);
      this.player.setVelocityY(this._joyDy * speed);
    } else {
      this.player.setVelocity(0);
    }

    // ── Hard-clamp player inside arena (wall collision) ───────────────────
    const pr = 10; // player half-size
    const px = Phaser.Math.Clamp(this.player.x, this._arenaL + pr, this._arenaR - pr);
    const py = Phaser.Math.Clamp(this.player.y, this._arenaT + pr, this._arenaB - pr);
    if (px !== this.player.x || py !== this.player.y) {
      this.player.setPosition(px, py);
      // Kill velocity on blocked axis
      if (px !== this.player.x) this.player.setVelocityX(0);
      if (py !== this.player.y) this.player.setVelocityY(0);
    }

    // ── Shield ring tracks player ─────────────────────────────────────────
    if (this._shieldRing) {
      this._shieldRing.setPosition(this.player.x, this.player.y);
    }

    // ── Manual collision: hazard circles vs player ────────────────────────
    if (!this._invincible) {
      const px2 = this.player.x;
      const py2 = this.player.y;
      for (const ball of this.hazards.getChildren()) {
        const dx = px2 - ball.x;
        const dy = py2 - ball.y;
        if (dx*dx + dy*dy < (pr + 10) * (pr + 10)) {
          this._triggerHit();
          break;
        }
      }
    }

    // ── Survival timer ────────────────────────────────────────────────────
    this._survivalTime -= dt / 1000;
    if (this._timerText) {
      this._timerText.setText(Math.ceil(Math.max(0, this._survivalTime)));
    }
    if (this._survivalTime <= 0) {
      this.handleWin();
    }

    // ── Shield HUD ────────────────────────────────────────────────────────
    if (this._shieldText) {
      if (this._shieldActive) {
        this._shieldText.setText('SHIELD 🛡️').setColor('#00ccff');
      } else if (!this._shieldReady) {
        const secs = Math.max(0, Math.ceil((this._shieldCooldownEnd - this.time.now) / 1000));
        this._shieldText.setText(`SHIELD ${secs}s`).setColor('#ffaa00');
      } else {
        this._shieldText.setText('SHIELD ✓').setColor('#00ccff');
      }
    }
  }
}
