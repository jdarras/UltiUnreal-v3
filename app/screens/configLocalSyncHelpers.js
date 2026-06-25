import { toTrimmedString } from '../utils/coerce.js';

function findLocalHost(hosts = [], localIp = '', localName = '') {
  const ip = toTrimmedString(localIp).toLowerCase();
  const name = toTrimmedString(localName).toLowerCase();
  const list = Array.isArray(hosts) ? hosts : [];
  if (ip) {
    const byIp = list.find((host) => (
      toTrimmedString(host?.ip || host?.address).toLowerCase() === ip
    ));
    if (byIp) return byIp;
  }
  if (!name) return null;
  return list.find((host) => toTrimmedString(host?.name).toLowerCase() === name) || null;
}

export { findLocalHost };
