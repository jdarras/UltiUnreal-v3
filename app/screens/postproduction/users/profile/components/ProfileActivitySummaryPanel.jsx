import { activityActionLabel, formatDate, safeT } from "../../../shared/helpers";
import {
  ACTIVITY_TYPE_FILTERS,
  activityActionTypeLabel,
  activityTypeChipLevel,
  normalizeActivityProjectRef,
} from "../../userSharedHelpers";

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
      <div className="uu-chip-group" style={{ marginTop: "6px", flexWrap: "wrap" }}>
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
              style={{ cursor: "pointer" }}
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
      <div className="uu-chip-group" style={{ marginTop: "6px", flexWrap: "wrap" }}>
        <button
          className={`uu-chip lvl-info ${!activityProjectRef ? "chip-on" : "chip-off"}`}
          type="button"
          disabled={saving || activityLoading}
          style={{ cursor: "pointer" }}
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
              style={{ cursor: "pointer" }}
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
      <div>
        <span className="uu-muted">{safeT(t, "postprod.users.activity.summary.filtered.label", "Affichage")}:</span>{" "}
        {filteredActivityItems.length}/{activityItems.length}
      </div>
      {filteredActivityItems.length === 0 ? (
        <div className="uu-muted">
          {safeT(t, "postprod.profile.activity.empty", "Aucune action recente.")}
        </div>
      ) : filteredActivityItems.map((activity) => (
        <div key={`my-activity-${Number(activity?.id || 0)}`} style={{ display: "flex", flexWrap: "wrap", columnGap: "4px" }}>
          <span className="uu-muted">{formatDate(activity?.createdAt)} —</span>
          <span>
            {activityActionLabel(activity)}
            {String(activity?.toStatus || "").trim()
              ? ` (${String(activity?.toStatus || "").trim()})`
              : ""}
            {Array.isArray(activity?.projectRefs) && activity.projectRefs.length > 0
              ? ` — ${safeT(t, "postprod.profile.activity.item.projects", "Projets: {value}", {
                value: activity.projectRefs.join(", "),
              })}`
              : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

export { ProfileActivitySummaryPanel };
export default ProfileActivitySummaryPanel;
