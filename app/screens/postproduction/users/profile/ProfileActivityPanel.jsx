import { safeT } from "../../shared/helpers";
import { ProfileActivityFiltersRow } from "./components/ProfileActivityFiltersRow";
import { ProfileActivitySummaryPanel } from "./components/ProfileActivitySummaryPanel";

function ProfileActivityPanel({
  t,
  saving = false,
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
  activityProjectOptions = [],
  activitySearchQuery = "",
  setActivitySearchQuery,
  activitySearchDebounceRef,
  onRefreshActivity = null,
  buildActivityFilters,
  activitySummary = { projects: [], total: 0 },
  activityTypeSummary = { auth: 0, task: 0, render: 0, sync: 0, other: 0 },
  activityItems = [],
  filteredActivityItems = [],
}) {
  return (
    <div className="mt-12">
      <div className="uu-row uu-align-center" style={{ justifyContent: "space-between" }}>
        <div className="uu-label">
          {safeT(t, "postprod.profile.activity.title", "Mon activite recente")}
        </div>
      </div>
      <ProfileActivityFiltersRow
        t={t}
        saving={saving}
        activityLoading={activityLoading}
        activityFromAtLocal={activityFromAtLocal}
        setActivityFromAtLocal={setActivityFromAtLocal}
        activityToAtLocal={activityToAtLocal}
        setActivityToAtLocal={setActivityToAtLocal}
        activityActionType={activityActionType}
        setActivityActionType={setActivityActionType}
        activityProjectRef={activityProjectRef}
        setActivityProjectRef={setActivityProjectRef}
        projectsLoading={projectsLoading}
        activityProjectOptions={activityProjectOptions}
        activitySearchQuery={activitySearchQuery}
        setActivitySearchQuery={setActivitySearchQuery}
        activitySearchDebounceRef={activitySearchDebounceRef}
        onRefreshActivity={onRefreshActivity}
        buildActivityFilters={buildActivityFilters}
      />

      {activityLoading ? (
        <div className="uu-muted mt-8">
          {safeT(t, "postprod.profile.activity.loading", "Chargement de l'activite...")}
        </div>
      ) : null}
      {activityError ? (
        <div className="uu-msg warn mt-8">{activityError}</div>
      ) : null}

      {!activityLoading && !activityError ? (
        <ProfileActivitySummaryPanel
          t={t}
          saving={saving}
          activityLoading={activityLoading}
          activityActionType={activityActionType}
          setActivityActionType={setActivityActionType}
          activityProjectRef={activityProjectRef}
          setActivityProjectRef={setActivityProjectRef}
          onRefreshActivity={onRefreshActivity}
          buildActivityFilters={buildActivityFilters}
          activitySummary={activitySummary}
          activityTypeSummary={activityTypeSummary}
          activityItems={activityItems}
          filteredActivityItems={filteredActivityItems}
        />
      ) : null}
    </div>
  );
}

export { ProfileActivityPanel };
