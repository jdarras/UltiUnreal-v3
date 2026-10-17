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

export function withRenderOffscreenExecution(execution = null, renderOffscreen = false) {
  if (!execution || typeof execution !== "object" || Array.isArray(execution)) return null;
  const offscreen = renderOffscreen === true;
  const cloned = {
    ...execution,
    renderOffscreen: offscreen,
  };
  const args = Array.isArray(execution?.args) ? execution.args : [];
  if (args.length <= 0) {
    if (offscreen) cloned.args = ["-RenderOffscreen"];
    return cloned;
  }
  const nextArgs = args
    .map((arg) => String(arg || "").trim())
    .filter(Boolean)
    .filter((arg) => String(arg || "").trim().toLowerCase() !== "-renderoffscreen");
  if (offscreen) nextArgs.push("-RenderOffscreen");
  cloned.args = nextArgs;
  return cloned;
}

// Normalisation des modes de planification de rendu (mutualisée : auparavant
// dupliquée dans 5 fichiers de l'éditeur/queue de rendus).
export function normalizeLaunchMode(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "now" || normalized === "scheduled") return normalized;
  return "";
}

export function normalizeScheduledMode(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "specific_station") return "any_station";
  if (normalized === "datetime" || normalized === "any_station") {
    return normalized;
  }
  return "";
}

export function normalizeScheduledAt(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) && parsed > 0 ? raw : "";
}
