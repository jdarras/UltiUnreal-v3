import { useEffect, useMemo, useRef, useState } from "react";
import { fromDateTimeLocalToIso, safeT } from "../../shared/helpers";
import { activityMatchesSearchQuery, getActivityTypeSummary } from "../userSharedHelpers";

function useUserActivity({
  t,
  isCreate = false,
  editingUserId = 0,
  onLoadUserActivity = null,
}) {
  const [activityByUserId, setActivityByUserId] = useState({});
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState("");
  const [activityFromAtLocal, setActivityFromAtLocal] = useState("");
  const [activityToAtLocal, setActivityToAtLocal] = useState("");
  const [activityActionType, setActivityActionType] = useState("all");
  const [activityProjectRef, setActivityProjectRef] = useState("");
  const [activitySearchQuery, setActivitySearchQuery] = useState("");
  const activitySearchDebounceRef = useRef(null);

  useEffect(() => (
    () => {
      if (activitySearchDebounceRef.current) {
        clearTimeout(activitySearchDebounceRef.current);
        activitySearchDebounceRef.current = null;
      }
    }
  ), []);

  function clearActivitySearchDebounce() {
    if (activitySearchDebounceRef.current) {
      clearTimeout(activitySearchDebounceRef.current);
      activitySearchDebounceRef.current = null;
    }
  }

  function resetActivityState() {
    clearActivitySearchDebounce();
    setActivityFromAtLocal("");
    setActivityToAtLocal("");
    setActivityActionType("all");
    setActivityProjectRef("");
    setActivitySearchQuery("");
    setActivityError("");
  }

  function buildUserActivityFilters(overrides = {}) {
    const fromAtLocal = String(overrides?.fromAtLocal ?? activityFromAtLocal ?? "").trim();
    const toAtLocal = String(overrides?.toAtLocal ?? activityToAtLocal ?? "").trim();
    const actionType = String(overrides?.actionType ?? activityActionType ?? "all").trim().toLowerCase();
    const projectRef = String(overrides?.projectRef ?? activityProjectRef ?? "").trim();
    const searchQuery = String(overrides?.searchQuery ?? activitySearchQuery ?? "").trim();
    return {
      fromAt: fromAtLocal ? fromDateTimeLocalToIso(fromAtLocal) : "",
      toAt: toAtLocal ? fromDateTimeLocalToIso(toAtLocal) : "",
      actionType: actionType || "all",
      projectRef: projectRef || "",
      searchQuery,
    };
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
  const editingActivities = Array.isArray(editingActivity?.activities) ? editingActivity.activities : [];
  const filteredEditingActivities = useMemo(
    () => editingActivities.filter((item) => activityMatchesSearchQuery(item, activitySearchQuery)),
    [editingActivities, activitySearchQuery]
  );
  const editingSummary = editingActivity?.summary && typeof editingActivity.summary === "object"
    ? editingActivity.summary
    : { total: editingActivities.length, projects: [], byType: { auth: 0, task: 0, render: 0, sync: 0, other: 0 } };
  const editingTypeSummary = useMemo(
    () => getActivityTypeSummary(editingSummary, editingActivities),
    [editingSummary, editingActivities]
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
    editingActivities,
    filteredEditingActivities,
    editingSummary,
    editingTypeSummary,
  };
}

export { useUserActivity };
