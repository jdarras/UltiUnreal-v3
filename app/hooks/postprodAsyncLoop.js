function resolveDelayMs(value, fallbackMs) {
  const raw =
    value && typeof value === "object" && !Array.isArray(value)
      ? value.delayMs
      : value;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return fallbackMs;
  return Math.trunc(parsed);
}

function startPostprodAsyncLoop({
  tick = async () => undefined,
  intervalMs = 0,
  initialDelayMs = 0,
  inFlightDelayMs = intervalMs,
} = {}) {
  let stopped = false;
  let timer = null;
  let inFlight = false;

  const baseIntervalMs = resolveDelayMs(intervalMs, 0);
  const baseInitialDelayMs = resolveDelayMs(initialDelayMs, 0);
  const baseInFlightDelayMs = resolveDelayMs(inFlightDelayMs, baseIntervalMs);

  const schedule = (delayMs) => {
    if (stopped) return;
    timer = setTimeout(run, resolveDelayMs(delayMs, baseIntervalMs));
  };

  const run = async () => {
    if (stopped) return;
    if (inFlight) {
      schedule(baseInFlightDelayMs);
      return;
    }

    inFlight = true;
    let nextDelayMs = baseIntervalMs;
    try {
      const tickResult = await tick();
      nextDelayMs = resolveDelayMs(tickResult, baseIntervalMs);
    } catch {
      nextDelayMs = baseIntervalMs;
    } finally {
      inFlight = false;
      schedule(nextDelayMs);
    }
  };

  schedule(baseInitialDelayMs);

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}

export { startPostprodAsyncLoop };
