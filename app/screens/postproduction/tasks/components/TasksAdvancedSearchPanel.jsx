import { safeT } from "../../shared/helpers";

function TasksAdvancedSearchPanel({
  t,
  visible = false,
  displayedCount = 0,
  tasksLoading = false,
  listStatusFilter = "all",
  onSetListStatusFilter = null,
  taskStatusFlow = [],
  taskStatusLabel = null,
  taskAutoRenderStateLabel = null,
  listRenderWorkerFilter = "all",
  onSetListRenderWorkerFilter = null,
  taskRenderWorkerFilterOptions = [],
  listProjectFilter = "all",
  onSetListProjectFilter = null,
  normalizedProjectOptions = [],
  listFormFilter = "all",
  onSetListFormFilter = null,
  taskFormFilterOptions = [],
  listRenderModeFilter = "all",
  onSetListRenderModeFilter = null,
  taskRenderModeFilterOptions = [],
  onClose = null,
}) {
  if (!visible) return null;

  return (
    <div className="uu-card uu-col uu-gap-12 mt-12">
      <div className="uu-row uu-align-center uu-gap-8 uu-wrap">
        <strong>{safeT(t, "postprod.tasks.search.advancedTitle", "Recherche avancee")}</strong>
        <div className="uu-muted">
          {displayedCount ? `(${displayedCount})` : ""}
        </div>
      </div>
      <div className="uu-row uu-gap-16 uu-wrap">
        <div className="uu-row uu-align-center uu-gap-8" style={{ minWidth: "260px" }}>
          <label className="uu-label" style={{ width: "120px" }}>{safeT(t, "postprod.tasks.search.advanced.status", "Statut")}</label>
          <select
            className="uu-select"
            style={{ width: "240px", height: "36px" }}
            value={listStatusFilter}
            disabled={tasksLoading}
            onChange={(e) => onSetListStatusFilter?.(String(e.target.value || "all"))}
          >
            <option value="all">{safeT(t, "postprod.tasks.filter.status.all", "Tous")}</option>
            {(Array.isArray(taskStatusFlow) ? taskStatusFlow : []).map((status) => (
              <option key={`task-status-filter-${status}`} value={status}>
                {typeof taskStatusLabel === "function" ? taskStatusLabel(t, status) : String(status)}
              </option>
            ))}
            <option value="__render_waiting">{typeof taskAutoRenderStateLabel === "function" ? taskAutoRenderStateLabel(t, "waiting") : "En attente"}</option>
            <option value="__render_running">{typeof taskAutoRenderStateLabel === "function" ? taskAutoRenderStateLabel(t, "running") : "En rendu"}</option>
            <option value="__render_error">{typeof taskAutoRenderStateLabel === "function" ? taskAutoRenderStateLabel(t, "error") : "En erreur"}</option>
          </select>
        </div>
        <div className="uu-row uu-align-center uu-gap-8" style={{ minWidth: "280px" }}>
          <label className="uu-label" style={{ width: "120px" }}>{safeT(t, "postprod.tasks.search.advanced.renderWorker", "Station de rendu")}</label>
          <select
            className="uu-select"
            style={{ width: "260px", height: "36px" }}
            value={listRenderWorkerFilter}
            disabled={tasksLoading}
            onChange={(e) => {
              const next = String(e.target.value || "all").trim();
              if (next === "all" || next === "__auto" || (Array.isArray(taskRenderWorkerFilterOptions) ? taskRenderWorkerFilterOptions : []).some((entry) => entry.key === next)) {
                onSetListRenderWorkerFilter?.(next);
                return;
              }
              onSetListRenderWorkerFilter?.("all");
            }}
          >
            <option value="all">{safeT(t, "postprod.tasks.filter.renderWorker.all", "Toutes")}</option>
            <option value="__auto">{safeT(t, "postprod.tasks.form.autoRenderWorker.auto", "Auto (dispatcher)")}</option>
            {(Array.isArray(taskRenderWorkerFilterOptions) ? taskRenderWorkerFilterOptions : []).map((entry) => (
              <option key={`task-worker-filter-${entry.key}`} value={entry.key}>
                {entry.label || entry.key}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="uu-row uu-gap-16 uu-wrap">
        <div className="uu-row uu-align-center uu-gap-8" style={{ minWidth: "280px" }}>
          <label className="uu-label" style={{ width: "120px" }}>{safeT(t, "postprod.tasks.search.advanced.project", "Projet")}</label>
          <select
            className="uu-select"
            style={{ width: "260px", height: "36px" }}
            value={listProjectFilter}
            disabled={tasksLoading}
            onChange={(e) => onSetListProjectFilter?.(String(e.target.value || "all"))}
          >
            <option value="all">{safeT(t, "postprod.tasks.filter.project.all", "Tous")}</option>
            {(Array.isArray(normalizedProjectOptions) ? normalizedProjectOptions : []).map((entry) => (
              <option key={`task-project-filter-${entry.ref}`} value={entry.ref}>
                {entry.label || entry.ref}
              </option>
            ))}
          </select>
        </div>
        <div className="uu-row uu-align-center uu-gap-8" style={{ minWidth: "280px" }}>
          <label className="uu-label" style={{ width: "120px" }}>{safeT(t, "postprod.tasks.search.advanced.form", "Formulaire")}</label>
          <select
            className="uu-select"
            style={{ width: "260px", height: "36px" }}
            value={listFormFilter}
            disabled={tasksLoading}
            onChange={(e) => onSetListFormFilter?.(String(e.target.value || "all"))}
          >
            <option value="all">{safeT(t, "postprod.tasks.search.advanced.form.all", "Tous")}</option>
            {(Array.isArray(taskFormFilterOptions) ? taskFormFilterOptions : []).map((entry) => (
              <option key={`task-form-filter-${entry.id}`} value={String(entry.id)}>
                {entry.label || `#${entry.id}`}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="uu-row uu-gap-16 uu-wrap">
        <div className="uu-row uu-align-center uu-gap-8" style={{ minWidth: "280px" }}>
          <label className="uu-label" style={{ width: "120px" }}>{safeT(t, "postprod.tasks.search.advanced.renderMode", "Mode de rendu")}</label>
          <select
            className="uu-select"
            style={{ width: "260px", height: "36px" }}
            value={listRenderModeFilter}
            disabled={tasksLoading}
            onChange={(e) => onSetListRenderModeFilter?.(String(e.target.value || "all"))}
          >
            <option value="all">{safeT(t, "postprod.tasks.search.advanced.renderMode.all", "Tous")}</option>
            {(Array.isArray(taskRenderModeFilterOptions) ? taskRenderModeFilterOptions : []).map((entry) => (
              <option key={`task-render-mode-filter-${entry.value}`} value={entry.value}>
                {entry.label || entry.value}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="uu-row uu-justify-end">
        <button
          type="button"
          className="uu-btn-ghost"
          onClick={() => onClose?.()}
        >
          {safeT(t, "projects.search.close", "Fermer")}
        </button>
      </div>
    </div>
  );
}

export { TasksAdvancedSearchPanel };

