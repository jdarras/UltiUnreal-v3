import { useEffect, useState } from "react";
import MultiSelectDropdown from "../../../../../components/MultiSelectDropdown";
import { formatDate, safeT, simplifyUnrealAssetDisplayName } from "../../../shared/helpers";
import { renderReviewStatusClassName } from "../../helpers";
import {
  toPositiveInt,
  firstNonEmptyString,
  firstPositiveInt,
} from "../../../../../utils/coerce";

const DESTINATION_DROPDOWN_STYLE = {
  flex: "none",
  minWidth: "220px",
  width: "100%",
  maxWidth: "360px",
};
const RENDER_DETAIL_SECTION_TITLE_STYLE = { margin: "0 0 8px 0" };
const RENDER_DETAIL_VALUE_WRAP_ANYWHERE_STYLE = { overflowWrap: "anywhere" };
const RENDER_DETAIL_REVIEW_SELECT_STYLE = { width: "100%" };
const RENDER_DETAIL_LINK_CURSOR_STYLE = { cursor: "pointer" };
const RENDER_DETAIL_MUTED_NOWRAP_STYLE = { whiteSpace: "nowrap" };
const RENDER_DETAIL_DESCRIPTION_STYLE = { whiteSpace: "pre-wrap", wordBreak: "break-word" };
const RENDER_DETAIL_SCHEDULE_EDIT_ROW_STYLE = { gap: "6px", alignItems: "center", flexWrap: "wrap" };
const RENDER_DETAIL_SCHEDULE_INPUT_STYLE = { height: "30px", fontSize: "0.9em" };
const RENDER_DETAIL_SCHEDULE_BUTTON_STYLE = { height: "30px", padding: "0 10px", fontSize: "0.85em" };
const RENDER_DETAIL_SCHEDULE_DISPLAY_STYLE = { padding: "2px 6px", fontSize: "0.9em", textAlign: "left" };

function normalizeProjectLookupKey(value = "") {
  return String(value || "").trim().toLowerCase();
}

function normalizeProjectNumericKey(value = "") {
  const raw = String(value || "").trim();
  if (!raw || !/^\d+$/.test(raw)) return "";
  return String(Math.trunc(Number(raw)));
}

function readProjectLabel(projectLabelByRef = new Map(), rawValue = "") {
  if (!(projectLabelByRef instanceof Map)) return "";
  const key = normalizeProjectLookupKey(rawValue);
  if (!key) return "";
  const direct = String(projectLabelByRef.get(key) || "").trim();
  if (direct) return direct;
  const numericKey = normalizeProjectNumericKey(rawValue);
  if (!numericKey) return "";
  return String(projectLabelByRef.get(numericKey) || "").trim();
}

function readProjectRefFromLabel(projectLabelByRef = new Map(), rawLabel = "") {
  if (!(projectLabelByRef instanceof Map)) return "";
  const normalizedLabel = normalizeProjectLookupKey(rawLabel);
  if (!normalizedLabel) return "";
  for (const [rawKey, rawValue] of projectLabelByRef.entries()) {
    const valueLabel = normalizeProjectLookupKey(rawValue);
    if (!valueLabel || valueLabel !== normalizedLabel) continue;
    const key = String(rawKey || "").trim();
    if (!key) continue;
    return normalizeProjectNumericKey(key) || key;
  }
  return "";
}

function resolveRenderPayload(render = null) {
  const payload = render?.payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return {};
  return payload;
}

function resolveProjectMeta(render = null, projectLabelByRef = new Map()) {
  const payload = resolveRenderPayload(render);
  const rawProjectRef = firstNonEmptyString([
    render?.projectId,
    render?.projectRef,
    payload?.projectId,
    payload?.projectRef,
  ]);
  const rawProjectName = firstNonEmptyString([
    render?.projectDisplayName,
    payload?.projectDisplayName,
    render?.projectTitle,
    payload?.projectTitle,
    render?.projectLabel,
    payload?.projectLabel,
    render?.projectName,
    payload?.projectName,
  ]);
  const fallbackProjectRef = firstNonEmptyString([
    normalizeProjectNumericKey(rawProjectName),
    readProjectRefFromLabel(projectLabelByRef, rawProjectName),
  ]);
  const projectRef = rawProjectRef || fallbackProjectRef;
  const projectName = firstNonEmptyString([
    readProjectLabel(projectLabelByRef, projectRef),
    readProjectLabel(projectLabelByRef, rawProjectName),
    rawProjectName,
    projectRef,
    "-",
  ]);
  const hasDistinctRef = !!(
    projectRef
    && projectName
    && normalizeProjectLookupKey(projectRef) !== normalizeProjectLookupKey(projectName)
  );
  return {
    projectRef,
    projectName,
    hasDistinctRef,
  };
}

function resolveTaskMeta(render = null, linkedTaskValue = null) {
  const payload = resolveRenderPayload(render);
  const taskIdRaw = Number(render?.linkedTaskId || payload?.taskId || 0);
  const taskId = Number.isFinite(taskIdRaw) && taskIdRaw > 0 ? Math.trunc(taskIdRaw) : 0;
  const taskTitle = firstNonEmptyString([
    render?.linkedTaskTitle,
    payload?.taskTitle,
  ]);
  const fallbackRaw = typeof linkedTaskValue === "function"
    ? String(linkedTaskValue(render) || "").trim()
    : "";
  const fallback = fallbackRaw.replace(/#(\d+)/g, "$1").trim();
  return {
    taskId,
    taskTitle: taskTitle || fallback || "-",
  };
}

function resolveLinkedTaskEntry(taskId = 0, tasks = []) {
  const normalizedTaskId = Number.isFinite(Number(taskId)) && Number(taskId) > 0
    ? Math.trunc(Number(taskId))
    : 0;
  if (normalizedTaskId <= 0) return null;
  const list = Array.isArray(tasks) ? tasks : [];
  return list.find((entry) => Number(entry?.id || 0) === normalizedTaskId) || null;
}

function resolveLinkedRenderFormEntry(formId = 0, renderForms = []) {
  const normalizedFormId = Number.isFinite(Number(formId)) && Number(formId) > 0
    ? Math.trunc(Number(formId))
    : 0;
  if (normalizedFormId <= 0) return null;
  const list = Array.isArray(renderForms) ? renderForms : [];
  return list.find((entry) => Number(entry?.id || 0) === normalizedFormId) || null;
}

function extractFormIdFromTemplateLike(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return 0;
  const match = /^form[\s\-_#]*(\d+)$/i.exec(raw);
  if (!match) return 0;
  return toPositiveInt(match[1]);
}

function resolveTaskDescription(render = null, taskId = 0, tasks = []) {
  const payload = resolveRenderPayload(render);
  const direct = firstNonEmptyString([
    render?.linkedTaskDescription,
    payload?.taskDescription,
    payload?.task_description,
    render?.taskDescription,
    payload?.description,
  ]);
  if (direct) return direct;
  const task = resolveLinkedTaskEntry(taskId, tasks);
  const fromTask = String(task?.description || "").trim();
  return fromTask || "-";
}

function resolveSequenceLabel(render = null) {
  const payload = resolveRenderPayload(render);
  const raw = firstNonEmptyString([
    render?.sequenceName,
    payload?.sequenceName,
    payload?.levelSequence,
    payload?.levelSequenceName,
  ]);
  const simplified = simplifyUnrealAssetDisplayName(raw);
  return simplified || raw || "-";
}

function resolveFormMeta(render = null, linkedTask = null, renderForms = []) {
  const payload = resolveRenderPayload(render);
  const taskAutoConfig = linkedTask?.autoRenderConfig
    && typeof linkedTask.autoRenderConfig === "object"
    && !Array.isArray(linkedTask.autoRenderConfig)
    ? linkedTask.autoRenderConfig
    : {};
  const taskAutoPayload = taskAutoConfig?.payload
    && typeof taskAutoConfig.payload === "object"
    && !Array.isArray(taskAutoConfig.payload)
    ? taskAutoConfig.payload
    : {};
  const formId = firstPositiveInt([
    render?.formId,
    render?.renderFormId,
    render?.formRef,
    render?.renderFormRef,
    payload?.formId,
    payload?.renderFormId,
    payload?.formRef,
    payload?.renderFormRef,
    taskAutoConfig?.formId,
    taskAutoConfig?.renderFormId,
    taskAutoConfig?.formRef,
    taskAutoPayload?.formId,
    taskAutoPayload?.renderFormId,
    taskAutoPayload?.formRef,
    linkedTask?.formId,
    linkedTask?.renderFormId,
    extractFormIdFromTemplateLike(render?.templateName),
    extractFormIdFromTemplateLike(payload?.templateName),
  ]);
  const formEntry = resolveLinkedRenderFormEntry(formId, renderForms);
  const formName = firstNonEmptyString([
    render?.formName,
    render?.renderFormName,
    payload?.formName,
    payload?.renderFormName,
    payload?.formLabel,
    taskAutoConfig?.formName,
    taskAutoConfig?.renderFormName,
    taskAutoConfig?.formLabel,
    taskAutoPayload?.formName,
    taskAutoPayload?.renderFormName,
    taskAutoPayload?.formLabel,
    linkedTask?.formName,
    linkedTask?.renderFormName,
    linkedTask?.formLabel,
    formEntry?.name,
    formEntry?.label,
  ]);
  return {
    formId,
    formName,
  };
}

function resolveLinkedTaskAutoConfig(linkedTask = null) {
  if (!linkedTask || typeof linkedTask !== "object" || Array.isArray(linkedTask)) return {};
  const config = linkedTask.autoRenderConfig;
  if (!config || typeof config !== "object" || Array.isArray(config)) return {};
  return config;
}

function resolveLinkedTaskAutoPayload(taskAutoConfig = {}) {
  const payload = taskAutoConfig?.payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return {};
  return payload;
}

function resolveRenderFormData(render = null, linkedTask = null) {
  const payload = resolveRenderPayload(render);
  const taskAutoConfig = resolveLinkedTaskAutoConfig(linkedTask);
  const taskAutoPayload = resolveLinkedTaskAutoPayload(taskAutoConfig);
  const candidates = [
    payload?.formData,
    render?.formData,
    taskAutoConfig?.formData,
    taskAutoPayload?.formData,
    linkedTask?.formData,
  ];
  for (const entry of candidates) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    return entry;
  }
  return {};
}

function normalizeRenderFormFields(fields = []) {
  const list = Array.isArray(fields) ? fields : [];
  return list
    .filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry))
    .map((entry, index) => {
      const fieldKey = String(entry?.fieldKey || "").trim();
      const fieldLabel = String(entry?.fieldLabel || entry?.label || fieldKey || "").trim();
      const sortOrderRaw = Number(entry?.sortOrder);
      const sortOrder = Number.isFinite(sortOrderRaw) ? Math.trunc(sortOrderRaw) : index;
      return {
        fieldKey,
        fieldLabel: fieldLabel || fieldKey || "-",
        sortOrder,
      };
    })
    .filter((entry) => !!entry.fieldKey)
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return String(a.fieldLabel || "").localeCompare(String(b.fieldLabel || ""));
    });
}

function resolveRenderableFormRows(formData = {}, formFields = []) {
  const values = formData && typeof formData === "object" && !Array.isArray(formData)
    ? formData
    : {};
  const normalizedFields = normalizeRenderFormFields(formFields);
  if (normalizedFields.length > 0) {
    return normalizedFields.map((entry) => ({
      key: entry.fieldKey,
      label: entry.fieldLabel,
      value: Object.prototype.hasOwnProperty.call(values, entry.fieldKey)
        ? values[entry.fieldKey]
        : "",
    }));
  }
  const fallbackKeys = Object.keys(values).sort((a, b) => String(a || "").localeCompare(String(b || "")));
  return fallbackKeys.map((key) => ({
    key,
    label: String(key || "").trim() || "-",
    value: values[key],
  }));
}

function formatFormFieldValue(value, t) {
  if (value == null) return "—";
  if (typeof value === "boolean") {
    return value
      ? safeT(t, "common.yes", "Oui")
      : safeT(t, "common.no", "Non");
  }
  if (Array.isArray(value)) {
    if (value.length <= 0) return "—";
    return value
      .map((entry) => String(entry ?? "").trim())
      .filter(Boolean)
      .join(", ") || "—";
  }
  if (typeof value === "object") {
    try {
      const serialized = JSON.stringify(value, null, 2);
      return serialized && serialized.trim() ? serialized : "—";
    } catch {
      return String(value);
    }
  }
  const text = String(value).trim();
  return text || "—";
}

function resolveRenderPresetLabel(render = null, linkedTask = null) {
  const payload = resolveRenderPayload(render);
  const taskAutoConfig = linkedTask?.autoRenderConfig
    && typeof linkedTask.autoRenderConfig === "object"
    && !Array.isArray(linkedTask.autoRenderConfig)
    ? linkedTask.autoRenderConfig
    : {};
  const taskAutoPayload = taskAutoConfig?.payload
    && typeof taskAutoConfig.payload === "object"
    && !Array.isArray(taskAutoConfig.payload)
    ? taskAutoConfig.payload
    : {};

  const explicitPreset = firstNonEmptyString([
    render?.presetName,
    payload?.presetName,
    payload?.renderModeName,
    render?.renderModeName,
    taskAutoConfig?.presetName,
    taskAutoConfig?.renderModeName,
    taskAutoPayload?.presetName,
    taskAutoPayload?.renderModeName,
  ]);
  if (explicitPreset) {
    return simplifyUnrealAssetDisplayName(explicitPreset) || explicitPreset;
  }

  const presetPathLike = firstNonEmptyString([
    render?.presetPath,
    payload?.presetPath,
    payload?.preset_path,
    taskAutoConfig?.presetPath,
    taskAutoConfig?.preset_path,
    taskAutoPayload?.presetPath,
    taskAutoPayload?.preset_path,
    render?.outputProfile,
    payload?.outputProfile,
    taskAutoConfig?.outputProfile,
    taskAutoPayload?.outputProfile,
  ]);
  const simplified = simplifyUnrealAssetDisplayName(presetPathLike);
  return simplified || presetPathLike || "-";
}

function resolveStationLabel(render = null) {
  const payload = resolveRenderPayload(render);
  const requesterName = firstNonEmptyString([
    render?.requestedByUsername,
    payload?.requestedByUsername,
  ]).toLowerCase();
  const sanitizeStationName = (value = "") => {
    const normalized = String(value || "").trim();
    if (!normalized) return "";
    const lower = normalized.toLowerCase();
    if (lower === "local" || lower === "localhost" || lower === "station locale") return "";
    if (requesterName && lower === requesterName) return "";
    if (lower.startsWith("user:")) return "";
    return normalized;
  };
  const named = firstNonEmptyString([
    render?.stationName,
    render?.renderStationName,
    payload?.stationName,
  ]);
  const sanitizedNamed = sanitizeStationName(named);
  if (sanitizedNamed) return sanitizedNamed;
  const rawFallback = firstNonEmptyString([
    render?.assignedWorkerKey,
    render?.stationKey,
    render?.renderStation,
  ]);
  const sanitizedFallback = sanitizeStationName(rawFallback);
  if (!sanitizedFallback) return "-";
  return sanitizedFallback;
}

function formatIdTag(value = "", minDigits = 4) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^\d+$/.test(raw)) return `#${raw.padStart(minDigits, "0")}`;
  return `#${raw}`;
}

function normalizeExportDestinationOptions(options = []) {
  const source = Array.isArray(options) ? options : [];
  const out = [];
  const seen = new Set();
  for (const entry of source) {
    const rawValue = entry?.value ?? entry?.id ?? "";
    const value = String(rawValue || "").trim().toLowerCase();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    const label = String(entry?.label || entry?.name || rawValue || "").trim();
    out.push({
      value,
      label: label || value,
    });
  }
  return out;
}

function normalizeExportDestinationValues(values = []) {
  const source = Array.isArray(values) ? values : [values];
  const out = [];
  const seen = new Set();
  for (const rawValue of source) {
    const value = String(rawValue || "").trim().toLowerCase();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function resolveRenderExportDestinationIds(render = null, linkedTask = null) {
  const payload = resolveRenderPayload(render);
  const hasPayloadDestinationIds = Object.prototype.hasOwnProperty.call(payload, "exportDestinationIds");
  if (hasPayloadDestinationIds) {
    return normalizeExportDestinationValues(payload?.exportDestinationIds);
  }
  const hasPayloadLegacyDestinationIds = Object.prototype.hasOwnProperty.call(payload, "destinationIds");
  if (hasPayloadLegacyDestinationIds) {
    return normalizeExportDestinationValues(payload?.destinationIds);
  }
  const taskAutoConfig = linkedTask?.autoRenderConfig
    && typeof linkedTask.autoRenderConfig === "object"
    && !Array.isArray(linkedTask.autoRenderConfig)
    ? linkedTask.autoRenderConfig
    : {};
  const taskAutoPayload = taskAutoConfig?.payload
    && typeof taskAutoConfig.payload === "object"
    && !Array.isArray(taskAutoConfig.payload)
    ? taskAutoConfig.payload
    : {};
  const candidates = [
    render?.exportDestinationIds,
    render?.destinationIds,
    taskAutoConfig?.exportDestinationIds,
    taskAutoPayload?.exportDestinationIds,
  ];
  for (const candidate of candidates) {
    const normalized = normalizeExportDestinationValues(candidate);
    if (normalized.length > 0) return normalized;
  }
  return [];
}

function DetailInfoRow({
  label = "",
  className = "",
  children = null,
}) {
  return (
    <div className={`uu-render-detail-info-field ${className}`.trim()}>
      <div className="uu-render-detail-info-row">
        <span className="uu-render-detail-info-label">{label}</span>
        <div className="uu-render-detail-info-value">{children}</div>
      </div>
    </div>
  );
}

function nowDatetimeLocalValue() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function toDatetimeLocalValue(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function RenderDetailInfoPanel({
  t,
  render = null,
  renderOutputName = "-",
  linkedTaskValue = null,
  reviewStatusValue = "to_validate",
  reviewFlow = [],
  reviewStatusLabel = null,
  canReviewRenders = false,
  rendersLoading = false,
  busyRenderId = 0,
  onApplyReviewStatus = null,
  onScheduleRender = null,
  projectLabelByRef = new Map(),
  onNavigateToProject = null,
  onNavigateToRenderForm = null,
  onRequestOpenRenderEditor = null,
  tasks = [],
  renderForms = [],
  onLoadRenderFormFields = null,
  renderExportDestinationOptions = [],
  onUpdateRenderExportDestinations = null,
} = {}) {
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [scheduleValue, setScheduleValue] = useState("");
  const [destinationValues, setDestinationValues] = useState([]);
  const [savingDestinations, setSavingDestinations] = useState(false);
  const [renderFormFields, setRenderFormFields] = useState([]);
  const [renderFormFieldsLoading, setRenderFormFieldsLoading] = useState(false);
  const [renderFormFieldsError, setRenderFormFieldsError] = useState("");

  const renderId = Number(render?.id || 0);
  const reviewItems = Array.isArray(reviewFlow) ? reviewFlow : [];
  const isQueued = String(render?.status || "") === "Queued";
  const scheduledAt = render?.scheduledAt || null;
  const minDatetimeLocal = nowDatetimeLocalValue();
  const projectMeta = resolveProjectMeta(render, projectLabelByRef);
  const taskMeta = resolveTaskMeta(render, linkedTaskValue);
  const linkedTask = resolveLinkedTaskEntry(taskMeta.taskId, tasks);
  const taskDescription = resolveTaskDescription(render, taskMeta.taskId, tasks);
  const renderFormData = resolveRenderFormData(render, linkedTask);
  const resolvedDestinationValues = resolveRenderExportDestinationIds(render, linkedTask);
  const normalizedDestinationOptions = normalizeExportDestinationOptions(renderExportDestinationOptions);
  const resolvedDestinationKey = resolvedDestinationValues.join("|");
  const sequenceLabel = resolveSequenceLabel(render);
  const formMeta = resolveFormMeta(render, linkedTask, renderForms);
  const renderPresetLabel = resolveRenderPresetLabel(render, linkedTask);
  const stationLabel = resolveStationLabel(render);
  const canOpenProjectLink = typeof onNavigateToProject === "function" && !!projectMeta.projectRef;
  const canOpenTaskLink = typeof onRequestOpenRenderEditor === "function" && taskMeta.taskId > 0;
  const canOpenFormLink = typeof onNavigateToRenderForm === "function" && formMeta.formId > 0;
  const projectIdTag = formatIdTag(projectMeta.projectRef, 4);
  const taskIdTag = taskMeta.taskId > 0 ? formatIdTag(taskMeta.taskId, 4) : "";
  const formIdTag = formMeta.formId > 0 ? formatIdTag(formMeta.formId, 4) : "";
  const hasFormName = Boolean(String(formMeta.formName || "").trim());
  const hasFormData = Object.keys(renderFormData).length > 0;
  const formRows = resolveRenderableFormRows(renderFormData, renderFormFields);
  const hasRenderableFormBlock = hasFormName || !!formIdTag || hasFormData || renderFormFieldsLoading || !!renderFormFieldsError;
  const formBlockTitle = (() => {
    const name = String(formMeta.formName || "").trim();
    if (name && formIdTag) return `Formulaire ${name} ${formIdTag}`;
    if (name) return `Formulaire ${name}`;
    if (formIdTag) return `Formulaire ${formIdTag}`;
    return "Formulaire";
  })();
  const canEditExportDestinations = (
    typeof onUpdateRenderExportDestinations === "function"
    && !rendersLoading
    && !savingDestinations
    && busyRenderId !== renderId
  );

  useEffect(() => {
    setDestinationValues(resolvedDestinationValues);
    setSavingDestinations(false);
  }, [renderId, resolvedDestinationKey]);

  useEffect(() => {
    const formId = Number(formMeta.formId || 0);
    if (!Number.isFinite(formId) || formId <= 0 || typeof onLoadRenderFormFields !== "function") {
      setRenderFormFields([]);
      setRenderFormFieldsLoading(false);
      setRenderFormFieldsError("");
      return;
    }
    let cancelled = false;
    setRenderFormFieldsLoading(true);
    setRenderFormFieldsError("");
    (async () => {
      try {
        const loaded = await Promise.resolve(onLoadRenderFormFields(Math.trunc(formId)));
        if (cancelled) return;
        setRenderFormFields(Array.isArray(loaded) ? loaded : []);
      } catch (error) {
        if (cancelled) return;
        setRenderFormFields([]);
        setRenderFormFieldsError(String(
          error?.message
          || safeT(t, "postprod.renders.detail.formData.error", "Impossible de charger les champs du formulaire.")
        ));
      } finally {
        if (!cancelled) setRenderFormFieldsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [formMeta.formId, onLoadRenderFormFields, t]);

  if (!render) return null;

  const handleOpenProject = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!canOpenProjectLink) return;
    onNavigateToProject?.(projectMeta.projectRef);
  };

  const handleOpenTask = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!canOpenTaskLink) return;
    onRequestOpenRenderEditor?.({
      type: "render",
      action: "edit",
      ref: String(taskMeta.taskId),
      task: null,
    });
  };

  const handleOpenForm = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!canOpenFormLink) return;
    onNavigateToRenderForm?.({ id: formMeta.formId, name: formMeta.formName || "" });
  };

  const handleInlineLinkKeyDown = (event, handler) => {
    if (event?.key !== "Enter" && event?.key !== " ") return;
    event.preventDefault();
    handler?.(event);
  };

  const handleStartEditSchedule = () => {
    setScheduleValue(toDatetimeLocalValue(scheduledAt));
    setEditingSchedule(true);
  };

  const handleSaveSchedule = async () => {
    if (typeof onScheduleRender !== "function") { setEditingSchedule(false); return; }
    let resolvedScheduledAt = null;
    if (scheduleValue) {
      const d = new Date(scheduleValue);
      if (!isNaN(d.getTime()) && d.getTime() > Date.now()) {
        resolvedScheduledAt = d.toISOString();
      }
    }
    await onScheduleRender(renderId, resolvedScheduledAt);
    setEditingSchedule(false);
  };

  const handleCancelSchedule = () => {
    setEditingSchedule(false);
  };

  const handleScheduleKeyDown = (e) => {
    if (e.key === "Enter") handleSaveSchedule();
    if (e.key === "Escape") handleCancelSchedule();
  };

  const handleChangeExportDestinations = async (nextValues = []) => {
    if (!canEditExportDestinations) return;
    const normalized = normalizeExportDestinationValues(nextValues);
    setDestinationValues(normalized);
    if (renderId <= 0) return;
    setSavingDestinations(true);
    try {
      await onUpdateRenderExportDestinations(renderId, normalized, render);
    } finally {
      setSavingDestinations(false);
    }
  };

  return (
    <>
      <section className="uu-render-detail-info-block">
        <h4 className="uu-h3 uu-block-title" style={RENDER_DETAIL_SECTION_TITLE_STYLE}>
          {safeT(t, "postprod.renders.detail.infoTitle", "Informations")}
        </h4>
        <div className="uu-render-detail-info-grid">
        <DetailInfoRow label={safeT(t, "postprod.renders.table.file", "Fichier")}>
          <span className="uu-render-detail-info-value-text" style={RENDER_DETAIL_VALUE_WRAP_ANYWHERE_STYLE}>{renderOutputName}</span>
        </DetailInfoRow>
        <DetailInfoRow label={safeT(t, "postprod.renders.table.reviewStatus", "Validation")}>
          <select
            className={`uu-input uu-status-select ${renderReviewStatusClassName(reviewStatusValue)}`}
            style={RENDER_DETAIL_REVIEW_SELECT_STYLE}
            value={reviewStatusValue}
            disabled={
              rendersLoading
              || busyRenderId === renderId
              || typeof onApplyReviewStatus !== "function"
              || !canReviewRenders
            }
            onChange={async (e) => {
              const next = String(e.target.value || "").trim();
              if (!next) return;
              await onApplyReviewStatus?.(render, next);
            }}
          >
            {reviewItems.map((entry) => (
              <option key={`render-review-detail-${entry}`} value={entry}>
                {typeof reviewStatusLabel === "function" ? reviewStatusLabel(t, entry) : entry}
              </option>
            ))}
          </select>
        </DetailInfoRow>

        <DetailInfoRow label={safeT(t, "postprod.renders.table.project", "Projet")}>
          <span className="uu-render-detail-inline-with-id">
            {canOpenProjectLink ? (
              <span
                role="button"
                tabIndex={0}
                className="uu-render-detail-info-value-text uu-render-detail-inline-link"
                onClick={handleOpenProject}
                onKeyDown={(event) => handleInlineLinkKeyDown(event, handleOpenProject)}
                style={RENDER_DETAIL_LINK_CURSOR_STYLE}
              >
                {projectMeta.projectName || projectMeta.projectRef || "-"}
              </span>
            ) : (
              <span className="uu-render-detail-info-value-text">{projectMeta.projectName || projectMeta.projectRef || "-"}</span>
            )}
            {projectIdTag ? (
              <span className="uu-muted" style={RENDER_DETAIL_MUTED_NOWRAP_STYLE}>
                {projectIdTag}
              </span>
            ) : null}
          </span>
        </DetailInfoRow>
        <DetailInfoRow label={safeT(t, "postprod.renders.table.linkedTask", "Tâche")}>
          {canOpenTaskLink ? (
            <span
              role="button"
              tabIndex={0}
              className="uu-render-detail-info-value-text uu-render-detail-inline-link"
              onClick={handleOpenTask}
              onKeyDown={(event) => handleInlineLinkKeyDown(event, handleOpenTask)}
              style={RENDER_DETAIL_LINK_CURSOR_STYLE}
            >
              {taskMeta.taskTitle || "-"}
            </span>
          ) : (
            <span className="uu-render-detail-info-value-text">{taskMeta.taskTitle || "-"}</span>
          )}
          {taskIdTag ? (
            <>
              <span className="uu-muted" style={RENDER_DETAIL_MUTED_NOWRAP_STYLE}>
                {taskIdTag}
              </span>
            </>
          ) : null}
        </DetailInfoRow>
        <DetailInfoRow label={safeT(t, "postprod.tasks.form.description", "Description")} className="uu-render-detail-info-field-full">
          <span className="uu-render-detail-info-value-text" style={RENDER_DETAIL_DESCRIPTION_STYLE}>
            {taskDescription}
          </span>
        </DetailInfoRow>

        <DetailInfoRow label={safeT(t, "postprod.renders.detail.form", "Formulaire")}>
          <span className="uu-render-detail-inline-with-id">
            {canOpenFormLink && hasFormName ? (
              <span
                role="button"
                tabIndex={0}
                className="uu-render-detail-info-value-text uu-render-detail-inline-link"
                onClick={handleOpenForm}
                onKeyDown={(event) => handleInlineLinkKeyDown(event, handleOpenForm)}
                style={RENDER_DETAIL_LINK_CURSOR_STYLE}
              >
                {formMeta.formName}
              </span>
            ) : (
              hasFormName
                ? <span className="uu-render-detail-info-value-text">{formMeta.formName}</span>
                : null
            )}
            {formIdTag ? (
              <span className="uu-muted" style={RENDER_DETAIL_MUTED_NOWRAP_STYLE}>
                {formIdTag}
              </span>
            ) : null}
            {!hasFormName && !formIdTag ? (
              <span className="uu-render-detail-info-value-text">-</span>
            ) : null}
          </span>
        </DetailInfoRow>

        <DetailInfoRow label={safeT(t, "postprod.renders.table.requester", "Demandeur")}>
          <span className="uu-render-detail-info-value-text">{String(render?.requestedByUsername || "-")}</span>
        </DetailInfoRow>

        <DetailInfoRow label={safeT(t, "postprod.renders.detail.levelSequence", "Level Sequence")}>
          <span className="uu-render-detail-info-value-text">{sequenceLabel}</span>
        </DetailInfoRow>

        <DetailInfoRow label={safeT(t, "postprod.tasks.form.renderPreset", "Preset de rendu")}>
          <span className="uu-render-detail-info-value-text">{renderPresetLabel}</span>
        </DetailInfoRow>

        <DetailInfoRow label={safeT(t, "postprod.renders.table.worker", "Station de rendu")}>
          <span className="uu-render-detail-info-value-text">{stationLabel}</span>
        </DetailInfoRow>

        <DetailInfoRow label={safeT(t, "postprod.renders.table.updated", "Mise à Jour")}>
          <span className="uu-render-detail-info-value-text">{formatDate(render?.updatedAt)}</span>
        </DetailInfoRow>

        <DetailInfoRow label={safeT(t, "postprod.tasks.form.exportDestinations", "Destination")}>
          <div className="uu-render-detail-info-value-block">
            <MultiSelectDropdown
              options={normalizedDestinationOptions}
              values={destinationValues}
              onChange={handleChangeExportDestinations}
              placeholder={safeT(
                t,
                "postprod.tasks.form.exportDestinations.placeholder",
                "Sélectionner une ou plusieurs destinations"
              )}
              noneLabel={safeT(t, "postprod.tasks.form.exportDestinations.none", "Aucune destination")}
              style={DESTINATION_DROPDOWN_STYLE}
            />
            {normalizedDestinationOptions.length <= 0 ? (
              <div className="uu-muted mt-8">
                {safeT(
                  t,
                  "postprod.tasks.form.exportDestinations.empty",
                  "Aucune destination configurée. Configurez-les dans la page Configuration."
                )}
              </div>
            ) : null}
          </div>
        </DetailInfoRow>

          {isQueued ? (
            <DetailInfoRow label={safeT(t, "postprod.renders.scheduledAt.label", "Date et heure de début")}>
              <div className="uu-render-detail-info-value-block">
                {editingSchedule ? (
                  <div className="uu-row" style={RENDER_DETAIL_SCHEDULE_EDIT_ROW_STYLE}>
                    <input
                      type="datetime-local"
                      className="uu-input"
                      style={RENDER_DETAIL_SCHEDULE_INPUT_STYLE}
                      min={minDatetimeLocal}
                      value={scheduleValue}
                      autoFocus
                      disabled={rendersLoading}
                      onChange={(e) => setScheduleValue(e.target.value)}
                      onKeyDown={handleScheduleKeyDown}
                      onBlur={handleSaveSchedule}
                    />
                    <button
                      className="uu-btn"
                      type="button"
                      style={RENDER_DETAIL_SCHEDULE_BUTTON_STYLE}
                      onMouseDown={(e) => { e.preventDefault(); handleSaveSchedule(); }}
                    >
                      {safeT(t, "postprod.renders.queue.jobs.save", "Valider")}
                    </button>
                    <button
                      className="uu-btn-ghost"
                      type="button"
                      style={RENDER_DETAIL_SCHEDULE_BUTTON_STYLE}
                      onMouseDown={(e) => { e.preventDefault(); handleCancelSchedule(); }}
                    >
                      {safeT(t, "postprod.renders.queue.jobs.cancel", "Annuler")}
                    </button>
                  </div>
                ) : (
                  <button
                    className="uu-btn-ghost"
                    type="button"
                    style={RENDER_DETAIL_SCHEDULE_DISPLAY_STYLE}
                    disabled={!isQueued || typeof onScheduleRender !== "function"}
                    onClick={handleStartEditSchedule}
                  >
                    {scheduledAt
                      ? formatDate(scheduledAt)
                      : <span className="uu-muted">{safeT(t, "postprod.renders.queue.immediate", "Immédiat")}</span>
                    }
                  </button>
                )}
              </div>
            </DetailInfoRow>
          ) : null}
        </div>
      </section>
      {hasRenderableFormBlock ? (
        <section className="uu-render-detail-formdata-panel">
          <h4 className="uu-h3 uu-block-title" style={RENDER_DETAIL_SECTION_TITLE_STYLE}>
            {formBlockTitle}
          </h4>
          {renderFormFieldsLoading ? (
            <div className="uu-muted">
              {safeT(t, "postprod.renders.detail.formData.loading", "Chargement du formulaire...")}
            </div>
          ) : null}
          {!renderFormFieldsLoading && renderFormFieldsError ? (
            <div className="uu-msg warn">{renderFormFieldsError}</div>
          ) : null}
          {!renderFormFieldsLoading && !renderFormFieldsError && formRows.length <= 0 ? (
            <div className="uu-muted">
              {safeT(t, "postprod.renders.detail.formData.empty", "Aucune donnée de formulaire.")}
            </div>
          ) : null}
          {!renderFormFieldsLoading && !renderFormFieldsError && formRows.length > 0 ? (
            <div className="uu-render-detail-formdata-grid">
              {formRows.map((entry) => (
                <div key={`render-form-data-row-${entry.key}`} className="uu-render-detail-formdata-row">
                  <div className="uu-render-detail-formdata-label">{entry.label}</div>
                  <div className="uu-render-detail-formdata-value">{formatFormFieldValue(entry.value, t)}</div>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </>
  );
}

export { RenderDetailInfoPanel };
