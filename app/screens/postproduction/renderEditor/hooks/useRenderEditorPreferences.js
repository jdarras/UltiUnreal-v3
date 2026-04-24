import { useState } from "react";
import {
  getInitialFavoriteOnly,
  getInitialFormFilter,
  getInitialShowHistory,
  getInitialListRenderWorkerFilter,
  getInitialListSortDir,
  getInitialListSortKey,
  getInitialListStatusFilter,
  getInitialProjectFilter,
  getInitialRenderModeFilter,
  getInitialResourceFilter,
  getInitialSearchQuery,
  getInitialTaskFavorites,
  getInitialViewMode,
  usePersistRenderEditorPreferences,
} from "./renderEditorPreferencesHelpers";

export function useRenderEditorPreferences({ taskStatusFlow = [] } = {}) {
  const [viewMode, setViewMode] = useState(getInitialViewMode);
  const [showHistory, setShowHistory] = useState(getInitialShowHistory);
  const [listSortKey, setListSortKey] = useState(getInitialListSortKey);
  const [listSortDir, setListSortDir] = useState(getInitialListSortDir);
  const [searchQuery, setSearchQuery] = useState(getInitialSearchQuery);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [favoriteOnly, setFavoriteOnly] = useState(getInitialFavoriteOnly);
  const [taskFavorites, setTaskFavorites] = useState(getInitialTaskFavorites);
  const [listStatusFilter, setListStatusFilter] = useState(() => getInitialListStatusFilter(taskStatusFlow));
  const [listRenderWorkerFilter, setListRenderWorkerFilter] = useState(getInitialListRenderWorkerFilter);
  const [listProjectFilter, setListProjectFilter] = useState(getInitialProjectFilter);
  const [listFormFilter, setListFormFilter] = useState(getInitialFormFilter);
  const [listRenderModeFilter, setListRenderModeFilter] = useState(getInitialRenderModeFilter);
  const [listResourceFilter, setListResourceFilter] = useState(getInitialResourceFilter);

  usePersistRenderEditorPreferences({
    viewMode,
    showHistory,
    searchQuery,
    favoriteOnly,
    taskFavorites,
    listSortKey,
    listSortDir,
    listStatusFilter,
    listRenderWorkerFilter,
    listProjectFilter,
    listFormFilter,
    listRenderModeFilter,
    listResourceFilter,
  });

  return {
    viewMode,
    setViewMode,
    showHistory,
    setShowHistory,
    listSortKey,
    setListSortKey,
    listSortDir,
    setListSortDir,
    searchQuery,
    setSearchQuery,
    searchExpanded,
    setSearchExpanded,
    favoriteOnly,
    setFavoriteOnly,
    taskFavorites,
    setTaskFavorites,
    listStatusFilter,
    setListStatusFilter,
    listRenderWorkerFilter,
    setListRenderWorkerFilter,
    listProjectFilter,
    setListProjectFilter,
    listFormFilter,
    setListFormFilter,
    listRenderModeFilter,
    setListRenderModeFilter,
    listResourceFilter,
    setListResourceFilter,
  };
}
