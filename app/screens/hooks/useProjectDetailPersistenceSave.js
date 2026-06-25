import { useCallback } from 'react';
import { saveProjectMeta } from '../../utils/agent';
import {
  buildProjectListPatchFromPayload,
  mapProjectById,
} from './projectDetailPersistenceHelpers';
import { useTransientClearTimer } from './useTransientClearTimer';
import { setTypedMessage } from './projectDetailFeedbackHelpers';

export function useProjectDetailPersistenceSave({
  t,
  projects,
  activeName,
  activeId,
  activeByHost,
  saveToServer,
  detailSavedNoteRef,
  setProjects,
  setIndexationMsg,
  setIndexationMsgType,
  setIntervenantsMsg,
  setIntervenantsMsgType,
} = {}) {
  const { scheduleClear } = useTransientClearTimer();
  const applySourceFeedback = useCallback((source, type) => {
    if (source === 'indexation') {
      setTypedMessage(
        setIndexationMsg,
        setIndexationMsgType,
        type,
        t(
          type === 'ok'
            ? 'projects.detail.indexation.updateOk'
            : 'projects.detail.indexation.updateError'
        )
      );
      scheduleClear(() => setIndexationMsg(''), 2000);
      return;
    }
    if (source === 'intervenants') {
      setTypedMessage(
        setIntervenantsMsg,
        setIntervenantsMsgType,
        type,
        t(
          type === 'ok'
            ? 'projects.detail.intervenants.updateOk'
            : 'projects.detail.intervenants.updateError'
        )
      );
      scheduleClear(() => setIntervenantsMsg(''), 2000);
    }
  }, [
    scheduleClear,
    setIndexationMsg,
    setIndexationMsgType,
    setIntervenantsMsg,
    setIntervenantsMsgType,
    t,
  ]);

  const saveProjectDetailMeta = useCallback(async ({
    pid,
    payload,
    pathValue,
    wrcNamesValue,
    source,
  } = {}) => {
    try {
      const res = await saveProjectMeta(pid, payload);
      if (!res || res.ok === false) throw new Error(res?.error || 'save_failed');
      const patch = buildProjectListPatchFromPayload({ pathValue, wrcNamesValue, payload });
      const updated = mapProjectById(projects, pid, (current) => ({
        ...patch,
        uproject: patch.uproject ?? current.uproject,
      }));
      setProjects(updated);
      detailSavedNoteRef.current = String(payload.note || '');
      const listSaved = await saveToServer(updated, activeName, activeByHost, activeId);
      if (!listSaved) throw new Error('save_failed');

      window.dispatchEvent(new CustomEvent('ultiunreal:sync-state-changed'));

      applySourceFeedback(source, 'ok');
    } catch {
      applySourceFeedback(source, 'error');
    }
  }, [
    activeByHost,
    activeId,
    activeName,
    applySourceFeedback,
    detailSavedNoteRef,
    projects,
    saveToServer,
    setProjects,
  ]);

  return { saveProjectDetailMeta };
}
