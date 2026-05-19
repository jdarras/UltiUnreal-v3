import { useState, useEffect } from "react";
import { activityActionLabel, formatDate, safeT } from "../../../shared/helpers";
import {
  ACTIVITY_TYPE_FILTERS,
  activityActionTypeFromAction,
  activityActionTypeLabel,
  activityTypeChipLevel,
  normalizeActivityProjectRef,
} from "../../userSharedHelpers";

const PAGE_SIZES = [25, 50, 100, 200];
const PROFILE_ACTIVITY_CHIP_GROUP_STYLE = { marginTop: "6px", flexWrap: "wrap" };
const PROFILE_ACTIVITY_CHIP_BUTTON_STYLE = { cursor: "pointer" };
const PROFILE_ACTIVITY_PAGINATION_ROW_STYLE = { marginTop: "8px", marginBottom: "4px", flexWrap: "wrap" };
const PROFILE_ACTIVITY_PAGE_SIZE_STYLE = { width: "80px" };

function ProfileActivitySummaryPanel({
  t,
  saving = false,
  activityLoading = false,
  activityActionType = "all",
  setActivityActionType = null,
  activityProjectRef = "",
  setActivityProjectRef = null,
  onRefreshActivity = null,
  buildActivityFilters = null,
  activitySummary = { projects: [], total: 0 },
  activityTypeSummary = { auth: 0, task: 0, render: 0, sync: 0, other: 0 },
  activityItems = [],
  filteredActivityItems = [],
} = {}) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);

  useEffect(() => { setPage(0); }, [filteredActivityItems.length, activityActionType, activityProjectRef]);

  const totalItems = filteredActivityItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageStart = safePage * pageSize;
  const visibleItems = filteredActivityItems.slice(pageStart, pageStart + pageSize);
  const canPrev = safePage > 0;
  const canNext = safePage < totalPages - 1;

  return (
    <div className="uu-col mt-8">
      <div>
        <span className="uu-muted">{safeT(t, "postprod.profile.activity.summary.projects.label", "Projets touchés")}:</span>{" "}
        {Array.isArray(activitySummary?.projects) && activitySummary.projects.length > 0
          ? activitySummary.projects.join(", ")
          : "-"}
      </div>
      <div className="uu-muted">
        {safeT(
          t,
          "postprod.activity.summary.types",
          "Types: Connexions {auth} | Taches {task} | Rendus {render} | Sync {sync} | Autres {other}",
          {
            auth: activityTypeSummary.auth,
            task: activityTypeSummary.task,
            render: activityTypeSummary.render,
            sync: activityTypeSummary.sync,
            other: activityTypeSummary.other,
          }
        )}
      </div>
      <div className="uu-chip-group" style={PROFILE_ACTIVITY_CHIP_GROUP_STYLE}>
        {ACTIVITY_TYPE_FILTERS.map((type) => {
          const normalizedType = String(type || "").trim().toLowerCase() || "all";
          const isActive = activityActionType === normalizedType;
          const count = normalizedType === "all"
            ? (
              Number.isFinite(Number(activitySummary?.total))
                ? Number(activitySummary.total)
                : activityItems.length
            )
            : (
              Number.isFinite(Number(activityTypeSummary?.[normalizedType]))
                ? Number(activityTypeSummary[normalizedType])
                : 0
            );
          return (
            <button
              key={`profile-activity-chip-${normalizedType}`}
              className={`uu-chip ${activityTypeChipLevel(normalizedType)} ${isActive ? "chip-on" : "chip-off"}`}
              type="button"
              disabled={saving || activityLoading}
              style={PROFILE_ACTIVITY_CHIP_BUTTON_STYLE}
              onClick={() => {
                setActivityActionType?.(normalizedType);
                onRefreshActivity?.(buildActivityFilters?.({ actionType: normalizedType }));
              }}
            >
              {activityActionTypeLabel(t, normalizedType)} {count}
            </button>
          );
        })}
      </div>
      <div className="uu-chip-group" style={PROFILE_ACTIVITY_CHIP_GROUP_STYLE}>
        <button
          className={`uu-chip lvl-info ${!activityProjectRef ? "chip-on" : "chip-off"}`}
          type="button"
          disabled={saving || activityLoading}
          style={PROFILE_ACTIVITY_CHIP_BUTTON_STYLE}
          onClick={() => {
            setActivityProjectRef?.("");
            onRefreshActivity?.(buildActivityFilters?.({ projectRef: "" }));
          }}
        >
          {safeT(t, "postprod.users.activity.filter.project.all", "Tous les projets")}
        </button>
        {(Array.isArray(activitySummary?.projects) ? activitySummary.projects : []).map((projectRef) => {
          const normalizedRef = String(projectRef || "").trim();
          if (!normalizedRef) return null;
          const isActive = normalizeActivityProjectRef(activityProjectRef) === normalizeActivityProjectRef(normalizedRef);
          return (
            <button
              key={`profile-project-chip-${normalizedRef}`}
              className={`uu-chip lvl-success ${isActive ? "chip-on" : "chip-off"}`}
              type="button"
              disabled={saving || activityLoading}
              style={PROFILE_ACTIVITY_CHIP_BUTTON_STYLE}
              onClick={() => {
                setActivityProjectRef?.(normalizedRef);
                onRefreshActivity?.(buildActivityFilters?.({ projectRef: normalizedRef }));
              }}
            >
              {normalizedRef}
            </button>
          );
        })}
      </div>

      <div className="uu-row uu-gap-8 uu-align-center" style={PROFILE_ACTIVITY_PAGINATION_ROW_STYLE}>
        <div className="uu-row uu-gap-6 uu-align-center">
          {canPrev ? (
            <button type="button" className="uu-btn" onClick={() => setPage((p) => Math.max(0, p - 1))}>‹</button>
          ) : null}
          <span className="uu-muted">{`Page ${safePage + 1}/${totalPages}`}</span>
          {canNext ? (
            <button type="button" className="uu-btn" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>›</button>
          ) : null}
          <select
            className="uu-select"
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value) || 100); setPage(0); }}
            style={PROFILE_ACTIVITY_PAGE_SIZE_STYLE}
          >
            {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <span className="uu-muted">{totalItems} {safeT(t, "postprod.profile.activity.count", "entrées")}</span>
        </div>
      </div>

      {visibleItems.length === 0 ? (
        <div className="uu-muted">
          {safeT(t, "postprod.profile.activity.empty", "Aucune action recente.")}
        </div>
      ) : (
        <div className="log-list">
          {visibleItems.map((activity) => {
            const activityId = Number(activity?.id || 0);
            const actionType = activityActionTypeFromAction(activity?.action, activity);
            const level = activityTypeChipLevel(actionType).replace("lvl-", "");
            const toStatus = String(activity?.toStatus || "").trim();
            const projectRefs = Array.isArray(activity?.projectRefs) && activity.projectRefs.length > 0
              ? activity.projectRefs.join(", ")
              : "";
            return (
              <div key={`my-activity-${activityId}`} className={`log-row lvl-${level}`}>
                <div className="log-meta">
                  <span className="log-ts">{formatDate(activity?.createdAt)}</span>
                  <span className="log-action">{activityActionTypeLabel(t, actionType)}</span>
                </div>
                <div className="log-msg">
                  {activityActionLabel(activity)}
                  {toStatus ? ` (${toStatus})` : ""}
                  {projectRefs ? ` — ${projectRefs}` : ""}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { ProfileActivitySummaryPanel };
