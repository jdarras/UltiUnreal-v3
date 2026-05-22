import React from 'react';
import {
  postLaunch,
  postStop,
  postCommon,
} from '../../utils/agent';

function useLaunchControlActions({
  launchMode,
  canUseLiveLaunch,
  canUseEditorLaunch,
  hosts,
  onlineMap,
  busy,
  activeProjectEngineVersion,
  serverHost,
  t,
  showErrorMessage,
  showWarnMessage,
  setStatusMsg,
  setHostBusy,
  setHostsBusy,
  setQuietModeFlag,
  setLaunchMode,
  setUseStartLayout,
  useStartLayoutRef,
  resolveExeForHost,
  resolveUprojectFor,
  isReadyHost,
  armProductionStartCycle,
  showStartLayoutStatus,
}) {
  const resolveEditorPath = React.useCallback((host, version) => {
    const map = host && typeof host.unrealEditors === 'object' ? host.unrealEditors : {};
    const v = String(version || '').trim();
    return v && map[v] ? map[v] : '';
  }, []);

  const getStartErrorMessage = React.useCallback((err) => {
    const code = String(err?.code || '').trim().toLowerCase();
    if (code === 'invalid_exe_path' || code === 'missing_exe') {
      return t('launch.msg.errorUnrealNotFound');
    }
    if (code === 'invalid_uproject_path' || code === 'missing_uproject') {
      return t('launch.msg.errorProjectNotFound');
    }
    if (
      code === 'missing_exe_or_uproject' ||
      code === 'invalid paths' ||
      code === 'missing exe or uproject'
    ) {
      return t('launch.msg.errorProjectOrUnrealNotFound');
    }

    const status = Number(err?.status || 0);
    if (status === 400) return t('launch.msg.errorStartFailed');

    const msg = String(err?.message || '').trim();
    if (/^http\s*400$/i.test(msg)) return t('launch.msg.errorStartFailed');

    return t('launch.msg.errorStartFailed');
  }, [t]);

  const maybeNotifyLocalFallback = React.useCallback((res) => {
    if (!res || typeof res !== 'object') return false;
    const fb = res.localFallback;
    if (!fb || fb.used !== true) return false;
    const msg = t('launch.msg.localFallback');
    if (showWarnMessage) showWarnMessage(msg);
    else setStatusMsg(msg);
    return true;
  }, [setStatusMsg, showWarnMessage, t]);

  const onChangeLaunchMode = React.useCallback(async (event) => {
    const value = event.target.value;
    if (value === 'integration' && !canUseEditorLaunch) {
      setLaunchMode('production');
      return;
    }
    setLaunchMode(value);
    try {
      await postCommon({ launchMode: value });
      if (value !== 'production') {
        await setQuietModeFlag(false);
      }
    } catch (err) {
      showErrorMessage(err.message || String(err));
    }
  }, [canUseEditorLaunch, setLaunchMode, setQuietModeFlag, showErrorMessage]);

  const onToggleUseStartLayout = React.useCallback(async (event) => {
    const checked = !!event?.target?.checked;
    setUseStartLayout(checked);
    try {
      await postCommon({ useStartLayout: checked });
    } catch (err) {
      showErrorMessage(err?.message || String(err));
      setUseStartLayout(useStartLayoutRef.current);
    }
  }, [setUseStartLayout, showErrorMessage, useStartLayoutRef]);

  const onLaunchEditor = React.useCallback(async (version) => {
    if (!canUseEditorLaunch) return;
    if (!serverHost) return;
    const ip = String(serverHost.ip || '').trim();
    if (!ip) return;
    const exe = resolveEditorPath(serverHost, version);
    if (!exe) {
      showErrorMessage(t('launch.status.missingExeVersion', { version }), 2000);
      return;
    }
    try {
      const launchRes = await postLaunch(ip, {
        editorOnly: true,
        requiredVersion: version,
        uproject: '',
      });
      maybeNotifyLocalFallback(launchRes);
      showErrorMessage('');
    } catch (error) {
      console.error('[LaunchControl] launch editor failed', {
        ip,
        version,
        code: error?.code || '',
        status: error?.status || 0,
        message: error?.message || String(error),
        details: error?.details || '',
      });
      showErrorMessage(getStartErrorMessage(error), 2500);
    }
  }, [
    canUseEditorLaunch,
    getStartErrorMessage,
    maybeNotifyLocalFallback,
    resolveEditorPath,
    serverHost,
    showErrorMessage,
    t,
  ]);

  const onStart = React.useCallback(async (ip) => {
    const targetIp = String(ip || '').trim();
    if (!targetIp) return;
    if (launchMode === 'production' && !canUseLiveLaunch) return;
    if (launchMode === 'integration' && !canUseEditorLaunch) return;

    armProductionStartCycle();

    const host = hosts.find((entry) => String(entry.ip || '').trim() === targetIp);
    if (!host) {
      showErrorMessage(
        t('launch.msg.startOneErrorPrefix').replace('{ip}', targetIp) +
          t('launch.msg.hostNotFoundSuffix')
      );
      return;
    }

    const exe = resolveExeForHost(host);
    const uproj = resolveUprojectFor(host);
    if (!isReadyHost(host, { exe, uproj, ip: targetIp })) {
      showErrorMessage(
        !exe
          ? (activeProjectEngineVersion
              ? t('launch.status.missingExeVersion', { version: activeProjectEngineVersion })
              : t('launch.status.missingExe'))
          : (host?.syncEnabled
              ? t('launch.status.missingUprojectSync')
              : t('launch.status.missingUproject'))
      );
      return;
    }

    setHostBusy(targetIp, true);
    try {
      if (launchMode === 'production') {
        await setQuietModeFlag(true);
      } else if (launchMode === 'integration') {
        await postCommon({ launchMode: 'integration' });
      }
      const launchRes = await postLaunch(targetIp, { uproject: uproj });
      maybeNotifyLocalFallback(launchRes);
      showErrorMessage('');
      showStartLayoutStatus();
    } catch (error) {
      console.error('[LaunchControl] start failed', {
        ip: targetIp,
        code: error?.code || '',
        status: error?.status || 0,
        message: error?.message || String(error),
        details: error?.details || '',
      });
      const prefix = t('launch.msg.startOneErrorPrefix').replace('{ip}', targetIp);
      const suffix = getStartErrorMessage(error);
      showErrorMessage(prefix + suffix);
    } finally {
      setHostBusy(targetIp, false);
    }
  }, [
    activeProjectEngineVersion,
    armProductionStartCycle,
    canUseEditorLaunch,
    canUseLiveLaunch,
    getStartErrorMessage,
    hosts,
    isReadyHost,
    launchMode,
    maybeNotifyLocalFallback,
    resolveExeForHost,
    resolveUprojectFor,
    setHostBusy,
    setQuietModeFlag,
    showErrorMessage,
    showStartLayoutStatus,
    t,
  ]);

  const onStop = React.useCallback(async (ip) => {
    const targetIp = String(ip || '').trim();
    if (!targetIp) return;
    if (launchMode === 'production' && !canUseLiveLaunch) return;
    if (launchMode === 'integration' && !canUseEditorLaunch) return;
    setHostBusy(targetIp, true);
    try {
      const stopMode = launchMode === 'integration' ? 'integration' : 'production';
      const host = hosts.find((entry) => String(entry.ip || '').trim() === targetIp);
      const uproject = stopMode === 'integration' && host ? resolveUprojectFor(host) : '';
      const stopRes = await postStop(targetIp, { mode: stopMode, uproject });
      maybeNotifyLocalFallback(stopRes);
      showErrorMessage('');
      if (launchMode === 'production') {
        await setQuietModeFlag(false);
      }
    } catch (error) {
      const prefix = t('launch.msg.stopOneErrorPrefix').replace('{ip}', targetIp);
      const suffix = error?.message || String(error);
      showErrorMessage(prefix + suffix);
    } finally {
      setHostBusy(targetIp, false);
    }
  }, [
    canUseEditorLaunch,
    canUseLiveLaunch,
    hosts,
    launchMode,
    maybeNotifyLocalFallback,
    resolveUprojectFor,
    setHostBusy,
    setQuietModeFlag,
    showErrorMessage,
    t,
  ]);

  const onStartAll = React.useCallback(async () => {
    if (launchMode === 'production' && !canUseLiveLaunch) return;
    if (launchMode === 'integration' && !canUseEditorLaunch) return;
    if (launchMode !== 'production') return;
    armProductionStartCycle();

    const targets = hosts
      .filter((host) => isReadyHost(host) && onlineMap[host.ip]?.online && !busy[host.ip])
      .filter((host) => !onlineMap[host.ip]?.unrealRunning)
      .map((host) => ({
        ip: host.ip,
        uproject: resolveUprojectFor(host),
      }));

    if (!targets.length) return;

    const ips = targets.map((target) => target.ip);
    setHostsBusy(ips, true);
    try {
      if (launchMode === 'production') {
        await setQuietModeFlag(true);
      }
      const launchResults = await Promise.all(
        targets.map(async (target) => ({
          ip: target.ip,
          res: await postLaunch(target.ip, { uproject: target.uproject }),
        }))
      );
      const fallbackLaunch = launchResults.find((entry) => entry?.res?.localFallback?.used);
      if (fallbackLaunch) maybeNotifyLocalFallback(fallbackLaunch.res);
      showErrorMessage('');
      showStartLayoutStatus();
    } catch (error) {
      console.error('[LaunchControl] start all failed', {
        code: error?.code || '',
        status: error?.status || 0,
        message: error?.message || String(error),
        details: error?.details || '',
      });
      const prefix = t('launch.msg.startAllErrorPrefix');
      const suffix = getStartErrorMessage(error);
      showErrorMessage(prefix + suffix);
    } finally {
      setHostsBusy(ips, false);
    }
  }, [
    armProductionStartCycle,
    busy,
    canUseEditorLaunch,
    canUseLiveLaunch,
    getStartErrorMessage,
    hosts,
    isReadyHost,
    launchMode,
    maybeNotifyLocalFallback,
    onlineMap,
    resolveUprojectFor,
    setHostsBusy,
    setQuietModeFlag,
    showErrorMessage,
    showStartLayoutStatus,
    t,
  ]);

  const onStopAll = React.useCallback(async () => {
    if (launchMode === 'production' && !canUseLiveLaunch) return;
    if (launchMode === 'integration' && !canUseEditorLaunch) return;

    const ips = hosts
      .filter((host) => onlineMap[host.ip]?.online && onlineMap[host.ip]?.unrealRunning)
      .map((host) => host.ip);
    if (!ips.length) return;

    setHostsBusy(ips, true);
    try {
      const stopMode = launchMode === 'integration' ? 'integration' : 'production';
      const stopResults = await Promise.all(
        ips.map((ip) => {
          const host = hosts.find((entry) => String(entry.ip || '').trim() === String(ip));
          const uproject = stopMode === 'integration' && host ? resolveUprojectFor(host) : '';
          return postStop(ip, { mode: stopMode, uproject });
        })
      );
      const fallbackStop = stopResults.find((entry) => entry?.localFallback?.used);
      if (fallbackStop) maybeNotifyLocalFallback(fallbackStop);
      showErrorMessage('');
      if (launchMode === 'production') {
        await setQuietModeFlag(false);
      }
    } catch (error) {
      const prefix = t('launch.msg.stopAllErrorPrefix');
      const suffix = error?.message || String(error);
      showErrorMessage(prefix + suffix);
    } finally {
      setHostsBusy(ips, false);
    }
  }, [
    canUseEditorLaunch,
    canUseLiveLaunch,
    hosts,
    launchMode,
    maybeNotifyLocalFallback,
    onlineMap,
    resolveUprojectFor,
    setHostsBusy,
    setQuietModeFlag,
    showErrorMessage,
    t,
  ]);

  return {
    resolveEditorPath,
    onChangeLaunchMode,
    onToggleUseStartLayout,
    onLaunchEditor,
    onStart,
    onStop,
    onStartAll,
    onStopAll,
  };
}

export { useLaunchControlActions };
