import { useResourceDetailPersistence } from './useResourceDetailPersistence';
import { useResourceDetailEffects } from './useResourceDetailEffects';
import { useResourceDetailNavigation } from './useResourceDetailNavigation';
import { useResourceDetailLightbox } from './useResourceDetailLightbox';

export function useResourceDetailCoreControllers({
  context = {},
  stateSetters = {},
  refs = {},
} = {}) {
  const {
    detailUid,
    detailItem,
    detailDraft,
    detailDeleteBusy,
    deleteConfirmOpen,
    lightboxOpen,
    lightboxIndex,
    lightboxItems,
    detailList,
    detailIndex,
  } = context;
  const {
    setItems,
    setDetailData,
    setDetailUid,
    setDetailBusy,
    setDetailDeleteBusy,
    setDeleteConfirmOpen,
    setLightboxIndex,
  } = stateSetters;
  const {
    detailSavedRef,
    detailSavedNoteRef,
    detailSaveTimer,
    detailPendingRef,
    detailSavingRef,
    detailDropdownDirtyRef,
    detailTagsDirtyRef,
    detailNoteDirtyRef,
    detailNoteFocusedRef,
    deleteConfirmTriggerRef,
    deleteConfirmOkRef,
    resourceFavoritesRef,
  } = refs;

  const {
    buildPayload,
    buildSnapshot,
    saveDetail,
    closeDeleteConfirm,
    triggerDetailSave,
  } = useResourceDetailPersistence({
    detailUid,
    detailItem,
    detailDraft,
    detailDeleteBusy,
    setItems,
    setDetailData,
    setDetailUid,
    setDetailBusy,
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
  });

  useResourceDetailEffects({
    detailUid,
    detailItem,
    detailDraft,
    deleteConfirmOpen,
    detailDeleteBusy,
    lightboxOpen,
    closeDeleteConfirm,
    triggerDetailSave,
    setDetailUid,
    setDeleteConfirmOpen,
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
  });

  const { openDetail, stepDetail, openLightboxAt, closeLightbox, stepLightbox } = useResourceDetailNavigation({
    detailList,
    detailIndex,
    lightboxItems,
    setDetailUid,
    setLightboxIndex,
  });

  useResourceDetailLightbox({
    detailUid,
    lightboxIndex,
    lightboxItems,
    lightboxOpen,
    setLightboxIndex,
    closeLightbox,
    stepLightbox,
  });

  return {
    triggerDetailSave,
    closeDeleteConfirm,
    openDetail,
    stepDetail,
    openLightboxAt,
    closeLightbox,
    stepLightbox,
  };
}
