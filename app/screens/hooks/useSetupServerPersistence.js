import React from 'react';

function useSetupServerPersistence({
  cfgRef,
  t,
  isValidIpv4,
  renderAvailabilityValues,
  normalizeArgsForServer,
  postHost,
  refreshStatuses,
  updateMachine,
}) {
  const serverSaveTimers = React.useRef({});
  const serverMachineMsgTimers = React.useRef({});

  const cancelScheduledServerSave = React.useCallback(
    (idxInState, machine = null) => {
      const timers = serverSaveTimers.current || {};
      const stateMachine =
        machine ||
        (Array.isArray(cfgRef.current?.machines) ? cfgRef.current.machines[idxInState] : null);

      const keys = new Set([String(idxInState)]);
      const ip = String(stateMachine?.ip || '').trim();
      const prevIp = String(stateMachine?.prevIp || '').trim();
      if (ip) keys.add(ip);
      if (prevIp) keys.add(prevIp);

      for (const key of keys) {
        if (!key) continue;
        if (timers[key]) {
          clearTimeout(timers[key]);
          delete timers[key];
        }
      }
      serverSaveTimers.current = timers;
    },
    [cfgRef]
  );

  const clearMachineTransientMessage = React.useCallback(
    (idxInState) => {
      if (!Number.isInteger(idxInState) || idxInState < 0) return;
      const timers = serverMachineMsgTimers.current || {};
      if (timers[idxInState]) {
        clearTimeout(timers[idxInState]);
        delete timers[idxInState];
      }
      serverMachineMsgTimers.current = timers;
      updateMachine(idxInState, { lastMsg: '', lastMsgType: '' });
    },
    [updateMachine]
  );

  const showMachineTransientMessage = React.useCallback(
    (idxInState, lastMsg, lastMsgType = 'info', clearAfterMs = 3000) => {
      if (!Number.isInteger(idxInState) || idxInState < 0) return;
      updateMachine(idxInState, { lastMsg, lastMsgType });

      const timers = serverMachineMsgTimers.current || {};
      if (timers[idxInState]) {
        clearTimeout(timers[idxInState]);
        delete timers[idxInState];
      }
      const rawDelay = Number(clearAfterMs);
      const timeoutMs = Number.isFinite(rawDelay) && rawDelay >= 0 ? Math.trunc(rawDelay) : 0;
      if (timeoutMs <= 0) {
        return;
      }
      timers[idxInState] = setTimeout(() => {
        clearMachineTransientMessage(idxInState);
      }, timeoutMs);
      serverMachineMsgTimers.current = timers;
    },
    [clearMachineTransientMessage, updateMachine]
  );

  const saveArgsToServer = React.useCallback(
    async (key = null, machineOverride = null) => {
      const stateMachines = Array.isArray(cfgRef.current?.machines) ? cfgRef.current.machines : [];
      const keyIsIp = typeof key === 'string' && key.trim();

      let machine = machineOverride;
      let ip = '';

      if (!machine && keyIsIp) {
        ip = String(key).trim();
        machine =
          stateMachines.find(
            (host) => String(host?.ip || '').trim().toLowerCase() === ip.toLowerCase()
          ) || null;
      }

      if (!machine && typeof key === 'number') {
        machine = stateMachines[key] || null;
      }

      if (machine && !ip) {
        ip = String(machine?.ip || '').trim();
      }

      if (!machine && ip) {
        machine =
          stateMachines.find(
            (host) => String(host?.ip || '').trim().toLowerCase() === ip.toLowerCase()
          ) || null;
      }

      if (!machine) return;

      ip = String(ip || machine?.ip || '').trim();
      const idxInState = ip
        ? stateMachines.findIndex(
            (host) => String(host?.ip || '').trim().toLowerCase() === ip.toLowerCase()
          )
        : -1;
      if (!ip) {
        if (idxInState >= 0) {
          showMachineTransientMessage(
            idxInState,
            t('setup.server.msg.hostIpMissing'),
            'error',
            1500
          );
        }
        return;
      }

      const stateMatch =
        (idxInState >= 0 ? stateMachines[idxInState] : null) ||
        stateMachines.find(
          (host) => String(host?.ip || '').trim().toLowerCase() === ip.toLowerCase()
        ) ||
        machine;
      const args = normalizeArgsForServer(stateMatch.args || machine.args || {});
      const sortIdxFromState = Number(stateMatch?.sortIndex);
      const sortIndex = Number.isFinite(sortIdxFromState)
        ? sortIdxFromState
        : idxInState >= 0
          ? idxInState
          : Number(machine.sortIndex);
      const renderAvailability = (() => {
        const value = stateMatch?.renderAvailability ?? machine?.renderAvailability;
        if (renderAvailabilityValues.includes(value)) return value;
        if (stateMatch?.eligible === false || machine?.eligible === false) return 'excluded';
        return 'capable';
      })();
      const renderReturnAt = renderAvailability === 'busy'
        ? (typeof (stateMatch?.renderReturnAt ?? machine?.renderReturnAt) === 'string'
            ? (stateMatch?.renderReturnAt ?? machine?.renderReturnAt) || null
            : null)
        : null;
      const payload = {
        ip,
        name: String(stateMatch.name ?? machine.name ?? '').trim(),
        color: String(stateMatch.color ?? machine.color ?? '').trim(),
        args,
        syncRoot: String(stateMatch.syncRoot ?? machine.syncRoot ?? '').trim(),
        syncEnabled: !!(stateMatch.syncEnabled ?? machine.syncEnabled),
        renderAvailability,
        renderReturnAt,
        sortIndex: Number.isFinite(sortIndex) ? sortIndex : undefined,
      };

      let ok = false;
      try {
        const result = await postHost(ip, payload);
        ok = result && result.ok !== false;
      } catch {
        ok = false;
      }
      if (idxInState >= 0) {
        showMachineTransientMessage(
          idxInState,
          ok ? t('setup.server.msg.hostSaved') : t('setup.server.msg.hostSaveError'),
          ok ? 'ok' : 'error',
          3000
        );
      }

      if (ip) refreshStatuses();
    },
    [
      cfgRef,
      normalizeArgsForServer,
      postHost,
      refreshStatuses,
      renderAvailabilityValues,
      showMachineTransientMessage,
      t,
    ]
  );

  const scheduleServerSave = React.useCallback(
    (idxInState, machine = null) => {
      const timers = serverSaveTimers.current || {};
      const ip =
        String(machine?.ip || '').trim() ||
        String(cfgRef.current?.machines?.[idxInState]?.ip || '').trim();
      const key = ip || String(idxInState);

      cancelScheduledServerSave(idxInState, machine);
      if (!isValidIpv4(ip)) {
        return;
      }

      timers[key] = setTimeout(() => {
        saveArgsToServer(key, machine);
      }, 700);
      serverSaveTimers.current = timers;
    },
    [cancelScheduledServerSave, cfgRef, isValidIpv4, saveArgsToServer]
  );

  React.useEffect(() => {
    return () => {
      const saveTimers = serverSaveTimers.current || {};
      Object.values(saveTimers).forEach((timerId) => {
        if (timerId) clearTimeout(timerId);
      });
      serverSaveTimers.current = {};

      const msgTimers = serverMachineMsgTimers.current || {};
      Object.values(msgTimers).forEach((timerId) => {
        if (timerId) clearTimeout(timerId);
      });
      serverMachineMsgTimers.current = {};
    };
  }, []);

  return {
    scheduleServerSave,
    cancelScheduledServerSave,
    saveArgsToServer,
  };
}

export { useSetupServerPersistence };
