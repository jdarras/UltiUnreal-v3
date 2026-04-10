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
  const explicitStation = String(
    config?.renderStation
    || config?.render_station
    || payload?.renderStation
    || payload?.render_station
    || ""
  ).trim();
  if (explicitStation) return explicitStation;
  return String(
    config?.targetWorkerKey
    || config?.preferredWorkerKey
    || payload?.targetWorkerKey
    || payload?.preferredWorkerKey
    || "auto"
  ).trim();
}

export default {
  resolveAutoRenderConfig,
  resolveAutoRenderPayload,
  resolveAutoRenderTargetWorkerKey,
};
