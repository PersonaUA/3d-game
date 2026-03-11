/**
 * CrystalManager.js
 * Спавнит кристаллы (diamond.glb) на сцене, обнаруживает сбор,
 * обновляет счётчик и сохраняет в БД через API.
 *
 * Логика загрузки модели основана на рабочем Diamond.js —
 * используем ImportMeshAsync, берём meshes[0] (__root__),
 * сбрасываем rotationQuaternion перед установкой rotation.
 */

import { saveProgress } from './api.js';

const CRYSTAL_MODEL  = 'assets/models/diamond.glb';
const COLLECT_RADIUS = 1.5;
const SAVE_INTERVAL  = 5000;
const RESPAWN_DELAY  = 8000;
const FLOAT_SPEED    = 1.2;
const FLOAT_AMP      = 0.25;
const ROTATE_SPEED   = 1.0;

export class CrystalManager {
  constructor(scene, spawnPoints) {
    this._scene          = scene;
    this._spawnPoints    = spawnPoints;
    this._crystals       = [];
    this._totalCollected = 0;
    this._lastSaveAt     = 0;
    this._hudEl          = document.getElementById('crystal-count');
  }

  async init(initialCrystals = 0) {
    this._totalCollected = initialCrystals;
    this._updateHUD();
    await Promise.all(this._spawnPoints.map((pt, i) => this._spawnCrystal(pt, i)));
    console.log(`[CrystalManager] ${this._crystals.length} crystals ready`);
  }

  async _spawnCrystal(pt, idx) {
    const baseY = pt.y ?? 1.0;

    try {
      const result = await BABYLON.SceneLoader.ImportMeshAsync(
        '', CRYSTAL_MODEL, '', this._scene
      );

      if (!result.meshes?.length) throw new Error('No meshes');

      // meshes[0] — __root__, содержит всю иерархию
      const root = result.meshes[0];

      // Сбрасываем кватернион — иначе rotation не работает
      root.rotationQuaternion = null;

      root.setEnabled(true);
      root.position = new BABYLON.Vector3(pt.x, baseY, pt.z);
      root.scaling  = new BABYLON.Vector3(0.005, 0.005, 0.005);
      //root.rotation = new BABYLON.Vector3(Math.PI, 0, 0); // острие вниз

      // Все дочерние меши тоже делаем видимыми
      result.meshes.forEach(m => {
        m.isVisible       = true;
        m.checkCollisions = false;
      });

      console.log(`[crystal ${idx}] ok | pos: ${pt.x},${baseY},${pt.z}`);
      this._crystals.push({ mesh: root, baseY, pt, idx, collected: false, respawnAt: 0, time: 0 });

    } catch (err) {
      console.warn(`[crystal ${idx}] load failed:`, err.message, '— using fallback');
      this._spawnFallback(pt, idx);
    }
  }

  _spawnFallback(pt, idx) {
    const baseY = pt.y ?? 1.0;
    const mesh  = BABYLON.MeshBuilder.CreatePolyhedron(`crystal_fallback_${idx}`, {
      type: 1, size: 0.35,
    }, this._scene);
    // const mat = new BABYLON.StandardMaterial(`crystalMat_${idx}`, this._scene);
    // mat.diffuseColor  = new BABYLON.Color3(0.6, 0.1, 1.0);
    // mat.emissiveColor = new BABYLON.Color3(0.3, 0.0, 0.5);
    // mat.specularColor = new BABYLON.Color3(1.0, 0.8, 1.0);
    // mat.specularPower = 32;
    // mesh.material     = mat;
    mesh.position     = new BABYLON.Vector3(pt.x, baseY, pt.z);
    mesh.checkCollisions = false;
    this._crystals.push({ mesh, baseY, pt, idx, collected: false, respawnAt: 0, time: 0 });
  }

  update(playerPos, dt) {
    const now = performance.now();

    for (const crystal of this._crystals) {
      if (crystal.collected) {
        if (now >= crystal.respawnAt) this._respawn(crystal);
        continue;
      }

      crystal.time += dt;

      // Левитация
      crystal.mesh.position.y = crystal.baseY + Math.sin(crystal.time * FLOAT_SPEED) * FLOAT_AMP;
      // Вращение
      crystal.mesh.rotation.y += ROTATE_SPEED * dt;

      // Проверка сбора
      const dx   = playerPos.x - crystal.mesh.position.x;
      const dz   = playerPos.z - crystal.mesh.position.z;
      if (Math.sqrt(dx * dx + dz * dz) < COLLECT_RADIUS) this._collect(crystal, now);
    }

    if (now - this._lastSaveAt > SAVE_INTERVAL) {
      this._save(playerPos);
      this._lastSaveAt = now;
    }
  }

  _collect(crystal, now) {
    crystal.collected = true;
    crystal.respawnAt = now + RESPAWN_DELAY;
    crystal.mesh.setEnabled(false);
    this._totalCollected++;
    this._updateHUD();
    this._save();
  }

  _respawn(crystal) {
    crystal.collected = false;
    crystal.time      = 0;
    crystal.mesh.setEnabled(true);
    crystal.mesh.position.set(crystal.pt.x, crystal.baseY, crystal.pt.z);
  }

  async _save(playerPos) {
    const pos = playerPos ?? BABYLON.Vector3.Zero();
    await saveProgress({
      crystals: this._totalCollected,
      pos_x:    Math.round(pos.x * 100) / 100,
      pos_y:    Math.round(pos.z * 100) / 100,
    });
  }

  _updateHUD() {
    if (this._hudEl) this._hudEl.textContent = this._totalCollected;
  }

  dispose() {
    this._crystals.forEach(c => c.mesh.dispose());
    this._crystals = [];
  }

  get totalCollected() { return this._totalCollected; }
}
