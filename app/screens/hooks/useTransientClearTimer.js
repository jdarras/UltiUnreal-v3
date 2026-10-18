import { useCallback, useEffect, useRef } from "react";

function useTransientClearTimer() {
  const timersRef = useRef(new Set());

  useEffect(() => {
    // Même Set pendant toute la vie du composant.
    const timers = timersRef.current;
    return () => {
      for (const timerId of timers) {
        clearTimeout(timerId);
      }
      timers.clear();
    };
  }, []);

  const scheduleClear = useCallback((clearFn, delayMs = 2000) => {
    if (typeof clearFn !== "function") return null;
    const ms = Number(delayMs);
    const timeoutMs = Number.isFinite(ms) && ms >= 0 ? Math.trunc(ms) : 0;
    let timerId = null;
    timerId = setTimeout(() => {
      timersRef.current.delete(timerId);
      clearFn();
    }, timeoutMs);
    timersRef.current.add(timerId);
    return timerId;
  }, []);

  return { scheduleClear };
}

export { useTransientClearTimer };
