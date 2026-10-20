const { session } = require('electron');

const AUTH_PARTITION = 'fab-auth';
let cookies = [];

function getAuthSession() {
  try {
    return session.fromPartition(AUTH_PARTITION);
  } catch {
    return null;
  }
}

function setCookies(list) {
  cookies = Array.isArray(list) ? list.filter((c) => c && c.name) : [];
  return cookies;
}

async function refreshCookiesFromSession() {
  const sess = getAuthSession();
  if (!sess || !sess.cookies) {
    return setCookies([]);
  }
  try {
    const list = await sess.cookies.get({ url: 'https://www.fab.com' });
    return setCookies(list);
  } catch {
    return setCookies([]);
  }
}

function clearCookies() {
  cookies = [];
}

function buildCookieHeader() {
  const now = Date.now() / 1000;
  const parts = [];
  for (const c of cookies) {
    if (!c || !c.name) continue;
    if (typeof c.expirationDate === 'number' && c.expirationDate <= now) continue;
    parts.push(`${c.name}=${c.value}`);
  }
  return parts.join('; ');
}

module.exports = {
  AUTH_PARTITION,
  getAuthSession,
  refreshCookiesFromSession,
  setCookies,
  clearCookies,
  buildCookieHeader,
};
