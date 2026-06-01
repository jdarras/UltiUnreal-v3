import { useCallback } from 'react';
import { getProjectMeta } from '../../utils/agent';
import { clearMessagePair } from './projectDetailFeedbackHelpers';
import {
  buildMergedProjectMeta,
  buildProjectListPatchFromMergedMeta,
  mapProjectById,
} from './projectDetailPersistenceHelpers';

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
        const isFavorite = projectFavoritesRef?.current?.[String(pid || '').trim()] === true;
        const mergedMeta = buildMergedProjectMeta({ metaRaw, preserved, isFavorite });
        setDetailMeta(mergedMeta);
        setDetailInsights(res.insights || {});
        const pvFromScan = String(res.insights?.projectVersion ?? metaRaw.fileVersion ?? '').trim();
        setProjectVersion(pvFromScan);
        clearMessagePair(setProjectVersionMsg, setProjectVersionMsgType);
        const patch = buildProjectListPatchFromMergedMeta({ pathValue, wrcNamesValue, mergedMeta });
        setProjects((prev) => mapProjectById(prev, pid, (current) => ({
          ...patch,
          uproject: patch.uproject ?? current.uproject,
        })));
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
