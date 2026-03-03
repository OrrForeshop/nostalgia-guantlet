// LevelManager
// - Reads levels.json from Phaser cache
// - Starts/restarts levels
// - Provides a stable API for future levels

export default class LevelManager {
  /**
   * @param {Phaser.Scene} scene A scene with access to cache/scene manager.
   */
  constructor(scene) {
    this.game = scene.game;
    this.levels = [];
    this.currentLevelNumber = 1;
  }

  loadFromCache() {
    const data = this.game.cache.json.get('levels');
    if (!data || !Array.isArray(data.levels)) {
      throw new Error('levels.json missing or invalid. Expected shape: { levels: [...] }');
    }
    this.levels = data.levels;
    return this;
  }

  get totalLevels() {
    return this.levels.length;
  }

  /**
   * 1-indexed level lookup
   */
  getLevelConfig(levelNumber) {
    const idx = levelNumber - 1;
    const cfg = this.levels[idx];
    if (!cfg) throw new Error(`No config for level ${levelNumber}`);
    return cfg;
  }

  setCurrent(levelNumber) {
    this.currentLevelNumber = parseInt(levelNumber, 10);
  }

  startLevel(levelNumber) {
    this.setCurrent(levelNumber);
    console.log('LevelManager starting level:', levelNumber);

    const cfg = this.getLevelConfig(this.currentLevelNumber);
    const LEVEL_SCENES = this.game.registry.get('LEVEL_SCENES') || {};
    const LevelSceneClass = LEVEL_SCENES[this.currentLevelNumber];

    const sceneKey = `Level${this.currentLevelNumber}`;

    if (!this.game.scene.getScene(sceneKey)) {
      if (LevelSceneClass) {
        this.game.scene.add(sceneKey, LevelSceneClass, false);
      } else {
        this.game.scene.add(sceneKey, LEVEL_SCENES[1], false);
      }
    }

    this.game.scene.getScenes(true).forEach(s => {
      if (s.scene.key.startsWith('Level') && s.scene.key !== sceneKey) {
        this.game.scene.stop(s.scene.key);
      }
    });

    this.game.scene.start(sceneKey, {
      levelNumber: this.currentLevelNumber,
      levelConfig: cfg,
    });

    this.game.events.emit('level:changed', {
      levelNumber: this.currentLevelNumber,
      objective: cfg.objective || 'Reach the goal.',
      totalLevels: this.totalLevels,
    });
  }

  restartLevel() {
    this.startLevel(this.currentLevelNumber);
  }

  nextLevel() {
    const next = this.currentLevelNumber + 1;
    console.log('LevelManager nextLevel called. Current:', this.currentLevelNumber, 'Next:', next);
    
    // EXPLICIT FORWARD MOTION - Hard redirects for stability
    const nextUrl = window.location.origin + window.location.pathname + '?level=' + next;
    
    if (next > 5) {
      this.game.events.emit('game:end');
      return;
    }
    
    console.log("Next Level Triggered -> Redirecting to:", nextUrl);
    window.location.assign(nextUrl);
  }
}
