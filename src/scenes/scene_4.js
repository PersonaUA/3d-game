import { SceneBase } from './SceneBase.js';

/**
 * SCENE 4 — Cable Ride
 * Платформы нанизаны на горизонтальные кабели как бусины.
 * Управление: стрелки ← → (ось X) или ↑ ↓ (ось Z).
 * Одно нажатие = один шаг (ширина платформы).
 * Игрок двигается вместе с платформой.
 */

const C  = BABYLON.Color3;
const C4 = BABYLON.Color4;

const STEP_DURATION = 0.44; // секунды на один шаг

// Движение платформы: sign(sin)*|sin|^p
// p < 1 — длинная пауза у краёв, быстро в середине
// 0.2 = очень долгая пауза, 0.4 = короткая
const SIN_POWER = 0.28;
function platEase(t) {
  const s = Math.sin(t);
  return Math.sign(s) * Math.pow(Math.abs(s), SIN_POWER);
}

const CABLE_LINES = [
  // Уровень 1 (y=3)
  { axis: 'x', y: 3, z: -4, from: -56, to: 56, platforms: [
    { id: 'p0', pos: -20, w: 2.5, d: 2.5, diff: new C(0.05, 0.28, 0.55), edge: new C(0.0, 0.6, 1.0),  min: -52, max: -2.5 },
    { id: 'p1', pos:  10, w: 2.5, d: 2.5, diff: new C(0.45, 0.07, 0.55), edge: new C(0.85, 0.1, 1.0), min:   2.5, max: 52 },
  ]},
  { axis: 'z', y: 3, x: 4, from: -56, to: 56, platforms: [
    { id: 'p2', pos: -20, w: 2.5, d: 2.5, diff: new C(0.04, 0.42, 0.32), edge: new C(0.0, 0.9, 0.55), min: -52, max: -2.5 },
    { id: 'p3', pos:  10, w: 2.5, d: 2.5, diff: new C(0.55, 0.06, 0.12), edge: new C(1.0, 0.1, 0.2),  min:   2.5, max: 52 },
  ]},

  // Уровень 2 (y=6)
  { axis: 'z', y: 6, x: -6, from: -56, to: 56, platforms: [
    { id: 'p4', pos: -20, w: 2.2, d: 2.2, diff: new C(0.05, 0.28, 0.55), edge: new C(0.0, 0.6, 1.0),  min: -52, max: -2.2 },
    { id: 'p5', pos:  10, w: 2.2, d: 2.2, diff: new C(0.55, 0.25, 0.04), edge: new C(1.0, 0.5, 0.0),  min:   2.2, max: 52 },
  ]},
  { axis: 'x', y: 6, z: 6, from: -56, to: 56, platforms: [
    { id: 'p6', pos: -20, w: 2.2, d: 2.2, diff: new C(0.45, 0.07, 0.55), edge: new C(0.85, 0.1, 1.0), min: -52, max: -2.2 },
    { id: 'p7', pos:  10, w: 2.2, d: 2.2, diff: new C(0.04, 0.42, 0.32), edge: new C(0.0, 0.9, 0.55), min:   2.2, max: 52 },
  ]},

  // Уровень 3 (y=9)
  { axis: 'x', y: 9, z: 0, from: -56, to: 56, platforms: [
    { id: 'p8', pos: -20, w: 2.0, d: 2.0, diff: new C(0.05, 0.28, 0.55), edge: new C(0.0, 0.6, 1.0),  min: -52, max: -2.0 },
    { id: 'p9', pos:  10, w: 2.0, d: 2.0, diff: new C(0.55, 0.06, 0.12), edge: new C(1.0, 0.1, 0.2),  min:   2.0, max: 52 },
  ]},
  { axis: 'z', y: 9, x: 0, from: -56, to: 56, platforms: [
    { id: 'p10', pos: -20, w: 2.0, d: 2.0, diff: new C(0.55, 0.25, 0.04), edge: new C(1.0, 0.5, 0.0), min: -52, max: -2.0 },
    { id: 'p11', pos:  10, w: 2.0, d: 2.0, diff: new C(0.45, 0.07, 0.55), edge: new C(0.85, 0.1, 1.0),min:   2.0, max: 52 },
  ]},

  // Финал (y=12)
  { axis: 'x', y: 12, z: 0, from: -56, to: 56, platforms: [
    { id: 'p12', pos: 0, w: 3.5, d: 3.5, diff: new C(0.4, 0.32, 0.02), edge: new C(1.0, 0.85, 0.0), min: -52, max: 52 },
  ]},
];

const CFG = {
  clearColor: new C4(0.03, 0.04, 0.10, 1),
  fogColor:   new C(0.03, 0.04, 0.10),
  fogDensity: 0.014,
  ground: { size: 200, baseColor: new C(0.06, 0.07, 0.12), gridMinorColor: '#1a1e2e', gridMajorColor: '#00ffcc14' },
  spawnPoint: new BABYLON.Vector3(0, 1, 0),
  hemiIntensity: 0.5,
  hemiDiffuse:   new BABYLON.Color3(0.8, 0.88, 1.0),
  hemiGround:    new BABYLON.Color3(0.3, 0.25, 0.45),
  sunIntensity:  0.4,
  crystalSpawns: [
    { x: -8, z: -4, y: 3.6 }, { x:  6, z: -4, y: 3.6 },
    { x:  4, z: -6, y: 3.6 }, { x:  4, z:  8, y: 3.6 },
    { x: -6, z:  6, y: 6.6 }, { x:  4, z:  6, y: 6.6 },
    { x: -8, z:  6, y: 6.6 }, { x: -6, z:  9, y: 9.6 },
    { x:  6, z:  9, y: 9.6 }, { x:  0, z:  0, y: 12.6 },
  ],
};

export class Scene4 extends SceneBase {
  get clearColor()    { return CFG.clearColor; }
  get fogColor()      { return CFG.fogColor; }
  get fogDensity()    { return CFG.fogDensity; }
  get spawnPoint()    { return CFG.spawnPoint; }
  get crystalSpawns() { return CFG.crystalSpawns; }
  get crystalRespawn(){ return Infinity; }
  get hemiIntensity() { return CFG.hemiIntensity; }
  get hemiDiffuse()   { return CFG.hemiDiffuse; }
  get hemiGround()    { return CFG.hemiGround; }
  get sunIntensity()  { return CFG.sunIntensity; }

  _platforms    = [];
  _activePlat   = null;
  _characterPos = null;
  _characterRef = null;

  // Анимация шага
  _stepping  = false;
  _stepPlat  = null;
  _stepFrom  = 0;
  _stepTo    = 0;
  _stepT     = 0;

  // Защита от autorepeat
  _keyConsumed = {};

  build() {
    this._buildGround(CFG.ground);
    this._buildStartPad();
    CABLE_LINES.forEach((line, li) => this._buildCableLine(line, li));
    this._buildArrowHint();
    this._bindKeys();
  }

  _buildStartPad() {
    const pad = BABYLON.MeshBuilder.CreateBox('startPad', { width: 4, height: 0.4, depth: 4 }, this.scene);
    pad.position.set(0, 0.2, 0);
    pad.checkCollisions = true;
    this.shadowGen.addShadowCaster(pad);
    const mat = new BABYLON.StandardMaterial('startPadMat', this.scene);
    mat.diffuseColor  = new C(0.05, 0.28, 0.55);
    mat.specularColor = new C(0.04, 0.04, 0.06);
    pad.material = mat;
    const rim = BABYLON.MeshBuilder.CreateBox('startRim', { width: 4.07, height: 0.05, depth: 4.07 }, this.scene);
    rim.position.set(0, 0.425, 0);
    const rimMat = new BABYLON.StandardMaterial('startRimMat', this.scene);
    rimMat.emissiveColor = new C(0.0, 0.6, 1.0);
    rimMat.disableLighting = true;
    rim.material = rimMat;
    this._meshes.push(pad, rim);
  }

  _buildCableLine(line, li) {
    const { axis, y } = line;
    const fixedCoord = axis === 'x' ? line.z : line.x;
    const len = line.to - line.from;

    // Два параллельных кабеля — матовый угольный материал, ноль бликов
    [-0.5, 0.5].forEach((off, oi) => {
      const cable = BABYLON.MeshBuilder.CreateCylinder(`cable_${li}_${oi}`, {
        height: len, diameterTop: 0.02, diameterBottom: 0.02, tessellation: 4,
      }, this.scene);

      if (axis === 'x') {
        cable.rotation.z = Math.PI / 2;
        cable.position.set(line.from + len / 2, y, fixedCoord + off);
      } else {
        cable.rotation.x = Math.PI / 2;
        cable.position.set(fixedCoord + off, y, line.from + len / 2);
      }

      const mat = new BABYLON.StandardMaterial(`cableMat_${li}_${oi}`, this.scene);
      mat.diffuseColor  = new C(0.07, 0.07, 0.08);
      mat.specularColor = new C(0, 0, 0);
      mat.emissiveColor = new C(0.03, 0.03, 0.04);
      cable.material = mat;
      this._meshes.push(cable);
    });

    line.platforms.forEach((pcfg, pi) => this._buildMovablePlatform(pcfg, line, li, pi));
  }

  _buildMovablePlatform(pcfg, line, li, pi) {
    const { axis, y } = line;
    const fixedCoord = axis === 'x' ? line.z : line.x;
    const { w, d, diff, edge } = pcfg;
    const h = 0.4;

    const box = BABYLON.MeshBuilder.CreateBox(`plat_${li}_${pi}`, { width: w, height: h, depth: d }, this.scene);
    if (axis === 'x') box.position.set(pcfg.pos, y - h / 2, fixedCoord);
    else              box.position.set(fixedCoord, y - h / 2, pcfg.pos);

    box.checkCollisions = true;
    this.shadowGen.addShadowCaster(box);

    const mat = new BABYLON.StandardMaterial(`platMat_${li}_${pi}`, this.scene);
    mat.diffuseColor  = diff;
    mat.specularColor = new C(0.08, 0.08, 0.1);
    box.material = mat;

    const rim = BABYLON.MeshBuilder.CreateBox(`rim_${li}_${pi}`, { width: w + 0.07, height: 0.05, depth: d + 0.07 }, this.scene);
    rim.position.copyFrom(box.position);
    rim.position.y = y + 0.025;
    const rimMat = new BABYLON.StandardMaterial(`rimMat_${li}_${pi}`, this.scene);
    rimMat.emissiveColor   = edge;
    rimMat.disableLighting = true;
    rim.material = rimMat;

    this._meshes.push(box, rim);
    // Случайная фаза синуса чтобы платформы двигались вразнобой
    const sinPhase = Math.random() * Math.PI * 2;
    const sinSpeed = 0.3 + Math.random() * 0.25; // 0.30–0.55 rad/s
    this._platforms.push({ box, rim, line, pcfg, currentPos: pcfg.pos, size: w,
      sinPhase, sinSpeed,
      sinTime: sinPhase, // накапливаем время
      controlled: false, // true когда игрок на платформе
    });
  }

  _buildArrowHint() {
    const hint = document.createElement('div');
    hint.id = 'cable-hint';
    hint.style.cssText = `
      position:fixed; bottom:140px; left:50%; transform:translateX(-50%);
      color:#00ffcc55; font-size:10px; font-family:'Courier New',monospace;
      letter-spacing:0.15em; text-transform:uppercase;
      pointer-events:none; text-align:center;
    `;
    hint.innerHTML = '← → ↑ ↓ &nbsp;·&nbsp; move platform';
    document.body.appendChild(hint);
    this._hintEl = hint;
  }

  _bindKeys() {
    this._onKeyDown = e => {
      if (this._keyConsumed[e.code]) return;
      this._keyConsumed[e.code] = true;

      const plat = this._activePlat;
      if (!plat || this._stepping) return;

      const axis = plat.line.axis;
      let dir = 0;
      if (axis === 'x') {
        if (e.code === 'ArrowLeft')  dir = -1;
        if (e.code === 'ArrowRight') dir =  1;
      } else {
        if (e.code === 'ArrowUp')   dir = -1;
        if (e.code === 'ArrowDown') dir =  1;
      }
      if (dir !== 0) this._startStep(plat, dir);
    };

    this._onKeyUp = e => { delete this._keyConsumed[e.code]; };

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup',   this._onKeyUp);
  }

  _startStep(plat, dir) {
    const step    = plat.size * dir;
    const raw     = Math.max(plat.pcfg.min, Math.min(plat.pcfg.max, plat.currentPos + step));
    const newPos  = this._resolveCollision(plat, raw);
    if (Math.abs(newPos - plat.currentPos) < 0.01) return;

    this._stepping = true;
    this._stepPlat = plat;
    this._stepFrom = plat.currentPos;
    this._stepTo   = newPos;
    this._stepT    = 0;
  }

  // Не даём платформам проникать друг в друга на одном кабеле
  _resolveCollision(movingPlat, desiredPos) {
    const siblings  = this._platforms.filter(p => p !== movingPlat && p.line === movingPlat.line);
    const halfSize  = movingPlat.size / 2;
    let pos         = desiredPos;

    for (const sib of siblings) {
      const sibHalf = sib.size / 2;
      const gap     = halfSize + sibHalf;

      if (desiredPos > movingPlat.currentPos) {
        // движение вправо/вперёд — не перекрывать следующую платформу
        if (sib.currentPos > movingPlat.currentPos) {
          pos = Math.min(pos, sib.currentPos - gap);
        }
      } else {
        // движение влево/назад — не перекрывать предыдущую платформу
        if (sib.currentPos < movingPlat.currentPos) {
          pos = Math.max(pos, sib.currentPos + gap);
        }
      }
    }
    return pos;
  }

  update(dt) {
    if (!this._characterPos) return;
    const charPos = this._characterPos;

    // Определяем активную платформу под игроком
    const prevActive = this._activePlat;
    this._activePlat = null;
    for (const plat of this._platforms) {
      const { box, size } = plat;
      const platTopY = box.position.y + 0.2;
      const inX = Math.abs(charPos.x - box.position.x) < size * 0.6;
      const inZ = Math.abs(charPos.z - box.position.z) < size * 0.6;
      const inY = charPos.y > platTopY - 0.5 && charPos.y < platTopY + 2.5;
      if (inX && inZ && inY) { this._activePlat = plat; break; }
    }

    // Помечаем controlled / free
    for (const plat of this._platforms) {
      plat.controlled = (plat === this._activePlat);
    }

    // ── Автодвижение свободных платформ (синус) ──
    for (const plat of this._platforms) {
      if (plat.controlled || plat === this._stepPlat) continue;

      plat.sinTime += dt * plat.sinSpeed;
      const amp    = (plat.pcfg.max - plat.pcfg.min) / 2;
      const center = (plat.pcfg.max + plat.pcfg.min) / 2;
      const newPos = center + platEase(plat.sinTime) * amp;

      const delta = newPos - plat.currentPos;
      plat.currentPos = newPos;

      const { box, rim, line } = plat;
      if (line.axis === 'x') { box.position.x = newPos; rim.position.x = newPos; }
      else                   { box.position.z = newPos; rim.position.z = newPos; }
    }

    // ── Анимация дискретного шага (управляемая платформа) ──
    if (this._stepping && this._stepPlat) {
      this._stepT += dt / STEP_DURATION;
      const t    = Math.min(1, this._stepT);
      const ease = 1 - (1 - t) * (1 - t);
      const newPos = this._stepFrom + (this._stepTo - this._stepFrom) * ease;
      const delta  = newPos - this._stepPlat.currentPos;

      this._stepPlat.currentPos = newPos;

      // Синхронизируем sinTime с текущей позицией чтобы не было рывка
      // когда игрок сойдёт с платформы
      const { box, rim, line, pcfg } = this._stepPlat;
      const amp    = (pcfg.max - pcfg.min) / 2;
      const center = (pcfg.max + pcfg.min) / 2;
      if (amp > 0) {
        const sinVal = Math.max(-1, Math.min(1, (newPos - center) / amp));
        this._stepPlat.sinTime = Math.asin(sinVal);
      }

      if (line.axis === 'x') { box.position.x = newPos; rim.position.x = newPos; }
      else                   { box.position.z = newPos; rim.position.z = newPos; }

      // Двигаем персонажа синхронно
      if (this._characterRef && this._activePlat === this._stepPlat) {
        if (line.axis === 'x') this._characterRef.position.x += delta;
        else                   this._characterRef.position.z += delta;
      }

      if (t >= 1) {
        this._stepPlat.currentPos = this._stepTo;
        this._stepping = false;
        this._stepPlat = null;
      }
    }
  }

  setCharacterPos(pos) { this._characterPos = pos; }
  setCharacterRef(ref) { this._characterRef = ref; }

  dispose() {
    super.dispose();
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup',   this._onKeyUp);
    if (this._hintEl) this._hintEl.remove();
  }
}
