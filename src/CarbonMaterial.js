/**
 * CarbonMaterial.js
 * Процедурный weave/carbon шейдер для боковых граней платформ.
 * Использует мировые координаты — работает на любой грани без UV-развёртки.
 *
 * Использование:
 *   import { createCarbonMaterial } from './CarbonMaterial.js';
 *   const carbonMat = createCarbonMaterial(scene);
 *   sideBox.material = carbonMat;
 */

export function createCarbonMaterial(scene) {

  // Не создаём дважды если уже есть
  if (scene._carbonMat) return scene._carbonMat;

  BABYLON.Effect.ShadersStore["carbonWeaveVertexShader"] = `
    precision highp float;
    attribute vec3 position;
    uniform mat4 world;
    uniform mat4 worldViewProjection;
    varying vec3 vLocal;  // локальные координаты — не меняются при движении

    void main() {
      vLocal      = position;
      gl_Position = worldViewProjection * vec4(position, 1.0);
    }
  `;

  BABYLON.Effect.ShadersStore["carbonWeaveFragmentShader"] = `
    precision highp float;
    varying vec3 vLocal;

    uniform float uScale;     // плотность плетения
    uniform float uContrast;  // контраст нитей (0..1)
    uniform vec3  uColorDark; // тёмная нить
    uniform vec3  uColorLight;// светлая нить
    uniform vec3  uFogColor;
    uniform float uFogDensity;

    void main() {
      // Локальные координаты — фиксированы относительно меша
      // X+Z — горизонтальная ось вдоль грани, Y — вертикаль
      float horiz = vLocal.x + vLocal.z;
      float vert  = vLocal.y;

      vec2 p    = vec2(horiz, vert) * uScale;
      vec2 tile = fract(p);

      // Чётность ячейки определяет направление нити
      float cx = floor(p.x);
      float cy = floor(p.y);
      float checker = mod(cx + cy, 2.0);

      float nit;
      if (checker < 1.0) {
        // Горизонтальная нить — полоска по X
        nit = 1.0 - abs(tile.y - 0.5) * 2.2;
      } else {
        // Вертикальная нить — полоска по Y
        nit = 1.0 - abs(tile.x - 0.5) * 2.2;
      }
      nit = clamp(nit, 0.0, 1.0);

      // Зазор между нитями — тёмная граница
      float gapX = step(0.92, tile.x) + step(0.92, 1.0 - tile.x);
      float gapY = step(0.92, tile.y) + step(0.92, 1.0 - tile.y);
      float gap  = clamp(gapX + gapY, 0.0, 1.0);

      // Лёгкий блик по вертикали нити
      float gloss = pow(nit, 3.0) * 0.35;

      float light = mix(0.0, uContrast, nit) + gloss;
      light = light * (1.0 - gap * 0.7); // граница темнее

      vec3 color = mix(uColorDark, uColorLight, light);

      // Туман
      float depth   = gl_FragCoord.z / gl_FragCoord.w;
      float fogFact = exp(-uFogDensity * uFogDensity * depth * depth);
      fogFact       = clamp(fogFact, 0.0, 1.0);
      color         = mix(uFogColor, color, fogFact);

      gl_FragColor  = vec4(color, 1.0);
    }
  `;

  const mat = new BABYLON.ShaderMaterial("carbonWeave", scene, {
    vertex:   "carbonWeave",
    fragment: "carbonWeave",
  }, {
    attributes: ["position"],
    uniforms: [
      "world", "worldViewProjection",
      "uScale", "uContrast",
      "uColorDark", "uColorLight",
      "uFogColor", "uFogDensity",
    ],
  });

  mat.setFloat("uScale",     5.0);   // плотность — больше = мельче
  mat.setFloat("uContrast",  0.55);  // яркость светлой нити

  // Тёмный карбон — почти чёрный с лёгким цветным отливом
  mat.setVector3("uColorDark",  new BABYLON.Vector3(0.04, 0.04, 0.05));
  mat.setVector3("uColorLight", new BABYLON.Vector3(0.18, 0.18, 0.20));

  // Туман (подбери под свою сцену)
  mat.setVector3("uFogColor",  new BABYLON.Vector3(0.03, 0.04, 0.10));
  mat.setFloat("uFogDensity",  0.018);

  mat.backFaceCulling = true;

  scene._carbonMat = mat;
  return mat;
}
