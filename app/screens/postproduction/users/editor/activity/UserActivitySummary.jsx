import { safeT } from "../../../shared/helpers";
import {
  ACTIVITY_TYPE_FILTERS,
  normalizeActivityProjectRef,
  activityActionTypeLabel,
  activityTypeChipLevel,
} from "../../userSharedHelpers";

function UserActivitySummary({
  t,
  usersLoading = false,
  activityLoading = false,
  editingUserId = 0,
  activityActionType = "all",
  activityProjectRef = "",
  editingSummary = { projects: [], total: 0 },
  editingTypeSummary = { auth: 0, task: 0, render: 0, sync: 0, other: 0 },
  editingActivities = [],
  filteredEditingActivities = [],
  onChooseActionType,
  onChooseProject,
}) {
  const disabled = usersLoading || activityLoading || !editingUserId;

  return (
    <>
      <div className="uu-muted">
        {safeT(t, "postprod.users.activity.summary.projects", "Projets touches: {value}", {
          value: Array.isArray(editingSummary?.projects) && editingSummary.projects.length > 0
            ? editingSummary.projects.join(", ")
            : "-",
        })}
      </div>
      <div className="uu-muted">
        {safeT(
          t,
          "postprod.activity.summary.types",
          "Types: Connexions {auth} | Taches {task} | Rendus {render} | Sync {sync} | Autres {other}",
          {
            auth: editingTypeSummary.auth,
            task: editingTypeSummary.task,
            render: editingTypeSummary.render,
            sync: editingTypeSummary.sync,
            other: editingTypeSummary.other,
          }
        )}
      </div>
      <div className="uu-chip-group" style={{ marginTop: "6px", flexWrap: "wrap" }}>
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
              style={{ cursor: "pointer" }}
              onClick={() => onChooseActionType?.(normalizedType)}
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
          disabled={disabled}
          style={{ cursor: "pointer" }}
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
              style={{ cursor: "pointer" }}
              onClick={() => onChooseProject?.(normalizedRef)}
            >
              {normalizedRef}
            </button>
          );
        })}
      </div>
      <div className="uu-muted">
        {safeT(t, "postprod.users.activity.summary.filtered", "Affichage: {shown}/{total}", {
          shown: filteredEditingActivities.length,
          total: editingActivities.length,
        })}
      </div>
    </>
  );
}

export { UserActivitySummary };
