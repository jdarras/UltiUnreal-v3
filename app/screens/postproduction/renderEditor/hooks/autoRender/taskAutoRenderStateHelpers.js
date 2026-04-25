import { normalizeTaskExpectedRenderCountInput } from "../../helpers";
import {
  resolveAutoRenderConfig,
  resolveAutoRenderPayload,
  resolveAutoRenderTargetWorkerKey,
} from "../../../shared/autoRenderHelpers";

export const DEFAULT_AUTO_RENDER_STATE = Object.freeze({
  expectedRenderCountInput: "1",
  autoRenderProjectRef: "",
  autoRenderWorkerKey: "auto",
  autoRenderFormId: "",
  autoRenderTemplateId: "",
  autoRenderFormValues: {},
  autoRenderLaunchMode: "",
  autoRenderScheduledMode: "",
  autoRenderScheduledAt: "",
  taskSequenceName: "",
  autoRenderOffscreen: false,
  autoRenderExportDestinationIds: [],
});

function toTrimmedString(value = "") {
  return String(value || "").trim();
}

function firstNonEmptyString(values = []) {
  const list = Array.isArray(values) ? values : [];
  for (const value of list) {
    const normalized = toTrimmedString(value);
    if (normalized) return normalized;
  }
  return "";
}

function toPositiveInt(value = 0) {
  if (Number.isFinite(Number(value)) && Number(value) > 0) return Math.trunc(Number(value));
  const raw = toTrimmedString(value);
  if (!raw) return 0;
  if (/^\#?\d+$/.test(raw)) return Math.trunc(Number(raw.replace(/^#/, "")));
  return 0;
}

function firstPositiveInt(values = []) {
  const list = Array.isArray(values) ? values : [];
  for (const value of list) {
    const normalized = toPositiveInt(value);
    if (normalized > 0) return normalized;
  }
  return 0;
}

function extractFormIdFromTemplateLike(value = "") {
  const raw = toTrimmedString(value);
  if (!raw) return 0;
  const match = /^form[\s\-_#]*(\d+)$/i.exec(raw);
  if (!match) return 0;
  return toPositiveInt(match[1]);
}

function normalizeTemplateLookupToken(value = "") {
  const raw = toTrimmedString(value);
  if (!raw) return "";
  return raw.replace(/\\/g, "/").toLowerCase();
}

function normalizeLaunchMode(value = "") {
  const normalized = toTrimmedString(value).toLowerCase();
  if (normalized === "now" || normalized === "scheduled") return normalized;
  return "";
}

function normalizeScheduledMode(value = "") {
  const normalized = toTrimmedString(value).toLowerCase();
  if (normalized === "datetime" || normalized === "any_station" || normalized === "specific_station") {
    return normalized;
  }
  return "";
}

function toScheduleTimestamp(value = "") {
  const raw = toTrimmedString(value);
  if (!raw) return 0;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function normalizeExportDestinationIds(value) {
  const src = Array.isArray(value)
    ? value
    : (typeof value === "string" ? value.split(/[,\r\n;]+/g) : []);
  const out = [];
  const seen = new Set();
  for (const raw of src) {
    const id = String(raw || "").trim().toLowerCase();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function findMatchedRenderTemplate({
  normalizedRenderTemplateOptions = [],
  taskProjectRef = "",
  taskTemplateName = "",
  taskOutputProfile = "",
  taskPresetName = "",
  templateSelectionToken = "",
} = {}) {
  const list = Array.isArray(normalizedRenderTemplateOptions)
    ? normalizedRenderTemplateOptions
    : [];
  if (list.length <= 0) return null;
  const outputToken = normalizeTemplateLookupToken(taskOutputProfile);
  const presetToken = normalizeTemplateLookupToken(taskPresetName);
  const selectionToken = normalizeTemplateLookupToken(templateSelectionToken);
  const templateToken = normalizeTemplateLookupToken(taskTemplateName);

  const matchesEntry = (entry, strictProject = true) => {
    const entryProject = String(entry?.projectName || "").trim().toLowerCase();
    if (strictProject && taskProjectRef && entryProject && entryProject !== taskProjectRef) return false;
    const entryTemplate = String(entry?.templateName || "").trim().toLowerCase();
    const entryOutput = normalizeTemplateLookupToken(entry?.outputProfile);
    const entryPreset = String(entry?.presetName || "").trim().toLowerCase();
    const entryLabel = String(entry?.label || "").trim().toLowerCase();
    const entryKey = normalizeTemplateLookupToken(entry?.key);
    if (templateToken && entryTemplate && entryTemplate === templateToken) return true;
    if (outputToken && entryOutput && entryOutput === outputToken) return true;
    if (presetToken && entryPreset && entryPreset === presetToken) return true;
    if (
      selectionToken
      && (
        selectionToken === entryOutput
        || selectionToken === entryTemplate
        || selectionToken === entryPreset
        || selectionToken === entryLabel
        || selectionToken === entryKey
      )
    ) {
      return true;
    }
    return false;
  };

  const strictMatch = list.find((entry) => matchesEntry(entry, true)) || null;
  if (strictMatch) return strictMatch;
  if (!templateToken && !outputToken && !presetToken && !selectionToken) return null;
  return list.find((entry) => matchesEntry(entry, false)) || null;
}

export function buildHydratedAutoRenderState(task, normalizedRenderTemplateOptions = []) {
  const autoConfig = resolveAutoRenderConfig(task) || {};
  const autoPayload = resolveAutoRenderPayload(task) || {};
  const autoPayloadExecution = autoPayload?.execution && typeof autoPayload.execution === "object" && !Array.isArray(autoPayload.execution)
    ? autoPayload.execution
    : null;
  const autoRenderOffscreen = (
    autoConfig?.renderOffscreen === true
      ? true
      : (
        autoPayload?.renderOffscreen === true
          ? true
          : autoPayloadExecution?.renderOffscreen === true
      )
  ) === true;
  const autoRenderExportDestinationIds = normalizeExportDestinationIds(
    autoConfig?.exportDestinationIds
    || autoPayload?.exportDestinationIds
    || []
  );

  const taskProjectRef = String(
    autoConfig?.projectName
    || (Array.isArray(task?.projectRefs) ? task.projectRefs[0] : "")
    || ""
  ).trim().toLowerCase();

  const taskTemplateNameRaw = firstNonEmptyString([
    autoConfig?.templateName
    || autoPayload?.templateName,
  ]);
  const taskTemplateName = taskTemplateNameRaw.toLowerCase();

  const taskOutputProfileRaw = firstNonEmptyString([
    autoConfig?.outputProfile
    || autoPayload?.outputProfile,
  ]);
  const taskOutputProfile = taskOutputProfileRaw.toLowerCase();
  const taskPresetNameRaw = firstNonEmptyString([
    autoConfig?.presetName,
    autoPayload?.presetName,
  ]);
  const taskPresetName = taskPresetNameRaw.toLowerCase();
  const templateSelectionToken = firstNonEmptyString([
    autoConfig?.templateKey,
    autoPayload?.templateKey,
    taskOutputProfileRaw,
    autoConfig?.presetPath,
    autoPayload?.presetPath,
    taskPresetNameRaw,
    autoConfig?.renderModeName,
    autoPayload?.renderModeName,
    taskTemplateNameRaw,
  ]);

  const matchedRenderTemplate = findMatchedRenderTemplate({
    normalizedRenderTemplateOptions,
    taskProjectRef,
    taskTemplateName,
    taskOutputProfile,
    taskPresetName,
    templateSelectionToken,
  });

  const formIdRaw = firstPositiveInt([
    autoConfig?.formId
    || autoConfig?.renderFormId
    || autoConfig?.formRef
    || autoConfig?.renderFormRef,
    autoPayload?.formId,
    autoPayload?.renderFormId,
    autoPayload?.formRef,
    autoPayload?.renderFormRef,
    extractFormIdFromTemplateLike(autoConfig?.templateName),
    extractFormIdFromTemplateLike(autoPayload?.templateName),
    extractFormIdFromTemplateLike(autoConfig?.renderModeName),
    extractFormIdFromTemplateLike(autoPayload?.renderModeName),
  ]);

  const formData = autoConfig?.formData && typeof autoConfig.formData === "object" && !Array.isArray(autoConfig.formData)
    ? autoConfig.formData
    : (
      autoPayload?.formData && typeof autoPayload.formData === "object" && !Array.isArray(autoPayload.formData)
        ? autoPayload.formData
        : {}
    );

  const rawWorkerKey = resolveAutoRenderTargetWorkerKey(task);
  const workerKey = rawWorkerKey === "local" ? "auto" : (rawWorkerKey || "auto");
  const explicitLaunchMode = normalizeLaunchMode(firstNonEmptyString([
    autoConfig?.launchMode,
    autoPayload?.launchMode,
    task?.launchMode,
  ]));
  const explicitScheduledMode = normalizeScheduledMode(firstNonEmptyString([
    autoConfig?.scheduledMode,
    autoPayload?.scheduledMode,
    task?.scheduledMode,
  ]));
  const scheduledAtRaw = firstNonEmptyString([
    autoConfig?.scheduledAt,
    autoPayload?.scheduledAt,
    task?.scheduledAt,
  ]);
  const scheduledAtMs = toScheduleTimestamp(scheduledAtRaw);
  const inferredScheduledMode = (
    explicitScheduledMode
    || (scheduledAtMs > 0 ? "datetime" : (
      !workerKey || workerKey === "auto"
        ? "any_station"
        : "specific_station"
    ))
  );
  const launchMode = explicitLaunchMode || "scheduled";
  const scheduledMode = launchMode === "scheduled" ? inferredScheduledMode : "";
  const scheduledAt = (
    launchMode === "scheduled" && scheduledMode === "datetime" && scheduledAtMs > 0
  )
    ? scheduledAtRaw
    : "";

  const fallbackTemplateToken = normalizeTemplateLookupToken(firstNonEmptyString([
    taskOutputProfileRaw,
    autoConfig?.presetPath,
    autoPayload?.presetPath,
    taskPresetNameRaw,
    autoConfig?.renderModeName,
    autoPayload?.renderModeName,
    taskTemplateNameRaw,
  ]));
  const matchedTemplateKey = String(matchedRenderTemplate?.key || "").trim();

  return {
    expectedRenderCountInput: String(
      normalizeTaskExpectedRenderCountInput(task?.expectedRenderCount)
    ),
    autoRenderProjectRef: taskProjectRef,
    autoRenderWorkerKey: workerKey,
    autoRenderFormId: (
      Number.isFinite(formIdRaw) && formIdRaw > 0
        ? String(Math.trunc(formIdRaw))
        : ""
    ),
    autoRenderTemplateId: matchedTemplateKey || fallbackTemplateToken,
    autoRenderFormValues: formData,
    autoRenderLaunchMode: launchMode,
    autoRenderScheduledMode: scheduledMode,
    autoRenderScheduledAt: scheduledAt,
    taskSequenceName: String(autoConfig?.sequenceName || autoPayload?.sequenceName || "").trim(),
    autoRenderOffscreen,
    autoRenderExportDestinationIds,
  };
}
