import { resolveAutoRenderConfig, resolveAutoRenderTargetWorkerKey } from "../../../shared/autoRenderHelpers";

export function filterRenderQueueTasks({
  searchQuery = "",
  renderQueueTasks = [],
  queueWorkerLabelByKey = new Map(),
} = {}) {
  const query = String(searchQuery || "").trim().toLowerCase();
  const hasQuery = query.length > 0;
  const list = Array.isArray(renderQueueTasks) ? renderQueueTasks : [];
  return list.filter((entry) => {
    const task = entry?.task && typeof entry.task === "object" ? entry.task : {};
    const autoRenderConfig = resolveAutoRenderConfig(task) || {};
    const queueProjectName = String(entry?.projectName || autoRenderConfig?.projectName || "").trim();
    const queueTemplateName = String(entry?.templateName || autoRenderConfig?.templateName || "").trim();
    const queueWorkerName = String(entry?.workerName || "").trim();
    const queueWorkerKey = String(entry?.workerKey || "").trim();
    const queueTargetWorkerKey = resolveAutoRenderTargetWorkerKey(entry?.task);
    const queueTargetWorkerLabel = queueTargetWorkerKey
      ? String(queueWorkerLabelByKey.get(queueTargetWorkerKey) || queueTargetWorkerKey).trim()
      : "";
    if (!hasQuery) return true;
    const expectedNamesText = Array.isArray(task?.expectedRenderNames)
      ? task.expectedRenderNames.join(" ")
      : "";
    const haystack = [
      String(task?.title || ""),
      String(task?.description || ""),
      queueProjectName,
      queueTemplateName,
      String(autoRenderConfig?.mapName || ""),
      String(autoRenderConfig?.sequenceName || ""),
      queueWorkerName,
      queueWorkerKey,
      queueTargetWorkerKey,
      queueTargetWorkerLabel,
      String(task?.id || ""),
      expectedNamesText,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });
}
