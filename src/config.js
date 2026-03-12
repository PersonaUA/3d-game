// ─── Asset paths ─────────────────────────────────────────────────────────────
// Place your files in the matching folders:

export const ASSETS = {
  character: 'assets/models/timmy5.glb',
  animations: {
    idle:        'assets/animations/idle.glb',
    walk:        'assets/animations/walking.glb',
    run:         'assets/animations/running.glb',
    jump:        'assets/animations/jumping.glb',
    
    walkBack:    'assets/animations/walking_back.glb',
    strafeLeft:  'assets/animations/strafe_left.glb',
    strafeRight: 'assets/animations/strafe_right.glb',
  },
};

// ─── Character physics ────────────────────────────────────────────────────────
export const CHAR = {
  walkSpeed:    0.042,
  walkBackSpeed: 0.042,  // скорость смещения назад
  runSpeed:     0.13,
  strafeSpeed:  0.015,   // скорость стрейфа A/D — меньше чем ходьба вперёд
  jumpImpulse:  0.25,
  gravity:      0.012,
  rotateSpeed:  0.10,
  turnSpeed:    0.35,
  capsuleHeight: 1.9,
  capsuleRadius: 0.35,
};

// ─── Animation blend времена (сек) ───────────────────────────────────────────
export const ANIM = {
  blendSpeed: 0.15,   // скорость кросс-фейда между состояниями
  walkSpeedRatio: 2.0,
  walkBackSpeedRatio: 2.0,  // скорость анимации walkBack
  runSpeedRatio:  1.5,
  jumpSpeedRatio: 1.0,
  strafeSpeedRatio: 1.8,
};

// ─── Camera ───────────────────────────────────────────────────────────────────
export const CAM = {
  radius:       10,
  minRadius:    3,
  maxRadius:    25,
  pitch:        0.35,
  minPitch:     0.1,     // минимальный угол наклона камеры (0 - земля)
  maxPitch:     1.4,
  sensitivity:  0.004,   // горизонтальная чувствительность мыши
  sensitivityY: 0.002,   // вертикальная — вдвое меньше
  followLerp:   0.12,
  heightOffset: 1.2,
};

// ─── Environment настраивается в src/scenes/scene_N.js ───────────────────────
