import { safeT } from "../../shared/helpers";

export function RenderFormsCreateCard({
  t,
  normalizedProjectOptions = [],
  selectedProjectRef = "",
  onSelectProjectRef = null,
  newFormName = "",
  onSetNewFormName = null,
  newMapName = "",
  onSetNewMapName = null,
  newSequenceName = "",
  onSetNewSequenceName = null,
  newPresetName = "",
  onSetNewPresetName = null,
  projectCatalogLevelOptions = [],
  projectCatalogSequenceOptions = [],
  projectCatalogWrcPresetOptions = [],
  projectCatalogLoading = false,
  projectCatalogError = "",
  creating = false,
  canManageRenderTemplates = false,
  onCreate = null,
  createError = "",
  createInfo = "",
}) {
  const formMetaFieldRowStyle = { display: "flex", alignItems: "center", gap: "10px" };
  const formMetaFieldLabelStyle = { width: "150px", minWidth: "150px" };

  return (
    <div className="uu-card">
      <div style={{ fontWeight: 600 }}>{safeT(t, "postprod.data.forms.create", "Nouveau formulaire")}</div>
      <div className="uu-grid-field mt-8" style={formMetaFieldRowStyle}>
        <label className="uu-label" style={formMetaFieldLabelStyle}>{safeT(t, "postprod.data.project", "Projet")}</label>
        <select
          className="uu-input"
          value={String(selectedProjectRef || "")}
          disabled={normalizedProjectOptions.length <= 0}
          onChange={(e) => {
            const next = String(e.target.value || "").trim();
            if (typeof onSelectProjectRef === "function") onSelectProjectRef(next);
          }}
        >
          {normalizedProjectOptions.map((project) => (
            <option key={`render-form-create-project-${project.ref}`} value={project.ref}>
              {project.name && project.id ? `${project.name} [${project.id}]` : (project.name || project.id || project.ref)}
            </option>
          ))}
        </select>
      </div>
      <div className="uu-grid-field mt-8" style={formMetaFieldRowStyle}>
        <label className="uu-label" style={formMetaFieldLabelStyle}>{safeT(t, "common.name", "Nom")}</label>
        <input className="uu-input" type="text" value={newFormName} onChange={(e) => onSetNewFormName?.(e.target.value)} />
      </div>
      <div className="uu-grid-field mt-8" style={formMetaFieldRowStyle}>
        <label className="uu-label" style={formMetaFieldLabelStyle}>{safeT(t, "postprod.tasks.form.autoRenderMap", "Level")}</label>
        <select className="uu-input" value={newMapName} onChange={(e) => onSetNewMapName?.(String(e.target.value || "").trim())}>
          <option value="">{safeT(t, "common.select", "Selectionner")}</option>
          {projectCatalogLevelOptions.map((entry) => (
            <option key={`render-form-create-map-${entry.value}`} value={entry.value}>{entry.label}</option>
          ))}
        </select>
      </div>
      <div className="uu-grid-field mt-8" style={formMetaFieldRowStyle}>
        <label className="uu-label" style={formMetaFieldLabelStyle}>{safeT(t, "postprod.tasks.form.autoRenderSequence", "Level Sequence")}</label>
        <select className="uu-input" value={newSequenceName} onChange={(e) => onSetNewSequenceName?.(String(e.target.value || "").trim())}>
          <option value="">{safeT(t, "common.select", "Selectionner")}</option>
          {projectCatalogSequenceOptions.map((entry) => (
            <option key={`render-form-create-sequence-${entry.value}`} value={entry.value}>{entry.label}</option>
          ))}
        </select>
      </div>
      <div className="uu-grid-field mt-8" style={formMetaFieldRowStyle}>
        <label className="uu-label" style={formMetaFieldLabelStyle}>{safeT(t, "postprod.data.forms.preset", "Preset WRC")}</label>
        <select
          className="uu-input"
          value={String(newPresetName || "").trim()}
          onChange={(e) => onSetNewPresetName?.(String(e.target.value || "").trim())}
        >
          <option value="">{safeT(t, "common.select", "Selectionner")}</option>
          {projectCatalogWrcPresetOptions.map((entry) => (
            <option key={`render-form-create-wrc-${entry.value}`} value={entry.value}>
              {entry.label}
            </option>
          ))}
        </select>
      </div>
      {projectCatalogLoading ? <div className="uu-muted mt-8">{safeT(t, "common.loading", "Chargement…")}</div> : null}
      {projectCatalogError ? <div className="uu-msg warn mt-8">{projectCatalogError}</div> : null}
      {!projectCatalogLoading && !projectCatalogError && projectCatalogWrcPresetOptions.length <= 0 ? (
        <div className="uu-msg info mt-8">
          {safeT(t, "postprod.data.forms.wrc.none", "Aucun preset WRC detecte pour ce projet.")}
        </div>
      ) : null}
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

export default RenderFormsCreateCard;
