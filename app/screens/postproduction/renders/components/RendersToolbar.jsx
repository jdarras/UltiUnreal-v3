import MultiSelectDropdown from "../../../../components/MultiSelectDropdown";
import { safeT } from "../../shared/helpers";

const DROPDOWN_STYLE = { flex: "none", minWidth: 0, width: "100%" };
const FIELD_GRID = { display: "grid", gridTemplateColumns: "150px 1fr", gap: "8px", alignItems: "center" };

function normalizeMultiSelectOptions(options = []) {
  return (Array.isArray(options) ? options : [])
    .map((entry) => {
      const valueRaw = entry?.value ?? entry?.key ?? "";
      const value = String(valueRaw || "").trim().toLowerCase();
      const label = String(entry?.label || valueRaw || "").trim();
      if (!value || !label) return null;
      return { value, label };
    })
    .filter(Boolean);
}

function RendersToolbar({
  t,
  rendersLoading = false,
  listSortKey = "updatedAt",
  listSortDir = "desc",
  onSetListSortFromSelect = null,
  searchQuery = "",
  onSetSearchQuery = null,
  hasActiveFilters = false,
  onClearFilters = null,
  onOpenAdvancedSearch = null,
  viewMode = "thumbs",
  onSetViewMode = null,
  searchExpanded = false,
  onSetSearchExpanded = null,
  sortedDisplayedRendersCount = 0,
  projectFilter = [],
  onSetProjectFilter = null,
  stationFilter = [],
  onSetStationFilter = null,
  reviewFilter = [],
  onSetReviewFilter = null,
  taskFilter = [],
  onSetTaskFilter = null,
  formFilter = [],
  onSetFormFilter = null,
  requesterFilter = [],
  onSetRequesterFilter = null,
  statusFilter = [],
  onSetStatusFilter = null,
  sequenceFilter = [],
  onSetSequenceFilter = null,
  projectFilterOptions = [],
  reviewFilterOptions = [],
  stationFilterOptions = [],
  taskFilterOptions = [],
  formFilterOptions = [],
  requesterFilterOptions = [],
  statusFilterOptions = [],
  sequenceFilterOptions = [],
  showHistory = false,
  onSetShowHistory = null,
}) {
  const noneLabel = safeT(t, "common.all", "Tous");
  const projectOptions = normalizeMultiSelectOptions(projectFilterOptions);
  const reviewOptions = normalizeMultiSelectOptions(reviewFilterOptions);
  const stationOptions = normalizeMultiSelectOptions(stationFilterOptions);
  const taskOptions = normalizeMultiSelectOptions(taskFilterOptions);
  const formOptions = normalizeMultiSelectOptions(formFilterOptions);
  const requesterOptions = normalizeMultiSelectOptions(requesterFilterOptions);
  const statusOptions = normalizeMultiSelectOptions(statusFilterOptions);
  const sequenceOptions = normalizeMultiSelectOptions(sequenceFilterOptions);

  return (
    <div className="uu-card">
      <div className="uu-row uu-align-center uu-gap-8" style={{ flexWrap: "nowrap", alignItems: "center", width: "100%" }}>
        <div className="uu-row uu-gap-8 uu-align-center" style={{ flex: "0 0 auto" }}>
          <select
            className="uu-select"
            style={{ height: "36px" }}
            value={`${listSortKey}:${listSortDir}`}
            disabled={rendersLoading}
            onChange={(e) => onSetListSortFromSelect?.(e.target.value)}
          >
            <option value="updatedAt:desc">{safeT(t, "postprod.renders.sort.updatedAt", "Date MAJ")}</option>
            <option value="file:asc">{safeT(t, "postprod.renders.sort.file", "Fichier")}</option>
            <option value="project:asc">{safeT(t, "postprod.renders.sort.project", "Projet")}</option>
            <option value="linkedTask:asc">{safeT(t, "postprod.renders.sort.linkedTask", "Tache liee")}</option>
            <option value="requester:asc">{safeT(t, "postprod.renders.sort.requester", "Demandeur")}</option>
            <option value="station:asc">{safeT(t, "postprod.renders.columns.station", "Machine")}</option>
            <option value="reviewStatus:asc">{safeT(t, "postprod.renders.sort.reviewStatus", "Validation")}</option>
          </select>

          <div className="uu-row uu-gap-4 uu-align-center" style={{ flex: "0 0 auto" }}>
            <input
              className="uu-input"
              style={{ width: "320px", maxWidth: "360px", height: "36px", lineHeight: "36px" }}
              type="text"
              value={searchQuery}
              disabled={rendersLoading}
              onChange={(e) => onSetSearchQuery?.(e.target.value)}
              placeholder={safeT(t, "postprod.renders.search.placeholder", "Template, projet, demandeur, machine de rendu disponible...")}
            />
            <button
              type="button"
              className="uu-btn uu-btn-icon"
              disabled={rendersLoading || !hasActiveFilters}
              onClick={() => onClearFilters?.()}
              title={safeT(t, "postprod.renders.search.clear", "Effacer filtres")}
              style={{
                width: "36px",
                minWidth: "36px",
                height: "36px",
                padding: "0 6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✕
            </button>
            <button
              type="button"
              className="uu-btn"
              onClick={() => onOpenAdvancedSearch?.()}
              style={{ height: "36px", minHeight: "36px", display: "flex", alignItems: "center" }}
            >
              {safeT(t, "projects.search.advancedButton", "Recherche avancee")}
            </button>
            <label className="uu-check" style={{ marginLeft: "8px", whiteSpace: "nowrap" }}>
              <input
                type="checkbox"
                checked={showHistory === true}
                disabled={rendersLoading}
                onChange={(e) => onSetShowHistory?.(e.target.checked === true)}
              />
              {safeT(t, "postprod.renders.history.toggle", "Historique")}
            </label>
          </div>
        </div>

        <div className="uu-row uu-gap-4" style={{ marginLeft: "auto" }}>
          <button
            className={`uu-btn ${viewMode === "thumbs" ? "prod-toggle-active" : ""}`}
            type="button"
            onClick={() => onSetViewMode?.("thumbs")}
          >
            {safeT(t, "projects.view.thumbs", "Miniatures")}
          </button>
          <button
            className={`uu-btn ${viewMode === "list" ? "prod-toggle-active" : ""}`}
            type="button"
            onClick={() => onSetViewMode?.("list")}
          >
            {safeT(t, "projects.view.list", "Liste")}
          </button>
        </div>
      </div>

    </div>
  );
}

function RendersAdvancedSearchPanel({
  t,
  rendersLoading = false,
  searchExpanded = false,
  onSetSearchExpanded = null,
  sortedDisplayedRendersCount = 0,
  projectFilter = [],
  onSetProjectFilter = null,
  stationFilter = [],
  onSetStationFilter = null,
  reviewFilter = [],
  onSetReviewFilter = null,
  taskFilter = [],
  onSetTaskFilter = null,
  formFilter = [],
  onSetFormFilter = null,
  requesterFilter = [],
  onSetRequesterFilter = null,
  statusFilter = [],
  onSetStatusFilter = null,
  sequenceFilter = [],
  onSetSequenceFilter = null,
  projectFilterOptions = [],
  reviewFilterOptions = [],
  stationFilterOptions = [],
  taskFilterOptions = [],
  formFilterOptions = [],
  requesterFilterOptions = [],
  statusFilterOptions = [],
  sequenceFilterOptions = [],
}) {
  if (!searchExpanded) return null;

  const noneLabel = safeT(t, "common.all", "Tous");
  const projectOptions = normalizeMultiSelectOptions(projectFilterOptions);
  const reviewOptions = normalizeMultiSelectOptions(reviewFilterOptions);
  const stationOptions = normalizeMultiSelectOptions(stationFilterOptions);
  const taskOptions = normalizeMultiSelectOptions(taskFilterOptions);
  const formOptions = normalizeMultiSelectOptions(formFilterOptions);
  const requesterOptions = normalizeMultiSelectOptions(requesterFilterOptions);
  const statusOptions = normalizeMultiSelectOptions(statusFilterOptions);
  const sequenceOptions = normalizeMultiSelectOptions(sequenceFilterOptions);

  return (
    <div className="uu-card uu-col uu-gap-12 mt-12">
      <div className="uu-row uu-align-center uu-gap-8 uu-wrap">
        <strong className="uu-block-title">{safeT(t, "projects.search.advancedTitle", "Recherche avancee")}</strong>
        <div className="uu-muted">
          {sortedDisplayedRendersCount > 0 ? `(${sortedDisplayedRendersCount})` : ""}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", alignItems: "start" }}>
        <div style={FIELD_GRID}>
          <label className="uu-label">{safeT(t, "postprod.renders.filters.projects", "Projets")}</label>
          <MultiSelectDropdown options={projectOptions} values={Array.isArray(projectFilter) ? projectFilter : []} onChange={(v) => { if (!rendersLoading) onSetProjectFilter?.(v); }} noneLabel={noneLabel} style={DROPDOWN_STYLE} />
          <label className="uu-label">{safeT(t, "postprod.renders.filters.station", "Machine")}</label>
          <MultiSelectDropdown options={stationOptions} values={Array.isArray(stationFilter) ? stationFilter : []} onChange={(v) => { if (!rendersLoading) onSetStationFilter?.(v); }} noneLabel={noneLabel} style={DROPDOWN_STYLE} />
          <label className="uu-label">{safeT(t, "postprod.renders.filters.form", "Formulaire")}</label>
          <MultiSelectDropdown options={formOptions} values={Array.isArray(formFilter) ? formFilter : []} onChange={(v) => { if (!rendersLoading) onSetFormFilter?.(v); }} noneLabel={noneLabel} style={DROPDOWN_STYLE} />
          <label className="uu-label">{safeT(t, "postprod.renders.filters.status", "Statut")}</label>
          <MultiSelectDropdown options={statusOptions} values={Array.isArray(statusFilter) ? statusFilter : []} onChange={(v) => { if (!rendersLoading) onSetStatusFilter?.(v); }} noneLabel={noneLabel} style={DROPDOWN_STYLE} />
        </div>
        <div style={FIELD_GRID}>
          <label className="uu-label">{safeT(t, "postprod.renders.filters.validation", "Validation")}</label>
          <MultiSelectDropdown options={reviewOptions} values={Array.isArray(reviewFilter) ? reviewFilter : []} onChange={(v) => { if (!rendersLoading) onSetReviewFilter?.(v); }} noneLabel={noneLabel} style={DROPDOWN_STYLE} />
          <label className="uu-label">{safeT(t, "postprod.renders.filters.task", "Tâche")}</label>
          <MultiSelectDropdown options={taskOptions} values={Array.isArray(taskFilter) ? taskFilter : []} onChange={(v) => { if (!rendersLoading) onSetTaskFilter?.(v); }} noneLabel={noneLabel} style={DROPDOWN_STYLE} />
          <label className="uu-label">{safeT(t, "postprod.renders.filters.requester", "Demandeur")}</label>
          <MultiSelectDropdown options={requesterOptions} values={Array.isArray(requesterFilter) ? requesterFilter : []} onChange={(v) => { if (!rendersLoading) onSetRequesterFilter?.(v); }} noneLabel={noneLabel} style={DROPDOWN_STYLE} />
          <label className="uu-label">{safeT(t, "postprod.renders.filters.sequence", "Level Sequence")}</label>
          <MultiSelectDropdown options={sequenceOptions} values={Array.isArray(sequenceFilter) ? sequenceFilter : []} onChange={(v) => { if (!rendersLoading) onSetSequenceFilter?.(v); }} noneLabel={noneLabel} style={DROPDOWN_STYLE} />
        </div>
      </div>

      <div className="uu-row uu-justify-end">
        <button type="button" className="uu-btn-ghost" onClick={() => onSetSearchExpanded?.(false)}>
          {safeT(t, "projects.search.close", "Fermer")}
        </button>
      </div>
    </div>
  );
}

export { RendersToolbar, RendersAdvancedSearchPanel };
