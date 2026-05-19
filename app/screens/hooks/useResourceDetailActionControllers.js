import { useResourceDetailLaunchActions } from './useResourceDetailLaunchActions';
import { useResourceDetailTags } from './useResourceDetailTags';
import { useResourceDetailUserActions } from './useResourceDetailUserActions';

export function useResourceDetailActionControllers({
  context = {},
  stateSetters = {},
  refs = {},
} = {}) {
  const {
    detailUid,
    detailItem,
    detailTagsSet,
    detailTagsList,
    tagInput,
    unrealLauncherPath,
    refreshUserVersions,
  } = context;
  const {
    setTagInput,
    setItems,
    setDetailData,
    setDetailDraft,
    setResourceFavorites,
  } = stateSetters;
  const {
    detailTagsDirtyRef,
    resourceFavoritesRef,
  } = refs;

  const { handleOpen, handleLaunchInUnreal, handleResourceImageContextMenu } = useResourceDetailLaunchActions({
    detailItem,
    unrealLauncherPath,
    refreshUserVersions,
  });

  const { addTagToDraft, removeTagFromDraft, handleTagInputKeyDown } = useResourceDetailTags({
    detailTagsList,
    detailTagsSet,
    setDetailDraft,
    detailTagsDirtyRef,
    tagInput,
    setTagInput,
  });

  const {
    setResourceFavoriteLocal,
    toggleFavorite,
    togglePurchased,
    toggleTested,
    updateUserFields,
    setUserSelect,
    setUserRating,
    addKeywordQuick,
  } = useResourceDetailUserActions({
    detailUid,
    detailItem,
    setItems,
    setDetailData,
    setDetailDraft,
    setResourceFavorites,
    resourceFavoritesRef,
  });

  return {
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
