import { setProgress, hideLoadingScreen }  from './loader.js';
import { createEngine, createScene, createCamera, createLights, applySceneSettings, createPostProcessing } from './scene.js';
import { CharacterController }             from './CharacterController.js';
import { InputManager }                    from './InputManager.js';
import { updateHUD }                       from './hud.js';
import { CAM, CHAR, ANIM }                  from './config.js';
import { SCENES, DEFAULT_SCENE }           from './scenes/index.js';
import { CrystalManager }                  from './CrystalManager.js';
import { loadPlayer }                      from './api.js';
import { MultiplayerManager } from './MultiplayerManager.js';

async function main() {
  const canvas = document.getElementById('renderCanvas');

  setProgress(10, 'Creating engine...');
  const engine = createEngine(canvas);
  const scene  = createScene(engine);

  setProgress(20, 'Setting up camera...');
  const camera = createCamera(scene);

  setProgress(30, 'Setting up lights...');
  const { hemi, sun, shadowGen } = createLights(scene);

  // ── Загрузка данных игрока из БД ─────────────────────────────────────────
  setProgress(15, 'Loading player data...');
  const playerData = await loadPlayer();
  const savedCrystals = playerData?.crystals ?? 0;

  // ── Точки спавна кристаллов (для сцены 1) ────────────────────────────────
  const CRYSTAL_SPAWNS_SCENE_1 = [
    { x:  6,  z:  6,  y: 1.0 },
    { x: -6,  z:  6,  y: 1.0 },
    { x:  6,  z: -6,  y: 1.0 },
    { x: -6,  z: -6,  y: 1.0 },
    { x:  0,  z: 10,  y: 1.0 },
    { x: 10,  z:  0,  y: 1.0 },
    { x: -10, z:  0,  y: 1.0 },
    { x:  4,  z:  4,  y: 2.0 },  // на платформе
  ];

  let crystalManager = null;
  let currentSceneId   = DEFAULT_SCENE;
  let currentSceneInst = null;
  let character        = null;  // объявляем заранее — loadScene может обратиться до load()

  async function loadScene(id) {
    if (currentSceneInst) currentSceneInst.dispose();
    if (crystalManager)   { crystalManager.dispose(); crystalManager = null; }
    const SceneClass  = SCENES[id];
    if (!SceneClass) return;
    currentSceneInst  = new SceneClass(scene, shadowGen);
    currentSceneInst.build();

    //applySceneSettings(scene, currentSceneInst);
    applySceneSettings(scene, currentSceneInst, hemi, sun);

    // respawn только если персонаж уже загружен (не при первом вызове)
    if (character) character.respawn(currentSceneInst.spawnPoint);
    currentSceneId = id;
    const el = document.getElementById('scene-display');
    if (el) el.textContent = `SCENE ${id}`;

    // Спавним кристаллы (пока только для сцены 1)
    const spawns = id === 1 ? CRYSTAL_SPAWNS_SCENE_1 : [];
    
    //const spawns = []; // временно отключены
    
    if (spawns.length > 0) {
      crystalManager = new CrystalManager(scene, spawns);
      await crystalManager.init(savedCrystals);
    }
  }

  setProgress(45, 'Building environment...');
  await loadScene(DEFAULT_SCENE);

  // Персонаж — сначала загружаем
  setProgress(60, 'Loading character...');
  character = new CharacterController({ scene, shadowGen });
  await character.load();

  // Теперь телепортируем — character уже существует ✅
  if (playerData && (playerData.pos_x !== 0 || playerData.pos_y !== 0)) {
    character.respawn(new BABYLON.Vector3(playerData.pos_x, 3, playerData.pos_y));
  }


  // После character.load():
  const mp = new MultiplayerManager(scene, shadowGen);

  console.log('player');

  await mp.connect(playerData?.username ?? 'player');


  // ── Input ─────────────────────────────────────────────────────────────────
  setProgress(90, 'Setting up input...');
  const input = new InputManager();

  // Tab — следующая сцена, цифры 1-9 — конкретная
  window.addEventListener('keydown', e => {
    if (e.code === 'Tab') {
      e.preventDefault();
      const ids  = Object.keys(SCENES).map(Number).sort();
      const next = ids[(ids.indexOf(currentSceneId) + 1) % ids.length];
      loadScene(next);
    }
    const num = parseInt(e.key);
    if (!isNaN(num) && SCENES[num]) loadScene(num);
  });

  // ── Tune Panel — настройка скорости движения в реальном времени ─────────────
  function setupSlider(id, obj, key, decimals) {
    const slider = document.getElementById(`tune-${id}`);
    const valEl  = document.getElementById(`tune-${id}-val`);
    if (!slider || !valEl) return;
    slider.value = obj[key];
    valEl.textContent = obj[key].toFixed(decimals);
    slider.addEventListener('input', () => {
      obj[key] = parseFloat(slider.value);
      valEl.textContent = obj[key].toFixed(decimals);
      // Переиграть текущую анимацию с новым speedRatio
      if (character?.animCtrl) {
        const cur = character.animCtrl.currentKey;
        if (cur) character.animCtrl.play(cur, true);
      }
    });
  }

  setupSlider('walkSpeed',   CHAR, 'walkSpeed',   3);
  setupSlider('walkAnim',    ANIM, 'walkSpeedRatio', 2);
  setupSlider('runSpeed',    CHAR, 'runSpeed',    3);
  setupSlider('runAnim',     ANIM, 'runSpeedRatio',  2);
  setupSlider('strafeSpeed', CHAR, 'strafeSpeed', 3);
  setupSlider('strafeAnim',  ANIM, 'strafeSpeedRatio', 2);

  // H — показать/скрыть панель
  const tunePanel = document.getElementById('tune-panel');
  window.addEventListener('keydown', e => {
    if (e.code === 'KeyH') tunePanel.classList.toggle('hidden');
  });
  document.getElementById('tune-toggle')?.addEventListener('click', () => {
    tunePanel.classList.toggle('hidden');
  });

  // ── Камера ────────────────────────────────────────────────────────────────
  let camYaw    = 0;
  let camPitch  = CAM.pitch;
  let camRadius = CAM.radius;
  let pointerLocked = false;

  canvas.addEventListener('click', () => canvas.requestPointerLock());

  document.addEventListener('pointerlockchange', () => {
    pointerLocked = document.pointerLockElement === canvas;
    hint.style.opacity = pointerLocked ? '0' : '1';
  });

  document.addEventListener('mousemove', e => {
    if (!pointerLocked) return;
    camYaw   += e.movementX * CAM.sensitivity;
    camPitch += e.movementY * CAM.sensitivityY;
    camPitch  = Math.max(CAM.minPitch, Math.min(CAM.maxPitch, camPitch));
  });

  canvas.addEventListener('wheel', e => {
    camRadius += e.deltaY * 0.01;
    camRadius  = Math.max(CAM.minRadius, Math.min(CAM.maxRadius, camRadius));
  }, { passive: true });

  const hint = document.createElement('div');
  hint.textContent = 'Click to capture mouse · ESC to release · Tab — switch scene';
  hint.style.cssText = [
    'position:fixed', 'bottom:100px', 'left:50%', 'transform:translateX(-50%)',
    'color:#ffffff66', 'font-size:10px', "font-family:'Courier New',monospace",
    'letter-spacing:.12em', 'text-transform:uppercase', 'pointer-events:none',
    'transition:opacity 0.5s',
  ].join(';');
  document.body.appendChild(hint);

  // На мобиле скрываем десктопные подсказки
  if (input.joystick.isMobile) {
    hint.style.display = 'none';
    const controlsHint = document.getElementById('controls-hint');
    if (controlsHint) controlsHint.style.display = 'none';
    const tunePanel = document.getElementById('tune-panel');
    if (tunePanel) tunePanel.style.display = 'none';
  }

  // ── Game loop ─────────────────────────────────────────────────────────────
  scene.registerBeforeRender(() => {
    const dt = engine.getDeltaTime() / 1000;

    // Правый джойстик — вращение камеры (аналог mousemove)
    if (input.joystick.isMobile) {
      const { dx, dy } = input.joystick.flushCamDelta();
      camYaw   += dx;
      camPitch += dy;
      camPitch  = Math.max(CAM.minPitch, Math.min(CAM.maxPitch, camPitch));
    }

    const result = character.update(input.state, camYaw);

    mp.sendPosition(character.position, camYaw, result.state, performance.now()); // MULTIPLAYER


    updateHUD({ ...result, camYaw }, engine);
    if (currentSceneInst) currentSceneInst.update(dt);
    if (crystalManager)   crystalManager.update(character.position, dt);

    const cp     = character.position;
    const target = new BABYLON.Vector3(cp.x, cp.y + CAM.heightOffset, cp.z);
    const offset = new BABYLON.Vector3(
      -Math.sin(camYaw) * Math.cos(camPitch) * camRadius,
       Math.sin(camPitch) * camRadius,
      -Math.cos(camYaw) * Math.cos(camPitch) * camRadius,
    );
    camera.position = BABYLON.Vector3.Lerp(camera.position, target.add(offset), CAM.followLerp);
    camera.setTarget(BABYLON.Vector3.Lerp(camera.target, target, CAM.followLerp));
  });

  engine.runRenderLoop(() => scene.render());
  window.addEventListener('resize', () => engine.resize());

  hideLoadingScreen();
}

main().catch(err => {
  console.error('[main] Fatal error:', err);
  document.getElementById('loader-sub').textContent = '✗ ' + err.message;
});
