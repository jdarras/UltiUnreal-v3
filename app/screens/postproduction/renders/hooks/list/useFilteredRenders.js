import { useMemo } from "react";
import { renderReviewStatusKey } from "../../helpers";
import { buildRenderSearchHaystack, renderIsLocal, renderStationIpKey } from "./renderListUtils";

export function useFilteredRenders({
  detectedRenders = [],
  searchQuery = "",
  reviewFilter = "all",
  projectFilter = "all",
  stationFilter = "all",
  favoriteOnly = false,
  isRenderFavorite = () => false,
} = {}) {
  const displayedRenders = useMemo(() => {
    const query = String(searchQuery || "").trim().toLowerCase();
    const hasQuery = query.length > 0;
    const selectedFilter = String(reviewFilter || "all").trim();
    const selectedProject = String(projectFilter || "all").trim().toLowerCase();
    const selectedStation = String(stationFilter || "all").trim().toLowerCase();
    const list = Array.isArray(detectedRenders) ? [...detectedRenders] : [];
    list.sort((a, b) => String(b?.updatedAt || "").localeCompare(String(a?.updatedAt || "")));
    return list.filter((render) => {
      const reviewStatus = renderReviewStatusKey(render);
      if (selectedFilter !== "all" && reviewStatus !== selectedFilter) return false;
      const renderProject = String(render?.projectName || "").trim().toLowerCase();
      if (selectedProject !== "all" && renderProject !== selectedProject) return false;
      if (selectedStation === "local" && !renderIsLocal(render)) return false;
      if (selectedStation !== "all" && selectedStation !== "local") {
        if (renderStationIpKey(render) !== selectedStation) return false;
      }
      if (favoriteOnly && !isRenderFavorite(render)) return false;
      if (!hasQuery) return true;
      return buildRenderSearchHaystack(render).includes(query);
    });
  }, [detectedRenders, favoriteOnly, isRenderFavorite, projectFilter, reviewFilter, searchQuery, stationFilter]);

  const hasActiveFilters = useMemo(() => (
    String(searchQuery || "").trim().length > 0
    || String(reviewFilter || "all").trim() !== "all"
    || String(projectFilter || "all").trim() !== "all"
    || String(stationFilter || "all").trim() !== "all"
    || favoriteOnly
  ), [favoriteOnly, projectFilter, reviewFilter, searchQuery, stationFilter]);

  return {
    displayedRenders,
    hasActiveFilters,
  };
}

export default useFilteredRenders;
