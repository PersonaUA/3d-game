import { ASSETS, ANIM } from './config.js';

/**
 * Загружает GLB-файл анимации в AssetContainer и возвращает первый AnimationGroup,
 * ретаргетированный на скелет персонажа.
 *
 * @param {BABYLON.Scene}    scene
 * @param {BABYLON.Skeleton} skeleton  — скелет персонажа из timmy.glb
 * @param {string}           url       — путь к файлу анимации
 * @param {string}           name      — имя для AnimationGroup
 */
async function loadAnimationGroup(scene, skeleton, url, name) {
  const container = await BABYLON.SceneLoader.LoadAssetContainerAsync('', url, scene);

  if (!container.animationGroups.length) {
    console.warn(`[AnimationController] No animation groups found in ${url}`);
    container.dispose();
    return null;
  }

  const srcGroup = container.animationGroups[0];
  const group = new BABYLON.AnimationGroup(name, scene);

  // Строим карту имя → TransformNode/Bone из основной сцены
  // BabylonJS хранит кости как TransformNode-ы, ищем через getTransformNodeByName
  srcGroup.targetedAnimations.forEach(ta => {
    const boneName = ta.target?.name;
    if (!boneName) return;

    // Сначала ищем TransformNode (так хранятся кости скелета в сцене)
    let target = scene.getTransformNodeByName(boneName);

    // Запасной вариант — поиск по skeleton.bones
    if (!target) {
      const bone = skeleton.bones.find(b => b.name === boneName);
      target = bone?._linkedTransformNode ?? bone;
    }

    if (!target) {
      // console.warn(`[AnimationController] Target not found: "${boneName}"`);
      return;
    }

    group.addTargetedAnimation(ta.animation, target);
  });

  group.loopAnimation = true;

  container.dispose();
  return group;
}

export class AnimationController {
  /** @type {Record<string, BABYLON.AnimationGroup|null>} */
  anims = { idle: null, walk: null, run: null, jump: null };

  /** @type {BABYLON.AnimationGroup|null} */
  #current = null;

  /**
   * @param {BABYLON.Scene}    scene
   * @param {BABYLON.Skeleton} skeleton
   */
  async load(scene, skeleton) {
    const entries = Object.entries(ASSETS.animations);
    for (const [key, url] of entries) {
      try {
        this.anims[key] = await loadAnimationGroup(scene, skeleton, url, key);
        //console.log(`[AnimationController] ✓ ${key} loaded`);
      } catch (err) {
        console.error(`[AnimationController] ✗ Failed to load "${key}" from ${url}:`, err);
      }
    }

    // Запускаем idle по умолчанию
    this.play('idle');
  }

  /**
   * Переключиться на анимацию по ключу ('idle' | 'walk' | 'run' | 'jump').
   * Делает кросс-фейд за ANIM.blendSpeed секунд.
   */
  play(key, forceRestart = false) {
    const next = this.anims[key];
    if (!next) return;
    if (next === this.#current && !forceRestart) return;

    if (this.#current) this.#current.stop();
    next.start(true, this._speedRatioFor(key));
    this.#current = next;
  }

  /** Возвращает ключ текущей активной анимации */
  get currentKey() {
    for (const [key, ag] of Object.entries(this.anims)) {
      if (ag === this.#current) return key;
    }
    return null;
  }

  _speedRatioFor(key) {
    return {
      idle: 1.0,
      walk: ANIM.walkSpeedRatio,
      run: ANIM.runSpeedRatio,
      jump: ANIM.jumpSpeedRatio,
      strafeLeft:  ANIM.strafeSpeedRatio,
      strafeRight: ANIM.strafeSpeedRatio,
    }[key] ?? 1.0;
  }
}
