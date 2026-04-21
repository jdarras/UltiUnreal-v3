import { useState } from "react";
import {
  getInitialFormFilter,
  getInitialListSortDir,
  getInitialListSortKey,
  getInitialProjectFilter,
  getInitialRequesterFilter,
  getInitialStationFilter,
  getInitialStatusFilter,
  getInitialTaskFilter,
  getInitialQueueSortDir,
  getInitialQueueSortKey,
  getInitialQueueRuntimeMode,
  getInitialReviewFilter,
  getInitialSequenceFilter,
  getInitialSearchQuery,
  getInitialViewMode,
  usePersistRendersPreferences,
} from "./rendersPreferencesHelpers";

export function useRendersPreferences() {
  const [searchQuery, setSearchQuery] = useState(getInitialSearchQuery);
  const [reviewFilter, setReviewFilter] = useState(getInitialReviewFilter);
  const [projectFilter, setProjectFilter] = useState(getInitialProjectFilter);
  const [stationFilter, setStationFilter] = useState(getInitialStationFilter);
  const [taskFilter, setTaskFilter] = useState(getInitialTaskFilter);
  const [formFilter, setFormFilter] = useState(getInitialFormFilter);
  const [requesterFilter, setRequesterFilter] = useState(getInitialRequesterFilter);
  const [statusFilter, setStatusFilter] = useState(getInitialStatusFilter);
  const [sequenceFilter, setSequenceFilter] = useState(getInitialSequenceFilter);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [viewMode, setViewMode] = useState(getInitialViewMode);
  const [listSortKey, setListSortKey] = useState(getInitialListSortKey);
  const [listSortDir, setListSortDir] = useState(getInitialListSortDir);
  const [queueSortKey, setQueueSortKey] = useState(getInitialQueueSortKey);
  const [queueSortDir, setQueueSortDir] = useState(getInitialQueueSortDir);
  const [queueRuntimeMode, setQueueRuntimeMode] = useState(getInitialQueueRuntimeMode);

  usePersistRendersPreferences({
    searchQuery,
    viewMode,
    reviewFilter,
    projectFilter,
    stationFilter,
    taskFilter,
    formFilter,
    requesterFilter,
    statusFilter,
    sequenceFilter,
    listSortKey,
    listSortDir,
    queueSortKey,
    queueSortDir,
    queueRuntimeMode,
  });

  return {
    searchQuery,
    setSearchQuery,
    reviewFilter,
    setReviewFilter,
    projectFilter,
    setProjectFilter,
    stationFilter,
    setStationFilter,
    taskFilter,
    setTaskFilter,
    formFilter,
    setFormFilter,
    requesterFilter,
    setRequesterFilter,
    statusFilter,
    setStatusFilter,
    sequenceFilter,
    setSequenceFilter,
    searchExpanded,
    setSearchExpanded,
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
    queueRuntimeMode,
    setQueueRuntimeMode,
  };
}
