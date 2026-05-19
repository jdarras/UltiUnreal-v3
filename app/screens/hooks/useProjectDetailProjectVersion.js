import { useCallback, useEffect } from 'react';
import { setProjectVersion as agentSetPV } from '../../utils/agent';
import { useTransientClearTimer } from './useTransientClearTimer';

export function useProjectDetailProjectVersion({
  t,
  canEditFields,
  detailId,
  detailIsNew,
  detailInsights,
  detailMeta,
  projectVersion,
  setProjectVersion,
  setProjectVersionMsg,
  setProjectVersionMsgType,
  setProjectVersionBusy,
  setDetailInsights,
  setDetailMeta,
  setProjects,
  projectVersionTimer,
} = {}) {
  const { scheduleClear } = useTransientClearTimer();

  const clearProjectVersionFeedback = useCallback(() => {
    setProjectVersionMsg('');
    setProjectVersionMsgType('');
  }, [setProjectVersionMsg, setProjectVersionMsgType]);

  useEffect(() => {
    if (!detailId || detailIsNew) {
      if (projectVersionTimer.current) clearTimeout(projectVersionTimer.current);
      setProjectVersion('');
      clearProjectVersionFeedback();
      setProjectVersionBusy(false);
      return;
    }
    const pv = String(detailInsights?.projectVersion ?? detailMeta?.fileVersion ?? '').trim();
    setProjectVersion(pv);
  }, [
    detailId,
    detailIsNew,
    detailInsights?.projectVersion,
    detailMeta?.fileVersion,
    projectVersionTimer,
    setProjectVersion,
    clearProjectVersionFeedback,
    setProjectVersionBusy,
  ]);

  const saveProjectVersion = useCallback(async (value) => {
    if (!canEditFields) return;
    if (detailIsNew) return;
    const pid = String(detailId || '').trim();
    if (!pid) return;
    const pv = String(value ?? '').trim();
    if (!pv) {
      setProjectVersion('');
      clearProjectVersionFeedback();
      return;
    }
    const currentSaved = String(detailInsights?.projectVersion ?? '').trim();
    if (pv === currentSaved) {
      clearProjectVersionFeedback();
      return;
    }
    setProjectVersionBusy(true);
    clearProjectVersionFeedback();
    try {
      const res = await agentSetPV(pid, pv);
      if (!res || res.ok === false) throw new Error(res?.error || 'save_failed');
      setProjectVersionMsg(t('projects.detail.projectVersion.updateOk'));
      setProjectVersionMsgType('ok');
      setDetailInsights((prev) => ({ ...(prev || {}), projectVersion: pv }));
      setDetailMeta((prev) => ({ ...(prev || {}), fileVersion: pv }));
      setProjects((prev) =>
        prev.map((p) =>
          String(p.id || '').trim() === pid
            ? { ...p, metaFileVersion: pv }
            : p
        )
      );
      scheduleClear(clearProjectVersionFeedback, 2000);
    } catch {
      setProjectVersionMsg(t('projects.detail.projectVersion.updateError'));
      setProjectVersionMsgType('error');
    } finally {
      setProjectVersionBusy(false);
    }
  }, [
    canEditFields,
    detailId,
    detailIsNew,
    detailInsights?.projectVersion,
    setDetailInsights,
    setDetailMeta,
    setProjectVersion,
    setProjectVersionBusy,
    setProjects,
    clearProjectVersionFeedback,
    scheduleClear,
    t,
  ]);

  const scheduleProjectVersionSave = useCallback((nextValue) => {
    if (!canEditFields) return;
    if (detailIsNew) return;
    if (projectVersionTimer.current) clearTimeout(projectVersionTimer.current);
    const val = nextValue !== undefined ? nextValue : projectVersion;
    projectVersionTimer.current = setTimeout(() => {
      saveProjectVersion(val);
    }, 450);
  }, [canEditFields, detailIsNew, projectVersion, projectVersionTimer, saveProjectVersion]);

  return {
    saveProjectVersion,
    scheduleProjectVersionSave,
  };
}
