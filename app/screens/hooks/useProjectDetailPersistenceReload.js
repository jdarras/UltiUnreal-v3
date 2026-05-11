import { useCallback } from 'react';
import { getProjectMeta } from '../../utils/agent';
import { normPath } from '../../utils/projects-helpers';

export function useProjectDetailPersistenceReload({
  projectFavoritesRef,
  setDetailLoading,
  setDetailMeta,
  setDetailInsights,
  setProjectVersion,
  setProjectVersionMsg,
  setProjectVersionMsgType,
  setProjects,
} = {}) {
  const reloadDetailAfterPathChange = useCallback(async ({
    pid,
    pathValue,
    wrcNamesValue,
    preserved,
  } = {}) => {
    setDetailLoading(true);
    try {
      const res = await getProjectMeta(pid);
      if (res && res.ok) {
        const metaRaw = res.meta || {};
        const mergedMeta = {
          ...metaRaw,
          status: preserved.status ?? metaRaw.status,
          type: preserved.type ?? metaRaw.type,
          usageMode: preserved.usageMode ?? metaRaw.usageMode,
          note: preserved.note ?? metaRaw.note,
          keywords: preserved.keywords ?? metaRaw.keywords,
          referents: { ...(metaRaw.referents || {}), ...(preserved.referents || {}) },
          favorite: projectFavoritesRef?.current?.[String(pid || '').trim()] === true,
        };
        setDetailMeta(mergedMeta);
        setDetailInsights(res.insights || {});
        const pvFromScan = String(res.insights?.projectVersion ?? metaRaw.fileVersion ?? '').trim();
        setProjectVersion(pvFromScan);
        setProjectVersionMsg('');
        setProjectVersionMsgType('');
        setProjects((prev) => prev.map((p) =>
          String(p.id || '').trim() === pid
            ? {
                ...p,
                uproject: pathValue ? normPath(pathValue) : p.uproject,
                wrcNames: wrcNamesValue,
                note: mergedMeta.note,
                metaStatus: mergedMeta.status || '',
                metaType: mergedMeta.type || '',
                metaUsageMode: mergedMeta.usageMode || '',
                metaCategory: mergedMeta.category || '',
                metaFileVersion: mergedMeta.fileVersion ?? '',
                metaReferents: mergedMeta.referents || {},
                metaKeywords: Array.isArray(mergedMeta.keywords) ? mergedMeta.keywords : [],
              }
            : p
        ));
      }
    } catch {}
    finally {
      setDetailLoading(false);
    }
  }, [
    projectFavoritesRef,
    setDetailInsights,
    setDetailLoading,
    setDetailMeta,
    setProjectVersion,
    setProjectVersionMsg,
    setProjectVersionMsgType,
    setProjects,
  ]);

  return { reloadDetailAfterPathChange };
}

export default useProjectDetailPersistenceReload;
