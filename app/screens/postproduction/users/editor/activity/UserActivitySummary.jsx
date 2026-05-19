import { safeT } from "../../../shared/helpers";
import {
  ACTIVITY_TYPE_FILTERS,
  normalizeActivityProjectRef,
  activityActionTypeLabel,
  activityTypeChipLevel,
} from "../../userSharedHelpers";

const USER_ACTIVITY_CHIP_GROUP_STYLE = { marginTop: "6px", flexWrap: "wrap" };
const USER_ACTIVITY_CHIP_BUTTON_STYLE = { cursor: "pointer" };
const USER_ACTIVITY_TOOLBAR_STYLE = { marginTop: "8px", justifyContent: "space-between" };
const USER_ACTIVITY_PAGE_SIZE_STYLE = { width: "80px" };

function UserActivitySummary({
  t,
  usersLoading = false,
  activityLoading = false,
  editingUserId = 0,
  activityActionType = "all",
  activityProjectRef = "",
  editingSummary = { projects: [], total: 0 },
  editingTypeSummary = { project: 0, form: 0, task: 0, validation: 0, other: 0 },
  editingActivities = [],
  onChooseActionType,
  onChooseProject,
  page = 0,
  totalPages = 1,
  totalItems = 0,
  pageSize = 100,
  pageSizes = [25, 50, 100, 200],
  onPageChange = null,
  onPageSizeChange = null,
  exportBusy = false,
  onPurgeActivity = null,
  onExportJson = null,
  onExportTxt = null,
}) {
  const disabled = usersLoading || activityLoading || !editingUserId;

  return (
    <>
      <div className="uu-chip-group" style={USER_ACTIVITY_CHIP_GROUP_STYLE}>
        {ACTIVITY_TYPE_FILTERS.map((type) => {
          const normalizedType = String(type || "").trim().toLowerCase() || "all";
          const isActive = activityActionType === normalizedType;
          const count = normalizedType === "all"
            ? (
              Number.isFinite(Number(editingSummary?.total))
                ? Number(editingSummary.total)
                : editingActivities.length
            )
            : (
              Number.isFinite(Number(editingTypeSummary?.[normalizedType]))
                ? Number(editingTypeSummary[normalizedType])
                : 0
            );
          return (
            <button
              key={`users-activity-chip-${normalizedType}`}
              className={`uu-chip ${activityTypeChipLevel(normalizedType)} ${isActive ? "chip-on" : "chip-off"}`}
              type="button"
              disabled={disabled}
              style={USER_ACTIVITY_CHIP_BUTTON_STYLE}
              onClick={() => onChooseActionType?.(normalizedType)}
            >
              {activityActionTypeLabel(t, normalizedType)} {count}
            </button>
          );
        })}
      </div>
      <div className="uu-chip-group" style={USER_ACTIVITY_CHIP_GROUP_STYLE}>
        <button
          className={`uu-chip lvl-info ${!activityProjectRef ? "chip-on" : "chip-off"}`}
          type="button"
          disabled={disabled}
          style={USER_ACTIVITY_CHIP_BUTTON_STYLE}
          onClick={() => onChooseProject?.("")}
        >
          {safeT(t, "postprod.users.activity.filter.project.all", "Tous les projets")}
        </button>
        {(Array.isArray(editingSummary?.projects) ? editingSummary.projects : []).map((projectRef) => {
          const normalizedRef = String(projectRef || "").trim();
          if (!normalizedRef) return null;
          const isActive = normalizeActivityProjectRef(activityProjectRef) === normalizeActivityProjectRef(normalizedRef);
          return (
            <button
              key={`users-project-chip-${normalizedRef}`}
              className={`uu-chip lvl-success ${isActive ? "chip-on" : "chip-off"}`}
              type="button"
              disabled={disabled}
              style={USER_ACTIVITY_CHIP_BUTTON_STYLE}
              onClick={() => onChooseProject?.(normalizedRef)}
            >
              {normalizedRef}
            </button>
          );
        })}
      </div>
      <div className="uu-toolbar-sub" style={USER_ACTIVITY_TOOLBAR_STYLE}>
        <div className="uu-row uu-gap-8">
          {onPurgeActivity ? (
            <button
              type="button"
              className="uu-btn"
              disabled={exportBusy || disabled}
              onClick={() => onPurgeActivity?.()}
            >
              {safeT(t, "logs.toolbar.purge", "Purger les logs")}
            </button>
          ) : null}
          <button
            type="button"
            className="uu-btn"
            disabled={exportBusy}
            onClick={() => onExportJson?.()}
          >
            {exportBusy ? "..." : safeT(t, "logs.toolbar.exportJson", "Exporter JSON")}
          </button>
          <button
            type="button"
            className="uu-btn"
            disabled={exportBusy}
            onClick={() => onExportTxt?.()}
          >
            {exportBusy ? "..." : safeT(t, "logs.toolbar.exportTxt", "Exporter TXT")}
          </button>
        </div>
        <div className="uu-row uu-gap-6 uu-align-center">
          {page > 0 ? (
            <button type="button" className="uu-btn" onClick={() => onPageChange?.(page - 1)}>‹</button>
          ) : null}
          <span className="uu-muted">{`Page ${page + 1}/${totalPages}`}</span>
          {page < totalPages - 1 ? (
            <button type="button" className="uu-btn" onClick={() => onPageChange?.(page + 1)}>›</button>
          ) : null}
          <select
            className="uu-select"
            value={pageSize}
            onChange={(e) => onPageSizeChange?.(Number(e.target.value) || 100)}
            style={USER_ACTIVITY_PAGE_SIZE_STYLE}
          >
            {pageSizes.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <span className="uu-muted">{totalItems} {safeT(t, "postprod.users.activity.count", "entrées")}</span>
        </div>
      </div>
    </>
  );
}

export { UserActivitySummary };
