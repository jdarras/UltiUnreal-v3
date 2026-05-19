import { useCallback, useEffect, useRef, useState } from "react";
import {
  captureActiveFocusableElement,
  focusRefNextTick,
  restoreFocusRefNextTick,
} from "../../../hooks/dialogFocusHelpers";

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
      prevFocusRef.current = captureActiveFocusableElement();
      return true;
    });
  }, [canOpen]);

  const closeDialog = useCallback(() => {
    if (closeBlocked) return;
    setOpen(false);
    restoreFocusRefNextTick(prevFocusRef);
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
    const timer = focusRefNextTick(confirmRef);
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
