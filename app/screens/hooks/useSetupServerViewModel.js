import React from 'react';
import { PRESET_OPTIONS } from '../setupHelpers';

function useSetupServerViewModel({
  t,
  machines,
  detected,
}) {
  const statusDot = React.useCallback(
    (status) => {
      const cssClass =
        status === 'ok'
          ? 'ok'
          : status === 'fail'
            ? 'fail'
            : status === 'warn'
              ? 'warn'
              : 'unknown';
      const title =
        status === 'ok'
          ? t('setup.server.status.agentOk')
          : status === 'fail'
            ? t('setup.server.status.agentFail')
            : status === 'warn'
              ? t('setup.server.status.agentWarn')
              : t('setup.server.status.agentUnknown');
      return React.createElement('span', {
        className: `uu-dot ${cssClass}`,
        title,
      });
    },
    [t]
  );

  const presetOptions = React.useMemo(
    () =>
      PRESET_OPTIONS.map((preset) => ({
        ...preset,
        label: preset.k === 'manual' ? t('setup.server.resPreset.manual') : preset.label,
      })),
    [t]
  );

  const { capableList, excludedList } = React.useMemo(() => {
    const capable = [];
    const excluded = [];
    for (let idx = 0; idx < (machines || []).length; idx += 1) {
      const machine = machines[idx];
      const entry = { ...machine, _idx: idx };
      if (machine?.renderAvailability === 'excluded') excluded.push(entry);
      else capable.push(entry);
    }
    return { capableList: capable, excludedList: excluded };
  }, [machines]);

  const machineColorUsageCounts = React.useMemo(() => {
    const counts = new Map();
    for (const machine of machines || []) {
      const color = String(machine?.color || '').trim();
      if (!color) continue;
      counts.set(color, (counts.get(color) || 0) + 1);
    }
    return counts;
  }, [machines]);

  const unknownDetected = React.useMemo(() => {
    const known = new Set(
      (machines || [])
        .map((machine) => String(machine.ip || '').trim().toLowerCase())
        .filter(Boolean)
    );
    return (detected || []).filter(
      (entry) =>
        entry &&
        String(entry.ip || '').trim() &&
        !known.has(String(entry.ip || '').trim().toLowerCase())
    );
  }, [machines, detected]);

  return {
    statusDot,
    presetOptions,
    capableList,
    excludedList,
    machineColorUsageCounts,
    unknownDetected,
  };
}

export { useSetupServerViewModel };
