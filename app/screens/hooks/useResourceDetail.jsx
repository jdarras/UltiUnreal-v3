import { useResourceDetailDraftInit } from './useResourceDetailDraftInit';
import { useResourceDetailGallery } from './useResourceDetailGallery';
import { useResourceDetailMeta } from './useResourceDetailMeta';
import { useResourceDetailState } from './useResourceDetailState';
import { useResourceDetailRefs } from './useResourceDetailRefs';
import { useResourceDetailLoader } from './useResourceDetailLoader';
import { useResourceDetailSelection } from './useResourceDetailSelection';
import { useResourceDetailUiEffects } from './useResourceDetailUiEffects';
import { useResourceDetailDerived } from './useResourceDetailDerived';
import { useResourceDetailControllers } from './useResourceDetailControllers';

export function useResourceDetail({
  t,
  lang,
  items,
  setItems,
  busy,
  resourceFavoritesRef,
  setResourceFavorites,
  filteredResources,
  userUeVersionSet,
  unrealLauncherPath,
  refreshUserVersions,
}) {
  const {
    detailUid,
    setDetailUid,
    detailData,
    setDetailData,
    detailLoading,
    setDetailLoading,
    detailDraft,
    setDetailDraft,
    detailMsg,
    setDetailMsg,
    setDetailMsgType,
    detailBusy,
    setDetailBusy,
    detailDeleteBusy,
    setDetailDeleteBusy,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    tagInput,
    setTagInput,
    lightboxIndex,
    setLightboxIndex,
  } = useResourceDetailState();

  const {
    aliveRef,
    detailNoteRef,
    detailNoteDirtyRef,
    detailNoteFocusedRef,
    detailTagsRef,
    detailTagsDirtyRef,
    detailSavedRef,
    detailSavedNoteRef,
    detailSaveTimer,
    detailPendingRef,
    detailSavingRef,
    detailInitRef,
    detailDropdownDirtyRef,
    deleteConfirmTriggerRef,
    deleteConfirmOkRef,
  } = useResourceDetailRefs();

  useResourceDetailLoader({
    detailUid,
    detailInitRef,
    aliveRef,
    resourceFavoritesRef,
    setDetailData,
    setDetailLoading,
  });

  const { detailItem, detailList, detailIndex, detailHasNav, detailTitle } = useResourceDetailSelection({
    detailUid,
    detailData,
    items,
    filteredResources,
  });
  const {
    vendorDescription,
    detailTagsList,
    detailTagsSet,
  } = useResourceDetailDerived({
    detailItem,
    detailDraftTags: detailDraft.tags,
  });
  const {
    galleryBlockItems,
    heroActiveIndex,
    detailHeroSrc,
    heroNavAvailable,
    lightboxItems,
    setHeroIndex,
    stepHero,
  } = useResourceDetailGallery({
    detailUid,
    detailItem,
  });

  const { detailUeBadges, detailInfoLines } = useResourceDetailMeta({
    detailItem,
    userUeVersionSet,
    t,
    lang,
  });

  const lightboxOpen = lightboxIndex >= 0;

  useResourceDetailDraftInit({
    detailUid,
    detailItem,
    busy,
    detailLoading,
    detailInitRef,
    detailSavedRef,
    detailSavedNoteRef,
    detailNoteDirtyRef,
    setDetailUid,
    setDetailDraft,
    setDetailMsg,
    setDetailMsgType,
  });

  useResourceDetailUiEffects({
    detailUid,
    detailDraftNote: detailDraft.note,
    detailNoteRef,
    setTagInput,
  });

  const {
    triggerDetailSave,
    closeDeleteConfirm,
    openDetail,
    stepDetail,
    openLightboxAt,
    closeLightbox,
    stepLightbox,
    handleOpen,
    handleLaunchInUnreal,
    handleResourceImageContextMenu,
    addTagToDraft,
    removeTagFromDraft,
    handleTagInputKeyDown,
    setResourceFavoriteLocal,
    toggleFavorite,
    togglePurchased,
    toggleTested,
    updateUserFields,
    setUserSelect,
    setUserRating,
    addKeywordQuick,
  } = useResourceDetailControllers({
    context: {
      t,
      detailUid,
      detailItem,
      detailDraft,
      detailDeleteBusy,
      detailMsg,
      deleteConfirmOpen,
      lightboxOpen,
      lightboxIndex,
      lightboxItems,
      detailList,
      detailIndex,
      tagInput,
      detailTagsSet,
      detailTagsList,
      unrealLauncherPath,
      refreshUserVersions,
    },
    stateSetters: {
      setItems,
      setDetailData,
      setDetailDraft,
      setDetailUid,
      setDetailBusy,
      setDetailMsg,
      setDetailMsgType,
      setDetailDeleteBusy,
      setDeleteConfirmOpen,
      setLightboxIndex,
      setTagInput,
      setResourceFavorites,
    },
    refs: {
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
    },
  });

  return {
    detailUid,
    setDetailUid,
    detailData,
    setDetailData,
    detailLoading,
    detailDraft,
    setDetailDraft,
    detailMsg,
    setDetailMsg,
    setDetailMsgType,
    detailBusy,
    detailDeleteBusy,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    tagInput,
    setTagInput,
    lightboxIndex,
    lightboxItems,
    lightboxOpen,
    detailNoteRef,
    detailNoteDirtyRef,
    detailNoteFocusedRef,
    detailTagsRef,
    detailDropdownDirtyRef,
    deleteConfirmTriggerRef,
    deleteConfirmOkRef,
    detailItem,
    detailTitle,
    detailHasNav,
    detailList,
    detailIndex,
    detailHeroSrc,
    heroActiveIndex,
    heroNavAvailable,
    galleryBlockItems,
    setHeroIndex,
    detailUeBadges,
    detailInfoLines,
    vendorDescription,
    detailTagsList,
    detailTagsSet,
    triggerDetailSave,
    closeDeleteConfirm,
    addTagToDraft,
    removeTagFromDraft,
    handleTagInputKeyDown,
    openDetail,
    stepDetail,
    stepHero,
    stepLightbox,
    openLightboxAt,
    closeLightbox,
    handleOpen,
    handleLaunchInUnreal,
    handleResourceImageContextMenu,
    setResourceFavoriteLocal,
    toggleFavorite,
    togglePurchased,
    toggleTested,
    updateUserFields,
    setUserSelect,
    setUserRating,
    addKeywordQuick,
  };
}

export default useResourceDetail;
