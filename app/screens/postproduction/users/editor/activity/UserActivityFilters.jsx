import { safeT } from "../../../shared/helpers";
import { normalizeActivityProjectRef } from "../../userSharedHelpers";

function UserActivityFilters({
  t,
  disabled = false,
  projectDisabled = false,
  canLoad = false,
  activityFromAtLocal = "",
  setActivityFromAtLocal,
  activityToAtLocal = "",
  setActivityToAtLocal,
  activityActionType = "all",
  setActivityActionType,
  activityProjectRef = "",
  setActivityProjectRef,
  projectOptions = [],
  activitySearchQuery = "",
  onSearchChange,
  onClearFilters,
}) {
  return (
    <div className="uu-row mt-8" style={{ gap: "8px", flexWrap: "wrap" }}>
      <div className="uu-col" style={{ minWidth: "170px" }}>
        <label className="uu-label">{safeT(t, "postprod.users.activity.filter.fromAt", "Du")}</label>
        <input
          className="uu-input"
          type="datetime-local"
          value={activityFromAtLocal}
          disabled={disabled}
          onChange={(e) => setActivityFromAtLocal?.(e.target.value)}
        />
      </div>
      <div className="uu-col" style={{ minWidth: "170px" }}>
        <label className="uu-label">{safeT(t, "postprod.users.activity.filter.toAt", "Au")}</label>
        <input
          className="uu-input"
          type="datetime-local"
          value={activityToAtLocal}
          disabled={disabled}
          onChange={(e) => setActivityToAtLocal?.(e.target.value)}
        />
      </div>
      <div className="uu-col" style={{ minWidth: "180px" }}>
        <label className="uu-label">{safeT(t, "postprod.users.activity.filter.actionType", "Type d'action")}</label>
        <select
          className="uu-input"
          value={activityActionType}
          disabled={disabled}
          onChange={(e) => setActivityActionType?.(e.target.value)}
        >
          <option value="all">{safeT(t, "postprod.users.activity.filter.actionType.all", "Toutes")}</option>
          <option value="auth">{safeT(t, "postprod.users.activity.filter.actionType.auth", "Connexions")}</option>
          <option value="task">{safeT(t, "postprod.users.activity.filter.actionType.task", "Taches")}</option>
          <option value="render">{safeT(t, "postprod.users.activity.filter.actionType.render", "Rendus")}</option>
          <option value="sync">{safeT(t, "postprod.users.activity.filter.actionType.sync", "Synchronisations")}</option>
          <option value="other">{safeT(t, "postprod.users.activity.filter.actionType.other", "Autres")}</option>
        </select>
      </div>
      <div className="uu-col" style={{ minWidth: "220px", flex: 1 }}>
        <label className="uu-label">{safeT(t, "postprod.users.activity.filter.project", "Projet")}</label>
        <select
          className="uu-input"
          value={activityProjectRef}
          disabled={projectDisabled}
          onChange={(e) => setActivityProjectRef?.(e.target.value)}
        >
          {activityProjectRef
          && !projectOptions.some(
            (project) => normalizeActivityProjectRef(project?.ref) === normalizeActivityProjectRef(activityProjectRef)
          ) ? (
            <option value={activityProjectRef}>{activityProjectRef}</option>
          ) : null}
          <option value="">
            {safeT(t, "postprod.users.activity.filter.project.all", "Tous les projets")}
          </option>
          {projectOptions.map((project) => {
            const ref = String(project?.ref || "").trim();
            if (!ref) return null;
            const label = [
              String(project?.code || "").trim(),
              String(project?.name || "").trim(),
              String(project?.id || "").trim() ? `[${String(project?.id || "").trim()}]` : "",
            ]
              .filter(Boolean)
              .join(" ")
              .trim() || ref;
            return (
              <option key={`users-activity-project-${ref}`} value={ref}>
                {label}
              </option>
            );
          })}
        </select>
      </div>
      <div className="uu-col" style={{ minWidth: "240px", flex: 1 }}>
        <label className="uu-label">{safeT(t, "postprod.users.activity.filter.search", "Recherche locale")}</label>
        <input
          className="uu-input"
          type="text"
          value={activitySearchQuery}
          disabled={disabled}
          onChange={(e) => onSearchChange?.(e?.target?.value)}
          placeholder={safeT(
            t,
            "postprod.users.activity.filter.searchPlaceholder",
            "action, statut, commentaire, projet..."
          )}
        />
      </div>
      <div className="uu-row uu-align-end" style={{ marginLeft: "auto" }}>
        <button
          className="uu-btn-ghost"
          type="button"
          disabled={!canLoad}
          onClick={() => onClearFilters?.()}
        >
          {safeT(t, "postprod.users.activity.filter.clear", "Effacer filtres")}
        </button>
      </div>
    </div>
  );
}

export { UserActivityFilters };
