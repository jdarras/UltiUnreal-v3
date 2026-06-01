import { useCallback, useEffect, useRef, useState } from "react";

function normalizeTimeoutMs(delayMs, fallbackMs) {
  const value = Number(delayMs);
  if (Number.isFinite(value) && value >= 0) return Math.trunc(value);
  const fallback = Number(fallbackMs);
  if (Number.isFinite(fallback) && fallback >= 0) return Math.trunc(fallback);
  return 0;
}

function useTransientInfo({
  defaultType = "error",
  clearAfterMs = 2500,
} = {}) {
  const [infoMsg, setInfoMsg] = useState("");
  const [infoMsgType, setInfoMsgType] = useState("");
  const clearTimerRef = useRef(null);

  const clearInfo = useCallback(() => {
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }
    setInfoMsg("");
    setInfoMsgType("");
  }, []);

  useEffect(() => {
    return () => {
      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
        clearTimerRef.current = null;
      }
    };
  }, []);

  const showInfo = useCallback(
    (message, type = defaultType, delayMs = clearAfterMs) => {
      const msg = String(message || "").trim();
      if (!msg) {
        clearInfo();
        return;
      }

      setInfoMsg(msg);
      setInfoMsgType(type);

      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
      }
      const timeoutMs = normalizeTimeoutMs(delayMs, clearAfterMs);
      if (timeoutMs <= 0) {
        clearTimerRef.current = null;
        return;
      }
      clearTimerRef.current = setTimeout(() => {
        setInfoMsg("");
        setInfoMsgType("");
        clearTimerRef.current = null;
      }, timeoutMs);
    },
    [clearAfterMs, clearInfo, defaultType]
  );

  return {
    infoMsg,
    setInfoMsg,
    infoMsgType,
    setInfoMsgType,
    showInfo,
    clearInfo,
  };
}

export { useTransientInfo };
