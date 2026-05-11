import { useCallback, useEffect, useRef, useState } from "react";

function usePromiseConfirmDialog() {
  const [confirmDialog, setConfirmDialog] = useState({ open: false, message: "" });
  const confirmResolveRef = useRef(null);
  const confirmPrevFocusRef = useRef(null);
  const confirmOkBtnRef = useRef(null);

  const closeConfirmDialog = useCallback((ok) => {
    const resolve = confirmResolveRef.current;
    confirmResolveRef.current = null;
    setConfirmDialog((prev) => (prev.open ? { ...prev, open: false } : prev));
    if (resolve) resolve(!!ok);

    setTimeout(() => {
      try {
        window.focus();
      } catch {}
      const el = confirmPrevFocusRef.current;
      confirmPrevFocusRef.current = null;
      if (el && typeof el.focus === "function" && el.isConnected !== false) {
        try {
          el.focus({ preventScroll: true });
        } catch {
          try {
            el.focus();
          } catch {}
        }
      }
    }, 0);
  }, []);

  const requestConfirm = useCallback((message) => {
    const msg = String(message || "").trim();
    return new Promise((resolve) => {
      if (confirmResolveRef.current) {
        try {
          confirmResolveRef.current(false);
        } catch {}
      }
      const activeEl =
        typeof document !== "undefined" && document?.activeElement
          ? document.activeElement
          : null;
      confirmPrevFocusRef.current =
        activeEl && typeof activeEl.focus === "function" ? activeEl : null;
      confirmResolveRef.current = resolve;
      setConfirmDialog({ open: true, message: msg });
    });
  }, []);

  useEffect(() => {
    if (!confirmDialog.open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closeConfirmDialog(false);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        closeConfirmDialog(true);
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    const timer = setTimeout(() => {
      confirmOkBtnRef.current?.focus?.();
    }, 0);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [confirmDialog.open, closeConfirmDialog]);

  useEffect(() => {
    return () => {
      if (confirmResolveRef.current) {
        try {
          confirmResolveRef.current(false);
        } catch {}
        confirmResolveRef.current = null;
      }
    };
  }, []);

  return {
    confirmDialog,
    confirmOkBtnRef,
    closeConfirmDialog,
    requestConfirm,
  };
}

export { usePromiseConfirmDialog };
export default usePromiseConfirmDialog;
