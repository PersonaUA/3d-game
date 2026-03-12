import { SceneBase } from './SceneBase.js';

/**
 * SCENE 3 — Neon Ascent
 * Вертикальный платформер: прыгай по блокам снизу вверх.
 * Без фонарных столбов — вместо них светящиеся кристаллические башни и плавающие огни.
 */

const C = BABYLON.Color3;
const C4 = BABYLON.Color4;

const CFG = {

    // Тёмная атмосфера — слабый hemi, нет sun
    hemiIntensity: 3.0,
    hemiDiffuse:   new BABYLON.Color3(0.8, 0.88, 1.0),
    hemiGround:    new BABYLON.Color3(0.3, 0.25, 0.45),
    sunIntensity:  3.5,

  clearColor: new C4(0.03, 0.04, 0.10, 1),
  fogColor:   new C(0.03, 0.04, 0.10),
  fogDensity: 0.018,

  ground: {
    size:           200,
    baseColor:      new C(0.08, 0.09, 0.14),
    gridMinorColor: '#1a1e2e',
    gridMajorColor: '#00ffcc18',
  },

  spawnPoint: new BABYLON.Vector3(0, 1, 0),

  // Платформы — маршрут снизу вверх, нужно прыгать зигзагом
  platforms: [
    // Старт — низкие стартовые блоки
    { x:  0,  z:  0,  w: 4,   d: 4,   h: 0.4, topY: 0.4,  diff: new C(0.05, 0.28, 0.55), edge: new C(0.0, 0.6, 1.0)  },

    // Уровень 1 (~1.2)
    { x:  4,  z:  3,  w: 2,   d: 2,   h: 0.4, topY: 1.2,  diff: new C(0.45, 0.07, 0.55), edge: new C(0.85, 0.1, 1.0)  },
    { x: -4,  z:  4,  w: 2,   d: 2,   h: 0.4, topY: 1.2,  diff: new C(0.04, 0.42, 0.32), edge: new C(0.0,  0.9, 0.55)  },
    { x:  2,  z:  7,  w: 2,   d: 2,   h: 0.4, topY: 1.5,  diff: new C(0.55, 0.25, 0.04), edge: new C(1.0,  0.5, 0.0)   },

    // Уровень 2 (~2.5)
    { x: -3,  z:  9,  w: 1.8, d: 1.8, h: 0.4, topY: 2.5,  diff: new C(0.05, 0.28, 0.55), edge: new C(0.0,  0.6, 1.0)  },
    { x:  5,  z: 10,  w: 1.8, d: 1.8, h: 0.4, topY: 2.5,  diff: new C(0.55, 0.06, 0.12), edge: new C(1.0,  0.1, 0.2)  },
    { x:  0,  z: 12,  w: 1.8, d: 1.8, h: 0.4, topY: 2.8,  diff: new C(0.45, 0.07, 0.55), edge: new C(0.85, 0.1, 1.0)  },

    // Уровень 3 (~4.0) — блоки уже, прыжки точнее
    { x: -5,  z: 13,  w: 1.5, d: 1.5, h: 0.4, topY: 4.0,  diff: new C(0.04, 0.42, 0.32), edge: new C(0.0,  0.9, 0.55) },
    { x:  4,  z: 14,  w: 1.5, d: 1.5, h: 0.4, topY: 4.0,  diff: new C(0.05, 0.28, 0.55), edge: new C(0.0,  0.6, 1.0)  },
    { x:  0,  z: 16,  w: 1.5, d: 1.5, h: 0.4, topY: 4.5,  diff: new C(0.55, 0.25, 0.04), edge: new C(1.0,  0.5, 0.0)  },

    // Уровень 4 (~6.0) — длинные узкие мосты
    { x:  0,  z: 19,  w: 1.2, d: 5,   h: 0.4, topY: 6.0,  diff: new C(0.45, 0.07, 0.55), edge: new C(0.85, 0.1, 1.0)  },
    { x: -4,  z: 21,  w: 1.2, d: 1.2, h: 0.4, topY: 6.0,  diff: new C(0.55, 0.06, 0.12), edge: new C(1.0,  0.1, 0.2)  },
    { x:  4,  z: 22,  w: 1.2, d: 1.2, h: 0.4, topY: 6.5,  diff: new C(0.04, 0.42, 0.32), edge: new C(0.0,  0.9, 0.55) },

    // Уровень 5 (~8.0) — финальные высокие блоки
    { x:  0,  z: 24,  w: 1.2, d: 1.2, h: 0.4, topY: 8.0,  diff: new C(0.05, 0.28, 0.55), edge: new C(0.0,  0.6, 1.0)  },
    { x: -3,  z: 25,  w: 1.2, d: 1.2, h: 0.4, topY: 8.5,  diff: new C(0.45, 0.07, 0.55), edge: new C(0.85, 0.1, 1.0)  },
    { x:  3,  z: 26,  w: 1.2, d: 1.2, h: 0.4, topY: 9.0,  diff: new C(0.55, 0.25, 0.04), edge: new C(1.0,  0.5, 0.0)  },

    // Финальная платформа — большая и золотая
    { x:  0,  z: 28,  w: 3,   d: 3,   h: 0.4, topY: 9.5,  diff: new C(0.4,  0.32, 0.02), edge: new C(1.0,  0.85, 0.0) },
  ],

  // Декоративные кристаллические башни [x, z, высота, цвет]
  crystalTowers: [
    [ 10,  5,  4.0, new C(0.0, 1.0, 0.85)  ],
    [-10,  8,  5.5, new C(0.7, 0.0, 1.0)   ],
    [ 12, 15,  7.0, new C(0.0, 0.6, 1.0)   ],
    [-11, 18,  6.0, new C(1.0, 0.15, 0.8)  ],
    [  9, 24,  8.0, new C(0.0, 1.0, 0.4)   ],
    [ -9, 26,  9.0, new C(1.0, 0.75, 0.0)  ],
  ],
};

export class Scene3 extends SceneBase {
  get clearColor() { return CFG.clearColor; }
  get fogColor()   { return CFG.fogColor;   }
  get fogDensity() { return CFG.fogDensity; }
  get spawnPoint() { return CFG.spawnPoint; }

  // Тёмная атмосфера — слабый hemi, нет sun
  get hemiIntensity() { return CFG.hemiIntensity; }
  get hemiDiffuse()   { return CFG.hemiDiffuse; }
  get hemiGround()    { return CFG.hemiGround; }
  get sunIntensity()  { return CFG.sunIntensity; }

  // Для анимации плавающих огней
  _floatingLights = [];
  _time = 0;

  build() {
    this._buildGround(CFG.ground);
    CFG.platforms.forEach((p, i) => this._buildPlatform(p, p.diff, p.edge, i));
  //  CFG.crystalTowers.forEach(([x, z, h, color]) => this._buildCrystalTower(x, z, h, color));
    this._buildFloatingLights();
  }

  update(dt) {
    this._time += dt;

    // Анимируем плавающие огни — медленно покачиваются вверх-вниз
    this._floatingLights.forEach(({ orb, light, baseY, speed, amp, angle }, i) => {
      const y = baseY + Math.sin(this._time * speed + angle) * amp;
      orb.position.y  = y;
      if (light) light.position.y = y;
    });
  }

  // Кристаллическая башня — несколько конусов стопкой
  _buildCrystalTower(x, z, totalH, color) {
    const mat = new BABYLON.StandardMaterial(`crystalMat_${x}_${z}`, this.scene);
    mat.emissiveColor   = color.scale(0.4);
    mat.diffuseColor    = color.scale(0.3);
    mat.specularColor   = color;
    mat.specularPower   = 64;

    const glowMat = new BABYLON.StandardMaterial(`crystalGlow_${x}_${z}`, this.scene);
    glowMat.emissiveColor   = color;
    glowMat.disableLighting = true;

    const segments = Math.floor(totalH / 1.2);
    for (let i = 0; i < segments; i++) {
      const h    = totalH / segments * (1 - i * 0.08);
      const dBot = 0.5 - i * 0.04;
      const dTop = dBot * 0.3;
      const posY = i * (totalH / segments) + h / 2;

      const shard = BABYLON.MeshBuilder.CreateCylinder(`shard_${x}_${z}_${i}`, {
        height: h, diameterTop: dTop, diameterBottom: dBot, tessellation: 6,
      }, this.scene);
      shard.position.set(x, posY, z);
      shard.rotation.y = i * 0.4;
      shard.material   = i % 2 === 0 ? mat : glowMat;
      this.shadowGen.addShadowCaster(shard);
      this._meshes.push(shard);
    }

    // Светящийся кристалл на верхушке
    const tip = BABYLON.MeshBuilder.CreateCylinder(`tip_${x}_${z}`, {
      height: 0.6, diameterTop: 0, diameterBottom: 0.25, tessellation: 6,
    }, this.scene);
    tip.position.set(x, totalH + 0.3, z);
    tip.material = glowMat;
    this._meshes.push(tip);

    // Точечный свет от башни (только первые 4)
    const lightIdx = CFG.crystalTowers.findIndex(t => t[0] === x && t[1] === z);
    if (lightIdx < 4) {
      const light = new BABYLON.PointLight(`towerLight_${x}_${z}`,
        new BABYLON.Vector3(x, totalH, z), this.scene
      );
      light.diffuse   = color;
      light.specular  = color;
      light.intensity = 1.5;
      light.range     = 14;
      this._lights.push(light);
    }
  }

  // Плавающие светящиеся сферы вдоль маршрута
  _buildFloatingLights() {
    const orbs = [
      { x:  0,  z:  5,  baseY: 2.5,  color: new C(0.0,  1.0,  0.85), speed: 0.8,  amp: 0.4 },
      { x: -2,  z: 10,  baseY: 3.5,  color: new C(0.85, 0.1,  1.0),  speed: 0.6,  amp: 0.5 },
      { x:  3,  z: 14,  baseY: 5.0,  color: new C(0.0,  0.6,  1.0),  speed: 1.0,  amp: 0.3 },
      { x: -1,  z: 18,  baseY: 6.5,  color: new C(1.0,  0.5,  0.0),  speed: 0.7,  amp: 0.4 },
      { x:  2,  z: 22,  baseY: 7.5,  color: new C(0.0,  1.0,  0.4),  speed: 0.9,  amp: 0.5 },
      { x: -2,  z: 26,  baseY: 9.5,  color: new C(1.0,  0.85, 0.0),  speed: 0.5,  amp: 0.3 },
    ];

    orbs.forEach(({ x, z, baseY, color, speed, amp }, i) => {
      const orb = BABYLON.MeshBuilder.CreateSphere(`orb_${i}`, { diameter: 0.3, segments: 6 }, this.scene);
      orb.position.set(x, baseY, z);

      const mat = new BABYLON.StandardMaterial(`orbMat_${i}`, this.scene);
      mat.emissiveColor   = color;
      mat.disableLighting = true;
      orb.material = mat;

      // Свет только для первых 4
      let light = null;
      if (i < 2) {
        light = new BABYLON.PointLight(`orbLight_${i}`, orb.position.clone(), this.scene);
        light.diffuse   = color;
        light.specular  = color;
        light.intensity = 2.4;
        light.range     = 8;
        this._lights.push(light);
      }

      this._floatingLights.push({ orb, light, baseY, speed, amp, angle: i * 1.1 });
      this._meshes.push(orb);
    });
  }
}