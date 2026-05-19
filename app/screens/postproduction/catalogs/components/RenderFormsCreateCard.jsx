import { safeT } from "../../shared/helpers";

const FORM_CREATE_FIELD_ROW_STYLE = { display: "flex", alignItems: "center", gap: "10px" };
const FORM_CREATE_FIELD_LABEL_STYLE = { width: "150px", minWidth: "150px" };
const FORM_CREATE_TITLE_STYLE = { fontWeight: 600 };
const FORM_CREATE_RED_INPUT_STYLE = { borderColor: "var(--uu-color-red)", backgroundColor: "rgba(163, 46, 46, 0.18)" };
const FORM_CREATE_RED_SELECT_STYLE = { borderColor: "var(--uu-color-red)" };

export function RenderFormsCreateCard({
  t,
  normalizedProjectOptions = [],
  selectedProjectRef = "",
  onSelectProjectRef = null,
  newFormName = "",
  onSetNewFormName = null,
  newMapName = "",
  onSetNewMapName = null,
  projectCatalogLevelOptions = [],
  projectCatalogLoading = false,
  projectCatalogError = "",
  creating = false,
  canManageRenderTemplates = false,
  onCreate = null,
  createError = "",
  createInfo = "",
}) {
  const projEmpty = !String(selectedProjectRef || "").trim();
  const nameEmpty = !String(newFormName || "").trim();
  const levelEmpty = !String(newMapName || "").trim();

  return (
    <div className="uu-card">
      <div style={FORM_CREATE_TITLE_STYLE}>{safeT(t, "postprod.data.forms.create", "Nouveau formulaire")}</div>
      <div className="uu-grid-field mt-8" style={FORM_CREATE_FIELD_ROW_STYLE}>
        <label className="uu-label" style={FORM_CREATE_FIELD_LABEL_STYLE}>{safeT(t, "postprod.data.project", "Projet")}</label>
        <select
          className="uu-input"
          value={String(selectedProjectRef || "")}
          disabled={normalizedProjectOptions.length <= 0}
          onChange={(e) => {
            const next = String(e.target.value || "").trim();
            if (typeof onSelectProjectRef === "function") onSelectProjectRef(next);
          }}
          style={projEmpty ? FORM_CREATE_RED_SELECT_STYLE : undefined}
        >
          <option value="">{safeT(t, "common.select", "Selectionner")}</option>
          {normalizedProjectOptions.map((project) => (
            <option key={`render-form-create-project-${project.ref}`} value={project.ref}>
              {project.name && project.id ? `${project.name} [${project.id}]` : (project.name || project.id || project.ref)}
            </option>
          ))}
        </select>
      </div>
      <div className="uu-grid-field mt-8" style={FORM_CREATE_FIELD_ROW_STYLE}>
        <label className="uu-label" style={FORM_CREATE_FIELD_LABEL_STYLE}>{safeT(t, "common.name", "Nom")}</label>
        <input
          className="uu-input"
          type="text"
          value={newFormName}
          onChange={(e) => onSetNewFormName?.(e.target.value)}
          style={nameEmpty ? FORM_CREATE_RED_INPUT_STYLE : undefined}
        />
      </div>
      <div className="uu-grid-field mt-8" style={FORM_CREATE_FIELD_ROW_STYLE}>
        <label className="uu-label" style={FORM_CREATE_FIELD_LABEL_STYLE}>{safeT(t, "postprod.tasks.form.autoRenderMap", "Level")}</label>
        <select
          className="uu-input"
          value={newMapName}
          onChange={(e) => onSetNewMapName?.(String(e.target.value || "").trim())}
          style={levelEmpty ? FORM_CREATE_RED_SELECT_STYLE : undefined}
        >
          <option value="">{safeT(t, "common.select", "Selectionner")}</option>
          {projectCatalogLevelOptions.map((entry) => (
            <option key={`render-form-create-map-${entry.value}`} value={entry.value}>{entry.label}</option>
          ))}
        </select>
      </div>
      {projectCatalogLoading ? <div className="uu-muted mt-8">{safeT(t, "common.loading", "Chargement…")}</div> : null}
      {projectCatalogError ? <div className="uu-msg warn mt-8">{projectCatalogError}</div> : null}
      <div className="uu-row mt-12">
        <button className="uu-btn" type="button" disabled={creating || !canManageRenderTemplates} onClick={() => { void onCreate?.(); }}>
          {creating ? safeT(t, "common.loading", "Chargement…") : safeT(t, "common.create", "Creer")}
        </button>
      </div>
      {createError ? <div className="uu-msg warn mt-8">{createError}</div> : null}
      {createInfo ? <div className="uu-msg ok mt-8">{createInfo}</div> : null}
    </div>
  );
}
