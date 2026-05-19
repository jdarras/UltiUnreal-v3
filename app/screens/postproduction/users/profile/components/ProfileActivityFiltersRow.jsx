import { safeT } from "../../../shared/helpers";
import { normalizeActivityProjectRef } from "../../userSharedHelpers";

const PROFILE_ACTIVITY_FILTERS_ROW_STYLE = { gap: "8px", flexWrap: "wrap" };
const PROFILE_ACTIVITY_FILTER_COL_DATE_STYLE = { minWidth: "170px" };
const PROFILE_ACTIVITY_FILTER_COL_ACTION_STYLE = { minWidth: "180px" };
const PROFILE_ACTIVITY_FILTER_COL_PROJECT_STYLE = { minWidth: "220px", flex: 1 };
const PROFILE_ACTIVITY_FILTER_COL_SEARCH_STYLE = { minWidth: "240px", flex: 1 };
const PROFILE_ACTIVITY_FILTER_ACTIONS_ROW_STYLE = { marginLeft: "auto" };

function ProfileActivityFiltersRow({
  t,
  saving = false,
  activityLoading = false,
  activityFromAtLocal = "",
  setActivityFromAtLocal = null,
  activityToAtLocal = "",
  setActivityToAtLocal = null,
  activityActionType = "all",
  setActivityActionType = null,
  activityProjectRef = "",
  setActivityProjectRef = null,
  projectsLoading = false,
  activityProjectOptions = [],
  activitySearchQuery = "",
  setActivitySearchQuery = null,
  activitySearchDebounceRef = null,
  onRefreshActivity = null,
  buildActivityFilters = null,
} = {}) {
  return (
    <div className="uu-row mt-8" style={PROFILE_ACTIVITY_FILTERS_ROW_STYLE}>
      <div className="uu-col" style={PROFILE_ACTIVITY_FILTER_COL_DATE_STYLE}>
        <label className="uu-label">{safeT(t, "postprod.users.activity.filter.fromAt", "Du")}</label>
        <input
          className="uu-input"
          type="datetime-local"
          value={activityFromAtLocal}
          disabled={saving || activityLoading}
          onChange={(e) => setActivityFromAtLocal?.(e.target.value)}
        />
      </div>
      <div className="uu-col" style={PROFILE_ACTIVITY_FILTER_COL_DATE_STYLE}>
        <label className="uu-label">{safeT(t, "postprod.users.activity.filter.toAt", "Au")}</label>
        <input
          className="uu-input"
          type="datetime-local"
          value={activityToAtLocal}
          disabled={saving || activityLoading}
          onChange={(e) => setActivityToAtLocal?.(e.target.value)}
        />
      </div>
      <div className="uu-col" style={PROFILE_ACTIVITY_FILTER_COL_ACTION_STYLE}>
        <label className="uu-label">{safeT(t, "postprod.users.activity.filter.actionType", "Type d'action")}</label>
        <select
          className="uu-input"
          value={activityActionType}
          disabled={saving || activityLoading}
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
      <div className="uu-col" style={PROFILE_ACTIVITY_FILTER_COL_PROJECT_STYLE}>
        <label className="uu-label">{safeT(t, "postprod.users.activity.filter.project", "Projet")}</label>
        <select
          className="uu-input"
          value={activityProjectRef}
          disabled={saving || activityLoading || projectsLoading}
          onChange={(e) => setActivityProjectRef?.(e.target.value)}
        >
          {activityProjectRef
          && !activityProjectOptions.some(
            (option) => normalizeActivityProjectRef(option?.ref) === normalizeActivityProjectRef(activityProjectRef)
          ) ? (
            <option value={activityProjectRef}>{activityProjectRef}</option>
          ) : null}
          <option value="">
            {safeT(t, "postprod.users.activity.filter.project.all", "Tous les projets")}
          </option>
          {activityProjectOptions.map((option) => (
            <option key={`profile-activity-project-${option.ref}`} value={option.ref}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="uu-col" style={PROFILE_ACTIVITY_FILTER_COL_SEARCH_STYLE}>
        <label className="uu-label">{safeT(t, "postprod.users.activity.filter.search", "Recherche locale")}</label>
        <input
          className="uu-input"
          type="text"
          value={activitySearchQuery}
          disabled={saving || activityLoading}
          onChange={(e) => {
            const nextValue = String(e?.target?.value || "");
            setActivitySearchQuery?.(nextValue);
            if (activitySearchDebounceRef?.current) {
              clearTimeout(activitySearchDebounceRef.current);
            }
            if (activitySearchDebounceRef) {
              activitySearchDebounceRef.current = setTimeout(() => {
                onRefreshActivity?.(buildActivityFilters?.({ searchQuery: nextValue }));
              }, 350);
            }
          }}
          placeholder={safeT(
            t,
            "postprod.users.activity.filter.searchPlaceholder",
            "action, statut, commentaire, projet..."
          )}
        />
      </div>
      <div className="uu-row uu-align-end" style={PROFILE_ACTIVITY_FILTER_ACTIONS_ROW_STYLE}>
        <button
          className="uu-btn-ghost"
          type="button"
          disabled={saving || activityLoading}
          onClick={() => {
            setActivityFromAtLocal?.("");
            setActivityToAtLocal?.("");
            setActivityActionType?.("all");
            setActivityProjectRef?.("");
            setActivitySearchQuery?.("");
            onRefreshActivity?.({
              fromAt: "",
              toAt: "",
              actionType: "all",
              projectRef: "",
              searchQuery: "",
            });
          }}
        >
          {safeT(t, "postprod.users.activity.filter.clear", "Effacer filtres")}
        </button>
      </div>
    </div>
  );
}

export { ProfileActivityFiltersRow };
