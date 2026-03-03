import LevelBase from './LevelBase.js';

// ── Stage definitions ────────────────────────────────────────────────────────
// Each stage: { obstacles: [{x,y,w,h}], targetX, targetY, maxShots }
const STAGES = [
  {
    label: 'Stage 1 of 3 — Clear Shot',
    maxShots: 3,
    targetX: 380, targetY: null, // null = auto (groundY - 55)
    obstacles: [
      { x: 240, y: null, w: 30, h: 120 }, // single wall, null y = sits on ground
    ]
  },
  {
    label: 'Stage 2 of 3 — Double Wall',
    maxShots: 3,
    targetX: 380, targetY: null,
    obstacles: [
      { x: 180, y: null, w: 28, h: 160 },
      { x: 310, y: null, w: 28, h: 90  },
    ]
  },
  {
    label: 'Stage 3 of 3 — Moving Gap',
    maxShots: 4,
    targetX: 400, targetY: null,
    obstacles: [
      { x: 220, y: null, w: 28, h: 200 },
      { x: 320, y: null, w: 28, h: 70  },
      { x: 140, y: null, w: 28, h: 60  },
    ]
  },
];

export default class Level10 extends LevelBase {
  constructor() {
    super('Level10');
    this.isCharging         = false;
    this.chargePower        = 0;
    this.maxPower           = 800;
    this.shotsTaken         = 0;
    this.maxShots           = 3;
    this.isGameOver         = false;
    this.isLevelComplete    = false;
    this.isProjectileFlying = false;
    this._aimAngle          = 0;
    this._currentStage      = 0;       // 0-based
    this._powerFillEl       = null;
    this._obstacles         = [];      // physics static bodies this stage
  }

  create() {
    super.create();

    this.isGameOver         = false;
    this.isLevelComplete    = false;
    this.isProjectileFlying = false;
    this.isCharging         = false;
    this.chargePower        = 0;
    this.shotsTaken         = 0;
    this._aimAngle          = -0.5;   // default: aim slightly upward
    this._currentStage      = 0;
    this._obstacles         = [];

    this.createTextures();
    this._buildStage(0);
    this._buildControls();

    this.game.events.emit('level:changed', {
      levelNumber: 10,
      objective: 'Hit every target — 3 stages',
      totalLevels: 50
    });
  }

  // ── Build / rebuild the scene for a given stage ──────────────────────────
  _buildStage(stageIdx) {
    const w = this.scale.width;
    const h = this.scale.height;
    const groundY = h - 54;

    this._currentStage = stageIdx;
    const stage = STAGES[stageIdx];
    this.maxShots   = stage.maxShots;
    this.shotsTaken = 0;
    this.chargePower = 0;
    this.isProjectileFlying = false;
    this.isCharging = false;

    // Clear previous stage objects
    if (this._stageGroup) {
      this._stageGroup.destroy(true, true);
    }
    this._stageGroup  = this.add.group();
    this._obstacles   = [];

    // Background
    const bg = this.add.rectangle(w/2, groundY/2, w, groundY, 0x0b1020);
    this._stageGroup.add(bg);
    const gnd = this.add.rectangle(w/2, groundY + 16, w, 32, 0x2c3e50);
    this._stageGroup.add(gnd);

    // Stage label
    const stageLbl = this.add.text(w/2, 70, stage.label, {
      fontSize: '20px', color: '#e6ebff', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5);
    this._stageGroup.add(stageLbl);

    // Instructions
    const inst = this.add.text(w/2, 96, 'AIM: drag ◀▶  |  POWER: drag ▲▼ then release', {
      fontSize: '12px', color: '#a9b4ff'
    }).setOrigin(0.5);
    this._stageGroup.add(inst);

    // Shots counter
    if (this.shotsText) this.shotsText.destroy();
    this.shotsText = this.add.text(w - 12, 118, `SHOTS: 0/${this.maxShots}`, {
      fontSize: '16px', color: '#ffffff', stroke: '#000', strokeThickness: 3
    }).setOrigin(1, 0.5);

    // Launcher
    const launchX = 70, launchY = groundY - 28;
    this._launchX = launchX;
    this._launchY = launchY;

    const lb = this.add.circle(launchX, launchY, 16, 0x3498db);
    this._stageGroup.add(lb);
    if (this.aimLine) this.aimLine.destroy();
    this.aimLine = this.add.line(launchX, launchY, 0, 0, 50, 0, 0xffffff, 1)
      .setLineWidth(3).setOrigin(0, 0.5);

    // Power bar (above launcher)
    if (this.powerLabel) this.powerLabel.destroy();
    if (this.powerBar)   this.powerBar.destroy();
    this.powerLabel = this.add.text(launchX, launchY - 44, 'PWR: 0%', {
      fontSize: '13px', color: '#f1c40f', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5);
    const barW = 100, barH = 10, barX = launchX - barW/2, barY = launchY - 32;
    this.add.rectangle(barX + barW/2, barY, barW, barH, 0x333333).setOrigin(0.5);
    this.powerBar = this.add.rectangle(barX, barY, 0, barH, 0xf1c40f).setOrigin(0, 0.5);
    this._barMaxW = barW;

    // Trajectory graphics
    if (this.trajectoryGraphics) this.trajectoryGraphics.destroy();
    this.trajectoryGraphics = this.add.graphics();

    // ── Obstacles — static physics bodies (no ghosting) ───────────────────
    stage.obstacles.forEach(ob => {
      const oy = ob.y !== null ? ob.y : groundY - ob.h / 2;
      const rect = this.add.rectangle(ob.x, oy, ob.w, ob.h, 0x7f8c8d);
      this._stageGroup.add(rect);
      this.physics.add.existing(rect, true); // static=true
      this._obstacles.push(rect);
    });

    // ── Target ────────────────────────────────────────────────────────────
    if (this.target && this.target.active) this.target.destroy();
    const targetY = stage.targetY !== null ? stage.targetY : groundY - 55;
    this.target = this.physics.add.sprite(stage.targetX, targetY, 'tex_target');
    this.target.body.setAllowGravity(false);
    this.target.setImmovable(true);
    // Use a smaller circle body to match visual ring
    this.target.setCircle(18, 7, 7);
  }

  // ── Controls ─────────────────────────────────────────────────────────────
  _buildControls() {
    const controls = document.getElementById('controls');
    const btnLeft  = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    const btnJump  = document.getElementById('btn-jump');

    if (btnLeft)  btnLeft.style.display  = 'none';
    if (btnRight) btnRight.style.display = 'none';
    if (btnJump)  btnJump.style.display  = 'none';

    document.getElementById('aim-pad')?.remove();
    document.getElementById('power-pad')?.remove();

    if (!controls) return;

    controls.style.display        = 'flex';
    controls.style.flexDirection  = 'row';
    controls.style.alignItems     = 'center';
    controls.style.justifyContent = 'space-evenly';
    controls.style.padding        = '4px 8px';
    controls.style.gap            = '8px';
    controls.style.gridTemplateColumns = '';
    controls.style.gridTemplateRows    = '';
    controls.style.boxSizing       = 'border-box';

    // Fit pads inside the controls bar — use percentage of available width
    const ctrlH = Math.max(controls.getBoundingClientRect().height || 0, 120);
    const padH  = Math.max(60, Math.min(ctrlH - 10, 120));

    const makePad = (id, label, sub, rgb) => {
      const pad = document.createElement('div');
      pad.id = id;
      pad.style.cssText = [
        'flex:1', 'min-width:0',          // grow evenly, never overflow
        `height:${padH}px`,
        `background:rgba(${rgb},0.12)`,
        `border:2px solid rgba(${rgb},0.5)`,
        'border-radius:12px',
        'display:flex', 'flex-direction:column',
        'align-items:center', 'justify-content:center',
        'touch-action:none', 'user-select:none', '-webkit-user-select:none',
        'flex-shrink:1', 'position:relative', 'overflow:hidden', 'touch-action:none',
        'box-sizing:border-box',
      ].join(';');
      const l = document.createElement('div');
      l.textContent = label;
      l.style.cssText = `font-size:13px;font-weight:bold;color:rgba(${rgb},1);letter-spacing:1px;pointer-events:none;`;
      const s = document.createElement('div');
      s.textContent = sub;
      s.style.cssText = `font-size:10px;color:rgba(${rgb},0.7);margin-top:2px;pointer-events:none;`;
      pad.appendChild(l); pad.appendChild(s);
      return pad;
    };

    // AIM pad
    const aimPad = makePad('aim-pad', '🎯 AIM', '◀ drag ▶', '120,190,255');
    const aimTrack = document.createElement('div');
    aimTrack.style.cssText = 'position:absolute;bottom:8px;left:10%;width:80%;height:4px;background:rgba(120,190,255,0.25);border-radius:2px;';
    const aimKnob = document.createElement('div');
    aimKnob.style.cssText = 'position:absolute;bottom:4px;width:14px;height:12px;background:rgba(120,190,255,0.9);border-radius:3px;left:50%;transform:translateX(-50%);';
    aimPad.appendChild(aimTrack); aimPad.appendChild(aimKnob);

    // POWER pad
    const powerPad = makePad('power-pad', '⚡ POWER', '▲ drag ▼ release=fire', '241,196,15');
    const pwrFill = document.createElement('div');
    pwrFill.style.cssText = 'position:absolute;bottom:0;left:0;width:100%;height:0%;background:rgba(241,196,15,0.28);border-radius:0 0 10px 10px;pointer-events:none;';
    powerPad.insertBefore(pwrFill, powerPad.firstChild);
    this._powerFillEl = pwrFill;

    controls.appendChild(aimPad);
    controls.appendChild(powerPad);

    // ── AIM drag ──────────────────────────────────────────────────────────
    let aimStartX = null, aimBaseAngle = 0;
    // Fixed sensitivity: full pad width = full angle range (~210°). Consistent regardless of pad size.
    const aimRange  = Math.PI * 1.0;   // total sweep in radians
    const aimSens   = aimRange / Math.max(window.innerWidth * 0.45, 180);

    const aimStart = e => {
      e.preventDefault();
      aimStartX    = e.touches ? e.touches[0].clientX : e.clientX;
      aimBaseAngle = this._aimAngle;
    };
    const aimMove = e => {
      e.preventDefault();
      if (aimStartX === null) return;
      const x     = e.touches ? e.touches[0].clientX : e.clientX;
      const delta = (x - aimStartX) * aimSens;
      this._aimAngle = Phaser.Math.Clamp(aimBaseAngle + delta, -Math.PI * 0.7, Math.PI * 0.3);
      const pct = (this._aimAngle + Math.PI * 0.7) / (Math.PI);
      aimKnob.style.left = (8 + pct * 84) + '%';
    };
    const aimEnd = e => { e.preventDefault(); aimStartX = null; };

    aimPad.addEventListener('touchstart',  aimStart, { passive: false });
    aimPad.addEventListener('touchmove',   aimMove,  { passive: false });
    aimPad.addEventListener('touchend',    aimEnd,   { passive: false });
    aimPad.addEventListener('touchcancel', aimEnd,   { passive: false });
    aimPad.addEventListener('mousedown',   aimStart, { passive: false });
    aimPad.addEventListener('mousemove',   e => { if (e.buttons & 1) aimMove(e); }, { passive: false });
    aimPad.addEventListener('mouseup',     aimEnd,   { passive: false });
    aimPad.addEventListener('mouseleave',  aimEnd,   { passive: false });

    // ── POWER drag ────────────────────────────────────────────────────────
    let pwrStartY = null, pwrBase = 0;
    // Fixed: full pad height drag = full power. Consistent on any screen.
    const pwrSens = this.maxPower / Math.max(padH * 0.8, 50);

    const pwrStart = e => {
      e.preventDefault();
      if (this.isProjectileFlying || this.isGameOver || this.isLevelComplete) return;
      pwrStartY       = e.touches ? e.touches[0].clientY : e.clientY;
      pwrBase         = this.chargePower;
      this.isCharging = true;
    };
    const pwrMove = e => {
      e.preventDefault();
      if (pwrStartY === null || !this.isCharging) return;
      const y = e.touches ? e.touches[0].clientY : e.clientY;
      this.chargePower = Phaser.Math.Clamp(pwrBase + (pwrStartY - y) * pwrSens, 0, this.maxPower);
    };
    const pwrEnd = e => {
      e.preventDefault();
      if (!this.isCharging) return;
      this.isCharging = false;
      pwrStartY = null;
      this.fire();
    };

    powerPad.addEventListener('touchstart',  pwrStart, { passive: false });
    powerPad.addEventListener('touchmove',   pwrMove,  { passive: false });
    powerPad.addEventListener('touchend',    pwrEnd,   { passive: false });
    powerPad.addEventListener('touchcancel', pwrEnd,   { passive: false });
    powerPad.addEventListener('mousedown',   pwrStart, { passive: false });
    powerPad.addEventListener('mousemove',   e => { if (e.buttons & 1) pwrMove(e); }, { passive: false });
    powerPad.addEventListener('mouseup',     pwrEnd,   { passive: false });
    powerPad.addEventListener('mouseleave',  pwrEnd,   { passive: false });

    // Restore on exit
    this.events.once('shutdown', () => {
      document.getElementById('aim-pad')?.remove();
      document.getElementById('power-pad')?.remove();
      if (btnLeft)  { btnLeft.style.display  = ''; }
      if (btnRight) { btnRight.style.display = ''; }
      if (btnJump)  { btnJump.style.display  = ''; btnJump.textContent = 'JUMP'; }
      if (controls) {
        controls.style.display = 'flex'; controls.style.flexDirection = 'row';
        controls.style.alignItems = ''; controls.style.justifyContent = '';
        controls.style.padding = ''; controls.style.gap = '12px';
      }
    });
  }

  createTextures() {
    ['tex_projectile', 'tex_target'].forEach(k => {
      if (this.textures.exists(k)) this.textures.remove(k);
    });
    const g = this.add.graphics();

    g.clear();
    g.fillStyle(0xffffff, 1); g.fillCircle(8, 8, 8);
    g.generateTexture('tex_projectile', 16, 16);

    g.clear();
    g.lineStyle(5, 0xe74c3c, 1); g.strokeCircle(25, 25, 22);
    g.lineStyle(4, 0xffffff, 1); g.strokeCircle(25, 25, 14);
    g.lineStyle(3, 0xe74c3c, 1); g.strokeCircle(25, 25, 7);
    g.fillStyle(0xe74c3c, 1);    g.fillCircle(25, 25, 4);
    g.generateTexture('tex_target', 50, 50);

    g.destroy();
  }

  fire() {
    if (this.isProjectileFlying || this.isGameOver || this.isLevelComplete) return;
    if (this.chargePower < 30) { this.chargePower = 0; return; }

    this.isProjectileFlying = true;
    this.shotsTaken++;
    if (this.shotsText) this.shotsText.setText(`SHOTS: ${this.shotsTaken}/${this.maxShots}`);
    this.trajectoryGraphics?.clear();

    const vx = Math.cos(this._aimAngle) * this.chargePower;
    const vy = Math.sin(this._aimAngle) * this.chargePower;

    const proj = this.physics.add.sprite(this._launchX, this._launchY, 'tex_projectile');
    proj.setCollideWorldBounds(true);
    proj.setBounce(0.1);
    proj.setDepth(10);
    proj.setCircle(8);
    proj.setVelocity(vx, vy);

    // Solid colliders with obstacles — no ghosting
    this._obstacles.forEach(ob => {
      if (ob && ob.active) {
        this.physics.add.collider(proj, ob);
      }
    });

    // Hit target
    this.physics.add.overlap(proj, this.target, () => {
      if (this.isGameOver || this.isLevelComplete) return;
      proj.destroy();
      this._stageCleared();
    });

    // Miss timeout
    this.time.delayedCall(3500, () => {
      if (this.isGameOver || this.isLevelComplete) return;
      if (proj.active) proj.destroy();
      this.isProjectileFlying = false;
      this.chargePower = 0;
      if (this.powerBar) this.powerBar.setSize(0, 10);
      if (this.powerLabel) this.powerLabel.setText('PWR: 0%');
      if (this.shotsTaken >= this.maxShots) {
        this._gameOver('OUT OF SHOTS!');
      }
    });
  }

  _stageCleared() {
    const next = this._currentStage + 1;
    const w = this.scale.width, h = this.scale.height;

    if (next >= STAGES.length) {
      // All stages done → win
      this.isLevelComplete = true;
      this.cameras.main.flash(500, 255, 255, 255);
      this.add.rectangle(w/2, h/2, w, h, 0x000000, 0.5).setDepth(25);
      this.add.text(w/2, h/2 - 40, 'ALL CLEAR!', {
        fontSize: '52px', color: '#8bd450', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 5
      }).setOrigin(0.5).setDepth(26);
      this.add.text(w/2, h/2 + 20, 'Level 10 Complete!', {
        fontSize: '22px', color: '#ffffff', stroke: '#000', strokeThickness: 3
      }).setOrigin(0.5).setDepth(26);
      this.time.delayedCall(2200, () => {
        window.location.assign(window.location.origin + window.location.pathname + '?level=11');
      });
    } else {
      // Next stage
      this.cameras.main.flash(300, 255, 255, 255);
      const banner = this.add.text(w/2, h/2, `✓ STAGE ${this._currentStage + 1} CLEAR!`, {
        fontSize: '40px', color: '#8bd450', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 4
      }).setOrigin(0.5).setDepth(30);
      this.time.delayedCall(1200, () => {
        banner.destroy();
        this._buildStage(next);
      });
    }
  }

  _gameOver(reason) {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.cameras.main.shake(400, 0.015);
    const w = this.scale.width, h = this.scale.height;
    this.add.rectangle(w/2, h/2, w, h, 0x000000, 0.55).setDepth(25);
    this.add.text(w/2, h/2 - 50, reason, {
      fontSize: '44px', color: '#ff4444', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 5
    }).setOrigin(0.5).setDepth(26);
    this.add.text(w/2, h/2 + 16, `Stage ${this._currentStage + 1} of ${STAGES.length}`, {
      fontSize: '20px', color: '#ffffff', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(26);
    this.add.text(w/2, h/2 + 52, 'Drag POWER to retry', {
      fontSize: '16px', color: '#a9b4ff'
    }).setOrigin(0.5).setDepth(26);
    this.time.delayedCall(900, () => {
      const pad = document.getElementById('power-pad');
      const retry = () => { this.scene.restart(); };
      pad?.addEventListener('touchstart', retry, { once: true, passive: false });
      pad?.addEventListener('mousedown',  retry, { once: true });
    });
  }

  update() {
    if (this.isGameOver || this.isLevelComplete || this.isPaused) return;

    if (this.aimLine) this.aimLine.setRotation(this._aimAngle);

    const pct = Math.floor((this.chargePower / this.maxPower) * 100);
    if (this.powerLabel) this.powerLabel.setText(`PWR: ${pct}%`);
    if (this.powerBar)   this.powerBar.setSize(this._barMaxW * pct / 100, 10);
    if (this._powerFillEl) this._powerFillEl.style.height = pct + '%';

    if (this.isCharging) this.drawTrajectory();
    else this.trajectoryGraphics?.clear();
  }

  drawTrajectory() {
    this.trajectoryGraphics.clear();
    this.trajectoryGraphics.lineStyle(2, 0xf1c40f, 0.5);
    const vx = Math.cos(this._aimAngle) * this.chargePower;
    const vy = Math.sin(this._aimAngle) * this.chargePower;
    let cx = this._launchX, cy = this._launchY, vcy = vy;
    this.trajectoryGraphics.beginPath();
    this.trajectoryGraphics.moveTo(cx, cy);
    for (let i = 0; i < 40; i++) {
      cx += vx * 0.05; vcy += 1200 * 0.05; cy += vcy * 0.05;
      if (cy > this.scale.height) break;
      this.trajectoryGraphics.lineTo(cx, cy);
    }
    this.trajectoryGraphics.strokePath();
  }
}
