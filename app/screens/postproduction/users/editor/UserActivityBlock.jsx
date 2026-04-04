import { safeT } from "../../shared/helpers";
import { UserActivityFilters } from "./activity/UserActivityFilters";
import { UserActivitySummary } from "./activity/UserActivitySummary";
import { UserActivityList } from "./activity/UserActivityList";
import { useUserActivityActions } from "./activity/useUserActivityActions";

function UserActivityBlock({
  t,
  usersLoading = false,
  activityLoading = false,
  activityError = "",
  activityFromAtLocal = "",
  setActivityFromAtLocal,
  activityToAtLocal = "",
  setActivityToAtLocal,
  activityActionType = "all",
  setActivityActionType,
  activityProjectRef = "",
  setActivityProjectRef,
  projectsLoading = false,
  projectOptions = [],
  activitySearchQuery = "",
  setActivitySearchQuery,
  activitySearchDebounceRef,
  editingUserId = 0,
  loadUserActivity,
  editingSummary = { projects: [], total: 0 },
  editingTypeSummary = { auth: 0, task: 0, render: 0, sync: 0, other: 0 },
  editingActivities = [],
  filteredEditingActivities = [],
}) {
  const {
    disabled,
    projectDisabled,
    canLoad,
    handleSearchChange,
    clearFilters,
    chooseActionType,
    chooseProject,
  } = useUserActivityActions({
    usersLoading,
    activityLoading,
    projectsLoading,
    editingUserId,
    setActivityFromAtLocal,
    setActivityToAtLocal,
    setActivityActionType,
    setActivityProjectRef,
    setActivitySearchQuery,
    activitySearchDebounceRef,
    loadUserActivity,
  });

  return (
    <div className="uu-card mt-12">
      <div className="uu-row uu-align-center" style={{ justifyContent: "space-between", marginBottom: "6px" }}>
        <h3 className="uu-h3 uu-block-title" style={{ margin: 0 }}>
          {safeT(t, "postprod.users.activity.title", "Activite recente")}
        </h3>
      </div>
      <UserActivityFilters
        t={t}
        disabled={disabled}
        projectDisabled={projectDisabled}
        canLoad={canLoad}
        activityFromAtLocal={activityFromAtLocal}
        setActivityFromAtLocal={setActivityFromAtLocal}
        activityToAtLocal={activityToAtLocal}
        setActivityToAtLocal={setActivityToAtLocal}
        activityActionType={activityActionType}
        setActivityActionType={setActivityActionType}
        activityProjectRef={activityProjectRef}
        setActivityProjectRef={setActivityProjectRef}
        projectOptions={projectOptions}
        activitySearchQuery={activitySearchQuery}
        onSearchChange={handleSearchChange}
        onClearFilters={clearFilters}
      />
      {activityLoading ? (
        <div className="uu-muted">
          {safeT(t, "postprod.users.activity.loading", "Chargement de l'activite...")}
        </div>
      ) : null}
      {activityError ? (
        <div className="uu-msg warn mt-8">{activityError}</div>
      ) : null}
      {!activityLoading && !activityError ? (
        <div className="uu-col">
          <UserActivitySummary
            t={t}
            usersLoading={usersLoading}
            activityLoading={activityLoading}
            editingUserId={editingUserId}
            activityActionType={activityActionType}
            activityProjectRef={activityProjectRef}
            editingSummary={editingSummary}
            editingTypeSummary={editingTypeSummary}
            editingActivities={editingActivities}
            filteredEditingActivities={filteredEditingActivities}
            onChooseActionType={chooseActionType}
            onChooseProject={chooseProject}
          />
          <UserActivityList
            t={t}
            filteredEditingActivities={filteredEditingActivities}
          />
        </div>
      ) : null}
    </div>
  );
}

export { UserActivityBlock };
