import { useState } from "react";
import {
  getInitialFavoriteOnly,
  getInitialListSortDir,
  getInitialListSortKey,
  getInitialProjectFilter,
  getInitialQueueSortDir,
  getInitialQueueSortKey,
  getInitialRenderFavorites,
  getInitialReviewFilter,
  getInitialSearchQuery,
  getInitialViewMode,
  usePersistRendersPreferences,
} from "./rendersPreferencesHelpers";

export function useRendersPreferences() {
  const [searchQuery, setSearchQuery] = useState(getInitialSearchQuery);
  const [reviewFilter, setReviewFilter] = useState(getInitialReviewFilter);
  const [projectFilter, setProjectFilter] = useState(getInitialProjectFilter);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [favoriteOnly, setFavoriteOnly] = useState(getInitialFavoriteOnly);
  const [renderFavorites, setRenderFavorites] = useState(getInitialRenderFavorites);
  const [viewMode, setViewMode] = useState(getInitialViewMode);
  const [listSortKey, setListSortKey] = useState(getInitialListSortKey);
  const [listSortDir, setListSortDir] = useState(getInitialListSortDir);
  const [queueSortKey, setQueueSortKey] = useState(getInitialQueueSortKey);
  const [queueSortDir, setQueueSortDir] = useState(getInitialQueueSortDir);

  usePersistRendersPreferences({
    searchQuery,
    viewMode,
    reviewFilter,
    projectFilter,
    favoriteOnly,
    renderFavorites,
    listSortKey,
    listSortDir,
    queueSortKey,
    queueSortDir,
  });

  return {
    searchQuery,
    setSearchQuery,
    reviewFilter,
    setReviewFilter,
    projectFilter,
    setProjectFilter,
    searchExpanded,
    setSearchExpanded,
    favoriteOnly,
    setFavoriteOnly,
    renderFavorites,
    setRenderFavorites,
    viewMode,
    setViewMode,
    listSortKey,
    setListSortKey,
    listSortDir,
    setListSortDir,
    queueSortKey,
    setQueueSortKey,
    queueSortDir,
    setQueueSortDir,
  };
}
