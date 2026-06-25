import { clearMessagePair } from './projectDetailFeedbackHelpers';

export function useProjectDetailEditor({
  canEditFields,
  detailIsNew,
  detailId,
  detailMeta,
  detailWrcNames,
  projectVersion,
  detailMetaRef,
  detailNoteDirtyRef,
  saveTimer,
  setDetailMeta,
  setIndexationMsg,
  setIndexationMsgType,
  setIntervenantsMsg,
  setIntervenantsMsgType,
  saveDetails,
} = {}) {
  function clearSourceFeedback(source) {
    if (source === 'indexation') {
      clearMessagePair(setIndexationMsg, setIndexationMsgType);
      return;
    }
    if (source === 'intervenants') {
      clearMessagePair(setIntervenantsMsg, setIntervenantsMsgType);
    }
  }

  function updateDetailField(path, value) {
    const base = detailMetaRef.current || detailMeta || {};
    const next = { ...base };
    if (path.startsWith('referents.')) {
      const key = path.split('.')[1];
      next.referents = { ...(next.referents || {}), [key]: value };
    } else if (path === 'status') {
      next.status = value;
    } else if (path === 'type') {
      next.type = value;
    } else if (path === 'usageMode') {
      next.usageMode = value;
    } else if (path === 'syncIncluded') {
      next.syncIncluded = value === true;
    } else if (path === 'category') {
      next.category = value;
    } else if (path === 'fileVersion') {
      next.fileVersion = value;
    } else if (path === 'favorite') {
      next.favorite = !!value;
    } else if (path === 'keywords') {
      next.keywords = value;
    } else if (path === 'note') {
      next.note = value;
      detailNoteDirtyRef.current = true;
    }
    detailMetaRef.current = next;
    setDetailMeta(next);
    return next;
  }

  function scheduleSave(nextMeta, source, overrides = {}) {
    if (!canEditFields) return;
    if (detailIsNew) return;
    const pid = String(detailId || '').trim();
    if (!pid) return;
    if (source === 'indexation' && detailNoteDirtyRef.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    clearSourceFeedback(source);
    const metaSnapshot = nextMeta || detailMetaRef.current || detailMeta || {};
    const metaForSave = { ...metaSnapshot };
    const pathSnapshot = overrides.path !== undefined ? overrides.path : undefined;
    const wrcNamesSnapshot = Array.isArray(overrides.wrcNames) ? overrides.wrcNames : detailWrcNames;
    const pvSnapshot = overrides.pv !== undefined ? overrides.pv : projectVersion;
    const keywordsSnapshot = overrides.keywords !== undefined
      ? overrides.keywords
      : (metaSnapshot.keywords ?? detailMetaRef.current?.keywords ?? detailMeta?.keywords ?? []);
    saveTimer.current = setTimeout(() => {
      saveDetails(metaForSave, pid, pathSnapshot, wrcNamesSnapshot, pvSnapshot, keywordsSnapshot, source);
    }, 500);
  }

  return {
    updateDetailField,
    scheduleSave,
  };
}
