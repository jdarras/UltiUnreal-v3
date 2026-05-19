import { useCallback, useEffect, useRef } from "react";

function useTransientClearTimer() {
  const timersRef = useRef(new Set());

  useEffect(() => {
    return () => {
      for (const timerId of timersRef.current) {
        clearTimeout(timerId);
      }
      timersRef.current.clear();
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
