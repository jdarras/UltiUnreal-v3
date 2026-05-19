import { useEffect, useRef, useState } from "react";
import { fromDateTimeLocalToIso } from "../../shared/helpers";

function useActivityFilters({ mapActionType = null } = {}) {
  const [activityFromAtLocal, setActivityFromAtLocal] = useState("");
  const [activityToAtLocal, setActivityToAtLocal] = useState("");
  const [activityActionType, setActivityActionType] = useState("all");
  const [activityProjectRef, setActivityProjectRef] = useState("");
  const [activitySearchQuery, setActivitySearchQuery] = useState("");
  const activitySearchDebounceRef = useRef(null);

  function clearActivitySearchDebounce() {
    if (activitySearchDebounceRef.current) {
      clearTimeout(activitySearchDebounceRef.current);
      activitySearchDebounceRef.current = null;
    }
  }

  function resetActivityFilters() {
    clearActivitySearchDebounce();
    setActivityFromAtLocal("");
    setActivityToAtLocal("");
    setActivityActionType("all");
    setActivityProjectRef("");
    setActivitySearchQuery("");
  }

  useEffect(() => () => {
    clearActivitySearchDebounce();
  }, []);

  function buildActivityFilters(overrides = {}) {
    const fromAtLocal = String(overrides?.fromAtLocal ?? activityFromAtLocal ?? "").trim();
    const toAtLocal = String(overrides?.toAtLocal ?? activityToAtLocal ?? "").trim();
    const actionType = String(overrides?.actionType ?? activityActionType ?? "all").trim().toLowerCase();
    const projectRef = String(overrides?.projectRef ?? activityProjectRef ?? "").trim();
    const searchQuery = String(overrides?.searchQuery ?? activitySearchQuery ?? "").trim();
    const resolvedActionType = typeof mapActionType === "function"
      ? mapActionType(actionType || "all")
      : (actionType || "all");
    return {
      fromAt: fromAtLocal ? fromDateTimeLocalToIso(fromAtLocal) : "",
      toAt: toAtLocal ? fromDateTimeLocalToIso(toAtLocal) : "",
      actionType: resolvedActionType,
      projectRef: projectRef || "",
      searchQuery,
    };
  }

  return {
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
  };
}

export { useActivityFilters };
