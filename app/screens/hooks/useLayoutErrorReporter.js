import { useCallback } from "react";

function useLayoutErrorReporter({
  t = null,
  showInfo = null,
  messageKey = "production.msg.layoutSaveFailed",
  logPrefix = "[Production][layout] save failed",
} = {}) {
  const reportLayoutError = useCallback(
    (context, error) => {
      const translated =
        typeof t === "function" ? t(messageKey) : "Layout save failed";
      const msg = error?.message || translated;
      console.error(logPrefix, { context, error });
      if (typeof showInfo === "function") {
        showInfo(`${translated}: ${msg}`, "error");
      }
    },
    [t, showInfo, messageKey, logPrefix]
  );

  return {
    reportLayoutError,
  };
}

export { useLayoutErrorReporter };
