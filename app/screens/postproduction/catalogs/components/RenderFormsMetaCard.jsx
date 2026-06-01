import { useState, useEffect, useMemo } from "react";
import { safeT } from "../../shared/helpers";

const RED_CARD_STYLE = {
  backgroundColor: "rgba(163, 46, 46, 0.22)",
  borderColor: "var(--uu-color-red)",
};
const RED_INPUT_STYLE = {
  borderColor: "var(--uu-color-red)",
  backgroundColor: "rgba(163, 46, 46, 0.18)",
};
const RED_SELECT_STYLE = {
  borderColor: "var(--uu-color-red)",
};
const META_HELP_TEXT_STYLE = { fontSize: "0.82em" };
const META_WRC_ROW_STYLE = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  marginBottom: 4,
};
const META_WRC_LABEL_STYLE = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  flex: "1 1 auto",
  minWidth: 0,
};
const META_OPTION_LABEL_STYLE = { fontSize: "0.88em" };
const META_CHECKBOX_ROW_STYLE = { display: "flex", alignItems: "center", gap: 6, marginBottom: 4 };

export function RenderFormsMetaCard({
  t,
  selectedForm = null,
  selectedFormProjectDisplayLabel = "",
  metaName = "",
  onSetMetaName = null,
  onSaveMeta = null,
  metaMapName = "",
  onSetMetaMapName = null,
  metaWrcFiles = [],
  onSetMetaWrcFiles = null,
  metaActive: _metaActive = true,
  onSetMetaActive: _onSetMetaActive = null,
  metaAllowedSequences = [],
  onSetMetaAllowedSequences = null,
  metaAllowedPresets = [],
  onSetMetaAllowedPresets = null,
  projectCatalogSequenceOptions = [],
  projectCatalogPresetOptions = [],
  projectCatalogLevelOptions = [],
  projectCatalogWrcPresetOptions = [],
  projectCatalogLoading = false,
  projectCatalogError = "",
  canManageRenderTemplates = false,
  fieldsImportBusy = false,
  onImportWrcFile = null,
  onNavigateToProject = null,
  onAvailabilityBlockedChange = null,
}) {
  // Local flags: true = user explicitly unchecked ALL checkboxes in that block
  const [seqAllUnchecked, setSeqAllUnchecked] = useState(false);
  const [presetAllUnchecked, setPresetAllUnchecked] = useState(false);

  // Reset when selected form changes
  useEffect(() => {
    setSeqAllUnchecked(false);
    setPresetAllUnchecked(false);
  }, [selectedForm?.id]);

  // --- Field-level validation ---
  const projRed = !String(selectedFormProjectDisplayLabel || "").trim();
  const nameRed = !String(metaName || "").trim();
  const levelRed = !String(metaMapName || "").trim();

  // --- Block-level validation ---
  const seqBlockRed = !projectCatalogLoading && (
    projectCatalogSequenceOptions.length === 0 || seqAllUnchecked
  );
  const presetBlockRed = !projectCatalogLoading && (
    projectCatalogPresetOptions.length === 0 || presetAllUnchecked
  );

  const isBlocked = useMemo(
    () => projRed || nameRed || levelRed || seqBlockRed || presetBlockRed,
    [projRed, nameRed, levelRed, seqBlockRed, presetBlockRed]
  );

  useEffect(() => {
    onAvailabilityBlockedChange?.(isBlocked);
  }, [isBlocked, onAvailabilityBlockedChange]);

  // --- Sequence display logic ---
  const seqAllAllowed = !seqAllUnchecked && Array.isArray(metaAllowedSequences) && metaAllowedSequences.length === 0;

  // --- Preset display logic ---
  const presetAllAllowed = !presetAllUnchecked && Array.isArray(metaAllowedPresets) && metaAllowedPresets.length === 0;

  if (!selectedForm) {
    return (
      <div className="uu-card">
        <div className="uu-muted">{safeT(t, "postprod.data.forms.empty", "Aucun formulaire pour ce projet.")}</div>
      </div>
    );
  }

  return (
    <>
      {/* ---- Bloc 1 : champs principaux ---- */}
      <div className="uu-card">
        <div className="uu-grid-field uu-row uu-row-nowrap uu-gap-10">
          <label className="uu-label uu-label-fixed-150">{safeT(t, "postprod.data.project", "Projet")}</label>
          <input
            className="uu-input"
            type="text"
            value={String(selectedFormProjectDisplayLabel || "")}
            disabled
            readOnly
            style={projRed ? RED_INPUT_STYLE : undefined}
          />
          <button
            type="button"
            className="uu-btn uu-flex-no-shrink"
            onClick={() => onNavigateToProject?.(selectedForm?.projectName)}
          >
            {safeT(t, "common.edit", "Éditer")}
          </button>
          <button
            type="button"
            className="uu-btn prod-toggle-active uu-flex-no-shrink"
            onClick={() => onNavigateToProject?.(selectedForm?.projectName, { start: true })}
          >
            {safeT(t, "common.start", "Start")}
          </button>
        </div>
        <div className="uu-grid-field mt-8 uu-row uu-row-nowrap uu-gap-10">
          <label className="uu-label uu-label-fixed-150">{safeT(t, "common.name", "Nom")}</label>
          <input
            className="uu-input"
            type="text"
            value={metaName}
            onChange={(e) => onSetMetaName?.(e.target.value)}
            onBlur={(e) => {
              void onSaveMeta?.({ name: e.target.value }, { importIfEmpty: false });
            }}
            style={nameRed ? RED_INPUT_STYLE : undefined}
          />
        </div>
        <div className="uu-grid-field mt-8 uu-row uu-row-nowrap uu-gap-10">
          <label className="uu-label uu-label-fixed-150">{safeT(t, "postprod.tasks.form.autoRenderMap", "Level")}</label>
          <select
            className="uu-input"
            value={metaMapName}
            onChange={(e) => {
              const next = String(e.target.value || "").trim();
              onSetMetaMapName?.(next);
              void onSaveMeta?.({ mapName: next }, { importIfEmpty: true });
            }}
            style={levelRed ? RED_SELECT_STYLE : undefined}
          >
            <option value="">{safeT(t, "common.select", "Selectionner")}</option>
            {projectCatalogLevelOptions.map((entry) => (
              <option key={`render-form-edit-map-${entry.value}`} value={entry.value}>{entry.label}</option>
            ))}
          </select>
        </div>
        {projectCatalogLoading ? <div className="uu-muted mt-8">{safeT(t, "common.loading", "Chargement…")}</div> : null}
        {projectCatalogError ? <div className="uu-msg warn mt-8">{projectCatalogError}</div> : null}
      </div>

      {/* ---- Bloc 2 : Fichiers WRC ---- */}
      {!projectCatalogLoading ? (
        <div className="uu-card mt-12">
          <div className="uu-h3 uu-block-title mb-4">
            {safeT(t, "postprod.data.forms.wrcFiles", "Fichiers WRC")}
          </div>
          {projectCatalogWrcPresetOptions.length === 0 ? (
            <div className="uu-muted" style={META_HELP_TEXT_STYLE}>
              {safeT(t, "postprod.data.forms.wrc.none", "Aucun preset WRC detecte pour ce projet.")}
            </div>
          ) : (
            projectCatalogWrcPresetOptions.map((entry) => {
              const checked = Array.isArray(metaWrcFiles) && metaWrcFiles.includes(entry.value);
              const displayName = String(entry?.name || entry?.value || "").trim();
              const displayPath = String(entry?.assetPath || "").trim();
              const showPath = displayPath && displayPath !== displayName;
              return (
                <div
                  key={`wrc-${entry.value}`}
                  style={META_WRC_ROW_STYLE}
                >
                  <label
                    className="uu-check"
                    style={META_WRC_LABEL_STYLE}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const current = Array.isArray(metaWrcFiles) ? [...metaWrcFiles] : [];
                        const next = checked
                          ? current.filter((v) => v !== entry.value)
                          : [...current, entry.value];
                        onSetMetaWrcFiles?.(next);
                        void onSaveMeta?.({ wrcFiles: next }, { importIfEmpty: false });
                      }}
                    />
                    <span style={META_OPTION_LABEL_STYLE}>
                      <span>{displayName || String(entry?.label || "")}</span>
                      {showPath ? <span className="uu-muted"> {`(${displayPath})`}</span> : null}
                    </span>
                  </label>
                  <button
                    type="button"
                    className="uu-btn"
                    disabled={!checked || fieldsImportBusy || !canManageRenderTemplates}
                    onClick={() => {
                      void onImportWrcFile?.(entry.value);
                    }}
                  >
                    {safeT(t, "postprod.data.forms.action.loadWrcPreset", "Load Preset WRC")}
                  </button>
                </div>
              );
            })
          )}
        </div>
      ) : null}

      {/* ---- Bloc 3 : Level Sequences autorisées ---- */}
      {!projectCatalogLoading ? (
        <div className="uu-card mt-12" style={seqBlockRed ? RED_CARD_STYLE : undefined}>
          <div className="uu-h3 uu-block-title mb-4">
            {safeT(t, "postprod.data.forms.allowedSequences", "Level Sequences autorisées")}
          </div>
          {projectCatalogSequenceOptions.length === 0 ? (
            <div className="uu-muted" style={META_HELP_TEXT_STYLE}>
              {safeT(t, "postprod.data.forms.sequences.none", "Aucune Level Sequence détectée dans ce projet.")}
            </div>
          ) : (
            projectCatalogSequenceOptions.map((entry) => {
              const checked = seqAllAllowed || (Array.isArray(metaAllowedSequences) && metaAllowedSequences.includes(entry.value));
              return (
                <label
                  key={`seq-${entry.value}`}
                  className="uu-check"
                  style={META_CHECKBOX_ROW_STYLE}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const currentList = seqAllAllowed
                        ? projectCatalogSequenceOptions.map((e) => e.value)
                        : [...(metaAllowedSequences || [])];
                      const next = checked
                        ? currentList.filter((v) => v !== entry.value)
                        : [...currentList, entry.value];
                      setSeqAllUnchecked(next.length === 0);
                      onSetMetaAllowedSequences?.(next);
                      void onSaveMeta?.({ allowedSequences: next }, { importIfEmpty: false });
                    }}
                  />
                  <span style={META_OPTION_LABEL_STYLE}>{entry.label}</span>
                </label>
              );
            })
          )}
        </div>
      ) : null}

      {/* ---- Bloc 4 : Presets de rendu autorisés ---- */}
      {!projectCatalogLoading ? (
        <div className="uu-card mt-12" style={presetBlockRed ? RED_CARD_STYLE : undefined}>
          <div className="uu-h3 uu-block-title mb-4">
            {safeT(t, "postprod.data.forms.allowedPresets", "Presets de rendu autorisés")}
          </div>
          {projectCatalogPresetOptions.length === 0 ? (
            <div className="uu-muted" style={META_HELP_TEXT_STYLE}>
              {safeT(t, "postprod.data.forms.presets.none", "Aucun preset de rendu détecté dans ce projet.")}
            </div>
          ) : (
            projectCatalogPresetOptions.map((entry) => {
              const checked = presetAllAllowed || (Array.isArray(metaAllowedPresets) && metaAllowedPresets.includes(entry.value));
              return (
                <label
                  key={`preset-${entry.value}`}
                  className="uu-check"
                  style={META_CHECKBOX_ROW_STYLE}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const currentList = presetAllAllowed
                        ? projectCatalogPresetOptions.map((e) => e.value)
                        : [...(metaAllowedPresets || [])];
                      const next = checked
                        ? currentList.filter((v) => v !== entry.value)
                        : [...currentList, entry.value];
                      setPresetAllUnchecked(next.length === 0);
                      onSetMetaAllowedPresets?.(next);
                      void onSaveMeta?.({ allowedPresets: next }, { importIfEmpty: false });
                    }}
                  />
                  <span style={META_OPTION_LABEL_STYLE}>{entry.label}</span>
                </label>
              );
            })
          )}
        </div>
      ) : null}

    </>
  );
}
