import { useEffect } from "react";

export function useDebouncedLocalStorage(storageKey, value, delayMs = 250) {
  useEffect(() => {
    const key = String(storageKey || "").trim();
    if (!key) return undefined;
    const delay = Number.isFinite(Number(delayMs)) ? Math.max(0, Math.trunc(Number(delayMs))) : 250;
    const timer = setTimeout(() => {
      try {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(key, String(value ?? ""));
      } catch {}
    }, delay);
    return () => {
      clearTimeout(timer);
    };
  }, [storageKey, value, delayMs]);
}
