const elState  = document.getElementById('state-indicator');
const elPos    = document.getElementById('pos-display');
const elSpeed  = document.getElementById('speed-display');
const elYaw    = document.getElementById('yaw-display');
const elCamYaw = document.getElementById('camyaw-display');
const elFps    = document.getElementById('fps-display');

const toDeg = r => (r * 180 / Math.PI).toFixed(1) + '°';

export function updateHUD({ state, speed, position, yaw, camYaw }, engine) {
  elState.textContent  = state.toUpperCase();
  elState.className    = state;
  elPos.textContent    = `${position.x.toFixed(2)}, ${position.z.toFixed(2)}`;
  elSpeed.textContent  = speed.toFixed(3);
  elYaw.textContent    = toDeg(yaw);
  elCamYaw.textContent = toDeg(camYaw);
  elFps.textContent    = engine.getFps().toFixed(0);
}
