'use strict';
const os = require('os');
const { hostsToList } = require('./server-normalize.cjs');

function localStationAddresses() {
  const addresses = ['127.0.0.1', '::1', 'localhost'];
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries || []) addresses.push(entry.address);
  }
  return addresses.map(normalizeNetworkAddress);
}

// Only the persisted, manually added stations are peers. Discovery metadata
// must never be supplied to this authorization decision.
function isConfiguredPeer(remoteAddress, hosts) {
  const addresses = hostsToList(hosts).map((host) => host.ip);
  return isAllowedPeerAddress(remoteAddress, [...localStationAddresses(), ...addresses]);
}

function isAgentRequestAllowed(req, pathname, hosts) {
  if (req.method === 'GET' && pathname === '/agent/ping') return true;
  if (req.method === 'POST' && pathname === '/agent/presence') return true;
  // User-facing Postprod routes enforce their own sessions and roles.
  if (pathname.startsWith('/agent/postprod/') && !pathname.startsWith('/agent/postprod/remote/')) return true;
  return isConfiguredPeer(req.socket?.remoteAddress, hosts);
}

function normalizeNetworkAddress(value) {
  let address = String(value || '').trim().toLowerCase();
  if (!address) return '';
  address = address.replace(/^\[|\]$/g, '');
  const zoneIndex = address.indexOf('%');
  if (zoneIndex >= 0) address = address.slice(0, zoneIndex);
  if (address.startsWith('::ffff:')) address = address.slice(7);
  return address;
}

function isAllowedPeerAddress(remoteAddress, candidates = [], { allowLoopback = true } = {}) {
  const normalizedRemote = normalizeNetworkAddress(remoteAddress);
  if (!normalizedRemote) return false;
  if (
    allowLoopback
    && (normalizedRemote === '127.0.0.1' || normalizedRemote === '::1' || normalizedRemote === 'localhost')
  ) {
    return true;
  }
  const allowed = new Set(
    (Array.isArray(candidates) ? candidates : [])
      .map(normalizeNetworkAddress)
      .filter(Boolean),
  );
  return allowed.has(normalizedRemote);
}

function collectPeerAddressCandidates(...sources) {
  const output = [];
  const visit = (value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value !== 'object') return;
    output.push(value.ip, value.address, value.stationIp, value.localIp);
    for (const [key, entry] of Object.entries(value)) {
      if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(key) || key.includes(':')) output.push(key);
      if (entry && typeof entry === 'object') visit(entry);
    }
  };
  sources.forEach(visit);
  return output.map(normalizeNetworkAddress).filter(Boolean);
}

module.exports = {
  localStationAddresses,
  isConfiguredPeer,
  isAgentRequestAllowed,
  normalizeNetworkAddress,
  isAllowedPeerAddress,
  collectPeerAddressCandidates,
};
