function asRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value;
}

export function resolveAutoRenderConfig(source) {
  const task = asRecord(source);
  if (!task) return null;
  if (asRecord(task.autoRenderConfig)) {
    return task.autoRenderConfig;
  }
  return task;
}

export function resolveAutoRenderPayload(source) {
  const config = resolveAutoRenderConfig(source);
  if (!config) return null;
  return asRecord(config.payload);
}

export function resolveAutoRenderTargetWorkerKey(source) {
  const config = resolveAutoRenderConfig(source);
  const payload = resolveAutoRenderPayload(source);
  const isAutoDispatcherToken = (value) => {
    const low = String(value || "").trim().toLowerCase();
    return low === "" || low === "auto" || low === "local" || low === "auto_dispatcher" || low === "__auto";
  };
  const explicitStation = String(
    config?.renderStation
    || config?.render_station
    || payload?.renderStation
    || payload?.render_station
  || ""
  ).trim();
  if (explicitStation && !isAutoDispatcherToken(explicitStation)) return explicitStation;
  const preferred = String(
    config?.targetWorkerKey
    || config?.preferredWorkerKey
    || payload?.targetWorkerKey
    || payload?.preferredWorkerKey
    || ""
  ).trim();
  if (isAutoDispatcherToken(preferred)) return "";
  return preferred;
}

export default {
  resolveAutoRenderConfig,
  resolveAutoRenderPayload,
  resolveAutoRenderTargetWorkerKey,
};
