/**
 * CrystalManager.js
 * Спавнит кристаллы (diamond.glb) на сцене, обнаруживает сбор,
 * обновляет счётчик и сохраняет в БД через API.
 */

import { saveProgress } from './api.js';

const CRYSTAL_MODEL = 'assets/models/diamond.glb';
const COLLECT_RADIUS = 1.5;    // дистанция сбора (метры)
const SAVE_INTERVAL  = 5000;   // сохранять в БД каждые 5 секунд
const RESPAWN_DELAY  = 8000;   // кристалл возродится через 8 сек после сбора
const FLOAT_SPEED    = 1.2;    // скорость левитации
const FLOAT_AMP      = 0.25;   // амплитуда левитации
const ROTATE_SPEED   = 1.5;    // скорость вращения

export class CrystalManager {
  /**
   * @param {BABYLON.Scene} scene
   * @param {{ x: number, z: number, y?: number }[]} spawnPoints — точки спавна
   */
  constructor(scene, spawnPoints) {
    this._scene        = scene;
    this._spawnPoints  = spawnPoints;
    this._crystals     = [];   // { mesh, baseY, collected, respawnAt }
    this._totalCollected = 0;
    this._lastSaveAt   = 0;
    this._templateMesh = null; // загруженный .glb — используем как шаблон

    this._hudEl = document.getElementById('crystal-count');
  }

  /** Загружает модель и спавнит кристаллы. Вызвать один раз после build() сцены */
  async init(initialCrystals = 0) {
    this._totalCollected = initialCrystals;
    this._updateHUD();

    await this._loadTemplate();
    this._spawnPoints.forEach((pt, i) => this._spawnCrystal(pt, i));
  }

  /** Загрузить шаблон модели один раз */
  async _loadTemplate() {
    return new Promise((resolve) => {
      BABYLON.SceneLoader.ImportMesh(
        '', CRYSTAL_MODEL, '', this._scene,
        (meshes) => {
          console.log('[crystal] loaded meshes:', meshes.map(m => m.name));
          // Скрываем все — будем клонировать геометрию (не __root__)
          this._templateMeshes = meshes.filter(m => m.name !== '__root__');
          this._templateRoot   = meshes.find(m => m.name === '__root__') || meshes[0];

          meshes.forEach(m => { m.isVisible = false; m.setEnabled(false); });
          console.log('[crystal] template geometry meshes:', this._templateMeshes.map(m => m.name));
          resolve();
        },
        null,
        (_, msg) => {
          console.warn('[CrystalManager] Failed to load diamond.glb:', msg);
          this._templateMeshes = [];
          this._templateRoot   = null;
          resolve();
        }
      );
    });
  }

  /** Создать один кристалл в точке спавна */
  _spawnCrystal(pt, idx) {
    const baseY = pt.y ?? 1.0;
    let mesh;

    if (this._templateMeshes && this._templateMeshes.length > 0) {
      const source = this._templateMeshes[0];

      // Включаем источник на момент клонирования
      source.isVisible = true;
      source.setEnabled(true);
      mesh = source.clone(`crystal_${idx}`, null);
      source.isVisible = false;
      source.setEnabled(false);

      mesh.parent   = null;
      mesh.isVisible = true;
      mesh.setEnabled(true);
      mesh.scaling  = new BABYLON.Vector3(0.005, 0.005, 0.005);
      mesh.rotation = new BABYLON.Vector3(Math.PI, 0, 0);
      mesh.position = new BABYLON.Vector3(pt.x, baseY, pt.z);

      console.log(`[crystal ${idx}] spawned at`, pt.x, baseY, pt.z, '| visible:', mesh.isVisible, '| enabled:', mesh.isEnabled());
    }

    // Фоллбэк — октаэдр если модель не загрузилась
    if (!mesh) {
      console.log(`[crystal ${idx}] using fallback polyhedron`);
      mesh = BABYLON.MeshBuilder.CreatePolyhedron(`crystal_${idx}`, {
        type: 1, size: 0.35,
      }, this._scene);
      const mat = new BABYLON.StandardMaterial(`crystalMat_${idx}`, this._scene);
      mat.diffuseColor  = new BABYLON.Color3(0.6, 0.1, 1.0);
      mat.emissiveColor = new BABYLON.Color3(0.3, 0.0, 0.6);
      mat.specularColor = new BABYLON.Color3(1.0, 0.8, 1.0);
      mat.specularPower = 32;
      mesh.material = mat;
      mesh.position = new BABYLON.Vector3(pt.x, baseY, pt.z);
    }

    mesh.checkCollisions = false;
    this._crystals.push({ mesh, baseY, pt, idx, collected: false, respawnAt: 0, time: 0 });
  }

  /**
   * Вызывать каждый кадр из game loop
   * @param {BABYLON.Vector3} playerPos
   * @param {number} dt — delta time в секундах
   */
  update(playerPos, dt) {
    const now = performance.now();

    for (const crystal of this._crystals) {
      // Возрождение
      if (crystal.collected) {
        if (now >= crystal.respawnAt) {
          this._respawn(crystal);
        }
        continue;
      }

      crystal.time += dt;

      // Левитация и вращение
      crystal.mesh.position.y = crystal.baseY + Math.sin(crystal.time * FLOAT_SPEED) * FLOAT_AMP;
      crystal.mesh.rotation.y += ROTATE_SPEED * dt;

      // Проверка сбора
      const dx = playerPos.x - crystal.mesh.position.x;
      const dz = playerPos.z - crystal.mesh.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < COLLECT_RADIUS) {
        this._collect(crystal, now);
      }
    }

    // Периодическое сохранение в БД
    if (now - this._lastSaveAt > SAVE_INTERVAL) {
      this._save(playerPos);
      this._lastSaveAt = now;
    }
  }

  /** Собрать кристалл */
  _collect(crystal, now) {
    crystal.collected  = true;
    crystal.respawnAt  = now + RESPAWN_DELAY;
    crystal.mesh.setEnabled(false);

    this._totalCollected++;
    this._updateHUD();

    // Немедленно сохранить при сборе
    this._save();
  }

  /** Возродить кристалл */
  _respawn(crystal) {
    crystal.collected = false;
    crystal.time      = 0;
    crystal.mesh.setEnabled(true);
    crystal.mesh.position.set(crystal.pt.x, crystal.baseY, crystal.pt.z);
  }

  /** Сохранить в БД */
  async _save(playerPos) {
    const pos = playerPos ?? BABYLON.Vector3.Zero();
    await saveProgress({
      crystals: this._totalCollected,
      pos_x: Math.round(pos.x * 100) / 100,
      pos_y: Math.round(pos.z * 100) / 100,  // z как "y" на карте
    });
  }

  /** Обновить счётчик в HUD */
  _updateHUD() {
    if (this._hudEl) this._hudEl.textContent = this._totalCollected;
  }

  /** Освободить ресурсы при смене сцены */
  dispose() {
    this._crystals.forEach(c => c.mesh.dispose());
    this._crystals = [];
    if (this._templateMeshes) {
      this._templateMeshes.forEach(m => m.dispose());
      this._templateMeshes = [];
    }
    if (this._templateRoot) {
      this._templateRoot.dispose();
      this._templateRoot = null;
    }
  }

  get totalCollected() { return this._totalCollected; }
}
