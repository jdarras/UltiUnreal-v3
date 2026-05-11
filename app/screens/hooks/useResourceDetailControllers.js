import { useResourceDetailCoreControllers } from './useResourceDetailCoreControllers';
import { useResourceDetailActionControllers } from './useResourceDetailActionControllers';

export function useResourceDetailControllers({
  context = {},
  stateSetters = {},
  refs = {},
} = {}) {
  const {
    triggerDetailSave,
    closeDeleteConfirm,
    openDetail,
    stepDetail,
    openLightboxAt,
    closeLightbox,
    stepLightbox,
  } = useResourceDetailCoreControllers({
    context,
    stateSetters,
    refs,
  });

  const {
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
  } = useResourceDetailActionControllers({
    context,
    stateSetters,
    refs,
  });

  return {
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
  };
}

export default useResourceDetailControllers;
