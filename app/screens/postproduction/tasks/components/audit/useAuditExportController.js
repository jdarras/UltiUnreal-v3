import { useState } from "react";
import { fromDateTimeLocalToIso, safeT } from "../../../shared/helpers";
import { useDebouncedLocalStorage } from "../../../shared/useDebouncedLocalStorage";
import {
  AUDIT_EXPORT_FORMAT_STORAGE_KEY,
  DEFAULT_AUDIT_EXPORT_FORMAT,
  buildAuditCsv,
  ensureUtf8Bom,
  buildAuditJsonDocument,
  buildAuditNdjson,
  normalizeAuditExportFormat,
  matchesAuditSearch,
} from "../../helpers/auditExport";

function createExportTimestamp() {
  return new Date().toISOString().replace(/:/g, "-").slice(0, 19);
}

function downloadTextBlob(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

function buildExportQuery({ filters = null, actionFilter = "", scopeFilter = "", fromAtLocal = "", toAtLocal = "", query = "" }) {
  const fromValueLocal = String(fromAtLocal || "").trim();
  const toValueLocal = String(toAtLocal || "").trim();
  return {
    actorUserId: filters?.actorUserId ?? null,
    action: String(actionFilter || "").trim(),
    scopeType: String(scopeFilter || "").trim(),
    fromAt: fromValueLocal ? fromDateTimeLocalToIso(fromValueLocal) : "",
    toAt: toValueLocal ? fromDateTimeLocalToIso(toValueLocal) : "",
    query: String(query || "").trim(),
    pageSize: 500,
  };
}

function useAuditExportController({
  t,
  filters = null,
  actionFilter = "",
  scopeFilter = "",
  fromAtLocal = "",
  toAtLocal = "",
  query = "",
  filteredRows = [],
  onExportAuditAll = null,
  onExportAuditAllJson = null,
  onExportAuditAllNdjson = null,
}) {
  const [exportAllBusy, setExportAllBusy] = useState(false);
  const [exportAllError, setExportAllError] = useState("");
  const [exportJsonBusy, setExportJsonBusy] = useState(false);
  const [exportJsonError, setExportJsonError] = useState("");
  const [exportNdjsonBusy, setExportNdjsonBusy] = useState(false);
  const [exportNdjsonError, setExportNdjsonError] = useState("");
  const [fullExportFormat, setFullExportFormat] = useState(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(AUDIT_EXPORT_FORMAT_STORAGE_KEY) : "";
      return normalizeAuditExportFormat(raw);
    } catch {
      return DEFAULT_AUDIT_EXPORT_FORMAT;
    }
  });

  useDebouncedLocalStorage(
    AUDIT_EXPORT_FORMAT_STORAGE_KEY,
    normalizeAuditExportFormat(fullExportFormat),
    200
  );

  const anyFullExportBusy = exportAllBusy || exportJsonBusy || exportNdjsonBusy;
  const anyFullExportError = exportAllError || exportJsonError || exportNdjsonError;

  function clearFullExportErrors() {
    setExportAllError("");
    setExportJsonError("");
    setExportNdjsonError("");
  }

  function exportLoadingLabel() {
    if (exportJsonBusy) {
      return safeT(t, "postprod.audit.export.jsonLoading", "Export JSON en cours...");
    }
    if (exportNdjsonBusy) {
      return safeT(t, "postprod.audit.export.ndjsonLoading", "Export NDJSON en cours...");
    }
    return safeT(t, "postprod.audit.export.loading", "Export en cours...");
  }

  function exportCurrentRowsCsv() {
    const csv = buildAuditCsv(filteredRows);
    const stamp = createExportTimestamp();
    downloadTextBlob(ensureUtf8Bom(csv), `ultiunreal-audit-${stamp}.csv`, "text/csv;charset=utf-8;");
  }

  async function exportAllRowsCsv() {
    if (typeof onExportAuditAll !== "function") return;
    setExportAllError("");
    setExportAllBusy(true);
    try {
      const result = await onExportAuditAll(
        buildExportQuery({ filters, actionFilter, scopeFilter, fromAtLocal, toAtLocal, query })
      );

      let csv = String(result?.csvText || "");
      if (!csv) {
        const allRows = Array.isArray(result?.entries) ? result.entries : [];
        const search = String(query || "").trim().toLowerCase();
        const searchedRows = allRows.filter((entry) => matchesAuditSearch(entry, search));
        csv = buildAuditCsv(searchedRows);
      }
      const stamp = createExportTimestamp();
      downloadTextBlob(ensureUtf8Bom(csv), `ultiunreal-audit-all-${stamp}.csv`, "text/csv;charset=utf-8;");
    } catch {
      setExportAllError(
        safeT(t, "postprod.audit.export.error.generic", "Impossible d'exporter l'historique complet.")
      );
    } finally {
      setExportAllBusy(false);
    }
  }

  async function exportAllRowsJson() {
    if (typeof onExportAuditAllJson !== "function") return;
    setExportJsonError("");
    setExportJsonBusy(true);
    try {
      const rawQuery = String(query || "").trim();
      const result = await onExportAuditAllJson(
        buildExportQuery({ filters, actionFilter, scopeFilter, fromAtLocal, toAtLocal, query: rawQuery })
      );

      let jsonData = result?.data && typeof result.data === "object" ? result.data : null;
      if (!jsonData) {
        const allRows = Array.isArray(result?.entries) ? result.entries : [];
        const search = rawQuery.toLowerCase();
        const searchedRows = allRows.filter((entry) => matchesAuditSearch(entry, search));
        jsonData = buildAuditJsonDocument(searchedRows, result?.filters || {});
      } else {
        const rows = Array.isArray(jsonData?.entries) ? jsonData.entries : [];
        const search = rawQuery.toLowerCase();
        const searchedRows = rows.filter((entry) => matchesAuditSearch(entry, search));
        jsonData = {
          ...jsonData,
          total: searchedRows.length,
          entries: searchedRows,
        };
      }

      const jsonText = JSON.stringify(jsonData, null, 2);
      const stamp = createExportTimestamp();
      downloadTextBlob(jsonText, `ultiunreal-audit-all-${stamp}.json`, "application/json;charset=utf-8;");
    } catch {
      setExportJsonError(
        safeT(t, "postprod.audit.export.error.jsonGeneric", "Impossible d'exporter l'historique complet (JSON).")
      );
    } finally {
      setExportJsonBusy(false);
    }
  }

  async function exportAllRowsNdjson() {
    if (typeof onExportAuditAllNdjson !== "function") return;
    setExportNdjsonError("");
    setExportNdjsonBusy(true);
    try {
      const rawQuery = String(query || "").trim();
      const result = await onExportAuditAllNdjson(
        buildExportQuery({ filters, actionFilter, scopeFilter, fromAtLocal, toAtLocal, query: rawQuery })
      );

      let ndjsonText = String(result?.ndjsonText || "");
      if (!ndjsonText) {
        const allRows = Array.isArray(result?.entries) ? result.entries : [];
        const search = rawQuery.toLowerCase();
        const searchedRows = allRows.filter((entry) => matchesAuditSearch(entry, search));
        ndjsonText = buildAuditNdjson(searchedRows);
      } else if (rawQuery) {
        const lines = ndjsonText
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean);
        const filteredLines = [];
        const search = rawQuery.toLowerCase();
        for (const line of lines) {
          try {
            const entry = JSON.parse(line);
            if (!matchesAuditSearch(entry, search)) continue;
            filteredLines.push(JSON.stringify(entry));
          } catch {
            // ignore malformed line
          }
        }
        ndjsonText = filteredLines.length > 0 ? `${filteredLines.join("\n")}\n` : "";
      }

      const stamp = createExportTimestamp();
      downloadTextBlob(ndjsonText, `ultiunreal-audit-all-${stamp}.ndjson`, "application/x-ndjson;charset=utf-8;");
    } catch {
      setExportNdjsonError(
        safeT(t, "postprod.audit.export.error.ndjsonGeneric", "Impossible d'exporter l'historique complet (NDJSON).")
      );
    } finally {
      setExportNdjsonBusy(false);
    }
  }

  function exportAllBySelectedFormat() {
    clearFullExportErrors();
    if (fullExportFormat === "json") return exportAllRowsJson();
    if (fullExportFormat === "ndjson") return exportAllRowsNdjson();
    return exportAllRowsCsv();
  }

  return {
    fullExportFormat,
    setFullExportFormat,
    anyFullExportBusy,
    anyFullExportError,
    exportLoadingLabel,
    exportCurrentRowsCsv,
    exportAllBySelectedFormat,
    clearFullExportErrors,
    setFullExportFormatDefault() {
      setFullExportFormat(DEFAULT_AUDIT_EXPORT_FORMAT);
    },
  };
}

export { useAuditExportController };
