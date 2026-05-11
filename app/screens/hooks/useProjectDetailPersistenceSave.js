import { useCallback } from 'react';
import { saveProjectMeta } from '../../utils/agent';
import { normPath } from '../../utils/projects-helpers';

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
      const updated = projects.map((p) =>
        String(p.id || '').trim() === pid
          ? {
              ...p,
              uproject: pathValue ? normPath(pathValue) : p.uproject,
              wrcNames: wrcNamesValue,
              note: payload.note,
              metaStatus: payload.status || '',
              metaType: payload.type || '',
              metaUsageMode: payload.usageMode || '',
              metaCategory: payload.category || '',
              metaFileVersion: payload.fileVersion ?? '',
              metaReferents: payload.referents || {},
              metaKeywords: payload.keywords || [],
            }
          : p
      );
      setProjects(updated);
      detailSavedNoteRef.current = String(payload.note || '');
      const listSaved = await saveToServer(updated, activeName, activeByHost, activeId);
      if (!listSaved) throw new Error('save_failed');

      if (source === 'indexation') {
        setIndexationMsgType('ok');
        setIndexationMsg(t('projects.detail.indexation.updateOk'));
        setTimeout(() => setIndexationMsg(''), 2000);
      } else if (source === 'intervenants') {
        setIntervenantsMsgType('ok');
        setIntervenantsMsg(t('projects.detail.intervenants.updateOk'));
        setTimeout(() => setIntervenantsMsg(''), 2000);
      }
    } catch {
      if (source === 'indexation') {
        setIndexationMsgType('error');
        setIndexationMsg(t('projects.detail.indexation.updateError'));
        setTimeout(() => setIndexationMsg(''), 2000);
      } else if (source === 'intervenants') {
        setIntervenantsMsgType('error');
        setIntervenantsMsg(t('projects.detail.intervenants.updateError'));
        setTimeout(() => setIntervenantsMsg(''), 2000);
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
    t,
  ]);

  return { saveProjectDetailMeta };
}

export default useProjectDetailPersistenceSave;
