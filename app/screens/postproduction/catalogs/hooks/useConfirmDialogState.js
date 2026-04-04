import { useCallback, useEffect, useRef, useState } from "react";

function resolveCanOpen(canOpen) {
  if (typeof canOpen === "function") {
    try {
      return canOpen() === true;
    } catch {
      return false;
    }
  }
  return canOpen === true;
}

export function useConfirmDialogState({ canOpen = true, closeBlocked = false } = {}) {
  const [open, setOpen] = useState(false);
  const confirmRef = useRef(null);
  const prevFocusRef = useRef(null);

  const openDialog = useCallback(() => {
    if (!resolveCanOpen(canOpen)) return;
    setOpen((prev) => {
      if (prev) return prev;
      const activeEl =
        typeof document !== "undefined" && document?.activeElement
          ? document.activeElement
          : null;
      prevFocusRef.current =
        activeEl && typeof activeEl.focus === "function" ? activeEl : null;
      return true;
    });
  }, [canOpen]);

  const closeDialog = useCallback(() => {
    if (closeBlocked) return;
    setOpen(false);
    const prev = prevFocusRef.current;
    prevFocusRef.current = null;
    if (prev && typeof prev.focus === "function") {
      setTimeout(() => {
        try {
          prev.focus();
        } catch {}
      }, 0);
    }
  }, [closeBlocked]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closeDialog();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    const timer = setTimeout(() => {
      confirmRef.current?.focus?.();
    }, 0);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open, closeDialog]);

  return {
    open,
    setOpen,
    confirmRef,
    openDialog,
    closeDialog,
  };
}

export default useConfirmDialogState;
