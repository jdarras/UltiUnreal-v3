import { useCallback } from 'react';
import { getProjectMeta } from '../../utils/agent';

export function useProjectDetailLifecycle({
  detailId,
  detailIsNew,
  detailMeta,
  detailPath,
  detailWrcNames,
  projectVersion,
  projects,
  projectFavoritesRef,
  saveTimer,
  detailMetaRef,
  detailSavedNoteRef,
  detailNoteDirtyRef,
  keywordsDirtyRef,
  projectDropdownDirtyRef,
  setDetailId,
  setDetailIsNew,
  setDetailName,
  setDetailPath,
  setDetailWrcNames,
  setDetailLoading,
  setDetailMeta,
  setDetailInsights,
  setProjectVersion,
  setProjects,
  resetDetailState,
  saveDetails,
} = {}) {
  const closeDetailAndSave = useCallback(async (nextDetailId = '') => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (!detailId || detailIsNew) {
      setDetailId(nextDetailId);
      return;
    }
    const pid = String(detailId || '').trim();
    if (!pid) {
      setDetailId(nextDetailId);
      return;
    }
    const metaSnapshot = detailMetaRef.current || detailMeta || {};
    const keywordsSnapshot = metaSnapshot.keywords
      ?? detailMetaRef.current?.keywords
      ?? detailMeta?.keywords
      ?? [];
    keywordsDirtyRef.current = false;
    projectDropdownDirtyRef.current = false;
    detailSavedNoteRef.current = String(metaSnapshot.note || '');
    detailNoteDirtyRef.current = false;
    try {
      await saveDetails(
        metaSnapshot,
        pid,
        detailPath,
        detailWrcNames,
        projectVersion,
        keywordsSnapshot,
        'indexation'
      );
    } catch {}
    finally {
      setDetailId(nextDetailId);
    }
  }, [
    detailId,
    detailIsNew,
    detailMeta,
    detailMetaRef,
    detailNoteDirtyRef,
    detailPath,
    detailSavedNoteRef,
    detailWrcNames,
    keywordsDirtyRef,
    projectDropdownDirtyRef,
    projectVersion,
    saveDetails,
    saveTimer,
    setDetailId,
  ]);

  const openDetails = useCallback(async (projectId) => {
    const pid = String(projectId || '').trim();
    if (!pid) return;
    if (detailId && pid !== detailId) {
      await closeDetailAndSave(pid);
    }
    const proj = projects.find((p) => String(p.id || '').trim() === pid);
    setDetailIsNew(false);
    setDetailName(proj?.name || '');
    setDetailPath(proj?.uproject || proj?.projectPath || '');
    setDetailWrcNames(Array.isArray(proj?.wrcNames) ? proj.wrcNames : (proj?.wrcName ? [proj.wrcName] : []));
    setDetailId(pid);
    setDetailLoading(true);
    resetDetailState();
    try {
      const res = await getProjectMeta(pid);
      if (res && res.ok) {
        const metaRaw = res.meta || {};
        const normalizedStatus = metaRaw.status === 'PAS' ? 'PAD' : metaRaw.status;
        const insightsPv = String(res.insights?.projectVersion ?? '').trim();
        const isFavorite = projectFavoritesRef?.current?.[String(pid || '').trim()] === true;
        const meta = {
          ...metaRaw,
          status: normalizedStatus,
          favorite: isFavorite,
          ...(insightsPv ? { fileVersion: insightsPv } : {}),
        };
        setDetailMeta(meta);
        detailSavedNoteRef.current = String(meta.note || '');
        detailNoteDirtyRef.current = false;
        setDetailInsights(res.insights || {});
        const initialPv = insightsPv || String(metaRaw.fileVersion ?? '').trim();
        setProjectVersion(initialPv);
        const update = {};
        if (typeof meta.note === 'string') update.note = meta.note;
        if (meta.status !== undefined) update.metaStatus = meta.status || '';
        if (meta.type !== undefined) update.metaType = meta.type || '';
        if (meta.usageMode !== undefined) update.metaUsageMode = String(meta.usageMode || '');
        if (meta.category !== undefined) update.metaCategory = String(meta.category || '');
        if (meta.fileVersion !== undefined) update.metaFileVersion = meta.fileVersion;
        if (meta.referents) update.metaReferents = meta.referents;
        if (meta.keywords) update.metaKeywords = Array.isArray(meta.keywords) ? meta.keywords : [];
        update.favorite = isFavorite;
        if (Object.keys(update).length) {
          setProjects((prev) =>
            prev.map((p) =>
              String(p.id || '').trim() === pid ? { ...p, ...update } : p
            )
          );
        }
      } else {
        setDetailMeta({ favorite: projectFavoritesRef?.current?.[String(pid || '').trim()] === true });
        detailSavedNoteRef.current = '';
        detailNoteDirtyRef.current = false;
        setDetailInsights({});
      }
    } catch {
      setDetailMeta({ favorite: projectFavoritesRef?.current?.[String(pid || '').trim()] === true });
      detailSavedNoteRef.current = '';
      detailNoteDirtyRef.current = false;
      setDetailInsights({});
    } finally {
      setDetailLoading(false);
    }
  }, [
    closeDetailAndSave,
    detailId,
    detailNoteDirtyRef,
    detailSavedNoteRef,
    projectFavoritesRef,
    projects,
    resetDetailState,
    setDetailId,
    setDetailInsights,
    setDetailIsNew,
    setDetailLoading,
    setDetailMeta,
    setDetailName,
    setDetailPath,
    setDetailWrcNames,
    setProjectVersion,
    setProjects,
  ]);

  return {
    openDetails,
    closeDetailAndSave,
  };
}
