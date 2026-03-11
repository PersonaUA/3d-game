/**
 * api.js — общение с бэкендом на Fly.io
 * Аутентификация через Telegram initData
 */

const API_URL = 'https://3d-game-api.fly.dev';

function getInitData() {

  console.log('[api] Telegram WebApp:', window.Telegram?.WebApp);
  console.log('[api] initData:', window.Telegram?.WebApp?.initData);

  // В Telegram Mini App
  if (window.Telegram?.WebApp?.initData) {
    return window.Telegram.WebApp.initData;
  }
  // Для локальной разработки — фейковые данные
  return 'dev_mode';
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
