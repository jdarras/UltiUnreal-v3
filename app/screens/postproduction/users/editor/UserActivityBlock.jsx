import { useState, useEffect } from "react";
import { formatDate, activityActionLabel, safeT } from "../../shared/helpers";
import { activityActionTypeFromAction, activityActionTypeLabel } from "../userSharedHelpers";
import { UserActivityFilters } from "./activity/UserActivityFilters";
import { UserActivitySummary } from "./activity/UserActivitySummary";
import { UserActivityList } from "./activity/UserActivityList";
import { useUserActivityActions } from "./activity/useUserActivityActions";

const ACTIVITY_PAGE_SIZES = [25, 50, 100, 200];
const USER_ACTIVITY_HEADER_ROW_STYLE = { justifyContent: "space-between", marginBottom: "6px" };
const USER_ACTIVITY_TITLE_STYLE = { margin: 0 };

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
  editingTypeSummary = { project: 0, form: 0, task: 0, validation: 0, other: 0 },
  editingActivities = [],
  filteredEditingActivities = [],
  onPurgeActivity = null,
  onOpenActivityTarget = null,
}) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);
  const [exportBusy, setExportBusy] = useState(false);

  async function handlePurge() {
    if (typeof onPurgeActivity !== 'function') return;
    const ok = await onPurgeActivity(editingUserId);
    if (ok) loadUserActivity?.();
  }

  async function handleExport(as = "json") {
    if (!window.electron?.exportFile) return;
    setExportBusy(true);
    try {
      const ext = as === "txt" ? "txt" : "json";
      const defaultName = `activite-${new Date().toISOString().replace(/[:.]/g, "-")}.${ext}`;
      const content = as === "txt"
        ? filteredEditingActivities.map((it) => {
            const actionType = activityActionTypeLabel(t, activityActionTypeFromAction(it?.action, it));
            const label = activityActionLabel(it);
            const status = String(it?.toStatus || "").trim();
            return `[${formatDate(it?.createdAt)}] [${actionType}] ${label}${status ? ` (${status})` : ""}`.trim();
          }).join("\n")
        : JSON.stringify(filteredEditingActivities, null, 2);
      await window.electron.exportFile({
        defaultName,
        content,
        filters: [
          { name: "JSON", extensions: ["json"] },
          { name: "Text", extensions: ["txt"] },
        ],
      });
    } finally {
      setExportBusy(false);
    }
  }

  useEffect(() => { setPage(0); }, [filteredEditingActivities.length, activityActionType, activityProjectRef]);

  const totalItems = filteredEditingActivities.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const visibleActivities = filteredEditingActivities.slice(safePage * pageSize, safePage * pageSize + pageSize);

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
      <div className="uu-row uu-align-center" style={USER_ACTIVITY_HEADER_ROW_STYLE}>
        <h3 className="uu-h3 uu-block-title" style={USER_ACTIVITY_TITLE_STYLE}>
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
            page={safePage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            pageSizes={ACTIVITY_PAGE_SIZES}
            onPageChange={setPage}
            onPageSizeChange={(n) => { setPageSize(n); setPage(0); }}
            exportBusy={exportBusy}
            onPurgeActivity={typeof onPurgeActivity === 'function' ? handlePurge : null}
            onExportJson={() => handleExport("json")}
            onExportTxt={() => handleExport("txt")}
          />
          <UserActivityList
            t={t}
            filteredEditingActivities={visibleActivities}
            onOpenActivityTarget={onOpenActivityTarget}
          />
        </div>
      ) : null}
    </div>
  );
}

export { UserActivityBlock };
