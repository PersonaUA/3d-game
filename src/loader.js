const bar    = document.getElementById('loader-bar');
const sub    = document.getElementById('loader-sub');
const screen = document.getElementById('loading-screen');

export function setProgress(pct, text) {
  bar.style.width = pct + '%';
  if (text) sub.textContent = text;
}

export function hideLoadingScreen() {
  setProgress(100, 'Ready');
  setTimeout(() => screen.classList.add('hidden'), 400);
}
