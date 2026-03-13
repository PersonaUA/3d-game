/**
 * PixelGround.js
 * Процедурная "пиксельная" текстура земли через ShaderMaterial.
 * Worley (cellular) noise + value noise — без внешних текстур.
 * Использование:
 *   import { createPixelGroundMaterial } from './PixelGround.js';
 *   ground.material = createPixelGroundMaterial(scene);
 */

export function createPixelGroundMaterial(scene) {

  BABYLON.Effect.ShadersStore["pixelGroundVertexShader"] = `
    precision highp float;
    attribute vec3 position;
    attribute vec2 uv;
    uniform mat4 worldViewProjection;
    varying vec2 vUV;
    void main() {
      vUV = uv;
      gl_Position = worldViewProjection * vec4(position, 1.0);
    }
  `;

  BABYLON.Effect.ShadersStore["pixelGroundFragmentShader"] = `
    precision highp float;
    varying vec2 vUV;
    uniform float uTime;
    uniform float uScale;
    uniform float uTile;
    uniform vec3  uColorA;   // #2d4c5d — самый тёмный
    uniform vec3  uColorB;   // #35596c
    uniform vec3  uColorC;   // #416d84
    uniform vec3  uColorD;   // #4c7f99 — самый светлый
    uniform vec3  uFogColor;
    uniform float uFogDensity;

    float hash(vec2 p) {
      p = fract(p * vec2(127.1, 311.7));
      p += dot(p, p + 19.19);
      return fract(p.x * p.y);
    }

    // Value noise — билинейная интерполяция между хэшами
    float vnoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i),               hash(i + vec2(1,0)), u.x),
        mix(hash(i + vec2(0,1)),   hash(i + vec2(1,1)), u.x),
        u.y
      );
    }

    // FBM — несколько октав value noise для облачного вида
    float fbm(vec2 p) {
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 4; i++) {
        v += a * vnoise(p);
        p  = p * 2.1 + vec2(1.7, 9.2);
        a *= 0.5;
      }
      return v;
    }

    void main() {
      // Тайлинг + пикселизация
      vec2 tiled  = vUV * uTile;
      vec2 pixUV  = floor(tiled * uScale) / uScale;

      // Медленная анимация — два слоя в разные стороны
      float n1 = fbm(pixUV * 1.0 + uTime * 0.012);
      float n2 = fbm(pixUV * 2.2 - uTime * 0.007 + vec2(5.3, 1.7));

      float n = n1 * 0.65 + n2 * 0.35;
      n = clamp(n, 0.0, 1.0);

      // Растягиваем диапазон noise на 0..1 равномерно
      // FBM даёт примерно 0.2..0.8 — нормализуем
      n = clamp((n - 0.2) / 0.6, 0.0, 1.0);

      // Квантуем ровно в 4 одинаковых ступени (25% каждый цвет)
      float step = floor(n * 4.0);           // 0, 1, 2, 3
      step = clamp(step, 0.0, 3.0);

      vec3 color;
      if (step < 1.0)      color = uColorA;
      else if (step < 2.0) color = uColorB;
      else if (step < 3.0) color = uColorC;
      else                 color = uColorD;

      // Туман
      float depth   = gl_FragCoord.z / gl_FragCoord.w;
      float fogFact = exp(-uFogDensity * uFogDensity * depth * depth);
      fogFact = clamp(fogFact, 0.0, 1.0);
      color = mix(uFogColor, color, fogFact);

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  const mat = new BABYLON.ShaderMaterial("pixelGround", scene, {
    vertex:   "pixelGround",
    fragment: "pixelGround",
  }, {
    attributes: ["position", "uv"],
    uniforms:   ["worldViewProjection", "uTime", "uScale", "uTile", "uColorA", "uColorB", "uColorC", "uColorD", "uFogColor", "uFogDensity"],
  });

  // Цвета как на фото: тёмный и светлый синий
  mat.setFloat("uTime",  0);
  mat.setFloat("uScale", 32.0);
  mat.setFloat("uTile",  128.0);
  mat.setVector3("uColorA", new BABYLON.Vector3(0.176, 0.298, 0.365)); // #2d4c5d
  mat.setVector3("uColorB", new BABYLON.Vector3(0.208, 0.349, 0.424)); // #35596c
  mat.setVector3("uColorC", new BABYLON.Vector3(0.255, 0.427, 0.518)); // #416d84
  mat.setVector3("uColorD", new BABYLON.Vector3(0.298, 0.498, 0.600)); // #4c7f99
  mat.setVector3("uFogColor",  new BABYLON.Vector3(0.03, 0.04, 0.10));
  mat.setFloat("uFogDensity",  0.018);

  // Анимация — очень медленно, почти незаметно
  let t = 0;
  scene.registerBeforeRender(() => {
    t += 0.008;
    mat.setFloat("uTime", t);
  });

  return mat;
}
