const KEY_UI_MAP = {
  KeyW: 'key-w', KeyA: 'key-a', KeyS: 'key-s', KeyD: 'key-d',
  ShiftLeft: 'key-shift', ShiftRight: 'key-shift',
  Space: 'key-space',
};

export class InputManager {
  #keys = {};

  constructor() {
    window.addEventListener('keydown', e => {
      this.#keys[e.code] = true;
      this.#updateUI(e.code, true);
      // предотвращаем скролл страницы пробелом
      if (e.code === 'Space') e.preventDefault();
    });
    window.addEventListener('keyup', e => {
      this.#keys[e.code] = false;
      this.#updateUI(e.code, false);
    });
  }

  get state() {
    return {
      fwd:    !!this.#keys['KeyW'],
      back:   !!this.#keys['KeyS'],
      left:   !!this.#keys['KeyA'],
      right:  !!this.#keys['KeyD'],
      sprint: !!(this.#keys['ShiftLeft'] || this.#keys['ShiftRight']),
      jump:   !!this.#keys['Space'],
    };
  }

  #updateUI(code, down) {
    const id = KEY_UI_MAP[code];
    if (!id) return;
    document.getElementById(id)?.classList.toggle('active', down);
  }
}
