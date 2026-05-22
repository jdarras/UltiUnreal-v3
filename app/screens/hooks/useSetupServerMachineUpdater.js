import React from 'react';

const MACHINE_UPDATE_IGNORE_KEYS = new Set([
  'lastMsg',
  'lastMsgType',
  'status',
  'showEditor',
  'showArgs',
  'prevIp',
]);

export function useSetupServerMachineUpdater({
  setCfg,
  role,
  isValidIpv4,
  scheduleServerSaveRef,
  cancelScheduledServerSaveRef,
}) {
  return React.useCallback(
    (machineIndex, changes) => {
      const patch = changes && typeof changes === 'object' ? changes : {};
      const isIpChange = Object.prototype.hasOwnProperty.call(patch, 'ip');
      const skipAutosave = isIpChange;
      const shouldTriggerSave =
        Object.keys(patch).some((key) => !MACHINE_UPDATE_IGNORE_KEYS.has(key)) && !skipAutosave;

      setCfg((prev) => {
        const machines = Array.isArray(prev?.machines) ? [...prev.machines] : [];
        const prevIp = String(machines[machineIndex]?.ip || '').trim();
        const nextIp = String(patch.ip ?? prevIp).trim();
        const nextMachine = {
          ...machines[machineIndex],
          ...patch,
          prevIp:
            isIpChange && prevIp && prevIp !== nextIp
              ? prevIp
              : machines[machineIndex]?.prevIp || '',
        };
        machines[machineIndex] = nextMachine;

        if (role === 'server' && shouldTriggerSave) {
          if (isValidIpv4(nextMachine.ip)) {
            scheduleServerSaveRef.current?.(machineIndex, nextMachine);
          } else {
            cancelScheduledServerSaveRef.current?.(machineIndex, nextMachine);
          }
        }

        return { ...prev, machines };
      });
    },
    [
      setCfg,
      role,
      isValidIpv4,
      scheduleServerSaveRef,
      cancelScheduledServerSaveRef,
    ]
  );
}
