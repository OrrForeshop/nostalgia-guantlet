import LevelBase from './LevelBase.js';

export default class Level5 extends LevelBase {
  constructor() {
    super('Level5');
    this.score = 0;
    this.targetScore = 500;
    this.timeLeft = 60; // 60 seconds
    this.isHookFired = false;
    this.hookAngle = 0;
    this.hookSpeed = 400;
    this.retractSpeed = 400;
    this.rotationSpeed = 1.5;
    this.rotationDirection = 1; // 1 for right, -1 for left
    this.attachedObject = null;
    this.hookLength = 0;
    this.maxHookLength = 600;
    this.isLevelComplete = false;
  }

  create() {
    super.create();
    this.createLevelTextures();

    const w = this.scale.width;
    const h = this.scale.height;

    // Background: Deep cave/earth
    this.add.rectangle(0, 52, w, h - 52, 0x2c1810).setOrigin(0).setDepth(-2);
    
    // Anchor Point (The Winch)
    this.anchorX = w / 2;
    this.anchorY = 100;
    this.add.circle(this.anchorX, this.anchorY, 15, 0x5d4037).setDepth(10);
    this.add.rectangle(this.anchorX, 52, 60, 50, 0x3e2723).setOrigin(0.5, 0).setDepth(9);

    // Hook Graphics
    this.hookLine = this.add.graphics();
    this.hookHead = this.add.container(this.anchorX, this.anchorY);
    const hookSprite = this.add.sprite(0, 0, 'tex_hook').setOrigin(0.5, 0);
    this.hookHead.add(hookSprite);
    this.hookHead.setDepth(11);

    // Objects Group
    this.items = this.physics.add.group();
    this.spawnItems();

    // UI
    // Score + timer — pinned to bottom of play area, nothing overlaps here
    this.txtValue = this.add.text(w / 2, h - 95, `VALUE: $0 / $${this.targetScore}`, {
      fontSize: '20px', color: '#ffcc00', fontWeight: 'bold'
    }).setOrigin(0.5).setDepth(50);
    this.txtTimer = this.add.text(w / 2, h - 70, `TIME: ${this.timeLeft}s`, {
      fontSize: '20px', color: '#ffffff', fontWeight: 'bold'
    }).setOrigin(0.5).setDepth(50);

    // Compact legend on one line above score
    this.add.text(w / 2, h - 120, '● GOLD $100   ▲ GEM $250   ■ ROCK $10', {
      fontSize: '13px', color: '#cccccc'
    }).setOrigin(0.5).setDepth(50);

    this.add.text(w / 2, h - 140, 'Choose wisely.', {
      fontSize: '15px', color: '#8d6e63', fontStyle: 'italic'
    }).setOrigin(0.5).setDepth(50);

    // Rename JUMP button to PULL for this level, restore on exit
    const btnJump = document.getElementById('btn-jump');
    if (btnJump) {
      btnJump.textContent = 'PULL';
      this.events.once('shutdown', () => { btnJump.textContent = 'JUMP'; });
    }

    // Timer Event
    this.timeEvent = this.time.addEvent({
      delay: 1000,
      callback: () => {
        if (this.isPaused || this.isLevelComplete) return;
        this.timeLeft--;
        this.txtTimer.setText(`TIME: ${this.timeLeft}s`);
        if (this.timeLeft <= 0) this.handleGameOver();
      },
      loop: true
    });

    this.game.events.emit('level:changed', {
      levelNumber: 5,
      objective: 'Worth the Wait: Reach $500',
      totalLevels: 50
    });
  }

  createLevelTextures() {
    const g = this.add.graphics();
    
    // HOOK
    g.clear();
    g.lineStyle(3, 0xbdc3c7, 1);
    g.beginPath();
    g.moveTo(10, 0); g.lineTo(10, 15);
    g.arc(0, 15, 10, 0, Math.PI, false);
    g.strokePath();
    g.generateTexture('tex_hook', 20, 30);

    // GOLD (High value, heavy)
    g.clear();
    g.fillStyle(0xffd700, 1);
    g.fillCircle(20, 20, 20);
    g.fillStyle(0xffff00, 0.5);
    g.fillCircle(12, 12, 8); // shine
    g.generateTexture('tex_gold', 40, 40);

    // ROCK (Low value, heavy)
    g.clear();
    g.fillStyle(0x757575, 1);
    g.fillRoundedRect(0, 0, 50, 40, 8);
    g.fillStyle(0x424242, 0.5);
    g.fillRect(10, 10, 15, 10);
    g.generateTexture('tex_rock', 50, 40);

    // GEM (High value, light)
    g.clear();
    g.fillStyle(0x00e676, 1);
    g.fillTriangle(15, 0, 30, 15, 15, 30);
    g.fillTriangle(15, 0, 0, 15, 15, 30);
    g.fillStyle(0xffffff, 0.4);
    g.fillTriangle(15, 5, 20, 15, 15, 25);
    g.generateTexture('tex_gem', 30, 30);

    g.destroy();
  }

  spawnItems() {
    const w = this.scale.width;
    const h = this.scale.height;
    
    // Balanced Economy
    // All items kept between y=300–560 so the bottom text area (y>580) stays clear
    const layout = [
      { x: w * 0.2, y: 320, type: 'gold', val: 100, wt: 120 },
      { x: w * 0.5, y: 420, type: 'gold', val: 100, wt: 120 },
      { x: w * 0.8, y: 340, type: 'gold', val: 100, wt: 120 },

      { x: w * 0.1, y: 460, type: 'gem', val: 250, wt: 400 },
      { x: w * 0.9, y: 480, type: 'gem', val: 250, wt: 400 },

      { x: w * 0.4, y: 300, type: 'gold', val: 100, wt: 120 },

      { x: w * 0.3, y: 370, type: 'rock', val: 10, wt: 60 },
      { x: w * 0.5, y: 310, type: 'rock', val: 10, wt: 60 },
      { x: w * 0.7, y: 400, type: 'rock', val: 10, wt: 60 }
    ];

    layout.forEach(p => {
      const item = this.items.create(p.x, p.y, `tex_${p.type}`);
      item.setData('value', p.val);
      item.setData('speed', p.wt);
      item.body.setAllowGravity(false);
      item.setCircle(item.width / 2);
    });
  }

  update(_t, dt) {
    if (this.isPaused || this.isLevelComplete) return;

    if (!this.isHookFired) {
      // Rotation logic
      this.hookAngle += this.rotationSpeed * this.rotationDirection * (dt/1000);
      if (this.hookAngle > 1.2 || this.hookAngle < -1.2) {
        this.rotationDirection *= -1;
      }
      this.hookHead.setRotation(this.hookAngle);

      const { jump } = this.getMoveInput();
      if (jump) {
        this.isHookFired = true;
        this.retractSpeed = 400; // Reset to default
      }
    } else {
    // Extension/Retraction logic
    const angle = this.hookHead.rotation + Math.PI / 2;
    
    if (!this.attachedObject) {
      // Extending
      this.hookLength += this.hookSpeed * (dt/1000);
      this.hookHead.x = this.anchorX + Math.cos(angle) * this.hookLength;
      this.hookHead.y = this.anchorY + Math.sin(angle) * this.hookLength;

      // BRUTE FORCE COLLISION CHECK
      this.items.getChildren().forEach(item => {
        if (!item.active) return;
        const dist = Phaser.Math.Distance.Between(this.hookHead.x, this.hookHead.y, item.x, item.y);
        if (dist < (item.width / 2 + 15)) {
          console.log("Hook Attached to:", item.texture.key);
          this.attachedObject = item;
          this.retractSpeed = item.getData('speed');
          item.body.enable = false;
        }
      });

      if (!this.attachedObject && (this.hookLength >= this.maxHookLength || this.hookHead.x < 0 || this.hookHead.x > this.scale.width || this.hookHead.y > this.scale.height)) {
          this.retractSpeed = 400;
          this.attachedObject = "none"; 
      }
    } else {
        // Retracting
        this.hookLength -= this.retractSpeed * (dt/1000);
        this.hookHead.x = this.anchorX + Math.cos(angle) * this.hookLength;
        this.hookHead.y = this.anchorY + Math.sin(angle) * this.hookLength;

        if (this.attachedObject !== "none") {
            this.attachedObject.x = this.hookHead.x;
            this.attachedObject.y = this.hookHead.y;
        }

        if (this.hookLength <= 0) {
            this.isHookFired = false;
            this.hookLength = 0;
            this.hookHead.setPosition(this.anchorX, this.anchorY);
            if (this.attachedObject && this.attachedObject !== "none") {
                this.score += this.attachedObject.getData('value');
                this.txtValue.setText(`VALUE: $${this.score} / $${this.targetScore}`);
                this.attachedObject.destroy();
                this.checkWin();
            }
            this.attachedObject = null;
        }
      }
    }

    // Draw Rope
    this.hookLine.clear();
    this.hookLine.lineStyle(2, 0x8d6e63, 1);
    this.hookLine.lineBetween(this.anchorX, this.anchorY, this.hookHead.x, this.hookHead.y);
  }

  checkWin() {
    if (this.score >= this.targetScore && !this.isLevelComplete) {
        this.isLevelComplete = true;
        this.cameras.main.flash(500, 255, 255, 255);
        this.add.text(this.scale.width/2, this.scale.height/2, 'TARGET REACHED!', {
            fontSize: '48px', color: '#8bd450', fontWeight: 'bold'
        }).setOrigin(0.5);
        
        this.time.delayedCall(1500, () => {
            window.location.assign(window.location.origin + window.location.pathname + '?level=6');
        });
    }
  }

  handleGameOver() {
    if (this.isLevelComplete) return;
    this.isPaused = true;
    this.cameras.main.shake(500, 0.01);
    const w = this.scale.width;
    const h = this.scale.height;
    this.add.rectangle(0, 0, w, h, 0x000000, 0.7).setOrigin(0).setDepth(200);
    this.add.text(w/2, h/2 - 20, 'OUT OF TIME', { fontSize: '42px', color: '#ff0000', fontWeight: 'bold' }).setOrigin(0.5).setDepth(201);
    this.add.text(w/2, h/2 + 40, 'Press PULL to try again', { fontSize: '22px', color: '#ffffff' }).setOrigin(0.5).setDepth(201);

    const doRestart = () => window.location.reload();

    // Keyboard fallback
    this.input.keyboard.once('keydown-SPACE', doRestart);
    this.input.keyboard.once('keydown-UP', doRestart);

    // Poll PULL (jump) button via touch registry
    this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        const t = this.game.registry.get('touchInput') || {};
        if (t.jump) doRestart();
      }
    });
  }
}
