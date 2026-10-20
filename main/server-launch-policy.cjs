'use strict';
const fs = require('fs');
const path = require('path');
const { hostsToList } = require('./server-normalize.cjs');
const { localStationAddresses, normalizeNetworkAddress } = require('./server-peer-security.cjs');

function isApprovedUnrealExecutable(executable, hosts, common = {}) {
  const requested = String(executable || '').trim();
  if (!path.isAbsolute(requested) || !/^(UnrealEditor|UE4Editor|UE5Editor)(-Cmd)?\.exe$/i.test(path.basename(requested))) return false;
  const locals = new Set(localStationAddresses());
  if (common.localIp) locals.add(normalizeNetworkAddress(common.localIp));
  const configured = hostsToList(hosts).filter((host) => locals.has(normalizeNetworkAddress(host.ip)));
  const canonical = (value) => {
    const raw = String(value || '').trim();
    if (!path.isAbsolute(raw)) return '';
    try {
      const result = fs.realpathSync(raw);
      return process.platform === 'win32' ? result.toLowerCase() : result;
    } catch { return ''; }
  };
  const target = canonical(requested);
  if (!target) return false;
  return configured.some((host) => {
    const candidates = [
      host.unreal_editor,
      ...Object.values(host.unrealEditors || {}),
      ...Object.values(host.unreal_editors || {}),
      ...Object.entries(host).filter(([key]) => /^unreal_editor_.+/i.test(key)).map(([, value]) => value),
    ];
    return candidates.some((value) => canonical(value) === target);
  });
}

module.exports = { isApprovedUnrealExecutable };
