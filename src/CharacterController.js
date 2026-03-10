import { CHAR, ASSETS } from './config.js';
import { AnimationController } from './AnimationController.js';

export class CharacterController {
  capsule    = null;
  modelRoot  = null;
  skeleton   = null;
  animCtrl   = new AnimationController();

  #scene     = null;
  #shadowGen = null;
  #yaw       = 0;
  #velY      = 0;
  #onGround  = false;
  #prevState = '';
  _feetOffset = 0;

  // Второй коллайдер для нижней части тела (ноги/живот)
  #lowerCapsule = null;

  constructor({ scene, shadowGen }) {
    this.#scene     = scene;
    this.#shadowGen = shadowGen;
  }

  async load() {
    const H = CHAR.capsuleHeight;
    const R = CHAR.capsuleRadius;

    // ── Главная капсула — верхняя половина (торс + голова) ──
    this.capsule = BABYLON.MeshBuilder.CreateCapsule('charCapsule', {
      height: H, radius: R, tessellation: 8,
    }, this.#scene);
    this.capsule.position.y      = 3;
    this.capsule.isVisible       = false;
    this.capsule.checkCollisions = true;
    this.capsule.ellipsoid       = new BABYLON.Vector3(R + 0.05, H / 2, R + 0.05);
    this.capsule.ellipsoidOffset = BABYLON.Vector3.Zero();

    // ── Нижний коллайдер — маленькая сфера у ног ──
    // Именно она будет останавливать персонажа перед низкими кубами
    this.#lowerCapsule = BABYLON.MeshBuilder.CreateSphere('charLower', {
      diameter: (R + 0.05) * 2, segments: 4,
    }, this.#scene);
    this.#lowerCapsule.isVisible       = false;
    this.#lowerCapsule.checkCollisions = false; // не двигаем сами, только как маркер

    this.#scene.collisionsEnabled = true;

    // ── Модель ──
    const result = await BABYLON.SceneLoader.ImportMeshAsync('', ASSETS.character, '', this.#scene);
    this.modelRoot = new BABYLON.TransformNode('charPivot', this.#scene);
    const glbRoot  = result.meshes[0];
    glbRoot.parent = this.modelRoot;
    glbRoot.rotationQuaternion = null;
    glbRoot.rotation = new BABYLON.Vector3(0, Math.PI, 0);

    let minY = Infinity;
    result.meshes.forEach(m => {
      m.computeWorldMatrix(true);
      const bb = m.getBoundingInfo();
      if (bb && bb.boundingBox.minimumWorld.y < minY) minY = bb.boundingBox.minimumWorld.y;
    });
    this._feetOffset = isFinite(minY) ? minY : 0;

    result.meshes.forEach(m => {
      m.receiveShadows = true;
      this.#shadowGen.addShadowCaster(m, true);
    });

    this.skeleton = result.skeletons?.[0] ?? null;
    if (this.skeleton) await this.animCtrl.load(this.#scene, this.skeleton);

    console.log('[CharacterController] ✓ Model loaded');
  }

  respawn(point) {
    if (!this.capsule) return;
    this.capsule.position.copyFrom(point ?? new BABYLON.Vector3(0, 3, 0));
    this.#velY     = 0;
    this.#onGround = false;
  }

  update(input, camYaw) {
    const { fwd, back, left, right, sprint, jump } = input;
    const moving = fwd || back || left || right;
    this.#yaw = camYaw;

    if (moving) {
      const fwdVec   = new BABYLON.Vector3( Math.sin(camYaw), 0,  Math.cos(camYaw));
      const rightVec = new BABYLON.Vector3( Math.cos(camYaw), 0, -Math.sin(camYaw));

      const baseSpeed = sprint ? CHAR.runSpeed : CHAR.walkSpeed;
      const sideSpeed = sprint ? CHAR.runSpeed * 0.6 : CHAR.strafeSpeed;

      let moveDir = BABYLON.Vector3.Zero();
      if (fwd)   moveDir = moveDir.add(fwdVec.scale(baseSpeed));
      if (back)  moveDir = moveDir.subtract(fwdVec.scale(baseSpeed));
      if (left)  moveDir = moveDir.subtract(rightVec.scale(sideSpeed));
      if (right) moveDir = moveDir.add(rightVec.scale(sideSpeed));

      if (moveDir.lengthSquared() > 0) {
        // Двигаем горизонтально через moveWithCollisions
        const horizontal = new BABYLON.Vector3(moveDir.x, 0, moveDir.z);
        this.capsule.moveWithCollisions(horizontal);

        // Дополнительно проверяем нижний коллайдер:
        // ставим его чуть впереди у ног и проверяем intersectsMesh
        const H = CHAR.capsuleHeight;
        const dir = moveDir.normalize();
        const R   = CHAR.capsuleRadius + 0.1;
        const feetY = this.capsule.position.y + 0.3; // высота ног

        // Смещаем нижний коллайдер на позицию "впереди у ног"
        this.#lowerCapsule.position.set(
          this.capsule.position.x + dir.x * R,
          feetY,
          this.capsule.position.z + dir.z * R,
        );

        // Если нижний коллайдер пересекает препятствие — откатываем движение
        const obstacles = this.#scene.meshes.filter(m =>
          m.checkCollisions && m !== this.capsule && m !== this.#lowerCapsule && m.isEnabled()
        );
        for (const obs of obstacles) {
          if (this.#lowerCapsule.intersectsMesh(obs, false)) {
            // Откат: возвращаем на позицию до движения
            this.capsule.position.subtractInPlace(horizontal);
            break;
          }
        }
      }
    }

    const speed = moving ? (sprint ? CHAR.runSpeed : CHAR.walkSpeed) : 0;

    // ── Прыжок и гравитация ──
    if (jump && this.#onGround) {
      this.#velY     = CHAR.jumpImpulse;
      this.#onGround = false;
    }
    this.#velY -= CHAR.gravity;

    const prevY = this.capsule.position.y;
    this.capsule.moveWithCollisions(new BABYLON.Vector3(0, this.#velY, 0));
    const movedY = this.capsule.position.y - prevY;
    if (this.#velY < 0 && Math.abs(movedY) < 0.001) {
      this.#velY     = 0;
      this.#onGround = true;
    }

    // ── Анимации ──
    let state;
    if (!this.#onGround)       state = 'jump';
    else if (moving && sprint) state = 'run';
    else if (moving)           state = this.#resolveWalkState(input);
    else                       state = 'idle';

    if (state !== this.#prevState) {
      this.animCtrl.play(state);
      this.#prevState = state;
    }

    this.#syncModelToCapsule();
    return { state, speed, position: this.capsule.position, yaw: this.#yaw };
  }

  #resolveWalkState({ fwd, back, left, right }) {
    const has = key => !!this.animCtrl.anims[key];
    if (back && !fwd)                     return has('walkBack')    ? 'walkBack'    : 'walk';
    if (left  && !right && !fwd && !back) return has('strafeLeft')  ? 'strafeLeft'  : 'walk';
    if (right && !left  && !fwd && !back) return has('strafeRight') ? 'strafeRight' : 'walk';
    return 'walk';
  }

  get yaw()      { return this.#yaw; }
  get position() { return this.capsule?.position ?? BABYLON.Vector3.Zero(); }

  #syncModelToCapsule() {
    if (!this.modelRoot || !this.capsule) return;
    this.modelRoot.position.x = this.capsule.position.x;
    this.modelRoot.position.z = this.capsule.position.z;
    this.modelRoot.position.y = (this.capsule.position.y - CHAR.capsuleHeight / 2) - this._feetOffset;
    this.modelRoot.rotationQuaternion = BABYLON.Quaternion.RotationAxis(
      BABYLON.Vector3.Up(), this.#yaw
    );
  }
}
