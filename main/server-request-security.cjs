'use strict';

function evaluateBrowserOrigin(value) {
  const origin = String(value || '').trim();
  if (!origin) return { allowed: true, origin: '' };
  if (origin.length > 2048 || origin === 'null' || /[\r\n]/.test(origin)) {
    return { allowed: false, origin };
  }
  try {
    const parsed = new URL(origin);
    const protocol = String(parsed.protocol || '').toLowerCase();
    const hostname = String(parsed.hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
    const loopback = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
    return {
      allowed: (protocol === 'http:' || protocol === 'https:') && loopback,
      origin,
    };
  } catch {
    return { allowed: false, origin };
  }
}

module.exports = {
  evaluateBrowserOrigin,
};
