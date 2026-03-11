/**
 * api.js — общение с бэкендом на Fly.io
 * Аутентификация через Telegram initData
 */

const API_URL = 'https://3d-game-api.fly.dev';

function getInitData() {

  // console.log('[api] Telegram WebApp:', window.Telegram?.WebApp);
  // console.log('[api] initData:', window.Telegram?.WebApp?.initData);

  // В Telegram Mini App
  if (window.Telegram?.WebApp?.initData) {
    return window.Telegram.WebApp.initData;
  }
  // Для локальной разработки — фейковые данные
  //return 'dev_mode';

  // Не в Telegram — показываем приглашение
  showTelegramInvite();
  return null;

}

function showTelegramInvite() {
  // Не показывать дважды
  if (document.getElementById('tg-invite')) return;

  const overlay = document.createElement('div');
  overlay.id = 'tg-invite';
  overlay.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:999',
    'background:#0a0c14ee',
    'display:flex', 'flex-direction:column',
    'align-items:center', 'justify-content:center',
    'font-family:Courier New,monospace',
  ].join(';');

  overlay.innerHTML = `
    <div style="color:#00ffcc;font-size:13px;letter-spacing:0.4em;text-transform:uppercase;margin-bottom:16px;text-shadow:0 0 20px #00ffcc">
      ◈ 3D GAME
    </div>
    <div style="color:#ffffff55;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:32px">
      This game runs inside Telegram
    </div>
    <a href="https://t.me/game_3d_bot/game" style="
      display:inline-block;
      padding:12px 28px;
      background:#00ffcc11;
      border:1px solid #00ffcc44;
      border-radius:4px;
      color:#00ffcc;
      font-family:Courier New,monospace;
      font-size:11px;
      letter-spacing:0.2em;
      text-transform:uppercase;
      text-decoration:none;
      text-shadow:0 0 8px #00ffcc66;
      box-shadow:0 0 20px #00ffcc11;
      transition:all 0.2s;
    " onmouseover="this.style.background='#00ffcc22'" 
       onmouseout="this.style.background='#00ffcc11'">
      ▶ Open in Telegram
    </a>
  `;

  document.body.appendChild(overlay);
}

async function apiCall(method, path, body = null) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-telegram-init-data': getInitData(),
    },
  };
  if (body) opts.body = JSON.stringify(body);

  try {
    const res = await fetch(`${API_URL}${path}`, opts);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[api] ${method} ${path} failed:`, err.message);
    return null;
  }
}

/** Загрузить данные игрока (создаёт нового если не существует) */
export async function loadPlayer() {
  return await apiCall('GET', '/player');
}

/** Сохранить прогресс игрока */
export async function saveProgress({ crystals, pos_x, pos_y }) {
  return await apiCall('POST', '/player/progress', { crystals, pos_x, pos_y });
}
