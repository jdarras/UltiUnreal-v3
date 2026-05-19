import DateTimeConfirmPicker from "../../../../../components/DateTimeConfirmPicker";
import { safeT } from "../../../shared/helpers";
import { normalizeActivityProjectRef } from "../../userSharedHelpers";

const USER_ACTIVITY_FILTERS_ROW_STYLE = { gap: "8px", flexWrap: "wrap" };
const USER_ACTIVITY_FILTER_COL_DATE_STYLE = { minWidth: "200px" };
const USER_ACTIVITY_FILTER_COL_ACTION_STYLE = { minWidth: "180px" };
const USER_ACTIVITY_FILTER_COL_PROJECT_STYLE = { minWidth: "220px", flex: 1 };
const USER_ACTIVITY_FILTER_COL_SEARCH_STYLE = { minWidth: "240px", flex: 1 };
const USER_ACTIVITY_FILTER_COL_ACTIONS_STYLE = { minWidth: "140px", marginLeft: "auto" };
const USER_ACTIVITY_FILTER_HIDDEN_LABEL_STYLE = { visibility: "hidden" };

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
    <div className="uu-row mt-8" style={USER_ACTIVITY_FILTERS_ROW_STYLE}>
      <div className="uu-col" style={USER_ACTIVITY_FILTER_COL_DATE_STYLE}>
        <label className="uu-label">{safeT(t, "postprod.users.activity.filter.fromAt", "Du")}</label>
        <DateTimeConfirmPicker
          value={activityFromAtLocal}
          disabled={disabled}
          onChange={(v) => setActivityFromAtLocal?.(v)}
          placeholder={safeT(t, "common.datePicker.placeholder", "jj/mm/aaaa hh:mm")}
          applyLabel={safeT(t, "common.datePicker.apply", "Valider")}
          cancelLabel={safeT(t, "common.datePicker.cancel", "Annuler")}
          clearLabel={safeT(t, "common.datePicker.clear", "Effacer")}
        />
      </div>
      <div className="uu-col" style={USER_ACTIVITY_FILTER_COL_DATE_STYLE}>
        <label className="uu-label">{safeT(t, "postprod.users.activity.filter.toAt", "Au")}</label>
        <DateTimeConfirmPicker
          value={activityToAtLocal}
          disabled={disabled}
          onChange={(v) => setActivityToAtLocal?.(v)}
          placeholder={safeT(t, "common.datePicker.placeholder", "jj/mm/aaaa hh:mm")}
          applyLabel={safeT(t, "common.datePicker.apply", "Valider")}
          cancelLabel={safeT(t, "common.datePicker.cancel", "Annuler")}
          clearLabel={safeT(t, "common.datePicker.clear", "Effacer")}
        />
      </div>
      <div className="uu-col" style={USER_ACTIVITY_FILTER_COL_ACTION_STYLE}>
        <label className="uu-label">{safeT(t, "postprod.users.activity.filter.actionType", "Type d'action")}</label>
        <select
          className="uu-input"
          value={activityActionType}
          disabled={disabled}
          onChange={(e) => setActivityActionType?.(e.target.value)}
        >
          <option value="all">{safeT(t, "postprod.users.activity.filter.actionType.all", "Toutes")}</option>
          <option value="project">{safeT(t, "postprod.users.activity.filter.actionType.project", "Projet")}</option>
          <option value="form">{safeT(t, "postprod.users.activity.filter.actionType.form", "Formulaire")}</option>
          <option value="task">{safeT(t, "postprod.users.activity.filter.actionType.task", "Tache")}</option>
          <option value="validation">{safeT(t, "postprod.users.activity.filter.actionType.validation", "Validation")}</option>
        </select>
      </div>
      <div className="uu-col" style={USER_ACTIVITY_FILTER_COL_PROJECT_STYLE}>
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
      <div className="uu-col" style={USER_ACTIVITY_FILTER_COL_SEARCH_STYLE}>
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
      <div className="uu-col" style={USER_ACTIVITY_FILTER_COL_ACTIONS_STYLE}>
        <label className="uu-label" style={USER_ACTIVITY_FILTER_HIDDEN_LABEL_STYLE}>
          _
        </label>
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
