// LevelManager
// - Reads levels.json from Phaser cache
// - Starts/restarts levels
// - Provides a stable API for future levels

export default class LevelManager {
  /**
   * @param {Phaser.Scene} scene A scene with access to cache/scene manager.
   */
  constructor(scene) {
    this.scene = scene;
    this.levels = [];
    this.currentLevelNumber = 1;
  }

  loadFromCache() {
    const data = this.scene.cache.json.get('levels');
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
    this.currentLevelNumber = Phaser.Math.Clamp(levelNumber, 1, Math.max(1, this.totalLevels));
  }

  startLevel(levelNumber) {
    this.setCurrent(levelNumber);

    const cfg = this.getLevelConfig(this.currentLevelNumber);
    const LEVEL_SCENES = this.scene.game.registry.get('LEVEL_SCENES') || {};
    const LevelSceneClass = LEVEL_SCENES[this.currentLevelNumber];

    // If a level scene class doesn't exist yet, fall back to Level1 for dev.
    const sceneKey = `Level${this.currentLevelNumber}`;

    if (!this.scene.scene.get(sceneKey)) {
      if (LevelSceneClass) {
        this.scene.scene.add(sceneKey, LevelSceneClass, false);
      } else {
        // Developer-friendly fallback.
        this.scene.scene.add(sceneKey, LEVEL_SCENES[1], false);
      }
    }

    // Ensure HUD is running.
    if (!this.scene.scene.isActive('HUD')) {
      this.scene.scene.launch('HUD');
    }

    // Stop any other active level scenes.
    this.scene.scene.getScenes(true).forEach(s => {
      if (s.scene.key.startsWith('Level') && s.scene.key !== sceneKey) {
        this.scene.scene.stop(s.scene.key);
        this.scene.scene.remove(s.scene.key);
      }
    });

    this.scene.scene.start(sceneKey, {
      levelNumber: this.currentLevelNumber,
      levelConfig: cfg,
    });

    // Tell HUD what to display.
    this.scene.events.emit('level:changed', {
      levelNumber: this.currentLevelNumber,
      objective: cfg.objective || 'Reach the goal.',
      totalLevels: this.totalLevels,
    });
  }

  restartLevel() {
    this.startLevel(this.currentLevelNumber);
  }

  nextLevel() {
    const next = Math.min(this.currentLevelNumber + 1, this.totalLevels);
    this.startLevel(next);
  }
}
