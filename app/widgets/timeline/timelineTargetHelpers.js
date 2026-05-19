import { colorClass } from '../../utils/colors';

function buildHostColorMap(hosts) {
  const map = new Map();
  (hosts || []).forEach((host) => {
    if (!host?.ip) return;
    map.set(host.ip, host.color || '');
  });
  return map;
}

function buildTargetPastilles(timelineWidget, hostColorMap) {
  const targets = timelineWidget?.targets || {};
  return Object.entries(targets)
    .filter(([, enabled]) => enabled)
    .map(([ip]) => ({
      ip,
      className: colorClass(hostColorMap.get(ip) || '')
    }));
}

export {
  buildHostColorMap,
  buildTargetPastilles,
};
