import { JoystickManager } from './JoystickManager.js';

const KEY_UI_MAP = {
  KeyW: 'key-w', KeyA: 'key-a', KeyS: 'key-s', KeyD: 'key-d',
  ShiftLeft: 'key-shift', ShiftRight: 'key-shift',
  Space: 'key-space',
};

export class InputManager {
  #keys     = {};
  joystick  = null;

  constructor() {
    this.joystick = new JoystickManager();

    window.addEventListener('keydown', e => {
      this.#keys[e.code] = true;
      this.#updateUI(e.code, true);
      if (e.code === 'Space') e.preventDefault();
    });
    window.addEventListener('keyup', e => {
      this.#keys[e.code] = false;
      this.#updateUI(e.code, false);
    });
  }

  // get state() {
  //   const kb = {
  //     fwd:    !!this.#keys['KeyW'],
  //     back:   !!this.#keys['KeyS'],
  //     left:   !!this.#keys['KeyA'],
  //     right:  !!this.#keys['KeyD'],
  //     sprint: !!(this.#keys['ShiftLeft'] || this.#keys['ShiftRight']),
  //     jump:   !!this.#keys['Space'],
  //   };

  //   if (!this.joystick.isMobile) return kb;

  //   // Мобиль — мержим клавиатуру и джойстик
  //   const joy = this.joystick.moveState;
  //   return {
  //     fwd:    kb.fwd    || joy.fwd,
  //     back:   kb.back   || joy.back,
  //     left:   kb.left   || joy.left,
  //     right:  kb.right  || joy.right,
  //     sprint: kb.sprint || joy.sprint,
  //     jump:   kb.jump   || this.joystick.jumpPressed,
  //   };
  // }

  get state() {
    const kb = {
      fwd:    !!this.#keys['KeyW'],
      back:   !!this.#keys['KeyS'],
      left:   !!this.#keys['KeyA'],
      right:  !!this.#keys['KeyD'],
      sprint: !!(this.#keys['ShiftLeft'] || this.#keys['ShiftRight']),
      jump:   !!this.#keys['Space'],
    };

    if (!this.joystick.isMobile) return kb;

    const joy = this.joystick.moveState;
    const jump = kb.jump || this.joystick.jumpPressed;
    
    // Сбрасываем jumpPressed после чтения — один прыжок на нажатие
    this.joystick.jumpPressed = false;

    return {
      fwd:    kb.fwd    || joy.fwd,
      back:   kb.back   || joy.back,
      left:   kb.left   || joy.left,
      right:  kb.right  || joy.right,
      sprint: kb.sprint || joy.sprint,
      jump,
    };
  }

  #updateUI(code, down) {
    const id = KEY_UI_MAP[code];
    if (!id) return;
    document.getElementById(id)?.classList.toggle('active', down);
  }
}
