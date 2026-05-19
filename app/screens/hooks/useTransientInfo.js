import { useCallback, useEffect, useRef, useState } from "react";

function useTransientInfo({
  defaultType = "error",
  clearAfterMs = 2500,
} = {}) {
  const [infoMsg, setInfoMsg] = useState("");
  const [infoMsgType, setInfoMsgType] = useState("");
  const clearTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
        clearTimerRef.current = null;
      }
    };
  }, []);

  const showInfo = useCallback(
    (message, type = defaultType) => {
      const msg = String(message || "").trim();
      if (!msg) return;

      setInfoMsg(msg);
      setInfoMsgType(type);

      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
      }
      clearTimerRef.current = setTimeout(() => {
        setInfoMsg("");
        setInfoMsgType("");
        clearTimerRef.current = null;
      }, clearAfterMs);
    },
    [defaultType, clearAfterMs]
  );

  return {
    infoMsg,
    infoMsgType,
    showInfo,
  };
}

export { useTransientInfo };
