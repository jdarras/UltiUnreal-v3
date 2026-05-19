import MultiSelectDropdown from "../../../../components/MultiSelectDropdown";
import { safeT } from "../../shared/helpers";

const DROPDOWN_STYLE = { flex: "none", minWidth: 0, width: "100%" };
const FIELD_GRID = { display: "grid", gridTemplateColumns: "150px 1fr", gap: "8px", alignItems: "center" };
const ADVANCED_SEARCH_COLUMNS_STYLE = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", alignItems: "start" };

function normalizeMultiSelectOptions(options = []) {
  return (Array.isArray(options) ? options : [])
    .map((entry) => {
      const valueRaw = entry?.value ?? entry?.key ?? entry?.ref ?? entry?.id ?? "";
      const value = String(valueRaw || "").trim().toLowerCase();
      const label = String(entry?.label || valueRaw || "").trim();
      if (!value || !label) return null;
      return { value, label };
    })
    .filter(Boolean);
}

function normalizeValues(values = []) {
  const source = Array.isArray(values) ? values : [values];
  const seen = new Set();
  const out = [];
  for (const value of source) {
    const normalized = String(value || "").trim().toLowerCase();
    if (!normalized || normalized === "all" || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function RenderEditorAdvancedSearchPanel({
  t,
  visible = false,
  displayedCount = 0,
  tasksLoading = false,
  listStatusFilter = [],
  onSetListStatusFilter = null,
  taskStatusFlow = [],
  taskStatusLabel = null,
  listRenderWorkerFilter = [],
  onSetListRenderWorkerFilter = null,
  taskRenderWorkerFilterOptions = [],
  listProjectFilter = [],
  onSetListProjectFilter = null,
  normalizedProjectOptions = [],
  listFormFilter = [],
  onSetListFormFilter = null,
  taskFormFilterOptions = [],
  listRenderModeFilter = [],
  onSetListRenderModeFilter = null,
  taskRenderModeFilterOptions = [],
  onClose = null,
}) {
  if (!visible) return null;

  const noneLabel = safeT(t, "common.all", "Tous");

  const statusOptions = normalizeMultiSelectOptions(
    (Array.isArray(taskStatusFlow) ? taskStatusFlow : []).map((status) => ({
      value: status,
      label: typeof taskStatusLabel === "function" ? taskStatusLabel(t, status) : String(status),
    }))
  );

  const workerOptions = normalizeMultiSelectOptions([
    { value: "__auto", label: safeT(t, "postprod.tasks.form.autoRenderWorker.auto", "Auto (dispatcher)") },
    ...(Array.isArray(taskRenderWorkerFilterOptions) ? taskRenderWorkerFilterOptions : []).map((entry) => ({
      value: entry?.key,
      label: entry?.label || entry?.key,
    })),
  ]);

  const projectOptions = normalizeMultiSelectOptions(
    (Array.isArray(normalizedProjectOptions) ? normalizedProjectOptions : []).map((entry) => ({
      value: entry?.ref,
      label: entry?.label || entry?.ref,
    }))
  );

  const formOptions = normalizeMultiSelectOptions(
    (Array.isArray(taskFormFilterOptions) ? taskFormFilterOptions : []).map((entry) => ({
      value: entry?.id,
      label: entry?.label || `#${entry?.id}`,
    }))
  );

  const renderModeOptions = normalizeMultiSelectOptions(
    (Array.isArray(taskRenderModeFilterOptions) ? taskRenderModeFilterOptions : []).map((entry) => ({
      value: entry?.value,
      label: entry?.label || entry?.value,
    }))
  );

  return (
    <div className="uu-card uu-col uu-gap-12 mt-12">
      <div className="uu-row uu-align-center uu-gap-8 uu-wrap">
        <strong className="uu-block-title">{safeT(t, "projects.search.advancedTitle", "Recherche avancée")}</strong>
        <div className="uu-muted">
          {displayedCount ? `(${displayedCount})` : ""}
        </div>
      </div>

      <div style={ADVANCED_SEARCH_COLUMNS_STYLE}>
        <div style={FIELD_GRID}>
          <label className="uu-label">{safeT(t, "postprod.tasks.search.advanced.status", "Statut")}</label>
          <MultiSelectDropdown
            options={statusOptions}
            values={normalizeValues(listStatusFilter)}
            onChange={(value) => {
              if (tasksLoading) return;
              onSetListStatusFilter?.(normalizeValues(value));
            }}
            noneLabel={noneLabel}
            style={DROPDOWN_STYLE}
          />

          <label className="uu-label">{safeT(t, "postprod.tasks.search.advanced.renderWorker", "Station de rendu")}</label>
          <MultiSelectDropdown
            options={workerOptions}
            values={normalizeValues(listRenderWorkerFilter)}
            onChange={(value) => {
              if (tasksLoading) return;
              onSetListRenderWorkerFilter?.(normalizeValues(value));
            }}
            noneLabel={noneLabel}
            style={DROPDOWN_STYLE}
          />

          <label className="uu-label">{safeT(t, "postprod.tasks.search.advanced.project", "Projet")}</label>
          <MultiSelectDropdown
            options={projectOptions}
            values={normalizeValues(listProjectFilter)}
            onChange={(value) => {
              if (tasksLoading) return;
              onSetListProjectFilter?.(normalizeValues(value));
            }}
            noneLabel={noneLabel}
            style={DROPDOWN_STYLE}
          />
        </div>

        <div style={FIELD_GRID}>
          <label className="uu-label">{safeT(t, "postprod.tasks.search.advanced.form", "Formulaire")}</label>
          <MultiSelectDropdown
            options={formOptions}
            values={normalizeValues(listFormFilter)}
            onChange={(value) => {
              if (tasksLoading) return;
              onSetListFormFilter?.(normalizeValues(value));
            }}
            noneLabel={noneLabel}
            style={DROPDOWN_STYLE}
          />

          <label className="uu-label">{safeT(t, "postprod.tasks.search.advanced.renderMode", "Mode de rendu")}</label>
          <MultiSelectDropdown
            options={renderModeOptions}
            values={normalizeValues(listRenderModeFilter)}
            onChange={(value) => {
              if (tasksLoading) return;
              onSetListRenderModeFilter?.(normalizeValues(value));
            }}
            noneLabel={noneLabel}
            style={DROPDOWN_STYLE}
          />
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

export { RenderEditorAdvancedSearchPanel };
