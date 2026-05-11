import { useCallback } from 'react';
import { postLibraryItem } from '../../utils/agent';
import {
  normalizeUid,
  normalizeValue,
  normalizeRating,
  splitKeywords,
  normalizeList,
  normalizeResource,
  applyFavoriteToResource,
} from '../../utils/resources-helpers';

export function useResourceDetailPersistence({
  t,
  detailUid,
  detailItem,
  detailDraft,
  detailDeleteBusy,
  setItems,
  setDetailData,
  setDetailUid,
  setDetailBusy,
  setDetailMsg,
  setDetailMsgType,
  setDetailDeleteBusy,
  setDeleteConfirmOpen,
  detailSavedRef,
  detailSavedNoteRef,
  detailSaveTimer,
  detailPendingRef,
  detailSavingRef,
  detailDropdownDirtyRef,
  detailTagsDirtyRef,
  detailNoteDirtyRef,
  deleteConfirmTriggerRef,
  resourceFavoritesRef,
} = {}) {
  const buildPayload = useCallback(
    (noteOverride) => {
      const preservedType = normalizeValue(detailItem?.user?.type);
      const preservedStatus = normalizeValue(detailItem?.user?.status);
      return {
        status: preservedStatus,
        type: preservedType,
        usage: detailDraft.usage,
        style: detailDraft.style,
        ambiance: detailDraft.ambiance,
        license: detailDraft.license,
        purchased: !!detailDraft.purchased,
        tested: !!detailDraft.tested,
        ratingQuality: normalizeRating(detailDraft.ratingQuality),
        ratingPerformance: normalizeRating(detailDraft.ratingPerformance),
        keywords: splitKeywords(detailDraft.tags),
        note: noteOverride !== undefined ? String(noteOverride || '') : String(detailDraft.note || ''),
      };
    },
    [detailDraft, detailItem]
  );

  const buildSnapshot = useCallback((payload) => {
    return JSON.stringify({
      status: payload.status,
      usage: payload.usage,
      style: payload.style,
      ambiance: payload.ambiance,
      license: payload.license,
      tested: payload.tested,
      ratingQuality: payload.ratingQuality,
      ratingPerformance: payload.ratingPerformance,
      tags: normalizeList(payload.keywords).sort(),
      note: payload.note,
    });
  }, []);

  const saveDetail = useCallback(async (payload, snapshot) => {
    if (!detailUid) return;
    if (detailSavingRef.current) {
      detailPendingRef.current = { payload, snapshot };
      return;
    }
    detailSavingRef.current = true;
    setDetailBusy(true);
    let nextRun = { payload, snapshot };
    try {
      while (nextRun) {
        const runPayload = nextRun.payload;
        const runSnapshot = nextRun.snapshot;
        nextRun = null;
        setDetailMsg('');
        setDetailMsgType('');
        try {
          const body = { uid: detailUid, user: runPayload };
          const res = await postLibraryItem(body).catch(() => ({}));
          const ok = res && res.ok !== false;
          if (ok && res?.item) {
            const normalizedItem = applyFavoriteToResource(
              normalizeResource(res.item),
              resourceFavoritesRef?.current
            );
            setItems((prev) =>
              prev.map((it) => (normalizeUid(it?.uid) === normalizeUid(detailUid) ? normalizedItem : it))
            );
            setDetailData((prev) => {
              if (!prev || normalizeUid(prev?.uid) !== normalizeUid(detailUid)) return prev;
              return res.item?.user
                ? applyFavoriteToResource(
                    { ...prev, user: res.item.user },
                    resourceFavoritesRef?.current
                  )
                : prev;
            });
            if (runSnapshot) {
              detailSavedRef.current = runSnapshot;
              try {
                const parsed = JSON.parse(runSnapshot);
                detailSavedNoteRef.current = String(parsed?.note || '');
              } catch {
                detailSavedNoteRef.current = runPayload.note || '';
              }
            }
            setDetailMsgType('ok');
            setDetailMsg(t('resources.detail.saveOk'));
          } else {
            setDetailMsgType('error');
            setDetailMsg(t('resources.detail.saveError'));
          }
        } catch {
          setDetailMsgType('error');
          setDetailMsg(t('resources.detail.saveError'));
        }
        const pending = detailPendingRef.current;
        detailPendingRef.current = null;
        if (pending && pending.snapshot !== detailSavedRef.current) {
          nextRun = pending;
        }
      }
    } finally {
      detailSavingRef.current = false;
      setDetailBusy(false);
    }
  }, [
    detailUid,
    detailPendingRef,
    detailSavingRef,
    detailSavedRef,
    detailSavedNoteRef,
    resourceFavoritesRef,
    setItems,
    setDetailBusy,
    setDetailData,
    setDetailMsg,
    setDetailMsgType,
    t,
  ]);

  const handleDeleteResource = useCallback(async () => {
    const uid = normalizeUid(detailUid);
    if (!uid || detailDeleteBusy) return;
    setDetailMsg('');
    setDetailMsgType('');
    setDetailDeleteBusy(true);
    try {
      const baseUser = detailItem?.user && typeof detailItem.user === 'object' ? detailItem.user : {};
      const user = { ...baseUser, status: 'deleted', deletedAt: new Date().toISOString() };
      const res = await postLibraryItem({ uid: detailUid, user }).catch(() => ({}));
      const ok = res && res.ok !== false;
      if (ok) {
        setItems((prev) => prev.filter((it) => normalizeUid(it?.uid) !== uid));
        setDetailUid('');
      } else {
        setDetailMsgType('error');
        setDetailMsg(t('resources.detail.deleteError'));
      }
    } catch {
      setDetailMsgType('error');
      setDetailMsg(t('resources.detail.deleteError'));
    } finally {
      setDetailDeleteBusy(false);
    }
  }, [
    detailUid,
    detailItem,
    detailDeleteBusy,
    setDetailDeleteBusy,
    setDetailMsg,
    setDetailMsgType,
    setItems,
    setDetailUid,
    t,
  ]);

  const closeDeleteConfirm = useCallback(
    (confirmed = false) => {
      setDeleteConfirmOpen(false);
      if (confirmed && !detailDeleteBusy) {
        void handleDeleteResource();
        return;
      }
      setTimeout(() => {
        deleteConfirmTriggerRef.current?.focus?.();
      }, 0);
    },
    [deleteConfirmTriggerRef, detailDeleteBusy, handleDeleteResource, setDeleteConfirmOpen]
  );

  const triggerDetailSave = useCallback(() => {
    detailDropdownDirtyRef.current = false;
    detailTagsDirtyRef.current = false;
    const payload = buildPayload();
    const snapshot = buildSnapshot(payload);
    detailSavedNoteRef.current = payload.note;
    detailNoteDirtyRef.current = false;
    if (detailSaveTimer.current) clearTimeout(detailSaveTimer.current);
    void saveDetail(payload, snapshot);
  }, [
    buildPayload,
    buildSnapshot,
    detailDropdownDirtyRef,
    detailTagsDirtyRef,
    detailSavedNoteRef,
    detailNoteDirtyRef,
    detailSaveTimer,
    saveDetail,
  ]);

  return {
    buildPayload,
    buildSnapshot,
    saveDetail,
    handleDeleteResource,
    closeDeleteConfirm,
    triggerDetailSave,
  };
}

export default useResourceDetailPersistence;
