import { useCallback, useEffect } from 'react';
import { getProjectRenderBridgeStatus, installProjectRenderBridge } from '../../utils/agent';
import { clearMessagePair, setTypedMessage } from './projectDetailFeedbackHelpers';

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
  const clearRenderBridgeFeedback = useCallback(() => {
    clearMessagePair(setRenderBridgeMsg, setRenderBridgeMsgType);
  }, [setRenderBridgeMsg, setRenderBridgeMsgType]);

  const showRenderBridgeFeedback = useCallback((type, key) => {
    setTypedMessage(setRenderBridgeMsg, setRenderBridgeMsgType, type, t(key));
  }, [setRenderBridgeMsg, setRenderBridgeMsgType, t]);

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
    clearRenderBridgeFeedback();
    try {
      const res = await getProjectRenderBridgeStatus(pid);
      if (res && res.ok) {
        setRenderBridgeStatus(res);
        return res;
      }
      setRenderBridgeStatus(null);
      showRenderBridgeFeedback('error', 'projects.detail.renderBridge.statusError');
      return res || { ok: false, error: 'status_failed' };
    } catch {
      setRenderBridgeStatus(null);
      showRenderBridgeFeedback('error', 'projects.detail.renderBridge.statusError');
      return { ok: false, error: 'status_failed' };
    } finally {
      setRenderBridgeBusy(false);
    }
  }, [
    clearRenderBridgeFeedback,
    setRenderBridgeBusy,
    setRenderBridgeStatus,
    showRenderBridgeFeedback,
  ]);

  const installRenderBridgeForDetail = useCallback(async (projectIdOverride = '', options = {}) => {
    const pid = String(projectIdOverride || detailId || '').trim();
    const silentSuccess = options?.silentSuccess === true;
    if (!pid) return;
    setRenderBridgeBusy(true);
    clearRenderBridgeFeedback();
    try {
      const res = await installProjectRenderBridge(pid);
      if (res && res.ok) {
        setRenderBridgeStatus(res);
        if (!silentSuccess) {
          showRenderBridgeFeedback('ok', 'projects.detail.renderBridge.installOk');
        }
      } else {
        showRenderBridgeFeedback('error', 'projects.detail.renderBridge.installError');
      }
    } catch {
      showRenderBridgeFeedback('error', 'projects.detail.renderBridge.installError');
    } finally {
      setRenderBridgeBusy(false);
      await loadRenderBridgeStatus(pid);
    }
  }, [
    clearRenderBridgeFeedback,
    detailId,
    loadRenderBridgeStatus,
    setRenderBridgeBusy,
    setRenderBridgeStatus,
    showRenderBridgeFeedback,
  ]);

  useEffect(() => {
    let cancelled = false;
    const pid = String(detailId || '').trim();
    const usageMode = String(detailUsageMode || '').trim();
    if (!pid || detailIsNew || !isRenderBridgeUsage(usageMode)) {
      setRenderBridgeStatus(null);
      clearRenderBridgeFeedback();
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
    clearRenderBridgeFeedback,
    setRenderBridgeBusy,
    setRenderBridgeStatus,
  ]);

  return {
    isRenderBridgeUsage,
    loadRenderBridgeStatus,
    installRenderBridgeForDetail,
  };
}
