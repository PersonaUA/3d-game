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
    uniform float uScale;   // число пикселей по UV (тайлинг)
    uniform float uTile;    // тайлинг UV в мировых координатах
    uniform vec3  uColorA;
    uniform vec3  uColorB;
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

      vec3 color = mix(uColorA, uColorB, n);
      
      float depth   = gl_FragCoord.z / gl_FragCoord.w;
      float fogFact = exp(-uFogDensity * uFogDensity * depth * depth); // exp2 fog
      fogFact = clamp(fogFact, 0.0, 1.0);
      vec3 finalColor = mix(uFogColor, color, fogFact);
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;

  const mat = new BABYLON.ShaderMaterial("pixelGround", scene, {
    vertex:   "pixelGround",
    fragment: "pixelGround",
  }, {
    attributes: ["position", "uv"],
    uniforms:   ["worldViewProjection", "uTime", "uScale", "uTile", "uColorA", "uColorB"],
  });

  // Цвета как на фото: тёмный и светлый синий
  mat.setFloat("uTime",  0);
  mat.setFloat("uScale", 64.0);  // пикселизация — больше = мельче пиксели
  mat.setFloat("uTile",  64.0);  // тайлинг UV — больше = больше повторений узора
  mat.setVector3("uColorA", new BABYLON.Vector3(0.06, 0.20, 0.30)); // тёмный синий
  mat.setVector3("uColorB", new BABYLON.Vector3(0.20, 0.50, 0.63)); // светлый синий
  mat.setVector3("uFogColor",   new BABYLON.Vector3(0.03, 0.04, 0.10));
  mat.setFloat("uFogDensity",   0.018);

  // Анимация — очень медленно, почти незаметно
  let t = 0;
  scene.registerBeforeRender(() => {
    t += 0.016;
    mat.setFloat("uTime", t);
  });

  return mat;
}
