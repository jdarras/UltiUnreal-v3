import { useMemo } from "react";
import MultiSelectDropdown from "../../../../../components/MultiSelectDropdown";
import { safeT } from "../../../shared/helpers";
import { simplifyUnrealAssetName } from "./simplifyUnrealAssetName";

function buildSimplifiedOpts(forms, getValues) {
  const seen = new Set();
  const opts = [];
  for (const form of forms) {
    for (const v of getValues(form)) {
      const label = simplifyUnrealAssetName(v);
      if (label !== "-" && !seen.has(label)) {
        seen.add(label);
        opts.push({ value: label, label });
      }
    }
  }
  return opts.sort((a, b) => a.label.localeCompare(b.label));
}

const DROPDOWN_STYLE = { flex: "none", minWidth: 0, width: "100%" };
const FIELD_GRID = { display: "grid", gridTemplateColumns: "150px 1fr", gap: "8px", alignItems: "center" };
const LABEL_STYLE = {};
const ADVANCED_SEARCH_PANEL_STYLE = { marginBottom: "12px" };
const ADVANCED_SEARCH_COLUMNS_STYLE = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", alignItems: "start" };
const ADVANCED_SEARCH_SELECT_STYLE = { width: "100%", height: "36px" };

function RenderFormsAdvancedSearchPanel({
  t,
  sortedForms = [],
  visibleForms = [],
  normalizedProjectOptions = [],
  formsSearchAdvanced = null,
  onFormsSearchAdvancedChange = null,
  onClose = null,
}) {
  const projects = Array.isArray(formsSearchAdvanced?.projects) ? formsSearchAdvanced.projects : [];
  const mapNames = Array.isArray(formsSearchAdvanced?.mapNames) ? formsSearchAdvanced.mapNames : [];
  const sequences = Array.isArray(formsSearchAdvanced?.sequences) ? formsSearchAdvanced.sequences : [];
  const presets = Array.isArray(formsSearchAdvanced?.presets) ? formsSearchAdvanced.presets : [];
  const wrcFiles = Array.isArray(formsSearchAdvanced?.wrcFiles) ? formsSearchAdvanced.wrcFiles : [];

  const noneLabel = safeT(t, "common.all", "Tous");

  const projectOpts = useMemo(
    () => normalizedProjectOptions.map((p) => ({
      value: String(p.ref || "").toLowerCase(),
      label: p.name && p.id ? `${p.name} [${p.id}]` : (p.name || p.id || p.ref || ""),
    })),
    [normalizedProjectOptions]
  );
  const mapNameOpts = useMemo(() => buildSimplifiedOpts(visibleForms, (f) => [f?.mapName]), [visibleForms]);
  const sequenceOpts = useMemo(() => buildSimplifiedOpts(visibleForms, (f) => Array.isArray(f?.allowedSequences) ? f.allowedSequences : []), [visibleForms]);
  const presetOpts = useMemo(() => buildSimplifiedOpts(visibleForms, (f) => Array.isArray(f?.allowedPresets) ? f.allowedPresets : []), [visibleForms]);
  const wrcOpts = useMemo(() => buildSimplifiedOpts(visibleForms, (f) => Array.isArray(f?.wrcFiles) ? f.wrcFiles : []), [visibleForms]);

  return (
    <div className="uu-col uu-gap-12" style={ADVANCED_SEARCH_PANEL_STYLE}>
      <div className="uu-row uu-align-center uu-gap-8 uu-wrap">
        <strong className="uu-block-title">
          {safeT(t, "postprod.data.forms.search.advancedTitle", "Résultats de recherche")}
        </strong>
        <div className="uu-muted">
          {sortedForms.length
            ? `(${sortedForms.length} ${safeT(t, "postprod.data.forms.search.resultsLabel", "résultats")})`
          : ""}
        </div>
      </div>

      <div style={ADVANCED_SEARCH_COLUMNS_STYLE}>
        {/* Colonne gauche */}
        <div style={FIELD_GRID}>
          <label className="uu-label" style={LABEL_STYLE}>
            {safeT(t, "postprod.data.project", "Projet")}
          </label>
          <MultiSelectDropdown
            options={projectOpts}
            values={projects}
            onChange={(v) => onFormsSearchAdvancedChange?.({ projects: v })}
            noneLabel={noneLabel}
            style={DROPDOWN_STYLE}
          />

          <label className="uu-label" style={LABEL_STYLE}>
            {safeT(t, "postprod.data.forms.level", "Level")}
          </label>
          <MultiSelectDropdown
            options={mapNameOpts}
            values={mapNames}
            onChange={(v) => onFormsSearchAdvancedChange?.({ mapNames: v })}
            noneLabel={noneLabel}
            style={DROPDOWN_STYLE}
          />

          <label className="uu-label" style={LABEL_STYLE}>
            {safeT(t, "postprod.data.forms.search.renderPreset", "Preset de rendu")}
          </label>
          <MultiSelectDropdown
            options={presetOpts}
            values={presets}
            onChange={(v) => onFormsSearchAdvancedChange?.({ presets: v })}
            noneLabel={noneLabel}
            style={DROPDOWN_STYLE}
          />
        </div>

        {/* Colonne droite */}
        <div style={FIELD_GRID}>
          <label className="uu-label" style={LABEL_STYLE}>
            {safeT(t, "postprod.data.forms.active", "Disponible")}
          </label>
          <select
            className="uu-select"
            style={ADVANCED_SEARCH_SELECT_STYLE}
            value={String(formsSearchAdvanced?.active || "all")}
            onChange={(e) => onFormsSearchAdvancedChange?.({ active: String(e.target.value || "all") })}
          >
            <option value="all">{safeT(t, "common.all", "Tous")}</option>
            <option value="yes">{safeT(t, "common.yes", "Oui")}</option>
            <option value="no">{safeT(t, "common.no", "Non")}</option>
          </select>

          <label className="uu-label" style={LABEL_STYLE}>
            {safeT(t, "postprod.data.forms.search.levelSequence", "Level Sequence")}
          </label>
          <MultiSelectDropdown
            options={sequenceOpts}
            values={sequences}
            onChange={(v) => onFormsSearchAdvancedChange?.({ sequences: v })}
            noneLabel={noneLabel}
            style={DROPDOWN_STYLE}
          />

          <label className="uu-label" style={LABEL_STYLE}>
            {safeT(t, "postprod.data.forms.wrcFiles", "WRC")}
          </label>
          <MultiSelectDropdown
            options={wrcOpts}
            values={wrcFiles}
            onChange={(v) => onFormsSearchAdvancedChange?.({ wrcFiles: v })}
            noneLabel={noneLabel}
            style={DROPDOWN_STYLE}
          />
        </div>
      </div>

      <div className="uu-row uu-justify-end">
        <button type="button" className="uu-btn-ghost" onClick={() => onClose?.()}>
          {safeT(t, "postprod.data.forms.search.close", "Fermer")}
        </button>
      </div>
    </div>
  );
}

export { RenderFormsAdvancedSearchPanel };
