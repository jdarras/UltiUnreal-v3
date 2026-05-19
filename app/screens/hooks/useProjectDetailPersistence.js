import { useCallback } from 'react';
import { normalizeKeywordsList } from '../../utils/projectsScreenUtils';
import { useProjectDetailPersistenceSave } from './useProjectDetailPersistenceSave';
import { useProjectDetailPersistenceReload } from './useProjectDetailPersistenceReload';
import {
  buildProjectDetailPayload,
  buildProjectDetailPreserved,
} from './projectDetailPersistenceHelpers';

export function useProjectDetailPersistence({
  t,
  canEditFields,
  detailIsNew,
  detailId,
  detailMeta,
  detailPath,
  detailWrcNames,
  projectVersion,
  projects,
  activeName,
  activeId,
  activeByHost,
  saveToServer,
  projectFavoritesRef,
  detailMetaRef,
  detailSavedNoteRef,
  setDetailLoading,
  setDetailMeta,
  setDetailInsights,
  setProjectVersion,
  setProjectVersionMsg,
  setProjectVersionMsgType,
  setProjects,
  setIndexationMsg,
  setIndexationMsgType,
  setIntervenantsMsg,
  setIntervenantsMsgType,
} = {}) {
  const { saveProjectDetailMeta } = useProjectDetailPersistenceSave({
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
  });

  const { reloadDetailAfterPathChange } = useProjectDetailPersistenceReload({
    projectFavoritesRef,
    setDetailLoading,
    setDetailMeta,
    setDetailInsights,
    setProjectVersion,
    setProjectVersionMsg,
    setProjectVersionMsgType,
    setProjects,
  });

  const saveDetails = useCallback(async (
    metaOverride,
    pidOverride,
    pathOverride,
    wrcNamesOverride,
    pvOverride,
    keywordsOverride,
    source,
  ) => {
    if (!canEditFields) return;
    if (detailIsNew) return;
    const pid = String(pidOverride || detailId || '').trim();
    if (!pid) return;
    const meta = metaOverride || detailMetaRef.current || detailMeta || {};
    const pathValue = pathOverride !== undefined ? pathOverride : detailPath;
    const wrcNamesValue = Array.isArray(wrcNamesOverride) ? wrcNamesOverride : detailWrcNames;
    const pvValue = pvOverride !== undefined ? pvOverride : projectVersion;
    const keywordsValue = keywordsOverride !== undefined
      ? keywordsOverride
      : (meta.keywords ?? detailMetaRef.current?.keywords ?? detailMeta?.keywords ?? []);
    const keywords = normalizeKeywordsList(keywordsValue);
    const payload = buildProjectDetailPayload({ meta, pvValue, wrcNamesValue, keywords });
    await saveProjectDetailMeta({
      pid,
      payload,
      pathValue,
      wrcNamesValue,
      source,
    });

    if (pathOverride !== undefined && !detailIsNew) {
      const preserved = buildProjectDetailPreserved(meta);
      await reloadDetailAfterPathChange({
        pid,
        pathValue,
        wrcNamesValue,
        preserved,
      });
    }
  }, [
    canEditFields,
    detailId,
    detailIsNew,
    detailMeta,
    detailMetaRef,
    detailPath,
    detailWrcNames,
    projectVersion,
    reloadDetailAfterPathChange,
    saveProjectDetailMeta,
  ]);

  return { saveDetails };
}
