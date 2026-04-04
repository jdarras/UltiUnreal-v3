import { safeT } from "../../shared/helpers";

export function RenderFormsMetaCard({
  t,
  selectedForm = null,
  selectedFormProjectDisplayLabel = "",
  metaName = "",
  onSetMetaName = null,
  onSaveMeta = null,
  metaMapName = "",
  onSetMetaMapName = null,
  metaSequenceName = "",
  onSetMetaSequenceName = null,
  metaPresetName = "",
  onSetMetaPresetName = null,
  metaActive = true,
  onSetMetaActive = null,
  projectCatalogLevelOptions = [],
  projectCatalogSequenceOptions = [],
  projectCatalogWrcPresetOptions = [],
  projectCatalogLoading = false,
  projectCatalogError = "",
}) {
  const formMetaFieldRowStyle = { display: "flex", alignItems: "center", gap: "10px" };
  const formMetaFieldLabelStyle = { width: "150px", minWidth: "150px" };

  return (
    <div className="uu-card">
      {!selectedForm ? (
        <div className="uu-muted mt-8">{safeT(t, "postprod.data.forms.empty", "Aucun formulaire pour ce projet.")}</div>
      ) : (
        <>
          <div className="uu-grid-field mt-8" style={formMetaFieldRowStyle}>
            <label className="uu-label" style={formMetaFieldLabelStyle}>{safeT(t, "postprod.data.project", "Projet")}</label>
            <input
              className="uu-input"
              type="text"
              value={String(selectedFormProjectDisplayLabel || "")}
              disabled
              readOnly
            />
          </div>
          <div className="uu-grid-field mt-8" style={formMetaFieldRowStyle}>
            <label className="uu-label" style={formMetaFieldLabelStyle}>{safeT(t, "common.name", "Nom")}</label>
            <input
              className="uu-input"
              type="text"
              value={metaName}
              onChange={(e) => onSetMetaName?.(e.target.value)}
              onBlur={(e) => {
                void onSaveMeta?.({ name: e.target.value }, { importIfEmpty: false });
              }}
            />
          </div>
          <div className="uu-grid-field mt-8" style={formMetaFieldRowStyle}>
            <label className="uu-label" style={formMetaFieldLabelStyle}>{safeT(t, "postprod.tasks.form.autoRenderMap", "Level")}</label>
            <select
              className="uu-input"
              value={metaMapName}
              onChange={(e) => {
                const next = String(e.target.value || "").trim();
                onSetMetaMapName?.(next);
                void onSaveMeta?.({ mapName: next }, { importIfEmpty: true });
              }}
            >
              <option value="">{safeT(t, "common.select", "Selectionner")}</option>
              {projectCatalogLevelOptions.map((entry) => (
                <option key={`render-form-edit-map-${entry.value}`} value={entry.value}>{entry.label}</option>
              ))}
            </select>
          </div>
          <div className="uu-grid-field mt-8" style={formMetaFieldRowStyle}>
            <label className="uu-label" style={formMetaFieldLabelStyle}>{safeT(t, "postprod.tasks.form.autoRenderSequence", "Level Sequence")}</label>
            <select
              className="uu-input"
              value={metaSequenceName}
              onChange={(e) => {
                const next = String(e.target.value || "").trim();
                onSetMetaSequenceName?.(next);
                void onSaveMeta?.({ sequenceName: next }, { importIfEmpty: true });
              }}
            >
              <option value="">{safeT(t, "common.select", "Selectionner")}</option>
              {projectCatalogSequenceOptions.map((entry) => (
                <option key={`render-form-edit-sequence-${entry.value}`} value={entry.value}>{entry.label}</option>
              ))}
            </select>
          </div>
          <div className="uu-grid-field mt-8" style={formMetaFieldRowStyle}>
            <label className="uu-label" style={formMetaFieldLabelStyle}>{safeT(t, "postprod.data.forms.preset", "Preset WRC")}</label>
            <select
              className="uu-input"
              value={String(metaPresetName || "").trim()}
              onChange={(e) => {
                const next = String(e.target.value || "").trim();
                onSetMetaPresetName?.(next);
                void onSaveMeta?.({ presetName: next }, { importIfEmpty: true });
              }}
            >
              <option value="">{safeT(t, "common.select", "Selectionner")}</option>
              {projectCatalogWrcPresetOptions.map((entry) => (
                <option key={`render-form-edit-wrc-${entry.value}`} value={entry.value}>
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
          <div className="uu-row mt-8">
            <label className="uu-check">
              <input
                type="checkbox"
                checked={metaActive}
                onChange={(e) => {
                  const next = e.target.checked === true;
                  onSetMetaActive?.(next);
                  void onSaveMeta?.({ isActive: next }, { importIfEmpty: false });
                }}
              />
              {safeT(t, "postprod.data.forms.active", "Disponible")}
            </label>
          </div>
        </>
      )}
    </div>
  );
}

export default RenderFormsMetaCard;
