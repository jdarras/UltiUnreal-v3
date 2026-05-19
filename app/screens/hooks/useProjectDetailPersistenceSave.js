import { useCallback } from 'react';
import { saveProjectMeta } from '../../utils/agent';
import {
  buildProjectListPatchFromPayload,
  mapProjectById,
} from './projectDetailPersistenceHelpers';
import { useTransientClearTimer } from './useTransientClearTimer';

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

      if (source === 'indexation') {
        setIndexationMsgType('ok');
        setIndexationMsg(t('projects.detail.indexation.updateOk'));
        scheduleClear(() => setIndexationMsg(''), 2000);
      } else if (source === 'intervenants') {
        setIntervenantsMsgType('ok');
        setIntervenantsMsg(t('projects.detail.intervenants.updateOk'));
        scheduleClear(() => setIntervenantsMsg(''), 2000);
      }
    } catch {
      if (source === 'indexation') {
        setIndexationMsgType('error');
        setIndexationMsg(t('projects.detail.indexation.updateError'));
        scheduleClear(() => setIndexationMsg(''), 2000);
      } else if (source === 'intervenants') {
        setIntervenantsMsgType('error');
        setIntervenantsMsg(t('projects.detail.intervenants.updateError'));
        scheduleClear(() => setIntervenantsMsg(''), 2000);
      }
    }
  }, [
    activeByHost,
    activeId,
    activeName,
    detailSavedNoteRef,
    projects,
    saveToServer,
    setIndexationMsg,
    setIndexationMsgType,
    setIntervenantsMsg,
    setIntervenantsMsgType,
    setProjects,
    scheduleClear,
    t,
  ]);

  return { saveProjectDetailMeta };
}
