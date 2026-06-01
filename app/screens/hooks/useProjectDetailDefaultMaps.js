import { useCallback } from 'react';
import { getProjectMeta, setProjectDefaultMaps } from '../../utils/agent';
import { useTransientClearTimer } from './useTransientClearTimer';
import { clearMessagePair, setTypedMessage } from './projectDetailFeedbackHelpers';

export function useProjectDetailDefaultMaps({
  t,
  detailId,
  setDetailInsights,
  setProjects,
  setMapsBusy,
  setMapsMsg,
  setMapsMsgType,
} = {}) {
  const { scheduleClear } = useTransientClearTimer();
  const clearMapsFeedback = useCallback(() => {
    clearMessagePair(setMapsMsg, setMapsMsgType);
  }, [setMapsMsg, setMapsMsgType]);

  const showMapsFeedback = useCallback((type, key, clearAfterMs = 0) => {
    setTypedMessage(setMapsMsg, setMapsMsgType, type, t(key));
    if (Number(clearAfterMs) > 0) {
      scheduleClear(() => setMapsMsg(''), clearAfterMs);
    }
  }, [scheduleClear, setMapsMsg, setMapsMsgType, t]);

  const applyDefaultMapsPatch = useCallback(async (patch = {}) => {
    const pid = String(detailId || '').trim();
    const p = patch && typeof patch === 'object' ? patch : {};
    const game = String(p.gameDefaultMap || '').trim();
    const editor = String(p.editorStartupMap || '').trim();
    if (!pid || (!game && !editor)) return;

    setMapsBusy(true);
    clearMapsFeedback();
    setDetailInsights((prev) => ({
      ...(prev || {}),
      maps: {
        ...((prev && prev.maps) ? prev.maps : {}),
        ...(game ? { defaultGame: game } : {}),
        ...(editor ? { defaultEditor: editor } : {}),
      },
    }));
    try {
      const res = await setProjectDefaultMaps(pid, { gameDefaultMap: game, editorStartupMap: editor });
      if (!res || res.ok === false) throw new Error(res?.error || 'save_failed');

      let nextInsights = null;
      try {
        const next = await getProjectMeta(pid);
        if (next && next.ok) {
          nextInsights = next.insights || {};
          setDetailInsights(nextInsights);
        }
      } catch {}

      if (nextInsights && nextInsights.maps) {
        const mapsNext = nextInsights.maps;
        setProjects((prev) => prev.map((p2) => (
          String(p2.id || '').trim() === pid
            ? { ...p2, maps: { ...mapsNext } }
            : p2
        )));
      }

      const okKey = (game && editor)
        ? 'projects.detail.maps.updateOk'
        : (game ? 'projects.detail.maps.updateOkGame' : 'projects.detail.maps.updateOkEditor');
      showMapsFeedback('ok', okKey, 2000);
    } catch {
      showMapsFeedback('error', 'projects.detail.maps.updateError');
    } finally {
      setMapsBusy(false);
    }
  }, [
    clearMapsFeedback,
    detailId,
    setDetailInsights,
    setMapsBusy,
    setProjects,
    showMapsFeedback,
  ]);

  return { applyDefaultMapsPatch };
}
