import { simplifyUnrealAssetDisplayName } from "../../../shared/helpers";
import { toSortTimestamp } from "../../../shared/sortUtils";
import {
  resolveAutoRenderConfig,
  resolveAutoRenderPayload,
  resolveAutoRenderTargetWorkerKey,
} from "../../../shared/autoRenderHelpers";

export function taskFavoriteKey(task) {
  const taskId = Number(task?.id || 0);
  if (Number.isFinite(taskId) && taskId > 0) return `id:${Math.trunc(taskId)}`;
  const titleKey = String(task?.title || "").trim().toLowerCase();
  const dueAtKey = String(task?.dueAt || "").trim();
  return `title:${titleKey}|due:${dueAtKey}`;
}

export function taskTargetRenderWorkerKey(task) {
  return resolveAutoRenderTargetWorkerKey(task);
}

export function taskRenderFormId(task) {
  const autoRenderConfig = resolveAutoRenderConfig(task);
  const payload = resolveAutoRenderPayload(task);
  const idRaw = Number(autoRenderConfig?.formId || payload?.formId || 0);
  return Number.isFinite(idRaw) && idRaw > 0 ? Math.trunc(idRaw) : 0;
}

export function taskRenderModeName(task) {
  const autoRenderConfig = resolveAutoRenderConfig(task);
  if (!autoRenderConfig) return "";
  const payload = resolveAutoRenderPayload(task);
  const explicitModeName = String(
    autoRenderConfig?.renderModeName
    || payload?.renderModeName
    || autoRenderConfig?.presetName
    || payload?.presetName
    || ""
  ).trim();
  if (explicitModeName) return explicitModeName;
  const outputProfileName = simplifyUnrealAssetDisplayName(
    autoRenderConfig?.outputProfile || payload?.outputProfile || ""
  );
  if (outputProfileName) return outputProfileName;
  return String(
    autoRenderConfig?.templateName
    || payload?.templateName
    || ""
  ).trim();
}

export function taskLaunchModeValue(task, taskRenderStateByTaskId, resolveTaskAutoRenderState) {
  const autoRenderConfig = resolveAutoRenderConfig(task);
  const payload = resolveAutoRenderPayload(task);
  const explicit = String(autoRenderConfig?.launchMode || payload?.launchMode || "").trim().toLowerCase();
  if (explicit === "now" || explicit === "scheduled") return explicit;
  const autoState = resolveTaskAutoRenderState(task, taskRenderStateByTaskId);
  if (autoState === "running" || autoState === "error") return "now";
  return "scheduled";
}

export { toSortTimestamp };
