import { Scene1 } from './scene_1.js';
import { Scene2 } from './scene_2.js';
import { Scene3 } from './scene_3.js';

/**
 * Реестр сцен. Чтобы добавить новую:
 *   1. Создай src/scenes/scene_N.js, наследуй SceneBase
 *   2. Импортируй и добавь в SCENES ниже
 */
export const SCENES = {
  1: Scene3,
  2: Scene1,
  3: Scene2,
};

export const DEFAULT_SCENE = 1;