import { SceneBase } from './SceneBase.js';

/**
 * SCENE 1 — Neon Arena
 * Киберпанк-арена с неоновыми фонарями и цветными платформами.
 * Редактируй CFG чтобы изменить внешний вид.
 */

const CFG = {
  // ── Атмосфера ──────────────────────────────────────────────────────────────
  clearColor: new BABYLON.Color4(0.07, 0.09, 0.18, 1),
  fogColor:   new BABYLON.Color3(0.07, 0.09, 0.18),
  fogDensity: 0.015, //0.007,

  // ── Земля ──────────────────────────────────────────────────────────────────
  ground: {
    size:           180,
    baseColor:      new BABYLON.Color3(0.18, 0.20, 0.28),
    gridMinorColor: '#363b52',
    gridMajorColor: '#00eeff28',
  },

  // ── Фонари: [x, z, цвет] ──────────────────────────────────────────────────
  lamps: [
    [-8, -8, new BABYLON.Color3(0.0, 1.0, 0.85)],  // cyan
    [ 8, -8, new BABYLON.Color3(1.0, 0.15, 0.8)],  // magenta
    [ 8,  8, new BABYLON.Color3(0.2, 0.55, 1.0)],  // blue
    // [-8,  8, new BABYLON.Color3(1.0, 0.75, 0.0)],  // yellow
    [-16, 0, new BABYLON.Color3(0.0, 1.0, 0.4)],   // green
    // [ 16, 0, new BABYLON.Color3(1.0, 0.3, 0.1)],   // orange
    [0, -16, new BABYLON.Color3(0.7, 0.0, 1.0)],   // purple
    [0,  16, new BABYLON.Color3(0.0, 0.8, 1.0)],   // light blue
  ],

  // ── Платформы ──────────────────────────────────────────────────────────────
  // { x, z, w, d, h, topY }
  //   topY = высота верхней грани над землёй
  //   h    = высота блока (блок опускается вниз от topY)
  platforms: [
    { x:  4, z:  4,  w: 3,   d: 3,   h: 0.8, topY: 0.8,
      diff: new BABYLON.Color3(0.05, 0.30, 0.65), edge: new BABYLON.Color3(0.0,  0.6,  1.0) },
    { x:  4, z: 10,  w: 3,   d: 3,   h: 0.8, topY: 0.8,
      diff: new BABYLON.Color3(0.50, 0.08, 0.60), edge: new BABYLON.Color3(0.9,  0.1,  1.0) },
    { x: -4, z:  6,  w: 2.5, d: 2.5, h: 1.0, topY: 1.0,
      diff: new BABYLON.Color3(0.04, 0.48, 0.35), edge: new BABYLON.Color3(0.0,  1.0,  0.55) },
    { x: -4, z:  9,  w: 2.5, d: 2.5, h: 2.0, topY: 2.0,
      diff: new BABYLON.Color3(0.60, 0.28, 0.04), edge: new BABYLON.Color3(1.0,  0.55, 0.0) },
    { x: -4, z: 12,  w: 2.5, d: 2.5, h: 3.0, topY: 3.0,
      diff: new BABYLON.Color3(0.58, 0.06, 0.12), edge: new BABYLON.Color3(1.0,  0.1,  0.2) },
    { x:  0, z: -6,  w: 4,   d: 4,   h: 1.8, topY: 1.8,
      diff: new BABYLON.Color3(0.05, 0.30, 0.65), edge: new BABYLON.Color3(0.0,  0.6,  1.0) },
    { x:-10, z:  0,  w: 6,   d: 2,   h: 1.2, topY: 1.2,
      diff: new BABYLON.Color3(0.50, 0.08, 0.60), edge: new BABYLON.Color3(0.9,  0.1,  1.0) },
    { x:  8, z: -4,  w: 1.5, d: 1.5, h: 0.6, topY: 0.6,
      diff: new BABYLON.Color3(0.04, 0.48, 0.35), edge: new BABYLON.Color3(0.0,  1.0,  0.55) },
    { x: 10, z: -6,  w: 1.5, d: 1.5, h: 1.0, topY: 1.0,
      diff: new BABYLON.Color3(0.60, 0.28, 0.04), edge: new BABYLON.Color3(1.0,  0.55, 0.0) },
    { x: 12, z: -8,  w: 1.5, d: 1.5, h: 1.4, topY: 1.4,
      diff: new BABYLON.Color3(0.58, 0.06, 0.12), edge: new BABYLON.Color3(1.0,  0.1,  0.2) },
  ],

  crystalSpawns: [
    { x:  6,  z:  6,  y: 1.0 },
    { x: -6,  z:  6,  y: 1.0 },
    { x:  6,  z: -6,  y: 1.0 },
    { x: -6,  z: -6,  y: 1.0 },
    { x:  0,  z: 10,  y: 1.0 },
    { x: 10,  z:  0,  y: 1.0 },
    { x: -10, z:  0,  y: 1.0 },
    { x:  4,  z:  4,  y: 2.0 },
  ],  


  spawnPoint: new BABYLON.Vector3(0, 3, 0),
};

export class Scene1 extends SceneBase {
  
  get clearColor() { return CFG.clearColor; }
  get fogColor()   { return CFG.fogColor; }
  get fogDensity() { return CFG.fogDensity; }
  get spawnPoint() { return CFG.spawnPoint; }
  get crystalSpawns() { return CFG.crystalSpawns; }    

  build() {
    this._buildGround(CFG.ground);
    CFG.lamps.forEach(([x, z, color], i) => this._buildLamp(x, z, color, i < 4));
    CFG.platforms.forEach((p, i) => this._buildPlatform(p, p.diff, p.edge, i));
  }
}
