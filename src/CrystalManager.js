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
const RESPAWN_DELAY  = Infinity; // 8000;
const FLOAT_SPEED    = 1.2;
const FLOAT_AMP      = 0.1;
const ROTATE_SPEED   = 1.0;

let _audioCtx = null;
function getAudioContext() {
  if (!_audioCtx || _audioCtx.state === 'closed') {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return _audioCtx;
}

/** Генерирует стеклянный звон через Web Audio API — без внешних файлов */
function playCollectSound() {
  try {
    const ctx  = getAudioContext();
    const now  = ctx.currentTime;

    // Удар — короткий импульс шума (имитация стекла)
    const bufferSize = ctx.sampleRate * 0.05;
    const buffer     = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data       = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 8);
    }
    const noise     = ctx.createBufferSource();
    noise.buffer    = buffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.06, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    // Полосовой фильтр — оставляем только высокие частоты стекла
    const filter           = ctx.createBiquadFilter();
    filter.type            = 'bandpass';
    filter.frequency.value = 4000;
    filter.Q.value         = 0.8;

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    // Тихий резонанс после удара
    const osc      = ctx.createOscillator();
    const oscGain  = ctx.createGain();
    osc.type       = 'sine';
    osc.frequency.setValueAtTime(2200, now);

    osc.frequency.exponentialRampToValueAtTime(1800, now + 0.25);
    oscGain.gain.setValueAtTime(0.05, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.05);
    osc.start(now);
    osc.stop(now + 0.10);

    //setTimeout(() => ctx.close(), 250);
  } catch (e) {}
}

export class CrystalManager {

  constructor(scene, spawnPoints, respawnDelay = 15000, onCollect = null) {
    this._onCollect = onCollect;
    this._respawnDelay = respawnDelay;
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

  // hideRemote(index) {
    
  //   console.log(`[crystal] hideRemote index=${index}, crystals count=${this._crystals.length}`);
    
  //   const crystal = this._crystals[index];
    
  //   console.log(`[crystal] found:`, crystal);

  //   if (!crystal || crystal.collected) return;
  //   crystal.collected = true;
  //   crystal.mesh.setEnabled(false);
  // }

  hideRemote(index) {
    // было: const crystal = this._crystals[index];
    const crystal = this._crystals.find(c => c.index === index);
    if (!crystal || crystal.collected) return;
    crystal.collected = true;
    crystal.mesh.setEnabled(false);
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
      root.scaling  = new BABYLON.Vector3(0.003, 0.003, 0.003);
      //root.rotation = new BABYLON.Vector3(Math.PI, 0, 0); // острие вниз



      // Все дочерние меши тоже делаем видимыми
      result.meshes.forEach(m => {
        m.isVisible       = true;
        m.checkCollisions = false;

        if (m.name !== '__root__') {
          const mat         = new BABYLON.PBRMaterial(`diamondMat_${idx}`, this._scene);
          mat.albedoColor   = new BABYLON.Color3(0.8, 0.9, 1.0);  // голубоватый
          mat.metallic      = 1.0;
          mat.roughness     = 0.05;   // идеально гладкий — максимальные отражения
          mat.alpha         = 0.7;  // немного прозрачный
          mat.roughness = 0.3;
          //mat.emissiveColor = new BABYLON.Color3(0.04, 0.1, 0.1);
          mat.backFaceCulling = false;
          mat.twoSidedLighting = true;
          m.material = mat;
        }
      });

      console.log(`[crystal ${idx}] ok | pos: ${pt.x},${baseY},${pt.z}`);
      this._crystals.push({ mesh: root, baseY, pt, index: idx, collected: false, respawnAt: 0, time: 0 });

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
    this._crystals.push({ mesh, baseY, pt, index: idx, collected: false, respawnAt: 0, time: 0 });
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

    // Периодическое сохранение в БД
    if (now - this._lastSaveAt > SAVE_INTERVAL) {
      this._lastSaveAt = now; // обновляем сразу, не ждём ответа
      this._save(playerPos);  // без await — не блокируем game loop
    }

  }

  _collect(crystal, now) {

    console.log('[crystal] collecting index:', crystal.index);

    crystal.collected = true;
    crystal.respawnAt = now + RESPAWN_DELAY;
    crystal.mesh.setEnabled(false);
    this._totalCollected++;
    this._updateHUD();
    playCollectSound();
    this._save(); // без await

    // Уведомляем сервер
    if (this._onCollect) this._onCollect(crystal.index);
  }

  _respawn(crystal) {
    crystal.collected = false;
    crystal.time      = 0;
    crystal.mesh.setEnabled(true);
    crystal.mesh.position.set(crystal.pt.x, crystal.baseY, crystal.pt.z);
  }

  _save(playerPos) {
    const pos = playerPos ?? BABYLON.Vector3.Zero();
    // Запускаем и забываем — ошибки уже логируются внутри saveProgress
    saveProgress({
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
