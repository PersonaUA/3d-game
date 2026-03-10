import { CAM } from './config.js';

export function createEngine(canvas) {
  return new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
}

export function createScene(engine) {
  const scene = new BABYLON.Scene(engine);
  scene.gravity           = new BABYLON.Vector3(0, -0.98, 0);
  scene.collisionsEnabled = true;
  scene.fogMode           = BABYLON.Scene.FOGMODE_EXP2;
  return scene;
}

export function createCamera(scene) {
  const camera = new BABYLON.TargetCamera('cam', new BABYLON.Vector3(0, 5, -10), scene);
  camera.minZ = 0.1;
  return camera;
}

export function createLights(scene) {
  const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity   = 2.0;
  hemi.diffuse     = new BABYLON.Color3(0.8, 0.88, 1.0);
  hemi.groundColor = new BABYLON.Color3(0.3, 0.25, 0.45);
  hemi.specular    = new BABYLON.Color3(0.2, 0.2,  0.3);

  const sun = new BABYLON.DirectionalLight('sun', new BABYLON.Vector3(-1, -2.5, -1), scene);
  sun.position  = new BABYLON.Vector3(15, 30, 15);
  sun.intensity = 1.0;
  sun.diffuse   = new BABYLON.Color3(1.0, 0.95, 0.82);
  sun.specular  = new BABYLON.Color3(1.0, 0.95, 0.82);

  const shadowGen = new BABYLON.ShadowGenerator(2048, sun);
  shadowGen.useBlurExponentialShadowMap = true;
  shadowGen.blurKernel = 24;
  shadowGen.darkness   = 0.25;

  return { hemi, sun, shadowGen };
}

export function applySceneSettings(scene, settings) {
  scene.clearColor = settings.clearColor;
  scene.fogColor   = settings.fogColor;
  scene.fogDensity = settings.fogDensity;
}

export function createPostProcessing(scene, camera) {
  try {
    const p = new BABYLON.DefaultRenderingPipeline('pipeline', true, scene, [camera]);
    p.bloomEnabled           = true;
    p.bloomThreshold         = 0.6;  // только по-настоящему яркие emissive
    p.bloomWeight            = 0.55;
    p.bloomKernel            = 64;
    p.bloomScale             = 0.6;
    p.fxaaEnabled            = true;
    p.imageProcessingEnabled = true;
    p.imageProcessing.contrast        = 1.1;
    p.imageProcessing.exposure        = 1.25;
    p.imageProcessing.vignetteEnabled = true;
    p.imageProcessing.vignetteWeight  = 1.5;
    p.imageProcessing.vignetteColor   = new BABYLON.Color4(0.03, 0.03, 0.08, 0);
  } catch (e) {
    console.warn('Post-processing unavailable:', e.message);
  }
}
