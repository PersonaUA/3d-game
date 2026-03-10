import { SceneBase } from './SceneBase.js';

/**
 * SCENE 2 — Crystal Caves
 * Тёмные пещеры с кристаллическими платформами и фиолетово-розовым свечением.
 */

const CFG = {
  clearColor: new BABYLON.Color4(0.04, 0.02, 0.08, 1),
  fogColor:   new BABYLON.Color3(0.04, 0.02, 0.08),
  fogDensity: 0.010,

  ground: {
    size:           60,
    baseColor:      new BABYLON.Color3(0.10, 0.07, 0.15),
    gridMinorColor: '#1a1025',
    gridMajorColor: '#cc44ff22',
  },

  lamps: [
    [-8, -8, new BABYLON.Color3(0.8, 0.0, 1.0)],   // violet
    [ 8, -8, new BABYLON.Color3(1.0, 0.1, 0.6)],   // pink
    [ 8,  8, new BABYLON.Color3(0.3, 0.0, 1.0)],   // deep blue
    [-8,  8, new BABYLON.Color3(1.0, 0.0, 0.5)],   // hot pink
    [-16, 0, new BABYLON.Color3(0.5, 0.0, 1.0)],   // purple
    [ 16, 0, new BABYLON.Color3(0.9, 0.2, 1.0)],   // lavender
    [0, -16, new BABYLON.Color3(0.0, 0.5, 1.0)],   // blue
    [0,  16, new BABYLON.Color3(1.0, 0.3, 0.8)],   // rose
  ],

  platforms: [
    { x:  4, z:  4,  w: 3,   d: 3,   h: 0.8, topY: 0.8,
      diff: new BABYLON.Color3(0.20, 0.05, 0.35), edge: new BABYLON.Color3(0.8, 0.0, 1.0) },
    { x:  4, z: 10,  w: 3,   d: 3,   h: 0.8, topY: 0.8,
      diff: new BABYLON.Color3(0.30, 0.03, 0.20), edge: new BABYLON.Color3(1.0, 0.1, 0.6) },
    { x: -4, z:  6,  w: 2.5, d: 2.5, h: 1.0, topY: 1.0,
      diff: new BABYLON.Color3(0.10, 0.03, 0.30), edge: new BABYLON.Color3(0.3, 0.0, 1.0) },
    { x: -4, z:  9,  w: 2.5, d: 2.5, h: 2.0, topY: 2.0,
      diff: new BABYLON.Color3(0.25, 0.02, 0.28), edge: new BABYLON.Color3(0.9, 0.2, 1.0) },
    { x: -4, z: 12,  w: 2.5, d: 2.5, h: 3.0, topY: 3.0,
      diff: new BABYLON.Color3(0.18, 0.04, 0.32), edge: new BABYLON.Color3(0.5, 0.0, 1.0) },
    { x:  0, z: -6,  w: 4,   d: 4,   h: 1.8, topY: 1.8,
      diff: new BABYLON.Color3(0.22, 0.03, 0.25), edge: new BABYLON.Color3(1.0, 0.0, 0.5) },
    { x:-10, z:  0,  w: 6,   d: 2,   h: 1.2, topY: 1.2,
      diff: new BABYLON.Color3(0.12, 0.05, 0.28), edge: new BABYLON.Color3(0.0, 0.5, 1.0) },
    { x:  8, z: -4,  w: 1.5, d: 1.5, h: 0.6, topY: 0.6,
      diff: new BABYLON.Color3(0.28, 0.02, 0.22), edge: new BABYLON.Color3(1.0, 0.3, 0.8) },
    { x: 10, z: -6,  w: 1.5, d: 1.5, h: 1.0, topY: 1.0,
      diff: new BABYLON.Color3(0.20, 0.05, 0.35), edge: new BABYLON.Color3(0.8, 0.0, 1.0) },
    { x: 12, z: -8,  w: 1.5, d: 1.5, h: 1.4, topY: 1.4,
      diff: new BABYLON.Color3(0.30, 0.03, 0.20), edge: new BABYLON.Color3(1.0, 0.1, 0.6) },
  ],

  spawnPoint: new BABYLON.Vector3(0, 3, 0),
};

export class Scene2 extends SceneBase {
  get clearColor() { return CFG.clearColor; }
  get fogColor()   { return CFG.fogColor; }
  get fogDensity() { return CFG.fogDensity; }
  get spawnPoint() { return CFG.spawnPoint; }

  build() {
    this._buildGround(CFG.ground);
    CFG.lamps.forEach(([x, z, color], i) => this._buildLamp(x, z, color, i < 4));
    CFG.platforms.forEach((p, i) => this._buildPlatform(p, p.diff, p.edge, i));
  }
}
