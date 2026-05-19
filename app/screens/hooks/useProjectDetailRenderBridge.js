import { useCallback, useEffect } from 'react';
import { getProjectRenderBridgeStatus, installProjectRenderBridge } from '../../utils/agent';

export function useProjectDetailRenderBridge({
  t,
  detailId,
  detailIsNew,
  detailUsageMode,
  renderBridgeAutoInstallAttemptRef,
  setRenderBridgeStatus,
  setRenderBridgeBusy,
  setRenderBridgeMsg,
  setRenderBridgeMsgType,
} = {}) {
  const isRenderBridgeUsage = useCallback((usageMode) => {
    const mode = String(usageMode || '').trim();
    return mode === 'auto_render' || mode === 'live_auto_render';
  }, []);

  const loadRenderBridgeStatus = useCallback(async (projectId) => {
    const pid = String(projectId || '').trim();
    if (!pid) {
      setRenderBridgeStatus(null);
      return { ok: false, error: 'missing projectId' };
    }
    setRenderBridgeBusy(true);
    setRenderBridgeMsg('');
    setRenderBridgeMsgType('');
    try {
      const res = await getProjectRenderBridgeStatus(pid);
      if (res && res.ok) {
        setRenderBridgeStatus(res);
        return res;
      }
      setRenderBridgeStatus(null);
      setRenderBridgeMsg(t('projects.detail.renderBridge.statusError'));
      setRenderBridgeMsgType('error');
      return res || { ok: false, error: 'status_failed' };
    } catch {
      setRenderBridgeStatus(null);
      setRenderBridgeMsg(t('projects.detail.renderBridge.statusError'));
      setRenderBridgeMsgType('error');
      return { ok: false, error: 'status_failed' };
    } finally {
      setRenderBridgeBusy(false);
    }
  }, [setRenderBridgeBusy, setRenderBridgeMsg, setRenderBridgeMsgType, setRenderBridgeStatus, t]);

  const installRenderBridgeForDetail = useCallback(async (projectIdOverride = '', options = {}) => {
    const pid = String(projectIdOverride || detailId || '').trim();
    const silentSuccess = options?.silentSuccess === true;
    if (!pid) return;
    setRenderBridgeBusy(true);
    setRenderBridgeMsg('');
    setRenderBridgeMsgType('');
    try {
      const res = await installProjectRenderBridge(pid);
      if (res && res.ok) {
        setRenderBridgeStatus(res);
        if (!silentSuccess) {
          setRenderBridgeMsg(t('projects.detail.renderBridge.installOk'));
          setRenderBridgeMsgType('ok');
        }
      } else {
        setRenderBridgeMsg(t('projects.detail.renderBridge.installError'));
        setRenderBridgeMsgType('error');
      }
    } catch {
      setRenderBridgeMsg(t('projects.detail.renderBridge.installError'));
      setRenderBridgeMsgType('error');
    } finally {
      setRenderBridgeBusy(false);
      await loadRenderBridgeStatus(pid);
    }
  }, [detailId, loadRenderBridgeStatus, setRenderBridgeBusy, setRenderBridgeMsg, setRenderBridgeMsgType, setRenderBridgeStatus, t]);

  useEffect(() => {
    let cancelled = false;
    const pid = String(detailId || '').trim();
    const usageMode = String(detailUsageMode || '').trim();
    if (!pid || detailIsNew || !isRenderBridgeUsage(usageMode)) {
      setRenderBridgeStatus(null);
      setRenderBridgeMsg('');
      setRenderBridgeMsgType('');
      setRenderBridgeBusy(false);
      return () => {
        cancelled = true;
      };
    }
    (async () => {
      const res = await loadRenderBridgeStatus(pid);
      if (cancelled) return;
      if (res && res.ok === false) {
        setRenderBridgeStatus(null);
        return;
      }
      const isReady = res?.ready === true;
      const packageAvailable = res?.packageAvailable === true;
      const alreadyAttempted = renderBridgeAutoInstallAttemptRef.current.has(pid);
      if (!isReady && packageAvailable && !alreadyAttempted) {
        renderBridgeAutoInstallAttemptRef.current.add(pid);
        await installRenderBridgeForDetail(pid, { silentSuccess: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    detailId,
    detailIsNew,
    detailUsageMode,
    installRenderBridgeForDetail,
    isRenderBridgeUsage,
    loadRenderBridgeStatus,
    renderBridgeAutoInstallAttemptRef,
    setRenderBridgeBusy,
    setRenderBridgeMsg,
    setRenderBridgeMsgType,
    setRenderBridgeStatus,
  ]);

  return {
    isRenderBridgeUsage,
    loadRenderBridgeStatus,
    installRenderBridgeForDetail,
  };
}
