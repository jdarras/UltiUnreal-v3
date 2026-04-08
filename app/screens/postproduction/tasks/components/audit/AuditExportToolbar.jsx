import { safeT } from "../../../shared/helpers";
import { normalizeAuditExportFormat } from "../../helpers/auditExport";

function AuditExportToolbar({
  t,
  loading = false,
  filteredRows = [],
  fullExportFormat = "csv",
  anyFullExportBusy = false,
  onSetFullExportFormat = null,
  onExportCurrentRowsCsv = null,
  onExportAll = null,
  exportLoadingLabel = "",
}) {
  return (
    <div className="uu-row uu-align-center" style={{ justifyContent: "space-between" }}>
      <h3 className="uu-h3 uu-block-title">{safeT(t, "postprod.audit.title", "Historique & Logs")}</h3>
      <div className="uu-row">
        <button
          className="uu-btn-ghost"
          type="button"
          disabled={loading || filteredRows.length <= 0}
          onClick={() => {
            try {
              onExportCurrentRowsCsv?.();
            } catch {
              // non-blocking
            }
          }}
        >
          {safeT(t, "postprod.audit.export.csvPage", "Exporter CSV (page)")}
        </button>
        <label className="uu-label" style={{ alignSelf: "center" }}>
          {safeT(t, "postprod.audit.export.format.label", "Format")}
        </label>
        <select
          className="uu-input"
          value={fullExportFormat}
          disabled={loading || anyFullExportBusy}
          onChange={(e) => {
            if (typeof onSetFullExportFormat === "function") {
              onSetFullExportFormat(normalizeAuditExportFormat(e?.target?.value));
            }
          }}
          style={{ minWidth: "140px" }}
        >
          <option value="csv">{safeT(t, "postprod.audit.export.format.csv", "CSV")}</option>
          <option value="json">{safeT(t, "postprod.audit.export.format.json", "JSON")}</option>
          <option value="ndjson">{safeT(t, "postprod.audit.export.format.ndjson", "NDJSON")}</option>
        </select>
        <button
          className="uu-btn-ghost"
          type="button"
          disabled={loading || anyFullExportBusy}
          onClick={() => {
            onExportAll?.();
          }}
        >
          {anyFullExportBusy
            ? exportLoadingLabel || safeT(t, "postprod.audit.export.loading", "Export en cours...")
            : safeT(t, "postprod.audit.export.full", "Exporter complet")}
        </button>
      </div>
    </div>
  );
}

export { AuditExportToolbar };

