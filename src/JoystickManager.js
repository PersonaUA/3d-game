/**
 * JoystickManager — виртуальные джойстики для мобильных устройств.
 *
 * Левый  — движение (аналог WASD): возвращает { fwd, back, left, right }
 * Правый — камера  (аналог мыши):  возвращает накопленные delta { dx, dy }
 *
 * На ПК (нет touchstart) джойстики остаются скрытыми.
 */
export class JoystickManager {
  // Публичное состояние — читается из InputManager
  moveX  = 0;  // -1..1  (лево-право)
  moveY  = 0;  // -1..1  (назад-вперёд)
  camDX  = 0;  // накопленный поворот камеры по X
  camDY  = 0;  // накопленный поворот камеры по Y

  #left  = null;   // данные левого касания
  #right = null;   // данные правого касания
  #isMobile = false;

  jumpPressed = false;
  jumpBtn = null;

  // DOM-элементы
  #leftEl   = null;
  #leftKnob = null;
  #rightEl  = null;
  #rightKnob = null;

  static #RADIUS = 48;   // радиус базы джойстика (px)
  static #KNOB   = 20;   // радиус ручки (px)
  static #DEADZONE = 0.15;

  constructor() {
    // Определяем мобильное устройство по наличию touch
    this.#isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if (!this.#isMobile) return;

    this.#createDOM();
    this.#bindEvents();
  }

  get isMobile() { return this.#isMobile; }

  // ── Читается каждый кадр из InputManager ─────────────────────────────────
  get moveState() {
    const dz = JoystickManager.#DEADZONE;
    return {
      fwd:   this.moveY < -dz,
      back:  this.moveY >  dz,
      left:  this.moveX < -dz,
      right: this.moveX >  dz,
      // Спринт — если джойстик отклонён сильно (>80%)
      sprint: Math.hypot(this.moveX, this.moveY) > 0.8,
    };
  }

  /** Возвращает накопленную дельту камеры и сбрасывает её */
  flushCamDelta() {
    const dx = this.camDX;
    const dy = this.camDY;
    this.camDX = 0;
    this.camDY = 0;
    return { dx, dy };
  }

  // ── DOM ───────────────────────────────────────────────────────────────────
  #createDOM() {
    const R = JoystickManager.#RADIUS;
    const K = JoystickManager.#KNOB;
    const size = R * 2;

    const make = (id, side) => {
      const wrap = document.createElement('div');
      wrap.id = id;
      wrap.className = 'joystick-wrap';
      wrap.style.cssText = `
        position:fixed; bottom:28px;
        ${side}:28px;
        width:${size}px; height:${size}px;
        border-radius:50%;
        border: 2px solid rgba(255,255,255,0.18);
        background: rgba(255,255,255,0.07);
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
        pointer-events: all;
        z-index: 20;
      `;

      jumpBtn.textContent = 'JUMP';
      document.body.appendChild(jumpBtn);
      this.#jumpBtn = jumpBtn;

      jumpBtn.addEventListener('touchstart', e => {
        e.preventDefault();
        this.jumpPressed = true;
        jumpBtn.style.background = 'rgba(0, 255, 204, 0.25)';
        jumpBtn.style.borderColor = 'rgba(0, 255, 204, 0.8)';
      }, { passive: false });

      jumpBtn.addEventListener('touchend', e => {
        e.preventDefault();
        this.jumpPressed = false;
        jumpBtn.style.background = 'rgba(0, 255, 204, 0.1)';
        jumpBtn.style.borderColor = 'rgba(0, 255, 204, 0.4)';
      }, { passive: false });

      const knob = document.createElement('div');
      knob.className = 'joystick-knob';
      knob.style.cssText = `
        position:absolute;
        width:${K * 2}px; height:${K * 2}px;
        border-radius:50%;
        background: rgba(255,255,255,0.25);
        border: 1.5px solid rgba(255,255,255,0.35);
        top:50%; left:50%;
        transform: translate(-50%, -50%);
        pointer-events: none;
      `;

      wrap.appendChild(knob);
      document.body.appendChild(wrap);
      return { wrap, knob };
    };

    const L = make('joystick-left',  'left');
    const Ri = make('joystick-right', 'right');

    this.#leftEl    = L.wrap;
    this.#leftKnob  = L.knob;
    this.#rightEl   = Ri.wrap;
    this.#rightKnob = Ri.knob;
  }

  // ── Touch events ──────────────────────────────────────────────────────────
  #bindEvents() {
    const R = JoystickManager.#RADIUS;

    const center = el => {
      const r = el.getBoundingClientRect();
      return { x: r.left + R, y: r.top + R };
    };

    const clampKnob = (dx, dy) => {
      const dist = Math.hypot(dx, dy);
      if (dist <= R) return { x: dx, y: dy, nx: dx / R, ny: dy / R };
      return { x: dx / dist * R, y: dy / dist * R, nx: dx / dist, ny: dy / dist };
    };

    document.addEventListener('touchstart', e => {
      for (const t of e.changedTouches) {
        // Левый джойстик — касание в левой половине экрана
        if (t.clientX < window.innerWidth / 2 && !this.#left) {
          this.#left = { id: t.identifier, ox: t.clientX, oy: t.clientY };
          this.#leftEl.style.opacity  = '1';
        }
        // Правый джойстик — касание в правой половине
        else if (t.clientX >= window.innerWidth / 2 && !this.#right) {
          this.#right = { id: t.identifier, px: t.clientX, py: t.clientY };
          this.#rightEl.style.opacity = '1';
        }
      }
    }, { passive: true });

    document.addEventListener('touchmove', e => {
      for (const t of e.changedTouches) {
        if (this.#left && t.identifier === this.#left.id) {
          const dx = t.clientX - this.#left.ox;
          const dy = t.clientY - this.#left.oy;
          const c  = clampKnob(dx, dy);
          this.moveX = c.nx;
          this.moveY = c.ny;
          this.#leftKnob.style.transform = `translate(calc(-50% + ${c.x}px), calc(-50% + ${c.y}px))`;
        }
        if (this.#right && t.identifier === this.#right.id) {
          this.camDX += (t.clientX - this.#right.px) * 0.004;
          this.camDY += (t.clientY - this.#right.py) * 0.003;
          this.#right.px = t.clientX;
          this.#right.py = t.clientY;
          // Анимируем ручку правого джойстика
          const dx = t.clientX - (this.#rightEl.getBoundingClientRect().left + R);
          const dy = t.clientY - (this.#rightEl.getBoundingClientRect().top  + R);
          const c  = clampKnob(dx, dy);
          this.#rightKnob.style.transform = `translate(calc(-50% + ${c.x}px), calc(-50% + ${c.y}px))`;
        }
      }
    }, { passive: true });

    const endTouch = e => {
      for (const t of e.changedTouches) {
        if (this.#left && t.identifier === this.#left.id) {
          this.#left  = null;
          this.moveX  = 0;
          this.moveY  = 0;
          this.#leftKnob.style.transform  = 'translate(-50%, -50%)';
          this.#leftEl.style.opacity  = '0.55';
        }
        if (this.#right && t.identifier === this.#right.id) {
          this.#right = null;
          this.#rightKnob.style.transform = 'translate(-50%, -50%)';
          this.#rightEl.style.opacity = '0.55';
        }
      }
    };

    document.addEventListener('touchend',    endTouch, { passive: true });
    document.addEventListener('touchcancel', endTouch, { passive: true });

    // Начальная прозрачность
    this.#leftEl.style.opacity  = '0.55';
    this.#rightEl.style.opacity = '0.55';
  }
}
