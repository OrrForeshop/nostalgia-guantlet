import LevelBase from './LevelBase.js';

export default class Level7 extends LevelBase {
  constructor() {
    super('Level7');
    this.player      = null;
    this.hazards     = null;
    this.finishZone  = null;
    this.playerSpeed = 200;
    this.isLevelComplete = false;
    this.worldWidth  = 2400;
  }

  create() {
    super.create();

    this.isLevelComplete  = false;
    this._hitCount        = 0;
    this._invincible      = false;
    this._slowActive      = false;
    this._slowReady       = true;
    this._slowCooldownEnd = 0;
    this._jumpWasDown     = false;
    this._hazardData      = [];
    this._playerStarted   = false;

    // Clear stale touch state
    const _t = this.game?.registry?.get('touchInput');
    if (_t) {
      _t.left = false; _t.right = false; _t.up = false; _t.down = false;
      _t.jump = false; _t.jumpJustPressed = false;
      this.game.registry.set('touchInput', _t);
    }

    this.createLevelTextures();

    const w = this.scale.width;
    const h = this.scale.height;
    const gauntletTop    = 110;
    const gauntletBottom = h - 90;
    const centerY        = h / 2 + 26;

    this._gauntletTop    = gauntletTop;
    this._gauntletBottom = gauntletBottom;
    this._centerY        = centerY;

    this.physics.world.setBounds(0, gauntletTop, this.worldWidth, gauntletBottom - gauntletTop);
    this.cameras.main.setBounds(0, 0, this.worldWidth, h);

    this.add.tileSprite(0, 52, this.worldWidth, h - 52, 'tex_grid').setOrigin(0).setDepth(-1);
    this.add.rectangle(this.worldWidth / 2, gauntletTop - 5,   this.worldWidth, 10, 0x2f3c7a);
    this.add.rectangle(this.worldWidth / 2, gauntletBottom + 5, this.worldWidth, 10, 0x2f3c7a);

    const startZoneX = 60;
    this.add.rectangle(startZoneX, centerY, 120, gauntletBottom - gauntletTop, 0x8bd450, 0.3)
      .setStrokeStyle(2, 0x8bd450);
    this.add.text(startZoneX, gauntletBottom - 20, 'START', { fontSize: '14px', color: '#8bd450' }).setOrigin(0.5);

    const endZoneX  = this.worldWidth - 60;
    this.finishZone = this.add.rectangle(endZoneX, centerY, 120, gauntletBottom - gauntletTop, 0x3498db, 0.3)
      .setStrokeStyle(2, 0x3498db);
    this.add.text(endZoneX, gauntletBottom - 20, 'EXIT', { fontSize: '14px', color: '#3498db' }).setOrigin(0.5);
    this._finishX = endZoneX;
    this._finishW = 120;

    this.player = this.physics.add.sprite(startZoneX, centerY, 'tex_player_square');
    this.player.setCollideWorldBounds(true);
    this.player.body.setAllowGravity(false);
    this.player.body.reset(startZoneX, centerY);
    this.player.setVelocity(0, 0);
    this.player.body.moves = false;

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    this._hazardData = [];
    this.createEndlessHazards(gauntletTop, gauntletBottom);

    this.add.text(w / 2, h - 30, 'THE LONG GAUNTLET — DON\'T RUSH.', {
      fontSize: '18px', color: '#ffffff', fontStyle: 'italic'
    }).setOrigin(0.5).setScrollFactor(0).setAlpha(0.6);

    this._slowText = this.add.text(w - 12, h - 55, 'SLOW ✓', {
      fontSize: '16px', color: '#00ffcc', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3
    }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(20);

    this._healthText = this.add.text(12, h - 55, '❤️❤️', {
      fontSize: '18px'
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(20);

    this.game.events.emit('level:changed', {
      levelNumber: 7,
      objective: 'The Long Gap: Endurance',
      totalLevels: 50
    });

    // ── Joystick + SLOW button ────────────────────────────────────────────
    this._joyDx = 0; this._joyDy = 0; this._joyActive = false;
    this._setupJoystick('SLOW');
  }

  _setupJoystick(actionLabel) {
    const controls = document.getElementById('controls');
    const btnLeft  = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    const btnJump  = document.getElementById('btn-jump');
    if (!controls || !btnJump) return;

    if (btnLeft)  btnLeft.style.display  = 'none';
    if (btnRight) btnRight.style.display = 'none';

    btnJump.textContent    = actionLabel;
    btnJump.style.fontSize = '18px';

    controls.style.display             = 'flex';
    controls.style.flexDirection       = 'row';
    controls.style.alignItems          = 'center';
    controls.style.justifyContent      = 'space-around';
    controls.style.padding             = '6px 16px';
    controls.style.gap                 = '16px';
    controls.style.gridTemplateColumns = '';
    controls.style.gridTemplateRows    = '';

    document.getElementById('joy-canvas')?.remove();

    const ctrlH   = controls.getBoundingClientRect().height || 160;
    const joySize = Math.max(80, Math.min(ctrlH - 12, 140));
    const canvas  = document.createElement('canvas');
    canvas.id     = 'joy-canvas';
    canvas.width  = joySize;
    canvas.height = joySize;
    canvas.style.cssText = [
      'touch-action:none', 'user-select:none', '-webkit-user-select:none',
      'border-radius:50%', 'background:rgba(255,255,255,0.05)',
      'border:2px solid rgba(255,255,255,0.18)', 'flex-shrink:0', 'display:block',
    ].join(';');

    controls.insertBefore(canvas, btnJump);

    const btnH = Math.round(joySize * 0.55);
    btnJump.style.width          = btnH + 'px';
    btnJump.style.height         = btnH + 'px';
    btnJump.style.maxHeight      = btnH + 'px';
    btnJump.style.flexShrink     = '0';
    btnJump.style.display        = 'flex';
    btnJump.style.alignItems     = 'center';
    btnJump.style.justifyContent = 'center';

    const ctx   = canvas.getContext('2d');
    const cx    = joySize / 2, cy = joySize / 2;
    const baseR = joySize / 2 - 4;
    const knobR = Math.round(joySize / 5);
    let kx = cx, ky = cy;

    const draw = () => {
      ctx.clearRect(0, 0, joySize, joySize);
      ctx.beginPath(); ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(120,190,255,0.4)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = 'rgba(120,190,255,0.15)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx, cy - baseR); ctx.lineTo(cx, cy + baseR); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - baseR, cy); ctx.lineTo(cx + baseR, cy); ctx.stroke();
      ctx.beginPath(); ctx.arc(kx, ky, knobR, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(120,190,255,0.8)'; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    };
    draw();

    let activeId = null, ox = 0, oy = 0;
    const rect = () => canvas.getBoundingClientRect();

    const startJoy = (px, py, id) => {
      activeId = id ?? null; ox = px; oy = py; kx = px; ky = py;
      this._joyActive = true; draw();
    };
    const moveJoy = (px, py, id) => {
      if (!this._joyActive || (activeId !== null && id !== activeId)) return;
      const dx = px - ox, dy = py - oy;
      const dist = Math.sqrt(dx*dx + dy*dy), clamp = Math.min(dist, baseR), angle = Math.atan2(dy, dx);
      kx = ox + Math.cos(angle) * clamp; ky = oy + Math.sin(angle) * clamp;
      this._joyDx = (clamp / baseR) * Math.cos(angle);
      this._joyDy = (clamp / baseR) * Math.sin(angle);
      draw();
    };
    const endJoy = () => {
      activeId = null; this._joyActive = false;
      this._joyDx = 0; this._joyDy = 0; kx = cx; ky = cy; draw();
    };

    canvas.addEventListener('touchstart', e => { e.preventDefault(); const t = e.changedTouches[0]; const r = rect(); startJoy(t.clientX-r.left, t.clientY-r.top, t.identifier); }, { passive: false });
    canvas.addEventListener('touchmove',  e => { e.preventDefault(); for (const t of e.changedTouches) { if (t.identifier === activeId) { const r = rect(); moveJoy(t.clientX-r.left, t.clientY-r.top, t.identifier); } } }, { passive: false });
    canvas.addEventListener('touchend',    e => { e.preventDefault(); endJoy(); }, { passive: false });
    canvas.addEventListener('touchcancel', e => { e.preventDefault(); endJoy(); }, { passive: false });
    canvas.addEventListener('mousedown', e => { e.preventDefault(); const r = rect(); startJoy(e.clientX-r.left, e.clientY-r.top, 'mouse'); }, { passive: false });
    canvas.addEventListener('mousemove', e => { if (e.buttons & 1) { const r = rect(); moveJoy(e.clientX-r.left, e.clientY-r.top, 'mouse'); } }, { passive: false });
    canvas.addEventListener('mouseup',    e => { e.preventDefault(); endJoy(); }, { passive: false });
    canvas.addEventListener('mouseleave', e => { e.preventDefault(); endJoy(); }, { passive: false });

    this.events.once('shutdown', () => {
      document.getElementById('joy-canvas')?.remove();
      if (btnLeft)  btnLeft.style.display  = '';
      if (btnRight) btnRight.style.display = '';
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
    ['tex_grid', 'tex_player_square', 'tex_hazard_dot'].forEach(k => {
      if (this.textures.exists(k)) this.textures.remove(k);
    });
    const g = this.add.graphics();

    g.clear();
    g.lineStyle(1, 0x1e2749, 1);
    g.strokeRect(0, 0, 32, 32);
    g.generateTexture('tex_grid', 32, 32);

    g.clear();
    g.fillStyle(0xff4444, 1);
    g.fillRect(0, 0, 18, 18);
    g.lineStyle(2, 0x000000, 1);
    g.strokeRect(0, 0, 18, 18);
    g.generateTexture('tex_player_square', 18, 18);

    g.clear();
    g.fillStyle(0x1a2450, 1);
    g.fillCircle(8, 8, 8);
    g.lineStyle(2, 0xffffff, 1);
    g.strokeCircle(8, 8, 8);
    g.generateTexture('tex_hazard_dot', 16, 16);

    g.destroy();
  }

  createEndlessHazards(top, bottom) {
    const startX  = 300;
    const endX    = this.worldWidth - 300;
    const spacing = 120;
    const count   = Math.floor((endX - startX) / spacing);
    const RADIUS  = 8;

    for (let i = 0; i < count; i++) {
      const x = startX + i * spacing;

      const startY = (i % 2 === 0) ? top + 20 : bottom - 20;
      const endY   = (i % 2 === 0) ? bottom - 20 : top + 20;
      const s1 = this.add.image(x, startY, 'tex_hazard_dot').setDepth(5);
      const d1 = { x: s1.x, y: s1.y, r: RADIUS, sprite: s1 };
      this._hazardData.push(d1);
      this.tweens.add({
        targets: d1, y: endY,
        duration: 800 + (i % 4) * 150,
        ease: 'Sine.easeInOut', yoyo: true, repeat: -1,
        onUpdate: () => { s1.setPosition(d1.x, d1.y); }
      });

      const heights = [top + 40, (top + bottom) / 2, bottom - 40];
      heights.forEach((hy, hIdx) => {
        if ((i + hIdx) % 3 === 0) {
          const s2 = this.add.image(x, hy, 'tex_hazard_dot').setDepth(5);
          const d2 = { x: s2.x, y: s2.y, r: RADIUS, sprite: s2 };
          this._hazardData.push(d2);
          this.tweens.add({
            targets: d2, x: x + 150,
            duration: 700 + hIdx * 100,
            ease: 'Linear', yoyo: true, repeat: -1,
            onUpdate: () => { s2.setPosition(d2.x, d2.y); }
          });
        }
      });

      if (i % 5 === 0) {
        const sx = x + 60;
        const sy = (i % 2 === 0) ? top + 30 : bottom - 30;
        const s3 = this.add.image(sx, sy, 'tex_hazard_dot').setDepth(5).setTint(0xff5555);
        this._hazardData.push({ x: sx, y: sy, r: RADIUS, sprite: s3 });
      }
    }
  }

  activateSlow() {
    if (!this._slowReady || this._slowActive) return;
    this._slowActive = true;
    this._slowReady  = false;
    this.tweens.getAllTweens().forEach(tw => tw.setTimeScale(0.5));
    this.time.delayedCall(2000, () => {
      this._slowActive = false;
      this.tweens.getAllTweens().forEach(tw => tw.setTimeScale(1));
      this._slowCooldownEnd = this.time.now + 3000;
      this.time.delayedCall(3000, () => { this._slowReady = true; });
    });
  }

  _triggerHit() {
    if (this.isLevelComplete || this._invincible) return;
    this._hitCount++;

    if (this._hitCount === 1) {
      this._invincible = true;
      this._healthText.setText('❤️');
      this.player.setTint(0xff8800);
      this.tweens.add({
        targets: this.player,
        alpha: { from: 0.2, to: 1 },
        duration: 120, yoyo: true, repeat: 7,
        onComplete: () => { this.player.setAlpha(1); this.player.clearTint(); }
      });
      this.time.delayedCall(300, () => { this.player.clearTint(); });
      this.time.delayedCall(2000, () => { this._invincible = false; });
    } else {
      this._hitCount      = 0;
      this._invincible    = false;
      this._playerStarted = false;
      this.player.clearTint();
      this.player.setAlpha(1);
      this._healthText.setText('❤️❤️');
      this.player.body.moves = false;
      this.player.body.reset(60, this._centerY);
      this.player.setVelocity(0, 0);
      this.cameras.main.shake(120, 0.015);
      this.cameras.main.scrollX = 0;
    }
  }

  winLevel7() {
    if (this.isLevelComplete) return;
    this.isLevelComplete = true;
    this.cameras.main.flash(500, 255, 255, 255);
    this.add.text(this.player.x, this.scale.height / 2, 'VICTORY!', {
      fontSize: '64px', color: '#8bd450', fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0);
    this.time.delayedCall(1200, () => {
      window.location.assign(window.location.origin + window.location.pathname + '?level=8');
    });
  }

  update() {
    if (this.isPaused || this.isLevelComplete) return;

    const touch    = this.game.registry.get('touchInput') || {};
    const jumpDown = !!(touch.jump);

    // Unlock on first joystick drag
    if (this._joyActive && !this._playerStarted) {
      this._playerStarted = true;
      this.player.body.moves = true;
    }

    if (jumpDown && !this._jumpWasDown) {
      this.activateSlow();
    }
    this._jumpWasDown = jumpDown;

    // Joystick movement — frozen until first drag
    if (this._playerStarted && this._joyActive) {
      this.player.setVelocityX(this._joyDx * this.playerSpeed);
      this.player.setVelocityY(this._joyDy * this.playerSpeed);
    } else {
      this.player.setVelocity(0);
    }

    // Manual collision: hazards vs player
    const pr = 9;
    const px = this.player.x;
    const py = this.player.y;

    for (const d of this._hazardData) {
      const dx = px - d.x;
      const dy = py - d.y;
      if (dx*dx + dy*dy < (pr + d.r) * (pr + d.r)) {
        this._triggerHit();
        break;
      }
    }

    // Finish zone check
    if (Math.abs(px - this._finishX) < this._finishW / 2 + pr) {
      this.winLevel7();
    }

    // SLOW HUD
    if (this._slowText) {
      if (this._slowActive) {
        this._slowText.setText('SLOW ⏳').setColor('#00ffcc');
      } else if (!this._slowReady) {
        const secs = Math.max(0, Math.ceil((this._slowCooldownEnd - this.time.now) / 1000));
        this._slowText.setText(`SLOW ${secs}s`).setColor('#ffaa00');
      } else {
        this._slowText.setText('SLOW ✓').setColor('#00ffcc');
      }
    }
  }
}
