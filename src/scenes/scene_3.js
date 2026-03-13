import { SceneBase } from './SceneBase.js';

/**
 * SCENE 3 — Neon Ascent
 * Вертикальный платформер: прыгай по блокам снизу вверх. 
 */

const C = BABYLON.Color3;
const C4 = BABYLON.Color4;

const FLOAT_AMP = 1.0;

const CFG = {

    // Тёмная атмосфера — слабый hemi, нет sun
    hemiIntensity: 0.5,
    hemiDiffuse:   new BABYLON.Color3(0.8, 0.88, 1.0),
    hemiGround:    new BABYLON.Color3(0.3, 0.25, 0.45),
    sunIntensity:  0.5,

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

  crystalSpawns: [
    { x:  4,  z:  3,  y: 1.6  },  // платформа уровень 1
    { x: -4,  z:  4,  y: 1.6  },
    { x:  2,  z:  7,  y: 1.9  },
    { x: -3,  z:  9,  y: 2.9  },  // уровень 2
    { x:  5,  z: 10,  y: 2.9  },
    { x:  0,  z: 12,  y: 3.2  },
    { x: -5,  z: 13,  y: 4.4  },  // уровень 3
    { x:  4,  z: 14,  y: 4.4  },
    { x:  0,  z: 16,  y: 4.9  },
    { x:  0,  z: 21,  y: 6.4  },  // уровень 4
    { x:  4,  z: 22,  y: 6.9  },
    { x:  0,  z: 24,  y: 8.4  },  // уровень 5
    { x: -3,  z: 25,  y: 8.9  },
    { x:  3,  z: 26,  y: 9.4  },
    { x:  0,  z: 28,  y: 9.9  },  // финальная платформа
  ]
};

export class Scene3 extends SceneBase {
  get clearColor() { return CFG.clearColor; }
  get fogColor()   { return CFG.fogColor;   }
  get fogDensity() { return CFG.fogDensity; }
  get spawnPoint() { return CFG.spawnPoint; }

  get crystalSpawns() { return CFG.crystalSpawns; }
  get crystalRespawn() { return Infinity; }

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
    this._buildCableLights(); // вместо _buildFloatingLights
  }

  update(dt) {
    this._time += dt;
    
    this._floatingLights.forEach(({ orb, light, x, z, yBot, yTop, baseY, speed, amp, angle }) => {
        // Сфера скользит вдоль троса — синусоида между yBot и yTop
        const mid = (yBot + yTop) / 2;
        const range = (yTop - yBot) / 2 - 0.2;
        const y = mid + Math.sin(this._time * speed + angle) * range;

        orb.position.set(x, y, z);
        if (light) {
        light.position.x = x;
        light.position.y = y;
        light.position.z = z;
        }
    });
  }

  _buildCableLights() {
    const cables = [
        { x:  0,  z:  5,  yBot: 0.1, yTop: 20.0, color: new BABYLON.Color3(0.0,  1.0,  0.85), speed: 0.6, amp: 3.5 },
        { x: -2,  z: 11,  yBot: 0.1, yTop: 20.0, color: new BABYLON.Color3(0.85, 0.1,  1.0),  speed: 0.5, amp: 3.0 },
        { x:  3,  z: 17,  yBot: 0.1, yTop: 20.0, color: new BABYLON.Color3(0.0,  0.6,  1.0),  speed: 0.8, amp: 4.0 },
        { x: -1,  z: 22,  yBot: 0.1, yTop: 20.0, color: new BABYLON.Color3(1.0,  0.5,  0.0),  speed: 0.4, amp: 4.5 },
        { x: -2,  z: 26,  yBot: 0.1, yTop: 20.0, color: new BABYLON.Color3(0.9,  0.9,  0.9),  speed: 0.7, amp: 4.7 },
    ];

    cables.forEach(({ x, z, yBot, yTop, color, speed, amp }, i) => {
        const h = yTop - yBot;

        // Трос — тонкий цилиндр
        const cable = BABYLON.MeshBuilder.CreateCylinder(`cable_${i}`, {
        height: h,
        diameterTop: 0.02,
        diameterBottom: 0.02,
        tessellation: 4,
        }, this.scene);
        cable.position.set(x, yBot + h / 2, z);

        const cableMat = new BABYLON.StandardMaterial(`cableMat_${i}`, this.scene);
        cableMat.diffuseColor  = new BABYLON.Color3(0.15, 0.17, 0.25);
        cableMat.emissiveColor = new BABYLON.Color3(0.04, 0.05, 0.10);
        cable.material = cableMat;
        this._meshes.push(cable);

        // Сфера на тросе
        const orb = BABYLON.MeshBuilder.CreateSphere(`orb_${i}`, {
        diameter: 0.1, segments: 6,
        }, this.scene);

        const orbMat = new BABYLON.StandardMaterial(`orbMat_${i}`, this.scene);
        orbMat.emissiveColor   = color;
        orbMat.disableLighting = true;
        orb.material = orbMat;
        this._meshes.push(orb);

        // Свет от сферы
        let light = null;
        if (i < 10) {
        light = new BABYLON.PointLight(`orbLight_${i}`,
            new BABYLON.Vector3(x, yBot + h / 2, z), this.scene
        );
        light.diffuse   = color;
        light.specular  = color;
        light.intensity = 10;
        light.range     = 4;
        this._lights.push(light);
        }

        // baseY — центр диапазона движения
        const baseY = yBot + amp;
        this._floatingLights.push({ orb, light, x, z, baseY, yBot, yTop, speed, amp, angle: i * 1.5 });
    });
  }
}