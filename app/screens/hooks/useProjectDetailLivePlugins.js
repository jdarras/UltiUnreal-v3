import { useCallback, useEffect } from 'react';
import { getProjectLivePluginsStatus, installProjectPlugin } from '../../utils/agent';
import { clearMessagePair, setTypedMessage } from './projectDetailFeedbackHelpers';

export function useProjectDetailLivePlugins({
  t,
  detailId,
  detailIsNew,
  livePluginsEnabled = false,
  setLivePluginsStatus,
  setLivePluginsBusy,
  setLivePluginsMsg,
  setLivePluginsMsgType,
} = {}) {
  const clearLivePluginsFeedback = useCallback(() => {
    clearMessagePair(setLivePluginsMsg, setLivePluginsMsgType);
  }, [setLivePluginsMsg, setLivePluginsMsgType]);

  const showLivePluginsFeedback = useCallback((type, key) => {
    setTypedMessage(setLivePluginsMsg, setLivePluginsMsgType, type, t(key));
  }, [setLivePluginsMsg, setLivePluginsMsgType, t]);

  const loadLivePluginsStatus = useCallback(async (projectId) => {
    const pid = String(projectId || '').trim();
    if (!pid) {
      setLivePluginsStatus([]);
      return { ok: false, error: 'missing projectId' };
    }
    setLivePluginsBusy(true);
    clearLivePluginsFeedback();
    try {
      const res = await getProjectLivePluginsStatus(pid);
      if (res && res.ok) {
        const plugins = Array.isArray(res.plugins) ? res.plugins : [];
        setLivePluginsStatus(plugins);
        return { ...res, plugins };
      }
      setLivePluginsStatus([]);
      showLivePluginsFeedback('error', 'projects.detail.livePlugins.statusError');
      return res || { ok: false, error: 'status_failed' };
    } catch {
      setLivePluginsStatus([]);
      showLivePluginsFeedback('error', 'projects.detail.livePlugins.statusError');
      return { ok: false, error: 'status_failed' };
    } finally {
      setLivePluginsBusy(false);
    }
  }, [
    clearLivePluginsFeedback,
    setLivePluginsBusy,
    setLivePluginsStatus,
    showLivePluginsFeedback,
  ]);

  const installLiveProjectPlugin = useCallback(async (pluginKey, projectIdOverride = '') => {
    const pid = String(projectIdOverride || detailId || '').trim();
    const key = String(pluginKey || '').trim();
    if (!pid || !key) return;
    setLivePluginsBusy(true);
    clearLivePluginsFeedback();
    try {
      const res = await installProjectPlugin(pid, key);
      if (res && res.ok) {
        showLivePluginsFeedback('ok', 'projects.detail.livePlugins.installOk');
      } else {
        showLivePluginsFeedback('error', 'projects.detail.livePlugins.installError');
      }
    } catch {
      showLivePluginsFeedback('error', 'projects.detail.livePlugins.installError');
    } finally {
      setLivePluginsBusy(false);
      await loadLivePluginsStatus(pid);
    }
  }, [
    clearLivePluginsFeedback,
    detailId,
    loadLivePluginsStatus,
    setLivePluginsBusy,
    showLivePluginsFeedback,
  ]);

  useEffect(() => {
    const pid = String(detailId || '').trim();
    if (!pid || detailIsNew || !livePluginsEnabled) {
      setLivePluginsStatus([]);
      clearLivePluginsFeedback();
      setLivePluginsBusy(false);
      return;
    }
    loadLivePluginsStatus(pid);
  }, [
    clearLivePluginsFeedback,
    detailId,
    detailIsNew,
    livePluginsEnabled,
    loadLivePluginsStatus,
    setLivePluginsBusy,
    setLivePluginsStatus,
  ]);

  return {
    loadLivePluginsStatus,
    installLiveProjectPlugin,
  };
}
