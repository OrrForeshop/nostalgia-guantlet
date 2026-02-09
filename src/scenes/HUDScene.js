export default class HUDScene extends Phaser.Scene {
  constructor() {
    super('HUD');
    this.elapsedMs = 0;
    this.objective = '';
    this.levelNumber = 1;
    this.totalLevels = 50;
  }

  create() {
    const w = this.scale.width;

    this.container = this.add.container(0, 0);

    const bg = this.add.rectangle(0, 0, w, 52, 0x0b1020, 0.75).setOrigin(0, 0);
    bg.setStrokeStyle(2, 0x1b2450, 0.8);

    this.txtLevel = this.add.text(16, 14, 'Level 1/50', {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: '16px',
      color: '#e6ebff',
    });

    this.txtTime = this.add.text(180, 14, 'Time 0.0s', {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: '16px',
      color: '#c9d1ff',
    });

    this.txtObjective = this.add.text(340, 14, 'Objective: ...', {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: '16px',
      color: '#a9b4ff',
    });

    this.container.add([bg, this.txtLevel, this.txtTime, this.txtObjective]);

    // Event bridge from LevelManager / Levels (using game-level events)
    this.game.events.on('level:changed', (data) => {
      this.levelNumber = data.levelNumber;
      this.totalLevels = data.totalLevels;
      this.objective = data.objective;
      this.refresh();
      this.resetTimer();
    });

    this.game.events.on('timer:reset', () => this.resetTimer());
    this.game.events.on('timer:pause', () => this.setPaused(true));
    this.game.events.on('timer:resume', () => this.setPaused(false));

    this.isPaused = false;
    this.refresh();
  }

  resetTimer() {
    this.elapsedMs = 0;
    this.refresh();
  }

  setPaused(isPaused) {
    this.isPaused = isPaused;
  }

  refresh() {
    this.txtLevel.setText(`Level ${this.levelNumber}/${this.totalLevels}`);
    this.txtObjective.setText(`Objective: ${this.objective || 'Reach the goal.'}`);
    this.txtTime.setText(`Time ${(this.elapsedMs / 1000).toFixed(1)}s`);
  }

  update(_t, dt) {
    if (this.isPaused) return;
    this.elapsedMs += dt;
    this.txtTime.setText(`Time ${(this.elapsedMs / 1000).toFixed(1)}s`);
  }
}
