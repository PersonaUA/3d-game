import { SceneBase } from './SceneBase.js';

/**
 * SCENE 5 — Cable Grid
 *
 * Сетка 3×3 стационарных платформ 2×2.
 * Между ними — кабели с подвижными тележками 1×1.
 * Тележки курсируют между соседними станциями автоматически.
 * Игрок запрыгивает на тележку — она останавливается и управляется стрелками.
 *
 * Нумерация станций (вид сверху):
 *   [0,0] [1,0] [2,0]
 *   [0,1] [1,1] [2,1]   ← спавн на [1,1] (центр)
 *   [0,2] [1,2] [2,2]
 *
 * Расстояние между центрами станций = GRID_STEP.
 * Тележка курсирует: от края ближней станции до края дальней (не заезжая на них).
 */

const SIN_POWER = 0.85; // 0.4 - короткая пауза на остановке, 0.2 - длинная
const MAX_SPEED = 0.2;
const MAX_RANDOM_K_SPEED = 0.02;


const C  = BABYLON.Color3;
const C4 = BABYLON.Color4;

// ── Геометрия сетки ───────────────────────────────────────────────────────────
const STATION_SIZE = 6.0;   // размер стационарной платформы (2× "подвижная единица" = 2×2 ≈ 4 ед.)
const TROLLEY_SIZE = 2.0;   // размер тележки (1×1 ≈ 2 ед.)

const RAIL_H      = 1.0;   // высота поручня над платформой
const RAIL_D      = 0.035; // диаметр трубы поручня
const GATE_W      = TROLLEY_SIZE + 0.6; // ширина прохода (тележка + зазор)   // размер стационарной платформы (2× "подвижная единица" = 2×2 ≈ 4 ед.)

const GRID_STEP    = 100.0;  // расстояние между центрами станций
const LEVEL_Y      = 2.0;   // высота уровня (topY)
const PLAT_H       = 0.4;   // толщина платформы

// Отступ тележки от края станции (зазор)
const GAP = 0.1;
// Полупуть тележки: от центра одной станции до центра другой — ст. полуразмер — GAP
const HALF_TRAVEL  = (GRID_STEP - STATION_SIZE) / 2 - TROLLEY_SIZE / 2 - GAP;

// Цвета станций (3×3)
const STATION_COLORS = [
  [new C(0.05, 0.28, 0.55), new C(0.0,  0.6,  1.0) ],  // 0,0 — синий
  [new C(0.04, 0.42, 0.32), new C(0.0,  0.9,  0.55)],  // 1,0 — зелёный
  [new C(0.45, 0.07, 0.55), new C(0.85, 0.1,  1.0) ],  // 2,0 — фиолетовый
  [new C(0.55, 0.06, 0.12), new C(1.0,  0.1,  0.2) ],  // 0,1 — красный
  [new C(0.35, 0.28, 0.04), new C(1.0,  0.85, 0.0) ],  // 1,1 — золотой (центр)
  [new C(0.04, 0.35, 0.42), new C(0.0,  0.85, 1.0) ],  // 2,1 — голубой
  [new C(0.42, 0.22, 0.04), new C(1.0,  0.55, 0.0) ],  // 0,2 — оранжевый
  [new C(0.05, 0.28, 0.55), new C(0.0,  0.6,  1.0) ],  // 1,2 — синий
  [new C(0.28, 0.04, 0.42), new C(0.7,  0.0,  1.0) ],  // 2,2 — пурпурный
];

// Цвета тележек (по строкам и столбцам — горизонтальные/вертикальные)
const TROLLEY_COLORS_H = [
  new C(0.0, 1.0, 0.85), // ряд 0
  new C(1.0, 0.5, 0.0),  // ряд 1
  new C(0.7, 0.0, 1.0),  // ряд 2
];
const TROLLEY_COLORS_V = [
  new C(1.0, 0.1, 0.3),  // колонка 0
  new C(0.0, 0.6, 1.0),  // колонка 1
  new C(0.2, 1.0, 0.4),  // колонка 2
];



function platEase(t) {
  const s = Math.sin(t);
  return Math.sign(s) * Math.pow(Math.abs(s), SIN_POWER);
}


const CFG = {
  clearColor: new C4(0.03, 0.04, 0.10, 1),
  fogColor:   new C(0.03, 0.04, 0.10),
  fogDensity: 0.012,
  ground: { size: 300, baseColor: new C(0.06, 0.07, 0.12), gridMinorColor: '#1a1e2e', gridMajorColor: '#00ffcc14' },
  hemiIntensity: 0.7,
  hemiDiffuse:   new BABYLON.Color3(0.8, 0.88, 1.0),
  hemiGround:    new BABYLON.Color3(0.3, 0.25, 0.45),
  sunIntensity:  0.7,
};

export class Scene5 extends SceneBase {
  get clearColor()    { return CFG.clearColor; }
  get fogColor()      { return CFG.fogColor; }
  get fogDensity()    { return CFG.fogDensity; }
  get hemiIntensity() { return CFG.hemiIntensity; }
  get hemiDiffuse()   { return CFG.hemiDiffuse; }
  get hemiGround()    { return CFG.hemiGround; }
  get sunIntensity()  { return CFG.sunIntensity; }
  get crystalRespawn(){ return Infinity; }

  // Спавн на центральной станции
  get spawnPoint() {
    return new BABYLON.Vector3(GRID_STEP, LEVEL_Y + 1.0, GRID_STEP);
  }

  get crystalSpawns() {
    // По одному кристаллу над каждой станцией
    return [0,1,2].flatMap(col =>
      [0,1,2].map(row => ({
        x: col * GRID_STEP,
        z: row * GRID_STEP,
        y: LEVEL_Y + 0.7,
      }))
    );
  }

  _trolleys     = [];   // подвижные платформы
  _activeTrolley = null;

   // Аудио тележки
  _audioCtx   = null;
  _audioOsc   = null;  // осциллятор
  _audioGain  = null;  // громкость
  _audioSpeed = 0;     // текущая «скорость» тележки (abs delta/dt)
  _characterPos  = null;
  _characterRef  = null;


  _characterPos  = null;
  _characterRef  = null;



  build() {
    this._buildGround(CFG.ground);
    this._buildStations();
    this._buildCables();
    this._buildTrolleys();
    this._buildHint();
  }

  // ── 3×3 стационарных платформы ───────────────────────────────────────────
  _buildStations() {
    for (let col = 0; col < 3; col++) {
      for (let row = 0; row < 3; row++) {
        const ci = col * 3 + row;
        const [diff, edge] = STATION_COLORS[ci];
        const x = col * GRID_STEP;
        const z = row * GRID_STEP;

        this._buildPlatform(
          { x, z, w: STATION_SIZE, d: STATION_SIZE, h: PLAT_H, topY: LEVEL_Y },
          diff, edge, `s_${col}_${row}`
        );

        // Декоративный номер-столбик в центре станции (тонкий цилиндр)
        // const pillar = BABYLON.MeshBuilder.CreateCylinder(`pillar_${col}_${row}`, {
        //   height: 4.0, diameter: 0.2, tessellation: 8,
        // }, this.scene);
        // pillar.position.set(x, LEVEL_Y + 2.0, z);
        // const pMat = new BABYLON.StandardMaterial(`pillarMat_${col}_${row}`, this.scene);
        // pMat.emissiveColor   = edge;
        // pMat.disableLighting = true;
        // pillar.material = pMat;
        // this._meshes.push(pillar);

        // const beacon = BABYLON.MeshBuilder.CreateSphere(`beacon_${col}_${row}`, {
        //   diameter: 0.6, segments: 6,
        // }, this.scene);
        // beacon.position.set(x, LEVEL_Y + 4.3, z);
        // const bMat = new BABYLON.StandardMaterial(`beaconMat_${col}_${row}`, this.scene);
        // bMat.emissiveColor   = edge;
        // bMat.disableLighting = true;
        // beacon.material = bMat;
        // this._meshes.push(beacon);

        // Поручни
        this._buildRailing(x, z, edge, col, row);
      }
    }
  }

  /**
   * Поручни по периметру платформы с проходами на каждой стороне.
   * Стороны: N(−Z), S(+Z), W(−X), E(+X).
   * Проход открыт если с этой стороны есть кабель (не крайняя платформа).
   * На угловых/крайних платформах — сторона без кабеля закрыта полностью.
   */
  /**
   * Поручни по периметру платформы с проходами на каждой стороне.
   * Стороны: N(−Z), S(+Z), W(−X), E(+X).
   * Проход открыт если с этой стороны есть кабель (не крайняя платформа).
   * На угловых/крайних платформах — сторона без кабеля закрыта полностью.
   */
  _buildRailing(cx, cz, color, col, row) {
    const railMat = new BABYLON.StandardMaterial(`railMat_${col}_${row}`, this.scene);
    railMat.diffuseColor  = new BABYLON.Color3(0.07, 0.07, 0.08);
    railMat.specularColor = new BABYLON.Color3(0, 0, 0);
    railMat.emissiveColor = color.scale(0.18);

    const platTop = LEVEL_Y + PLAT_H / 2;  // верхняя плоскость платформы
    const railBot = platTop;                 // нижний поручень (нижняя труба)
    const railTop = platTop + RAIL_H;        // верхний поручень
    const railMid = platTop + RAIL_H / 2;   // середина для вертикальных стоек
    const half    = STATION_SIZE / 2;
    const gHalf   = GATE_W / 2;

    // ── Горизонтальный сегмент нижней трубы вдоль X ──
    const segXBot = (x1, x2, zPos) => {
      const len = Math.abs(x2 - x1);
      if (len < 0.05) return;
      const s = BABYLON.MeshBuilder.CreateCylinder(`rXb_${col}_${row}_${x1}t${x2}_${zPos}`,
        { height: len, diameterTop: RAIL_D, diameterBottom: RAIL_D, tessellation: 4 }, this.scene);
      s.rotation.z = Math.PI / 2;
      s.position.set(cx + (x1 + x2) / 2, railBot, cz + zPos);
      s.material = railMat;
      this._meshes.push(s);
    };

    // ── Горизонтальный сегмент верхней трубы вдоль X ──
    const segXTop = (x1, x2, zPos) => {
      const len = Math.abs(x2 - x1);
      if (len < 0.05) return;
      const s = BABYLON.MeshBuilder.CreateCylinder(`rXt_${col}_${row}_${x1}t${x2}_${zPos}`,
        { height: len, diameterTop: RAIL_D, diameterBottom: RAIL_D, tessellation: 4 }, this.scene);
      s.rotation.z = Math.PI / 2;
      s.position.set(cx + (x1 + x2) / 2, railTop, cz + zPos);
      s.material = railMat;
      this._meshes.push(s);
    };

    // ── Горизонтальный сегмент нижней трубы вдоль Z ──
    const segZBot = (z1, z2, xPos) => {
      const len = Math.abs(z2 - z1);
      if (len < 0.05) return;
      const s = BABYLON.MeshBuilder.CreateCylinder(`rZb_${col}_${row}_${z1}t${z2}_${xPos}`,
        { height: len, diameterTop: RAIL_D, diameterBottom: RAIL_D, tessellation: 4 }, this.scene);
      s.rotation.x = Math.PI / 2;
      s.position.set(cx + xPos, railBot, cz + (z1 + z2) / 2);
      s.material = railMat;
      this._meshes.push(s);
    };

    // ── Горизонтальный сегмент верхней трубы вдоль Z ──
    const segZTop = (z1, z2, xPos) => {
      const len = Math.abs(z2 - z1);
      if (len < 0.05) return;
      const s = BABYLON.MeshBuilder.CreateCylinder(`rZt_${col}_${row}_${z1}t${z2}_${xPos}`,
        { height: len, diameterTop: RAIL_D, diameterBottom: RAIL_D, tessellation: 4 }, this.scene);
      s.rotation.x = Math.PI / 2;
      s.position.set(cx + xPos, railTop, cz + (z1 + z2) / 2);
      s.material = railMat;
      this._meshes.push(s);
    };

    // ── Вертикальная стойка ──
    const post = (dx, dz) => {
      const p = BABYLON.MeshBuilder.CreateCylinder(`rP_${col}_${row}_${dx}_${dz}`,
        { height: RAIL_H, diameterTop: RAIL_D * 1.8, diameterBottom: RAIL_D * 1.8, tessellation: 4 }, this.scene);
      p.position.set(cx + dx, railMid, cz + dz);
      p.material = railMat;
      this._meshes.push(p);
    };

    // Угловые стойки (всегда)
    post(-half, -half);
    post( half, -half);
    post(-half,  half);
    post( half,  half);

    const hasGateN = row > 0;
    const hasGateS = row < 2;
    const hasGateW = col > 0;
    const hasGateE = col < 2;

    // Для каждой стороны с проходом добавляем стойки по краям прохода
    // и два ряда труб (нижний + верхний) по обе стороны прохода.
    // Без прохода — сплошные два ряда труб.

    // Сторона N (z = −half)
    if (hasGateN) {
      segXBot(-half, -gHalf, -half);  segXBot(gHalf, half, -half);
      segXTop(-half, -gHalf, -half);  segXTop(gHalf, half, -half);
      post(-gHalf, -half);  post(gHalf, -half);
    } else {
      segXBot(-half, half, -half);
      segXTop(-half, half, -half);
    }

    // Сторона S (z = +half)
    if (hasGateS) {
      segXBot(-half, -gHalf, half);  segXBot(gHalf, half, half);
      segXTop(-half, -gHalf, half);  segXTop(gHalf, half, half);
      post(-gHalf, half);  post(gHalf, half);
    } else {
      segXBot(-half, half, half);
      segXTop(-half, half, half);
    }

    // Сторона W (x = −half)
    if (hasGateW) {
      segZBot(-half, -gHalf, -half);  segZBot(gHalf, half, -half);
      segZTop(-half, -gHalf, -half);  segZTop(gHalf, half, -half);
      post(-half, -gHalf);  post(-half, gHalf);
    } else {
      segZBot(-half, half, -half);
      segZTop(-half, half, -half);
    }

    // Сторона E (x = +half)
    if (hasGateE) {
      segZBot(-half, -gHalf, half);  segZBot(gHalf, half, half);
      segZTop(-half, -gHalf, half);  segZTop(gHalf, half, half);
      post(half, -gHalf);  post(half, gHalf);
    } else {
      segZBot(-half, half, half);
      segZTop(-half, half, half);
    }
  }
  // ── Кабели между станциями ────────────────────────────────────────────────
  _buildCables() {
    const y       = LEVEL_Y;
    const cableMat = () => {
      const m = new BABYLON.StandardMaterial(`cm_${Math.random()}`, this.scene);
      m.diffuseColor  = new C(0.07, 0.07, 0.08);
      m.specularColor = new C(0, 0, 0);
      m.emissiveColor = new C(0.03, 0.03, 0.04);
      return m;
    };

    // Горизонтальные кабели (вдоль X) — 3 ряда × 2 пролёта
    for (let row = 0; row < 3; row++) {
      const z = row * GRID_STEP;
      for (let col = 0; col < 2; col++) {
        const xFrom = col * GRID_STEP + STATION_SIZE / 2;
        const xTo   = (col + 1) * GRID_STEP - STATION_SIZE / 2;
        const len   = xTo - xFrom;
        [-0.4, 0.4].forEach((off, oi) => {
          const c = BABYLON.MeshBuilder.CreateCylinder(`hcable_${row}_${col}_${oi}`, {
            height: len, diameterTop: 0.02, diameterBottom: 0.02, tessellation: 4,
          }, this.scene);
          c.rotation.z = Math.PI / 2;
          c.position.set(xFrom + len / 2, y, z + off);
          c.material = cableMat();
          this._meshes.push(c);
        });
      }
    }

    // Вертикальные кабели (вдоль Z) — 3 колонки × 2 пролёта
    for (let col = 0; col < 3; col++) {
      const x = col * GRID_STEP;
      for (let row = 0; row < 2; row++) {
        const zFrom = row * GRID_STEP + STATION_SIZE / 2;
        const zTo   = (row + 1) * GRID_STEP - STATION_SIZE / 2;
        const len   = zTo - zFrom;
        [-0.4, 0.4].forEach((off, oi) => {
          const c = BABYLON.MeshBuilder.CreateCylinder(`vcable_${col}_${row}_${oi}`, {
            height: len, diameterTop: 0.02, diameterBottom: 0.02, tessellation: 4,
          }, this.scene);
          c.rotation.x = Math.PI / 2;
          c.position.set(x + off, y, zFrom + len / 2);
          c.material = cableMat();
          this._meshes.push(c);
        });
      }
    }
  }

  // ── Тележки ───────────────────────────────────────────────────────────────
  _buildTrolleys() {
    // Горизонтальные тележки: между col и col+1, на каждом ряду
    // 3 ряда × 2 пролёта = 6 штук
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 2; col++) {
        const centerX = (col + 0.5) * GRID_STEP;  // середина пролёта
        const z       = row * GRID_STEP;
        const minX    = col * GRID_STEP       + STATION_SIZE / 2 + GAP + TROLLEY_SIZE / 2;
        const maxX    = (col + 1) * GRID_STEP - STATION_SIZE / 2 - GAP - TROLLEY_SIZE / 2;
        const color   = TROLLEY_COLORS_H[row];
        this._spawnTrolley(`th_${row}_${col}`, 'x', centerX, LEVEL_Y, z, minX, maxX, color);
      }
    }

    // Вертикальные тележки: между row и row+1, на каждой колонке
    // 3 колонки × 2 пролёта = 6 штук
    for (let col = 0; col < 3; col++) {
      for (let row = 0; row < 2; row++) {
        const x       = col * GRID_STEP;
        const centerZ = (row + 0.5) * GRID_STEP;
        const minZ    = row * GRID_STEP       + STATION_SIZE / 2 + GAP + TROLLEY_SIZE / 2;
        const maxZ    = (row + 1) * GRID_STEP - STATION_SIZE / 2 - GAP - TROLLEY_SIZE / 2;
        const color   = TROLLEY_COLORS_V[col];
        this._spawnTrolley(`tv_${col}_${row}`, 'z', x, LEVEL_Y, centerZ, minZ, maxZ, color);
      }
    }
  }

  _spawnTrolley(id, axis, x, topY, z, min, max, color) {
    const w = TROLLEY_SIZE, d = TROLLEY_SIZE, h = PLAT_H;

    const box = BABYLON.MeshBuilder.CreateBox(`trol_${id}`, { width: w, height: h, depth: d }, this.scene);
    box.position.set(x, topY - h / 2, z);
    box.checkCollisions = true;
    this.shadowGen.addShadowCaster(box);

    const mat = new BABYLON.StandardMaterial(`trolMat_${id}`, this.scene);
    mat.diffuseColor  = color;
    mat.specularColor = new C(0.08, 0.08, 0.10);
    box.material = mat;

    // Ободок
    const rim = BABYLON.MeshBuilder.CreateBox(`trolRim_${id}`, {
      width: w + 0.07, height: 0.05, depth: d + 0.07,
    }, this.scene);
    rim.position.set(x, topY + 0.025, z);
    const rimMat = new BABYLON.StandardMaterial(`trolRimMat_${id}`, this.scene);
    rimMat.emissiveColor   = color;
    rimMat.disableLighting = true;
    rim.material = rimMat;

    this._meshes.push(box, rim);

    // Поручни на 2 боковых сторонах (перпендикулярно направлению движения)
    this._buildTrolleyRailing(id, box, axis, topY, color);

    const sinPhase = Math.random() * Math.PI * 2;
    const sinSpeed = MAX_SPEED + Math.random() * MAX_RANDOM_K_SPEED; // 0.35 + Math.random() * 0.2;

    this._trolleys.push({
      id, box, rim, axis,
      fixedX: axis === 'z' ? x : null,
      fixedZ: axis === 'x' ? z : null,
      currentPos: axis === 'x' ? x : z,
      min, max, size: TROLLEY_SIZE,
      sinTime: sinPhase, sinSpeed,
      controlled: false,
    });
  }

  // ── Управление ────────────────────────────────────────────────────────────
  _buildHint() {
    const hint = document.createElement('div');
    hint.id = 'cable-hint';
    hint.style.cssText = `
      position:fixed; bottom:140px; left:50%; transform:translateX(-50%);
      color:#00ffcc55; font-size:10px; font-family:'Courier New',monospace;
      letter-spacing:0.15em; text-transform:uppercase;
      pointer-events:none; text-align:center;
    `;
    hint.innerHTML = 'jump on a trolley to ride';
    document.body.appendChild(hint);
    this._hintEl = hint;
  }

  // ── Update ────────────────────────────────────────────────────────────────
  update(dt) {
    if (!this._characterPos) return;
    const cp = this._characterPos;

    // Ищем тележку под игроком
    this._activeTrolley = null;
    for (const t of this._trolleys) {
      const { box } = t;
      const topY = box.position.y + PLAT_H / 2;
      const inX  = Math.abs(cp.x - box.position.x) < TROLLEY_SIZE * 0.6;
      const inZ  = Math.abs(cp.z - box.position.z) < TROLLEY_SIZE * 0.6;
      const inY  = cp.y > topY - 0.5 && cp.y < topY + 2.5;
      if (inX && inZ && inY) { this._activeTrolley = t; break; }
    }

    // Все тележки движутся автоматически, игрок едет вместе с тележкой под ним
    let riderSpeed = 0; // скорость тележки под игроком
    for (const t of this._trolleys) {
      t.sinTime += dt * t.sinSpeed;
      const amp    = (t.max - t.min) / 2;
      const center = (t.max + t.min) / 2;
      const newPos = center + platEase(t.sinTime) * amp;
      const delta  = newPos - t.currentPos;
      this._applyTrolleyPos(t, newPos);

      // Если игрок на этой тележке — двигаем его вместе
      if (this._characterRef && t === this._activeTrolley) {
        if (t.axis === 'x') this._characterRef.position.x += delta;
        else                this._characterRef.position.z += delta;
        // Нормализуем скорость: delta/dt / maxSpeed
        // maxSpeed ≈ amp * sinSpeed (пик скорости синуса)
        const maxSpeed = amp * t.sinSpeed;
        riderSpeed = maxSpeed > 0 ? Math.abs(delta / dt) / maxSpeed : 0;
      }
    }

    // Звук — только когда едем
    if (this._activeTrolley) {
      this._initAudio();
      this._updateTrolleySound(riderSpeed);
    } else {
      this._stopTrolleySound();
    }
  }

  _applyTrolleyPos(t, pos) {
    t.currentPos = pos;
    if (t.axis === 'x') {
      t.box.position.x = pos;
      t.rim.position.x = pos;
    } else {
      t.box.position.z = pos;
      t.rim.position.z = pos;
    }
  }


  _buildTrolleyRailing(id, box, axis, topY, color) {
    const railMat = new BABYLON.StandardMaterial(`trolRailMat_${id}`, this.scene);
    railMat.diffuseColor  = new BABYLON.Color3(0.07, 0.07, 0.08);
    railMat.specularColor = new BABYLON.Color3(0, 0, 0);
    railMat.emissiveColor = color.scale(0.18);

    const platTop = topY + PLAT_H / 2;  // верхняя поверхность тележки
    const railBot = platTop;
    const railTop = platTop + RAIL_H;
    const railMid = platTop + RAIL_H / 2;
    const half    = TROLLEY_SIZE / 2;

    // axis='x': тележка едет вдоль X → закрываем стороны по Z (±half по Z)
    // axis='z': тележка едет вдоль Z → закрываем стороны по X (±half по X)

    // Горизонтальная труба вдоль X (нижняя и верхняя)
    const tubeX = (yPos, zOff) => {
      const t = BABYLON.MeshBuilder.CreateCylinder(`trX_${id}_${yPos}_${zOff}`,
        { height: TROLLEY_SIZE, diameterTop: RAIL_D, diameterBottom: RAIL_D, tessellation: 4 }, this.scene);
      t.rotation.z = Math.PI / 2;
      t.position.set(box.position.x, yPos, box.position.z + zOff);
      t.material = railMat;
      t.parent = box; // двигается вместе с тележкой
      t.position.x = 0; t.position.z = zOff; t.position.y = yPos - box.position.y;
      this._meshes.push(t);
    };

    // Горизонтальная труба вдоль Z
    const tubeZ = (yPos, xOff) => {
      const t = BABYLON.MeshBuilder.CreateCylinder(`trZ_${id}_${yPos}_${xOff}`,
        { height: TROLLEY_SIZE, diameterTop: RAIL_D, diameterBottom: RAIL_D, tessellation: 4 }, this.scene);
      t.rotation.x = Math.PI / 2;
      t.position.set(box.position.x + xOff, yPos, box.position.z);
      t.material = railMat;
      t.parent = box;
      t.position.x = xOff; t.position.z = 0; t.position.y = yPos - box.position.y;
      this._meshes.push(t);
    };

    // Вертикальная стойка (крепится к box)
    const postRel = (xOff, zOff) => {
      const p = BABYLON.MeshBuilder.CreateCylinder(`trP_${id}_${xOff}_${zOff}`,
        { height: RAIL_H, diameterTop: RAIL_D * 1.8, diameterBottom: RAIL_D * 1.8, tessellation: 4 }, this.scene);
      p.material = railMat;
      p.parent = box;
      p.position.set(xOff, railMid - box.position.y, zOff);
      this._meshes.push(p);
    };

    if (axis === 'x') {
      // Закрываем стороны Z = ±half
      // Нижние и верхние трубы вдоль X
      tubeX(railBot, -half);
      tubeX(railTop, -half);
      tubeX(railBot,  half);
      tubeX(railTop,  half);
      // Угловые стойки
      postRel(-half, -half); postRel( half, -half);
      postRel(-half,  half); postRel( half,  half);
    } else {
      // Закрываем стороны X = ±half
      tubeZ(railBot, -half);
      tubeZ(railTop, -half);
      tubeZ(railBot,  half);
      tubeZ(railTop,  half);
      postRel(-half, -half); postRel( half, -half);
      postRel(-half,  half); postRel( half,  half);
    }
  }

  _initAudio() {
    if (this._audioCtx) return;
    try {
      this._audioCtx  = new (window.AudioContext || window.webkitAudioContext)();

      // Осциллятор — лёгкий синус
      this._audioOsc  = this._audioCtx.createOscillator();
      this._audioOsc.type = 'sine';
      this._audioOsc.frequency.value = 180;

      // Небольшой фильтр — убирает резкость
      this._audioFilter = this._audioCtx.createBiquadFilter();
      this._audioFilter.type = 'lowpass';
      this._audioFilter.frequency.value = 800;

      // Гейн — начинаем тихо
      this._audioGain = this._audioCtx.createGain();
      this._audioGain.gain.value = 0;

      this._audioOsc.connect(this._audioFilter);
      this._audioFilter.connect(this._audioGain);
      this._audioGain.connect(this._audioCtx.destination);
      this._audioOsc.start();
    } catch(e) {}
  }

  _updateTrolleySound(speed) {
    if (!this._audioCtx) return;
    const ctx  = this._audioCtx;
    const now  = ctx.currentTime;

    // speed [0..1] нормализованная
    const s = Math.min(1, speed);

    // Частота: 160 Гц (стоим) → 420 Гц (максимум)
    const freq = 160 + s * 260;
    // Громкость: 0 → 0.06 (очень тихо)
    const gain = s * 0.02;

    this._audioOsc.frequency.setTargetAtTime(freq, now, 0.15);
    this._audioGain.gain.setTargetAtTime(gain, now, 0.15);
  }

  _stopTrolleySound() {
    if (!this._audioGain || !this._audioCtx) return;
    this._audioGain.gain.setTargetAtTime(0, this._audioCtx.currentTime, 0.12);
  }

  setCharacterPos(pos) { this._characterPos = pos; }
  setCharacterRef(ref) { this._characterRef = ref; }

  dispose() {
    super.dispose();
    if (this._hintEl) this._hintEl.remove();
  }
}
