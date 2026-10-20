export function captureActiveFocusableElement() {
  const activeEl =
    typeof document !== "undefined" && document?.activeElement
      ? document.activeElement
      : null;
  return activeEl && typeof activeEl.focus === "function" ? activeEl : null;
}

function focusElementSafely(element, { preventScroll = false } = {}) {
  if (!element || typeof element.focus !== "function" || element.isConnected === false) return;
  try {
    if (preventScroll) {
      element.focus({ preventScroll: true });
      return;
    }
    element.focus();
  } catch {
    try {
      element.focus();
    } catch {}
  }
}

export function restoreFocusRefNextTick(
  focusRef,
  { focusWindow = false, preventScroll = false } = {}
) {
  const target = focusRef?.current || null;
  if (focusRef && typeof focusRef === "object" && "current" in focusRef) {
    focusRef.current = null;
  }
  setTimeout(() => {
    if (focusWindow && typeof window !== "undefined") {
      try {
        window.focus();
      } catch {}
    }
    focusElementSafely(target, { preventScroll });
  }, 0);
}

export function focusRefNextTick(ref) {
  return setTimeout(() => {
    ref?.current?.focus?.();
  }, 0);
}

