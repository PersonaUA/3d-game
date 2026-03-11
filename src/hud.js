const elState  = document.getElementById('state-indicator');
const elPos    = document.getElementById('pos-display');
const elSpeed  = document.getElementById('speed-display');
const elFps    = document.getElementById('fps-display');

const toDeg = r => (r * 180 / Math.PI).toFixed(1) + '°';

export function updateHUD({ state, speed, position }, engine) {
  elState.textContent  = state.toUpperCase();
  elState.className    = state;
  elPos.textContent    = `${position.x.toFixed(2)}, ${position.z.toFixed(2)}`;
  elSpeed.textContent  = speed.toFixed(3);
  elFps.textContent    = engine.getFps().toFixed(0);
}
