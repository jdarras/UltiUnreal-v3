function useUserActivityActions({
  usersLoading = false,
  activityLoading = false,
  projectsLoading = false,
  editingUserId = 0,
  setActivityFromAtLocal,
  setActivityToAtLocal,
  setActivityActionType,
  setActivityProjectRef,
  setActivitySearchQuery,
  activitySearchDebounceRef,
  loadUserActivity,
}) {
  const disabled = usersLoading || activityLoading;
  const projectDisabled = disabled || projectsLoading;
  const canLoad = !disabled && Number(editingUserId || 0) > 0;

  function queueSearchReload(searchQueryValue) {
    if (!activitySearchDebounceRef) return;
    if (activitySearchDebounceRef.current) {
      clearTimeout(activitySearchDebounceRef.current);
    }
    activitySearchDebounceRef.current = setTimeout(() => {
      const targetId = Number(editingUserId || 0);
      if (!targetId) return;
      void loadUserActivity?.(targetId, { searchQuery: searchQueryValue });
    }, 350);
  }

  function handleSearchChange(nextValue) {
    const normalizedValue = String(nextValue || "");
    setActivitySearchQuery?.(normalizedValue);
    queueSearchReload(normalizedValue);
  }

  function clearFilters() {
    const targetId = Number(editingUserId || 0);
    setActivityFromAtLocal?.("");
    setActivityToAtLocal?.("");
    setActivityActionType?.("all");
    setActivityProjectRef?.("");
    setActivitySearchQuery?.("");
    if (!targetId) return;
    void loadUserActivity?.(targetId, {
      fromAtLocal: "",
      toAtLocal: "",
      actionType: "all",
      projectRef: "",
      searchQuery: "",
    });
  }

  function chooseActionType(actionType) {
    const targetId = Number(editingUserId || 0);
    const normalizedType = String(actionType || "all").trim().toLowerCase() || "all";
    setActivityActionType?.(normalizedType);
    if (!targetId) return;
    void loadUserActivity?.(targetId, { actionType: normalizedType });
  }

  function chooseProject(projectRef) {
    const targetId = Number(editingUserId || 0);
    const normalizedRef = String(projectRef || "").trim();
    setActivityProjectRef?.(normalizedRef);
    if (!targetId) return;
    void loadUserActivity?.(targetId, { projectRef: normalizedRef });
  }

  return {
    disabled,
    projectDisabled,
    canLoad,
    handleSearchChange,
    clearFilters,
    chooseActionType,
    chooseProject,
  };
}

export { useUserActivityActions };
