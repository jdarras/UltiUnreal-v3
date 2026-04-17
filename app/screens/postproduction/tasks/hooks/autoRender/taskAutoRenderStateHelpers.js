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
});

function findMatchedRenderTemplate({
  normalizedRenderTemplateOptions = [],
  taskProjectRef = "",
  taskTemplateName = "",
  taskOutputProfile = "",
} = {}) {
  const list = Array.isArray(normalizedRenderTemplateOptions)
    ? normalizedRenderTemplateOptions
    : [];
  return list.find((entry) => {
    const entryProject = String(entry?.projectName || "").trim().toLowerCase();
    if (taskProjectRef && entryProject && entryProject !== taskProjectRef) return false;
    const entryTemplate = String(entry?.templateName || "").trim().toLowerCase();
    const entryOutput = String(entry?.outputProfile || "").trim().toLowerCase();
    if (taskTemplateName && entryTemplate && entryTemplate === taskTemplateName) return true;
    if (taskOutputProfile && entryOutput && entryOutput === taskOutputProfile) return true;
    return false;
  }) || null;
}

export function buildHydratedAutoRenderState(task, normalizedRenderTemplateOptions = []) {
  const autoConfig = resolveAutoRenderConfig(task) || {};
  const autoPayload = resolveAutoRenderPayload(task) || {};

  const taskProjectRef = String(
    autoConfig?.projectName
    || (Array.isArray(task?.projectRefs) ? task.projectRefs[0] : "")
    || ""
  ).trim().toLowerCase();

  const taskTemplateName = String(
    autoConfig?.templateName
    || autoPayload?.templateName
    || ""
  ).trim().toLowerCase();

  const taskOutputProfile = String(
    autoConfig?.outputProfile
    || autoPayload?.outputProfile
    || ""
  ).trim().toLowerCase();

  const matchedRenderTemplate = findMatchedRenderTemplate({
    normalizedRenderTemplateOptions,
    taskProjectRef,
    taskTemplateName,
    taskOutputProfile,
  });

  const formIdRaw = Number(
    autoConfig?.formId
    || autoPayload?.formId
    || 0
  );

  const formData = autoConfig?.formData && typeof autoConfig.formData === "object" && !Array.isArray(autoConfig.formData)
    ? autoConfig.formData
    : (
      autoPayload?.formData && typeof autoPayload.formData === "object" && !Array.isArray(autoPayload.formData)
        ? autoPayload.formData
        : {}
    );

  const rawWorkerKey = resolveAutoRenderTargetWorkerKey(task);
  const workerKey = rawWorkerKey === "local" ? "auto" : (rawWorkerKey || "auto");
  const inferredScheduledMode = (
    !workerKey || workerKey === "auto"
      ? "any_station"
      : "specific_station"
  );

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
    autoRenderTemplateId: String(matchedRenderTemplate?.key || ""),
    autoRenderFormValues: formData,
    autoRenderLaunchMode: "scheduled",
    autoRenderScheduledMode: inferredScheduledMode,
    autoRenderScheduledAt: "",
    taskSequenceName: String(autoConfig?.sequenceName || autoPayload?.sequenceName || "").trim(),
  };
}
