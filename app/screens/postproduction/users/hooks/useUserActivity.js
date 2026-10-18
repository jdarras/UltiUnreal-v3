import { useMemo, useState } from "react";
import { safeT } from "../../shared/helpers";
import {
  activityMatchesSearchQuery,
  activityMatchesSelectedType,
  getActivityTypeSummary,
  mapActivityActionTypeToApi,
} from "../userSharedHelpers";
import { useActivityFilters } from "./useActivityFilters";

function useUserActivity({
  t,
  isCreate = false,
  editingUserId = 0,
  onLoadUserActivity = null,
}) {
  const [activityByUserId, setActivityByUserId] = useState({});
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState("");
  const {
    activityFromAtLocal,
    setActivityFromAtLocal,
    activityToAtLocal,
    setActivityToAtLocal,
    activityActionType,
    setActivityActionType,
    activityProjectRef,
    setActivityProjectRef,
    activitySearchQuery,
    setActivitySearchQuery,
    activitySearchDebounceRef,
    clearActivitySearchDebounce,
    resetActivityFilters,
    buildActivityFilters,
  } = useActivityFilters({ mapActionType: mapActivityActionTypeToApi });

  function resetActivityState() {
    resetActivityFilters();
    setActivityError("");
  }

  function buildUserActivityFilters(overrides = {}) {
    return buildActivityFilters(overrides);
  }

  async function loadUserActivity(userId, filterOverrides = {}) {
    const targetId = Number(userId || 0);
    if (!targetId || typeof onLoadUserActivity !== "function") return;
    setActivityError("");
    setActivityLoading(true);
    try {
      const res = await onLoadUserActivity(targetId, 50, buildUserActivityFilters(filterOverrides));
      const activities = Array.isArray(res?.activities) ? res.activities : [];
      const summary = res?.summary && typeof res.summary === "object"
        ? res.summary
        : { total: activities.length, actions: {}, projects: [] };
      setActivityByUserId((prev) => ({
        ...(prev || {}),
        [targetId]: { activities, summary },
      }));
    } catch {
      setActivityError(safeT(t, "postprod.users.activity.error", "Impossible de charger l'historique utilisateur."));
    } finally {
      setActivityLoading(false);
    }
  }

  const editingActivity = (!isCreate && editingUserId > 0)
    ? (activityByUserId?.[editingUserId] || null)
    : null;
  const editingActivityList = editingActivity?.activities;
  const rawEditingActivities = useMemo(
    () => (Array.isArray(editingActivityList) ? editingActivityList : []),
    [editingActivityList]
  );
  const typedEditingActivities = useMemo(
    () => rawEditingActivities.filter((item) => activityMatchesSelectedType(item, "all")),
    [rawEditingActivities]
  );
  const filteredEditingActivities = useMemo(
    () => typedEditingActivities
      .filter((item) => activityMatchesSelectedType(item, activityActionType))
      .filter((item) => activityMatchesSearchQuery(item, activitySearchQuery)),
    [typedEditingActivities, activityActionType, activitySearchQuery]
  );
  const editingSummary = useMemo(() => ({
    total: typedEditingActivities.length,
    projects: Array.from(
      typedEditingActivities.reduce((acc, item) => {
        const refs = Array.isArray(item?.projectRefs) ? item.projectRefs : [];
        for (const ref of refs) {
          const normalized = String(ref || "").trim();
          if (normalized) acc.add(normalized);
        }
        return acc;
      }, new Set())
    ),
  }), [typedEditingActivities]);
  const editingTypeSummary = useMemo(
    () => getActivityTypeSummary(editingSummary, typedEditingActivities),
    [editingSummary, typedEditingActivities]
  );

  return {
    activityByUserId,
    activityLoading,
    activityError,
    activityFromAtLocal,
    setActivityFromAtLocal,
    activityToAtLocal,
    setActivityToAtLocal,
    activityActionType,
    setActivityActionType,
    activityProjectRef,
    setActivityProjectRef,
    activitySearchQuery,
    setActivitySearchQuery,
    activitySearchDebounceRef,
    clearActivitySearchDebounce,
    resetActivityState,
    buildUserActivityFilters,
    loadUserActivity,
    editingActivity,
    editingActivities: typedEditingActivities,
    filteredEditingActivities,
    editingSummary,
    editingTypeSummary,
  };
}

export { useUserActivity };
