/**
 * Базовый класс сцены.
 * Чтобы создать новую сцену — наследуй SceneBase, переопредели поля и build().
 * Зарегистрируй в src/scenes/index.js.
 */
export class SceneBase {
  constructor(scene, shadowGen) {
    this.scene     = scene;
    this.shadowGen = shadowGen;
    this._meshes   = [];
    this._lights   = [];
  }

  // ── Переопредели в наследнике ──────────────────────────────────────────────
  get clearColor() { return new BABYLON.Color4(0.07, 0.09, 0.18, 1); }
  get fogColor()   { return new BABYLON.Color3(0.07, 0.09, 0.18); }
  get fogDensity() { return 0.007; }
  get spawnPoint() { return new BABYLON.Vector3(0, 3, 0); }

  /** Строит всю сцену — вызывается один раз */
  build() { throw new Error(`${this.constructor.name}.build() not implemented`); }

  /** Вызывается каждый кадр (dt в секундах) */
  update(_dt) {}

  /** Освобождает ресурсы при смене сцены */
  dispose() {
    this._meshes.forEach(m => m.dispose());
    this._lights.forEach(l => l.dispose());
    this._meshes = [];
    this._lights = [];
  }

  // ── Хелперы для наследников ────────────────────────────────────────────────

  /** Создаёт землю с кастомной сеткой */
  _buildGround({ size, baseColor, gridMinorColor, gridMajorColor }) {
    const ground = BABYLON.MeshBuilder.CreateGround(
      'ground', { width: size, height: size, subdivisions: 2 }, this.scene
    );
    ground.receiveShadows  = true;
    ground.checkCollisions = true;

    const mat = new BABYLON.StandardMaterial('groundMat', this.scene);
    mat.diffuseColor  = baseColor;
    mat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.08);

    const tex = new BABYLON.DynamicTexture('gridTex', { width: 512, height: 512 }, this.scene, false);
    const ctx = tex.getContext();
    ctx.fillStyle = '#252838';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = gridMinorColor; ctx.lineWidth = 1;
    for (let i = 0; i <= 512; i += 32) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
    }
    ctx.strokeStyle = gridMajorColor; ctx.lineWidth = 2;
    for (let i = 0; i <= 512; i += 128) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
    }
    tex.update();
    mat.diffuseTexture = tex;
    tex.uScale = 15; tex.vScale = 15;
    ground.material = mat;
    this._meshes.push(ground);
    return ground;
  }

  /**
   * Создаёт неоновый фонарь на столбе
   * @param {number} x @param {number} z
   * @param {BABYLON.Color3} neonColor
   * @param {boolean} addLight — добавлять ли PointLight (лимит: не больше 4 на сцену)
   */
  _buildLamp(x, z, neonColor, addLight = false) {
    const poleMat = new BABYLON.StandardMaterial(`_poleMat_${x}_${z}`, this.scene);
    poleMat.diffuseColor  = new BABYLON.Color3(0.12, 0.13, 0.18);
    poleMat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.6);

    // Столб
    const pole = BABYLON.MeshBuilder.CreateCylinder(`pole_${x}_${z}`, {
      height: 5.0, diameterTop: 0.10, diameterBottom: 0.18, tessellation: 10,
    }, this.scene);
    pole.position.set(x, 2.5, z);
    pole.checkCollisions = true;
    pole.material = poleMat;
    this.shadowGen.addShadowCaster(pole);

    // Основание
    const base = BABYLON.MeshBuilder.CreateCylinder(`base_${x}_${z}`, {
      height: 0.18, diameterTop: 0.38, diameterBottom: 0.52, tessellation: 10,
    }, this.scene);
    base.position.set(x, 0.09, z);
    base.material = poleMat;

    // Плафон-сфера
    const globe = BABYLON.MeshBuilder.CreateSphere(`globe_${x}_${z}`, {
      diameter: 0.48, segments: 10,
    }, this.scene);
    globe.position.set(x, 5.28, z);
    const globeMat = new BABYLON.StandardMaterial(`globeMat_${x}_${z}`, this.scene);
    globeMat.emissiveColor   = neonColor;
    globeMat.disableLighting = true;
    globe.material = globeMat;

    // Кольцо вокруг плафона
    const ring = BABYLON.MeshBuilder.CreateTorus(`ring_${x}_${z}`, {
      diameter: 0.70, thickness: 0.055, tessellation: 24,
    }, this.scene);
    ring.position.set(x, 5.28, z);
    const ringMat = new BABYLON.StandardMaterial(`ringMat_${x}_${z}`, this.scene);
    ringMat.emissiveColor   = neonColor;
    ringMat.disableLighting = true;
    ring.material = poleMat; //ringMat;

    // Точечный свет — только если разрешён (лимит на сцену)
    if (addLight) {
      const light = new BABYLON.PointLight(`lampLight_${x}_${z}`, new BABYLON.Vector3(x, 5.1, z), this.scene);
      light.diffuse   = neonColor;
      light.specular  = neonColor;
      light.intensity = 2.5;
      light.range     = 16;
      this._lights.push(light);
    }
  }

  /**
   * Создаёт платформу с подсветкой
   * @param {{ x,z,w,d,h,topY }} p — геометрия
   * @param {BABYLON.Color3} diffColor  — цвет блока
   * @param {BABYLON.Color3} edgeColor  — цвет светящегося ободка
   */
  _buildPlatform(p, diffColor, edgeColor, idx = 0) {
    const { x, z, w, d, h, topY } = p;

    const box = BABYLON.MeshBuilder.CreateBox(`plat_${idx}`, { width: w, height: h, depth: d }, this.scene);
    box.position.set(x, topY - h / 2, z);
    box.checkCollisions = true;
    box.receiveShadows  = true;
    this.shadowGen.addShadowCaster(box);

    const mat = new BABYLON.StandardMaterial(`platMat_${idx}`, this.scene);
    mat.diffuseColor  = diffColor;
    mat.specularColor = new BABYLON.Color3(0.3, 0.3, 0.4);
    mat.specularPower = 20;// 48;
    box.material = mat;

    // Светящийся ободок сверху — bloom сделает реальное свечение без доп. источника
    const rim = BABYLON.MeshBuilder.CreateBox(`rim_${idx}`, {
      width: w + 0.07, height: 0.05, depth: d + 0.07,
    }, this.scene);
    rim.position.set(x, topY + 0.025, z);
    const rimMat = new BABYLON.StandardMaterial(`rimMat_${idx}`, this.scene);
    rimMat.emissiveColor   = edgeColor;
    rimMat.disableLighting = true;
    rim.material = rimMat;

    this._meshes.push(box, rim);
  }
}
