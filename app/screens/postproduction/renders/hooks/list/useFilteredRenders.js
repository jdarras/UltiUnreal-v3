import { useMemo } from "react";
import { renderReviewStatusKey } from "../../helpers";
import {
  buildRenderSearchHaystack,
  normalizeMultiFilterValues,
  resolveRenderFormMeta,
  resolveRenderProjectMeta,
  resolveRenderRequesterMeta,
  resolveRenderSequenceMeta,
  resolveRenderStationMeta,
  resolveRenderStatusMeta,
  resolveRenderTaskMeta,
} from "./renderListUtils";

function isTechnicalProxyRenderRow(render = null) {
  const item = render && typeof render === "object" ? render : {};
  const payload = item?.payload && typeof item.payload === "object" && !Array.isArray(item.payload)
    ? item.payload
    : {};
  const outputPath = String(
    item?.outputPath
    || item?.output_path
    || payload?.filePath
    || payload?.outputPath
    || ""
  ).trim();
  const outputPathNormalized = outputPath.replace(/\\/g, "/").toLowerCase();
  const fileName = String(
    outputPathNormalized.split("/").filter(Boolean).pop()
    || payload?.fileName
    || ""
  ).trim().toLowerCase();
  if (
    fileName === "proxy.mp4"
    || fileName === "proxy_alpha.mp4"
    || fileName === "thumbnail.jpg"
  ) {
    return true;
  }
  if (
    /\/_?proxy\/(proxy|proxy_alpha)\.mp4$/i.test(outputPathNormalized)
    || /\/images\/thumbnail\.jpg$/i.test(outputPathNormalized)
  ) {
    return true;
  }
  return false;
}

export function useFilteredRenders({
  detectedRenders = [],
  searchQuery = "",
  reviewFilter = [],
  projectFilter = [],
  stationFilter = [],
  taskFilter = [],
  formFilter = [],
  requesterFilter = [],
  statusFilter = [],
  sequenceFilter = [],
} = {}) {
  const displayedRenders = useMemo(() => {
    const query = String(searchQuery || "").trim().toLowerCase();
    const hasQuery = query.length > 0;
    const selectedReviewSet = new Set(normalizeMultiFilterValues(reviewFilter));
    const selectedProjectSet = new Set(normalizeMultiFilterValues(projectFilter));
    const selectedStationSet = new Set(normalizeMultiFilterValues(stationFilter));
    const selectedTaskSet = new Set(normalizeMultiFilterValues(taskFilter));
    const selectedFormSet = new Set(normalizeMultiFilterValues(formFilter));
    const selectedRequesterSet = new Set(normalizeMultiFilterValues(requesterFilter));
    const selectedStatusSet = new Set(normalizeMultiFilterValues(statusFilter));
    const selectedSequenceSet = new Set(normalizeMultiFilterValues(sequenceFilter));
    const list = Array.isArray(detectedRenders) ? detectedRenders : [];
    return list.filter((render) => {
      if (isTechnicalProxyRenderRow(render)) return false;
      const reviewStatus = renderReviewStatusKey(render);
      if (selectedReviewSet.size > 0 && !selectedReviewSet.has(String(reviewStatus || "").trim().toLowerCase())) return false;
      const projectMeta = resolveRenderProjectMeta(render);
      if (selectedProjectSet.size > 0 && !selectedProjectSet.has(String(projectMeta?.key || "").trim().toLowerCase())) return false;
      const stationMeta = resolveRenderStationMeta(render);
      if (selectedStationSet.size > 0 && !selectedStationSet.has(String(stationMeta?.key || "").trim().toLowerCase())) return false;
      const taskMeta = resolveRenderTaskMeta(render);
      if (selectedTaskSet.size > 0 && !selectedTaskSet.has(String(taskMeta?.key || "").trim().toLowerCase())) return false;
      const formMeta = resolveRenderFormMeta(render);
      if (selectedFormSet.size > 0 && !selectedFormSet.has(String(formMeta?.key || "").trim().toLowerCase())) return false;
      const requesterMeta = resolveRenderRequesterMeta(render);
      if (selectedRequesterSet.size > 0 && !selectedRequesterSet.has(String(requesterMeta?.key || "").trim().toLowerCase())) return false;
      const statusMeta = resolveRenderStatusMeta(render);
      if (selectedStatusSet.size > 0 && !selectedStatusSet.has(String(statusMeta?.key || "").trim().toLowerCase())) return false;
      const sequenceMeta = resolveRenderSequenceMeta(render);
      if (selectedSequenceSet.size > 0 && !selectedSequenceSet.has(String(sequenceMeta?.key || "").trim().toLowerCase())) return false;
      if (!hasQuery) return true;
      return buildRenderSearchHaystack(render).includes(query);
    });
  }, [
    detectedRenders,
    formFilter,
    projectFilter,
    requesterFilter,
    reviewFilter,
    searchQuery,
    sequenceFilter,
    stationFilter,
    statusFilter,
    taskFilter,
  ]);

  const hasActiveFilters = useMemo(() => (
    String(searchQuery || "").trim().length > 0
    || normalizeMultiFilterValues(reviewFilter).length > 0
    || normalizeMultiFilterValues(projectFilter).length > 0
    || normalizeMultiFilterValues(stationFilter).length > 0
    || normalizeMultiFilterValues(taskFilter).length > 0
    || normalizeMultiFilterValues(formFilter).length > 0
    || normalizeMultiFilterValues(requesterFilter).length > 0
    || normalizeMultiFilterValues(statusFilter).length > 0
    || normalizeMultiFilterValues(sequenceFilter).length > 0
  ), [
    formFilter,
    projectFilter,
    requesterFilter,
    reviewFilter,
    searchQuery,
    sequenceFilter,
    stationFilter,
    statusFilter,
    taskFilter,
  ]);

  return {
    displayedRenders,
    hasActiveFilters,
  };
}
