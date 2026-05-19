import { useCallback, useEffect, useMemo, useState } from "react";
import { usePersistedViewMode } from "../../shared/usePersistedViewMode";
import { safeT } from "../../shared/helpers";
import {
  buildNormalizedResources,
  buildResourceDetailSnapshot,
  filterResources,
  resolveResourcesSourceLabel,
  resolveResourcesSyncCountersLabel,
  resolveResourcesSyncStateLabel,
} from "./resourcesCatalogHelpers";

export function useResourcesCatalogController({
  t,
  resources = [],
  tasks = [],
  source = "",
  sync = null,
  onLoadResourceDetail = null,
  onOpenLinkedTasks = null,
} = {}) {
  const RESOURCES_VIEW_STORAGE_KEY = "uu_postprod_resources_view";
  const [search, setSearch] = useState("");
  const [linkedTasksFilter, setLinkedTasksFilter] = useState("all");
  const [selectedRef, setSelectedRef] = useState("");
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const { viewMode, setViewMode } = usePersistedViewMode({
    storageKey: RESOURCES_VIEW_STORAGE_KEY,
    allowedModes: ["thumbs", "cards", "list"],
    fallbackMode: "thumbs",
  });

  const resourcesSourceLabel = useMemo(() => {
    return resolveResourcesSourceLabel(t, source);
  }, [source, t]);

  const resourcesSync = sync && typeof sync === "object" ? sync : null;
  const resourcesSyncAt = String(resourcesSync?.at || resourcesSync?.previous?.at || "").trim();
  const resourcesSyncReason = String(resourcesSync?.reason || "").trim();
  const resourcesSyncStateLabel = useMemo(() => {
    return resolveResourcesSyncStateLabel(t, resourcesSync, resourcesSyncReason);
  }, [resourcesSync, resourcesSyncReason, t]);

  const resourcesSyncCountersLabel = useMemo(() => {
    return resolveResourcesSyncCountersLabel(t, resourcesSync);
  }, [resourcesSync, t]);

  const normalizedResources = useMemo(() => {
    return buildNormalizedResources(resources, tasks);
  }, [resources, tasks]);

  const filteredResources = useMemo(() => {
    return filterResources(normalizedResources, search, linkedTasksFilter);
  }, [normalizedResources, search, linkedTasksFilter]);

  useEffect(() => {
    const allowed = new Set(filteredResources.map((entry) => entry.ref));
    if (selectedRef && allowed.has(selectedRef)) return;
    const nextRef = filteredResources[0]?.ref || "";
    setSelectedRef(nextRef);
  }, [filteredResources, selectedRef]);

  useEffect(() => {
    const ref = String(selectedRef || "").trim();
    if (!ref) {
      setDetail(null);
      setDetailError("");
      setDetailLoading(false);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError("");
    (async () => {
      try {
        const loaded = onLoadResourceDetail
          ? await onLoadResourceDetail(ref)
          : (normalizedResources.find((entry) => entry.ref === ref)?.raw || null);
        if (cancelled) return;
        setDetail(loaded && typeof loaded === "object" ? loaded : null);
      } catch (e) {
        if (cancelled) return;
        const msg = String(
          e?.message ||
          safeT(t, "postprod.resources.error.detail", "Impossible de charger le detail ressource.")
        ).trim();
        setDetail(null);
        setDetailError(msg || safeT(t, "postprod.resources.error.detail", "Impossible de charger le detail ressource."));
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedRef, onLoadResourceDetail, normalizedResources, t]);

  const selectedFallback = useMemo(
    () => filteredResources.find((entry) => entry.ref === selectedRef) || null,
    [filteredResources, selectedRef]
  );
  const detailSnapshot = useMemo(
    () => buildResourceDetailSnapshot(detail, selectedFallback),
    [detail, selectedFallback]
  );
  const detailObj = detailSnapshot.detailObj;
  const detailUid = detailSnapshot.detailUid;
  const detailTitle = detailSnapshot.detailTitle;
  const detailType = detailSnapshot.detailType;
  const detailSourcePath = detailSnapshot.detailSourcePath;
  const detailListingUrl = detailSnapshot.detailListingUrl;
  const detailSeller = detailSnapshot.detailSeller;
  const detailThumbCandidates = detailSnapshot.detailThumbCandidates;
  const detailLinkedTasksCount = detailSnapshot.detailLinkedTasksCount;

  const openResourceLinkedTasks = useCallback((refValue) => {
    if (typeof onOpenLinkedTasks !== "function") return;
    const ref = String(refValue || "").trim();
    if (!ref) return;
    onOpenLinkedTasks({ type: "resource", ref });
  }, [onOpenLinkedTasks]);

  return {
    search,
    setSearch,
    linkedTasksFilter,
    setLinkedTasksFilter,
    selectedRef,
    setSelectedRef,
    detailLoading,
    detailError,
    viewMode,
    setViewMode,
    resourcesSourceLabel,
    resourcesSyncStateLabel,
    resourcesSyncAt,
    resourcesSyncCountersLabel,
    normalizedResources,
    filteredResources,
    selectedFallback,
    detailObj,
    detailUid,
    detailTitle,
    detailType,
    detailSourcePath,
    detailListingUrl,
    detailSeller,
    detailThumbCandidates,
    detailLinkedTasksCount,
    openResourceLinkedTasks,
  };
}
