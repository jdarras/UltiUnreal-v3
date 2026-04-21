import { useEffect, useMemo } from "react";
import { safeT } from "../../shared/helpers";
import { useFilteredRenders } from "./list/useFilteredRenders";
import { useRenderListSorting } from "./list/useRenderListSorting";
import {
  normalizeMultiFilterValues,
  resolveRenderFormMeta,
  resolveRenderProjectMeta,
  resolveRenderRequesterMeta,
  resolveRenderSequenceMeta,
  resolveRenderStationMeta,
  resolveRenderStatusMeta,
  resolveRenderTaskMeta,
} from "./list/renderListUtils";

function buildUniqueOptionsFromRenders(renders = [], resolveMeta = () => ({ key: "", label: "" })) {
  const map = new Map();
  const list = Array.isArray(renders) ? renders : [];
  for (const render of list) {
    const meta = resolveMeta(render) || {};
    const key = String(meta?.key || "").trim().toLowerCase();
    const label = String(meta?.label || "").trim();
    if (!key || !label || label === "-") continue;
    if (!map.has(key)) map.set(key, label);
  }
  return [...map.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => String(a?.label || "").localeCompare(String(b?.label || ""), undefined, { sensitivity: "base" }));
}

function normalizeOptionsSelection(selection = []) {
  return normalizeMultiFilterValues(selection);
}

function shouldUpdateSelection(current = [], next = []) {
  if (!Array.isArray(current) || !Array.isArray(next)) return true;
  if (current.length !== next.length) return true;
  for (let i = 0; i < current.length; i += 1) {
    if (String(current[i] || "").trim().toLowerCase() !== String(next[i] || "").trim().toLowerCase()) return true;
  }
  return false;
}

function useSyncSelectionWithOptions(selection = [], setSelection = null, options = []) {
  useEffect(() => {
    if (typeof setSelection !== "function") return;
    const normalizedSelection = normalizeOptionsSelection(selection);
    if (!Array.isArray(options) || options.length <= 0) {
      if (normalizedSelection.length > 0) setSelection([]);
      return;
    }
    const allowed = new Set(
      options.map((entry) => String(entry?.value || "").trim().toLowerCase()).filter(Boolean)
    );
    const nextSelection = normalizedSelection.filter((value) => allowed.has(value));
    if (shouldUpdateSelection(normalizedSelection, nextSelection)) {
      setSelection(nextSelection);
    }
  }, [options, selection, setSelection]);
}

function mapRenderStatusLabel(t, statusKey = "") {
  const normalized = String(statusKey || "").trim().toLowerCase();
  if (normalized === "queued") return safeT(t, "postprod.renders.status.queued", "En attente");
  if (normalized === "running") return safeT(t, "postprod.renders.status.running", "En cours");
  if (normalized === "done") return safeT(t, "postprod.renders.status.done", "Termine");
  if (normalized === "failed") return safeT(t, "postprod.renders.status.failed", "Echec");
  if (normalized === "canceled") return safeT(t, "postprod.renders.status.canceled", "Annule");
  return String(statusKey || "").trim();
}

export function useRendersListController({
  t,
  renders = [],
  searchQuery = "",
  reviewFilter = [],
  setReviewFilter = null,
  projectFilter = [],
  setProjectFilter = null,
  stationFilter = [],
  setStationFilter = null,
  taskFilter = [],
  setTaskFilter = null,
  formFilter = [],
  setFormFilter = null,
  requesterFilter = [],
  setRequesterFilter = null,
  statusFilter = [],
  setStatusFilter = null,
  sequenceFilter = [],
  setSequenceFilter = null,
  listSortKey = "updatedAt",
  listSortDir = "desc",
  setListSortKey = null,
  setListSortDir = null,
} = {}) {
  const renderJobs = useMemo(() => {
    const list = Array.isArray(renders) ? renders : [];
    return list.filter((render) => String(render?.status || "").trim().toLowerCase() === "done");
  }, [renders]);

  const projectFilterOptions = useMemo(
    () => buildUniqueOptionsFromRenders(renderJobs, resolveRenderProjectMeta),
    [renderJobs]
  );
  const stationFilterOptions = useMemo(
    () => buildUniqueOptionsFromRenders(renderJobs, resolveRenderStationMeta),
    [renderJobs]
  );
  const taskFilterOptions = useMemo(
    () => buildUniqueOptionsFromRenders(renderJobs, resolveRenderTaskMeta),
    [renderJobs]
  );
  const formFilterOptions = useMemo(
    () => buildUniqueOptionsFromRenders(renderJobs, resolveRenderFormMeta),
    [renderJobs]
  );
  const requesterFilterOptions = useMemo(
    () => buildUniqueOptionsFromRenders(renderJobs, resolveRenderRequesterMeta),
    [renderJobs]
  );
  const statusFilterOptions = useMemo(() => {
    const raw = buildUniqueOptionsFromRenders(renderJobs, resolveRenderStatusMeta);
    return raw.map((entry) => ({
      value: String(entry?.value || "").trim().toLowerCase(),
      label: mapRenderStatusLabel(t, String(entry?.value || "").trim()),
    }));
  }, [renderJobs, t]);
  const sequenceFilterOptions = useMemo(
    () => buildUniqueOptionsFromRenders(renderJobs, resolveRenderSequenceMeta),
    [renderJobs]
  );
  const reviewFilterOptions = useMemo(() => ([
    { value: "to_validate", label: safeT(t, "postprod.renders.review.toValidate", "A valider") },
    { value: "validated", label: safeT(t, "postprod.renders.review.validated", "Validee") },
    { value: "rejected", label: safeT(t, "postprod.renders.review.rejected", "Rejetee") },
  ]), [t]);

  useSyncSelectionWithOptions(projectFilter, setProjectFilter, projectFilterOptions);
  useSyncSelectionWithOptions(reviewFilter, setReviewFilter, reviewFilterOptions);
  useSyncSelectionWithOptions(stationFilter, setStationFilter, stationFilterOptions);
  useSyncSelectionWithOptions(taskFilter, setTaskFilter, taskFilterOptions);
  useSyncSelectionWithOptions(formFilter, setFormFilter, formFilterOptions);
  useSyncSelectionWithOptions(requesterFilter, setRequesterFilter, requesterFilterOptions);
  useSyncSelectionWithOptions(statusFilter, setStatusFilter, statusFilterOptions);
  useSyncSelectionWithOptions(sequenceFilter, setSequenceFilter, sequenceFilterOptions);

  const { displayedRenders, hasActiveFilters } = useFilteredRenders({
    detectedRenders: renderJobs,
    searchQuery,
    reviewFilter,
    projectFilter,
    stationFilter,
    taskFilter,
    formFilter,
    requesterFilter,
    statusFilter,
    sequenceFilter,
  });

  const {
    sortedDisplayedRenders,
    listSortIndicator,
    toggleListSort,
    setListSortFromSelect,
  } = useRenderListSorting({
    displayedRenders,
    listSortKey,
    listSortDir,
    setListSortKey,
    setListSortDir,
  });

  return {
    projectFilterOptions,
    reviewFilterOptions,
    stationFilterOptions,
    taskFilterOptions,
    formFilterOptions,
    requesterFilterOptions,
    statusFilterOptions,
    sequenceFilterOptions,
    hasActiveFilters,
    sortedDisplayedRenders,
    listSortIndicator,
    toggleListSort,
    setListSortFromSelect,
  };
}

export default useRendersListController;
