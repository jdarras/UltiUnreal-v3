import { safeT } from "../../../shared/helpers";

function RenderFormsAdvancedSearchPanel({
  t,
  sortedForms = [],
  selectedProjectRef = "",
  normalizedProjectOptions = [],
  onSelectProjectRef = null,
  formsSearchAdvanced = null,
  onFormsSearchAdvancedChange = null,
  onClose = null,
}) {
  return (
    <div className="uu-card uu-col uu-gap-12" style={{ marginBottom: "12px" }}>
      <div className="uu-row uu-align-center uu-gap-8 uu-wrap">
        <strong className="uu-block-title">{safeT(t, "postprod.data.forms.search.advancedTitle", "Recherche avancee formulaires")}</strong>
        <div className="uu-muted">
          {sortedForms.length
            ? `(${sortedForms.length} ${safeT(t, "postprod.data.forms.search.resultsLabel", "resultats")})`
            : ""}
        </div>
      </div>
      <div className="uu-row uu-gap-16 uu-wrap">
        <div className="uu-row uu-align-center uu-gap-8" style={{ minWidth: "340px" }}>
          <label className="uu-label" style={{ width: "120px" }}>
            {safeT(t, "postprod.data.project", "Projet")}
          </label>
          <select
            className="uu-select"
            style={{ width: "320px", height: "36px" }}
            value={String(selectedProjectRef || "")}
            disabled={normalizedProjectOptions.length <= 0}
            onChange={(e) => {
              onSelectProjectRef?.(String(e.target.value || "").trim());
            }}
          >
            {normalizedProjectOptions.map((project) => (
              <option key={`forms-advanced-project-${project.ref}`} value={project.ref}>
                {project.name && project.id ? `${project.name} [${project.id}]` : (project.name || project.id || project.ref)}
              </option>
            ))}
          </select>
        </div>
        <div className="uu-row uu-align-center uu-gap-8" style={{ minWidth: "240px" }}>
          <label className="uu-label" style={{ width: "90px" }}>
            {safeT(t, "postprod.data.forms.active", "Disponible")}
          </label>
          <select
            className="uu-select"
            style={{ width: "180px", height: "36px" }}
            value={String(formsSearchAdvanced?.active || "all")}
            onChange={(e) => {
              onFormsSearchAdvancedChange?.({ active: String(e.target.value || "all") });
            }}
          >
            <option value="all">{safeT(t, "common.all", "Tous")}</option>
            <option value="yes">{safeT(t, "common.yes", "Oui")}</option>
            <option value="no">{safeT(t, "common.no", "Non")}</option>
          </select>
        </div>
      </div>
      <div className="uu-row uu-gap-16 uu-wrap">
        <div className="uu-row uu-align-center uu-gap-8" style={{ minWidth: "320px" }}>
          <label className="uu-label" style={{ width: "90px" }}>
            {safeT(t, "postprod.data.forms.level", "Level")}
          </label>
          <input
            className="uu-input"
            style={{ width: "320px", height: "36px" }}
            type="text"
            value={String(formsSearchAdvanced?.mapName || "")}
            onChange={(e) => {
              onFormsSearchAdvancedChange?.({ mapName: String(e.target.value || "") });
            }}
          />
        </div>
        <div className="uu-row uu-align-center uu-gap-8" style={{ minWidth: "320px" }}>
          <label className="uu-label" style={{ width: "90px" }}>
            {safeT(t, "postprod.data.forms.sequence", "Level Sequence")}
          </label>
          <input
            className="uu-input"
            style={{ width: "320px", height: "36px" }}
            type="text"
            value={String(formsSearchAdvanced?.sequenceName || "")}
            onChange={(e) => {
              onFormsSearchAdvancedChange?.({ sequenceName: String(e.target.value || "") });
            }}
          />
        </div>
      </div>
      <div className="uu-row uu-gap-16 uu-wrap">
        <div className="uu-row uu-align-center uu-gap-8" style={{ minWidth: "320px" }}>
          <label className="uu-label" style={{ width: "90px" }}>
            {safeT(t, "postprod.data.forms.preset", "Preset WRC")}
          </label>
          <input
            className="uu-input"
            style={{ width: "320px", height: "36px" }}
            type="text"
            value={String(formsSearchAdvanced?.presetName || "")}
            onChange={(e) => {
              onFormsSearchAdvancedChange?.({ presetName: String(e.target.value || "") });
            }}
          />
        </div>
      </div>
      <div className="uu-row uu-justify-end">
        <button
          type="button"
          className="uu-btn-ghost"
          onClick={() => {
            onClose?.();
          }}
        >
          {safeT(t, "postprod.data.forms.search.close", "Fermer recherche avancee")}
        </button>
      </div>
    </div>
  );
}

export { RenderFormsAdvancedSearchPanel };
