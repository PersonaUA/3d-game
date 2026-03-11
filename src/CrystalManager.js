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
    return new Promise((resolve, reject) => {
      BABYLON.SceneLoader.ImportMesh(
        '', CRYSTAL_MODEL, '', this._scene,
        (meshes) => {
          // Скрываем шаблон — будем клонировать
          meshes.forEach(m => { m.isVisible = false; m.setEnabled(false); });
          this._templateMesh = meshes[0];
          resolve();
        },
        null,
        (_, msg) => {
          console.warn('[CrystalManager] Failed to load diamond.glb:', msg);
          // Фоллбэк — создаём простой октаэдр
          this._templateMesh = null;
          resolve();
        }
      );
    });
  }

  /** Создать один кристалл в точке спавна */
  _spawnCrystal(pt, idx) {
    const baseY = pt.y ?? 1.0;
    let mesh;

    if (this._templateMesh) {
      mesh = this._templateMesh.clone(`crystal_${idx}`);
      mesh.setEnabled(true);
      mesh.isVisible = true;
      // Клонируем дочерние меши тоже
      this._templateMesh.getChildMeshes().forEach((child, ci) => {
        const childClone = child.clone(`crystal_${idx}_child_${ci}`);
        childClone.parent = mesh;
        childClone.isVisible = true;
      });
      mesh.scaling = new BABYLON.Vector3(0.5, 0.5, 0.5);
    } else {
      // Фоллбэк — сиреневый октаэдр
      mesh = BABYLON.MeshBuilder.CreatePolyhedron(`crystal_${idx}`, {
        type: 1, size: 0.35,
      }, this._scene);
      const mat = new BABYLON.StandardMaterial(`crystalMat_${idx}`, this._scene);
      mat.diffuseColor  = new BABYLON.Color3(0.6, 0.1, 1.0);
      mat.emissiveColor = new BABYLON.Color3(0.3, 0.0, 0.6);
      mat.specularColor = new BABYLON.Color3(1.0, 0.8, 1.0);
      mat.specularPower = 32;
      mesh.material = mat;
    }

    mesh.position = new BABYLON.Vector3(pt.x, baseY, pt.z);
    mesh.checkCollisions = false;

    // Свечение вокруг кристалла
    const glow = new BABYLON.PointLight(`crystalGlow_${idx}`, mesh.position.clone(), this._scene);
    glow.diffuse   = new BABYLON.Color3(0.7, 0.3, 1.0);
    glow.intensity = 0.8;
    glow.range     = 3.0;

    this._crystals.push({ mesh, glow, baseY, pt, idx, collected: false, respawnAt: 0, time: 0 });
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
      crystal.glow.position.copyFrom(crystal.mesh.position);
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
    crystal.glow.setEnabled(false);

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
    crystal.glow.setEnabled(true);
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
    this._crystals.forEach(c => {
      c.mesh.dispose();
      c.glow.dispose();
    });
    this._crystals = [];
    if (this._templateMesh) {
      this._templateMesh.dispose();
      this._templateMesh = null;
    }
  }

  get totalCollected() { return this._totalCollected; }
}
