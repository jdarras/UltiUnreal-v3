import { useEffect } from 'react';

export function useResourceDetailEffects({
  detailUid,
  detailItem,
  detailDraft,
  detailMsg,
  deleteConfirmOpen,
  detailDeleteBusy,
  lightboxOpen,
  closeDeleteConfirm,
  triggerDetailSave,
  setDetailUid,
  setDeleteConfirmOpen,
  setDetailMsg,
  setDetailMsgType,
  deleteConfirmOkRef,
  detailSavedRef,
  detailSavedNoteRef,
  detailSaveTimer,
  detailNoteDirtyRef,
  detailNoteFocusedRef,
  detailDropdownDirtyRef,
  detailTagsDirtyRef,
  buildPayload,
  buildSnapshot,
  saveDetail,
} = {}) {
  useEffect(() => {
    window.__closeResourceDetail = async () => {
      triggerDetailSave();
      setDetailUid('');
    };
    return () => {
      if (window.__closeResourceDetail) delete window.__closeResourceDetail;
    };
  }, [setDetailUid, triggerDetailSave]);

  useEffect(() => {
    if (!deleteConfirmOpen) return undefined;
    const onKeyDown = (e) => {
      const key = String(e?.key || '').trim().toLowerCase();
      if (key === 'escape') {
        e.preventDefault();
        e.stopPropagation();
        closeDeleteConfirm(false);
        return;
      }
      if (key === 'enter' && !detailDeleteBusy) {
        e.preventDefault();
        e.stopPropagation();
        closeDeleteConfirm(true);
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    const timer = setTimeout(() => {
      deleteConfirmOkRef.current?.focus?.();
    }, 0);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [closeDeleteConfirm, deleteConfirmOkRef, deleteConfirmOpen, detailDeleteBusy]);

  useEffect(() => {
    if (!detailUid) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (lightboxOpen) return;
        if (deleteConfirmOpen) {
          e.preventDefault();
          e.stopPropagation();
          closeDeleteConfirm(false);
          return;
        }
        e.preventDefault();
        triggerDetailSave();
        setDetailUid('');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    closeDeleteConfirm,
    deleteConfirmOpen,
    detailUid,
    lightboxOpen,
    setDetailUid,
    triggerDetailSave,
  ]);

  useEffect(() => {
    if (!detailUid || !detailItem) return;
    if (detailNoteDirtyRef.current) return;
    const payload = buildPayload();
    const savedSnapshot = detailSavedRef.current || '';

    if (detailDropdownDirtyRef.current || detailTagsDirtyRef.current) return;

    const freezeNote = detailNoteDirtyRef.current || detailNoteFocusedRef.current;
    const payloadFrozen = freezeNote ? { ...payload, note: detailSavedNoteRef.current || '' } : payload;
    const snapshotFrozen = buildSnapshot(payloadFrozen);
    if (snapshotFrozen === savedSnapshot) return;
    if (detailSaveTimer.current) clearTimeout(detailSaveTimer.current);
    detailSaveTimer.current = setTimeout(() => {
      void saveDetail(payloadFrozen, snapshotFrozen);
    }, 700);
    return () => {
      if (detailSaveTimer.current) clearTimeout(detailSaveTimer.current);
    };
  }, [
    buildPayload,
    buildSnapshot,
    detailDraft,
    detailDropdownDirtyRef,
    detailItem,
    detailNoteDirtyRef,
    detailNoteFocusedRef,
    detailSavedNoteRef,
    detailSavedRef,
    detailSaveTimer,
    detailTagsDirtyRef,
    detailUid,
    saveDetail,
  ]);

  useEffect(() => {
    if (detailUid) return;
    if (deleteConfirmOpen) setDeleteConfirmOpen(false);
  }, [deleteConfirmOpen, detailUid, setDeleteConfirmOpen]);

  useEffect(() => {
    if (!detailMsg) return;
    const timer = setTimeout(() => {
      setDetailMsg('');
      setDetailMsgType('');
    }, 2000);
    return () => clearTimeout(timer);
  }, [detailMsg, setDetailMsg, setDetailMsgType]);
}

export default useResourceDetailEffects;
